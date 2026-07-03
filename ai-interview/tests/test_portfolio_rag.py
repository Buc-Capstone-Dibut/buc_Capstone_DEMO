from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# ── psycopg 스텁(실 DB import 회피) — test_interview_backend.py 패턴 ──
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

# ── gemini_live 스텁 — live_client import 시 필요 ──
_live_stub = types.ModuleType("app.services.gemini_live_voice_service")


class _DummyLiveSession:
    def __init__(self, *args, **kwargs) -> None:
        self.provider = "gemini-live"
        self.enabled = True

    async def close(self) -> None:
        return None


_live_stub.GeminiLiveInterviewSession = _DummyLiveSession
sys.modules.setdefault("app.services.gemini_live_voice_service", _live_stub)

from app.interview.domain.interview_memory import summarize_portfolio_for_prompt  # noqa: E402
from app.interview.runtime.live_client import build_live_session_instruction  # noqa: E402
from app.interview.runtime.state import VoiceWsState  # noqa: E402
from app.interview.transcript.runtime_cache import (  # noqa: E402
    hydrate_state_from_session_row as cache_hydrate,
)
import app.services.interview_service as service_module  # noqa: E402
from app.services.interview_service import InterviewService  # noqa: E402


# ── test_interview_backend 의 Fake DB 스텁 재사용 ──
class FakeCursor:
    def __init__(self, *, fetchone_results=None) -> None:
        self.fetchone_results = list(fetchone_results or [])
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def execute(self, sql, params=None):
        self.executed.append((" ".join(sql.split()), params))

    def fetchone(self):
        return self.fetchone_results.pop(0) if self.fetchone_results else None


class FakeConnection:
    def __init__(self, cursor) -> None:
        self.cursor_instance = cursor

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def cursor(self):
        return self.cursor_instance

    def commit(self):
        pass


def _noop_int(_x):
    return int(_x or 0)


def _estimated(_x):
    return 5


class GetPortfolioSourceTests(unittest.TestCase):
    def test_selects_snapshot_columns_by_session_id(self) -> None:
        row = {
            "repo_url": "https://github.com/a/b",
            "readme_snapshot": "README",
            "tree_snapshot": "tree",
            "infra_files_snapshot": "docker",
        }
        cursor = FakeCursor(fetchone_results=[row])
        connection = FakeConnection(cursor)
        with patch.object(service_module, "get_connection", return_value=connection):
            result = InterviewService().get_portfolio_source("sess-1")
        self.assertEqual(result["repo_url"], "https://github.com/a/b")
        sql, params = cursor.executed[0]
        self.assertIn("FROM public.portfolio_sources", sql)
        self.assertIn("WHERE session_id = %s", sql)
        self.assertEqual(params, ("sess-1",))

    def test_returns_none_when_absent(self) -> None:
        cursor = FakeCursor(fetchone_results=[None])
        connection = FakeConnection(cursor)
        with patch.object(service_module, "get_connection", return_value=connection):
            result = InterviewService().get_portfolio_source("sess-x")
        self.assertIsNone(result)


class HydratePortfolioMergeTests(unittest.TestCase):
    def _hydrate(self, session, fetcher):
        state = VoiceWsState()
        cache_hydrate(
            state,
            session,
            turns=[],
            clamp_target_duration=_noop_int,
            clamp_closing_threshold=_noop_int,
            estimated_total_questions=_estimated,
            hydrate_turns=lambda *a, **k: None,
            fetch_portfolio_source=fetcher,
        )
        return state

    def test_portfolio_session_merges_source_into_job_data(self) -> None:
        session = {
            "id": "sess-1",
            "session_type": "portfolio_defense",
            "status": "created",
            "job_payload": {"repoUrl": "https://github.com/a/b"},
        }

        def fetcher(session_id):
            self.assertEqual(session_id, "sess-1")
            return {
                "repo_url": "https://github.com/a/b",
                "readme_snapshot": "README",
                "tree_snapshot": "tree",
                "infra_files_snapshot": "docker\ncompose",
            }

        state = self._hydrate(session, fetcher)
        self.assertIn("portfolioSource", state.job_data)
        self.assertEqual(state.job_data["portfolioSource"]["readme"], "README")
        self.assertEqual(state.job_data["portfolioSource"]["infra"], "docker\ncompose")

    def test_live_interview_session_does_not_query(self) -> None:
        session = {
            "id": "sess-2",
            "session_type": "live_interview",
            "status": "created",
            "job_payload": {"role": "backend"},
        }
        called = {"n": 0}

        def fetcher(_session_id):
            called["n"] += 1
            return {}

        state = self._hydrate(session, fetcher)
        self.assertEqual(called["n"], 0)
        self.assertNotIn("portfolioSource", state.job_data)

    def test_retrieve_failure_is_ignored(self) -> None:
        session = {
            "id": "sess-3",
            "session_type": "portfolio_defense",
            "status": "created",
            "job_payload": {"repoUrl": "https://github.com/a/b"},
        }

        def fetcher(_session_id):
            raise RuntimeError("db down")

        # 예외가 새어나오지 않고 hydrate 가 완료되어야 한다(면접 진행 차단 금지).
        state = self._hydrate(session, fetcher)
        self.assertEqual(state.session_id, "sess-3")
        self.assertNotIn("portfolioSource", state.job_data)

    def test_empty_source_row_leaves_job_data_untouched(self) -> None:
        session = {
            "id": "sess-4",
            "session_type": "portfolio_defense",
            "status": "created",
            "job_payload": {"repoUrl": "https://github.com/a/b"},
        }
        state = self._hydrate(session, lambda _s: None)
        self.assertNotIn("portfolioSource", state.job_data)


class SummarizePortfolioTests(unittest.TestCase):
    def test_prefers_db_portfolio_source(self) -> None:
        job = {
            "readmeSummary": "폴백 README",
            "portfolioSource": {
                "repoUrl": "https://github.com/a/b",
                "readme": "DB README",
                "tree": "src/app",
                "infra": "Dockerfile\ndocker-compose.yml",
            },
        }
        text = summarize_portfolio_for_prompt(job, max_chars=1500)
        self.assertIn("DB README", text)
        self.assertIn("https://github.com/a/b", text)
        self.assertNotIn("폴백 README", text)

    def test_falls_back_to_job_payload_keys(self) -> None:
        job = {
            "repoUrl": "https://github.com/a/b",
            "readmeSummary": "폴백 README",
            "treeSummary": "폴백 트리",
            "infraHypotheses": ["docker 사용 추정", "postgres 사용 추정"],
            "detectedTopics": ["fastapi", "rag"],
        }
        text = summarize_portfolio_for_prompt(job, max_chars=1500)
        self.assertIn("폴백 README", text)
        self.assertIn("인프라 가설", text)
        self.assertIn("fastapi", text)

    def test_per_item_truncation_does_not_cut_mid_field(self) -> None:
        job = {
            "portfolioSource": {
                "repoUrl": "https://github.com/a/b",
                "readme": "R" * 5000,
                "tree": "T" * 5000,
                "infra": "",
            }
        }
        text = summarize_portfolio_for_prompt(job, max_chars=300)
        # 총 길이는 max_chars(+ellipsis) 근처로 제한된다.
        self.assertLessEqual(len(text), 303)
        self.assertIn("레포:", text)

    def test_empty_input_returns_empty_or_compact(self) -> None:
        self.assertEqual(summarize_portfolio_for_prompt({}, max_chars=100), "{}")
        self.assertIsInstance(summarize_portfolio_for_prompt(None, max_chars=100), str)


class LiveClientPortfolioBranchTests(unittest.TestCase):
    def test_portfolio_defense_instruction_includes_rubric(self) -> None:
        state = VoiceWsState(session_id="sess-1")
        state.session_type = "portfolio_defense"
        state.job_data = {
            "portfolioSource": {
                "repoUrl": "https://github.com/a/b",
                "readme": "README",
                "tree": "src",
                "infra": "docker",
            }
        }
        text = build_live_session_instruction(state, compact_context_text=lambda v, **k: str(v))
        self.assertIn("포트폴리오", text)
        self.assertIn("설계 의도 설명 60%", text)
        self.assertIn("코드 품질 10%", text)
        self.assertIn("AI 활용 30%", text)
        self.assertIn("https://github.com/a/b", text)

    def test_live_interview_instruction_has_no_portfolio_rubric(self) -> None:
        state = VoiceWsState(session_id="sess-2")
        state.session_type = "live_interview"
        state.job_data = {"role": "backend", "requirements": ["FastAPI"]}
        text = build_live_session_instruction(state, compact_context_text=lambda v, **k: str(v))
        self.assertNotIn("설계 의도 설명 60%", text)


class SavePortfolioSourceTests(unittest.TestCase):
    def test_insert_uses_portfolio_sources_table(self) -> None:
        cursor = FakeCursor()
        connection = FakeConnection(cursor)
        with patch.object(service_module, "get_connection", return_value=connection):
            InterviewService().save_portfolio_source(
                session_id="sess-1",
                repo_url="https://github.com/a/b",
                readme_snapshot="R",
                tree_snapshot="T",
                infra_files_snapshot="I",
            )
        sql, params = cursor.executed[0]
        self.assertIn("INSERT INTO public.portfolio_sources", sql)
        self.assertIn("sess-1", params)
        self.assertIn("https://github.com/a/b", params)


class SummarizePortfolioLabelTests(unittest.TestCase):
    def test_labels_are_present(self) -> None:
        job = {
            "portfolioSource": {
                "repoUrl": "https://github.com/a/b",
                "readme": "README 본문",
                "tree": "src/app/main.py",
                "infra": "Dockerfile",
            },
            "detectedTopics": ["fastapi"],
        }
        text = summarize_portfolio_for_prompt(job, max_chars=1500)
        self.assertIn("레포:", text)
        self.assertIn("README 요약:", text)
        self.assertIn("아키텍처:", text)
        self.assertIn("인프라 가설:", text)
        self.assertIn("감지 토픽:", text)

    def test_infra_string_split_into_bullets(self) -> None:
        job = {
            "portfolioSource": {
                "repoUrl": "r",
                "readme": "",
                "tree": "",
                "infra": "Dockerfile\ndocker-compose.yml\n.github/workflows/ci.yml",
            }
        }
        text = summarize_portfolio_for_prompt(job, max_chars=1500)
        self.assertIn("- Dockerfile", text)
        self.assertIn("- docker-compose.yml", text)

    def test_only_topics_present(self) -> None:
        job = {"detectedTopics": ["rag", "fastapi", "postgres"]}
        text = summarize_portfolio_for_prompt(job, max_chars=1500)
        self.assertIn("rag", text)
        self.assertIn("fastapi", text)


class HydrateNoFetcherTests(unittest.TestCase):
    def test_portfolio_session_without_fetcher_skips_merge(self) -> None:
        state = VoiceWsState()
        session = {
            "id": "sess-1",
            "session_type": "portfolio_defense",
            "status": "created",
            "job_payload": {"repoUrl": "r"},
        }
        cache_hydrate(
            state,
            session,
            turns=[],
            clamp_target_duration=_noop_int,
            clamp_closing_threshold=_noop_int,
            estimated_total_questions=_estimated,
            hydrate_turns=lambda *a, **k: None,
            fetch_portfolio_source=None,
        )
        self.assertNotIn("portfolioSource", state.job_data)


if __name__ == "__main__":
    unittest.main()
