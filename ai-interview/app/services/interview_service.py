from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from psycopg.types.json import Jsonb

from app.db.database import get_connection


def _to_text_snapshot(payload: Any, max_chars: int = 12000) -> str:
    if payload is None:
        return ""
    if isinstance(payload, str):
        return payload[:max_chars]
    return json.dumps(payload, ensure_ascii=False)[:max_chars]


class InterviewService:
    def create_session(
        self,
        user_id: str | None,
        mode: str,
        personality: str,
        job_data: Any,
        resume_data: Any,
        status: str = "created",
        session_type: str = "live_interview",
        origin_session_id: str | None = None,
        origin_turn_id: str | None = None,
        target_duration_sec: int = 420,
        closing_threshold_sec: int = 60,
    ) -> dict[str, Any]:
        session_id = str(uuid.uuid4())

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO public.interview_sessions (
                        id, user_id, session_type, mode, personality, status,
                        job_payload, resume_payload, jd_text, resume_text,
                        origin_session_id, origin_turn_id,
                        target_duration_sec, closing_threshold_sec, closing_announced, started_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false, now())
                    RETURNING *
                    """,
                    (
                        session_id,
                        user_id,
                        session_type,
                        mode,
                        personality,
                        status,
                        Jsonb(job_data or {}),
                        Jsonb(resume_data or {}),
                        _to_text_snapshot(job_data),
                        _to_text_snapshot(resume_data),
                        origin_session_id,
                        origin_turn_id,
                        max(60, int(target_duration_sec or 420)),
                        max(10, int(closing_threshold_sec or 60)),
                    ),
                )
                created = cur.fetchone()
            conn.commit()

        return created

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM public.interview_sessions WHERE id = %s",
                    (session_id,),
                )
                return cur.fetchone()

    def append_turn(
        self,
        session_id: str,
        role: str,
        content: str,
        channel: str = "text",
        payload: dict[str, Any] | None = None,
        turn_index: int | None = None,
    ) -> dict[str, Any]:
        turn_id = str(uuid.uuid4())

        with get_connection() as conn:
            with conn.cursor() as cur:
                if turn_index is None:
                    cur.execute(
                        """
                        SELECT COALESCE(MAX(turn_index), 0) + 1 AS next_turn
                        FROM public.interview_turns
                        WHERE session_id = %s
                        """,
                        (session_id,),
                    )
                    row = cur.fetchone()
                    turn_index = int(row["next_turn"]) if row else 1

                cur.execute(
                    """
                    INSERT INTO public.interview_turns (
                        id, session_id, turn_index, role, channel, content, payload
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        turn_id,
                        session_id,
                        turn_index,
                        role,
                        channel,
                        content,
                        Jsonb(payload or {}),
                    ),
                )
                inserted = cur.fetchone()

                cur.execute(
                    """
                    UPDATE public.interview_sessions
                    SET
                        question_count = (
                            SELECT COUNT(*)::int
                            FROM public.interview_turns
                            WHERE session_id = %s AND role = 'model'
                        ),
                        updated_at = now()
                    WHERE id = %s
                    """,
                    (session_id, session_id),
                )
            conn.commit()

        return inserted

    def append_missing_history(self, session_id: str, messages: list[dict[str, Any]]) -> None:
        existing_count = 0
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*)::int AS count FROM public.interview_turns WHERE session_id = %s",
                    (session_id,),
                )
                existing_count = cur.fetchone()["count"]

        missing = messages[existing_count:]

        for i, message in enumerate(missing, start=existing_count + 1):
            self.append_turn(
                session_id=session_id,
                role=message.get("role", "user"),
                content=message.get("parts", ""),
                channel="text",
                payload=None,
                turn_index=i,
            )

    def update_session_status(self, session_id: str, status: str, current_phase: str | None = None) -> None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if current_phase:
                    cur.execute(
                        """
                        UPDATE public.interview_sessions
                        SET
                            status = %s,
                            current_phase = %s,
                            updated_at = now(),
                            started_at = COALESCE(started_at, now()),
                            ended_at = CASE WHEN %s = 'completed' THEN now() ELSE ended_at END
                        WHERE id = %s
                        """,
                        (status, current_phase, status, session_id),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE public.interview_sessions
                        SET
                            status = %s,
                            updated_at = now(),
                            started_at = COALESCE(started_at, now()),
                            ended_at = CASE WHEN %s = 'completed' THEN now() ELSE ended_at END
                        WHERE id = %s
                        """,
                        (status, status, session_id),
                    )
            conn.commit()

    def set_closing_announced(self, session_id: str, announced: bool) -> None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE public.interview_sessions
                    SET closing_announced = %s, updated_at = now()
                    WHERE id = %s
                    """,
                    (announced, session_id),
                )
            conn.commit()

    def set_planned_questions(self, session_id: str, planned_questions: list[dict[str, Any]]) -> None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE public.interview_sessions
                    SET planned_questions = %s, updated_at = now()
                    WHERE id = %s
                    """,
                    (Jsonb(planned_questions), session_id),
                )
            conn.commit()

    def save_report(self, session_id: str, report_payload: dict[str, Any]) -> None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO public.interview_reports (session_id, report_payload)
                    VALUES (%s, %s)
                    ON CONFLICT (session_id)
                    DO UPDATE SET
                        report_payload = EXCLUDED.report_payload,
                        updated_at = now()
                    """,
                    (session_id, Jsonb(report_payload)),
                )
            conn.commit()

    def enqueue_report_job(self, session_id: str, session_type: str) -> dict[str, Any]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, session_id, session_type, status, attempts, max_attempts, error, updated_at
                    FROM public.interview_report_jobs
                    WHERE session_id = %s
                    """,
                    (session_id,),
                )
                existing = cur.fetchone()
                if existing:
                    # done/running/pending 상태면 중복 생성하지 않는다.
                    if existing["status"] in {"done", "running", "pending"}:
                        return existing

                    # failed면 재시도를 위해 pending으로 재활성화
                    cur.execute(
                        """
                        UPDATE public.interview_report_jobs
                        SET
                            status = 'pending',
                            error = '',
                            updated_at = now()
                        WHERE session_id = %s
                        RETURNING id, session_id, session_type, status, attempts, max_attempts, error, updated_at
                        """,
                        (session_id,),
                    )
                    row = cur.fetchone()
                    conn.commit()
                    return row

                job_id = str(uuid.uuid4())
                cur.execute(
                    """
                    INSERT INTO public.interview_report_jobs (
                        id, session_id, session_type, status, attempts, max_attempts, error
                    ) VALUES (%s, %s, %s, 'pending', 0, 3, '')
                    RETURNING id, session_id, session_type, status, attempts, max_attempts, error, updated_at
                    """,
                    (job_id, session_id, session_type),
                )
                created = cur.fetchone()
            conn.commit()
        return created

    def reserve_next_report_job(self) -> dict[str, Any] | None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id
                    FROM public.interview_report_jobs
                    WHERE status = 'pending' AND attempts < max_attempts
                    ORDER BY created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                    """
                )
                picked = cur.fetchone()
                if not picked:
                    conn.commit()
                    return None

                cur.execute(
                    """
                    UPDATE public.interview_report_jobs
                    SET
                        status = 'running',
                        attempts = attempts + 1,
                        updated_at = now()
                    WHERE id = %s
                    RETURNING id, session_id, session_type, status, attempts, max_attempts, error, updated_at
                    """,
                    (picked["id"],),
                )
                reserved = cur.fetchone()
            conn.commit()
        return reserved

    def complete_report_job(self, job_id: str) -> None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE public.interview_report_jobs
                    SET
                        status = 'done',
                        error = '',
                        updated_at = now()
                    WHERE id = %s
                    """,
                    (job_id,),
                )
            conn.commit()

    def fail_report_job(self, job_id: str, error: str) -> None:
        safe_error = (error or "unknown error")[:4000]
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE public.interview_report_jobs
                    SET
                        status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
                        error = %s,
                        updated_at = now()
                    WHERE id = %s
                    """,
                    (safe_error, job_id),
                )
            conn.commit()

    def get_report_job(self, session_id: str) -> dict[str, Any] | None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, session_id, session_type, status, attempts, max_attempts, error, updated_at
                    FROM public.interview_report_jobs
                    WHERE session_id = %s
                    """,
                    (session_id,),
                )
                return cur.fetchone()

    def list_sessions(self, limit: int = 100) -> list[dict[str, Any]]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        s.id,
                        s.status,
                        s.created_at,
                        COALESCE(s.question_count, 0) AS question_count,
                        COALESCE(t.turn_count, 0) AS event_count,
                        COALESCE(rj.status, '') AS report_status
                    FROM public.interview_sessions s
                    LEFT JOIN (
                        SELECT session_id, COUNT(*)::int AS turn_count
                        FROM public.interview_turns
                        GROUP BY session_id
                    ) t ON t.session_id = s.id
                    LEFT JOIN public.interview_report_jobs rj ON rj.session_id = s.id
                    ORDER BY s.created_at DESC
                    LIMIT %s
                    """,
                    (limit,),
                )
                rows = cur.fetchall() or []

        return [
            {
                "uid": row["id"],
                "status": row["status"],
                "created_at": int(row["created_at"].timestamp())
                if isinstance(row["created_at"], datetime)
                else row["created_at"],
                "question_count": row["question_count"],
                "event_count": row["event_count"],
                "report_status": row.get("report_status") or "",
            }
            for row in rows
        ]

    def list_sessions_for_user(
        self,
        user_id: str | None,
        limit: int = 20,
        session_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """유저별 세션 목록 + report 포함 (훈련센터 홈/히스토리용)"""
        with get_connection() as conn:
            with conn.cursor() as cur:
                where_clauses = []
                params: list[Any] = []

                if user_id:
                    where_clauses.append("s.user_id = %s")
                    params.append(user_id)

                if session_type:
                    where_clauses.append("s.session_type = %s")
                    params.append(session_type)

                where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

                params.append(limit)
                cur.execute(
                    f"""
                    SELECT
                        s.id,
                        s.session_type,
                        s.mode,
                        s.status,
                        s.personality,
                        s.current_phase,
                        s.target_duration_sec,
                        s.closing_threshold_sec,
                        s.closing_announced,
                        s.question_count,
                        s.origin_session_id,
                        s.job_payload,
                        s.created_at,
                        r.report_payload,
                        COALESCE(rj.status, '') AS report_status
                    FROM public.interview_sessions s
                    LEFT JOIN public.interview_reports r ON r.session_id = s.id
                    LEFT JOIN public.interview_report_jobs rj ON rj.session_id = s.id
                    {where_sql}
                    ORDER BY s.created_at DESC
                    LIMIT %s
                    """,
                    params,
                )
                rows = cur.fetchall() or []

        result = []
        for row in rows:
            job = row.get("job_payload") or {}
            report = row.get("report_payload") or {}
            result.append(
                {
                    "id": row["id"],
                    "sessionType": row.get("session_type", "live_interview"),
                    "mode": row.get("mode", "chat"),
                    "status": row.get("status", "created"),
                    "personality": row.get("personality", "professional"),
                    "currentPhase": row.get("current_phase", "introduction"),
                    "targetDurationSec": row.get("target_duration_sec", 420),
                    "closingThresholdSec": row.get("closing_threshold_sec", 60),
                    "closingAnnounced": bool(row.get("closing_announced", False)),
                    "questionCount": row.get("question_count", 0),
                    "company": job.get("company", ""),
                    "role": job.get("role", ""),
                    "repoUrl": job.get("repoUrl", ""),
                    "createdAt": int(row["created_at"].timestamp())
                    if isinstance(row["created_at"], datetime)
                    else 0,
                    "analysis": report if report else None,
                    "reportStatus": row.get("report_status") or "",
                }
            )
        return result

    def get_session_detail(self, session_id: str) -> dict[str, Any] | None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM public.interview_sessions WHERE id = %s",
                    (session_id,),
                )
                session = cur.fetchone()
                if not session:
                    return None

                cur.execute(
                    """
                    SELECT role, channel, content, payload, created_at
                    FROM public.interview_turns
                    WHERE session_id = %s
                    ORDER BY turn_index ASC
                    """,
                    (session_id,),
                )
                turns = cur.fetchall() or []

                cur.execute(
                    "SELECT report_payload FROM public.interview_reports WHERE session_id = %s",
                    (session_id,),
                )
                report = cur.fetchone()

                cur.execute(
                    """
                    SELECT status, attempts, max_attempts, error, updated_at
                    FROM public.interview_report_jobs
                    WHERE session_id = %s
                    """,
                    (session_id,),
                )
                report_job = cur.fetchone()

        debug_events: list[dict[str, Any]] = []
        for turn in turns:
            event_type = "event"
            if turn["role"] in ("model", "ai"):
                event_type = "llm"
            elif turn["channel"] == "voice" and turn["role"] == "user":
                event_type = "stt"

            debug_events.append(
                {
                    "type": event_type,
                    "timestamp": int(turn["created_at"].timestamp())
                    if isinstance(turn["created_at"], datetime)
                    else 0,
                    "summary": (turn.get("content") or "")[:120],
                    "payload": {
                        "role": turn.get("role"),
                        "channel": turn.get("channel"),
                        "raw": turn.get("payload") or {},
                    },
                }
            )

        return {
            "client_uid": session["id"],
            "current_phase": session.get("current_phase", "introduction"),
            "tail_question_depth": session.get("tail_question_depth", 0),
            "target_duration_sec": session.get("target_duration_sec", 420),
            "closing_threshold_sec": session.get("closing_threshold_sec", 60),
            "closing_announced": bool(session.get("closing_announced", False)),
            "debug_events": debug_events,
            "analysis": (report or {}).get("report_payload", {}),
            "reportStatus": (report_job or {}).get("status", ""),
            "reportAttempts": (report_job or {}).get("attempts", 0),
            "reportMaxAttempts": (report_job or {}).get("max_attempts", 0),
            "reportError": (report_job or {}).get("error", ""),
            "reportUpdatedAt": int((report_job or {}).get("updated_at").timestamp())
            if isinstance((report_job or {}).get("updated_at"), datetime)
            else 0,
            "planned_questions": session.get("planned_questions") or [],
            "jd_text": session.get("jd_text") or "",
            "resume_text": session.get("resume_text") or "",
            "status": session.get("status", "created"),
            "mode": session.get("mode", "chat"),
            "created_at": int(session["created_at"].timestamp())
            if isinstance(session["created_at"], datetime)
            else 0,
        }

    def count_active_sessions(self) -> int:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT COUNT(*)::int AS count
                    FROM public.interview_sessions
                    WHERE status IN ('created', 'in_progress', 'running')
                    """
                )
                row = cur.fetchone()
        return row["count"] if row else 0

    def get_turns(self, session_id: str) -> list[dict[str, Any]]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT role, channel, content, payload, turn_index, created_at
                    FROM public.interview_turns
                    WHERE session_id = %s
                    ORDER BY turn_index ASC
                    """,
                    (session_id,),
                )
                rows = cur.fetchall() or []
        return [dict(r) for r in rows]

    def save_portfolio_source(
        self,
        session_id: str,
        repo_url: str,
        readme_snapshot: str,
        tree_snapshot: str,
        infra_files_snapshot: str,
        default_branch: str = "main",
        analysis_status: str = "completed",
    ) -> None:
        source_id = str(uuid.uuid4())
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO public.portfolio_sources (
                        id, session_id, repo_url, visibility, default_branch,
                        readme_snapshot, tree_snapshot, infra_files_snapshot, analysis_status
                    ) VALUES (%s, %s, %s, 'public', %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (
                        source_id,
                        session_id,
                        repo_url,
                        default_branch,
                        readme_snapshot[:20000],
                        tree_snapshot[:10000],
                        infra_files_snapshot[:10000],
                        analysis_status,
                    ),
                )
            conn.commit()

    def save_eval_signals(
        self,
        session_id: str,
        signals: list[dict[str, Any]],
    ) -> None:
        """signals: [{dimension, score, weight, weighted_score, evidence, confidence}]"""
        with get_connection() as conn:
            with conn.cursor() as cur:
                for sig in signals:
                    sig_id = str(uuid.uuid4())
                    cur.execute(
                        """
                        INSERT INTO public.interview_eval_signals (
                            id, session_id, dimension, score, weight,
                            weighted_score, evidence, confidence
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            sig_id,
                            session_id,
                            sig.get("dimension", ""),
                            sig.get("score", 0),
                            sig.get("weight", 0),
                            sig.get("weighted_score", 0),
                            sig.get("evidence", ""),
                            sig.get("confidence", 0),
                        ),
                    )
            conn.commit()

    def save_comparison_report(
        self,
        session_id: str,
        report_payload: dict[str, Any],
        comparison_payload: dict[str, Any],
    ) -> None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO public.interview_reports (
                        session_id, report_payload, comparison_payload, rubric_version
                    )
                    VALUES (%s, %s, %s, 'v1')
                    ON CONFLICT (session_id)
                    DO UPDATE SET
                        report_payload = EXCLUDED.report_payload,
                        comparison_payload = EXCLUDED.comparison_payload,
                        updated_at = now()
                    """,
                    (session_id, Jsonb(report_payload), Jsonb(comparison_payload)),
                )
            conn.commit()
