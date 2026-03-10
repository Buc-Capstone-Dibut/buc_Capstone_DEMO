from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from psycopg.types.json import Jsonb

from app.db.database import get_connection
from app.interview.reporting.document import (
    build_report_document,
    build_timeline_entries,
    coerce_report_document,
)
from app.interview.reporting.repository import ReportRepository


def _to_unix_timestamp(value: Any) -> int:
    if isinstance(value, datetime):
        anchor = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return int(anchor.timestamp())
    return 0


def _normalize_turn_role(role: Any) -> str:
    normalized = str(role or "").strip().lower()
    if normalized in {"model", "ai", "assistant", "interviewer"}:
        return "model"
    return "user"


def _to_text_snapshot(payload: Any, max_chars: int = 12000) -> str:
    if payload is None:
        return ""
    if isinstance(payload, str):
        return payload[:max_chars]
    return json.dumps(payload, ensure_ascii=False)[:max_chars]


class InterviewService:
    def __init__(self, *, report_repository: ReportRepository | None = None) -> None:
        self._report_repository = report_repository or ReportRepository()

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
                        runtime_status,
                        job_payload, resume_payload, jd_text, resume_text,
                        origin_session_id, origin_turn_id,
                        target_duration_sec, closing_threshold_sec, closing_announced, started_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false, now())
                    RETURNING *
                    """,
                    (
                        session_id,
                        user_id,
                        session_type,
                        mode,
                        personality,
                        status,
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

    def get_session(
        self,
        session_id: str,
        user_id: str | None = None,
        *,
        require_owner: bool = False,
    ) -> dict[str, Any] | None:
        if require_owner and not user_id:
            return None

        with get_connection() as conn:
            with conn.cursor() as cur:
                if require_owner:
                    cur.execute(
                        "SELECT * FROM public.interview_sessions WHERE id = %s AND user_id = %s",
                        (session_id, user_id),
                    )
                else:
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
                        id, session_id, turn_index, exchange_index, role, channel, turn_kind,
                        phase, provider, content, started_at, completed_at, latency_ms,
                        usage_input_tokens, usage_output_tokens, usage_total_tokens, payload
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        turn_id,
                        session_id,
                        turn_index,
                        int((payload or {}).get("exchange_index") or 0),
                        role,
                        channel,
                        str((payload or {}).get("turn_kind") or ("question" if _normalize_turn_role(role) == "model" else "answer")),
                        str((payload or {}).get("phase") or ""),
                        str((payload or {}).get("provider") or ""),
                        content,
                        (payload or {}).get("started_at"),
                        (payload or {}).get("completed_at"),
                        max(0, int((payload or {}).get("latency_ms") or 0)),
                        max(0, int((payload or {}).get("usage_input_tokens") or 0)),
                        max(0, int((payload or {}).get("usage_output_tokens") or 0)),
                        max(0, int((payload or {}).get("usage_total_tokens") or 0)),
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
                            WHERE session_id = %s AND role IN ('model', 'ai', 'interviewer')
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
                            runtime_status = CASE
                                WHEN %s = 'completed' THEN 'completed'
                                WHEN %s = 'failed' THEN 'failed'
                                ELSE runtime_status
                            END,
                            current_phase = %s,
                            updated_at = now(),
                            started_at = COALESCE(started_at, now()),
                            ended_at = CASE
                                WHEN %s IN ('completed', 'failed') THEN COALESCE(ended_at, now())
                                ELSE ended_at
                            END
                        WHERE id = %s
                        """,
                        (status, status, status, current_phase, status, session_id),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE public.interview_sessions
                        SET
                            status = %s,
                            runtime_status = CASE
                                WHEN %s = 'completed' THEN 'completed'
                                WHEN %s = 'failed' THEN 'failed'
                                ELSE runtime_status
                            END,
                            updated_at = now(),
                            started_at = COALESCE(started_at, now()),
                            ended_at = CASE
                                WHEN %s IN ('completed', 'failed') THEN COALESCE(ended_at, now())
                                ELSE ended_at
                            END
                        WHERE id = %s
                        """,
                        (status, status, status, status, session_id),
                    )

                if status == "completed":
                    cur.execute(
                        """
                        INSERT INTO public.interview_report_jobs (
                            id, session_id, session_type, status, attempts, max_attempts, error, requested_at
                        )
                        SELECT %s, id, session_type, 'pending', 0, 3, '', now()
                        FROM public.interview_sessions
                        WHERE id = %s
                        ON CONFLICT (session_id) DO NOTHING
                        """,
                        (str(uuid.uuid4()), session_id),
                    )
                    cur.execute(
                        """
                        UPDATE public.interview_sessions
                        SET report_requested_at = COALESCE(report_requested_at, now())
                        WHERE id = %s
                        """,
                        (session_id,),
                    )
            conn.commit()

    def set_runtime_status(
        self,
        session_id: str,
        runtime_status: str,
        current_phase: str | None = None,
    ) -> dict[str, Any] | None:
        normalized = (runtime_status or "connecting").strip() or "connecting"
        session_status = "failed" if normalized == "failed" else "completed" if normalized == "completed" else "created" if normalized == "created" else "in_progress"

        with get_connection() as conn:
            with conn.cursor() as cur:
                if current_phase:
                    cur.execute(
                        """
                        UPDATE public.interview_sessions
                        SET
                            status = %s,
                            runtime_status = %s,
                            current_phase = %s,
                            updated_at = now(),
                            started_at = CASE
                                WHEN %s IN ('in_progress', 'completed') THEN COALESCE(started_at, now())
                                ELSE started_at
                            END,
                            ended_at = CASE
                                WHEN %s IN ('completed', 'failed') THEN COALESCE(ended_at, now())
                                ELSE ended_at
                            END
                        WHERE id = %s
                        RETURNING *
                        """,
                        (
                            session_status,
                            normalized,
                            current_phase,
                            session_status,
                            session_status,
                            session_id,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE public.interview_sessions
                        SET
                            status = %s,
                            runtime_status = %s,
                            updated_at = now(),
                            started_at = CASE
                                WHEN %s IN ('in_progress', 'completed') THEN COALESCE(started_at, now())
                                ELSE started_at
                            END,
                            ended_at = CASE
                                WHEN %s IN ('completed', 'failed') THEN COALESCE(ended_at, now())
                                ELSE ended_at
                            END
                        WHERE id = %s
                        RETURNING *
                        """,
                        (
                            session_status,
                            normalized,
                            session_status,
                            session_status,
                            session_id,
                        ),
                    )
                row = cur.fetchone()
            conn.commit()
        return row

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

    def mark_runtime_connected(
        self,
        session_id: str,
        *,
        live_provider: str = "gemini-live",
        live_model: str = "",
    ) -> dict[str, Any] | None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE public.interview_sessions
                    SET
                        runtime_status = CASE
                            WHEN status = 'completed' THEN 'completed'
                            ELSE 'connecting'
                        END,
                        status = CASE
                            WHEN status = 'completed' THEN status
                            ELSE 'in_progress'
                        END,
                        live_provider = %s,
                        live_model = %s,
                        last_disconnect_at = NULL,
                        reconnect_deadline_at = NULL,
                        last_paused_at = CASE
                            WHEN status = 'completed' THEN last_paused_at
                            ELSE NULL
                        END,
                        started_at = COALESCE(started_at, now()),
                        updated_at = now()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (live_provider, live_model, session_id),
                )
                row = cur.fetchone()
            conn.commit()
        return row

    def mark_runtime_disconnected(
        self,
        session_id: str,
        *,
        grace_sec: int = 60,
    ) -> dict[str, Any] | None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE public.interview_sessions
                    SET
                        runtime_status = CASE
                            WHEN status = 'completed' THEN 'completed'
                            ELSE 'reconnecting'
                        END,
                        last_disconnect_at = CASE
                            WHEN status = 'completed' THEN last_disconnect_at
                            ELSE now()
                        END,
                        reconnect_deadline_at = CASE
                            WHEN status = 'completed' THEN reconnect_deadline_at
                            ELSE now() + make_interval(secs => %s)
                        END,
                        last_paused_at = CASE
                            WHEN status = 'completed' OR last_paused_at IS NOT NULL THEN last_paused_at
                            ELSE now()
                        END,
                        updated_at = now()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (max(1, int(grace_sec or 60)), session_id),
                )
                row = cur.fetchone()
            conn.commit()
        return row

    def mark_runtime_resumed(self, session_id: str) -> dict[str, Any] | None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE public.interview_sessions
                    SET
                        paused_duration_sec = paused_duration_sec + CASE
                            WHEN last_paused_at IS NULL THEN 0
                            ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - last_paused_at))))::int
                        END,
                        last_paused_at = NULL,
                        last_disconnect_at = NULL,
                        reconnect_deadline_at = NULL,
                        runtime_status = CASE
                            WHEN status = 'completed' THEN 'completed'
                            ELSE 'connecting'
                        END,
                        status = CASE
                            WHEN status = 'completed' THEN status
                            ELSE 'in_progress'
                        END,
                        updated_at = now()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (session_id,),
                )
                row = cur.fetchone()
            conn.commit()
        return row

    def mark_runtime_expired(self, session_id: str) -> dict[str, Any] | None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE public.interview_sessions
                    SET
                        runtime_status = 'failed',
                        status = CASE
                            WHEN status = 'completed' THEN status
                            ELSE 'failed'
                        END,
                        ended_at = COALESCE(ended_at, now()),
                        reconnect_deadline_at = NULL,
                        last_paused_at = NULL,
                        updated_at = now()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (session_id,),
                )
                row = cur.fetchone()
            conn.commit()
        return row

    def save_report(self, session_id: str, report_payload: dict[str, Any]) -> None:
        session = self.get_session(session_id)
        if not session:
            raise RuntimeError(f"Session not found: {session_id}")
        turns = self.get_turns(session_id)
        document = build_report_document(
            session=session,
            turns=turns,
            compat_analysis=report_payload,
        )
        self._report_repository.save_report_document(session_id, document)

    def enqueue_report_job(self, session_id: str, session_type: str) -> dict[str, Any]:
        return self._report_repository.enqueue_report_job(session_id, session_type)

    def reserve_next_report_job(self) -> dict[str, Any] | None:
        return self._report_repository.reserve_next_report_job()

    def complete_report_job(self, job_id: str) -> None:
        self._report_repository.complete_report_job(job_id)

    def fail_report_job(self, job_id: str, error: str) -> None:
        self._report_repository.fail_report_job(job_id, error)

    def get_report_job(self, session_id: str) -> dict[str, Any] | None:
        return self._report_repository.get_report_job(session_id)

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
        if not user_id:
            return []

        with get_connection() as conn:
            with conn.cursor() as cur:
                where_clauses = []
                params: list[Any] = []

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
                        s.runtime_status,
                        s.live_provider,
                        s.live_model,
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
            report_doc = coerce_report_document(report)
            compat_analysis = report_doc.get("compatAnalysis") if report_doc else report
            result.append(
                {
                    "id": row["id"],
                    "sessionType": row.get("session_type", "live_interview"),
                    "mode": row.get("mode", "chat"),
                    "status": row.get("status", "created"),
                    "runtimeStatus": row.get("runtime_status", row.get("status", "created")),
                    "personality": row.get("personality", "professional"),
                    "currentPhase": row.get("current_phase", "introduction"),
                    "targetDurationSec": row.get("target_duration_sec", 420),
                    "closingThresholdSec": row.get("closing_threshold_sec", 60),
                    "closingAnnounced": bool(row.get("closing_announced", False)),
                    "liveProvider": row.get("live_provider", "gemini-live"),
                    "liveModel": row.get("live_model", ""),
                    "questionCount": row.get("question_count", 0),
                    "company": job.get("company", ""),
                    "role": job.get("role", ""),
                    "repoUrl": job.get("repoUrl", ""),
                    "createdAt": int(row["created_at"].timestamp())
                    if isinstance(row["created_at"], datetime)
                    else 0,
                    "analysis": compat_analysis if compat_analysis else None,
                    "reportView": report_doc.get("reportView") if report_doc else None,
                    "reportStatus": row.get("report_status") or "",
                }
            )
        return result

    def get_session_detail(self, session_id: str, user_id: str | None = None) -> dict[str, Any] | None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if user_id:
                    cur.execute(
                        "SELECT * FROM public.interview_sessions WHERE id = %s AND user_id = %s",
                        (session_id, user_id),
                    )
                else:
                    cur.execute(
                        "SELECT * FROM public.interview_sessions WHERE id = %s",
                        (session_id,),
                    )
                session = cur.fetchone()
                if not session:
                    return None

                cur.execute(
                    """
                    SELECT role, channel, content, payload, created_at, exchange_index, phase,
                           provider, latency_ms, usage_input_tokens, usage_output_tokens,
                           usage_total_tokens
                    FROM public.interview_turns
                    WHERE session_id = %s
                    ORDER BY turn_index ASC
                    """,
                    (session_id,),
                )
                turns = cur.fetchall() or []

                cur.execute(
                    "SELECT report_payload, comparison_payload, schema_version, updated_at FROM public.interview_reports WHERE session_id = %s",
                    (session_id,),
                )
                report = cur.fetchone()

                cur.execute(
                    """
                    SELECT status, attempts, max_attempts, error, requested_at, started_at, completed_at, updated_at
                    FROM public.interview_report_jobs
                    WHERE session_id = %s
                    """,
                    (session_id,),
                )
                report_job = cur.fetchone()

        report_payload = (report or {}).get("report_payload") or {}
        report_doc = coerce_report_document(report_payload)
        compat_analysis = report_doc.get("compatAnalysis") if report_doc else report_payload
        timeline = report_doc.get("timeline") if report_doc else None
        if not isinstance(timeline, list):
            timeline = build_timeline_entries(
                [dict(turn) for turn in turns],
                target_duration_sec=int(session.get("target_duration_sec") or 0),
                paused_duration_sec=int(session.get("paused_duration_sec") or 0),
            )

        debug_events: list[dict[str, Any]] = []
        for turn in turns:
            event_type = "event"
            role = _normalize_turn_role(turn.get("role"))
            if role == "model":
                event_type = "llm"
            elif turn["channel"] == "voice" and role == "user":
                event_type = "stt"

            debug_events.append(
                {
                    "type": event_type,
                    "timestamp": int(turn["created_at"].timestamp())
                    if isinstance(turn["created_at"], datetime)
                    else 0,
                    "summary": (turn.get("content") or "")[:120],
                    "payload": {
                        "role": role,
                        "channel": turn.get("channel"),
                        "exchangeIndex": int(turn.get("exchange_index") or 0),
                        "phase": turn.get("phase") or "",
                        "provider": turn.get("provider") or "",
                        "latencyMs": int(turn.get("latency_ms") or 0),
                        "usage": {
                            "inputTokens": int(turn.get("usage_input_tokens") or 0),
                            "outputTokens": int(turn.get("usage_output_tokens") or 0),
                            "totalTokens": int(turn.get("usage_total_tokens") or 0),
                        },
                        "raw": turn.get("payload") or {},
                    },
                }
            )

        return {
            "client_uid": session["id"],
            "session_type": session.get("session_type", "live_interview"),
            "current_phase": session.get("current_phase", "introduction"),
            "tail_question_depth": session.get("tail_question_depth", 0),
            "target_duration_sec": session.get("target_duration_sec", 420),
            "closing_threshold_sec": session.get("closing_threshold_sec", 60),
            "closing_announced": bool(session.get("closing_announced", False)),
            "runtime_status": session.get("runtime_status", session.get("status", "created")),
            "live_provider": session.get("live_provider", "gemini-live"),
            "live_model": session.get("live_model", ""),
            "paused_duration_sec": int(session.get("paused_duration_sec") or 0),
            "report_requested_at": _to_unix_timestamp(session.get("report_requested_at")),
            "report_completed_at": _to_unix_timestamp(session.get("report_completed_at")),
            "job_payload": session.get("job_payload") or {},
            "resume_payload": session.get("resume_payload") or {},
            "debug_events": debug_events,
            "analysis": compat_analysis or {},
            "report_view": report_doc.get("reportView") if report_doc else None,
            "timeline": timeline,
            "report_generation_meta": report_doc.get("generationMeta") if report_doc else None,
            "comparison_payload": (report or {}).get("comparison_payload") or {},
            "schema_version": (report or {}).get("schema_version") or "",
            "reportStatus": (report_job or {}).get("status", ""),
            "reportAttempts": (report_job or {}).get("attempts", 0),
            "reportMaxAttempts": (report_job or {}).get("max_attempts", 0),
            "reportError": (report_job or {}).get("error", ""),
            "reportRequestedAt": _to_unix_timestamp((report_job or {}).get("requested_at")),
            "reportStartedAt": _to_unix_timestamp((report_job or {}).get("started_at")),
            "reportCompletedAt": _to_unix_timestamp((report_job or {}).get("completed_at")),
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
                    SELECT role, channel, content, payload, turn_index, exchange_index, turn_kind,
                           phase, provider, started_at, completed_at, latency_ms,
                           usage_input_tokens, usage_output_tokens, usage_total_tokens, created_at
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
        session = self.get_session(session_id)
        if not session:
            raise RuntimeError(f"Session not found: {session_id}")
        turns = self.get_turns(session_id)
        document = build_report_document(
            session=session,
            turns=turns,
            compat_analysis=report_payload,
            comparison_payload=comparison_payload,
        )
        self._report_repository.save_report_document(
            session_id,
            document,
            comparison_payload=comparison_payload,
            rubric_version="v1",
        )
