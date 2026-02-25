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
    ) -> dict[str, Any]:
        session_id = str(uuid.uuid4())

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO public.interview_sessions (
                        id, user_id, mode, personality, status,
                        job_payload, resume_payload, jd_text, resume_text
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        session_id,
                        user_id,
                        mode,
                        personality,
                        status,
                        Jsonb(job_data or {}),
                        Jsonb(resume_data or {}),
                        _to_text_snapshot(job_data),
                        _to_text_snapshot(resume_data),
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
                        SET status = %s, current_phase = %s, updated_at = now()
                        WHERE id = %s
                        """,
                        (status, current_phase, session_id),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE public.interview_sessions
                        SET status = %s, updated_at = now()
                        WHERE id = %s
                        """,
                        (status, session_id),
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
                        COALESCE(t.turn_count, 0) AS event_count
                    FROM public.interview_sessions s
                    LEFT JOIN (
                        SELECT session_id, COUNT(*)::int AS turn_count
                        FROM public.interview_turns
                        GROUP BY session_id
                    ) t ON t.session_id = s.id
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
            }
            for row in rows
        ]

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
            "debug_events": debug_events,
            "analysis": (report or {}).get("report_payload", {}),
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
