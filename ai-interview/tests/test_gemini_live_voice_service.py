from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
import asyncio
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "app/services/gemini_live_voice_service.py"
SPEC = importlib.util.spec_from_file_location("tests._real_gemini_live_voice_service", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
REAL_MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = REAL_MODULE
SPEC.loader.exec_module(REAL_MODULE)
GeminiLiveInterviewSession = REAL_MODULE.GeminiLiveInterviewSession


def _response(*, parts=None, output_text: str = "", turn_complete: bool = False):
    return SimpleNamespace(
        server_content=SimpleNamespace(
            model_turn=SimpleNamespace(parts=parts or []),
            output_transcription=SimpleNamespace(text=output_text),
            turn_complete=turn_complete,
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

    def test_select_best_ai_text_prefers_longer_prefix_even_when_output_looks_complete(self) -> None:
        session = GeminiLiveInterviewSession(api_key=None)
        model_text = "평균 응답 지연을 1초 내외로 유지하셨다니 대단합니다. 당시 어떤 병목을 먼저 줄이셨나요?"

        selected = session._select_best_ai_text(
            "평균 응답 지연을 1초 내외로 유지하셨다니 대단합니다.",
            model_text,
        )

        self.assertEqual(selected, session._normalize_ai_text_candidate(model_text))

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

    def test_pick_better_ai_text_keeps_more_complete_stream_candidate(self) -> None:
        session = GeminiLiveInterviewSession(api_key=None)

        best = ""
        best = session._pick_better_ai_text(best, "웹소켓 기반 통신으로 실시간 면접 서비스를 구현하셨군요.")
        best = session._pick_better_ai_text(
            best,
            "웹소켓 기반 통신으로 실시간 면접 서비스를 구현하셨군요. 여기서 가장 크게 고려한 지표는 무엇이었나요?",
        )
        best = session._pick_better_ai_text(best, "웹소켓 기반 통신으로 실시간 면접 서비스를 구현하셨군요.")

        self.assertEqual(
            best,
            "웹소켓 기반 통신으로 실시간 면접 서비스를 구현하셨군요. 여기서 가장 크게 고려한 지표는 무엇이었나요?",
        )

    def test_pick_better_ai_text_does_not_shrink_after_longer_tail_was_seen(self) -> None:
        session = GeminiLiveInterviewSession(api_key=None)

        best = "평균 응답 지연을 1초 내외로 유지하셨다니 대단합니다. 당시 가장 크게 고려한 기술적"
        updated = session._pick_better_ai_text(
            best,
            "평균 응답 지연을 1초 내외로 유지하셨다니 대단합니다.",
        )

        self.assertEqual(
            updated,
            "평균 응답 지연을 1초 내외로 유지하셨다니 대단합니다. 당시 가장 크게 고려한 기술적",
        )

    def test_build_stream_turn_result_preserves_best_stream_text_without_responses(self) -> None:
        session = GeminiLiveInterviewSession(api_key=None)

        result = session._build_stream_turn_result(
            [],
            best_stream_user_text="실시간 AI 면접 서비스를 개발한 경험이 있습니다.",
            best_stream_ai_text="웹소켓 기반 통신 구조에서 어떤 안정성 전략을 사용하셨나요?",
        )

        self.assertEqual(result.user_text, "실시간 AI 면접 서비스를 개발한 경험이 있습니다.")
        self.assertEqual(result.ai_text, "웹소켓 기반 통신 구조에서 어떤 안정성 전략을 사용하셨나요?")

    def test_build_stream_turn_result_prefers_longer_streamed_ai_text_over_shorter_final(self) -> None:
        session = GeminiLiveInterviewSession(api_key=None)

        responses = [
            _response(
                output_text="웹 소켓 기반 통신과 API 설계를 통해 다수 사용자의 동시 요청을 안정적으로 처리했다고 하셨습니다. 당시 프로젝트에서 어느 정도의 트래픽을 감당했으며",
                turn_complete=True,
            )
        ]

        result = session._build_stream_turn_result(
            responses,
            best_stream_ai_text="웹 소켓 기반 통신과 API 설계를 통해 다수 사용자의 동시 요청을 안정적으로 처리했다고 하셨습니다. 당시 프로젝트에서 어느 정도의 트래픽을 감당했으며, 이를 위해 어떤 기술적 트레이드오프를 고려하셨나요?",
        )

        self.assertEqual(
            result.ai_text,
            "웹 소켓 기반 통신과 API 설계를 통해 다수 사용자의 동시 요청을 안정적으로 처리했다고 하셨습니다. 당시 프로젝트에서 어느 정도의 트래픽을 감당했으며, 이를 위해 어떤 기술적 트레이드오프를 고려하셨나요?",
        )


class GeminiLiveInterviewSessionReceiveTests(unittest.IsolatedAsyncioTestCase):
    async def test_receive_until_turn_complete_collects_trailing_messages(self) -> None:
        session = GeminiLiveInterviewSession(api_key=None)

        class _Stream:
            def __init__(self) -> None:
                self._responses = iter(
                    [
                        _response(output_text="안녕하세요.", turn_complete=True),
                        _response(output_text="지원 동기를 말씀해 주세요."),
                    ]
                )

            def __aiter__(self):
                return self

            async def __anext__(self):
                await asyncio.sleep(0)
                try:
                    return next(self._responses)
                except StopIteration as exc:
                    raise StopAsyncIteration from exc

        responses = await session._receive_until_turn_complete(_Stream(), timeout_sec=1.0)

        self.assertEqual(len(responses), 2)
        self.assertEqual(
            session._merge_transcription_chunks(
                [getattr(response.server_content.output_transcription, "text", "") for response in responses]
            ),
            "안녕하세요. 지원 동기를 말씀해 주세요.",
        )


if __name__ == "__main__":
    unittest.main()
