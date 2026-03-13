from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "app/services/gemini_live_voice_service.py"
SPEC = importlib.util.spec_from_file_location("tests._real_gemini_live_voice_service", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
REAL_MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = REAL_MODULE
SPEC.loader.exec_module(REAL_MODULE)
GeminiLiveInterviewSession = REAL_MODULE.GeminiLiveInterviewSession


def _response(*, parts=None, output_text: str = ""):
    return SimpleNamespace(
        server_content=SimpleNamespace(
            model_turn=SimpleNamespace(parts=parts or []),
            output_transcription=SimpleNamespace(text=output_text),
        )
    )


def _part(text: str | None, *, thought: bool | None = None):
    return SimpleNamespace(text=text, thought=thought)


class GeminiLiveInterviewSessionTextSelectionTests(unittest.TestCase):
    def test_extract_model_text_chunks_skips_thought_parts(self) -> None:
        session = GeminiLiveInterviewSession(api_key=None)
        responses = [
            _response(parts=[_part("internal planning", thought=True), _part("안녕하세요.")]),
            _response(parts=[_part("첫 질문입니다.")]),
        ]

        chunks = session._extract_model_text_chunks(responses)

        self.assertEqual(chunks, ["안녕하세요.", "첫 질문입니다."])

    def test_select_best_ai_text_prefers_output_transcription(self) -> None:
        session = GeminiLiveInterviewSession(api_key=None)

        selected = session._select_best_ai_text(
            "안녕하세요. 먼저 지원 동기를 말씀해 주세요.",
            (
                "Initiating the Interview Process 안녕하세요. I'm now transitioning into the interview's starting phase. "
                "지원 동기를 말씀해 주세요."
            ),
        )

        self.assertEqual(selected, "안녕하세요. 먼저 지원 동기를 말씀해 주세요.")

    def test_select_best_ai_text_prefers_complete_model_text_when_output_is_truncated(self) -> None:
        session = GeminiLiveInterviewSession(api_key=None)

        selected = session._select_best_ai_text(
            "안녕하세요. 서비스 백엔드 직무와 관련된 경험을 확인하고자 합니다. 특히 대용량 트래픽 처리 경험이 있다고",
            (
                "안녕하세요. 서비스 백엔드 직무와 관련된 경험을 확인하고자 합니다. "
                "특히 대용량 트래픽 처리 경험이 있다고 하셨는데, 어떤 프로젝트에서 그 역량을 가장 잘 보여주셨는지 말씀해 주세요."
            ),
        )

        self.assertEqual(
            selected,
            (
                "안녕하세요. 서비스 백엔드 직무와 관련된 경험을 확인하고자 합니다. "
                "특히 대용량 트래픽 처리 경험이 있다고 하셨는데, 어떤 프로젝트에서 그 역량을 가장 잘 보여주셨는지 말씀해 주세요."
            ),
        )

    def test_merge_transcription_chunks_keeps_progressive_input_without_cutting_tail(self) -> None:
        session = GeminiLiveInterviewSession(api_key=None)

        merged = session._merge_transcription_chunks([
            "HTTP 폴링은 요청이 반복되며 네트워크 비용이 커지고",
            "HTTP 폴링은 요청이 반복되며 네트워크 비용이 커지고 SSE는 단방향 통신만 가능했기 때문에,",
            "SSE는 단방향 통신만 가능했기 때문에, 연결 유지 효율과 양방향 메시지 지연을 비교한 결과 평균 지연이 가장 낮은 WebSocket을 선택했습니다.",
        ])

        self.assertEqual(
            merged,
            (
                "HTTP 폴링은 요청이 반복되며 네트워크 비용이 커지고 "
                "SSE는 단방향 통신만 가능했기 때문에, 연결 유지 효율과 양방향 메시지 지연을 비교한 결과 "
                "평균 지연이 가장 낮은 WebSocket을 선택했습니다."
            ),
        )


if __name__ == "__main__":
    unittest.main()
