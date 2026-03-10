from __future__ import annotations

import sys
import types
import unittest
from unittest.mock import AsyncMock, patch

_live_stub = types.ModuleType("app.services.gemini_live_voice_service")


class _DummyLiveService:
    def __init__(self, *args, **kwargs) -> None:
        self.model = kwargs.get("model", "")
        self.active_model = self.model


_live_stub.GeminiLiveInterviewSession = _DummyLiveService
_live_stub.GeminiLiveSttService = _DummyLiveService
_live_stub.GeminiLiveTtsService = _DummyLiveService
sys.modules.setdefault("app.services.gemini_live_voice_service", _live_stub)

_interview_stub = types.ModuleType("app.services.interview_service")


class _DummyInterviewService:
    def __init__(self, *args, **kwargs) -> None:
        pass


_interview_stub.InterviewService = _DummyInterviewService
sys.modules.setdefault("app.services.interview_service", _interview_stub)

_llm_stub = types.ModuleType("app.services.llm_gemini")


class _DummyGeminiService:
    def __init__(self, *args, **kwargs) -> None:
        pass


_llm_stub.GeminiService = _DummyGeminiService
sys.modules.setdefault("app.services.llm_gemini", _llm_stub)

from app.api.ws import (
    RUNTIME_MODE_DEGRADED_FALLBACK,
    RUNTIME_MODE_LIVE_SINGLE,
    VoiceWsState,
    _build_memory_snapshot,
    _derive_question_type_preference,
    _degraded_cooldown_for_reason,
    _enter_degraded_mode,
    _live_attempt_allowed,
    _remember_model_turn,
    _remember_user_turn,
    _record_question_type,
    _restore_live_mode,
    _retune_vad_for_next_turn,
    _select_next_question_type,
)
from app.services.voice_pipeline import VadSegmenter, wav_bytes_to_float_samples


class QuestionTypeTests(unittest.TestCase):
    def test_select_next_question_type_skips_recent_types(self) -> None:
        state = VoiceWsState()
        state.recent_question_types = ["tradeoff", "failure_recovery"]
        state.question_type_cursor = 1

        next_type = _select_next_question_type(state)

        self.assertEqual(next_type, "design_decision")

    def test_preferred_question_type_is_used_when_not_recent(self) -> None:
        state = VoiceWsState()
        state.recent_question_types = ["tradeoff", "failure_recovery"]

        next_type = _select_next_question_type(state, preferred="metric_validation")

        self.assertEqual(next_type, "metric_validation")

    def test_record_question_type_advances_rotation_cursor(self) -> None:
        state = VoiceWsState()

        _record_question_type(state, "design_decision")

        self.assertEqual(state.recent_question_types, ["design_decision"])
        self.assertEqual(state.question_type_cursor, 4)

    def test_derive_question_type_prefers_metric_when_answer_has_no_numbers(self) -> None:
        state = VoiceWsState()

        preferred = _derive_question_type_preference(
            state,
            "성능 개선을 진행했고 사용자 경험을 더 좋게 만들었습니다.",
        )

        self.assertEqual(preferred, "metric_validation")

    def test_derive_question_type_prefers_failure_recovery_on_incident_answer(self) -> None:
        state = VoiceWsState()
        state.recent_question_types = ["metric_validation"]

        preferred = _derive_question_type_preference(
            state,
            "배포 후 장애가 발생해서 롤백하고 원인을 분석했습니다.",
        )

        self.assertEqual(preferred, "failure_recovery")


class MemoryNoteTests(unittest.TestCase):
    def test_memory_snapshot_tracks_recent_user_and_model_notes(self) -> None:
        state = VoiceWsState()

        _remember_user_turn(state, "추천 시스템 응답 속도를 줄이기 위해 캐시 전략을 바꾸고 18% 개선했습니다.")
        _remember_model_turn(state, "그때 캐시 무효화 기준은 어떻게 설계하셨나요?", question_type="design_decision")

        snapshot = _build_memory_snapshot(state)

        self.assertIn("지원자 답변:", snapshot)
        self.assertIn("최근 질문(설계 의사결정)", snapshot)
        self.assertIn("추천", snapshot)


class AdaptiveVadTests(unittest.TestCase):
    def test_retune_vad_for_short_answer_relaxes_cutoff(self) -> None:
        state = VoiceWsState()
        base_silence = state.vad.silence_ms
        base_short_silence = state.vad.short_utterance_silence_ms
        base_turn_end_grace = state.turn_end_grace_sec

        _retune_vad_for_next_turn(state, utterance_duration_ms=1400.0, short_answer=True)

        self.assertGreater(state.vad.silence_ms, base_silence)
        self.assertGreater(state.vad.short_utterance_silence_ms, base_short_silence)
        self.assertGreater(state.turn_end_grace_sec, base_turn_end_grace)
        self.assertEqual(state.short_reprompt_streak, 1)

    def test_retune_vad_for_long_answers_updates_recent_window(self) -> None:
        state = VoiceWsState()

        for duration_ms in (5200.0, 5400.0, 5600.0):
            _retune_vad_for_next_turn(state, utterance_duration_ms=duration_ms, short_answer=False)

        self.assertEqual(state.short_reprompt_streak, 0)
        self.assertEqual(len(state.recent_user_durations_ms), 3)
        self.assertGreaterEqual(state.vad.silence_ms, 820)
        self.assertGreaterEqual(state.vad.short_utterance_silence_ms, 2060)
        self.assertGreaterEqual(state.turn_end_grace_sec, 1.34)


class DegradedModeTests(unittest.IsolatedAsyncioTestCase):
    async def test_enter_degraded_mode_preserves_active_reason_during_cooldown(self) -> None:
        state = VoiceWsState(session_id="session-1")
        ws = object()
        mocked_send_json = AsyncMock(return_value=True)

        with (
            patch("app.api.ws._send_json", mocked_send_json),
            patch("app.api.ws.time.monotonic", return_value=100.0),
        ):
            await _enter_degraded_mode(ws, state, "stt-fallback")
            retry_after_first = state.runtime_retry_after_sec
            await _enter_degraded_mode(ws, state, "tts-fallback")

        self.assertEqual(state.runtime_mode, RUNTIME_MODE_DEGRADED_FALLBACK)
        self.assertEqual(state.runtime_mode_reason, "stt-fallback")
        self.assertEqual(state.degraded_fail_count, 1)
        self.assertTrue(retry_after_first > 0)
        self.assertEqual(mocked_send_json.await_count, 1)
        with patch("app.api.ws.time.monotonic", return_value=100.0):
            self.assertFalse(_live_attempt_allowed(state))

    async def test_restore_live_mode_resets_degraded_state(self) -> None:
        state = VoiceWsState(
            session_id="session-1",
            runtime_mode=RUNTIME_MODE_DEGRADED_FALLBACK,
            runtime_mode_reason="tts-fallback",
            degraded_until_monotonic=9999.0,
            degraded_fail_count=3,
        )
        ws = object()
        mocked_send_json = AsyncMock(return_value=True)

        with patch("app.api.ws._send_json", mocked_send_json):
            await _restore_live_mode(ws, state, "live-recovered")

        self.assertEqual(state.runtime_mode, RUNTIME_MODE_LIVE_SINGLE)
        self.assertEqual(state.runtime_mode_reason, "live-recovered")
        self.assertEqual(state.degraded_until_monotonic, 0.0)
        self.assertEqual(state.degraded_fail_count, 0)
        self.assertTrue(_live_attempt_allowed(state))

    def test_degraded_cooldown_scales_by_reason_and_fail_count(self) -> None:
        short_cooldown = _degraded_cooldown_for_reason("stt-fallback", fail_count=1)
        long_cooldown = _degraded_cooldown_for_reason("legacy-llm-tts", fail_count=3)

        self.assertEqual(short_cooldown, 18)
        self.assertEqual(long_cooldown, 75)


class VadSegmenterTests(unittest.TestCase):
    def test_segmenter_marks_short_utterance_silence_reason(self) -> None:
        segmenter = VadSegmenter(
            sample_rate=1000,
            threshold=0.1,
            silence_ms=700,
            min_speech_ms=100,
            min_utterance_ms=1200,
            short_utterance_silence_ms=1000,
            max_segment_ms=4000,
        )

        speech_chunk = [0.5] * 300
        silence_chunk = [0.0] * 1000
        self.assertIsNone(segmenter.feed(speech_chunk))
        payload = segmenter.feed(silence_chunk)

        self.assertIsNotNone(payload)
        assert payload is not None
        samples, sample_rate = wav_bytes_to_float_samples(payload)
        self.assertEqual(sample_rate, 1000)
        self.assertEqual(len(samples), 1300)
        self.assertEqual(segmenter.last_segment_info["reason"], "short_utterance_silence")
        self.assertEqual(segmenter.last_segment_info["duration_ms"], 1300.0)


if __name__ == "__main__":
    unittest.main()
