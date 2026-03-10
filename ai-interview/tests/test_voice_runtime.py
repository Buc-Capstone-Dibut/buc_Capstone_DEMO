from __future__ import annotations

import sys
import types
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

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

from app.interview.domain.interview_memory import (
    build_memory_snapshot,
    derive_question_type_preference,
    record_question_type,
    remember_model_turn,
    remember_user_turn,
    select_next_question_type,
)
from app.interview.domain.turn_text import sanitize_ai_turn_text
from app.interview.reporting.document import (
    REPORT_SCHEMA_VERSION,
    build_report_document,
    build_timeline_entries,
    coerce_report_document,
)
from app.interview.runtime.live_turns import LiveUserFollowupSpec, prepare_live_user_request
from app.interview.runtime.session_engine import (
    SessionEngineDeps,
    handle_session_init,
    process_user_utterance,
)
from app.interview.runtime.session_resume import SessionResumeDeps, resume_existing_session
from app.interview.runtime.state import VoiceWsState
from app.interview.runtime.vad_policy import retune_vad_for_next_turn
from app.interview.transcript.session_state import (
    hydrate_state_from_session_row,
    mark_session_status,
)
from app.services.voice_pipeline import VadSegmenter, wav_bytes_to_float_samples


def _resume_deps(
    *,
    mark_runtime_resumed: AsyncMock | None = None,
    mark_runtime_connected: AsyncMock | None = None,
    hydrate_state_from_session_row=None,
    send_json: AsyncMock | None = None,
    send_avatar_state: AsyncMock | None = None,
    send_cached_turn_history: AsyncMock | None = None,
    send_runtime_meta_snapshot: AsyncMock | None = None,
    replay_last_model_turn: AsyncMock | None = None,
    generate_and_send_resume_live_turn: AsyncMock | None = None,
    resume_listening: AsyncMock | None = None,
    live_active_model=None,
) -> SessionResumeDeps:
    return SessionResumeDeps(
        mark_runtime_resumed=mark_runtime_resumed or AsyncMock(return_value=None),
        mark_runtime_connected=mark_runtime_connected or AsyncMock(return_value=None),
        hydrate_state_from_session_row=hydrate_state_from_session_row or (lambda *args, **kwargs: None),
        send_json=send_json or AsyncMock(return_value=True),
        send_avatar_state=send_avatar_state or AsyncMock(return_value=True),
        send_cached_turn_history=send_cached_turn_history or AsyncMock(),
        send_runtime_meta_snapshot=send_runtime_meta_snapshot or AsyncMock(return_value=True),
        replay_last_model_turn=replay_last_model_turn or AsyncMock(return_value=True),
        generate_and_send_resume_live_turn=generate_and_send_resume_live_turn or AsyncMock(return_value=True),
        resume_listening=resume_listening or AsyncMock(return_value=None),
        live_active_model=live_active_model or (lambda state: "gemini-live-2.5-flash-live"),
    )


def _session_engine_deps(
    *,
    create_live_interview_session=None,
    reset_voice_runtime_state=None,
    get_session=None,
    get_turns=None,
    mark_runtime_expired=None,
    mark_runtime_connected=None,
    hydrate_state_from_session_row_fn=None,
    resume_existing_session=None,
    generate_and_send_opening_live_turn=None,
    send_json=None,
    send_avatar_state=None,
    send_runtime_meta_snapshot=None,
    live_active_model=None,
    set_runtime_mode=None,
    set_runtime_status=None,
    get_or_create_live_interview=None,
    build_answer_quality_hint=None,
    derive_question_type_preference=None,
    select_next_question_type=None,
    request_live_audio_turn=None,
    emit_realtime_user_delta=None,
    is_probable_ai_echo=None,
    reset_realtime_user_transcript=None,
    remember_user_turn_fn=None,
    persist_turn=None,
    send_transcript=None,
    log_runtime_event=None,
    is_short_stt_result=None,
    retune_vad_for_next_turn_fn=None,
    runtime_timing=None,
    runtime_executor_deps=None,
    estimate_wav_duration_ms=None,
    snapshot_vad_config=None,
    build_memory_snapshot_fn=None,
    merge_wav_segments=None,
    merge_vad_events=None,
    resume_listening=None,
    next_ai_turn_id=None,
) -> SessionEngineDeps:
    return SessionEngineDeps(
        create_live_interview_session=create_live_interview_session
        or (lambda: _DummyLiveSession(model="gemini-live-2.5-flash-live")),
        normalize_llm_stream_mode=lambda value: str(value or "sentence"),
        normalize_tts_mode=lambda value: str(value or "sentence"),
        reset_voice_runtime_state=reset_voice_runtime_state or (lambda *args, **kwargs: None),
        get_session=get_session or (lambda session_id: None),
        get_turns=get_turns or (lambda session_id: []),
        mark_runtime_expired=mark_runtime_expired or (lambda session_id: None),
        mark_runtime_connected=mark_runtime_connected
        or (lambda session_id, live_provider, live_model: None),
        hydrate_state_from_session_row=hydrate_state_from_session_row_fn or hydrate_state_from_session_row,
        resume_existing_session=resume_existing_session or AsyncMock(return_value=False),
        generate_and_send_opening_live_turn=generate_and_send_opening_live_turn
        or AsyncMock(return_value=True),
        send_json=send_json or AsyncMock(return_value=True),
        send_avatar_state=send_avatar_state or AsyncMock(return_value=True),
        send_runtime_meta_snapshot=send_runtime_meta_snapshot or AsyncMock(return_value=True),
        live_active_model=live_active_model or (lambda state: "gemini-live-2.5-flash-live"),
        set_runtime_mode=set_runtime_mode or AsyncMock(return_value=None),
        set_runtime_status=set_runtime_status or AsyncMock(return_value=None),
        get_or_create_live_interview=get_or_create_live_interview
        or (lambda state: state.live_interview or _DummyLiveSession(model="gemini-live-2.5-flash-live")),
        build_answer_quality_hint=build_answer_quality_hint or (lambda text: f"hint:{text}"),
        derive_question_type_preference=derive_question_type_preference
        or (lambda *args, **kwargs: "metric_validation"),
        select_next_question_type=select_next_question_type or (lambda *args, **kwargs: "tradeoff"),
        request_live_audio_turn=request_live_audio_turn
        or AsyncMock(return_value=("사용자 답변", "다음 질문입니다.", object(), "gemini-live")),
        emit_realtime_user_delta=emit_realtime_user_delta or AsyncMock(return_value=None),
        is_probable_ai_echo=is_probable_ai_echo or (lambda state, text, wav_bytes: False),
        reset_realtime_user_transcript=reset_realtime_user_transcript
        or (lambda state: setattr(state, "realtime_user_transcript", "")),
        remember_user_turn=remember_user_turn_fn or remember_user_turn,
        persist_turn=persist_turn or AsyncMock(return_value={"id": "turn-1"}),
        send_transcript=send_transcript or AsyncMock(return_value=True),
        log_runtime_event=log_runtime_event or (lambda *args, **kwargs: None),
        is_short_stt_result=is_short_stt_result or (lambda text, wav_bytes: False),
        retune_vad_for_next_turn=retune_vad_for_next_turn_fn or (lambda *args, **kwargs: None),
        runtime_timing=runtime_timing or (lambda state: (0, state.target_duration_sec)),
        runtime_executor_deps=runtime_executor_deps or (lambda: object()),
        estimate_wav_duration_ms=estimate_wav_duration_ms or (lambda wav_bytes: 1400.0),
        snapshot_vad_config=snapshot_vad_config or (lambda state: {"silenceMs": state.vad.silence_ms}),
        build_memory_snapshot=build_memory_snapshot_fn or build_memory_snapshot,
        merge_wav_segments=merge_wav_segments or (lambda segments: b"".join(segments)),
        merge_vad_events=merge_vad_events or (lambda events: events[-1] if events else {}),
        resume_listening=resume_listening or AsyncMock(return_value=None),
        next_ai_turn_id=next_ai_turn_id or (lambda session_id: f"{session_id}:next"),
    )


class QuestionTypeTests(unittest.TestCase):
    def test_select_next_question_type_skips_recent_types(self) -> None:
        state = VoiceWsState()
        state.recent_question_types = ["tradeoff", "failure_recovery"]
        state.question_type_cursor = 1

        next_type = select_next_question_type(state)

        self.assertEqual(next_type, "design_decision")

    def test_preferred_question_type_is_used_when_not_recent(self) -> None:
        state = VoiceWsState()
        state.recent_question_types = ["tradeoff", "failure_recovery"]

        next_type = select_next_question_type(state, preferred="metric_validation")

        self.assertEqual(next_type, "metric_validation")

    def test_record_question_type_advances_rotation_cursor(self) -> None:
        state = VoiceWsState()

        record_question_type(state, "design_decision")

        self.assertEqual(state.recent_question_types, ["design_decision"])
        self.assertEqual(state.question_type_cursor, 4)

    def test_derive_question_type_prefers_metric_when_answer_has_no_numbers(self) -> None:
        state = VoiceWsState()

        preferred = derive_question_type_preference(
            state,
            "성능 개선을 진행했고 사용자 경험을 더 좋게 만들었습니다.",
        )

        self.assertEqual(preferred, "metric_validation")

    def test_derive_question_type_prefers_failure_recovery_on_incident_answer(self) -> None:
        state = VoiceWsState()
        state.recent_question_types = ["metric_validation"]

        preferred = derive_question_type_preference(
            state,
            "배포 후 장애가 발생해서 롤백하고 원인을 분석했습니다.",
        )

        self.assertEqual(preferred, "failure_recovery")


class MemoryNoteTests(unittest.TestCase):
    def test_memory_snapshot_tracks_recent_user_and_model_notes(self) -> None:
        state = VoiceWsState()

        remember_user_turn(state, "추천 시스템 응답 속도를 줄이기 위해 캐시 전략을 바꾸고 18% 개선했습니다.")
        remember_model_turn(state, "그때 캐시 무효화 기준은 어떻게 설계하셨나요?", question_type="design_decision")

        snapshot = build_memory_snapshot(state)

        self.assertIn("지원자 답변:", snapshot)
        self.assertIn("최근 질문(설계 의사결정)", snapshot)
        self.assertIn("추천", snapshot)


class SessionHydrationTests(unittest.TestCase):
    def test_hydrate_state_from_session_row_rebuilds_turn_cache(self) -> None:
        state = VoiceWsState()
        started_at = datetime(2026, 3, 10, 12, 0, tzinfo=timezone.utc)
        session = {
            "id": "session-1",
            "session_type": "live_interview",
            "status": "in_progress",
            "runtime_status": "reconnecting",
            "personality": "professional",
            "job_payload": {"role": "backend"},
            "resume_payload": {"summary": "python"},
            "current_phase": "technical",
            "target_duration_sec": 420,
            "closing_threshold_sec": 60,
            "closing_announced": True,
            "started_at": started_at,
            "paused_duration_sec": 17,
            "planned_questions": [{"slot": 1, "phase": "technical"}],
        }
        turns = [
            {
                "role": "model",
                "channel": "voice",
                "content": "안녕하세요. 첫 질문입니다.",
                "payload": {"question_type": "motivation_validation"},
                "turn_index": 1,
            },
            {
                "role": "user",
                "channel": "voice",
                "content": "백엔드 성능을 개선했고 응답 시간을 18% 줄였습니다.",
                "payload": {},
                "turn_index": 2,
            },
            {
                "role": "model",
                "channel": "voice",
                "content": "그때 어떤 지표로 검증하셨나요?",
                "payload": {"question_type": "metric_validation"},
                "turn_index": 3,
            },
        ]

        hydrate_state_from_session_row(state, session, turns=turns)

        self.assertEqual(state.session_id, "session-1")
        self.assertEqual(state.session_status, "in_progress")
        self.assertEqual(state.runtime_status, "reconnecting")
        self.assertEqual(state.current_phase, "technical")
        self.assertEqual(state.model_turn_count, 2)
        self.assertEqual(len(state.turn_history), 3)
        self.assertTrue(state.closing_announced)
        self.assertEqual(state.session_started_at, started_at)
        self.assertEqual(state.paused_duration_sec, 17)
        self.assertEqual(state.recent_question_types[-1], "metric_validation")
        self.assertIn("지원자 답변:", build_memory_snapshot(state))

    def test_mark_session_status_sets_started_and_ended_at(self) -> None:
        state = VoiceWsState()

        mark_session_status(state, "in_progress", phase="technical")
        started_at = state.session_started_at
        mark_session_status(state, "completed", phase="closing")

        self.assertEqual(state.session_status, "completed")
        self.assertEqual(state.current_phase, "closing")
        self.assertIsNotNone(started_at)
        self.assertIsNotNone(state.session_ended_at)
        self.assertIsNone(state.reconnect_deadline_at)

    def test_mark_session_status_preserves_runtime_state_during_in_progress(self) -> None:
        state = VoiceWsState(runtime_status="model_speaking")

        mark_session_status(state, "in_progress", phase="technical")

        self.assertEqual(state.session_status, "in_progress")
        self.assertEqual(state.runtime_status, "model_speaking")


class AiSanitizationTests(unittest.TestCase):
    def test_sanitize_ai_turn_text_removes_meta_heading(self) -> None:
        raw = """
        **Reading the Text Precisely**

        안녕하세요. 오늘은 장애 대응 경험을 확인하겠습니다. 가장 어려웠던 장애 사례를 설명해 주세요.
        """

        cleaned = sanitize_ai_turn_text(raw)

        self.assertNotIn("Reading the Text Precisely", cleaned)
        self.assertTrue(cleaned.startswith("안녕하세요."))

    def test_sanitize_ai_turn_text_drops_instruction_only_output(self) -> None:
        raw = "[운영 메모 - 절대 그대로 읽지 말 것] 이번 턴 우선 질문 유형: 설계 의사결정"

        cleaned = sanitize_ai_turn_text(raw)

        self.assertEqual(cleaned, "")


class ResumeFlowTests(unittest.IsolatedAsyncioTestCase):
    async def test_resume_existing_session_replays_last_model_turn(self) -> None:
        state = VoiceWsState(session_id="session-1")
        session = {
            "id": "session-1",
            "session_type": "live_interview",
            "status": "in_progress",
            "current_phase": "technical",
            "target_duration_sec": 420,
            "closing_threshold_sec": 60,
        }
        turns = [
            {"role": "user", "channel": "voice", "content": "답변입니다.", "payload": {}, "turn_index": 1},
            {"role": "model", "channel": "voice", "content": "다음 질문입니다.", "payload": {}, "turn_index": 2},
        ]
        hydrate_mock = lambda current_state, payload, *, turns=None: current_state.turn_history.extend(turns or [])
        replay_mock = AsyncMock(return_value=True)
        resume_turn_mock = AsyncMock(return_value=True)
        deps = _resume_deps(
            hydrate_state_from_session_row=hydrate_mock,
            replay_last_model_turn=replay_mock,
            generate_and_send_resume_live_turn=resume_turn_mock,
        )

        resumed = await resume_existing_session(object(), state, session=session, turns=turns, deps=deps)

        self.assertTrue(resumed)
        replay_mock.assert_awaited_once()
        resume_turn_mock.assert_not_called()

    async def test_resume_existing_session_generates_resume_turn_after_user_answer(self) -> None:
        state = VoiceWsState(session_id="session-1")
        session = {
            "id": "session-1",
            "session_type": "live_interview",
            "status": "in_progress",
            "current_phase": "technical",
            "target_duration_sec": 420,
            "closing_threshold_sec": 60,
        }
        turns = [
            {"role": "model", "channel": "voice", "content": "질문입니다.", "payload": {}, "turn_index": 1},
            {"role": "user", "channel": "voice", "content": "답변입니다.", "payload": {}, "turn_index": 2},
        ]

        def hydrate_mock(current_state, payload, *, turns=None) -> None:
            current_state.session_id = payload["id"]
            current_state.session_status = payload["status"]
            current_state.turn_history = list(turns or [])

        replay_mock = AsyncMock(return_value=True)
        resume_turn_mock = AsyncMock(return_value=True)
        deps = _resume_deps(
            hydrate_state_from_session_row=hydrate_mock,
            replay_last_model_turn=replay_mock,
            generate_and_send_resume_live_turn=resume_turn_mock,
        )

        resumed = await resume_existing_session(object(), state, session=session, turns=turns, deps=deps)

        self.assertTrue(resumed)
        resume_turn_mock.assert_awaited_once()
        replay_mock.assert_not_called()

    async def test_resume_existing_session_warns_without_fallback_when_resume_turn_fails(self) -> None:
        state = VoiceWsState(session_id="session-1")
        session = {
            "id": "session-1",
            "session_type": "live_interview",
            "status": "in_progress",
            "current_phase": "technical",
            "target_duration_sec": 420,
            "closing_threshold_sec": 60,
        }
        turns = [
            {"role": "model", "channel": "voice", "content": "질문입니다.", "payload": {}, "turn_index": 1},
            {"role": "user", "channel": "voice", "content": "답변입니다.", "payload": {}, "turn_index": 2},
        ]

        def hydrate_mock(current_state, payload, *, turns=None) -> None:
            current_state.session_id = payload["id"]
            current_state.session_status = payload["status"]
            current_state.turn_history = list(turns or [])

        send_json_mock = AsyncMock(return_value=True)
        resume_listening_mock = AsyncMock(return_value=None)
        resume_turn_mock = AsyncMock(return_value=False)
        deps = _resume_deps(
            hydrate_state_from_session_row=hydrate_mock,
            send_json=send_json_mock,
            resume_listening=resume_listening_mock,
            generate_and_send_resume_live_turn=resume_turn_mock,
        )

        resumed = await resume_existing_session(object(), state, session=session, turns=turns, deps=deps)

        self.assertTrue(resumed)
        resume_turn_mock.assert_awaited_once()
        resume_listening_mock.assert_awaited_once()
        warning_payloads = [call.args[1] for call in send_json_mock.await_args_list if len(call.args) >= 2]
        self.assertTrue(any(payload.get("type") == "warning" for payload in warning_payloads))


class SessionInitTests(unittest.IsolatedAsyncioTestCase):
    async def test_handle_session_init_rejects_expired_reconnect_window(self) -> None:
        state = VoiceWsState()
        send_json_mock = AsyncMock(return_value=True)
        opening_mock = AsyncMock(return_value=True)
        mark_runtime_expired = Mock(
            return_value={
                "id": "session-1",
                "session_type": "live_interview",
                "status": "failed",
                "target_duration_sec": 420,
                "closing_threshold_sec": 60,
            }
        )
        expired_deadline = datetime.now(timezone.utc) - timedelta(seconds=3)
        session = {
            "id": "session-1",
            "session_type": "live_interview",
            "status": "in_progress",
            "target_duration_sec": 420,
            "closing_threshold_sec": 60,
            "reconnect_deadline_at": expired_deadline,
        }
        deps = _session_engine_deps(
            get_session=lambda session_id: session,
            get_turns=lambda session_id: [{"role": "model", "content": "질문입니다.", "payload": {}}],
            mark_runtime_expired=mark_runtime_expired,
            send_json=send_json_mock,
            generate_and_send_opening_live_turn=opening_mock,
        )

        await handle_session_init(
            object(),
            state,
            {"type": "init-interview-session", "sessionId": "session-1", "sessionType": "live_interview"},
            deps=deps,
        )

        mark_runtime_expired.assert_called_once_with("session-1")
        opening_mock.assert_not_called()
        payloads = [call.args[1] for call in send_json_mock.await_args_list if len(call.args) >= 2]
        self.assertTrue(any(payload.get("type") == "connection.expired" for payload in payloads))

    async def test_handle_session_init_starts_opening_turn_for_fresh_session(self) -> None:
        state = VoiceWsState()
        send_json_mock = AsyncMock(return_value=True)
        send_avatar_state_mock = AsyncMock(return_value=True)
        opening_mock = AsyncMock(return_value=True)
        session = {
            "id": "session-1",
            "session_type": "live_interview",
            "status": "created",
            "target_duration_sec": 420,
            "closing_threshold_sec": 60,
        }
        deps = _session_engine_deps(
            get_session=lambda session_id: session,
            get_turns=lambda session_id: [],
            mark_runtime_connected=Mock(
                return_value={
                    **session,
                    "status": "in_progress",
                    "runtime_status": "awaiting_user",
                }
            ),
            send_json=send_json_mock,
            send_avatar_state=send_avatar_state_mock,
            generate_and_send_opening_live_turn=opening_mock,
        )

        await handle_session_init(
            object(),
            state,
            {"type": "init-interview-session", "sessionId": "session-1", "sessionType": "live_interview"},
            deps=deps,
        )

        opening_mock.assert_awaited_once()
        payloads = [call.args[1] for call in send_json_mock.await_args_list if len(call.args) >= 2]
        self.assertTrue(any(payload.get("type") == "interview-session-created" for payload in payloads))
        self.assertTrue(any(payload.get("type") == "connection.ready" for payload in payloads))
        send_avatar_state_mock.assert_awaited()


class SessionEngineUserTurnTests(unittest.IsolatedAsyncioTestCase):
    async def test_process_user_utterance_uses_single_live_audio_request(self) -> None:
        state = VoiceWsState(session_id="session-1", current_phase="technical")
        state.realtime_user_transcript = "캐시 히트율을 높여 지연 시간을 줄였습니다."
        state.live_interview = _DummyLiveSession(model="gemini-live-2.5-flash-live", enabled=True)

        request_live_audio_turn = AsyncMock(
            return_value=("캐시 히트율을 높여 지연 시간을 줄였습니다.", "다음 질문입니다.", object(), "gemini-live")
        )
        persist_turn = AsyncMock(return_value={"id": "turn-1"})
        send_json_mock = AsyncMock(return_value=True)
        send_avatar_state_mock = AsyncMock(return_value=True)
        send_runtime_meta_snapshot_mock = AsyncMock(return_value=True)
        set_runtime_status_mock = AsyncMock(return_value=None)
        send_transcript_mock = AsyncMock(return_value=True)

        deps = _session_engine_deps(
            request_live_audio_turn=request_live_audio_turn,
            persist_turn=persist_turn,
            send_json=send_json_mock,
            send_avatar_state=send_avatar_state_mock,
            send_runtime_meta_snapshot=send_runtime_meta_snapshot_mock,
            set_runtime_status=set_runtime_status_mock,
            send_transcript=send_transcript_mock,
            get_or_create_live_interview=lambda current_state: current_state.live_interview,
        )

        followup_mock = AsyncMock(return_value=True)
        with patch(
            "app.interview.runtime.session_engine.execute_live_user_followup_turn",
            new=followup_mock,
        ):
            await process_user_utterance(
                object(),
                state,
                b"wav-bytes",
                deps=deps,
                vad_meta={"reason": "short_utterance_silence"},
                runtime_mode_disabled="disabled",
                closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            )

        request_live_audio_turn.assert_awaited_once()
        followup_mock.assert_awaited_once()
        persist_turn.assert_awaited_once()
        self.assertEqual(persist_turn.await_args.kwargs["role"], "user")
        set_runtime_status_mock.assert_any_await("session-1", "model_thinking", "technical")
        send_transcript_mock.assert_awaited_once()
        self.assertFalse(state.processing_audio)


class AdaptiveVadTests(unittest.TestCase):
    def test_retune_vad_for_short_answer_relaxes_cutoff(self) -> None:
        state = VoiceWsState()
        base_silence = state.vad.silence_ms
        base_short_silence = state.vad.short_utterance_silence_ms
        base_turn_end_grace = state.turn_end_grace_sec

        retune_vad_for_next_turn(state, utterance_duration_ms=1400.0, short_answer=True)

        self.assertGreater(state.vad.silence_ms, base_silence)
        self.assertGreater(state.vad.short_utterance_silence_ms, base_short_silence)
        self.assertGreater(state.turn_end_grace_sec, base_turn_end_grace)
        self.assertEqual(state.short_reprompt_streak, 1)

    def test_retune_vad_for_long_answers_updates_recent_window(self) -> None:
        state = VoiceWsState()

        for duration_ms in (5200.0, 5400.0, 5600.0):
            retune_vad_for_next_turn(state, utterance_duration_ms=duration_ms, short_answer=False)

        self.assertEqual(state.short_reprompt_streak, 0)
        self.assertEqual(len(state.recent_user_durations_ms), 3)
        self.assertGreaterEqual(state.vad.silence_ms, 820)
        self.assertGreaterEqual(state.vad.short_utterance_silence_ms, 2060)
        self.assertGreaterEqual(state.turn_end_grace_sec, 1.34)


class LiveUserRequestTests(unittest.TestCase):
    def test_prepare_live_user_request_marks_terminal_turn_without_followup_question(self) -> None:
        state = VoiceWsState(current_phase="technical")
        state.realtime_user_transcript = "장애 원인을 빠르게 파악해 복구했습니다."
        followup_spec = LiveUserFollowupSpec(
            model_count=3,
            target_duration_sec=600,
            closing_threshold_sec=60,
            elapsed_sec=590,
            remaining_sec=10,
            estimated_total_questions=5,
            completion_reason="time_limit_reached",
            question_index=0,
            should_announce_closing=False,
            phase="closing",
            response_question_index=4,
        )

        spec = prepare_live_user_request(
            state,
            followup_spec=followup_spec,
            closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            build_answer_quality_hint=lambda text: f"근거 확인: {text}",
            derive_question_type_preference=lambda *args, **kwargs: "metric_validation",
            select_next_question_type=lambda *args, **kwargs: "tradeoff",
        )

        self.assertEqual(spec.planned_question_type, "")
        self.assertIn("질문 없이 면접을 종료", spec.extra_instruction)
        self.assertIn("수고하셨습니다.", spec.extra_instruction)
        self.assertEqual(spec.answer_quality_hint, "근거 확인: 장애 원인을 빠르게 파악해 복구했습니다.")

    def test_prepare_live_user_request_injects_last_question_instruction(self) -> None:
        state = VoiceWsState(current_phase="technical")
        state.realtime_user_transcript = "캐시 미스율을 줄여 응답을 안정화했습니다."
        followup_spec = LiveUserFollowupSpec(
            model_count=3,
            target_duration_sec=600,
            closing_threshold_sec=60,
            elapsed_sec=545,
            remaining_sec=55,
            estimated_total_questions=5,
            completion_reason="",
            question_index=4,
            should_announce_closing=True,
            phase="closing",
            response_question_index=4,
        )

        spec = prepare_live_user_request(
            state,
            followup_spec=followup_spec,
            closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            build_answer_quality_hint=lambda text: f"근거 확인: {text}",
            derive_question_type_preference=lambda *args, **kwargs: "metric_validation",
            select_next_question_type=lambda *args, **kwargs: "priority_judgment",
        )

        self.assertEqual(spec.planned_question_type, "priority_judgment")
        self.assertIn("이번 턴은 마지막 질문입니다.", spec.extra_instruction)
        self.assertIn("질문은 정확히 1개만", spec.extra_instruction)


class ReportDocumentTests(unittest.TestCase):
    def test_coerce_report_document_accepts_v2_shape_only(self) -> None:
        valid = {"schemaVersion": REPORT_SCHEMA_VERSION, "compatAnalysis": {}, "reportView": {}}
        invalid = {"summary": "legacy"}

        self.assertEqual(coerce_report_document(valid), valid)
        self.assertEqual(coerce_report_document(invalid), {})

    def test_build_timeline_entries_pairs_user_answer_with_previous_model_prompt(self) -> None:
        started_at = datetime(2026, 3, 10, 12, 0, tzinfo=timezone.utc)
        turns = [
            {"role": "model", "content": "첫 질문입니다.", "created_at": started_at},
            {
                "role": "user",
                "content": "첫 답변입니다.",
                "phase": "introduction",
                "exchange_index": 1,
                "created_at": started_at + timedelta(seconds=35),
            },
            {"role": "model", "content": "두 번째 질문입니다.", "created_at": started_at + timedelta(seconds=65)},
            {
                "role": "user",
                "content": "두 번째 답변입니다.",
                "phase": "technical",
                "exchange_index": 2,
                "created_at": started_at + timedelta(seconds=115),
            },
        ]

        timeline = build_timeline_entries(turns, target_duration_sec=600, paused_duration_sec=30)

        self.assertEqual(len(timeline), 2)
        self.assertEqual(timeline[0]["prompt"], "첫 질문입니다.")
        self.assertEqual(timeline[1]["prompt"], "두 번째 질문입니다.")
        self.assertEqual(timeline[0]["phaseLabel"], "introduction")
        self.assertEqual(timeline[1]["phaseLabel"], "technical")
        self.assertRegex(timeline[0]["timeLabel"], r"^\d{2}:\d{2}$")

    def test_build_report_document_wraps_compat_analysis_with_view_and_timeline(self) -> None:
        session = {
            "session_type": "live_interview",
            "target_duration_sec": 600,
            "paused_duration_sec": 15,
            "job_payload": {"company": "Dibut", "role": "Backend Engineer"},
        }
        turns = [
            {"role": "model", "content": "질문입니다.", "created_at": datetime(2026, 3, 10, 12, 0, tzinfo=timezone.utc)},
            {
                "role": "user",
                "content": "답변입니다.",
                "exchange_index": 1,
                "phase": "technical",
                "created_at": datetime(2026, 3, 10, 12, 1, tzinfo=timezone.utc),
            },
        ]
        compat_analysis = {
            "summary": "전반적으로 구조적 답변이 좋았습니다.",
            "strengths": ["근거 기반 설명"],
            "improvements": ["지표 제시 보강"],
        }

        document = build_report_document(session=session, turns=turns, compat_analysis=compat_analysis)

        self.assertEqual(document["schemaVersion"], REPORT_SCHEMA_VERSION)
        self.assertEqual(document["compatAnalysis"]["summary"], compat_analysis["summary"])
        self.assertEqual(document["reportView"]["company"], "Dibut")
        self.assertEqual(document["reportView"]["strengths"], ["근거 기반 설명"])
        self.assertEqual(document["generationMeta"]["timelineCount"], 1)
        self.assertEqual(document["timeline"][0]["answer"], "답변입니다.")

    def test_build_report_document_preserves_existing_v2_payload(self) -> None:
        existing = {
            "schemaVersion": REPORT_SCHEMA_VERSION,
            "compatAnalysis": {"summary": "기존 리포트"},
            "reportView": {"summary": "기존 view"},
            "timeline": [],
            "generationMeta": {"generatedAt": 1700000000},
        }
        session = {"session_type": "portfolio_defense", "target_duration_sec": 900, "paused_duration_sec": 0}

        document = build_report_document(session=session, turns=[], compat_analysis=existing)

        self.assertEqual(document["schemaVersion"], REPORT_SCHEMA_VERSION)
        self.assertEqual(document["generationMeta"]["sessionType"], "portfolio_defense")
        self.assertEqual(document["generationMeta"]["generatedAt"], 1700000000)


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
