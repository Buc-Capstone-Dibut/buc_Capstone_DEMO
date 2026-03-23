from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

_live_stub = types.ModuleType("app.services.gemini_live_voice_service")


class _StubResult:
    def __init__(self, *, ai_text: str, provider: str = "gemini-live", sample_rate: int = 24000) -> None:
        self.ai_text = ai_text
        self.audio_pcm_bytes = b"\x00\x00" * 8
        self.sample_rate = sample_rate
        self.provider = provider


class _DummyLiveSession:
    def __init__(self, *args, **kwargs) -> None:
        self.model = kwargs.get("model", "")
        self.active_model = self.model
        self.provider = "gemini-live"
        self.enabled = True
        self.last_text = ""

    async def close(self) -> None:
        return None

    async def request_text_turn(self, *, session_instruction: str, turn_prompt: str, text: str):
        del session_instruction
        del turn_prompt
        self.last_text = text
        return _StubResult(ai_text="짧게 잘린 provider 전사")


_live_stub.GeminiLiveInterviewSession = _DummyLiveSession
sys.modules["app.services.gemini_live_voice_service"] = _live_stub

from app.interview.runtime.live_client import LiveClientDeps, request_live_spoken_text_turn
from app.interview.runtime.state import PreparedTtsAudio, VoiceWsState


class LiveClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_request_live_spoken_text_turn_prefers_input_text_as_caption(self) -> None:
        state = VoiceWsState(session_id="session-1")
        state.live_interview = _DummyLiveSession(model="gemini-live")

        deps = LiveClientDeps(
            create_live_interview_session=lambda: _DummyLiveSession(model="gemini-live"),
            build_session_instruction=lambda _state: "instruction",
            build_turn_prompt=lambda *_args, **_kwargs: "prompt",
            to_prepared_tts_audio_from_pcm=lambda pcm_bytes, *, sample_rate, provider: PreparedTtsAudio(
                chunks=["chunk"] if pcm_bytes else [],
                sample_rate=sample_rate,
                provider=provider,
                duration_sec=0.1,
            )
            if pcm_bytes
            else None,
            sanitize_ai_turn_text=lambda text: " ".join((text or "").split()).strip(),
            looks_like_complete_ai_question=lambda text: text.endswith("?"),
        )

        expected_text = "안녕하세요. 지원하신 직무와 가장 직접적으로 연결되는 프로젝트 경험 한 가지를 먼저 말씀해 주실 수 있을까요?"
        ai_text, prepared_audio, provider = await request_live_spoken_text_turn(
            state,
            text=expected_text,
            deps=deps,
        )

        self.assertEqual(ai_text, expected_text)
        self.assertIsNotNone(prepared_audio)
        self.assertEqual(provider, "gemini-live")


if __name__ == "__main__":
    unittest.main()
