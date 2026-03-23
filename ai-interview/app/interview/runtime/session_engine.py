from __future__ import annotations

import asyncio
import logging
import re
import time
from dataclasses import dataclass, replace
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from fastapi import WebSocket

from app.interview.domain.turn_text import sanitize_user_turn_text
from app.interview.runtime.executor import RuntimeExecutorDeps, execute_live_user_followup_turn
from app.interview.runtime.live_turns import prepare_live_user_followup, prepare_live_user_request
from app.interview.runtime.orchestration import (
    build_voice_model_turn_payload,
    build_voice_user_turn_payload,
)
from app.interview.runtime.state import PendingUserSegment, PreparedTtsAudio, VoiceWsState
from app.services.gemini_live_voice_service import GeminiLiveInterviewSession

logger = logging.getLogger("dibut.ws")

VALID_SESSION_TYPES = {"live_interview", "portfolio_defense"}
COMPLETE_ANSWER_ENDINGS = (
    "습니다",
    "입니다",
    "해요",
    "했어요",
    "했습니다",
    "합니다",
    "예요",
    "이에요",
    "네요",
    "군요",
    "죠",
    "어요",
    "아요",
)


def _should_accept_missing_user_transcript(
    *,
    live_ai_text: str,
    live_prepared_tts: PreparedTtsAudio | None,
    utterance_duration_ms: float,
) -> bool:
    if utterance_duration_ms < 1200:
        return False
    normalized_ai = re.sub(r"[^0-9A-Za-z가-힣]", "", (live_ai_text or ""))
    return bool(normalized_ai) or live_prepared_tts is not None


async def _request_retry_for_silent_turn(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    deps: SessionEngineDeps,
) -> bool:
    active_turn_id = (state.active_question_turn_id or "").strip()
    if not state.session_id or not active_turn_id:
        return False
    if state.current_question_retry_count >= 1:
        return False

    retry_text = "답변이 들리지 않았습니다. 한 번만 더 말씀해 주세요."
    state.current_question_retry_count += 1
    await deps.send_json(
        ws,
        {
            "type": "warning",
            "message": "답변이 들리지 않아 같은 질문으로 한 번 더 요청합니다.",
            "turnId": active_turn_id,
        },
    )
    if not await deps.send_transcript(ws, state.session_id, "ai", retry_text, turn_id=active_turn_id):
        return True
    await deps.send_json(
        ws,
        {
            "type": "full-text",
            "text": retry_text,
            "turnId": active_turn_id,
        },
    )
    await deps.resume_listening(ws, state, turn_id=active_turn_id)
    return True
def _build_session_fallback_opening_text(state: VoiceWsState) -> str:
    if state.session_type == "portfolio_defense":
        return (
            "안녕하세요. Dibut입니다. 포트폴리오 디펜스를 시작하겠습니다. "
            "먼저 이 프로젝트를 간단히 소개해 주시고, 본인이 가장 주도적으로 맡은 부분을 함께 말씀해 주세요."
        )

    job_data = state.job_data if isinstance(state.job_data, dict) else {}
    company = str(job_data.get("company") or "").strip()
    role = str(job_data.get("role") or "").strip()
    if company and role:
        return (
            f"안녕하세요. Dibut입니다. {company} {role} 포지션 면접을 시작하겠습니다. "
            "먼저 간단한 자기소개와 함께, 이 포지션에 지원한 이유를 말씀해 주세요."
        )
    if role:
        return (
            f"안녕하세요. Dibut입니다. {role} 포지션 면접을 시작하겠습니다. "
            "먼저 간단한 자기소개와 함께, 이 직무에 지원한 이유를 말씀해 주세요."
        )
    return (
        "안녕하세요. Dibut입니다. 면접을 시작하겠습니다. "
        "먼저 간단한 자기소개와 지원 동기를 함께 말씀해 주세요."
    )


def _looks_like_complete_user_text(text: str) -> bool:
    normalized = (text or "").strip().rstrip("\"' ")
    if not normalized:
        return False
    if normalized[-1] in ".!?":
        return True
    return any(normalized.endswith(ending) for ending in COMPLETE_ANSWER_ENDINGS)


def _score_user_text(candidate: str, *, utterance_duration_ms: float) -> int:
    normalized = sanitize_user_turn_text(candidate)
    if not normalized:
        return 0

    score = len(re.findall(r"[0-9A-Za-z가-힣]", normalized))
    if _looks_like_complete_user_text(normalized):
        score += 40
    if utterance_duration_ms >= 2800 and len(normalized) >= 18:
        score += 25
    if re.search(r"\d", normalized):
        score += 10
    return score


def _select_best_user_text(
    *,
    live_user_text: str,
    realtime_user_text: str,
    fallback_user_text: str,
    utterance_duration_ms: float,
) -> str:
    candidates: list[str] = []
    for raw in (live_user_text, realtime_user_text, fallback_user_text):
        normalized = sanitize_user_turn_text(raw)
        if normalized and normalized not in candidates:
            candidates.append(normalized)

    if not candidates:
        return ""

    return max(
        candidates,
        key=lambda candidate: _score_user_text(candidate, utterance_duration_ms=utterance_duration_ms),
    )


def _should_request_fallback_stt(
    *,
    realtime_user_text: str,
    utterance_duration_ms: float,
) -> bool:
    normalized = sanitize_user_turn_text(realtime_user_text)
    if not normalized:
        return True

    compact_len = len(re.findall(r"[0-9A-Za-z가-힣]", normalized))
    if utterance_duration_ms >= 2200 and compact_len < 18:
        return True
    if utterance_duration_ms >= 1600 and not _looks_like_complete_user_text(normalized):
        return True
    return False


def _runtime_architecture(deps: SessionEngineDeps) -> str:
    normalized = (getattr(deps, "runtime_architecture", "hybrid") or "hybrid").strip().lower()
    return "live-only" if normalized == "live-only" else "hybrid"


def _segment_drain_delay_sec(
    state: VoiceWsState,
    *,
    reason: str,
    architecture: str,
) -> float:
    drain_delay_sec = state.turn_end_grace_sec
    if architecture == "live-only":
        if reason == "max_segment":
            return max(min(drain_delay_sec, 0.24), 0.16)
        if reason in {"silence", "short_utterance_silence"}:
            return max(min(drain_delay_sec, 0.24), 0.18)
        return max(drain_delay_sec, 0.16)

    if reason == "max_segment":
        return max(min(drain_delay_sec, 0.08), 0.05)
    if reason in {"silence", "short_utterance_silence"}:
        return max(min(drain_delay_sec, 0.03), 0.01)
    return drain_delay_sec


def _has_live_input_stream_result(state: VoiceWsState) -> bool:
    return bool(
        state.live_input_turn_active
        or state.live_input_turn_id
        or state.live_input_streamed_user_text
        or state.live_input_streamed_ai_text
        or state.live_input_streamed_audio_chunk_count > 0
        or state.live_input_streamed_audio_duration_sec > 0
    )


def _has_captured_live_input_stream_result(
    *,
    turn_id: str,
    user_text: str,
    ai_text: str,
    audio_duration_sec: float,
    audio_chunk_count: int,
) -> bool:
    return bool(
        turn_id
        or user_text
        or ai_text
        or audio_duration_sec > 0
        or audio_chunk_count > 0
    )


def _capture_live_input_stream_state(
    state: VoiceWsState,
) -> tuple[str, str, str, str, float, int]:
    return (
        (state.live_input_turn_id or "").strip(),
        sanitize_user_turn_text(state.live_input_streamed_user_text),
        (state.live_input_streamed_ai_text or "").strip(),
        (state.live_input_streamed_provider or "").strip(),
        max(0.0, float(state.live_input_streamed_audio_duration_sec or 0.0)),
        max(0, int(state.live_input_streamed_audio_chunk_count or 0)),
    )


def _clear_live_input_stream_state(
    state: VoiceWsState,
) -> None:
    state.live_input_turn_active = False
    state.live_input_turn_id = ""
    state.live_input_streamed_user_text = ""
    state.live_input_streamed_ai_text = ""
    state.live_input_streamed_provider = ""
    state.live_input_streamed_audio_duration_sec = 0.0
    state.live_input_streamed_audio_chunk_count = 0


async def _transcribe_user_audio(
    deps: SessionEngineDeps,
    wav_bytes: bytes,
) -> tuple[str, str]:
    transcribe_fn = getattr(deps, "transcribe_user_audio", None) or deps.fallback_transcribe_user_audio
    if transcribe_fn is None:
        return "", ""
    return await transcribe_fn(wav_bytes)


def _persist_turn_background(
    deps: SessionEngineDeps,
    state: VoiceWsState,
    *,
    role: str,
    content: str,
    channel: str,
    payload: dict[str, Any],
) -> None:
    async def runner() -> None:
        try:
            await deps.persist_turn(
                state,
                role=role,
                content=content,
                channel=channel,
                payload=payload,
            )
        except Exception:
            logger.warning(
                "background persist_turn failed (session=%s, role=%s)",
                state.session_id,
                role,
                exc_info=True,
            )

    asyncio.create_task(runner())


@dataclass(frozen=True)
class SessionInitRequest:
    session_id: str
    session_type: str
    llm_stream_mode: str
    tts_mode: str


@dataclass(frozen=True)
class SessionEngineDeps:
    create_live_interview_session: Callable[[], GeminiLiveInterviewSession]
    normalize_llm_stream_mode: Callable[[Any], str]
    normalize_tts_mode: Callable[[Any], str]
    reset_voice_runtime_state: Callable[..., None]
    get_session: Callable[[str], dict[str, Any] | None]
    get_turns: Callable[[str], list[dict[str, Any]]]
    mark_runtime_expired: Callable[[str], dict[str, Any] | None]
    mark_runtime_connected: Callable[[str, str, str], dict[str, Any] | None]
    hydrate_state_from_session_row: Callable[..., None]
    resume_existing_session: Callable[..., Awaitable[bool]]
    generate_and_send_opening_live_turn: Callable[..., Awaitable[bool]]
    send_json: Callable[..., Awaitable[bool]]
    send_avatar_state: Callable[..., Awaitable[bool]]
    send_runtime_meta_snapshot: Callable[..., Awaitable[bool]]
    live_active_model: Callable[[VoiceWsState], str]
    set_runtime_mode: Callable[..., Awaitable[None]]
    set_runtime_status: Callable[..., Awaitable[Any]]
    get_or_create_live_interview: Callable[[VoiceWsState], GeminiLiveInterviewSession]
    build_answer_quality_hint: Callable[[str], str]
    derive_question_type_preference: Callable[..., str | None]
    select_next_question_type: Callable[..., str]
    request_live_audio_turn: Callable[..., Awaitable[tuple[str, str, PreparedTtsAudio | None, str]]]
    fallback_transcribe_user_audio: Callable[[bytes], Awaitable[tuple[str, str]]] | None
    emit_realtime_user_delta: Callable[..., Awaitable[None]]
    is_probable_ai_echo: Callable[[VoiceWsState, str, bytes], bool]
    reset_realtime_user_transcript: Callable[[VoiceWsState], None]
    remember_user_turn: Callable[[VoiceWsState, str], None]
    persist_turn: Callable[..., Awaitable[Any]]
    send_transcript: Callable[..., Awaitable[bool]]
    log_runtime_event: Callable[..., None]
    is_short_stt_result: Callable[[str, bytes], bool]
    retune_vad_for_next_turn: Callable[..., None]
    runtime_timing: Callable[[VoiceWsState], tuple[int, int]]
    runtime_executor_deps: Callable[[], RuntimeExecutorDeps]
    estimate_wav_duration_ms: Callable[[bytes], float]
    snapshot_vad_config: Callable[[VoiceWsState], dict[str, Any]]
    build_memory_snapshot: Callable[[VoiceWsState], str]
    merge_wav_segments: Callable[[list[bytes]], bytes]
    merge_vad_events: Callable[[list[dict[str, Any]]], dict[str, Any]]
    resume_listening: Callable[..., Awaitable[Any]]
    next_ai_turn_id: Callable[[str], str]
    transcribe_user_audio: Callable[[bytes], Awaitable[tuple[str, str]]] | None = None
    commit_live_input_stream: Callable[[VoiceWsState], Awaitable[bool]] | None = None
    runtime_architecture: str = "hybrid"
    stream_live_audio_turn: Callable[..., Awaitable[tuple[str, str, str, float, int]]] | None = None


def build_session_init_request(
    data: dict[str, Any],
    *,
    deps: SessionEngineDeps,
) -> SessionInitRequest:
    requested_session_type = data.get("sessionType", "live_interview")
    session_type = (
        requested_session_type
        if requested_session_type in VALID_SESSION_TYPES
        else "live_interview"
    )
    return SessionInitRequest(
        session_id=str(data.get("sessionId") or "").strip(),
        session_type=session_type,
        llm_stream_mode=deps.normalize_llm_stream_mode(data.get("llmStreamMode")),
        tts_mode=deps.normalize_tts_mode(data.get("ttsMode")),
    )


async def handle_session_init(
    ws: WebSocket,
    state: VoiceWsState,
    data: dict[str, Any],
    *,
    deps: SessionEngineDeps,
) -> None:
    request = build_session_init_request(data, deps=deps)

    if state.live_interview is not None:
        await state.live_interview.close()
    state.live_interview = deps.create_live_interview_session()
    deps.reset_voice_runtime_state(
        state,
        llm_stream_mode=request.llm_stream_mode,
        tts_mode=request.tts_mode,
    )

    if not request.session_id:
        await deps.send_json(
            ws,
            {
                "type": "error",
                "message": "sessionId is required. Start the interview session via the authenticated HTTP route first.",
            },
        )
        return

    existing_session = await asyncio.to_thread(deps.get_session, request.session_id)
    if not existing_session or str(existing_session.get("session_type") or "") != request.session_type:
        await deps.send_json(
            ws,
            {
                "type": "error",
                "message": "interview session not found or session type mismatch",
            },
        )
        return

    existing_turns = await asyncio.to_thread(deps.get_turns, request.session_id)
    reconnect_deadline_at = existing_session.get("reconnect_deadline_at")
    if (
        existing_turns
        and str(existing_session.get("status") or "") != "completed"
        and isinstance(reconnect_deadline_at, datetime)
    ):
        normalized_deadline = (
            reconnect_deadline_at
            if reconnect_deadline_at.tzinfo
            else reconnect_deadline_at.replace(tzinfo=timezone.utc)
        )
        if normalized_deadline <= datetime.now(timezone.utc):
            expired_session = await asyncio.to_thread(
                deps.mark_runtime_expired,
                request.session_id,
            )
            if expired_session:
                existing_session = expired_session
            await deps.send_json(
                ws,
                {
                    "type": "connection.expired",
                    "sessionId": request.session_id,
                    "message": "재연결 가능 시간이 만료되었습니다. 면접을 다시 시작해 주세요.",
                },
            )
            return

    if existing_turns:
        resumed = await deps.resume_existing_session(
            ws,
            state,
            session=existing_session,
            turns=existing_turns,
        )
        if resumed:
            return

    connected_session = await asyncio.to_thread(
        deps.mark_runtime_connected,
        existing_session["id"],
        live_provider=state.live_interview.provider if state.live_interview is not None else "gemini-live",
        live_model=deps.live_active_model(state),
    )
    if connected_session:
        existing_session = connected_session
    deps.hydrate_state_from_session_row(state, existing_session, turns=existing_turns)

    await deps.send_json(
        ws,
        {
            "type": "interview-session-created",
            "client_uid": existing_session["id"],
            "mode": "voice",
            "sessionType": state.session_type,
            "targetDurationSec": state.target_duration_sec,
            "closingThresholdSec": state.closing_threshold_sec,
            "estimatedTotalQuestions": state.estimated_total_questions,
            "runtimeMode": state.runtime_mode,
            "runtimeReason": state.runtime_mode_reason,
            "retryAfterSec": 0,
            "llmStreamMode": state.llm_stream_mode,
            "ttsMode": state.tts_mode,
            "resumed": False,
        },
    )
    await deps.send_json(
        ws,
        {
            "type": "connection.ready",
            "sessionId": existing_session["id"],
            "message": "실시간 면접 연결이 준비되었습니다.",
        },
    )
    await deps.send_avatar_state(ws, "idle", existing_session["id"])
    await deps.send_json(
        ws,
        {
            "type": "interview-phase-updated",
            "phase": "introduction",
            "guide": "voice pipeline connected",
            "message": "음성 면접 실시간 파이프라인이 시작되었습니다.",
        },
    )
    generated = await deps.generate_and_send_opening_live_turn(ws, state)
    if not generated:
        logger.warning(
            "opening turn generation failed; recreating live session once (session=%s, runtime_mode=%s, phase=%s)",
            state.session_id,
            state.runtime_mode,
            state.current_phase,
        )
        if state.live_interview is not None:
            await state.live_interview.close()
        state.live_interview = deps.create_live_interview_session()
        generated = await deps.generate_and_send_opening_live_turn(ws, state)
        if not generated:
            logger.error(
                "opening turn generation failed after retry (session=%s, runtime_mode=%s, phase=%s)",
                state.session_id,
                state.runtime_mode,
                state.current_phase,
            )
            await deps.send_json(
                ws,
                {
                    "type": "error",
                    "message": "첫 질문 음성을 생성하지 못했습니다. 새로고침 후 다시 시작해 주세요.",
                },
            )
            return


async def process_user_utterance(
    ws: WebSocket,
    state: VoiceWsState,
    wav_bytes: bytes,
    *,
    deps: SessionEngineDeps,
    vad_meta: dict[str, Any] | None = None,
    runtime_mode_disabled: str,
    closing_sentence: str,
) -> None:
    if not state.session_id or state.processing_audio:
        return

    state.processing_audio = True
    user_turn_started_at = time.monotonic()
    utterance_duration_ms = deps.estimate_wav_duration_ms(wav_bytes)
    effective_vad_meta = dict(vad_meta or state.last_vad_event or {})

    try:
        if state.active_question_turn_id:
            state.active_question_heard_audio = True
        if not await deps.send_json(ws, {"type": "control", "text": "mic-audio-end"}):
            return
        if not await deps.send_avatar_state(ws, "thinking", state.session_id):
            return
        state.runtime_status = "model_thinking"
        await deps.set_runtime_status(state.session_id, "model_thinking", state.current_phase)
        await deps.send_runtime_meta_snapshot(ws, state)

        architecture = _runtime_architecture(deps)
        if architecture == "live-only" and deps.commit_live_input_stream is not None and state.live_input_turn_active:
            await deps.commit_live_input_stream(state)

        (
            streamed_turn_id,
            streamed_user_text,
            streamed_ai_text,
            streamed_provider_name,
            streamed_audio_duration_sec,
            streamed_audio_chunk_count,
        ) = _capture_live_input_stream_state(state)

        live = deps.get_or_create_live_interview(state)
        user_followup_spec = prepare_live_user_followup(
            state,
            runtime_timing=deps.runtime_timing,
        )
        if not live.enabled:
            await deps.set_runtime_mode(ws, state, runtime_mode_disabled, "live-disabled")
            await deps.send_json(
                ws,
                {
                    "type": "warning",
                    "message": "Gemini Live single session is disabled. Set GEMINI_API_KEY to enable voice interview.",
                },
            )
            await deps.resume_listening(ws, state)
            return

        next_turn_id = streamed_turn_id or deps.next_ai_turn_id(state.session_id)
        live_ai_text = ""
        prepared_live_audio = None
        followup_provider_name = live.provider
        audio_already_streamed = False
        if architecture == "live-only":
            if _has_captured_live_input_stream_result(
                turn_id=streamed_turn_id,
                user_text=streamed_user_text,
                ai_text=streamed_ai_text,
                audio_duration_sec=streamed_audio_duration_sec,
                audio_chunk_count=streamed_audio_chunk_count,
            ):
                live_user_text = streamed_user_text
                live_ai_text = streamed_ai_text
                followup_provider_name = streamed_provider_name or live.provider
                audio_already_streamed = streamed_audio_duration_sec > 0 or streamed_audio_chunk_count > 0
            else:
                hint_text = sanitize_user_turn_text(state.realtime_user_transcript)
                live_request = prepare_live_user_request(
                    state,
                    followup_spec=user_followup_spec,
                    closing_sentence=closing_sentence,
                    build_answer_quality_hint=deps.build_answer_quality_hint,
                    derive_question_type_preference=deps.derive_question_type_preference,
                    select_next_question_type=deps.select_next_question_type,
                    prompt_user_text=hint_text,
                )
                if deps.stream_live_audio_turn is not None:
                    (
                        live_user_text,
                        live_ai_text,
                        followup_provider_name,
                        streamed_audio_duration_sec,
                        streamed_audio_chunk_count,
                    ) = await deps.stream_live_audio_turn(
                        ws,
                        state,
                        turn_id=next_turn_id,
                        wav_bytes=wav_bytes,
                        question_type=live_request.planned_question_type or None,
                        answer_quality_hint=live_request.answer_quality_hint,
                        prompt_user_text=live_request.prompt_user_text,
                        extra_instruction=live_request.extra_instruction,
                    )
                    audio_already_streamed = streamed_audio_duration_sec > 0 and streamed_audio_chunk_count > 0
                else:
                    live_user_text, live_ai_text, prepared_live_audio, followup_provider_name = await deps.request_live_audio_turn(
                        state,
                        wav_bytes=wav_bytes,
                        question_type=live_request.planned_question_type or None,
                        answer_quality_hint=live_request.answer_quality_hint,
                        prompt_user_text=live_request.prompt_user_text,
                        extra_instruction=live_request.extra_instruction,
                    )
            user_text = sanitize_user_turn_text(live_user_text)
            user_provider_name = (followup_provider_name or live.provider or "").strip()
        else:
            user_text, user_provider_name = await _transcribe_user_audio(deps, wav_bytes)
            user_text = sanitize_user_turn_text(user_text)
            user_provider_name = (user_provider_name or "").strip()

        transcription_missing = False
        if not user_text:
            if architecture == "live-only" and _should_accept_missing_user_transcript(
                live_ai_text=live_ai_text,
                live_prepared_tts=prepared_live_audio,
                utterance_duration_ms=utterance_duration_ms,
            ):
                transcription_missing = True
                user_text = "음성 답변(전사 누락)"
                logger.warning(
                    "accepting live-only user turn without transcript after STT miss (session=%s, duration_ms=%s)",
                    state.session_id,
                    round(utterance_duration_ms, 1),
                )
            elif utterance_duration_ms >= 1200:
                transcription_missing = True
                user_text = "음성 답변(전사 누락)"
                logger.warning(
                    "accepting user turn without transcript after live STT miss (session=%s, duration_ms=%s)",
                    state.session_id,
                    round(utterance_duration_ms, 1),
                )
            else:
                deps.reset_realtime_user_transcript(state)
                if utterance_duration_ms <= 900:
                    if await _request_retry_for_silent_turn(ws, state, deps=deps):
                        return
                await deps.resume_listening(ws, state)
                return

        if not transcription_missing:
            await deps.emit_realtime_user_delta(ws, state, user_text)
        if not transcription_missing and deps.is_probable_ai_echo(state, user_text, wav_bytes):
            logger.info(
                "suppressed probable ai echo from STT (text=%r, session_id=%s)",
                user_text,
                state.session_id,
            )
            await deps.resume_listening(ws, state)
            return

        state.last_answer_quality_hint = (
            "" if transcription_missing else deps.build_answer_quality_hint(user_text)
        )
        if not transcription_missing:
            deps.remember_user_turn(state, user_text)
        user_request_spec = prepare_live_user_request(
            state,
            followup_spec=user_followup_spec,
            closing_sentence=closing_sentence,
            build_answer_quality_hint=deps.build_answer_quality_hint,
            derive_question_type_preference=deps.derive_question_type_preference,
            select_next_question_type=deps.select_next_question_type,
            prompt_user_text=("방금 말씀하신 경험" if transcription_missing else user_text),
        )
        if architecture == "live-only":
            user_request_spec = replace(user_request_spec, planned_question_text="")

        user_turn_payload = build_voice_user_turn_payload(
            provider=user_provider_name,
            runtime_mode=state.runtime_mode,
            runtime_reason=state.runtime_mode_reason,
            speech_duration_ms=round(utterance_duration_ms, 1),
            stt_text_len=len(user_text),
            live_model=deps.live_active_model(state),
            vad=effective_vad_meta,
            vad_config=deps.snapshot_vad_config(state),
            answer_quality_hint=state.last_answer_quality_hint,
            memory_snapshot=deps.build_memory_snapshot(state),
            architecture=architecture,
        )
        if transcription_missing:
            user_turn_payload["transcription_missing"] = True
        _persist_turn_background(
            deps,
            state,
            role="user",
            content=user_text,
            channel="voice",
            payload=user_turn_payload,
        )
        if not transcription_missing and not await deps.send_transcript(ws, state.session_id, "user", user_text):
            return

        deps.reset_realtime_user_transcript(state)
        deps.log_runtime_event(
            "user-turn",
            state,
            phase=state.current_phase,
            question_count=state.model_turn_count,
            provider=user_provider_name,
            speech_duration_ms=round(utterance_duration_ms, 1),
            stt_text_len=len(user_text),
            vad_reason=effective_vad_meta.get("reason"),
            transcription_missing=transcription_missing,
            architecture=architecture,
        )

        is_short_answer = deps.is_short_stt_result(user_text, wav_bytes)
        deps.retune_vad_for_next_turn(
            state,
            utterance_duration_ms=utterance_duration_ms,
            short_answer=is_short_answer,
        )

        followup_generated = await execute_live_user_followup_turn(
            ws,
            state,
            spec=user_followup_spec,
            user_request=user_request_spec,
            next_turn_id=next_turn_id,
            live_ai_text=live_ai_text or user_request_spec.planned_question_text,
            prepared_live_audio=prepared_live_audio,
            provider_name=followup_provider_name or live.provider,
            active_live_provider=live.provider,
            utterance_duration_ms=utterance_duration_ms,
            vad_meta=effective_vad_meta,
            started_at=user_turn_started_at,
            deps=deps.runtime_executor_deps(),
            audio_already_streamed=audio_already_streamed,
            streamed_audio_duration_sec=streamed_audio_duration_sec,
            streamed_audio_chunk_count=streamed_audio_chunk_count,
            streamed_audio_provider=followup_provider_name or live.provider,
        )
        _clear_live_input_stream_state(state)
        if not followup_generated:
            logger.warning(
                "followup generation finished without deliverable turn; keeping current listening state (session=%s)",
                state.session_id,
            )
    except Exception as exc:
        logger.exception("voice turn processing error", extra={"session_id": state.session_id})
        sent = await deps.send_json(
            ws,
            {
                "type": "error",
                "message": f"voice pipeline error: {exc}",
            },
        )
        if sent:
            await deps.resume_listening(ws, state)
    finally:
        if _runtime_architecture(deps) == "live-only":
            _clear_live_input_stream_state(state)
        state.processing_audio = False


async def drain_pending_user_segments(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    deps: SessionEngineDeps,
    runtime_mode_disabled: str,
    closing_sentence: str,
) -> None:
    if not state.pending_user_segments:
        state.pending_segment_resume_ms = 0.0
        if _runtime_architecture(deps) == "live-only" and _has_live_input_stream_result(state):
            await process_user_utterance(
                ws,
                state,
                b"",
                deps=deps,
                vad_meta=state.last_vad_event,
                runtime_mode_disabled=runtime_mode_disabled,
                closing_sentence=closing_sentence,
            )
        return
    if state.processing_audio:
        async def retry() -> None:
            try:
                await asyncio.sleep(0.25)
            except asyncio.CancelledError:
                return
            await drain_pending_user_segments(
                ws,
                state,
                deps=deps,
                runtime_mode_disabled=runtime_mode_disabled,
                closing_sentence=closing_sentence,
            )

        if not state.pending_user_segment_task or state.pending_user_segment_task.done():
            state.pending_user_segment_task = asyncio.create_task(retry())
        return

    segments = state.pending_user_segments[:]
    state.pending_user_segments.clear()
    state.pending_segment_resume_ms = 0.0
    merged_wav = deps.merge_wav_segments([segment.audio for segment in segments])
    if not merged_wav:
        return
    merged_vad_meta = deps.merge_vad_events([segment.vad for segment in segments])
    state.last_vad_event = dict(merged_vad_meta)
    await process_user_utterance(
        ws,
        state,
        merged_wav,
        deps=deps,
        vad_meta=merged_vad_meta,
        runtime_mode_disabled=runtime_mode_disabled,
        closing_sentence=closing_sentence,
    )


async def enqueue_user_segment(
    ws: WebSocket,
    state: VoiceWsState,
    segment: bytes,
    *,
    deps: SessionEngineDeps,
    vad_meta: dict[str, Any] | None = None,
    flush_now: bool = False,
    runtime_mode_disabled: str,
    closing_sentence: str,
) -> None:
    if segment:
        state.pending_user_segments.append(PendingUserSegment(audio=segment, vad=dict(vad_meta or {})))
        state.pending_segment_resume_ms = 0.0

    if state.pending_user_segment_task and not state.pending_user_segment_task.done():
        state.pending_user_segment_task.cancel()
        state.pending_user_segment_task = None

    reason = str((vad_meta or {}).get("reason") or "").strip().lower()
    if flush_now:
        await drain_pending_user_segments(
            ws,
            state,
            deps=deps,
            runtime_mode_disabled=runtime_mode_disabled,
            closing_sentence=closing_sentence,
        )
        return

    drain_delay_sec = _segment_drain_delay_sec(
        state,
        reason=reason,
        architecture=_runtime_architecture(deps),
    )

    async def delayed_drain() -> None:
        current_task = asyncio.current_task()
        try:
            await asyncio.sleep(drain_delay_sec)
        except asyncio.CancelledError:
            return
        await drain_pending_user_segments(
            ws,
            state,
            deps=deps,
            runtime_mode_disabled=runtime_mode_disabled,
            closing_sentence=closing_sentence,
        )
        if state.pending_user_segment_task is current_task:
            state.pending_user_segment_task = None

    state.pending_user_segment_task = asyncio.create_task(delayed_drain())
