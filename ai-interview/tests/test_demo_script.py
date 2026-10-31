from __future__ import annotations

import asyncio
import itertools
import sys
import types
import unittest
import unittest.mock
from dataclasses import replace
from pathlib import Path
from unittest.mock import AsyncMock

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

_interview_stub = types.ModuleType("app.services.interview_service")


class _DummyInterviewService:
    def __init__(self, *args, **kwargs) -> None:
        pass


_interview_stub.InterviewService = _DummyInterviewService

_gemini_stub = types.ModuleType("app.services.llm_gemini")


class _DummyGeminiService:
    pass


_gemini_stub.GeminiService = _DummyGeminiService

# 다른 테스트 모듈과 같은 방식으로 stub 을 import 시점에만 쓰고 sys.modules 를 원상 복구한다.
_STUBBED_MODULES = {
    "app.services.gemini_live_voice_service": _live_stub,
    "app.services.interview_service": _interview_stub,
    "app.services.llm_gemini": _gemini_stub,
}
_ORIGINAL_MODULES = {name: sys.modules.get(name) for name in _STUBBED_MODULES}
_MODULES_BEFORE_STUB_IMPORTS = set(sys.modules)
sys.modules.update(_STUBBED_MODULES)
try:
    from app.interview.domain.demo_script import (
        CANDIDATE_ANSWERS,
        CLOSING_TEXT,
        DEMO_SCRIPT_COMPLETION_REASON,
        DEMO_SCRIPT_ID,
        OPENING,
        QUESTIONS,
        demo_script_line,
        is_demo_script_session,
    )
    from app.interview.reporting.agent import ReportAgent
    from app.interview.reporting.demo_report import (
        build_demo_nonverbal_summary,
        build_demo_report,
        build_demo_report_document,
    )
    from app.interview.reporting.document import build_report_document
    import app.interview.runtime.demo_script_opening_cache as opening_cache
    import app.interview.runtime.prepared_opening as prepared_opening
    from app.interview.runtime.demo_script_prefetch import (
        clear_demo_script_prefetch,
        schedule_demo_script_prefetch,
    )
    from app.interview.runtime.executor import RuntimeExecutorDeps
    from app.interview.runtime.live_client import (
        LiveClientDeps,
        build_live_session_instruction,
        request_live_scripted_speech_turn,
        request_live_spoken_text_turn,
        scripted_speech_coverage,
    )
    from app.interview.runtime.live_turns import (
        prepare_live_user_followup,
        prepare_live_user_request,
        prepare_opening_turn,
    )
    from app.interview.runtime.session_engine import SessionEngineDeps, handle_session_init, process_user_utterance
    from app.interview.runtime.state import AiDeliveryPlan, PreparedDeliverySegment, PreparedTtsAudio, VoiceWsState
    from app.interview.runtime.turn_entrypoints import generate_and_send_resume_live_turn
    from app.interview.transcript.runtime_cache import hydrate_state_from_turns
    from app.schemas.interview import AnalysisReport
finally:
    _STUB_SCOPED_APP_MODULES = {}
    for _name in set(sys.modules) - _MODULES_BEFORE_STUB_IMPORTS:
        if _name == "app" or _name.startswith("app."):
            _STUB_SCOPED_APP_MODULES[_name] = sys.modules.pop(_name)
    for _name, _original in _ORIGINAL_MODULES.items():
        if _original is not None:
            sys.modules[_name] = _original

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


CLOSING_SENTENCE = "수고하셨습니다. 이것으로 모든 면접을 마치겠습니다."
DEMO_JOB_DATA = {
    "company": "더즌(dozn)",
    "role": "백엔드 개발자 (개발본부) - 신입",
    "title": "백엔드 개발자 (개발본부) - 신입",
    "demoScript": DEMO_SCRIPT_ID,
}
AUDIO = PreparedTtsAudio(chunks=["chunk"], sample_rate=24000, provider="gemini-live", duration_sec=4.0)
_TURN_SEQ = itertools.count(1)


def _demo_state(**kwargs) -> VoiceWsState:
    state = VoiceWsState(session_id="demo-session", session_type="live_interview", job_data=dict(DEMO_JOB_DATA))
    state.live_interview = _DummyLiveSession(model="gemini-live")
    for key, value in kwargs.items():
        setattr(state, key, value)
    return state


def _delivery_plan(_ws, *, text, turn_id, preferred_full_audio=None):
    del turn_id
    return AiDeliveryPlan(
        segments=[PreparedDeliverySegment(text=text, prepared_audio=preferred_full_audio)],
        mode="live-audio" if preferred_full_audio is not None else "text-only",
        provider="gemini-live",
    )


class _Recorder:
    """executor/engine 이 보낸 자막·메타·저장 턴을 모은다."""

    def __init__(self) -> None:
        self.ai_transcripts: list[str] = []
        self.user_transcripts: list[str] = []
        self.persisted_model_turns: list[str] = []
        self.meta_events: list[dict] = []

    async def send_transcript(self, _ws, _session_id, role, text, **_kwargs) -> bool:
        if role == "ai":
            self.ai_transcripts.append(text)
        elif role == "user":
            self.user_transcripts.append(text)
        return True

    async def send_json(self, _ws, payload) -> bool:
        if payload.get("type") == "runtime.meta":
            self.meta_events.append(payload)
        return True

    async def persist_turn(self, _state, *, role, content, channel, payload):
        del channel, payload
        if role == "model":
            self.persisted_model_turns.append(content)
        return {"id": f"turn-{role}"}


def _executor_deps(recorder: _Recorder, *, spoken=None, rephrase=None) -> RuntimeExecutorDeps:
    return RuntimeExecutorDeps(
        request_live_spoken_text_turn=spoken
        # 라이브 모델의 출력 전사가 대본과 조금 달라도 자막/저장은 대본이어야 한다.
        or AsyncMock(side_effect=lambda _state, text, **_kwargs: (f"{text} 덧붙인 말", AUDIO, "gemini-live")),
        request_live_text_turn=rephrase or AsyncMock(return_value=("의역된 질문인가요?", AUDIO)),
        repair_ai_turn_if_truncated=AsyncMock(return_value=("", None)),
        looks_like_complete_ai_question=lambda text: True,
        build_ai_delivery_plan=AsyncMock(side_effect=_delivery_plan),
        persist_turn=recorder.persist_turn,
        set_runtime_status=AsyncMock(return_value=None),
        update_session_status=AsyncMock(return_value=None),
        set_closing_announced=AsyncMock(return_value=None),
        mark_session_status=lambda state, status, phase=None: setattr(state, "session_status", status),
        log_runtime_event=lambda *args, **kwargs: None,
        send_json=recorder.send_json,
        send_transcript=recorder.send_transcript,
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


def _engine_deps(
    recorder: _Recorder,
    executor_deps: RuntimeExecutorDeps,
    *,
    stt_text: str = "지원자가 대본과 다른 말을 했습니다.",
    duration_ms: float = 2600.0,
    is_echo: bool = False,
    runtime_architecture: str = "hybrid",
    request_live_generated_question_turn=None,
    prefetch_scripted_line_audio=None,
    transcribe_user_audio=None,
) -> SessionEngineDeps:
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
        send_prepared_opening_live_turn=AsyncMock(return_value=True),
        consume_prepared_opening=lambda session_id: None,
        send_json=recorder.send_json,
        send_avatar_state=AsyncMock(return_value=True),
        send_runtime_meta_snapshot=AsyncMock(return_value=True),
        live_active_model=lambda state: "gemini-live",
        set_runtime_mode=AsyncMock(return_value=None),
        set_runtime_status=AsyncMock(return_value=None),
        get_or_create_live_interview=lambda state: state.live_interview,
        build_answer_quality_hint=lambda text: f"hint:{text}",
        derive_question_type_preference=lambda *args, **kwargs: "metric_validation",
        select_next_question_type=lambda _state, preferred=None: preferred or "tradeoff",
        request_live_audio_turn=AsyncMock(return_value=("", "", None, "gemini-live")),
        request_live_generated_question_turn=request_live_generated_question_turn,
        fallback_transcribe_user_audio=None,
        transcribe_user_audio=transcribe_user_audio or AsyncMock(return_value=(stt_text, "stt")),
        emit_realtime_user_delta=AsyncMock(return_value=None),
        is_probable_ai_echo=lambda *_args, **_kwargs: is_echo,
        reset_realtime_user_transcript=lambda state: setattr(state, "realtime_user_transcript", ""),
        remember_user_turn=lambda state, text: None,
        persist_turn=recorder.persist_turn,
        send_transcript=recorder.send_transcript,
        log_runtime_event=lambda *args, **kwargs: None,
        is_short_stt_result=lambda text, wav_bytes: False,
        retune_vad_for_next_turn=lambda *args, **kwargs: None,
        # 목표 시간을 한참 넘긴 상태 — 고정 대본은 시간으로 끝나면 안 된다.
        runtime_timing=lambda state: (5000, 0),
        runtime_executor_deps=lambda: executor_deps,
        estimate_wav_duration_ms=lambda wav_bytes: duration_ms,
        snapshot_vad_config=lambda state: {},
        build_memory_snapshot=lambda state: "",
        merge_wav_segments=lambda segments: b"".join(segments),
        merge_vad_events=lambda events: events[-1] if events else {},
        resume_listening=AsyncMock(return_value=None),
        next_ai_turn_id=lambda session_id: f"{session_id}:{next(_TURN_SEQ)}",
        finalize_parallel_stt_stream=AsyncMock(return_value=True),
        runtime_architecture=runtime_architecture,
        update_turn_content=AsyncMock(return_value={"id": "turn-user"}),
        prefetch_scripted_line_audio=prefetch_scripted_line_audio,
    )


async def _answer(state: VoiceWsState, deps: SessionEngineDeps) -> None:
    await process_user_utterance(
        object(),
        state,
        b"wav-bytes",
        deps=deps,
        runtime_mode_disabled="disabled",
        closing_sentence=CLOSING_SENTENCE,
    )


class DemoScriptDomainTests(unittest.TestCase):
    def test_detects_demo_session_by_flag_or_company(self) -> None:
        self.assertTrue(is_demo_script_session({"demoScript": DEMO_SCRIPT_ID}))
        self.assertTrue(is_demo_script_session({"company": "더즌"}))
        self.assertTrue(is_demo_script_session({"company": "DOZN Inc."}))
        self.assertFalse(is_demo_script_session({"company": "네이버"}))
        self.assertFalse(is_demo_script_session(None))
        self.assertFalse(is_demo_script_session({"company": "더즌(dozn)"}, "portfolio_defense"))

    def test_script_shape_matches_candidate_answers(self) -> None:
        # 오프닝 + 대본 줄마다 지원자 답변이 정확히 하나씩 있다.
        self.assertEqual(len(CANDIDATE_ANSWERS), len(QUESTIONS) + 1)
        self.assertEqual(demo_script_line(0), (QUESTIONS[0], False))
        self.assertEqual(demo_script_line(len(QUESTIONS)), (CLOSING_TEXT, True))
        self.assertEqual(demo_script_line(len(QUESTIONS) + 5), (CLOSING_TEXT, True))

    def test_hydrate_restores_cursor_from_persisted_model_turns(self) -> None:
        state = _demo_state()
        turns = [{"role": "model", "content": OPENING}, {"role": "user", "content": "자기소개"}]
        for index in range(3):
            turns.append({"role": "model", "content": QUESTIONS[index]})
            turns.append({"role": "user", "content": "답변"})
        hydrate_state_from_turns(
            state,
            turns,
            record_question_type=lambda *args: None,
            remember_model_turn=lambda *args, **kwargs: None,
            remember_user_turn=lambda *args: None,
            build_answer_quality_hint=lambda text: "",
        )
        self.assertEqual(state.demo_script_cursor, 3)


class DemoScriptPlanningTests(unittest.TestCase):
    def test_opening_uses_script(self) -> None:
        spec = prepare_opening_turn(
            _demo_state(),
            next_turn_id="t-1",
            prompt="",
            question_type="motivation_validation",
            runtime_timing=lambda state: (0, 900),
        )
        self.assertEqual(spec.prompt, OPENING)

    def test_followup_ignores_time_limit_and_uses_cursor(self) -> None:
        state = _demo_state(demo_script_cursor=4, model_turn_count=30)
        spec = prepare_live_user_followup(state, runtime_timing=lambda current: (5000, 0))
        self.assertEqual(spec.completion_reason, "")
        self.assertEqual(spec.script_line_index, 4)
        request = prepare_live_user_request(
            state,
            followup_spec=spec,
            closing_sentence=CLOSING_SENTENCE,
            build_answer_quality_hint=lambda text: "",
            derive_question_type_preference=lambda *args, **kwargs: "metric_validation",
            select_next_question_type=lambda _state, preferred=None: preferred or "tradeoff",
            prompt_user_text="전혀 관계없는 답변",
        )
        self.assertEqual(request.planned_question_text, QUESTIONS[4])

    def test_last_line_is_closing_phase_and_after_it_completes(self) -> None:
        last = prepare_live_user_followup(
            _demo_state(demo_script_cursor=len(QUESTIONS) - 1),
            runtime_timing=lambda current: (60, 840),
        )
        self.assertTrue(last.should_announce_closing)
        self.assertEqual(last.phase, "closing")
        self.assertEqual(last.completion_reason, "")

        done_state = _demo_state(demo_script_cursor=len(QUESTIONS))
        done = prepare_live_user_followup(done_state, runtime_timing=lambda current: (60, 840))
        self.assertEqual(done.completion_reason, DEMO_SCRIPT_COMPLETION_REASON)
        request = prepare_live_user_request(
            done_state,
            followup_spec=done,
            closing_sentence=CLOSING_SENTENCE,
            build_answer_quality_hint=lambda text: "",
            derive_question_type_preference=lambda *args, **kwargs: None,
            select_next_question_type=lambda _state, preferred=None: "tradeoff",
            prompt_user_text="궁금합니다",
        )
        self.assertEqual(request.planned_question_text, CLOSING_TEXT)


class DemoScriptSessionEngineTests(unittest.IsolatedAsyncioTestCase):
    async def test_full_script_progresses_once_per_answer_then_completes(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder)
        deps = _engine_deps(recorder, executor_deps)
        state = _demo_state()

        for index, expected_line in enumerate(QUESTIONS):
            await _answer(state, deps)
            self.assertEqual(state.demo_script_cursor, index + 1)
            self.assertEqual(recorder.ai_transcripts[-1], expected_line)
            self.assertFalse(recorder.meta_events[-1]["interviewComplete"])

        await _answer(state, deps)
        await asyncio.sleep(0)  # 백그라운드 persist_turn 태스크 실행
        self.assertEqual(recorder.ai_transcripts[-1], CLOSING_TEXT)
        self.assertEqual(recorder.persisted_model_turns, [*QUESTIONS, CLOSING_TEXT])
        self.assertTrue(recorder.meta_events[-1]["interviewComplete"])
        self.assertEqual(recorder.meta_events[-1]["finishReason"], DEMO_SCRIPT_COMPLETION_REASON)
        executor_deps.update_session_status.assert_awaited_with("demo-session", "completed", "closing")
        # 자막과 저장 텍스트 모두 대본 그대로(모델 전사 '덧붙인 말' 무시), 의역 복구는 쓰지 않는다.
        self.assertEqual(recorder.ai_transcripts, [*QUESTIONS, CLOSING_TEXT])
        await_turns = [call.kwargs["text"] for call in executor_deps.request_live_spoken_text_turn.await_args_list]
        self.assertEqual(await_turns, [*QUESTIONS, CLOSING_TEXT])
        executor_deps.request_live_text_turn.assert_not_awaited()

    async def test_scripted_session_forces_hybrid_even_in_live_only_mode(self) -> None:
        recorder = _Recorder()
        generated = AsyncMock(return_value=("모델이 만든 질문인가요?", AUDIO, "gemini-live"))
        deps = _engine_deps(
            recorder,
            _executor_deps(recorder),
            runtime_architecture="live-only",
            request_live_generated_question_turn=generated,
        )
        state = _demo_state(realtime_user_transcript="실시간 전사된 답변입니다.")

        await _answer(state, deps)

        generated.assert_not_awaited()
        self.assertEqual(recorder.ai_transcripts[-1], QUESTIONS[0])
        self.assertEqual(state.demo_script_cursor, 1)

    async def test_silent_turn_retry_does_not_advance(self) -> None:
        recorder = _Recorder()
        deps = _engine_deps(recorder, _executor_deps(recorder), stt_text="", duration_ms=500.0)
        state = _demo_state(demo_script_cursor=2, active_question_turn_id="q-2")

        await _answer(state, deps)  # '한 번만 더 말씀해 주세요' 재요청
        await _answer(state, deps)  # 재요청 한도 이후 무음 → 다시 듣기만
        self.assertEqual(state.demo_script_cursor, 2)
        self.assertNotIn(QUESTIONS[2], recorder.ai_transcripts)

    async def test_echo_suppressed_turn_does_not_advance(self) -> None:
        recorder = _Recorder()
        deps = _engine_deps(recorder, _executor_deps(recorder), is_echo=True)
        state = _demo_state(demo_script_cursor=5)

        await _answer(state, deps)
        self.assertEqual(state.demo_script_cursor, 5)

    async def test_missing_transcript_answer_still_advances(self) -> None:
        recorder = _Recorder()
        deps = _engine_deps(recorder, _executor_deps(recorder), stt_text="", duration_ms=2600.0)
        state = _demo_state(demo_script_cursor=1)

        await _answer(state, deps)
        self.assertEqual(state.demo_script_cursor, 2)
        self.assertEqual(recorder.ai_transcripts[-1], QUESTIONS[1])

    async def test_line_without_audio_is_shown_as_text_without_rephrasing(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder, spoken=AsyncMock(return_value=(QUESTIONS[3], None, "gemini-live")))
        deps = _engine_deps(recorder, executor_deps)
        state = _demo_state(demo_script_cursor=3)

        await _answer(state, deps)
        await asyncio.sleep(0)

        # 음성은 실패했지만 대사는 자막·기록에 남았으므로 다음 답변은 다음 줄로 간다(같은 줄 반복 금지).
        self.assertEqual(recorder.ai_transcripts[-1], QUESTIONS[3])
        self.assertEqual(recorder.persisted_model_turns, [QUESTIONS[3]])
        self.assertEqual(state.demo_script_cursor, 4)
        executor_deps.request_live_text_turn.assert_not_awaited()

    async def test_undelivered_line_rolls_back_cursor(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder)
        executor_deps.set_runtime_status.side_effect = RuntimeError("db down")
        deps = _engine_deps(recorder, executor_deps)
        state = _demo_state(demo_script_cursor=3)

        await _answer(state, deps)
        self.assertEqual(state.demo_script_cursor, 3)
        self.assertNotIn(QUESTIONS[3], recorder.ai_transcripts)

        # 다음 답변에서 같은 줄을 다시 시도한다.
        executor_deps.set_runtime_status.side_effect = None
        await _answer(state, deps)
        self.assertEqual(state.demo_script_cursor, 4)
        self.assertEqual(recorder.ai_transcripts[-1], QUESTIONS[3])

    async def test_demo_does_not_wait_for_transient_thinking_db_write(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder)
        deps = _engine_deps(recorder, executor_deps)
        deps.set_runtime_status.side_effect = AssertionError("transient DB write delayed playback")
        await _answer(_demo_state(), deps)
        self.assertEqual(recorder.ai_transcripts[-1], QUESTIONS[0])
        deps.set_runtime_status.assert_not_awaited()
        executor_deps.set_runtime_status.assert_awaited()


class DemoScriptResumeTests(unittest.IsolatedAsyncioTestCase):
    async def _resume(self, state: VoiceWsState, executor_deps: RuntimeExecutorDeps) -> bool:
        return await generate_and_send_resume_live_turn(
            object(),
            state,
            next_turn_id=lambda session_id: f"{session_id}:resume",
            to_chat_history=lambda turns: [],
            latest_user_answer=lambda history: "",
            build_answer_quality_hint=lambda text: "",
            derive_question_type_preference=lambda *args, **kwargs: None,
            select_next_question_type=lambda _state, preferred=None: "tradeoff",
            runtime_timing=lambda current: (5000, 0),
            runtime_executor_deps=lambda: executor_deps,
            closing_sentence=CLOSING_SENTENCE,
        )

    async def test_resume_continues_script_line_and_advances(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder)
        state = _demo_state(demo_script_cursor=6)

        self.assertTrue(await self._resume(state, executor_deps))
        await asyncio.sleep(0)
        self.assertEqual(recorder.ai_transcripts, [QUESTIONS[6]])
        self.assertEqual(recorder.persisted_model_turns, [QUESTIONS[6]])
        self.assertEqual(state.demo_script_cursor, 7)
        self.assertFalse(recorder.meta_events[-1]["interviewComplete"])

    async def test_resume_without_audio_rolls_back_cursor(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder, spoken=AsyncMock(return_value=(QUESTIONS[6], None, "gemini-live")))
        state = _demo_state(demo_script_cursor=6)

        self.assertFalse(await self._resume(state, executor_deps))
        self.assertEqual(recorder.ai_transcripts, [])
        self.assertEqual(state.demo_script_cursor, 6)

    async def test_resume_after_last_answer_completes_interview(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder)
        state = _demo_state(demo_script_cursor=len(QUESTIONS))

        self.assertTrue(await self._resume(state, executor_deps))
        self.assertEqual(recorder.ai_transcripts, [CLOSING_TEXT])
        self.assertTrue(recorder.meta_events[-1]["interviewComplete"])
        executor_deps.update_session_status.assert_awaited_with("demo-session", "completed", "closing")


class _FakeLiveTextSession:
    def __init__(self, transcripts: list[str]) -> None:
        self.enabled = True
        self.provider = "gemini-live"
        self._transcripts = list(transcripts)
        self.prompts: list[tuple[str, str]] = []
        self.close_count = 0

    async def request_text_turn(self, *, session_instruction: str, text: str, turn_prompt: str = ""):
        self.prompts.append((session_instruction, turn_prompt))
        spoken = self._transcripts.pop(0)
        return types.SimpleNamespace(
            user_text="",
            ai_text=spoken,
            audio_pcm_bytes=f"pcm:{spoken}".encode(),
            sample_rate=24000,
            provider=self.provider,
        )

    async def close(self) -> None:
        self.close_count += 1


def _live_client_deps(state: VoiceWsState) -> LiveClientDeps:
    return LiveClientDeps(
        create_live_interview_session=lambda: state.live_interview,
        build_session_instruction=lambda current: build_live_session_instruction(
            current,
            compact_context_text=lambda text, **kwargs: text,
        ),
        build_turn_prompt=lambda *args, **kwargs: "",
        to_prepared_tts_audio_from_pcm=lambda pcm, *, sample_rate, provider: PreparedTtsAudio(
            chunks=[pcm.decode()],
            sample_rate=sample_rate,
            provider=provider,
            duration_sec=6.0,
        ),
        sanitize_ai_turn_text=lambda text: text,
        looks_like_complete_ai_question=lambda text: True,
    )


class DemoScriptSpeechTests(unittest.IsolatedAsyncioTestCase):
    def test_coverage_tolerates_transliteration_but_rejects_roleplay_and_truncation(self) -> None:
        line = QUESTIONS[0]
        transliterated = line.replace("Python", "파이썬").replace("Next.js", "넥스트제이에스").replace("Java", "자바")
        self.assertGreaterEqual(scripted_speech_coverage(line, transliterated), 0.95)
        self.assertLess(scripted_speech_coverage(line, line[: len(line) // 2]), 0.6)
        self.assertEqual(scripted_speech_coverage(line, line + " " + CANDIDATE_ANSWERS[1]), 0.0)

    async def test_scripted_speech_retries_exact_reading_and_returns_script_text(self) -> None:
        state = _demo_state()
        line = QUESTIONS[2]
        state.live_interview = _FakeLiveTextSession([CANDIDATE_ANSWERS[3], line.replace("87%", "팔십칠 퍼센트")])

        text, audio, provider = await request_live_spoken_text_turn(state, text=line, deps=_live_client_deps(state))

        self.assertEqual(text, line)
        self.assertIsNotNone(audio)
        self.assertIn("팔십칠", audio.chunks[0])  # 두 번째(대본대로 읽은) 음성을 쓴다
        self.assertEqual(provider, "gemini-live")
        self.assertEqual(state.live_interview.close_count, 1)
        instruction, turn_prompt = state.live_interview.prompts[0]
        self.assertIn("글자 그대로", instruction)
        self.assertIn("그대로 소리 내어 읽으세요", turn_prompt)

    async def test_scripted_speech_uses_closest_attempt_after_retries(self) -> None:
        state = _demo_state()
        line = QUESTIONS[2]
        state.live_interview = _FakeLiveTextSession(["근거 일치율 얘기로 가 볼게요.", "전혀 다른 이야기입니다."])

        text, audio, _provider = await request_live_spoken_text_turn(state, text=line, deps=_live_client_deps(state))

        # 2회 모두 기준(0.8) 미달이지만 대본과 겹치는 음성이 있으면 침묵 대신 가장 가까운 음성을 쓴다.
        self.assertEqual(text, line)
        self.assertIn("근거 일치율", audio.chunks[0])
        self.assertEqual(len(state.live_interview.prompts), 2)

    async def test_scripted_speech_gives_up_without_audio_when_nothing_overlaps(self) -> None:
        state = _demo_state()
        state.live_interview = _FakeLiveTextSession([QUESTIONS[5] + " " + CANDIDATE_ANSWERS[7]] * 2)

        text, audio, _provider = await request_live_spoken_text_turn(
            state,
            text=QUESTIONS[5],
            deps=_live_client_deps(state),
        )

        self.assertEqual(text, QUESTIONS[5])
        self.assertIsNone(audio)

    async def test_scripted_opening_never_fails_when_audio_exists(self) -> None:
        state = _demo_state()
        state.live_interview = _FakeLiveTextSession([OPENING + " " + CANDIDATE_ANSWERS[0]] * 2)

        text, audio, _provider = await request_live_spoken_text_turn(state, text=OPENING, deps=_live_client_deps(state))

        self.assertEqual(text, OPENING)
        self.assertIsNotNone(audio)


def _prefetched(text: str) -> PreparedTtsAudio:
    return PreparedTtsAudio(chunks=[f"prefetched:{text}"], sample_rate=24000, provider="gemini-live", duration_sec=5.0)


class DemoScriptLatencyTests(unittest.IsolatedAsyncioTestCase):
    """전송 → 다음 면접관 대사까지의 임계 경로: 일괄 STT·라이브 낭독을 기다리지 않는다."""

    async def test_scripted_answer_uses_realtime_stt_and_never_awaits_batch_stt(self) -> None:
        recorder = _Recorder()
        deps = _engine_deps(recorder, _executor_deps(recorder), duration_ms=25000.0)
        state = _demo_state(
            demo_script_cursor=1,
            parallel_stt_final_text="서비스 메서드에 트랜잭션을 걸었습니다.",
            parallel_stt_provider="google-cloud-stt",
        )

        await _answer(state, deps)

        deps.finalize_parallel_stt_stream.assert_awaited_once()
        deps.transcribe_user_audio.assert_not_awaited()
        self.assertIn("서비스 메서드에 트랜잭션을 걸었습니다.", recorder.user_transcripts)
        self.assertEqual(recorder.ai_transcripts[-1], QUESTIONS[1])
        self.assertEqual(state.demo_script_cursor, 2)
        # 실시간 전사 상태는 턴이 끝나면 비워 다음 답변에 섞이지 않는다.
        self.assertEqual(state.parallel_stt_final_text, "")

    async def test_long_answer_without_realtime_text_defers_batch_stt_to_background(self) -> None:
        recorder = _Recorder()
        release = asyncio.Event()

        async def slow_batch_stt(_wav_bytes):
            await release.wait()
            return "뒤늦게 전사된 답변입니다.", "gemini-live-stt"

        deps = _engine_deps(
            recorder,
            _executor_deps(recorder),
            duration_ms=25000.0,
            transcribe_user_audio=AsyncMock(side_effect=slow_batch_stt),
        )
        state = _demo_state(demo_script_cursor=2)

        await asyncio.wait_for(_answer(state, deps), timeout=1.0)

        # 일괄 STT 가 끝나기 전에 다음 대사가 이미 나갔다.
        self.assertEqual(recorder.ai_transcripts[-1], QUESTIONS[2])
        self.assertEqual(state.demo_script_cursor, 3)
        deps.update_turn_content.assert_not_awaited()

        release.set()
        for _ in range(5):
            await asyncio.sleep(0)
        deps.update_turn_content.assert_awaited_once()
        fix = deps.update_turn_content.await_args.kwargs
        self.assertEqual(fix["content"], "뒤늦게 전사된 답변입니다.")
        self.assertFalse(fix["payload_patch"]["transcription_missing"])
        self.assertEqual(recorder.user_transcripts[-1], "뒤늦게 전사된 답변입니다.")

    async def test_prefetched_lines_skip_live_speech_on_critical_path(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder)
        speaker = AsyncMock(side_effect=lambda _state, text: _prefetched(text))
        deps = _engine_deps(recorder, executor_deps, prefetch_scripted_line_audio=speaker)
        state = _demo_state()
        schedule_demo_script_prefetch(state, line_index=0, speak=speaker)  # 오프닝 직후와 같다

        for _ in range(len(QUESTIONS) + 1):
            await _answer(state, deps)

        script = [*QUESTIONS, CLOSING_TEXT]
        executor_deps.request_live_spoken_text_turn.assert_not_awaited()
        delivered = [call.kwargs["preferred_full_audio"] for call in executor_deps.build_ai_delivery_plan.await_args_list]
        self.assertEqual([audio.chunks[0] for audio in delivered], [f"prefetched:{text}" for text in script])
        self.assertEqual([call.args[1] for call in speaker.await_args_list], script)
        self.assertEqual(recorder.ai_transcripts, script)
        # 면접이 끝나면 선생성 캐시를 비운다.
        self.assertEqual(state.demo_script_prefetch_tasks, {})

    async def test_in_flight_prefetch_is_awaited_instead_of_restarting_speech(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder)
        release = asyncio.Event()

        async def slow_speaker(_state, text):
            await release.wait()
            return _prefetched(text)

        speaker = AsyncMock(side_effect=slow_speaker)
        deps = _engine_deps(recorder, executor_deps, prefetch_scripted_line_audio=speaker)
        state = _demo_state(demo_script_cursor=4)
        schedule_demo_script_prefetch(state, line_index=4, speak=speaker)

        answer = asyncio.create_task(_answer(state, deps))
        for _ in range(5):
            await asyncio.sleep(0)
        self.assertFalse(answer.done())
        release.set()
        await asyncio.wait_for(answer, timeout=1.0)

        executor_deps.request_live_spoken_text_turn.assert_not_awaited()
        self.assertEqual(recorder.ai_transcripts[-1], QUESTIONS[4])
        await clear_demo_script_prefetch(state)

    async def test_cache_miss_falls_back_to_single_reading_attempt(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder)
        failed_speaker = AsyncMock(return_value=None)  # 선생성 실패
        deps = _engine_deps(recorder, executor_deps, prefetch_scripted_line_audio=failed_speaker)
        state = _demo_state(demo_script_cursor=2)
        schedule_demo_script_prefetch(state, line_index=2, speak=failed_speaker)

        await _answer(state, deps)

        executor_deps.request_live_spoken_text_turn.assert_awaited_once()
        self.assertEqual(
            executor_deps.request_live_spoken_text_turn.await_args.kwargs,
            {"text": QUESTIONS[2], "attempts": 1},
        )
        self.assertEqual(recorder.ai_transcripts[-1], QUESTIONS[2])
        await clear_demo_script_prefetch(state)

    async def test_rolled_back_line_reuses_same_prefetched_audio(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(recorder)
        executor_deps.set_runtime_status.side_effect = RuntimeError("db down")
        speaker = AsyncMock(side_effect=lambda _state, text: _prefetched(text))
        deps = _engine_deps(recorder, executor_deps, prefetch_scripted_line_audio=speaker)
        state = _demo_state(demo_script_cursor=3)
        schedule_demo_script_prefetch(state, line_index=3, speak=speaker)

        await _answer(state, deps)
        self.assertEqual(state.demo_script_cursor, 3)

        executor_deps.set_runtime_status.side_effect = None
        await _answer(state, deps)

        self.assertEqual(state.demo_script_cursor, 4)
        self.assertEqual(recorder.ai_transcripts[-1], QUESTIONS[3])
        self.assertEqual([call.args[1] for call in speaker.await_args_list].count(QUESTIONS[3]), 1)
        executor_deps.request_live_spoken_text_turn.assert_not_awaited()
        await clear_demo_script_prefetch(state)

    async def test_non_demo_hybrid_session_is_unchanged(self) -> None:
        recorder = _Recorder()
        executor_deps = _executor_deps(
            recorder,
            spoken=AsyncMock(return_value=("다음 질문입니다?", AUDIO, "gemini-live")),
        )
        speaker = AsyncMock(return_value=AUDIO)
        deps = _engine_deps(recorder, executor_deps, prefetch_scripted_line_audio=speaker)
        state = VoiceWsState(
            session_id="normal-session",
            session_type="live_interview",
            job_data={"company": "네이버", "role": "백엔드 개발자"},
        )
        state.live_interview = _DummyLiveSession(model="gemini-live")
        state.parallel_stt_final_text = "실시간 전사 답변입니다."

        await _answer(state, deps)

        deps.transcribe_user_audio.assert_awaited_once()
        deps.finalize_parallel_stt_stream.assert_not_awaited()
        executor_deps.request_live_spoken_text_turn.assert_awaited()
        for call in executor_deps.request_live_spoken_text_turn.await_args_list:
            self.assertNotIn("attempts", call.kwargs)
        speaker.assert_not_awaited()
        self.assertEqual(state.demo_script_prefetch_tasks, {})

    async def test_scripted_speech_single_attempt_does_not_retry(self) -> None:
        state = _demo_state()
        line = QUESTIONS[2]
        state.live_interview = _FakeLiveTextSession([CANDIDATE_ANSWERS[3], line])

        text, audio, _provider = await request_live_spoken_text_turn(
            state,
            text=line,
            deps=_live_client_deps(state),
            attempts=1,
        )

        self.assertEqual(text, line)
        self.assertIsNone(audio)
        self.assertEqual(len(state.live_interview.prompts), 1)
        self.assertEqual(state.live_interview.close_count, 0)

    async def test_scripted_speech_can_run_on_dedicated_prefetch_session(self) -> None:
        state = _demo_state()
        main_live = _FakeLiveTextSession([])
        prefetch_live = _FakeLiveTextSession([QUESTIONS[0]])
        state.live_interview = main_live

        text, audio, _provider = await request_live_scripted_speech_turn(
            state,
            text=QUESTIONS[0],
            deps=_live_client_deps(state),
            live=prefetch_live,
        )

        self.assertEqual(text, QUESTIONS[0])
        self.assertIsNotNone(audio)
        self.assertEqual(main_live.prompts, [])
        self.assertEqual(len(prefetch_live.prompts), 1)

    async def test_clear_cancels_pending_prefetch_and_closes_dedicated_session(self) -> None:
        state = _demo_state()
        prefetch_live = _FakeLiveTextSession([])
        state.demo_script_prefetch_live = prefetch_live
        never = asyncio.Event()

        async def hang(_state, _text):
            await never.wait()

        schedule_demo_script_prefetch(state, line_index=0, speak=hang)
        task = state.demo_script_prefetch_tasks[0]
        await asyncio.sleep(0)

        await clear_demo_script_prefetch(state)

        self.assertTrue(task.cancelled())
        self.assertEqual(state.demo_script_prefetch_tasks, {})
        self.assertIsNone(state.demo_script_prefetch_live)
        self.assertEqual(prefetch_live.close_count, 1)


def _opening_audio(text: str = OPENING) -> PreparedTtsAudio:
    return PreparedTtsAudio(chunks=[f"shared:{text}"], sample_rate=24000, provider="gemini-live", duration_sec=13.0)


def _demo_session_row(session_id: str) -> dict:
    return {
        "id": session_id,
        "session_type": "live_interview",
        "status": "created",
        "job_payload": dict(DEMO_JOB_DATA),
        "target_duration_sec": 420,
        "closing_threshold_sec": 60,
    }


class DemoScriptOpeningCacheTests(unittest.IsolatedAsyncioTestCase):
    """시연 오프닝 음성 프로세스 공용 캐시 — 버튼 대기(prepare-opening)와 방 오프닝이 같은 음성을 재사용한다."""

    def setUp(self) -> None:
        opening_cache.reset_demo_script_opening_cache()
        # These cases exercise fallback generation with no matching bundled file.
        patcher = unittest.mock.patch.object(opening_cache, "load_demo_script_audio", return_value=None)
        patcher.start()
        self.addCleanup(patcher.stop)

    async def test_bundled_opening_bypasses_cold_generation(self) -> None:
        generate = AsyncMock(side_effect=AssertionError("live generation should not run"))
        with unittest.mock.patch.object(opening_cache, "load_demo_script_audio", return_value=_opening_audio()), \
                unittest.mock.patch.object(opening_cache, "generate_demo_script_opening_audio", generate):
            audio = await opening_cache.get_demo_script_opening_audio(wait_sec=0, start=False)
        self.assertEqual(audio.chunks, [f"shared:{OPENING}"])
        generate.assert_not_awaited()

    async def asyncTearDown(self) -> None:
        await opening_cache.shutdown_demo_script_opening_cache()
        opening_cache.reset_demo_script_opening_cache()

    async def _room_opening(self, state: VoiceWsState, deps: SessionEngineDeps) -> None:
        await handle_session_init(object(), state, {"sessionId": state.session_id}, deps=deps)

    def _room_deps(self, recorder: _Recorder, *, wait_sec: float = 1.0) -> SessionEngineDeps:
        deps = _engine_deps(recorder, _executor_deps(recorder))
        return replace(
            deps,
            get_session=lambda session_id: _demo_session_row(session_id),
            take_demo_script_opening=lambda state: prepared_opening.build_demo_script_opening_artifact(
                state,
                next_turn_id=f"{state.session_id}:opening",
                runtime_timing=lambda _state: (0, 420),
                wait_sec=wait_sec,
                start=False,
            ),
        )

    async def test_opening_is_generated_once_and_shared_across_sessions(self) -> None:
        generate = AsyncMock(side_effect=lambda text: _opening_audio(text))
        first, second = await asyncio.gather(
            opening_cache.get_demo_script_opening_audio(wait_sec=None, generate=generate),
            opening_cache.get_demo_script_opening_audio(wait_sec=None, generate=generate),
        )
        third = await opening_cache.get_demo_script_opening_audio(wait_sec=None, generate=generate)

        generate.assert_awaited_once_with(OPENING)
        self.assertEqual([audio.chunks for audio in (first, second, third)], [[f"shared:{OPENING}"]] * 3)
        # 세션마다 복사본을 받는다 — 한 세션이 목록을 건드려도 캐시·다른 세션은 그대로다.
        first.chunks.clear()
        self.assertIsNot(second.chunks, third.chunks)
        cached = await opening_cache.get_demo_script_opening_audio(wait_sec=0, start=False)
        self.assertEqual(cached.chunks, [f"shared:{OPENING}"])

    async def test_warm_prepare_opening_returns_artifact_without_live_speech(self) -> None:
        await opening_cache.get_demo_script_opening_audio(wait_sec=None, generate=AsyncMock(return_value=_opening_audio()))
        live_speech = AsyncMock(return_value=("", None, ""))

        with unittest.mock.patch.object(prepared_opening, "request_live_spoken_text_turn", live_speech):
            artifacts = [
                await asyncio.wait_for(prepared_opening.prepare_opening_artifact_from_session(_demo_session_row(sid)), 0.5)
                for sid in ("demo-a", "demo-b")
            ]

        live_speech.assert_not_awaited()
        for artifact in artifacts:
            self.assertIsNotNone(artifact)
            self.assertEqual(artifact.spec.prompt, OPENING)
            segment = artifact.delivery_plan.segments[0]
            self.assertEqual((segment.text, segment.prepared_audio.chunks), (OPENING, [f"shared:{OPENING}"]))
        self.assertNotEqual(artifacts[0].spec.turn_id, artifacts[1].spec.turn_id)

    async def test_cold_prepare_opening_returns_quickly_and_room_awaits_same_generation(self) -> None:
        release = asyncio.Event()

        async def slow_generate(text):
            await release.wait()
            return _opening_audio(text)

        generate = AsyncMock(side_effect=slow_generate)
        recorder = _Recorder()
        deps = self._room_deps(recorder)
        state = _demo_state()
        with unittest.mock.patch.object(opening_cache, "generate_demo_script_opening_audio", generate), \
                unittest.mock.patch.object(prepared_opening, "DEMO_SCRIPT_PREPARE_OPENING_WAIT_SEC", 0.05):
            artifact = await asyncio.wait_for(
                prepared_opening.prepare_opening_artifact_from_session(_demo_session_row(state.session_id)),
                timeout=0.5,
            )
            self.assertIsNone(artifact)  # → prepared:false, 버튼은 바로 풀린다

            room = asyncio.create_task(self._room_opening(state, deps))
            for _ in range(5):
                await asyncio.sleep(0)
            self.assertFalse(room.done())
            release.set()
            await asyncio.wait_for(room, timeout=1.0)

        generate.assert_awaited_once_with(OPENING)
        deps.generate_and_send_opening_live_turn.assert_not_awaited()
        deps.send_prepared_opening_live_turn.assert_awaited_once()
        sent = deps.send_prepared_opening_live_turn.await_args.kwargs["artifact"]
        self.assertEqual(sent.delivery_plan.segments[0].prepared_audio.chunks, [f"shared:{OPENING}"])

    async def test_room_without_cache_or_generation_keeps_existing_opening_path(self) -> None:
        recorder = _Recorder()
        deps = self._room_deps(recorder)
        generate = AsyncMock(return_value=_opening_audio())

        with unittest.mock.patch.object(opening_cache, "generate_demo_script_opening_audio", generate):
            await asyncio.wait_for(self._room_opening(_demo_state(), deps), timeout=0.5)

        generate.assert_not_awaited()  # 방은 공용 생성을 새로 시작하지 않는다
        deps.send_prepared_opening_live_turn.assert_not_awaited()
        deps.generate_and_send_opening_live_turn.assert_awaited_once()

    async def test_room_stops_waiting_at_bound_and_falls_back(self) -> None:
        never = asyncio.Event()

        async def hang(_text):
            await never.wait()

        recorder = _Recorder()
        deps = self._room_deps(recorder, wait_sec=0.05)
        # 공용 생성이 멈춘 채 진행 중이다(prepare-opening 이 걸어 두고 시간 초과로 돌아간 상태).
        self.assertIsNone(await opening_cache.get_demo_script_opening_audio(wait_sec=0, generate=hang))

        await asyncio.wait_for(self._room_opening(_demo_state(), deps), timeout=0.5)

        deps.generate_and_send_opening_live_turn.assert_awaited_once()

    async def test_failed_generation_is_not_cached(self) -> None:
        generate = AsyncMock(side_effect=[None, RuntimeError("quota"), _opening_audio()])

        self.assertIsNone(await opening_cache.get_demo_script_opening_audio(wait_sec=None, generate=generate))
        self.assertIsNone(await opening_cache.get_demo_script_opening_audio(wait_sec=None, generate=generate))
        audio = await opening_cache.get_demo_script_opening_audio(wait_sec=None, generate=generate)

        self.assertEqual(generate.await_count, 3)
        self.assertEqual(audio.chunks, [f"shared:{OPENING}"])

    async def test_warm_up_generates_only_opening_and_swallows_errors(self) -> None:
        failing = AsyncMock(side_effect=RuntimeError("no credentials"))
        await opening_cache.warm_up_demo_script_opening(generate=failing)
        failing.assert_awaited_once_with(OPENING)
        self.assertIsNone(await opening_cache.get_demo_script_opening_audio(wait_sec=0, start=False))

        generate = AsyncMock(side_effect=lambda text: _opening_audio(text))
        await opening_cache.warm_up_demo_script_opening(generate=generate)
        generate.assert_awaited_once_with(OPENING)
        cached = await opening_cache.get_demo_script_opening_audio(wait_sec=0, start=False)
        self.assertEqual(cached.chunks, [f"shared:{OPENING}"])

    async def test_shared_generation_runs_on_dedicated_session_and_rejects_unverified_audio(self) -> None:
        roleplay = _FakeLiveTextSession([OPENING + " " + CANDIDATE_ANSWERS[0]] * 2)
        verified = _FakeLiveTextSession([OPENING])
        sessions = iter([roleplay, verified])
        with unittest.mock.patch.object(opening_cache, "create_live_interview_session", lambda: next(sessions)), \
                unittest.mock.patch.object(opening_cache, "_LIVE_CLIENT_DEPS", _live_client_deps(_demo_state())):
            # 어긋난 낭독(지원자 역할극)은 공용 캐시에 넣지 않는다 — 세션별 오프닝과 달리 미검증 음성을 쓰지 않는다.
            self.assertIsNone(await opening_cache.generate_demo_script_opening_audio(OPENING))
            audio = await opening_cache.generate_demo_script_opening_audio(OPENING)

        self.assertEqual(len(roleplay.prompts), 2)
        self.assertIn("글자 그대로", roleplay.prompts[0][0])  # 실제 시연 세션과 같은 대본 낭독 지시문
        self.assertEqual(audio.chunks, [f"pcm:{OPENING}"])
        self.assertGreaterEqual(verified.close_count, 1)  # 다 읽힌 뒤 쉬는 세션은 닫는다

    async def test_non_demo_prepare_opening_is_unchanged(self) -> None:
        generate = AsyncMock(return_value=_opening_audio())
        live_speech = AsyncMock(return_value=("네이버 백엔드 면접 시작하겠습니다.", AUDIO, "gemini-live"))
        session = {
            "id": "normal-session",
            "session_type": "live_interview",
            "status": "created",
            "job_payload": {"company": "네이버", "role": "백엔드 개발자"},
            "target_duration_sec": 420,
            "closing_threshold_sec": 60,
        }
        with unittest.mock.patch.object(opening_cache, "generate_demo_script_opening_audio", generate), \
                unittest.mock.patch.object(prepared_opening, "request_live_spoken_text_turn", live_speech):
            artifact = await prepared_opening.prepare_opening_artifact_from_session(session)

        live_speech.assert_awaited_once()
        generate.assert_not_awaited()
        self.assertEqual(artifact.spec.prompt, "네이버 백엔드 면접 시작하겠습니다.")


class _FakeReportService:
    """ReportAgent 가 쓰는 InterviewService 메서드만 흉내 낸다. save_report 는 실제처럼 문서를 조립한다."""

    def __init__(self, *, answered: int, samples: list[dict] | None = None) -> None:
        self.saved_reports: list[dict] = []
        self.report_completed_at = None
        self.job: dict | None = None
        self.completed_job_ids: list[str] = []
        self.samples = samples or []
        self.turns: list[dict] = [{"role": "model", "content": OPENING}]
        for index in range(answered):
            self.turns.append({"role": "user", "content": CANDIDATE_ANSWERS[index]})
            if index < len(QUESTIONS):
                self.turns.append({"role": "model", "content": QUESTIONS[index]})

    def get_session(self, session_id: str):
        return {
            "id": session_id,
            "session_type": "live_interview",
            "job_payload": dict(DEMO_JOB_DATA),
            "resume_payload": {},
            "personality": "professional",
            "target_duration_sec": 900,
            "report_completed_at": self.report_completed_at,
        }

    def get_turns(self, session_id: str):
        del session_id
        return list(self.turns)

    def get_recording_signals(self, session_id: str):
        del session_id
        return {"samples": self.samples} if self.samples else None

    def save_eval_signals(self, session_id: str, signals: list[dict]) -> None:
        del session_id, signals

    def save_recording_aggregates(self, session_id: str, aggregates: dict) -> None:
        del session_id, aggregates

    def save_report(self, session_id: str, report_payload: dict) -> None:
        document = build_report_document(
            session=self.get_session(session_id),
            turns=self.get_turns(session_id),
            compat_analysis=report_payload,
        )
        self.saved_reports.append(document)
        self.report_completed_at = "now"

    def enqueue_report_job(self, *, session_id: str, session_type: str) -> dict:
        del session_type
        if self.job is None:
            self.job = {"id": "job-1", "session_id": session_id, "status": "pending"}
        return dict(self.job)

    def complete_report_job(self, job_id: str) -> None:
        self.completed_job_ids.append(job_id)
        if self.job and self.job["id"] == job_id:
            self.job["status"] = "done"


def _camera_samples(*, away_every: int) -> list[dict]:
    return [
        {"tMs": index * 200, "away": index % away_every == 0, "smile": index % 10 == 0, "yaw": (index % 5) * 1.5, "pitch": 1.0}
        for index in range(60)
    ]


class _NoGeminiFactory:
    def __init__(self) -> None:
        self.calls = 0

    def __call__(self):
        self.calls += 1
        raise AssertionError("demo script report must not construct Gemini")


class DemoScriptReportTests(unittest.TestCase):
    def test_full_report_has_thirteen_findings_in_answer_order(self) -> None:
        report = build_demo_report()
        AnalysisReport.model_validate(report)
        findings = report["questionFindings"]
        self.assertEqual([item["question"] for item in findings], [OPENING, *QUESTIONS])
        self.assertEqual([item["userAnswer"] for item in findings], list(CANDIDATE_ANSWERS))
        for index, finding in enumerate(findings):
            self.assertTrue(finding["strengths"] and finding["improvements"] and finding["refinedAnswer"])
            for quote in finding["evidence"]:
                self.assertIn(quote, CANDIDATE_ANSWERS[index])  # 근거는 지원자 대본의 실제 구절
        for value in report["evaluation"].values():
            self.assertIsInstance(value, int)
        self.assertTrue(report["summary"] and report["fitSummary"])
        self.assertEqual(len(report["nextActions"]), 3)
        # 렌더러가 '...' 로 감싸는 습관 표현에는 따옴표가 없어야 한다.
        self.assertFalse(any("'" in habit["habit"] for habit in report["habits"]))

    def test_report_document_uses_polished_axis_evidence(self) -> None:
        service = _FakeReportService(answered=3)
        document = build_demo_report_document(build_demo_report())
        service.save_report("demo", document)
        saved = service.saved_reports[-1]

        view = saved["reportView"]
        self.assertEqual(view["analysisMode"], "full")
        self.assertEqual(view["profile"]["typeCode"], "AAAA")
        for axis in view["profile"]["axisEvidence"]:
            self.assertNotIn("장면이 보여", axis["description"])
            self.assertNotIn(CANDIDATE_ANSWERS[0], axis["description"])
        self.assertEqual(len(view["questionFindings"]), 13)
        self.assertEqual(saved["compatAnalysis"]["fitSummary"], build_demo_report()["fitSummary"])
        # 타임라인은 실제로 진행된 턴 기준이다.
        self.assertEqual([entry["prompt"] for entry in saved["timeline"]], [OPENING, QUESTIONS[0], QUESTIONS[1]])

    def test_report_is_complete_regardless_of_how_many_lines_were_answered(self) -> None:
        payloads = []
        for answered in (3, 4, 13):
            service = _FakeReportService(answered=answered)
            agent = ReportAgent(interview_service=service, gemini_factory=_NoGeminiFactory())
            agent._process_job({"session_id": f"demo-{answered}", "session_type": "live_interview"})
            payloads.append(service.saved_reports[-1]["compatAnalysis"])
        self.assertEqual(payloads[0], payloads[1])
        self.assertEqual(payloads[0], payloads[2])
        self.assertEqual(len(payloads[0]["questionFindings"]), 13)

    def test_nonverbal_uses_real_aggregates_without_gemini(self) -> None:
        factory = _NoGeminiFactory()
        service = _FakeReportService(answered=4, samples=_camera_samples(away_every=2))
        agent = ReportAgent(interview_service=service, gemini_factory=factory)

        agent._process_job({"session_id": "demo-session", "session_type": "live_interview"})

        self.assertEqual(factory.calls, 0)
        nonverbal = service.saved_reports[-1]["reportView"]["nonverbalSummary"]
        self.assertAlmostEqual(nonverbal["awayRatio"], 0.5)
        self.assertIn("시선이 화면 밖으로 향하는 구간이 잦았습니다", nonverbal["overall"])
        # 답변별 코멘트는 실제로 녹화된 답변 수(4개)만큼 — 녹화 탭 Q1..Q4 와 맞물린다.
        self.assertEqual([item["index"] for item in nonverbal["perAnswer"]], [1, 2, 3, 4])

    def test_nonverbal_wording_follows_gaze_band(self) -> None:
        steady = build_demo_nonverbal_summary(
            {"awayRatio": 0.05, "smileRatio": 0.2, "headMovement": {"level": "낮음"}},
            answer_count=2,
        )
        self.assertIn("정면 응시가 안정적으로 유지", steady["overall"])
        self.assertEqual(len(steady["perAnswer"]), 2)

    def test_inline_save_completes_job_and_worker_does_not_resave(self) -> None:
        service = _FakeReportService(answered=3)
        agent = ReportAgent(interview_service=service, gemini_factory=_NoGeminiFactory())

        job = agent.save_demo_report_now("demo-session", "live_interview")
        self.assertEqual(job["status"], "done")
        self.assertEqual(service.completed_job_ids, ["job-1"])
        self.assertEqual(len(service.saved_reports), 1)

        # 같은 세션의 /complete 재호출과 워커 처리 모두 다시 저장하지 않는다(멱등).
        agent.save_demo_report_now("demo-session", "live_interview")
        agent._process_job({"session_id": "demo-session", "session_type": "live_interview"})
        self.assertEqual(len(service.saved_reports), 1)


if __name__ == "__main__":
    unittest.main()
