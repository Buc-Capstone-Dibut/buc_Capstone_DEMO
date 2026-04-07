from __future__ import annotations

import asyncio
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
_interview_stub.get_connection = Mock()
sys.modules.setdefault("app.services.interview_service", _interview_stub)

from app.interview.domain.interview_memory import (
    build_memory_snapshot,
    derive_question_type_preference,
    record_question_type,
    remember_model_turn,
    remember_user_turn,
    select_opening_question_type,
    select_question_strategy,
    select_next_question_type,
)
from app.interview.domain.interview_level import resolve_interview_level
from app.interview.domain.turn_text import (
    build_opening_turn_text,
    compose_ai_question_text,
    looks_like_complete_ai_question,
    sanitize_ai_turn_text,
    sanitize_user_turn_text,
)
from app.interview.reporting.document import (
    REPORT_SCHEMA_VERSION,
    build_report_document,
    build_timeline_entries,
    coerce_report_document,
)
from app.interview.runtime.executor import (
    RuntimeExecutorDeps,
    execute_live_user_followup_turn,
    execute_opening_live_turn,
)
from app.interview.runtime.live_client import LiveClientDeps, repair_ai_turn_if_truncated, request_live_text_turn
from app.interview.runtime.live_turns import (
    LiveUserFollowupSpec,
    LiveUserRequestSpec,
    OpeningTurnSpec,
    prepare_live_user_request,
)
from app.interview.runtime.message_router import ClientMessageRouterDeps, handle_client_message
from app.interview.runtime.session_interaction import is_probable_ai_echo
from app.interview.runtime.session_engine import (
    SessionEngineDeps,
    enqueue_user_segment,
    handle_session_init,
    process_user_utterance,
)
from app.interview.runtime.session_resume import SessionResumeDeps, resume_existing_session
from app.interview.runtime.state import (
    AiDeliveryPlan,
    PendingUserSegment,
    PreparedDeliverySegment,
    PreparedTtsAudio,
    VoiceWsState,
)
from app.interview.runtime.ws_runtime import _should_emit_gemini_user_delta
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
    fallback_transcribe_user_audio=None,
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
    finalize_parallel_stt_stream=None,
    runtime_architecture="live-only",
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
        send_prepared_opening_live_turn=AsyncMock(return_value=True),
        consume_prepared_opening=lambda session_id: None,
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
        fallback_transcribe_user_audio=fallback_transcribe_user_audio or AsyncMock(return_value=("", "")),
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
        finalize_parallel_stt_stream=finalize_parallel_stt_stream or AsyncMock(return_value=True),
        runtime_architecture=runtime_architecture,
    )


class QuestionTypeTests(unittest.TestCase):
    def test_resolve_interview_level_uses_resume_experience(self) -> None:
        level = resolve_interview_level(
            {"interviewLevel": "auto", "role": "Backend Developer"},
            {
                "parsedContent": {
                    "experience": [
                        {"position": "Backend Engineer", "period": "2021 - 2025"},
                    ],
                },
            },
        )

        self.assertEqual(level, "mid")

    def test_select_opening_question_type_is_project_context_for_new_grad(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "new_grad"}

        self.assertEqual(select_opening_question_type(state), "project_context")

    def test_select_next_question_type_skips_recent_types(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "junior"}
        state.recent_question_types = ["role_contribution", "implementation_detail"]
        state.question_type_cursor = 1

        next_type = select_next_question_type(state)

        self.assertEqual(next_type, "failure_recovery")

    def test_preferred_question_type_is_used_when_not_recent(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "mid"}
        state.recent_question_types = ["design_decision", "problem_solving_process"]

        next_type = select_next_question_type(state, preferred="metric_validation")

        self.assertEqual(next_type, "implementation_detail")

    def test_preferred_question_type_can_repeat_once_for_grounded_followup(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "junior"}
        state.recent_question_types = ["implementation_detail"]

        next_type = select_next_question_type(state, preferred="implementation_detail")

        self.assertEqual(next_type, "implementation_detail")

    def test_preferred_question_type_rotates_after_two_consecutive_repeats(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "junior"}
        state.recent_question_types = ["implementation_detail", "implementation_detail"]

        next_type = select_next_question_type(state, preferred="implementation_detail")

        self.assertEqual(next_type, "failure_recovery")

    def test_metric_validation_is_not_default_first_followup_for_new_grad(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "new_grad"}
        state.recent_question_types = ["project_context"]

        preferred = derive_question_type_preference(
            state,
            "실시간 면접 서비스를 만들면서 웹소켓 연결과 사용자 흐름을 구현했습니다.",
        )

        self.assertEqual(preferred, "implementation_detail")

    def test_metric_question_is_cooled_down_when_recently_used(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "mid"}
        state.recent_question_types = ["implementation_detail", "metric_validation", "design_decision"]

        next_type = select_next_question_type(state, preferred="metric_validation")

        self.assertNotEqual(next_type, "metric_validation")

    def test_tradeoff_is_blocked_after_recent_design_heavy_turn(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "mid"}
        state.recent_question_types = ["design_decision", "failure_recovery"]

        next_type = select_next_question_type(state, preferred="tradeoff")

        self.assertNotEqual(next_type, "tradeoff")

    def test_experience_detail_rotation_breaks_after_two_recent_detail_turns(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "junior"}
        state.recent_question_types = ["role_contribution", "implementation_detail"]

        next_type = select_next_question_type(state, preferred="problem_solving_process")

        self.assertNotEqual(next_type, "problem_solving_process")

    def test_select_question_strategy_allows_same_axis_followup_once(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "junior"}
        state.recent_question_types = ["implementation_detail"]

        strategy, question_type = select_question_strategy(
            state,
            "웹소켓 기반으로 이벤트를 분리해 구현했고 Redis 캐시를 함께 사용했습니다.",
        )

        self.assertEqual(strategy, "followup")
        self.assertEqual(question_type, "implementation_detail")


class ParallelSttFallbackTests(unittest.TestCase):
    def test_gemini_user_delta_resumes_when_parallel_stream_fails_mid_turn(self) -> None:
        state = VoiceWsState(session_id="session-1")
        state.parallel_stt_turn_id = "session-1:2"
        state.parallel_stt_has_emitted = True
        state.parallel_stt_best_text = "세션 정보를 최소화하고"

        class _FailedStream:
            def is_closed(self) -> bool:
                return True

            def failed(self) -> bool:
                return True

        state.parallel_stt_stream = _FailedStream()

        with patch("app.interview.runtime.ws_runtime.settings.voice_parallel_stt_enabled", True), patch(
            "app.interview.runtime.ws_runtime.runtime_get_parallel_stt_service",
            return_value=types.SimpleNamespace(enabled=True),
        ):
            self.assertTrue(_should_emit_gemini_user_delta(state))

    def test_record_question_type_advances_rotation_cursor(self) -> None:
        state = VoiceWsState()

        record_question_type(state, "design_decision")

        self.assertEqual(state.recent_question_types, ["design_decision"])
        self.assertEqual(state.question_type_cursor, 9)

    def test_derive_question_type_prefers_metric_when_answer_has_no_numbers(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "mid"}

        preferred = derive_question_type_preference(
            state,
            "성능 개선을 진행했고 사용자 경험을 더 좋게 만들었습니다.",
        )

        self.assertEqual(preferred, "problem_solving_process")

    def test_derive_question_type_prefers_failure_recovery_on_incident_answer(self) -> None:
        state = VoiceWsState()
        state.job_data = {"interviewLevel": "mid"}
        state.recent_question_types = ["metric_validation"]

        preferred = derive_question_type_preference(
            state,
            "배포 후 장애가 발생해서 롤백하고 원인을 분석했습니다.",
        )

        self.assertEqual(preferred, "failure_recovery")

    def test_new_grad_question_wording_uses_soft_metric_prompt(self) -> None:
        question = compose_ai_question_text(
            user_text="응답 속도를 줄이기 위해 캐시 정책을 조정했습니다.",
            question_type="metric_validation",
            strategy="followup",
            session_type="live_interview",
            interview_level="new_grad",
            question_index=2,
            job_data={"interviewLevel": "new_grad"},
            resume_data={},
        )

        self.assertIn("성과를 어떻게 확인", question)
        self.assertNotIn("어떤 수치나 지표", question)

    def test_senior_opening_text_mentions_decision_scope(self) -> None:
        text = build_opening_turn_text(
            session_type="live_interview",
            company="디벗",
            role="백엔드 개발자",
            job_data={"role": "백엔드 개발자", "interviewLevel": "senior"},
            resume_data={},
            interview_level="senior",
            seed_text="seed",
        )

        self.assertTrue("의사결정" in text or "판단" in text)


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

    def test_sanitize_ai_turn_text_removes_english_protocol_prefix(self) -> None:
        raw = (
            "Initiating Interview Protocol. I'm now ready to start the interview process. "
            "안녕하세요. 먼저 최근에 가장 도전적이었던 프로젝트를 설명해 주세요."
        )

        cleaned = sanitize_ai_turn_text(raw)

        self.assertEqual(
            cleaned,
            "안녕하세요. 먼저 최근에 가장 도전적이었던 프로젝트를 설명해 주세요.",
        )

    def test_sanitize_ai_turn_text_removes_opening_setup_sentence(self) -> None:
        raw = (
            "Confirming Interview Setup. I have finished the opening setup. "
            "이번 프로젝트에서 본인이 맡은 핵심 역할을 말씀해 주세요."
        )

        cleaned = sanitize_ai_turn_text(raw)

        self.assertEqual(cleaned, "이번 프로젝트에서 본인이 맡은 핵심 역할을 말씀해 주세요.")

    def test_sanitize_ai_turn_text_restores_dense_korean_spacing(self) -> None:
        raw = (
            "안녕하세요.지원자님,저희회사서비스백엔드직무에지원해주셔서감사합니다."
            "먼저간단히자기소개부터부탁드립니다."
        )

        cleaned = sanitize_ai_turn_text(raw)

        self.assertEqual(
            cleaned,
            "안녕하세요. 지원자님, 저희 회사 서비스 백엔드 직무에 지원해 주셔서 감사합니다. 먼저 간단히 자기 소개부터 부탁드립니다.",
        )

    def test_sanitize_user_turn_text_restores_dense_korean_spacing(self) -> None:
        raw = (
            "지원자분께서지원하신서비스백엔드직무는대용량트래픽처리와데이터정합성관리가매우중요합니다."
            "특히코드리뷰와지표기반의사결정을중시하는저희팀에맞는경험을설명했습니다."
        )

        cleaned = sanitize_user_turn_text(raw)

        self.assertEqual(
            cleaned,
            (
                "지원자분께서 지원하신 서비스 백엔드 직무는 대용량 트래픽 처리와 데이터 정합성 관리가 매우 중요합니다. "
                "특히 코드 리뷰와 지표 기반 의사결정을 중시하는 저희 팀에 맞는 경험을 설명했습니다."
            ),
        )

    def test_sanitize_user_turn_text_collapses_fragmented_syllables_and_acronyms(self) -> None:
        raw = "실 시 간 a i 면 접 과 h t t p 폴 링 을 비 교 했 습 니 다"

        cleaned = sanitize_user_turn_text(raw)

        self.assertEqual(cleaned, "실시간 ai 면접과 http 폴링을 비교했습니다")

    def test_looks_like_complete_ai_question_requires_explicit_question_intent(self) -> None:
        self.assertFalse(
            looks_like_complete_ai_question(
                "네, 반갑습니다. 대용량 트래픽 처리와 데이터 정합성 관련 프로젝트 경험에 대해 자세히 듣고 싶습니다."
            )
        )
        self.assertTrue(
            looks_like_complete_ai_question(
                "네, 반갑습니다. 대용량 트래픽 처리와 데이터 정합성 관련 프로젝트 경험에 대해 자세히 듣고 싶습니다. "
                "특히 어떤 프로젝트에서 어떤 역할을 맡으셨는지 구체적으로 말씀해 주세요."
            )
        )


class OpeningFallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_opening_turn_falls_back_when_live_generation_is_empty(self) -> None:
        state = VoiceWsState(
            session_id="session-1",
            session_type="live_interview",
            job_data={"company": "Dibut", "role": "백엔드 개발자"},
        )
        persist_turn = AsyncMock(return_value={"id": "turn-1"})
        send_json = AsyncMock(return_value=True)
        send_transcript = AsyncMock(return_value=True)
        resume_listening = AsyncMock(return_value=None)
        deps = RuntimeExecutorDeps(
            request_live_text_turn=AsyncMock(return_value=("", None)),
            repair_ai_turn_if_truncated=AsyncMock(return_value=("", None)),
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=AsyncMock(return_value=AiDeliveryPlan()),
            persist_turn=persist_turn,
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=send_json,
            send_transcript=send_transcript,
            stream_prepared_ai_delivery=AsyncMock(return_value=False),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=resume_listening,
            reconnect_remaining_sec=lambda state: 0,
            live_active_model=lambda state: "gemini-live",
            snapshot_vad_config=lambda state: {},
            build_memory_snapshot=lambda state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
            request_live_spoken_text_turn=AsyncMock(return_value=("", None, "gemini-live")),
        )

        generated = await execute_opening_live_turn(
            object(),
            state,
            spec=OpeningTurnSpec(
                turn_id="session-1:1",
                prompt="면접을 시작하세요.",
                question_type="motivation_validation",
                phase="introduction",
                question_index=1,
                target_duration_sec=600,
                closing_threshold_sec=60,
                elapsed_sec=0,
                remaining_sec=600,
                estimated_total_questions=6,
            ),
            deps=deps,
        )

        self.assertFalse(generated)
        self.assertTrue(
            any(
                call.args[1].get("type") == "error"
                for call in send_json.await_args_list
                if len(call.args) >= 2
            )
        )
        send_transcript.assert_not_awaited()
        resume_listening.assert_not_awaited()
        persist_turn.assert_not_awaited()

    async def test_opening_turn_fails_when_text_exists_but_audio_is_missing(self) -> None:
        state = VoiceWsState(session_id="session-2", session_type="live_interview")
        send_transcript = AsyncMock(return_value=True)
        resume_listening = AsyncMock(return_value=None)
        deps = RuntimeExecutorDeps(
            request_live_text_turn=AsyncMock(return_value=("안녕하세요. 지원 동기를 말씀해 주세요.", None)),
            repair_ai_turn_if_truncated=AsyncMock(return_value=("안녕하세요. 지원 동기를 말씀해 주세요.", None)),
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=AsyncMock(return_value=AiDeliveryPlan()),
            persist_turn=AsyncMock(return_value={"id": "turn-1"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=send_transcript,
            stream_prepared_ai_delivery=AsyncMock(return_value=False),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=resume_listening,
            reconnect_remaining_sec=lambda state: 0,
            live_active_model=lambda state: "gemini-live",
            snapshot_vad_config=lambda state: {},
            build_memory_snapshot=lambda state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
            request_live_spoken_text_turn=AsyncMock(
                return_value=("안녕하세요. 지원 동기를 말씀해 주세요.", None, "gemini-live")
            ),
        )

        generated = await execute_opening_live_turn(
            object(),
            state,
            spec=OpeningTurnSpec(
                turn_id="session-2:1",
                prompt="면접을 시작하세요.",
                question_type="motivation_validation",
                phase="introduction",
                question_index=1,
                target_duration_sec=600,
                closing_threshold_sec=60,
                elapsed_sec=0,
                remaining_sec=600,
                estimated_total_questions=6,
            ),
            deps=deps,
        )

        self.assertFalse(generated)
        send_transcript.assert_not_awaited()
        resume_listening.assert_not_awaited()


    async def test_opening_turn_recovers_live_audio_before_resuming(self) -> None:
        state = VoiceWsState(session_id="session-2r", session_type="live_interview")
        prepared_audio = PreparedTtsAudio(
            chunks=["chunk"],
            sample_rate=24000,
            provider="gemini-live-single",
            duration_sec=1.1,
        )
        build_ai_delivery_plan = AsyncMock(return_value=AiDeliveryPlan(
            segments=[PreparedDeliverySegment(text="안녕하세요. 지원 동기를 말씀해 주세요.", prepared_audio=prepared_audio)],
            mode="live-audio",
            provider="gemini-live-single",
        ))
        request_live_text_turn = AsyncMock(
            side_effect=[
                ("안녕하세요. 지원 동기를 말씀해 주세요.", None),
                ("안녕하세요. 지원 동기를 말씀해 주세요.", prepared_audio),
            ]
        )
        stream_prepared_ai_delivery = AsyncMock(return_value=True)
        resume_listening = AsyncMock(return_value=None)
        deps = RuntimeExecutorDeps(
            request_live_text_turn=request_live_text_turn,
            repair_ai_turn_if_truncated=AsyncMock(
                side_effect=[
                    ("안녕하세요. 지원 동기를 말씀해 주세요.", None),
                    ("안녕하세요. 지원 동기를 말씀해 주세요.", prepared_audio),
                ]
            ),
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=build_ai_delivery_plan,
            persist_turn=AsyncMock(return_value={"id": "turn-1"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=AsyncMock(return_value=True),
            stream_prepared_ai_delivery=stream_prepared_ai_delivery,
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=resume_listening,
            reconnect_remaining_sec=lambda state: 0,
            live_active_model=lambda state: "gemini-live",
            snapshot_vad_config=lambda state: {},
            build_memory_snapshot=lambda state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
            request_live_spoken_text_turn=AsyncMock(
                return_value=("안녕하세요. 지원 동기를 말씀해 주세요.", prepared_audio, "gemini-live-single")
            ),
        )

        generated = await execute_opening_live_turn(
            object(),
            state,
            spec=OpeningTurnSpec(
                turn_id="session-2r:1",
                prompt="면접을 시작하세요.",
                question_type="motivation_validation",
                phase="introduction",
                question_index=1,
                target_duration_sec=600,
                closing_threshold_sec=60,
                elapsed_sec=0,
                remaining_sec=600,
                estimated_total_questions=6,
            ),
            deps=deps,
        )

        self.assertTrue(generated)
        request_live_text_turn.assert_not_awaited()
        self.assertIs(build_ai_delivery_plan.await_args.kwargs["preferred_full_audio"], prepared_audio)
        stream_prepared_ai_delivery.assert_awaited_once()
        resume_listening.assert_not_awaited()

    async def test_opening_turn_keeps_live_audio_when_available(self) -> None:
        state = VoiceWsState(session_id="session-2a", session_type="live_interview")
        prepared_audio = PreparedTtsAudio(
            chunks=["chunk"],
            sample_rate=24000,
            provider="gemini-live",
            duration_sec=1.3,
        )
        build_ai_delivery_plan = AsyncMock(return_value=AiDeliveryPlan(
            segments=[PreparedDeliverySegment(text="안녕하세요. 지원 동기를 말씀해 주세요.", prepared_audio=prepared_audio)],
            mode="full",
            provider="gemini-live",
        ))
        deps = RuntimeExecutorDeps(
            request_live_text_turn=AsyncMock(return_value=("안녕하세요. 지원 동기를 말씀해 주세요.", prepared_audio)),
            repair_ai_turn_if_truncated=AsyncMock(return_value=("안녕하세요. 지원 동기를 말씀해 주세요.", prepared_audio)),
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=build_ai_delivery_plan,
            persist_turn=AsyncMock(return_value={"id": "turn-1"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=AsyncMock(return_value=True),
            stream_prepared_ai_delivery=AsyncMock(return_value=True),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=AsyncMock(return_value=None),
            reconnect_remaining_sec=lambda state: 0,
            live_active_model=lambda state: "gemini-live",
            snapshot_vad_config=lambda state: {},
            build_memory_snapshot=lambda state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
            request_live_spoken_text_turn=AsyncMock(
                return_value=("안녕하세요. 지원 동기를 말씀해 주세요.", prepared_audio, "gemini-live")
            ),
        )

        generated = await execute_opening_live_turn(
            object(),
            state,
            spec=OpeningTurnSpec(
                turn_id="session-2a:1",
                prompt="면접을 시작하세요.",
                question_type="motivation_validation",
                phase="introduction",
                question_index=1,
                target_duration_sec=600,
                closing_threshold_sec=60,
                elapsed_sec=0,
                remaining_sec=600,
                estimated_total_questions=6,
            ),
            deps=deps,
        )

        self.assertTrue(generated)
        self.assertIs(build_ai_delivery_plan.await_args.kwargs["preferred_full_audio"], prepared_audio)

    async def test_opening_turn_repairs_incomplete_text_before_delivery(self) -> None:
        state = VoiceWsState(session_id="session-3", session_type="live_interview")
        send_transcript = AsyncMock(return_value=True)
        resume_listening = AsyncMock(return_value=None)
        prepared_audio = PreparedTtsAudio(
            chunks=["chunk"],
            sample_rate=24000,
            provider="gemini-live",
            duration_sec=1.4,
        )
        request_live_text_turn = AsyncMock(
            side_effect=[
                ("안녕하세요. 지원자님의 경험을 확인하고자 합니다. 특히 대용량 트래픽 처리 경험이 있다고", None),
                (
                    "안녕하세요. 지원자님의 경험을 확인하고자 합니다. 특히 대용량 트래픽 처리 경험이 있다고 하셨는데, "
                    "그 과정에서 가장 어려웠던 문제와 해결 방식을 말씀해 주세요.",
                    None,
                ),
            ]
        )
        repair_ai_turn_if_truncated = AsyncMock(
            side_effect=[
                ("안녕하세요. 지원자님의 경험을 확인하고자 합니다. 특히 대용량 트래픽 처리 경험이 있다고", None),
                (
                    "안녕하세요. 지원자님의 경험을 확인하고자 합니다. 특히 대용량 트래픽 처리 경험이 있다고 하셨는데, "
                    "그 과정에서 가장 어려웠던 문제와 해결 방식을 말씀해 주세요.",
                    None,
                ),
            ]
        )
        deps = RuntimeExecutorDeps(
            request_live_text_turn=request_live_text_turn,
            repair_ai_turn_if_truncated=repair_ai_turn_if_truncated,
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=AsyncMock(
                return_value=AiDeliveryPlan(
                    segments=[
                        PreparedDeliverySegment(
                            text="면접을 시작하세요.",
                            prepared_audio=prepared_audio,
                        )
                    ],
                    mode="full",
                    provider="gemini-live",
                )
            ),
            persist_turn=AsyncMock(return_value={"id": "turn-1"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=send_transcript,
            stream_prepared_ai_delivery=AsyncMock(return_value=True),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=resume_listening,
            reconnect_remaining_sec=lambda state: 0,
            live_active_model=lambda state: "gemini-live",
            snapshot_vad_config=lambda state: {},
            build_memory_snapshot=lambda state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
            request_live_spoken_text_turn=AsyncMock(
                return_value=(
                    "안녕하세요. 지원자님의 경험을 확인하고자 합니다. 특히 대용량 트래픽 처리 경험이 있다고 하셨는데, "
                    "그 과정에서 가장 어려웠던 문제와 해결 방식을 말씀해 주세요.",
                    prepared_audio,
                    "gemini-live",
                )
            ),
        )

        generated = await execute_opening_live_turn(
            object(),
            state,
            spec=OpeningTurnSpec(
                turn_id="session-3:1",
                prompt="면접을 시작하세요.",
                question_type="motivation_validation",
                phase="introduction",
                question_index=1,
                target_duration_sec=600,
                closing_threshold_sec=60,
                elapsed_sec=0,
                remaining_sec=600,
                estimated_total_questions=6,
            ),
            deps=deps,
        )

        self.assertTrue(generated)
        request_live_text_turn.assert_not_awaited()
        repair_ai_turn_if_truncated.assert_not_awaited()
        self.assertEqual(send_transcript.await_args.args[3], "면접을 시작하세요.")

    async def test_opening_turn_falls_back_to_deterministic_completion_when_repairs_stay_incomplete(self) -> None:
        state = VoiceWsState(session_id="session-4", session_type="live_interview")
        send_transcript = AsyncMock(return_value=True)
        resume_listening = AsyncMock(return_value=None)
        incomplete_text = "안녕하세요. 지원자님의 경험을 확인하고자 합니다. 특히 코드 리뷰와 지표 기반 의사결정을 중시하는 저희 팀에"
        request_live_text_turn = AsyncMock(
            side_effect=[
                (incomplete_text, None),
                (incomplete_text, None),
                (incomplete_text, None),
            ]
        )
        repair_ai_turn_if_truncated = AsyncMock(
            side_effect=[
                (incomplete_text, None),
                (incomplete_text, None),
                (incomplete_text, None),
            ]
        )
        deps = RuntimeExecutorDeps(
            request_live_text_turn=request_live_text_turn,
            repair_ai_turn_if_truncated=repair_ai_turn_if_truncated,
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=AsyncMock(return_value=AiDeliveryPlan()),
            persist_turn=AsyncMock(return_value={"id": "turn-1"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=send_transcript,
            stream_prepared_ai_delivery=AsyncMock(return_value=False),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=resume_listening,
            reconnect_remaining_sec=lambda state: 0,
            live_active_model=lambda state: "gemini-live",
            snapshot_vad_config=lambda state: {},
            build_memory_snapshot=lambda state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
            request_live_spoken_text_turn=AsyncMock(return_value=("", None, "gemini-live")),
        )

        generated = await execute_opening_live_turn(
            object(),
            state,
            spec=OpeningTurnSpec(
                turn_id="session-4:1",
                prompt="면접을 시작하세요.",
                question_type="motivation_validation",
                phase="introduction",
                question_index=1,
                target_duration_sec=600,
                closing_threshold_sec=60,
                elapsed_sec=0,
                remaining_sec=600,
                estimated_total_questions=6,
            ),
            deps=deps,
        )

        self.assertFalse(generated)
        request_live_text_turn.assert_not_awaited()
        repair_ai_turn_if_truncated.assert_not_awaited()
        send_transcript.assert_not_awaited()


class OpeningTextTests(unittest.TestCase):
    def test_build_opening_turn_text_uses_multiple_safe_variants(self) -> None:
        texts = {
            build_opening_turn_text(
                session_type="live_interview",
                company="Dibut",
                role="서비스 백엔드 개발자",
                job_data={"techStack": ["WebSocket", "Redis"]},
                resume_data={"skills": ["Kafka", "Spring Boot"]},
                seed_text=f"session-{index}",
            )
            for index in range(8)
        }

        self.assertGreaterEqual(len(texts), 2)
        for text in texts:
            self.assertTrue(text.startswith("안녕하세요."))
            self.assertTrue(text.endswith("?"))

    def test_build_opening_turn_text_can_reference_focus_term(self) -> None:
        text = build_opening_turn_text(
            session_type="live_interview",
            company="Dibut",
            role="서비스 백엔드 개발자",
            job_data={"techStack": ["WebSocket"]},
            seed_text="session-focus",
        )

        self.assertIn("서비스 백엔드 개발자", text)


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

    async def test_handle_session_init_returns_error_when_opening_generation_fails_twice(self) -> None:
        state = VoiceWsState()
        send_json_mock = AsyncMock(return_value=True)
        send_avatar_state_mock = AsyncMock(return_value=True)
        opening_mock = AsyncMock(side_effect=[False, False])
        session = {
            "id": "session-1",
            "session_type": "live_interview",
            "status": "created",
            "target_duration_sec": 420,
            "closing_threshold_sec": 60,
            "job_payload": {"company": "Dibut", "role": "백엔드 개발자"},
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

        payloads = [call.args[1] for call in send_json_mock.await_args_list if len(call.args) >= 2]
        self.assertTrue(any(payload.get("type") == "error" for payload in payloads))
        self.assertEqual(opening_mock.await_count, 2)


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
            await asyncio.sleep(0)

        request_live_audio_turn.assert_awaited_once()
        followup_mock.assert_awaited_once()
        persist_turn.assert_awaited_once()
        self.assertEqual(persist_turn.await_args.kwargs["role"], "user")
        set_runtime_status_mock.assert_any_await("session-1", "model_thinking", "technical")
        send_transcript_mock.assert_awaited_once()
        self.assertFalse(state.processing_audio)

    async def test_process_user_utterance_replans_followup_with_final_user_text(self) -> None:
        state = VoiceWsState(session_id="session-2", current_phase="technical")
        state.realtime_user_transcript = ""
        state.live_interview = _DummyLiveSession(model="gemini-live-2.5-flash-live", enabled=True)

        final_user_text = "Redis 캐시 TTL과 Kafka 재처리 전략을 조정해 p95 응답 시간을 180ms에서 95ms로 줄였습니다."
        request_live_audio_turn = AsyncMock(
            return_value=(final_user_text, "그 경험을 설명해 주세요.", object(), "gemini-live")
        )
        persist_turn = AsyncMock(return_value={"id": "turn-1"})
        followup_mock = AsyncMock(return_value=True)

        deps = _session_engine_deps(
            request_live_audio_turn=request_live_audio_turn,
            persist_turn=persist_turn,
            send_json=AsyncMock(return_value=True),
            send_avatar_state=AsyncMock(return_value=True),
            send_runtime_meta_snapshot=AsyncMock(return_value=True),
            set_runtime_status=AsyncMock(return_value=None),
            send_transcript=AsyncMock(return_value=True),
            get_or_create_live_interview=lambda current_state: current_state.live_interview,
            build_answer_quality_hint=lambda text: f"근거 확인: {text}",
            derive_question_type_preference=lambda _state, answer_text, _is_closing=False: (
                "design_decision" if "redis" in answer_text.lower() else "metric_validation"
            ),
            select_next_question_type=lambda _state, preferred=None: preferred or "tradeoff",
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
                vad_meta={"reason": "short_utterance_silence"},
                runtime_mode_disabled="disabled",
                closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            )

        followup_request = followup_mock.await_args.kwargs["user_request"]
        self.assertEqual(followup_request.prompt_user_text, sanitize_user_turn_text(final_user_text))
        self.assertEqual(followup_request.planned_question_type, "design_decision")
        self.assertIn("근거", followup_request.answer_quality_hint)

    async def test_process_user_utterance_does_not_use_legacy_fallback_stt(self) -> None:
        state = VoiceWsState(session_id="session-2b", current_phase="technical")
        state.realtime_user_transcript = "웹소켓을 선택했습니다"
        state.live_interview = _DummyLiveSession(model="gemini-live-2.5-flash-live", enabled=True)

        request_live_audio_turn = AsyncMock(
            return_value=("웹소켓", "그 비교 기준을 조금 더 설명해 주세요.", object(), "gemini-live")
        )
        persist_turn = AsyncMock(return_value={"id": "turn-1"})
        followup_mock = AsyncMock(return_value=True)
        fallback_transcribe = AsyncMock(
            return_value=(
                "HTTP 폴링은 요청 반복으로 비용이 컸고 SSE는 단방향이라, 지연과 연결 유지 효율을 비교한 뒤 WebSocket을 선택했습니다.",
                "gemini-live-stt",
            )
        )

        deps = _session_engine_deps(
            request_live_audio_turn=request_live_audio_turn,
            fallback_transcribe_user_audio=fallback_transcribe,
            persist_turn=persist_turn,
            send_json=AsyncMock(return_value=True),
            send_avatar_state=AsyncMock(return_value=True),
            send_runtime_meta_snapshot=AsyncMock(return_value=True),
            set_runtime_status=AsyncMock(return_value=None),
            send_transcript=AsyncMock(return_value=True),
            get_or_create_live_interview=lambda current_state: current_state.live_interview,
            estimate_wav_duration_ms=lambda _wav_bytes: 4200.0,
            build_answer_quality_hint=lambda text: f"근거 확인: {text}",
            derive_question_type_preference=lambda *_args, **_kwargs: "tradeoff",
            select_next_question_type=lambda _state, preferred=None: preferred or "tradeoff",
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
            await asyncio.sleep(0)

        self.assertEqual(persist_turn.await_args.kwargs["content"], sanitize_user_turn_text("웹소켓을 선택했습니다"))
        followup_request = followup_mock.await_args.kwargs["user_request"]
        self.assertEqual(followup_request.prompt_user_text, sanitize_user_turn_text("웹소켓을 선택했습니다"))
        fallback_transcribe.assert_not_awaited()

    async def test_process_user_utterance_reopens_mic_for_empty_stt_without_retry_prompt(self) -> None:
        state = VoiceWsState(session_id="session-retry", current_phase="technical")
        state.active_question_turn_id = "session-retry:1"
        state.live_interview = _DummyLiveSession(model="gemini-live-2.5-flash-live", enabled=True)

        runtime_executor_deps = RuntimeExecutorDeps(
            request_live_text_turn=AsyncMock(return_value=("마지막 문장부터 한 번만 더 말씀해 주세요.", None)),
            repair_ai_turn_if_truncated=AsyncMock(return_value=("마지막 문장부터 한 번만 더 말씀해 주세요.", None)),
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=AsyncMock(return_value=AiDeliveryPlan()),
            persist_turn=AsyncMock(return_value={"id": "turn-retry"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=AsyncMock(return_value=True),
            stream_prepared_ai_delivery=AsyncMock(return_value=True),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=AsyncMock(return_value=None),
            reconnect_remaining_sec=lambda current_state: 0,
            live_active_model=lambda current_state: "gemini-live",
            snapshot_vad_config=lambda current_state: {},
            build_memory_snapshot=lambda current_state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
        )

        resume_listening = AsyncMock(return_value=None)
        deps = _session_engine_deps(
            request_live_audio_turn=AsyncMock(return_value=("", "", None, "gemini-live")),
            send_json=AsyncMock(return_value=True),
            send_avatar_state=AsyncMock(return_value=True),
            send_runtime_meta_snapshot=AsyncMock(return_value=True),
            set_runtime_status=AsyncMock(return_value=None),
            send_transcript=AsyncMock(return_value=True),
            get_or_create_live_interview=lambda current_state: current_state.live_interview,
            estimate_wav_duration_ms=lambda _wav_bytes: 2600.0,
            runtime_executor_deps=lambda: runtime_executor_deps,
            resume_listening=resume_listening,
        )

        await process_user_utterance(
            object(),
            state,
            b"wav-bytes",
            deps=deps,
            vad_meta={"reason": "silence"},
            runtime_mode_disabled="disabled",
            closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
        )

        runtime_executor_deps.request_live_text_turn.assert_not_awaited()
        resume_listening.assert_not_awaited()
        self.assertEqual(state.active_question_turn_id, "session-retry:1")
        self.assertEqual(state.current_question_retry_count, 0)

    async def test_process_user_utterance_requests_one_retry_for_brief_silent_turn(self) -> None:
        state = VoiceWsState(session_id="session-silent-retry", current_phase="technical")
        state.active_question_turn_id = "session-silent-retry:1"
        state.live_interview = _DummyLiveSession(model="gemini-live-2.5-flash-live", enabled=True)

        send_json = AsyncMock(return_value=True)
        send_transcript = AsyncMock(return_value=True)
        resume_listening = AsyncMock(return_value=None)
        deps = _session_engine_deps(
            request_live_audio_turn=AsyncMock(return_value=("", "", None, "gemini-live")),
            send_json=send_json,
            send_avatar_state=AsyncMock(return_value=True),
            send_runtime_meta_snapshot=AsyncMock(return_value=True),
            set_runtime_status=AsyncMock(return_value=None),
            send_transcript=send_transcript,
            get_or_create_live_interview=lambda current_state: current_state.live_interview,
            estimate_wav_duration_ms=lambda _wav_bytes: 620.0,
            runtime_executor_deps=lambda: RuntimeExecutorDeps(
                request_live_text_turn=AsyncMock(return_value=("재질문", None)),
                repair_ai_turn_if_truncated=AsyncMock(return_value=("재질문", None)),
                looks_like_complete_ai_question=lambda text: True,
                build_ai_delivery_plan=AsyncMock(return_value=AiDeliveryPlan()),
                persist_turn=AsyncMock(return_value={"id": "turn-retry"}),
                set_runtime_status=AsyncMock(return_value=None),
                update_session_status=AsyncMock(return_value=None),
                set_closing_announced=AsyncMock(return_value=None),
                mark_session_status=lambda *args, **kwargs: None,
                log_runtime_event=lambda *args, **kwargs: None,
                send_json=send_json,
                send_transcript=send_transcript,
                stream_prepared_ai_delivery=AsyncMock(return_value=True),
                arm_playback_resume=lambda *args, **kwargs: None,
                resume_listening=resume_listening,
                reconnect_remaining_sec=lambda current_state: 0,
                live_active_model=lambda current_state: "gemini-live",
                snapshot_vad_config=lambda current_state: {},
                build_memory_snapshot=lambda current_state: "",
                remember_model_turn=lambda *args, **kwargs: None,
                record_question_type=lambda *args, **kwargs: None,
            ),
            resume_listening=resume_listening,
        )

        await process_user_utterance(
            object(),
            state,
            b"wav-bytes",
            deps=deps,
            vad_meta={"reason": "silence"},
            runtime_mode_disabled="disabled",
            closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
        )

        self.assertEqual(state.current_question_retry_count, 1)
        send_transcript.assert_awaited_once()
        self.assertIn("한 번만 더 말씀해 주세요", send_transcript.await_args.args[3])
        resume_listening.assert_awaited_once()

    async def test_process_user_utterance_keeps_flow_when_transcript_is_missing_but_live_followup_exists(self) -> None:
        state = VoiceWsState(session_id="session-missing-transcript", current_phase="technical")
        state.active_question_turn_id = "session-missing-transcript:1"
        state.live_interview = _DummyLiveSession(model="gemini-live-2.5-flash-live", enabled=True)

        persist_turn = AsyncMock(return_value={"id": "turn-user"})
        send_transcript = AsyncMock(return_value=True)
        resume_listening = AsyncMock(return_value=None)
        followup_mock = AsyncMock(return_value=True)
        runtime_executor_deps = RuntimeExecutorDeps(
            request_live_text_turn=AsyncMock(return_value=("다음 질문입니다.", None)),
            repair_ai_turn_if_truncated=AsyncMock(return_value=("다음 질문입니다.", None)),
            looks_like_complete_ai_question=lambda text: text.endswith("다.") or text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=AsyncMock(return_value=AiDeliveryPlan()),
            persist_turn=persist_turn,
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=send_transcript,
            stream_prepared_ai_delivery=AsyncMock(return_value=True),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=resume_listening,
            reconnect_remaining_sec=lambda current_state: 0,
            live_active_model=lambda current_state: "gemini-live",
            snapshot_vad_config=lambda current_state: {},
            build_memory_snapshot=lambda current_state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
        )
        deps = _session_engine_deps(
            request_live_audio_turn=AsyncMock(
                return_value=(
                    "",
                    "방금 말씀하신 웹소켓 선택 근거를 조금 더 구체적으로 설명해 주세요.",
                    PreparedTtsAudio(chunks=["audio"], sample_rate=24000, provider="gemini-live", duration_sec=1.1),
                    "gemini-live",
                )
            ),
            persist_turn=persist_turn,
            send_json=AsyncMock(return_value=True),
            send_avatar_state=AsyncMock(return_value=True),
            send_runtime_meta_snapshot=AsyncMock(return_value=True),
            set_runtime_status=AsyncMock(return_value=None),
            send_transcript=send_transcript,
            get_or_create_live_interview=lambda current_state: current_state.live_interview,
            estimate_wav_duration_ms=lambda _wav_bytes: 2200.0,
            runtime_executor_deps=lambda: runtime_executor_deps,
            resume_listening=resume_listening,
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
            await asyncio.sleep(0)

        resume_listening.assert_not_awaited()
        send_transcript.assert_not_awaited()
        self.assertEqual(persist_turn.await_args.kwargs["content"], "음성 답변(전사 누락)")
        payload = persist_turn.await_args.kwargs["payload"]
        self.assertTrue(payload["transcription_missing"])
        followup_mock.assert_awaited_once()

    async def test_process_user_utterance_does_not_issue_capture_retry_after_valid_user_text(self) -> None:
        state = VoiceWsState(session_id="session-followup-fail", current_phase="technical")
        state.active_question_turn_id = "session-followup-fail:1"
        state.live_interview = _DummyLiveSession(model="gemini-live-2.5-flash-live", enabled=True)

        runtime_executor_deps = RuntimeExecutorDeps(
            request_live_text_turn=AsyncMock(return_value=("마지막 문장부터 한 번만 더 말씀해 주세요.", None)),
            repair_ai_turn_if_truncated=AsyncMock(return_value=("마지막 문장부터 한 번만 더 말씀해 주세요.", None)),
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=AsyncMock(return_value=AiDeliveryPlan()),
            persist_turn=AsyncMock(return_value={"id": "turn-retry"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=AsyncMock(return_value=True),
            stream_prepared_ai_delivery=AsyncMock(return_value=False),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=AsyncMock(return_value=None),
            reconnect_remaining_sec=lambda current_state: 0,
            live_active_model=lambda current_state: "gemini-live",
            snapshot_vad_config=lambda current_state: {},
            build_memory_snapshot=lambda current_state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
        )
        deps = _session_engine_deps(
            request_live_audio_turn=AsyncMock(
                return_value=("웹소켓으로 실시간 양방향 통신을 구성했습니다.", "", None, "gemini-live")
            ),
            send_json=AsyncMock(return_value=True),
            send_avatar_state=AsyncMock(return_value=True),
            send_runtime_meta_snapshot=AsyncMock(return_value=True),
            set_runtime_status=AsyncMock(return_value=None),
            send_transcript=AsyncMock(return_value=True),
            get_or_create_live_interview=lambda current_state: current_state.live_interview,
            estimate_wav_duration_ms=lambda _wav_bytes: 3200.0,
            runtime_executor_deps=lambda: runtime_executor_deps,
            resume_listening=AsyncMock(return_value=None),
        )

        with patch(
            "app.interview.runtime.session_engine.execute_live_user_followup_turn",
            new=AsyncMock(return_value=False),
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

        runtime_executor_deps.request_live_text_turn.assert_not_awaited()
        self.assertEqual(state.current_question_retry_count, 0)

    async def test_process_user_utterance_reopens_mic_when_echo_is_detected(self) -> None:
        state = VoiceWsState(session_id="session-retry-budget", current_phase="technical")
        state.active_question_turn_id = "session-retry-budget:1"
        state.live_interview = _DummyLiveSession(model="gemini-live-2.5-flash-live", enabled=True)

        runtime_executor_deps = RuntimeExecutorDeps(
            request_live_text_turn=AsyncMock(return_value=("마지막 문장부터 한 번만 더 말씀해 주세요.", None)),
            repair_ai_turn_if_truncated=AsyncMock(return_value=("마지막 문장부터 한 번만 더 말씀해 주세요.", None)),
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=AsyncMock(return_value=AiDeliveryPlan()),
            persist_turn=AsyncMock(return_value={"id": "turn-retry"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=AsyncMock(return_value=True),
            stream_prepared_ai_delivery=AsyncMock(return_value=False),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=AsyncMock(return_value=None),
            reconnect_remaining_sec=lambda current_state: 0,
            live_active_model=lambda current_state: "gemini-live",
            snapshot_vad_config=lambda current_state: {},
            build_memory_snapshot=lambda current_state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
        )

        resume_listening = AsyncMock(return_value=None)
        deps = _session_engine_deps(
            request_live_audio_turn=AsyncMock(return_value=("지원 동기를 말씀해 주세요", "", None, "gemini-live")),
            send_json=AsyncMock(return_value=True),
            send_avatar_state=AsyncMock(return_value=True),
            send_runtime_meta_snapshot=AsyncMock(return_value=True),
            set_runtime_status=AsyncMock(return_value=None),
            send_transcript=AsyncMock(return_value=True),
            get_or_create_live_interview=lambda current_state: current_state.live_interview,
            estimate_wav_duration_ms=lambda _wav_bytes: 2600.0,
            runtime_executor_deps=lambda: runtime_executor_deps,
            resume_listening=resume_listening,
            is_probable_ai_echo=lambda *_args, **_kwargs: True,
        )

        await process_user_utterance(
            object(),
            state,
            b"wav-bytes",
            deps=deps,
            vad_meta={"reason": "silence"},
            runtime_mode_disabled="disabled",
            closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
        )

        runtime_executor_deps.request_live_text_turn.assert_not_awaited()
        resume_listening.assert_awaited_once()

    async def test_enqueue_user_segment_waits_briefly_after_vad_finalization(self) -> None:
        state = VoiceWsState(session_id="session-3")
        state.turn_end_grace_sec = 0.05
        process_mock = AsyncMock(return_value=None)
        deps = _session_engine_deps()

        with patch(
            "app.interview.runtime.session_engine.process_user_utterance",
            new=process_mock,
        ):
            await enqueue_user_segment(
                object(),
                state,
                b"segment-bytes",
                deps=deps,
                vad_meta={"reason": "silence", "duration_ms": 1200.0},
                flush_now=False,
                runtime_mode_disabled="disabled",
                closing_sentence="수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.",
            )

            process_mock.assert_not_awaited()
            self.assertEqual(len(state.pending_user_segments), 1)
            await asyncio.sleep(0.32)

        process_mock.assert_awaited_once()
        self.assertEqual(state.pending_user_segments, [])

    async def test_resumed_speech_cancels_pending_segment_drain(self) -> None:
        state = VoiceWsState(session_id="session-4")
        state.pending_user_segments.append(PendingUserSegment(audio=b"segment-1", vad={"reason": "silence"}))
        pending_task = asyncio.create_task(asyncio.sleep(5))
        state.pending_user_segment_task = pending_task

        deps = ClientMessageRouterDeps(
            send_json=AsyncMock(return_value=True),
            send_avatar_state=AsyncMock(return_value=True),
            handle_session_init=AsyncMock(return_value=None),
            coerce_audio_chunk=lambda payload: [float(value) for value in payload],
            enqueue_user_segment=AsyncMock(return_value=None),
            reset_realtime_user_transcript=lambda current_state: setattr(
                current_state,
                "realtime_user_transcript",
                "",
            ),
            resume_listening=AsyncMock(return_value=None),
            cancel_playback_resume_task=lambda current_state: None,
        )

        await handle_client_message(
            object(),
            state,
            {
                "type": "raw-audio-data",
                "audio": [0.4] * 4096,
            },
            deps=deps,
        )
        await asyncio.sleep(0)

        self.assertIsNone(state.pending_user_segment_task)
        self.assertEqual(state.pending_segment_resume_ms, 0.0)
        self.assertTrue(pending_task.cancelled())


class LiveFollowupGroundingTests(unittest.IsolatedAsyncioTestCase):
    async def test_execute_live_user_followup_turn_keeps_live_question_without_extra_regeneration(self) -> None:
        state = VoiceWsState(session_id="session-1", current_phase="technical")
        prepared_audio = PreparedTtsAudio(
            chunks=["chunk"],
            sample_rate=24000,
            provider="gemini-live",
            duration_sec=1.2,
        )
        delivery_plan = AiDeliveryPlan(
            segments=[
                PreparedDeliverySegment(
                    text="방금 말씀하신 redis 캐시 ttl과 관련해, p95 응답 시간을 어떤 지표로 검증하셨는지 구체적으로 말씀해 주세요.",
                    prepared_audio=prepared_audio,
                )
            ],
            mode="full",
            provider="gemini-live",
        )
        request_live_text_turn = AsyncMock(
            return_value=(
                "방금 말씀하신 redis 캐시 ttl과 관련해, p95 응답 시간을 어떤 지표로 검증하셨는지 구체적으로 말씀해 주세요.",
                prepared_audio,
            )
        )
        async def _repair_ai_turn(_state, *, ai_text, prepared_tts):
            return ai_text, prepared_tts

        send_transcript = AsyncMock(return_value=True)
        deps = RuntimeExecutorDeps(
            request_live_text_turn=request_live_text_turn,
            repair_ai_turn_if_truncated=AsyncMock(side_effect=_repair_ai_turn),
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=AsyncMock(return_value=delivery_plan),
            persist_turn=AsyncMock(return_value={"id": "turn-1"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=send_transcript,
            stream_prepared_ai_delivery=AsyncMock(return_value=True),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=AsyncMock(return_value=None),
            reconnect_remaining_sec=lambda current_state: 0,
            live_active_model=lambda current_state: "gemini-live",
            snapshot_vad_config=lambda current_state: {},
            build_memory_snapshot=lambda current_state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
        )

        generated = await execute_live_user_followup_turn(
            object(),
            state,
            spec=LiveUserFollowupSpec(
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
            user_request=prepare_live_user_request(
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
                build_answer_quality_hint=lambda text: f"근거 확인: {text}",
                derive_question_type_preference=lambda *args, **kwargs: "metric_validation",
                select_next_question_type=lambda _state, preferred=None: preferred or "metric_validation",
                prompt_user_text="Redis 캐시 TTL과 Kafka 재처리 전략을 조정해 p95 응답 시간을 180ms에서 95ms로 줄였습니다.",
            ),
            next_turn_id="session-1:2",
            live_ai_text="다음으로 협업 경험을 말씀해 주세요.",
            prepared_live_audio=prepared_audio,
            provider_name="gemini-live",
            active_live_provider="gemini-live",
            utterance_duration_ms=2400.0,
            vad_meta={"reason": "speech_end"},
            started_at=0.0,
            deps=deps,
        )

        self.assertTrue(generated)
        request_live_text_turn.assert_not_awaited()
        self.assertIn("redis", send_transcript.await_args.args[3].lower())
        self.assertIn("p95", send_transcript.await_args.args[3].lower())

    async def test_execute_live_user_followup_turn_falls_back_for_empty_closing_turn(self) -> None:
        state = VoiceWsState(session_id="session-closing", current_phase="closing")
        send_transcript = AsyncMock(return_value=True)
        update_session_status = AsyncMock(return_value=None)
        send_json = AsyncMock(return_value=True)
        deps = RuntimeExecutorDeps(
            request_live_text_turn=AsyncMock(return_value=("", None)),
            repair_ai_turn_if_truncated=AsyncMock(side_effect=lambda *_args, **_kwargs: ("", None)),
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("니다."),
            build_ai_delivery_plan=AsyncMock(return_value=AiDeliveryPlan(mode="text-only", provider="")),
            persist_turn=AsyncMock(return_value={"id": "turn-closing"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=update_session_status,
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda current_state, status, *, phase=None: setattr(current_state, "session_status", status),
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=send_json,
            send_transcript=send_transcript,
            stream_prepared_ai_delivery=AsyncMock(return_value=False),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=AsyncMock(return_value=None),
            reconnect_remaining_sec=lambda current_state: 0,
            live_active_model=lambda current_state: "gemini-live",
            snapshot_vad_config=lambda current_state: {},
            build_memory_snapshot=lambda current_state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
        )

        generated = await execute_live_user_followup_turn(
            object(),
            state,
            spec=LiveUserFollowupSpec(
                model_count=8,
                target_duration_sec=600,
                closing_threshold_sec=60,
                elapsed_sec=600,
                remaining_sec=0,
                estimated_total_questions=8,
                completion_reason="closing_answer_submitted",
                question_index=0,
                should_announce_closing=False,
                phase="closing",
                response_question_index=8,
            ),
            user_request=LiveUserRequestSpec(
                prompt_user_text="WebSocket을 선택한 이유를 설명드렸습니다.",
                answer_quality_hint="근거 확인",
                planned_question_type="",
                extra_instruction=(
                    "이번 턴은 질문 없이 면접을 종료하는 턴입니다. "
                    "마지막 문장은 반드시 '수고하셨습니다. 이것으로 모든 면접을 마치겠습니다.' 문장 그대로 사용하세요."
                ),
            ),
            next_turn_id="session-closing:9",
            live_ai_text="",
            prepared_live_audio=None,
            provider_name="gemini-live",
            active_live_provider="gemini-live",
            utterance_duration_ms=3200.0,
            vad_meta={"reason": "silence"},
            started_at=0.0,
            deps=deps,
        )

        self.assertTrue(generated)
        update_session_status.assert_awaited_once_with("session-closing", "completed", "closing")
        send_transcript.assert_awaited_once()
        self.assertIn("이것으로 모든 면접을 마치겠습니다.", send_transcript.await_args.args[3])

    async def test_execute_live_user_followup_turn_falls_back_to_grounded_question_when_ai_text_is_empty(self) -> None:
        state = VoiceWsState(session_id="session-empty-followup", current_phase="technical")
        send_transcript = AsyncMock(return_value=True)
        resume_listening = AsyncMock(return_value=None)
        prepared_audio = PreparedTtsAudio(
            chunks=["audio"],
            sample_rate=24000,
            provider="gemini-live",
            duration_sec=1.0,
        )
        deps = RuntimeExecutorDeps(
            request_live_text_turn=AsyncMock(return_value=("", None)),
            repair_ai_turn_if_truncated=AsyncMock(side_effect=lambda *_args, **_kwargs: ("", None)),
            looks_like_complete_ai_question=lambda text: text.endswith("요.") or text.endswith("주세요."),
            build_ai_delivery_plan=AsyncMock(
                return_value=AiDeliveryPlan(
                    segments=[
                        PreparedDeliverySegment(
                            text="방금 말씀하신 'redis'과 관련해, 어떤 수치나 지표로 성과를 검증하셨는지 구체적으로 말씀해 주세요.",
                            prepared_audio=prepared_audio,
                        )
                    ],
                    mode="full",
                    provider="gemini-live",
                )
            ),
            persist_turn=AsyncMock(return_value={"id": "turn-followup"}),
            set_runtime_status=AsyncMock(return_value=None),
            update_session_status=AsyncMock(return_value=None),
            set_closing_announced=AsyncMock(return_value=None),
            mark_session_status=lambda *args, **kwargs: None,
            log_runtime_event=lambda *args, **kwargs: None,
            send_json=AsyncMock(return_value=True),
            send_transcript=send_transcript,
            stream_prepared_ai_delivery=AsyncMock(return_value=True),
            arm_playback_resume=lambda *args, **kwargs: None,
            resume_listening=resume_listening,
            reconnect_remaining_sec=lambda current_state: 0,
            live_active_model=lambda current_state: "gemini-live",
            snapshot_vad_config=lambda current_state: {},
            build_memory_snapshot=lambda current_state: "",
            remember_model_turn=lambda *args, **kwargs: None,
            record_question_type=lambda *args, **kwargs: None,
            request_live_spoken_text_turn=AsyncMock(
                return_value=(
                    "",
                    prepared_audio,
                    "gemini-live",
                )
            ),
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
                question_index=2,
                should_announce_closing=False,
                phase="technical",
                response_question_index=2,
            ),
            user_request=LiveUserRequestSpec(
                prompt_user_text="Redis 캐시 TTL과 Kafka 재처리 전략을 조정해 p95 응답 시간을 180ms에서 95ms로 줄였습니다.",
                answer_quality_hint="근거 확인",
                planned_question_type="metric_validation",
                extra_instruction="지원자의 직전 답변을 바탕으로 자연스러운 후속 질문을 완성하세요.",
            ),
            next_turn_id="session-empty-followup:3",
            live_ai_text="",
            prepared_live_audio=None,
            provider_name="gemini-live",
            active_live_provider="gemini-live",
            utterance_duration_ms=2800.0,
            vad_meta={"reason": "silence"},
            started_at=0.0,
            deps=deps,
        )

        self.assertTrue(generated)
        self.assertIn("redis", send_transcript.await_args.args[3].lower())
        resume_listening.assert_not_awaited()


class AdaptiveVadTests(unittest.TestCase):
    def test_retune_vad_for_short_answer_tightens_cutoff(self) -> None:
        state = VoiceWsState()
        base_silence = state.vad.silence_ms
        base_short_silence = state.vad.short_utterance_silence_ms
        base_turn_end_grace = state.turn_end_grace_sec

        retune_vad_for_next_turn(state, utterance_duration_ms=1400.0, short_answer=True)

        self.assertLess(state.vad.silence_ms, base_silence)
        self.assertLess(state.vad.short_utterance_silence_ms, base_short_silence)
        self.assertLess(state.turn_end_grace_sec, base_turn_end_grace)
        self.assertEqual(state.short_reprompt_streak, 1)

    def test_retune_vad_for_long_answers_updates_recent_window(self) -> None:
        state = VoiceWsState()

        for duration_ms in (5200.0, 5400.0, 5600.0):
            retune_vad_for_next_turn(state, utterance_duration_ms=duration_ms, short_answer=False)

        self.assertEqual(state.short_reprompt_streak, 0)
        self.assertEqual(len(state.recent_user_durations_ms), 3)
        self.assertGreaterEqual(state.vad.silence_ms, 600)
        self.assertGreaterEqual(state.vad.short_utterance_silence_ms, 1080)
        self.assertGreaterEqual(state.turn_end_grace_sec, 0.1)


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
    def test_segmenter_requires_sustained_speech_before_starting(self) -> None:
        segmenter = VadSegmenter(
            sample_rate=1000,
            threshold=0.1,
            speech_start_ms=180,
            silence_ms=700,
            min_speech_ms=100,
            min_utterance_ms=800,
            short_utterance_silence_ms=1200,
            max_segment_ms=4000,
        )

        short_noise = [0.14] * 120
        trailing_silence = [0.0] * 900

        self.assertIsNone(segmenter.feed(short_noise))
        self.assertIsNone(segmenter.feed(trailing_silence))
        self.assertEqual(segmenter.last_segment_info, {})

    def test_segmenter_marks_short_utterance_silence_reason(self) -> None:
        segmenter = VadSegmenter(
            sample_rate=1000,
            threshold=0.1,
            speech_start_ms=180,
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

    def test_segmenter_waits_for_longer_pause_on_long_answer(self) -> None:
        segmenter = VadSegmenter(
            sample_rate=1000,
            threshold=0.1,
            speech_start_ms=180,
            silence_ms=700,
            min_speech_ms=100,
            min_utterance_ms=800,
            short_utterance_silence_ms=1200,
            max_segment_ms=12000,
        )

        long_speech = [0.4] * 4200
        medium_pause = [0.0] * 720
        extra_pause = [0.0] * 120

        self.assertIsNone(segmenter.feed(long_speech))
        self.assertIsNone(segmenter.feed(medium_pause))
        payload = segmenter.feed(extra_pause)

        self.assertIsNotNone(payload)
        assert payload is not None
        self.assertEqual(segmenter.last_segment_info["reason"], "silence")


class AiEchoGuardTests(unittest.TestCase):
    def test_short_unrelated_user_answer_is_not_suppressed_as_echo(self) -> None:
        state = VoiceWsState()
        state.last_ai_tts_text = "안녕하세요. 지원 동기를 말씀해 주세요."

        self.assertFalse(
            is_probable_ai_echo(
                state,
                "네 가능합니다",
                b"\x00" * 16000,
                normalize_compare_text=lambda text: "".join(str(text).split()).lower(),
                estimate_wav_duration_ms=lambda wav_bytes: 900.0,
                voice_min_answer_chars=10,
            )
        )

    def test_long_answer_is_not_suppressed_even_if_it_starts_with_prompt_words(self) -> None:
        state = VoiceWsState()
        state.last_ai_tts_text = "지원 동기를 말씀해 주세요."

        self.assertFalse(
            is_probable_ai_echo(
                state,
                "지원 동기를 말씀해 주세요 그리고 실제로는 웹소켓 지연을 줄인 프로젝트 경험이 있어서 지원했습니다",
                b"\x00" * 64000,
                normalize_compare_text=lambda text: "".join(str(text).split()).lower(),
                estimate_wav_duration_ms=lambda wav_bytes: 4200.0,
                voice_min_answer_chars=10,
            )
        )


class LiveClientRepairTests(unittest.IsolatedAsyncioTestCase):
    async def test_request_live_text_turn_reuses_persistent_live_session(self) -> None:
        class _InspectableLiveSession(_DummyLiveSession):
            def __init__(self) -> None:
                super().__init__()
                self.request_text_turn = AsyncMock(
                    return_value=types.SimpleNamespace(
                        ai_text="안녕하세요. 지원 동기를 말씀해 주세요.",
                        audio_pcm_bytes=b"\x00\x01",
                        sample_rate=24000,
                        provider="gemini-live-single",
                    )
                )
                self.close = AsyncMock(return_value=None)

        live = _InspectableLiveSession()
        state = VoiceWsState(session_id="session-live-text", live_interview=live)
        deps = LiveClientDeps(
            create_live_interview_session=lambda: _InspectableLiveSession(),
            build_session_instruction=lambda current_state: f"session:{current_state.session_id}",
            build_turn_prompt=lambda *args, **kwargs: "prompt",
            to_prepared_tts_audio_from_pcm=lambda pcm_bytes, *, sample_rate, provider: PreparedTtsAudio(
                chunks=["chunk"],
                sample_rate=sample_rate,
                provider=provider,
                duration_sec=0.4,
            ),
            sanitize_ai_turn_text=lambda text: text,
            looks_like_complete_ai_question=lambda text: True,
        )

        ai_text, prepared_audio = await request_live_text_turn(
            state,
            text="첫 질문",
            question_type="motivation_validation",
            deps=deps,
        )

        self.assertEqual(ai_text, "안녕하세요. 지원 동기를 말씀해 주세요.")
        self.assertIsNotNone(prepared_audio)
        live.request_text_turn.assert_awaited_once()
        live.close.assert_not_awaited()

    async def test_repair_keeps_live_audio_when_only_spacing_changes(self) -> None:
        prepared_audio = PreparedTtsAudio(
            chunks=["chunk"],
            sample_rate=24000,
            provider="gemini-live-single",
            duration_sec=1.0,
        )
        deps = LiveClientDeps(
            create_live_interview_session=lambda: _DummyLiveSession(),
            build_session_instruction=lambda state: "",
            build_turn_prompt=lambda *args, **kwargs: "",
            to_prepared_tts_audio_from_pcm=lambda *args, **kwargs: None,
            sanitize_ai_turn_text=lambda text: "안녕하세요. 지원 동기를 말씀해 주세요.",
            looks_like_complete_ai_question=lambda text: True,
        )

        repaired_text, repaired_audio = await repair_ai_turn_if_truncated(
            ai_text="안녕하세요.지원 동기를 말씀해 주세요.",
            prepared_tts=prepared_audio,
            deps=deps,
        )

        self.assertEqual(repaired_text, "안녕하세요. 지원 동기를 말씀해 주세요.")
        self.assertIs(repaired_audio, prepared_audio)


class TranscriptSpacingTests(unittest.TestCase):
    def test_sanitize_user_turn_text_recovers_fragmented_dense_text(self) -> None:
        sanitized = sanitize_user_turn_text(
            "세션별상태를가 볍게 유지 하고 이벤트 처리 비동기로분했으며서버인 스턴 나눠연결을산 시키 는방식 으로 병목줄여수십명접속황 에서 도과끊김없안정 적으로 운 영했습니다."
        )

        self.assertIn("세션별 상태를 가볍게 유지하고", sanitized)
        self.assertIn("병목 줄여", sanitized)


if __name__ == "__main__":
    unittest.main()
