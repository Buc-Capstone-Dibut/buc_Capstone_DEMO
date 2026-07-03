from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# DB 드라이버를 스텁해 import 시점에 실 DB 로 붙지 않게 한다(기존 테스트 관례).
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

from fastapi.testclient import TestClient  # noqa: E402

import app.api.interview as interview_api  # noqa: E402
from app.services.llm_gemini import RepoAnalysisError  # noqa: E402

def _build_app():
    from fastapi import FastAPI

    application = FastAPI()
    application.include_router(interview_api.router)
    return application


# TestClient 는 with 없이 생성한다 — with 진입 시 startup 이벤트가 실 DB init_db 를 돌린다.
# 라우터만 담은 최소 앱을 써서 app.main 의 startup(report agent 스레드/init_db)도 피한다.
client = TestClient(_build_app())


class ParseJobContractTests(unittest.TestCase):
    def test_missing_url_returns_400(self) -> None:
        resp = client.post("/v1/interview/parse-job", json={"url": ""})
        self.assertEqual(resp.status_code, 400)

    def test_success_shape(self) -> None:
        fake = types.SimpleNamespace(
            fetch_url_text=lambda url: "본문",
            parse_job_from_text=lambda url, ctx: {"title": "T", "url": url},
        )
        with patch.object(interview_api, "get_gemini_service", return_value=fake):
            resp = client.post("/v1/interview/parse-job", json={"url": "https://x.test/job"})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["title"], "T")

    def test_fetch_failure_returns_fetch_failed_with_fallback(self) -> None:
        import httpx

        def _raise(url):
            raise httpx.ConnectError("boom")

        fake = types.SimpleNamespace(fetch_url_text=_raise, parse_job_from_text=lambda *a: {})
        with patch.object(interview_api, "get_gemini_service", return_value=fake):
            resp = client.post("/v1/interview/parse-job", json={"url": "https://x.test/job"})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"], "FETCH_FAILED")
        self.assertIn("data", body)
        self.assertEqual(body["data"]["url"], "https://x.test/job")

    def test_parse_failure_returns_parse_failed_with_context_fallback(self) -> None:
        def _parse(url, ctx):
            raise ValueError("no json")

        fake = types.SimpleNamespace(
            fetch_url_text=lambda url: "긴 본문 컨텍스트",
            parse_job_from_text=_parse,
        )
        with patch.object(interview_api, "get_gemini_service", return_value=fake):
            resp = client.post("/v1/interview/parse-job", json={"url": "https://x.test/job"})
        body = resp.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"], "PARSE_FAILED")
        self.assertEqual(body["data"]["description"], "긴 본문 컨텍스트")

    def test_quota_failure_returns_llm_quota(self) -> None:
        def _parse(url, ctx):
            raise RuntimeError("429 quota exceeded")

        fake = types.SimpleNamespace(
            fetch_url_text=lambda url: "본문",
            parse_job_from_text=_parse,
        )
        with patch.object(interview_api, "get_gemini_service", return_value=fake):
            resp = client.post("/v1/interview/parse-job", json={"url": "https://x.test/job"})
        body = resp.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"], "LLM_QUOTA")


class SessionStartContractTests(unittest.TestCase):
    def test_missing_user_id_returns_401(self) -> None:
        resp = client.post("/v1/interview/session/start", json={"jobData": {}})
        self.assertEqual(resp.status_code, 401)

    def test_authenticated_start_returns_session_id(self) -> None:
        with patch.object(
            interview_api.service,
            "create_session",
            return_value={"id": "sess-1", "mode": "voice", "status": "created"},
        ):
            resp = client.post(
                "/v1/interview/session/start",
                json={"mode": "voice", "jobData": {"role": "backend"}},
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["sessionId"], "sess-1")

    def test_empty_job_data_still_starts(self) -> None:
        with patch.object(
            interview_api.service,
            "create_session",
            return_value={"id": "sess-2", "status": "created"},
        ) as create_mock:
            resp = client.post(
                "/v1/interview/session/start",
                json={},
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(create_mock.called)


class PortfolioAnalyzeContractTests(unittest.TestCase):
    def test_missing_user_id_returns_401(self) -> None:
        resp = client.post(
            "/v1/interview/portfolio/analyze-public-repo",
            json={"repoUrl": "https://github.com/a/b"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_public_repo_only_maps_to_error_code(self) -> None:
        def _analyze(repo_url):
            raise RepoAnalysisError("PUBLIC_REPO_ONLY")

        fake = types.SimpleNamespace(analyze_public_repo=_analyze)
        with patch.object(interview_api, "get_gemini_service", return_value=fake):
            resp = client.post(
                "/v1/interview/portfolio/analyze-public-repo",
                json={"repoUrl": "https://github.com/a/b"},
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"], "PUBLIC_REPO_ONLY")

    def test_success_returns_analysis(self) -> None:
        fake = types.SimpleNamespace(
            analyze_public_repo=lambda repo_url: {"readmeSummary": "R", "detectedTopics": ["fastapi"]}
        )
        with patch.object(interview_api, "get_gemini_service", return_value=fake):
            resp = client.post(
                "/v1/interview/portfolio/analyze-public-repo",
                json={"repoUrl": "https://github.com/a/b"},
                headers={"x-user-id": "user-1"},
            )
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["readmeSummary"], "R")


class PortfolioSessionStartContractTests(unittest.TestCase):
    def test_saves_source_snapshot(self) -> None:
        with patch.object(
            interview_api.service,
            "create_session",
            return_value={"id": "psess-1"},
        ), patch.object(interview_api.service, "save_portfolio_source") as save_mock:
            resp = client.post(
                "/v1/interview/portfolio/session/start",
                json={
                    "repoUrl": "https://github.com/a/b",
                    "readmeSummary": "README 요약",
                    "treeSummary": "tree",
                    "infraHypotheses": ["docker"],
                },
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(save_mock.called)
        body = resp.json()
        self.assertEqual(body["data"]["sessionType"], "portfolio_defense")
        self.assertEqual(body["data"]["rubricWeights"]["designIntent"], 60)

    def test_source_save_failure_is_swallowed(self) -> None:
        def _boom(**kwargs):
            raise RuntimeError("db down")

        with patch.object(
            interview_api.service,
            "create_session",
            return_value={"id": "psess-2"},
        ), patch.object(interview_api.service, "save_portfolio_source", side_effect=_boom):
            resp = client.post(
                "/v1/interview/portfolio/session/start",
                json={
                    "repoUrl": "https://github.com/a/b",
                    "readmeSummary": "README",
                },
                headers={"x-user-id": "user-1"},
            )
        # 세션 생성은 유지되고 저장 실패는 흡수 → 200
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])

    def test_missing_user_id_returns_401(self) -> None:
        resp = client.post(
            "/v1/interview/portfolio/session/start",
            json={"repoUrl": "https://github.com/a/b"},
        )
        self.assertEqual(resp.status_code, 401)


class CompleteSessionContractTests(unittest.TestCase):
    def test_non_uuid_session_returns_404(self) -> None:
        with patch.object(interview_api.service, "get_session", return_value=None):
            resp = client.post(
                "/v1/interview/sessions/not-a-uuid/complete",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 404)

    def test_missing_session_returns_404(self) -> None:
        with patch.object(interview_api.service, "get_session", return_value=None):
            resp = client.post(
                "/v1/interview/sessions/sess-x/complete",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 404)

    def test_enqueue_failure_is_graceful(self) -> None:
        session = {"id": "sess-1", "status": "completed", "session_type": "live_interview"}
        with patch.object(interview_api.service, "get_session", return_value=session), patch.object(
            interview_api.service, "get_report_job", return_value=None
        ), patch.object(
            interview_api.service, "enqueue_report_job", side_effect=RuntimeError("enqueue boom")
        ):
            resp = client.post(
                "/v1/interview/sessions/sess-1/complete",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertFalse(body["data"]["reportEnqueued"])


class ReportStatusContractTests(unittest.TestCase):
    def test_no_job_and_completed_session_returns_terminal_failed(self) -> None:
        session = {"id": "sess-1", "status": "completed"}
        with patch.object(interview_api.service, "get_session", return_value=session), patch.object(
            interview_api.service, "get_report_job", return_value=None
        ):
            resp = client.get(
                "/v1/interview/sessions/sess-1/report-status",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "failed")

    def test_no_job_and_active_session_returns_running(self) -> None:
        session = {"id": "sess-1", "status": "in_progress"}
        with patch.object(interview_api.service, "get_session", return_value=session), patch.object(
            interview_api.service, "get_report_job", return_value=None
        ):
            resp = client.get(
                "/v1/interview/sessions/sess-1/report-status",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.json()["status"], "running")

    def test_pending_job_returns_running(self) -> None:
        session = {"id": "sess-1", "status": "completed"}
        with patch.object(interview_api.service, "get_session", return_value=session), patch.object(
            interview_api.service, "get_report_job", return_value={"status": "pending"}
        ):
            resp = client.get(
                "/v1/interview/sessions/sess-1/report-status",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.json()["status"], "running")

    def test_missing_session_returns_404(self) -> None:
        with patch.object(interview_api.service, "get_session", return_value=None):
            resp = client.get(
                "/v1/interview/sessions/sess-x/report-status",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 404)


class PrepareOpeningContractTests(unittest.TestCase):
    def test_none_artifact_yields_prepared_false(self) -> None:
        session = {"id": "sess-1", "status": "created"}

        async def _none(_session):
            return None

        with patch.object(interview_api.service, "get_session", return_value=session), patch.object(
            interview_api.service, "get_turns", return_value=[]
        ), patch.object(
            interview_api, "prepare_opening_artifact_from_session", side_effect=_none
        ):
            resp = client.post(
                "/v1/interview/sessions/sess-1/prepare-opening",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertFalse(body["data"]["prepared"])
        self.assertEqual(body["data"]["reason"], "opening_unavailable")


class DeprecatedEndpointContractTests(unittest.TestCase):
    def test_chat_requires_auth_then_410(self) -> None:
        # 무인증은 401 로 먼저 막힌다.
        resp = client.post("/v1/interview/chat")
        self.assertEqual(resp.status_code, 401)

    def test_chat_authenticated_returns_410(self) -> None:
        resp = client.post("/v1/interview/chat", headers={"x-user-id": "user-1"})
        self.assertEqual(resp.status_code, 410)

    def test_analyze_requires_auth_then_410(self) -> None:
        resp = client.post("/v1/interview/analyze")
        self.assertEqual(resp.status_code, 401)

    def test_analyze_authenticated_returns_410(self) -> None:
        resp = client.post("/v1/interview/analyze", headers={"x-user-id": "user-1"})
        self.assertEqual(resp.status_code, 410)

    def test_portfolio_chat_requires_auth(self) -> None:
        resp = client.post("/v1/interview/portfolio/chat")
        self.assertEqual(resp.status_code, 401)

    def test_livekit_token_is_placeholder_501(self) -> None:
        # LiveKit 토큰은 Next.js BFF 에서 발급하므로 FastAPI 는 501 placeholder.
        resp = client.post("/v1/interview/livekit/token", json={})
        self.assertEqual(resp.status_code, 501)


class SessionListingContractTests(unittest.TestCase):
    def test_list_sessions_requires_auth(self) -> None:
        resp = client.get("/v1/interview/sessions")
        self.assertEqual(resp.status_code, 401)

    def test_list_sessions_authenticated(self) -> None:
        with patch.object(interview_api.service, "list_sessions_for_user", return_value=[]):
            resp = client.get("/v1/interview/sessions", headers={"x-user-id": "user-1"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["data"], [])

    def test_get_session_missing_returns_404(self) -> None:
        with patch.object(interview_api.service, "get_session_detail", return_value=None):
            resp = client.get("/v1/interview/sessions/sess-x", headers={"x-user-id": "user-1"})
        self.assertEqual(resp.status_code, 404)


class RetryReportContractTests(unittest.TestCase):
    def test_retry_requires_auth(self) -> None:
        resp = client.post("/v1/interview/sessions/sess-1/retry-report")
        self.assertEqual(resp.status_code, 401)

    def test_retry_missing_session_404(self) -> None:
        with patch.object(interview_api.service, "get_session", return_value=None):
            resp = client.post(
                "/v1/interview/sessions/sess-x/retry-report",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 404)

    def test_retry_non_completed_session_409(self) -> None:
        session = {"id": "sess-1", "status": "in_progress"}
        with patch.object(interview_api.service, "get_session", return_value=session):
            resp = client.post(
                "/v1/interview/sessions/sess-1/retry-report",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 409)

    def test_retry_completed_session_enqueues(self) -> None:
        session = {"id": "sess-1", "status": "completed", "session_type": "portfolio_defense"}
        with patch.object(interview_api.service, "get_session", return_value=session), patch.object(
            interview_api.service, "enqueue_report_job", return_value={"status": "pending"}
        ):
            resp = client.post(
                "/v1/interview/sessions/sess-1/retry-report",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["data"]["status"], "pending")


class PrepareOpeningExtraContractTests(unittest.TestCase):
    def test_requires_auth(self) -> None:
        resp = client.post("/v1/interview/sessions/sess-1/prepare-opening")
        self.assertEqual(resp.status_code, 401)

    def test_missing_session_404(self) -> None:
        with patch.object(interview_api.service, "get_session", return_value=None):
            resp = client.post(
                "/v1/interview/sessions/sess-1/prepare-opening",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 404)

    def test_completed_session_409(self) -> None:
        session = {"id": "sess-1", "status": "completed"}
        with patch.object(interview_api.service, "get_session", return_value=session):
            resp = client.post(
                "/v1/interview/sessions/sess-1/prepare-opening",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 409)

    def test_session_already_started_returns_prepared_false(self) -> None:
        session = {"id": "sess-1", "status": "created"}
        with patch.object(interview_api.service, "get_session", return_value=session), patch.object(
            interview_api.service, "get_turns", return_value=[{"role": "model"}]
        ):
            resp = client.post(
                "/v1/interview/sessions/sess-1/prepare-opening",
                headers={"x-user-id": "user-1"},
            )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertFalse(body["data"]["prepared"])
        self.assertEqual(body["data"]["reason"], "session_already_started")


if __name__ == "__main__":
    unittest.main()
