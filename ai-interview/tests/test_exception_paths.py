from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# ── psycopg 스텁 + DataError(비-UUID 방어 검증에 필요) ──
_psycopg_stub = types.ModuleType("psycopg")
_psycopg_stub.connect = lambda *args, **kwargs: None


class _PsycopgDataError(Exception):
    pass


_psycopg_errors_stub = types.ModuleType("psycopg.errors")
_psycopg_errors_stub.DataError = _PsycopgDataError
_psycopg_stub.errors = _psycopg_errors_stub
sys.modules.setdefault("psycopg", _psycopg_stub)
sys.modules.setdefault("psycopg.errors", _psycopg_errors_stub)

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

import app.services.interview_service as service_module  # noqa: E402
from app.services.interview_service import InterviewService  # noqa: E402


class _RaisingCursor:
    def __init__(self, exc) -> None:
        self._exc = exc

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def execute(self, *a, **k):
        raise self._exc

    def fetchone(self):
        return None


class _RaisingConnection:
    def __init__(self, cursor) -> None:
        self._cursor = cursor

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def cursor(self):
        return self._cursor

    def commit(self):
        pass


class GetSessionDataErrorTests(unittest.TestCase):
    def test_non_uuid_session_id_returns_none(self) -> None:
        # psycopg.errors.DataError(잘못된 형식의 id) 는 500 대신 None 으로 흡수한다.
        # 실코드가 except 로 참조하는 바로 그 세대의 DataError 를 raise 해 세대 무관하게 검증한다.
        data_error_cls = service_module.psycopg.errors.DataError
        connection = _RaisingConnection(_RaisingCursor(data_error_cls("invalid input")))
        with patch.object(service_module, "get_connection", return_value=connection):
            result = InterviewService().get_session("not-a-uuid")
        self.assertIsNone(result)

    def test_require_owner_without_user_returns_none(self) -> None:
        result = InterviewService().get_session("sess-1", user_id=None, require_owner=True)
        self.assertIsNone(result)


class ParseJobErrorMappingTests(unittest.TestCase):
    """parse_job 핸들러의 에러 코드 매핑 — 유형별로 정확히 분기하는지."""

    def setUp(self) -> None:
        import app.api.interview as interview_api

        self.interview_api = interview_api

    def _call(self, fetch_fn, parse_fn):
        import asyncio

        from app.schemas.interview import ParseJobRequest

        fake = types.SimpleNamespace(fetch_url_text=fetch_fn, parse_job_from_text=parse_fn)
        with patch.object(self.interview_api, "get_gemini_service", return_value=fake):
            return asyncio.run(self.interview_api.parse_job(ParseJobRequest(url="https://x.test/j")))

    def test_fetch_httpx_error_maps_fetch_failed(self) -> None:
        import httpx

        def _fetch(url):
            raise httpx.ConnectError("down")

        result = self._call(_fetch, lambda *a: {})
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "FETCH_FAILED")
        self.assertIn("data", result)

    def test_fetch_generic_error_maps_fetch_failed(self) -> None:
        def _fetch(url):
            raise RuntimeError("weird")

        result = self._call(_fetch, lambda *a: {})
        self.assertEqual(result["error"], "FETCH_FAILED")

    def test_parse_value_error_maps_parse_failed(self) -> None:
        def _parse(url, ctx):
            raise ValueError("no json")

        result = self._call(lambda url: "본문", _parse)
        self.assertEqual(result["error"], "PARSE_FAILED")
        self.assertEqual(result["data"]["description"], "본문")

    def test_parse_quota_maps_llm_quota(self) -> None:
        def _parse(url, ctx):
            raise RuntimeError("HTTP 429 quota")

        result = self._call(lambda url: "본문", _parse)
        self.assertEqual(result["error"], "LLM_QUOTA")

    def test_success_maps_success_true(self) -> None:
        result = self._call(lambda url: "본문", lambda url, ctx: {"title": "T", "url": url})
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["title"], "T")


class CompleteEnqueueFailurePathTests(unittest.TestCase):
    def setUp(self) -> None:
        import app.api.interview as interview_api

        self.interview_api = interview_api

    def test_enqueue_failure_keeps_session_completed_and_reports_flag(self) -> None:
        import asyncio

        session = {"id": "sess-1", "status": "completed", "session_type": "live_interview"}
        with patch.object(self.interview_api.service, "get_session", return_value=session), patch.object(
            self.interview_api.service, "get_report_job", return_value=None
        ), patch.object(
            self.interview_api.service, "enqueue_report_job", side_effect=RuntimeError("boom")
        ):
            result = asyncio.run(self.interview_api.complete_session("sess-1", x_user_id="user-1"))
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["status"], "completed")
        self.assertFalse(result["data"]["reportEnqueued"])

    def test_enqueue_success_reports_enqueued_true(self) -> None:
        import asyncio

        session = {"id": "sess-2", "status": "completed", "session_type": "live_interview"}
        with patch.object(self.interview_api.service, "get_session", return_value=session), patch.object(
            self.interview_api.service, "get_report_job", return_value=None
        ), patch.object(
            self.interview_api.service, "enqueue_report_job", return_value={"status": "pending"}
        ):
            result = asyncio.run(self.interview_api.complete_session("sess-2", x_user_id="user-1"))
        self.assertTrue(result["data"]["reportEnqueued"])
        self.assertEqual(result["data"]["reportStatus"], "pending")


class PreparedOpeningLiveExceptionTests(unittest.IsolatedAsyncioTestCase):
    """prepared_opening 내부 Live 예외가 500 대신 None(→ prepared:false) 으로 우아하게 처리되는지."""

    async def test_live_exception_returns_none(self) -> None:
        _live = types.ModuleType("app.services.gemini_live_voice_service")

        class _D:
            def __init__(self, *a, **k) -> None:
                self.provider = "gemini-live"
                self.enabled = True

            async def close(self) -> None:
                return None

        _live.GeminiLiveInterviewSession = _D
        with patch.dict(sys.modules, {"app.services.gemini_live_voice_service": _live}):
            import app.interview.runtime.prepared_opening as po

            async def _raise(*args, **kwargs):
                raise RuntimeError("live boom")

            session = {
                "id": "sess-1",
                "session_type": "live_interview",
                "status": "created",
                "job_payload": {"role": "backend"},
                "target_duration_sec": 420,
                "closing_threshold_sec": 60,
            }
            with patch.object(po, "request_live_spoken_text_turn", side_effect=_raise):
                artifact = await po.prepare_opening_artifact_from_session(session)
            self.assertIsNone(artifact)


class ReportStatusMappingTests(unittest.TestCase):
    def setUp(self) -> None:
        import app.api.interview as interview_api

        self.interview_api = interview_api

    def _status(self, session, job):
        import asyncio

        with patch.object(self.interview_api.service, "get_session", return_value=session), patch.object(
            self.interview_api.service, "get_report_job", return_value=job
        ):
            return asyncio.run(
                self.interview_api.session_report_status("sess-1", x_user_id="user-1")
            )

    def test_running_job_maps_running(self) -> None:
        result = self._status({"id": "s", "status": "completed"}, {"status": "running"})
        self.assertEqual(result["status"], "running")

    def test_done_job_maps_completed(self) -> None:
        result = self._status({"id": "s", "status": "completed"}, {"status": "done"})
        self.assertEqual(result["status"], "completed")

    def test_failed_job_maps_failed(self) -> None:
        result = self._status({"id": "s", "status": "completed"}, {"status": "failed"})
        self.assertEqual(result["status"], "failed")

    def test_no_job_completed_session_terminates_failed(self) -> None:
        result = self._status({"id": "s", "status": "completed"}, None)
        self.assertEqual(result["status"], "failed")

    def test_no_job_active_session_running(self) -> None:
        result = self._status({"id": "s", "status": "in_progress"}, None)
        self.assertEqual(result["status"], "running")


class GetSessionDetailMissingTests(unittest.TestCase):
    def test_missing_session_detail_returns_none(self) -> None:
        class _NoneCursor:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def execute(self, *a, **k):
                pass

            def fetchone(self):
                return None

            def fetchall(self):
                return []

        class _Conn:
            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def cursor(self):
                return _NoneCursor()

            def commit(self):
                pass

        with patch.object(service_module, "get_connection", return_value=_Conn()):
            result = InterviewService().get_session_detail("sess-x", user_id="user-1")
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
