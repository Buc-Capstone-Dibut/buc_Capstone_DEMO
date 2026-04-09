from __future__ import annotations

import uuid
from typing import Any

from psycopg.types.json import Jsonb

from app.db.database import get_connection
from app.interview.reporting.document import REPORT_SCHEMA_VERSION


class ReportRepository:
    def save_report_document(
        self,
        session_id: str,
        document: dict[str, Any],
        *,
        comparison_payload: dict[str, Any] | None = None,
        rubric_version: str | None = None,
    ) -> None:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if comparison_payload is None:
                    cur.execute(
                        """
                        INSERT INTO public.interview_reports (session_id, report_payload, schema_version)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (session_id)
                        DO UPDATE SET
                            report_payload = EXCLUDED.report_payload,
                            schema_version = EXCLUDED.schema_version,
                            updated_at = now()
                        """,
                        (session_id, Jsonb(document), REPORT_SCHEMA_VERSION),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO public.interview_reports (
                            session_id, report_payload, comparison_payload, rubric_version, schema_version
                        )
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (session_id)
                        DO UPDATE SET
                            report_payload = EXCLUDED.report_payload,
                            comparison_payload = EXCLUDED.comparison_payload,
                            schema_version = EXCLUDED.schema_version,
                            updated_at = now()
                        """,
                        (
                            session_id,
                            Jsonb(document),
                            Jsonb(comparison_payload),
                            rubric_version or "v1",
                            REPORT_SCHEMA_VERSION,
                        ),
                    )

                cur.execute(
                    """
                    UPDATE public.interview_sessions
                    SET report_completed_at = now(), updated_at = now()
                    WHERE id = %s
                    """,
                    (session_id,),
                )
            conn.commit()

    def enqueue_report_job(self, session_id: str, session_type: str, *, force: bool = False) -> dict[str, Any]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE public.interview_sessions
                    SET report_requested_at = COALESCE(report_requested_at, now()), updated_at = now()
                    WHERE id = %s
                    """,
                    (session_id,),
                )
                cur.execute(
                    """
                    SELECT id, session_id, session_type, status, attempts, max_attempts, error,
                           requested_at, started_at, completed_at, updated_at
                    FROM public.interview_report_jobs
                    WHERE session_id = %s
                    """,
                    (session_id,),
                )
                existing = cur.fetchone()
                if existing:
                    if existing["status"] in {"done", "running", "pending"} and not force:
                        return existing

                    cur.execute(
                        """
                        UPDATE public.interview_report_jobs
                        SET
                            status = 'pending',
                            attempts = 0,
                            error = '',
                            requested_at = now(),
                            started_at = NULL,
                            completed_at = NULL,
                            updated_at = now()
                        WHERE session_id = %s
                        RETURNING id, session_id, session_type, status, attempts, max_attempts, error,
                                  requested_at, started_at, completed_at, updated_at
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
                        id, session_id, session_type, status, attempts, max_attempts, error, requested_at
                    ) VALUES (%s, %s, %s, 'pending', 0, 3, '', now())
                    RETURNING id, session_id, session_type, status, attempts, max_attempts, error,
                              requested_at, started_at, completed_at, updated_at
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
                        started_at = now(),
                        updated_at = now()
                    WHERE id = %s
                    RETURNING id, session_id, session_type, status, attempts, max_attempts, error,
                              requested_at, started_at, completed_at, updated_at
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
                        completed_at = now(),
                        updated_at = now()
                    WHERE id = %s
                    RETURNING session_id
                    """,
                    (job_id,),
                )
                row = cur.fetchone()
                if row:
                    cur.execute(
                        """
                        UPDATE public.interview_sessions
                        SET report_completed_at = now(), updated_at = now()
                        WHERE id = %s
                        """,
                        (row["session_id"],),
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
                        completed_at = CASE WHEN attempts >= max_attempts THEN now() ELSE completed_at END,
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
                    SELECT id, session_id, session_type, status, attempts, max_attempts, error,
                           requested_at, started_at, completed_at, updated_at
                    FROM public.interview_report_jobs
                    WHERE session_id = %s
                    """,
                    (session_id,),
                )
                return cur.fetchone()
