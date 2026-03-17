from __future__ import annotations

import sys
import types
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

_psycopg_stub = types.ModuleType("psycopg")
_psycopg_stub.connect = lambda *args, **kwargs: None
sys.modules.setdefault("psycopg", _psycopg_stub)

_psycopg_rows_stub = types.ModuleType("psycopg.rows")
_psycopg_rows_stub.dict_row = object()
sys.modules.setdefault("psycopg.rows", _psycopg_rows_stub)

_psycopg_types_stub = types.ModuleType("psycopg.types")
sys.modules.setdefault("psycopg.types", _psycopg_types_stub)

_psycopg_json_stub = types.ModuleType("psycopg.types.json")


class _Jsonb:
    def __init__(self, value) -> None:
        self.value = value


_psycopg_json_stub.Jsonb = _Jsonb
sys.modules.setdefault("psycopg.types.json", _psycopg_json_stub)

if "app.services.interview_service" in sys.modules:
    del sys.modules["app.services.interview_service"]

from app.interview.reporting.repository import ReportRepository
from app.services.interview_service import InterviewService


class FakeCursor:
    def __init__(
        self,
        *,
        fetchone_results: list[dict | None] | None = None,
        fetchall_results: list[list[dict]] | None = None,
    ) -> None:
        self.fetchone_results = list(fetchone_results or [])
        self.fetchall_results = list(fetchall_results or [])
        self.executed: list[tuple[str, tuple | None]] = []

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False

    def execute(self, sql: str, params: tuple | None = None) -> None:
        self.executed.append((" ".join(sql.split()), params))

    def fetchone(self):
        if self.fetchone_results:
            return self.fetchone_results.pop(0)
        return None

    def fetchall(self):
        if self.fetchall_results:
            return self.fetchall_results.pop(0)
        return []


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self.cursor_instance = cursor
        self.commit_count = 0

    def __enter__(self) -> "FakeConnection":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False

    def cursor(self) -> FakeCursor:
        return self.cursor_instance

    def commit(self) -> None:
        self.commit_count += 1


class InterviewServiceOwnerScopeTests(unittest.TestCase):
    def test_get_session_detail_scopes_first_query_by_user_id(self) -> None:
        created_at = datetime(2026, 3, 11, 3, 0, tzinfo=timezone.utc)
        cursor = FakeCursor(
            fetchone_results=[
                {
                    "id": "session-1",
                    "session_type": "live_interview",
                    "status": "in_progress",
                    "current_phase": "technical",
                    "target_duration_sec": 600,
                    "closing_threshold_sec": 60,
                    "job_payload": {},
                    "resume_payload": {},
                    "created_at": created_at,
                },
                None,
                None,
            ],
            fetchall_results=[[]],
        )
        connection = FakeConnection(cursor)

        with patch("app.services.interview_service.get_connection", return_value=connection):
            detail = InterviewService().get_session_detail("session-1", user_id="user-1")

        self.assertIsNotNone(detail)
        self.assertGreaterEqual(len(cursor.executed), 1)
        first_sql, first_params = cursor.executed[0]
        self.assertIn("WHERE id = %s AND user_id = %s", first_sql)
        self.assertEqual(first_params, ("session-1", "user-1"))

    def test_get_session_detail_without_user_id_uses_session_id_only(self) -> None:
        created_at = datetime(2026, 3, 11, 3, 0, tzinfo=timezone.utc)
        cursor = FakeCursor(
            fetchone_results=[
                {
                    "id": "session-2",
                    "session_type": "live_interview",
                    "status": "created",
                    "current_phase": "introduction",
                    "target_duration_sec": 420,
                    "closing_threshold_sec": 60,
                    "job_payload": {},
                    "resume_payload": {},
                    "created_at": created_at,
                },
                None,
                None,
            ],
            fetchall_results=[[]],
        )
        connection = FakeConnection(cursor)

        with patch("app.services.interview_service.get_connection", return_value=connection):
            detail = InterviewService().get_session_detail("session-2")

        self.assertIsNotNone(detail)
        first_sql, first_params = cursor.executed[0]
        self.assertIn("WHERE id = %s", first_sql)
        self.assertNotIn("user_id = %s", first_sql)
        self.assertEqual(first_params, ("session-2",))


class ReportRepositoryLifecycleTests(unittest.TestCase):
    def test_enqueue_report_job_creates_pending_job_and_commits(self) -> None:
        created_job = {
            "id": "job-1",
            "session_id": "session-1",
            "session_type": "live_interview",
            "status": "pending",
            "attempts": 0,
            "max_attempts": 3,
            "error": "",
            "requested_at": None,
            "started_at": None,
            "completed_at": None,
            "updated_at": None,
        }
        cursor = FakeCursor(
            fetchone_results=[
                None,
                created_job,
            ]
        )
        connection = FakeConnection(cursor)

        with patch("app.interview.reporting.repository.get_connection", return_value=connection), patch(
            "app.interview.reporting.repository.uuid.uuid4",
            return_value="job-1",
        ):
            row = ReportRepository().enqueue_report_job("session-1", "live_interview")

        self.assertEqual(row, created_job)
        self.assertEqual(connection.commit_count, 1)
        executed_sql = "\n".join(sql for sql, _ in cursor.executed)
        self.assertIn("UPDATE public.interview_sessions", executed_sql)
        self.assertIn("INSERT INTO public.interview_report_jobs", executed_sql)

    def test_reserve_next_report_job_marks_job_running(self) -> None:
        reserved_job = {
            "id": "job-2",
            "session_id": "session-2",
            "session_type": "portfolio_defense",
            "status": "running",
            "attempts": 1,
            "max_attempts": 3,
            "error": "",
            "requested_at": None,
            "started_at": None,
            "completed_at": None,
            "updated_at": None,
        }
        cursor = FakeCursor(
            fetchone_results=[
                {"id": "job-2"},
                reserved_job,
            ]
        )
        connection = FakeConnection(cursor)

        with patch("app.interview.reporting.repository.get_connection", return_value=connection):
            row = ReportRepository().reserve_next_report_job()

        self.assertEqual(row, reserved_job)
        self.assertEqual(connection.commit_count, 1)
        self.assertIn("FOR UPDATE SKIP LOCKED", cursor.executed[0][0])
        self.assertIn("status = 'running'", cursor.executed[1][0])

    def test_fail_report_job_requeues_before_max_attempts(self) -> None:
        cursor = FakeCursor()
        connection = FakeConnection(cursor)

        with patch("app.interview.reporting.repository.get_connection", return_value=connection):
            ReportRepository().fail_report_job("job-3", "temporary failure")

        self.assertEqual(connection.commit_count, 1)
        self.assertEqual(len(cursor.executed), 1)
        sql, params = cursor.executed[0]
        self.assertIn("status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END", sql)
        self.assertEqual(params, ("temporary failure", "job-3"))

    def test_complete_report_job_updates_session_completion_timestamp(self) -> None:
        cursor = FakeCursor(fetchone_results=[{"session_id": "session-4"}])
        connection = FakeConnection(cursor)

        with patch("app.interview.reporting.repository.get_connection", return_value=connection):
            ReportRepository().complete_report_job("job-4")

        self.assertEqual(connection.commit_count, 1)
        self.assertEqual(len(cursor.executed), 2)
        self.assertIn("UPDATE public.interview_report_jobs", cursor.executed[0][0])
        self.assertIn("UPDATE public.interview_sessions", cursor.executed[1][0])
        self.assertEqual(cursor.executed[1][1], ("session-4",))


if __name__ == "__main__":
    unittest.main()
