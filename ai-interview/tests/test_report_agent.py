from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

_gemini_stub = types.ModuleType("app.services.llm_gemini")


class _DummyGeminiService:
    pass


_gemini_stub.GeminiService = _DummyGeminiService

# unittest discover 는 테스트 실행 전에 모든 테스트 모듈을 import 하므로, stub 과 그 아래에서
# import 된 app 모듈을 sys.modules 에 남기면 뒤에 import 되는 테스트 모듈로 누수된다.
# import 직후 stub 키를 원상 복구하고 새로 import 된 app 모듈은 따로 보관해 두었다가,
# 이 모듈의 테스트가 실행되는 동안에만 setUpModule/tearDownModule 로 캐시에 되돌린다
# (문자열 대상 mock.patch 와 lazy import 가 같은 모듈 세대를 보게 하기 위함).
_ORIGINAL_GEMINI_MODULE = sys.modules.get("app.services.llm_gemini")
_MODULES_BEFORE_STUB_IMPORTS = set(sys.modules)
sys.modules["app.services.llm_gemini"] = _gemini_stub
try:
    from app.interview.reporting.agent import ReportAgent
finally:
    _STUB_SCOPED_APP_MODULES = {}
    for _name in set(sys.modules) - _MODULES_BEFORE_STUB_IMPORTS:
        if _name == "app" or _name.startswith("app."):
            _STUB_SCOPED_APP_MODULES[_name] = sys.modules.pop(_name)
    if _ORIGINAL_GEMINI_MODULE is not None:
        sys.modules["app.services.llm_gemini"] = _ORIGINAL_GEMINI_MODULE

_MODULES_DISPLACED_DURING_RUN: dict[str, types.ModuleType | None] = {}


def setUpModule() -> None:
    for _name, _module in _STUB_SCOPED_APP_MODULES.items():
        _MODULES_DISPLACED_DURING_RUN[_name] = sys.modules.get(_name)
        sys.modules[_name] = _module


def tearDownModule() -> None:
    for _name, _original in _MODULES_DISPLACED_DURING_RUN.items():
        if _original is None:
            sys.modules.pop(_name, None)
        else:
            sys.modules[_name] = _original
    _MODULES_DISPLACED_DURING_RUN.clear()


class _FakeInterviewService:
    def __init__(self) -> None:
        self.saved_report: dict | None = None

    def get_session(self, session_id: str):
        return {
            "id": session_id,
            "session_type": "live_interview",
            "job_payload": {"role": "Backend Engineer"},
            "resume_payload": {},
            "personality": "professional",
        }

    def get_turns(self, session_id: str):
        del session_id
        return [
            {"role": "model", "content": "자기소개와 지원 동기를 말씀해 주세요."},
            {"role": "user", "content": "대용량 트래픽 처리 경험을 중심으로 설명드리겠습니다."},
            {"role": "model", "content": "가장 어려웠던 장애 대응 사례는 무엇인가요?"},
            {"role": "user", "content": "Kafka 재처리와 캐시 무효화 순서를 조정해 복구했습니다."},
        ]

    def save_report(self, session_id: str, report_payload: dict) -> None:
        self.saved_report = {"session_id": session_id, "payload": report_payload}


class _FailingGemini:
    def analyze_interview(self, **kwargs):
        raise RuntimeError("gemini failure")


class _FakeLongInterviewService(_FakeInterviewService):
    def get_turns(self, session_id: str):
        del session_id
        return [
            {"role": "model", "content": "자기소개와 지원 동기를 말씀해 주세요."},
            {"role": "user", "content": "대용량 트래픽 처리 경험을 중심으로 설명드리겠습니다."},
            {"role": "model", "content": "가장 어려웠던 장애 대응 사례는 무엇인가요?"},
            {"role": "user", "content": "Kafka 재처리와 캐시 무효화 순서를 조정해 복구했습니다."},
            {"role": "model", "content": "그 과정에서 직접 결정한 트레이드오프는 무엇이었나요?"},
            {"role": "user", "content": "일시적 복구 속도보다 데이터 일관성을 우선해 재처리 순서를 늦췄습니다."},
        ]


class ReportAgentFallbackTests(unittest.TestCase):
    def test_process_job_raises_when_gemini_missing(self) -> None:
        service = _FakeInterviewService()
        agent = ReportAgent(interview_service=service, gemini_factory=lambda: None)

        with self.assertRaises(RuntimeError):
            agent._process_job({"session_id": "session-1", "session_type": "live_interview"})

        self.assertIsNone(service.saved_report)

    def test_process_job_raises_when_gemini_raises(self) -> None:
        service = _FakeInterviewService()
        agent = ReportAgent(interview_service=service, gemini_factory=lambda: _FailingGemini())

        with self.assertRaises(RuntimeError):
            agent._process_job({"session_id": "session-2", "session_type": "live_interview"})

        self.assertIsNone(service.saved_report)

    def test_process_job_raises_when_full_analysis_fails(self) -> None:
        service = _FakeLongInterviewService()
        agent = ReportAgent(interview_service=service, gemini_factory=lambda: _FailingGemini())

        with self.assertRaises(RuntimeError):
            agent._process_job({"session_id": "session-3", "session_type": "live_interview"})

        self.assertIsNone(service.saved_report)


if __name__ == "__main__":
    unittest.main()
