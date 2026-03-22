from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path
from unittest.mock import ANY, AsyncMock, call, patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

_live_stub = types.ModuleType("app.services.gemini_live_voice_service")


class _DummyLiveSession:
    def __init__(self, *args, **kwargs) -> None:
        self.model = kwargs.get("model", "")
        self.active_model = self.model
        self.provider = "gemini-live"
        self.enabled = kwargs.get("enabled", True)

    async def close(self) -> None:
        return None


_live_stub.GeminiLiveInterviewSession = _DummyLiveSession
sys.modules["app.services.gemini_live_voice_service"] = _live_stub

_interview_stub = types.ModuleType("app.services.interview_service")


class _DummyInterviewService:
    def __init__(self, *args, **kwargs) -> None:
        pass


_interview_stub.InterviewService = _DummyInterviewService
sys.modules["app.services.interview_service"] = _interview_stub

from app.interview.runtime.executor import RuntimeExecutorDeps, execute_live_user_followup_turn
from app.interview.runtime.live_turns import LiveUserFollowupSpec, LiveUserRequestSpec, prepare_live_user_request
from app.interview.runtime.session_engine import SessionEngineDeps, _segment_drain_delay_sec, process_user_utterance
from app.interview.domain.turn_text import sanitize_user_turn_text
from app.interview.runtime.state import AiDeliveryPlan, PreparedDeliverySegment, PreparedTtsAudio, VoiceWsState


def _runtime_executor_deps(
    *,
    request_live_spoken_text_turn=None,
    request_live_text_turn=None,
    build_ai_delivery_plan=None,
    send_transcript=None,
    stream_prepared_ai_delivery=None,
):
    return RuntimeExecutorDeps(
        request_live_spoken_text_turn=request_live_spoken_text_turn
        or AsyncMock(return_value=("", None, "")),
        request_live_text_turn=request_live_text_turn or AsyncMock(return_value=("", None)),
        repair_ai_turn_if_truncated=AsyncMock(return_value=("", None)),
        looks_like_complete_ai_question=lambda text: text.endswith("?") or text.endswith("요.") or text.endswith("나요?"),
        build_ai_delivery_plan=build_ai_delivery_plan or AsyncMock(return_value=AiDeliveryPlan()),
        persist_turn=AsyncMock(return_value={"id": "turn-1"}),
        set_runtime_status=AsyncMock(return_value=None),
        update_session_status=AsyncMock(return_value=None),
        set_closing_announced=AsyncMock(return_value=None),
        mark_session_status=lambda *args, **kwargs: None,
        log_runtime_event=lambda *args, **kwargs: None,
        send_json=AsyncMock(return_value=True),
        send_transcript=send_transcript or AsyncMock(return_value=True),
        stream_prepared_ai_delivery=stream_prepared_ai_delivery or AsyncMock(return_value=True),
        arm_playback_resume=lambda *args, **kwargs: None,
        resume_listening=AsyncMock(return_value=None),
        reconnect_remaining_sec=lambda current_state: 0,
        live_active_model=lambda current_state: "gemini-live",
        snapshot_vad_config=lambda current_state: {},
        build_memory_snapshot=lambda current_state: "",
        remember_model_turn=lambda *args, **kwargs: None,
        record_question_type=lambda *args, **kwargs: None,
    )


def _session_engine_deps(
    *,
    request_live_audio_turn=None,
    stream_live_audio_turn=None,
    transcribe_user_audio=None,
    fallback_transcribe_user_audio=None,
    commit_live_input_stream=None,
    send_transcript=None,
    runtime_executor_deps=None,
    resume_listening=None,
    runtime_architecture="hybrid",
):
    return SessionEngineDeps(
        create_live_interview_session=lambda: _DummyLiveSession(model="gemini-live"),
        normalize_llm_stream_mode=lambda value: str(value or "sentence"),
        normalize_tts_mode=lambda value: str(value or "sentence"),
        reset_voice_runtime_state=lambda *args, **kwargs: None,
        get_session=lambda session_id: None,
        get_turns=lambda session_id: [],
        mark_runtime_expired=lambda session_id: None,
        mark_runtime_connected=lambda session_id, live_provider, live_model: None,
        hydrate_state_from_session_row=lambda *args, **kwargs: None,
        resume_existing_session=AsyncMock(return_value=False),
        generate_and_send_opening_live_turn=AsyncMock(return_value=True),
        send_json=AsyncMock(return_value=True),
        send_avatar_state=AsyncMock(return_value=True),
        send_runtime_meta_snapshot=AsyncMock(return_value=True),
        live_active_model=lambda state: "gemini-live",
        set_runtime_mode=AsyncMock(return_value=None),
        set_runtime_status=AsyncMock(return_value=None),
        get_or_create_live_interview=lambda state: state.live_interview or _DummyLiveSession(model="gemini-live"),
        build_answer_quality_hint=lambda text: f"hint:{text}",
        derive_question_type_preference=lambda *args, **kwargs: "metric_validation",
        select_next_question_type=lambda _state, preferred=None: preferred or "tradeoff",
        request_live_audio_turn=request_live_audio_turn
        or AsyncMock(return_value=("", "", None, "gemini-live")),
        stream_live_audio_turn=stream_live_audio_turn,
        fallback_transcribe_user_audio=fallback_transcribe_user_audio,
        transcribe_user_audio=transcribe_user_audio or AsyncMock(return_value=("", "")),
        emit_realtime_user_delta=AsyncMock(return_value=None),
        is_probable_ai_echo=lambda *_args, **_kwargs: False,
        reset_realtime_user_transcript=lambda state: setattr(state, "realtime_user_transcript", ""),
        remember_user_turn=lambda state, text: None,
        persist_turn=AsyncMock(return_value={"id": "turn-user"}),
        send_transcript=send_transcript or AsyncMock(return_value=True),
        log_runtime_event=lambda *args, **kwargs: None,
        is_short_stt_result=lambda text, wav_bytes: False,
        retune_vad_for_next_turn=lambda *args, **kwargs: None,
        runtime_timing=lambda state: (120, 480),
        runtime_executor_deps=runtime_executor_deps or (lambda: _runtime_executor_deps()),
        estimate_wav_duration_ms=lambda wav_bytes: 2600.0,
        snapshot_vad_config=lambda state: {},
        build_memory_snapshot=lambda state: "",
        merge_wav_segments=lambda segments: b"".join(segments),
        merge_vad_events=lambda events: events[-1] if events else {},
        resume_listening=resume_listening or AsyncMock(return_value=None),
        next_ai_turn_id=lambda session_id: f"{session_id}:next",
        commit_live_input_stream=commit_live_input_stream,
        runtime_architecture=runtime_architecture,
    )


class HybridQuestionPlannerTests(unittest.TestCase):
    def test_prepare_live_user_request_builds_single_sentence_planned_question(self) -> None:
        state = VoiceWsState(session_id="session-1", session_type="live_interview")
        state.recent_question_types = ["motivation_validation"]

        spec = prepare_live_user_request(
            state,
            followup_spec=LiveUserFollowupSpec(
                model_count=1,
                target_duration_sec=600,
                closing_threshold_sec=60,
                elapsed_sec=120,
                remaining_sec=480,
                estimated_total_questions=6,
                completion_reason="",
                question_index=2,
                should_announce_closing=False,
                phase="technical",
                response_question_index=2,
            ),
            closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            build_answer_quality_hint=lambda text: f"hint:{text}",
            derive_question_type_preference=lambda *args, **kwargs: "metric_validation",
            select_next_question_type=lambda _state, preferred=None: preferred or "metric_validation",
            prompt_user_text="Kafka 재처리 전략과 Redis 캐시 TTL을 조정해서 p95 응답 시간을 95ms까지 줄였습니다.",
        )

        self.assertEqual(spec.strategy, "followup")
        self.assertEqual(spec.planned_question_type, "metric_validation")
        self.assertIn("p95", spec.planned_question_text.lower())
        self.assertEqual(spec.planned_question_text.count("?"), 1)

    def test_live_only_drain_delay_is_more_conservative_than_hybrid(self) -> None:
        state = VoiceWsState(session_id="session-1", session_type="live_interview")
        state.turn_end_grace_sec = 0.09

        live_only_delay = _segment_drain_delay_sec(
            state,
            reason="silence",
            architecture="live-only",
        )
        hybrid_delay = _segment_drain_delay_sec(
            state,
            reason="silence",
            architecture="hybrid",
        )

        self.assertGreater(live_only_delay, hybrid_delay)
        self.assertGreaterEqual(live_only_delay, 0.16)

    def test_user_transcript_cleanup_keeps_normal_korean_spacing(self) -> None:
        cleaned = sanitize_user_turn_text("실시간 AI 면접 서비스를 개발하며 웹 소켓 기반 실시간 통신 구조를 설계했습니다.")
        self.assertEqual(
            cleaned,
            "실시간 AI 면접 서비스를 개발하며 웹 소켓 기반 실시간 통신 구조를 설계했습니다.",
        )


class HybridExecutorTests(unittest.IsolatedAsyncioTestCase):
    async def test_execute_followup_turn_uses_planned_question_text_as_authoritative_caption(self) -> None:
        state = VoiceWsState(session_id="session-2", current_phase="technical")
        planned_text = "방금 말씀하신 kafka 재처리 전략에서 어떤 지표로 성과를 검증하셨나요?"
        prepared_audio = PreparedTtsAudio(
            chunks=["chunk"],
            sample_rate=24000,
            provider="gemini-live",
            duration_sec=1.1,
        )
        send_transcript = AsyncMock(return_value=True)
        deps = _runtime_executor_deps(
            request_live_spoken_text_turn=AsyncMock(return_value=(planned_text, prepared_audio, "gemini-live")),
            request_live_text_turn=AsyncMock(return_value=("", None)),
            build_ai_delivery_plan=AsyncMock(
                return_value=AiDeliveryPlan(
                    segments=[PreparedDeliverySegment(text=planned_text, prepared_audio=prepared_audio)],
                    mode="full",
                    provider="gemini-live",
                )
            ),
            send_transcript=send_transcript,
            stream_prepared_ai_delivery=AsyncMock(return_value=True),
        )

        generated = await execute_live_user_followup_turn(
            object(),
            state,
            spec=LiveUserFollowupSpec(
                model_count=2,
                target_duration_sec=600,
                closing_threshold_sec=60,
                elapsed_sec=150,
                remaining_sec=450,
                estimated_total_questions=6,
                completion_reason="",
                question_index=3,
                should_announce_closing=False,
                phase="technical",
                response_question_index=3,
            ),
            user_request=LiveUserRequestSpec(
                prompt_user_text="Kafka 재처리 전략과 Redis 캐시 TTL을 조정했습니다.",
                answer_quality_hint="hint",
                planned_question_type="metric_validation",
                extra_instruction="",
                planned_question_text=planned_text,
                strategy="followup",
            ),
            next_turn_id="session-2:3",
            live_ai_text=planned_text,
            prepared_live_audio=None,
            provider_name="gemini-live",
            active_live_provider="gemini-live",
            utterance_duration_ms=2400.0,
            vad_meta={"reason": "silence"},
            started_at=0.0,
            deps=deps,
        )

        self.assertTrue(generated)
        deps.request_live_spoken_text_turn.assert_awaited_once()
        deps.request_live_text_turn.assert_not_awaited()
        self.assertEqual(send_transcript.await_args.args[3], planned_text)
        self.assertIn(
            call(
                ANY,
                {
                    "type": "control",
                    "text": "audio-turn-end",
                    "sessionId": "session-2",
                    "turnId": "session-2:3",
                },
            ),
            deps.send_json.await_args_list,
        )


class HybridSessionEngineTests(unittest.IsolatedAsyncioTestCase):
    async def test_process_user_utterance_uses_live_stt_and_forwards_planned_question(self) -> None:
        state = VoiceWsState(session_id="session-3", current_phase="technical")
        state.live_interview = _DummyLiveSession(model="gemini-live", enabled=True)
        state.realtime_user_transcript = "웹 소켓"

        transcribe_user_audio = AsyncMock(
            return_value=(
                "WebSocket과 Kafka 재처리 전략을 조정해서 p95 응답 시간을 95ms까지 줄였습니다.",
                "gemini-live-stt",
            )
        )
        followup_mock = AsyncMock(return_value=True)
        deps = _session_engine_deps(
            transcribe_user_audio=transcribe_user_audio,
            send_transcript=AsyncMock(return_value=True),
            runtime_executor_deps=lambda: _runtime_executor_deps(),
            resume_listening=AsyncMock(return_value=None),
            runtime_architecture="hybrid",
        )

        with patch(
            "app.interview.runtime.session_engine.execute_live_user_followup_turn",
            new=followup_mock,
        ):
            await process_user_utterance(
                object(),
                state,
                b"wav-bytes",
                deps=deps,
                vad_meta={"reason": "silence"},
                runtime_mode_disabled="disabled",
                closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            )

        transcribe_user_audio.assert_awaited_once()
        deps.request_live_audio_turn.assert_not_awaited()
        planned_request = followup_mock.await_args.kwargs["user_request"]
        self.assertIn("p95", planned_request.planned_question_text.lower())
        self.assertEqual(planned_request.strategy, "followup")

    async def test_process_user_utterance_live_only_uses_single_live_audio_turn(self) -> None:
        state = VoiceWsState(session_id="session-4", current_phase="technical")
        state.live_interview = _DummyLiveSession(model="gemini-live", enabled=True)
        state.realtime_user_transcript = "웹 소켓 처리"

        request_live_audio_turn = AsyncMock(
            return_value=(
                "WebSocket과 Kafka 재처리 전략을 조정해서 p95 응답 시간을 95ms까지 줄였습니다.",
                "방금 말씀하신 websocket 처리와 관련해 어떤 지표로 성과를 검증하셨나요?",
                PreparedTtsAudio(
                    chunks=["chunk"],
                    sample_rate=24000,
                    provider="gemini-live",
                    duration_sec=1.0,
                ),
                "gemini-live",
            )
        )
        followup_mock = AsyncMock(return_value=True)
        deps = _session_engine_deps(
            request_live_audio_turn=request_live_audio_turn,
            transcribe_user_audio=AsyncMock(return_value=("", "")),
            send_transcript=AsyncMock(return_value=True),
            runtime_executor_deps=lambda: _runtime_executor_deps(),
            resume_listening=AsyncMock(return_value=None),
            runtime_architecture="live-only",
        )

        with patch(
            "app.interview.runtime.session_engine.execute_live_user_followup_turn",
            new=followup_mock,
        ):
            await process_user_utterance(
                object(),
                state,
                b"wav-bytes",
                deps=deps,
                vad_meta={"reason": "silence"},
                runtime_mode_disabled="disabled",
                closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            )

        request_live_audio_turn.assert_awaited_once()
        deps.transcribe_user_audio.assert_not_awaited()
        planned_request = followup_mock.await_args.kwargs["user_request"]
        self.assertEqual(planned_request.planned_question_text, "")
        self.assertEqual(
            followup_mock.await_args.kwargs["live_ai_text"],
            "방금 말씀하신 websocket 처리와 관련해 어떤 지표로 성과를 검증하셨나요?",
        )

    async def test_process_user_utterance_live_only_prefers_streaming_audio_turn_when_available(self) -> None:
        state = VoiceWsState(session_id="session-5", current_phase="technical")
        state.live_interview = _DummyLiveSession(model="gemini-live", enabled=True)
        state.realtime_user_transcript = "웹 소켓 처리"

        stream_live_audio_turn = AsyncMock(
            return_value=(
                "WebSocket과 Kafka 재처리 전략을 조정해서 p95 응답 시간을 95ms까지 줄였습니다.",
                "방금 말씀하신 websocket 처리와 관련해 어떤 지표로 성과를 검증하셨나요?",
                "gemini-live",
                1.25,
                5,
            )
        )
        request_live_audio_turn = AsyncMock(
            return_value=(
                "",
                "",
                None,
                "gemini-live",
            )
        )
        followup_mock = AsyncMock(return_value=True)
        deps = _session_engine_deps(
            request_live_audio_turn=request_live_audio_turn,
            stream_live_audio_turn=stream_live_audio_turn,
            transcribe_user_audio=AsyncMock(return_value=("", "")),
            send_transcript=AsyncMock(return_value=True),
            runtime_executor_deps=lambda: _runtime_executor_deps(),
            resume_listening=AsyncMock(return_value=None),
            runtime_architecture="live-only",
        )

        with patch(
            "app.interview.runtime.session_engine.execute_live_user_followup_turn",
            new=followup_mock,
        ):
            await process_user_utterance(
                object(),
                state,
                b"wav-bytes",
                deps=deps,
                vad_meta={"reason": "silence"},
                runtime_mode_disabled="disabled",
                closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            )

        stream_live_audio_turn.assert_awaited_once()
        request_live_audio_turn.assert_not_awaited()
        self.assertTrue(followup_mock.await_args.kwargs["audio_already_streamed"])
        self.assertEqual(followup_mock.await_args.kwargs["streamed_audio_chunk_count"], 5)

    async def test_process_user_utterance_live_only_prefers_committed_live_input_stream_when_available(self) -> None:
        state = VoiceWsState(session_id="session-6", current_phase="technical")
        state.live_interview = _DummyLiveSession(model="gemini-live", enabled=True)
        state.realtime_user_transcript = "웹 소켓 처리"
        state.live_input_turn_active = True
        state.live_input_turn_id = "session-6:turn"

        async def commit_live_input_stream(current_state: VoiceWsState) -> bool:
            current_state.live_input_turn_active = False
            current_state.live_input_streamed_user_text = (
                "WebSocket과 Kafka 재처리 전략을 조정해서 p95 응답 시간을 95ms까지 줄였습니다."
            )
            current_state.live_input_streamed_ai_text = (
                "방금 말씀하신 websocket 처리와 관련해 어떤 지표로 성과를 검증하셨나요?"
            )
            current_state.live_input_streamed_provider = "gemini-live"
            current_state.live_input_streamed_audio_duration_sec = 1.4
            current_state.live_input_streamed_audio_chunk_count = 6
            return True

        stream_live_audio_turn = AsyncMock(
            return_value=(
                "",
                "",
                "gemini-live",
                0.0,
                0,
            )
        )
        request_live_audio_turn = AsyncMock(
            return_value=(
                "",
                "",
                None,
                "gemini-live",
            )
        )
        followup_mock = AsyncMock(return_value=True)
        deps = _session_engine_deps(
            request_live_audio_turn=request_live_audio_turn,
            stream_live_audio_turn=stream_live_audio_turn,
            commit_live_input_stream=AsyncMock(side_effect=commit_live_input_stream),
            transcribe_user_audio=AsyncMock(return_value=("", "")),
            send_transcript=AsyncMock(return_value=True),
            runtime_executor_deps=lambda: _runtime_executor_deps(),
            resume_listening=AsyncMock(return_value=None),
            runtime_architecture="live-only",
        )

        with patch(
            "app.interview.runtime.session_engine.execute_live_user_followup_turn",
            new=followup_mock,
        ):
            await process_user_utterance(
                object(),
                state,
                b"wav-bytes",
                deps=deps,
                vad_meta={"reason": "silence"},
                runtime_mode_disabled="disabled",
                closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            )

        deps.commit_live_input_stream.assert_awaited_once()
        stream_live_audio_turn.assert_not_awaited()
        request_live_audio_turn.assert_not_awaited()
        self.assertEqual(followup_mock.await_args.kwargs["next_turn_id"], "session-6:turn")
        self.assertTrue(followup_mock.await_args.kwargs["audio_already_streamed"])
        self.assertEqual(followup_mock.await_args.kwargs["streamed_audio_chunk_count"], 6)

    async def test_process_user_utterance_live_only_keeps_streamed_transcript_without_strict_restt(self) -> None:
        state = VoiceWsState(session_id="session-7", current_phase="technical")
        state.live_interview = _DummyLiveSession(model="gemini-live", enabled=True)
        state.realtime_user_transcript = "간 AI 면접서비스를개발하며 웹소켓기반실시통신구조와백엔드 PI 설계해"

        async def commit_live_input_stream(current_state: VoiceWsState) -> bool:
            current_state.live_input_turn_active = False
            current_state.live_input_turn_id = "session-7:turn"
            current_state.live_input_streamed_user_text = (
                "간 AI 면접서비스를개발하며 웹소켓기반실시통신구조와백엔드 PI 설계해여러사용자의동요청을안정적으로 처리는스템현한경험이있습니다."
            )
            current_state.live_input_streamed_ai_text = (
                "방금 말씀하신 websocket 기반 구조에서 어떤 지표를 관리하셨나요?"
            )
            current_state.live_input_streamed_provider = "gemini-live"
            current_state.live_input_streamed_audio_duration_sec = 1.2
            current_state.live_input_streamed_audio_chunk_count = 4
            return True

        followup_mock = AsyncMock(return_value=True)
        deps = _session_engine_deps(
            commit_live_input_stream=AsyncMock(side_effect=commit_live_input_stream),
            transcribe_user_audio=AsyncMock(return_value=("", "")),
            send_transcript=AsyncMock(return_value=True),
            runtime_executor_deps=lambda: _runtime_executor_deps(),
            resume_listening=AsyncMock(return_value=None),
            runtime_architecture="live-only",
        )
        state.live_input_turn_active = True

        with patch(
            "app.interview.runtime.session_engine.execute_live_user_followup_turn",
            new=followup_mock,
        ):
            await process_user_utterance(
                object(),
                state,
                b"wav-bytes",
                deps=deps,
                vad_meta={"reason": "silence"},
                runtime_mode_disabled="disabled",
                closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            )

        deps.transcribe_user_audio.assert_not_awaited()
        prompt_user_text = followup_mock.await_args.kwargs["user_request"].prompt_user_text
        self.assertIn("AI 면접 서비스", prompt_user_text)
        self.assertIn("웹소켓", prompt_user_text)
        self.assertIn("API", prompt_user_text)
        self.assertIn("동시 요청", prompt_user_text)


if __name__ == "__main__":
    unittest.main()
