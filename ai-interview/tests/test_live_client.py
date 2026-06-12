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

# unittest discover 는 테스트 실행 전에 모든 테스트 모듈을 import 하므로, stub 과 그 아래에서
# import 된 app 모듈을 sys.modules 에 남기면 뒤에 import 되는 테스트 모듈로 누수된다.
# import 직후 stub 키를 원상 복구하고 새로 import 된 app 모듈은 따로 보관해 두었다가,
# 이 모듈의 테스트가 실행되는 동안에만 setUpModule/tearDownModule 로 캐시에 되돌린다
# (문자열 대상 mock.patch 와 lazy import 가 같은 모듈 세대를 보게 하기 위함).
_ORIGINAL_LIVE_MODULE = sys.modules.get("app.services.gemini_live_voice_service")
_MODULES_BEFORE_STUB_IMPORTS = set(sys.modules)
sys.modules["app.services.gemini_live_voice_service"] = _live_stub
try:
    from app.interview.runtime.live_client import LiveClientDeps, request_live_spoken_text_turn
    from app.interview.runtime.state import PreparedTtsAudio, VoiceWsState
finally:
    _STUB_SCOPED_APP_MODULES = {}
    for _name in set(sys.modules) - _MODULES_BEFORE_STUB_IMPORTS:
        if _name == "app" or _name.startswith("app."):
            _STUB_SCOPED_APP_MODULES[_name] = sys.modules.pop(_name)
    if _ORIGINAL_LIVE_MODULE is not None:
        sys.modules["app.services.gemini_live_voice_service"] = _ORIGINAL_LIVE_MODULE

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


class LiveClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_request_live_spoken_text_turn_uses_provider_transcription_as_caption(self) -> None:
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

        self.assertEqual(ai_text, "짧게 잘린 provider 전사")
        self.assertIsNotNone(prepared_audio)
        self.assertEqual(provider, "gemini-live")


if __name__ == "__main__":
    unittest.main()
