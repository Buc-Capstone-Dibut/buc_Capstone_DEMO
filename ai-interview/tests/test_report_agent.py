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
sys.modules["app.services.llm_gemini"] = _gemini_stub

from app.interview.reporting.agent import ReportAgent


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


class ReportAgentFallbackTests(unittest.TestCase):
    def test_process_job_saves_fallback_report_when_gemini_missing(self) -> None:
        service = _FakeInterviewService()
        agent = ReportAgent(interview_service=service, gemini_factory=lambda: None)

        agent._process_job({"session_id": "session-1", "session_type": "live_interview"})

        assert service.saved_report is not None
        payload = service.saved_report["payload"]
        self.assertIn("evaluation", payload)
        self.assertIn("bestPractices", payload)
        self.assertIn("summary", payload)

    def test_process_job_saves_fallback_report_when_gemini_raises(self) -> None:
        service = _FakeInterviewService()
        agent = ReportAgent(interview_service=service, gemini_factory=lambda: _FailingGemini())

        agent._process_job({"session_id": "session-2", "session_type": "live_interview"})

        assert service.saved_report is not None
        payload = service.saved_report["payload"]
        self.assertIn("evaluation", payload)
        self.assertGreaterEqual(len(payload.get("bestPractices") or []), 1)


if __name__ == "__main__":
    unittest.main()
