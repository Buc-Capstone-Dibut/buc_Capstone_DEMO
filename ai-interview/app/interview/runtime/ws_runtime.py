from __future__ import annotations

import logging
import re
import time
from itertools import count
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.config import settings
from app.interview.domain.interview_memory import (
    build_memory_snapshot as domain_build_memory_snapshot,
    compact_context_text as domain_compact_context_text,
    derive_question_type_preference as domain_derive_question_type_preference,
    question_type_label as domain_question_type_label,
    record_question_type as domain_record_question_type,
    remember_model_turn as domain_remember_model_turn,
    remember_user_turn as domain_remember_user_turn,
    select_next_question_type as domain_select_next_question_type,
)
from app.interview.domain.turn_text import (
    build_answer_quality_hint as domain_build_answer_quality_hint,
    looks_like_complete_ai_question as domain_looks_like_complete_ai_question,
    looks_like_complete_answer as domain_looks_like_complete_answer,
    sanitize_ai_turn_text as domain_sanitize_ai_turn_text,
    sanitize_user_turn_text as domain_sanitize_user_turn_text,
)
from app.interview.domain.pacing import (
    DEFAULT_CLOSING_THRESHOLD_SEC,
    DEFAULT_TARGET_DURATION_SEC,
    RECONNECT_GRACE_SEC,
    estimated_total_questions,
)
from app.interview.runtime.state import (
    AiDeliveryPlan,
    PreparedTtsAudio,
    VoiceWsState,
)
from app.interview.runtime.service_adapter import RuntimeServiceAdapter
from app.interview.runtime.session_interaction import (
    arm_playback_resume as runtime_arm_playback_resume,
    emit_realtime_user_delta as runtime_emit_realtime_user_delta,
    is_probable_ai_echo as runtime_is_probable_ai_echo,
    log_runtime_event as runtime_log_runtime_event,
    resume_listening as runtime_resume_listening,
)
from app.interview.runtime.session_support import (
    create_live_interview_session as runtime_create_live_interview_session,
    get_live_stt_service as runtime_get_live_stt_service,
    latest_user_answer as runtime_latest_user_answer,
)
from app.interview.runtime.vad_policy import retune_vad_for_next_turn as runtime_retune_vad_for_next_turn
from app.interview.runtime.voice_support import (
    LLM_STREAM_MODES,
    TTS_MODES,
    coerce_audio_chunk as runtime_coerce_audio_chunk,
    estimate_wav_duration_ms as runtime_estimate_wav_duration_ms,
    is_short_stt_result as runtime_is_short_stt_result,
    live_active_model as runtime_live_active_model,
    merge_vad_events as runtime_merge_vad_events,
    merge_wav_segments as runtime_merge_wav_segments,
    normalize_compare_text as runtime_normalize_compare_text,
    normalize_llm_stream_mode as runtime_normalize_llm_stream_mode,
    normalize_tts_mode as runtime_normalize_tts_mode,
    pcm16le_bytes_to_base64_chunks as runtime_pcm16le_bytes_to_base64_chunks,
    reset_voice_runtime_state as runtime_reset_voice_runtime_state,
    snapshot_vad_config as runtime_snapshot_vad_config,
    to_chat_history as runtime_to_chat_history,
)
from app.interview.runtime.client_session import run_client_session
from app.interview.runtime.lifecycle import (
    cleanup_connection as runtime_cleanup_connection,
    send_connection_handshake,
)
from app.interview.runtime.message_router import handle_client_message
from app.interview.runtime.session_engine import handle_session_init
from app.interview.runtime.turn_entrypoints import (
    drain_pending_user_segments as runtime_entrypoint_drain_pending_user_segments,
    enqueue_user_segment as runtime_entrypoint_enqueue_user_segment,
    generate_and_send_opening_live_turn as runtime_generate_and_send_opening_live_turn,
    generate_and_send_resume_live_turn as runtime_generate_and_send_resume_live_turn,
    process_user_utterance as runtime_entrypoint_process_user_utterance,
)
from app.interview.runtime.live_turns import prepare_live_user_followup
from app.interview.runtime.session_resume import SessionResumeDeps, resume_existing_session
from app.interview.runtime.delivery import (
    ReplayLastModelTurnDeps,
    build_ai_delivery_plan as runtime_build_ai_delivery_plan,
    remember_ai_tts as runtime_remember_ai_tts,
    replay_last_model_turn as runtime_replay_last_model_turn,
    send_prepared_tts_audio as runtime_send_prepared_tts_audio,
    stream_prepared_ai_delivery as runtime_stream_prepared_ai_delivery,
    to_prepared_tts_audio_from_pcm as runtime_to_prepared_tts_audio_from_pcm,
)
from app.interview.runtime.live_client import (
    begin_live_audio_input_stream as runtime_begin_live_audio_input_stream,
    build_live_session_instruction as runtime_build_live_session_instruction,
    build_live_turn_prompt as runtime_build_live_turn_prompt,
    commit_live_audio_input_stream as runtime_commit_live_audio_input_stream,
    get_or_create_live_interview as runtime_get_or_create_live_interview,
    push_live_audio_input_chunk as runtime_push_live_audio_input_chunk,
    repair_ai_turn_if_truncated as runtime_repair_ai_turn_if_truncated,
    request_live_audio_turn as runtime_request_live_audio_turn,
    request_live_spoken_text_turn as runtime_request_live_spoken_text_turn,
    request_live_text_turn as runtime_request_live_text_turn,
    stream_live_audio_turn as runtime_stream_live_audio_turn,
)
from app.interview.runtime.ws_runtime_wiring import (
    build_client_message_router_deps,
    build_client_session_deps,
    build_live_client_deps,
    build_resume_listening_deps,
    build_runtime_executor_deps,
    build_runtime_lifecycle_deps,
    build_session_engine_deps,
)
from app.interview.runtime.transport import (
    cancel_playback_resume_task as _cancel_playback_resume_task,
    send_avatar_state as _send_avatar_state,
    send_cached_turn_history as _send_cached_turn_history,
    send_json as _send_json,
    send_runtime_meta_snapshot as _send_runtime_meta_snapshot,
    send_transcript as _send_transcript,
    send_transcript_delta as _send_transcript_delta,
    set_runtime_mode as _set_runtime_mode,
)
from app.interview.transcript.runtime_cache import (
    reset_realtime_user_transcript as cache_reset_realtime_user_transcript,
)
from app.interview.transcript.session_state import (
    hydrate_state_from_session_row as transcript_hydrate_state_from_session_row,
    mark_session_status as transcript_mark_session_status,
    reconnect_remaining_sec as transcript_reconnect_remaining_sec,
    runtime_timing as transcript_runtime_timing,
)
from app.services.gemini_live_voice_service import GeminiLiveInterviewSession
from app.services.interview_service import InterviewService

service = InterviewService()
service_adapter = RuntimeServiceAdapter(service)
logger = logging.getLogger("dibut.ws")

CLOSING_SENTENCE = "수고하셨습니다. 이것으로 모든 면접을 마치겠습니다."
AI_TURN_SEQ = count(1)
RUNTIME_MODE_LIVE_SINGLE = "live-single"
RUNTIME_MODE_DISABLED = "disabled"
VOICE_TURN_END_GRACE_SEC = max(0.08, settings.voice_turn_end_grace_ms / 1000.0)
VOICE_AI_ECHO_GUARD_SEC = max(0.5, settings.voice_ai_echo_guard_ms / 1000.0)
VOICE_AI_PLAYBACK_SKEW_SEC = 0.35
LIVE_OPENING_PROMPT = (
    "면접을 시작하세요. 간단한 인사 후 2~3문장으로 맥락을 짚고, "
    "마지막 문장에서 첫 질문 1개를 구체적으로 하세요. "
    "질문 외 메타설명은 금지합니다."
)


def _next_ai_turn_id(session_id: str) -> str:
    return f"{session_id}:{next(AI_TURN_SEQ)}"


def _resume_listening_deps():
    return build_resume_listening_deps(
        cancel_playback_resume_task=_cancel_playback_resume_task,
        set_runtime_status=service_adapter.set_runtime_status,
        send_json=_send_json,
        send_avatar_state=_send_avatar_state,
        send_runtime_meta_snapshot=_send_runtime_meta_snapshot,
        logger=logger,
    )


def _live_client_deps():
    return build_live_client_deps(
        create_live_interview_session=runtime_create_live_interview_session,
        build_session_instruction=_build_live_session_instruction,
        build_turn_prompt=_build_live_turn_prompt,
        to_prepared_tts_audio_from_pcm=_to_prepared_tts_audio_from_pcm,
        sanitize_ai_turn_text=domain_sanitize_ai_turn_text,
        looks_like_complete_ai_question=domain_looks_like_complete_ai_question,
    )


def _runtime_executor_deps():
    return build_runtime_executor_deps(
        request_live_spoken_text_turn=_request_live_spoken_text_turn,
        request_live_text_turn=_request_live_text_turn,
        repair_ai_turn_if_truncated=_repair_ai_turn_if_truncated,
        looks_like_complete_ai_question=domain_looks_like_complete_ai_question,
        enable_ai_question_repair=settings.voice_enable_ai_question_repair,
        enable_ai_audio_recovery=settings.voice_enable_ai_audio_recovery,
        build_ai_delivery_plan=_build_ai_delivery_plan,
        persist_turn=service_adapter.persist_turn,
        set_runtime_status=service_adapter.set_runtime_status,
        update_session_status=service_adapter.update_session_status,
        set_closing_announced=service_adapter.set_closing_announced,
        mark_session_status=transcript_mark_session_status,
        log_runtime_event=lambda event, state, turn_id="", **fields: runtime_log_runtime_event(
            logger,
            event,
            state,
            live_active_model=runtime_live_active_model,
            turn_id=turn_id,
            **fields,
        ),
        send_json=_send_json,
        send_transcript=_send_transcript,
        stream_prepared_ai_delivery=_stream_prepared_ai_delivery,
        arm_playback_resume=_arm_playback_resume,
        resume_listening=_resume_listening,
        reconnect_remaining_sec=transcript_reconnect_remaining_sec,
        live_active_model=runtime_live_active_model,
        snapshot_vad_config=runtime_snapshot_vad_config,
        build_memory_snapshot=domain_build_memory_snapshot,
        remember_model_turn=domain_remember_model_turn,
        record_question_type=domain_record_question_type,
        remember_streamed_ai_audio=_remember_streamed_ai_audio,
    )


def _session_engine_deps():
    return build_session_engine_deps(
        create_live_interview_session=runtime_create_live_interview_session,
        normalize_llm_stream_mode=runtime_normalize_llm_stream_mode,
        normalize_tts_mode=runtime_normalize_tts_mode,
        reset_voice_runtime_state=_reset_voice_runtime_state,
        get_session=service.get_session,
        get_turns=service.get_turns,
        mark_runtime_expired=service.mark_runtime_expired,
        mark_runtime_connected=service.mark_runtime_connected,
        hydrate_state_from_session_row=transcript_hydrate_state_from_session_row,
        resume_existing_session=_resume_existing_session,
        generate_and_send_opening_live_turn=_generate_and_send_opening_live_turn,
        send_json=_send_json,
        send_avatar_state=_send_avatar_state,
        send_runtime_meta_snapshot=_send_runtime_meta_snapshot,
        live_active_model=runtime_live_active_model,
        set_runtime_mode=_set_runtime_mode,
        set_runtime_status=service_adapter.set_runtime_status,
        get_or_create_live_interview=_get_or_create_live_interview,
        build_answer_quality_hint=domain_build_answer_quality_hint,
        derive_question_type_preference=domain_derive_question_type_preference,
        select_next_question_type=domain_select_next_question_type,
        request_live_audio_turn=_request_live_audio_turn,
        stream_live_audio_turn=_stream_live_audio_turn,
        fallback_transcribe_user_audio=None,
        transcribe_user_audio=_transcribe_user_audio,
        runtime_architecture=settings.voice_runtime_architecture,
        emit_realtime_user_delta=_emit_realtime_user_delta,
        is_probable_ai_echo=lambda state, text, wav_bytes: _is_probable_ai_echo(state, text, wav_bytes),
        reset_realtime_user_transcript=cache_reset_realtime_user_transcript,
        remember_user_turn=domain_remember_user_turn,
        persist_turn=service_adapter.persist_turn,
        send_transcript=_send_transcript,
        log_runtime_event=lambda event, state, turn_id="", **fields: runtime_log_runtime_event(
            logger,
            event,
            state,
            live_active_model=runtime_live_active_model,
            turn_id=turn_id,
            **fields,
        ),
        is_short_stt_result=lambda text, wav_bytes: runtime_is_short_stt_result(
            text,
            wav_bytes,
            looks_like_complete_answer=domain_looks_like_complete_answer,
        ),
        retune_vad_for_next_turn=runtime_retune_vad_for_next_turn,
        runtime_timing=transcript_runtime_timing,
        runtime_executor_deps=_runtime_executor_deps,
        estimate_wav_duration_ms=runtime_estimate_wav_duration_ms,
        snapshot_vad_config=runtime_snapshot_vad_config,
        build_memory_snapshot=domain_build_memory_snapshot,
        merge_wav_segments=runtime_merge_wav_segments,
        merge_vad_events=runtime_merge_vad_events,
        resume_listening=_resume_listening,
        next_ai_turn_id=_next_ai_turn_id,
        commit_live_input_stream=_commit_live_input_stream,
    )

def _client_message_router_deps():
    return build_client_message_router_deps(
        runtime_architecture=settings.voice_runtime_architecture,
        send_json=_send_json,
        send_avatar_state=_send_avatar_state,
        handle_session_init=lambda ws, state, data: handle_session_init(
            ws,
            state,
            data,
            deps=_session_engine_deps(),
        ),
        coerce_audio_chunk=runtime_coerce_audio_chunk,
        enqueue_user_segment=_enqueue_user_segment,
        begin_live_input_stream=_begin_live_input_stream,
        push_live_input_audio_chunk=_push_live_input_audio_chunk,
        reset_realtime_user_transcript=cache_reset_realtime_user_transcript,
        resume_listening=_resume_listening,
        cancel_playback_resume_task=_cancel_playback_resume_task,
    )

def _reset_voice_runtime_state(
    state: VoiceWsState,
    *,
    llm_stream_mode: str,
    tts_mode: str,
) -> None:
    runtime_reset_voice_runtime_state(
        state,
        llm_stream_mode=llm_stream_mode,
        tts_mode=tts_mode,
        default_target_duration_sec=DEFAULT_TARGET_DURATION_SEC,
        default_closing_threshold_sec=DEFAULT_CLOSING_THRESHOLD_SEC,
        estimated_total_questions=estimated_total_questions,
        runtime_mode_live_single=RUNTIME_MODE_LIVE_SINGLE,
        runtime_mode_disabled=RUNTIME_MODE_DISABLED,
        turn_end_grace_sec=VOICE_TURN_END_GRACE_SEC,
        cancel_playback_resume_task=_cancel_playback_resume_task,
    )


def _arm_playback_resume(ws: WebSocket, state: VoiceWsState, *, turn_id: str, timeout_sec: float) -> None:
    runtime_arm_playback_resume(
        ws,
        state,
        turn_id=turn_id,
        timeout_sec=timeout_sec,
        resume_listening_fn=_resume_listening,
        deps=_resume_listening_deps(),
    )


async def _replay_last_model_turn(
    ws: WebSocket,
    state: VoiceWsState,
) -> bool:
    try:
        return await runtime_replay_last_model_turn(
            ws,
            state,
            next_turn_id=_next_ai_turn_id,
            deps=ReplayLastModelTurnDeps(
                build_ai_delivery_plan=_build_ai_delivery_plan,
                set_runtime_status=service_adapter.set_runtime_status,
                send_json=_send_json,
                send_runtime_meta_snapshot=_send_runtime_meta_snapshot,
                stream_prepared_ai_delivery=_stream_prepared_ai_delivery,
                log_runtime_event=_log_runtime_event,
                arm_playback_resume=_arm_playback_resume,
                resume_listening=_resume_listening,
            ),
        )
    except Exception:
        logger.warning(
            "failed to replay last model turn",
            extra={"session_id": state.session_id},
            exc_info=True,
        )
        return False


async def _resume_existing_session(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    session: dict[str, Any],
    turns: list[dict[str, Any]],
) -> bool:
    return await resume_existing_session(
        ws,
        state,
        session=session,
        turns=turns,
        deps=SessionResumeDeps(
            mark_runtime_resumed=service_adapter.mark_runtime_resumed,
            mark_runtime_connected=service_adapter.mark_runtime_connected,
            hydrate_state_from_session_row=transcript_hydrate_state_from_session_row,
            send_json=_send_json,
            send_avatar_state=_send_avatar_state,
            send_cached_turn_history=_send_cached_turn_history,
            send_runtime_meta_snapshot=_send_runtime_meta_snapshot,
            replay_last_model_turn=_replay_last_model_turn,
            generate_and_send_resume_live_turn=_generate_and_send_resume_live_turn,
            resume_listening=_resume_listening,
            live_active_model=runtime_live_active_model,
        ),
    )


def _remember_ai_tts(state: VoiceWsState, text: str, prepared: PreparedTtsAudio | None) -> None:
    runtime_remember_ai_tts(
        state,
        text,
        prepared,
        playback_skew_sec=VOICE_AI_PLAYBACK_SKEW_SEC,
        audio_guard_sec=VOICE_AI_ECHO_GUARD_SEC,
    )


def _remember_streamed_ai_audio(
    state: VoiceWsState,
    text: str,
    duration_sec: float,
    provider: str,
) -> None:
    _remember_ai_tts(
        state,
        text,
        PreparedTtsAudio(
            chunks=["streamed"],
            sample_rate=24000,
            provider=provider or "gemini-live-single",
            duration_sec=max(0.0, float(duration_sec or 0.0)),
        ),
    )


def _is_probable_ai_echo(state: VoiceWsState, text: str, wav_bytes: bytes) -> bool:
    if time.monotonic() > state.last_ai_audio_guard_until:
        return False
    return runtime_is_probable_ai_echo(
        state,
        text,
        wav_bytes,
        normalize_compare_text=runtime_normalize_compare_text,
        estimate_wav_duration_ms=runtime_estimate_wav_duration_ms,
        voice_min_answer_chars=settings.voice_min_answer_chars,
    )


async def _resume_listening(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    turn_id: str | None = None,
) -> None:
    await runtime_resume_listening(
        ws,
        state,
        turn_id=turn_id,
        deps=_resume_listening_deps(),
    )

def _log_runtime_event(
    event: str,
    state: VoiceWsState,
    *,
    turn_id: str = "",
    **fields: Any,
) -> None:
    runtime_log_runtime_event(
        logger,
        event,
        state,
        live_active_model=runtime_live_active_model,
        turn_id=turn_id,
        **fields,
    )


def _build_live_session_instruction(state: VoiceWsState) -> str:
    return runtime_build_live_session_instruction(
        state,
        compact_context_text=domain_compact_context_text,
    )


def _build_live_turn_prompt(
    state: VoiceWsState,
    *,
    question_type: str | None = None,
    answer_quality_hint: str = "",
    user_text: str = "",
    extra_instruction: str = "",
) -> str:
    return runtime_build_live_turn_prompt(
        state,
        question_type=question_type,
        answer_quality_hint=answer_quality_hint,
        user_text=user_text,
        extra_instruction=extra_instruction,
        question_type_label=domain_question_type_label,
        build_memory_snapshot=domain_build_memory_snapshot,
        compact_context_text=domain_compact_context_text,
    )


async def _build_ai_delivery_plan(
    ws: WebSocket,
    *,
    text: str,
    turn_id: str,
    preferred_full_audio: PreparedTtsAudio | None = None,
) -> AiDeliveryPlan:
    del ws
    del turn_id
    return await runtime_build_ai_delivery_plan(
        text=text,
        preferred_full_audio=preferred_full_audio,
    )


async def _stream_prepared_ai_delivery(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    delivery_plan: AiDeliveryPlan,
    turn_id: str,
    emit_delta: bool,
    starting_seq: int = 0,
) -> bool:
    return await runtime_stream_prepared_ai_delivery(
        ws,
        state,
        delivery_plan=delivery_plan,
        turn_id=turn_id,
        emit_delta=emit_delta,
        starting_seq=starting_seq,
        remember_ai_tts_fn=_remember_ai_tts,
        send_transcript_delta=_send_transcript_delta,
        send_avatar_state=_send_avatar_state,
        send_prepared_tts_audio_fn=_send_prepared_tts_audio,
    )


async def _emit_realtime_user_delta(
    ws: WebSocket,
    state: VoiceWsState,
    text: str,
) -> None:
    if not state.session_id:
        return

    cleaned = domain_sanitize_user_turn_text(text)
    if not cleaned or cleaned == state.realtime_user_transcript:
        return

    previous = state.realtime_user_transcript
    if cleaned.startswith(previous):
        delta = cleaned[len(previous):]
    else:
        delta = cleaned

    state.realtime_user_transcript = cleaned
    state.realtime_user_delta_seq += 1
    if not delta:
        return

    await _send_transcript_delta(
        ws,
        state.session_id,
        "user",
        delta,
        cleaned,
        state.realtime_user_delta_seq,
    )


def _to_prepared_tts_audio_from_pcm(
    pcm_bytes: bytes,
    *,
    sample_rate: int,
    provider: str,
) -> PreparedTtsAudio | None:
    return runtime_to_prepared_tts_audio_from_pcm(
        pcm_bytes,
        sample_rate=sample_rate,
        provider=provider,
        pcm_to_base64_chunks=runtime_pcm16le_bytes_to_base64_chunks,
    )


async def _transcribe_user_audio(wav_bytes: bytes) -> tuple[str, str]:
    if not wav_bytes:
        return "", ""
    try:
        result = await runtime_get_live_stt_service().transcribe_wav(wav_bytes)
    except Exception:
        logger.warning("live STT transcription failed", exc_info=True)
        return "", ""
    return (result.text or "").strip(), (result.provider or "").strip()


def _get_or_create_live_interview(state: VoiceWsState) -> GeminiLiveInterviewSession:
    return runtime_get_or_create_live_interview(
        state,
        create_live_interview_session=runtime_create_live_interview_session,
    )


async def _request_live_text_turn(
    state: VoiceWsState,
    *,
    text: str,
    question_type: str | None = None,
    extra_instruction: str = "",
    user_text: str = "",
) -> tuple[str, PreparedTtsAudio | None]:
    return await runtime_request_live_text_turn(
        state,
        text=text,
        question_type=question_type,
        extra_instruction=extra_instruction,
        user_text=user_text,
        deps=_live_client_deps(),
    )


async def _request_live_spoken_text_turn(
    state: VoiceWsState,
    *,
    text: str,
) -> tuple[str, PreparedTtsAudio | None, str]:
    return await runtime_request_live_spoken_text_turn(
        state,
        text=text,
        deps=_live_client_deps(),
    )


async def _request_live_audio_turn(
    state: VoiceWsState,
    *,
    wav_bytes: bytes,
    question_type: str | None = None,
    answer_quality_hint: str = "",
    prompt_user_text: str = "",
    extra_instruction: str = "",
) -> tuple[str, str, PreparedTtsAudio | None, str]:
    return await runtime_request_live_audio_turn(
        state,
        wav_bytes=wav_bytes,
        question_type=question_type,
        answer_quality_hint=answer_quality_hint,
        prompt_user_text=prompt_user_text,
        extra_instruction=extra_instruction,
        deps=_live_client_deps(),
    )


async def _stream_live_audio_turn(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    turn_id: str,
    wav_bytes: bytes,
    question_type: str | None = None,
    answer_quality_hint: str = "",
    prompt_user_text: str = "",
    extra_instruction: str = "",
) -> tuple[str, str, str, float, int]:
    packet_seq = 0
    streamed_chunk_count = 0
    speaking_sent = False
    streamed_sample_rate = 24000
    audio_provider = "gemini-live-single"
    ai_delta_seq = 0
    streamed_ai_text = ""
    streamed_user_text = ""

    async def on_audio_chunk(chunk_bytes: bytes, sample_rate: int, is_final: bool) -> None:
        nonlocal packet_seq, streamed_chunk_count, speaking_sent, streamed_sample_rate
        if not chunk_bytes or not state.session_id:
            return
        streamed_sample_rate = max(8000, int(sample_rate or streamed_sample_rate or 24000))
        if not speaking_sent:
            speaking_sent = await _send_avatar_state(ws, "speaking", state.session_id)
        base64_chunks, _duration_sec = runtime_pcm16le_bytes_to_base64_chunks(
            chunk_bytes,
            sample_rate=streamed_sample_rate,
        )
        for idx, chunk in enumerate(base64_chunks):
            streamed_chunk_count += 1
            packet_seq += 1
            await _send_json(
                ws,
                {
                    "type": "audio",
                    "audioBase64": chunk,
                    "sampleRate": streamed_sample_rate,
                    "provider": audio_provider,
                    "sessionId": state.session_id,
                    "turnId": turn_id,
                    "chunkIndex": streamed_chunk_count - 1,
                    "chunkCount": None,
                    "packetSeq": packet_seq,
                    "isFinalChunk": bool(is_final and idx == len(base64_chunks) - 1),
                },
            )

    async def on_ai_text_update(accumulated_text: str) -> None:
        nonlocal ai_delta_seq, streamed_ai_text
        if not state.session_id:
            return
        normalized = domain_sanitize_ai_turn_text(accumulated_text)
        if not normalized or normalized == streamed_ai_text:
            return
        previous = streamed_ai_text
        if normalized.startswith(previous):
            delta = normalized[len(previous):]
        else:
            delta = normalized
        streamed_ai_text = normalized
        ai_delta_seq += 1
        await _send_transcript_delta(
            ws,
            state.session_id,
            "ai",
            delta or normalized,
            normalized,
            ai_delta_seq,
            turn_id=turn_id,
        )

    async def on_user_text_update(accumulated_text: str) -> None:
        nonlocal streamed_user_text
        if not state.session_id:
            return
        normalized = domain_sanitize_user_turn_text(accumulated_text)
        if not normalized or normalized == streamed_user_text:
            return
        previous = streamed_user_text
        if normalized.startswith(previous):
            delta = normalized[len(previous):]
        else:
            delta = normalized
        streamed_user_text = normalized
        state.realtime_user_transcript = normalized
        state.realtime_user_delta_seq += 1
        await _send_transcript_delta(
            ws,
            state.session_id,
            "user",
            delta or normalized,
            normalized,
            state.realtime_user_delta_seq,
        )

    user_text, ai_text, provider_name, duration_sec, live_chunk_count = await runtime_stream_live_audio_turn(
        state,
        wav_bytes=wav_bytes,
        question_type=question_type,
        answer_quality_hint=answer_quality_hint,
        prompt_user_text=prompt_user_text,
        extra_instruction=extra_instruction,
        on_audio_chunk=on_audio_chunk,
        on_ai_text_update=on_ai_text_update,
        on_user_text_update=on_user_text_update,
        deps=_live_client_deps(),
    )
    resolved_provider = (provider_name or audio_provider).strip()
    logger.info(
        "audio.out session=%s turn=%s provider=%s chunks=%s sample_rate=%s duration_ms=%s",
        state.session_id,
        turn_id,
        resolved_provider,
        streamed_chunk_count or live_chunk_count,
        streamed_sample_rate,
        int(round(duration_sec * 1000)),
    )
    return (
        user_text,
        ai_text,
        resolved_provider,
        duration_sec,
        streamed_chunk_count or live_chunk_count,
    )


def _build_live_input_stream_request(state: VoiceWsState) -> tuple[str | None, str, str, str]:
    followup_spec = prepare_live_user_followup(
        state,
        runtime_timing=transcript_runtime_timing,
    )
    should_bias_closing = followup_spec.should_announce_closing or state.current_phase == "closing"
    extra_instruction = ""
    question_type: str | None = None
    if followup_spec.completion_reason:
        extra_instruction = (
            "이번 턴은 질문 없이 면접을 종료하는 턴입니다. "
            "지원자의 방금 답변을 짧게 받아주고, 추가 질문 없이 종료 멘트만 말하세요. "
            f"마지막 문장은 반드시 '{CLOSING_SENTENCE}' 문장 그대로 사용하세요."
        )
    else:
        question_type = domain_select_next_question_type(
            state,
            preferred="priority_judgment" if should_bias_closing else None,
        )
        if followup_spec.should_announce_closing:
            extra_instruction = "이번 턴은 마지막 질문입니다."
    return (
        question_type,
        (state.last_answer_quality_hint or "").strip(),
        "",
        extra_instruction,
    )


def _clear_live_input_stream_state(state: VoiceWsState) -> None:
    state.live_input_turn_active = False
    state.live_input_turn_id = ""
    state.live_input_streamed_user_text = ""
    state.live_input_streamed_ai_text = ""
    state.live_input_streamed_provider = ""
    state.live_input_streamed_audio_duration_sec = 0.0
    state.live_input_streamed_audio_chunk_count = 0


def _prefer_non_regressing_stream_text(previous: str, candidate: str) -> str:
    previous_normalized = " ".join((previous or "").split()).strip()
    candidate_normalized = " ".join((candidate or "").split()).strip()
    if not previous_normalized:
        return candidate_normalized
    if not candidate_normalized:
        return previous_normalized

    previous_compact = re.sub(r"\s+", "", previous_normalized)
    candidate_compact = re.sub(r"\s+", "", candidate_normalized)
    if candidate_compact.startswith(previous_compact):
        return candidate_normalized
    if previous_compact.startswith(candidate_compact):
        return previous_normalized
    if len(candidate_compact) >= len(previous_compact):
        return candidate_normalized
    return previous_normalized


async def _begin_live_input_stream(ws: WebSocket, state: VoiceWsState) -> bool:
    if not state.session_id:
        return False
    if state.live_input_turn_active:
        return True

    _clear_live_input_stream_state(state)
    turn_id = _next_ai_turn_id(state.session_id)
    packet_seq = 0
    streamed_chunk_count = 0
    speaking_sent = False
    streamed_sample_rate = 24000
    ai_delta_seq = 0
    streamed_ai_text = ""
    streamed_user_text = ""
    question_type, answer_quality_hint, prompt_user_text, extra_instruction = _build_live_input_stream_request(state)

    async def on_audio_chunk(chunk_bytes: bytes, sample_rate: int, is_final: bool) -> None:
        nonlocal packet_seq, streamed_chunk_count, speaking_sent, streamed_sample_rate
        if not chunk_bytes or not state.session_id:
            return
        streamed_sample_rate = max(8000, int(sample_rate or streamed_sample_rate or 24000))
        if not speaking_sent:
            speaking_sent = await _send_avatar_state(ws, "speaking", state.session_id)
        base64_chunks, duration_sec = runtime_pcm16le_bytes_to_base64_chunks(
            chunk_bytes,
            sample_rate=streamed_sample_rate,
        )
        state.live_input_streamed_audio_duration_sec += max(0.0, float(duration_sec or 0.0))
        for idx, chunk in enumerate(base64_chunks):
            streamed_chunk_count += 1
            packet_seq += 1
            state.live_input_streamed_audio_chunk_count = streamed_chunk_count
            await _send_json(
                ws,
                {
                    "type": "audio",
                    "audioBase64": chunk,
                    "sampleRate": streamed_sample_rate,
                    "provider": "gemini-live-single",
                    "sessionId": state.session_id,
                    "turnId": turn_id,
                    "chunkIndex": streamed_chunk_count - 1,
                    "chunkCount": None,
                    "packetSeq": packet_seq,
                    "isFinalChunk": bool(is_final and idx == len(base64_chunks) - 1),
                },
            )

    async def on_ai_text_update(accumulated_text: str) -> None:
        nonlocal ai_delta_seq, streamed_ai_text
        if not state.session_id:
            return
        normalized = domain_sanitize_ai_turn_text(accumulated_text)
        if not normalized or normalized == streamed_ai_text:
            return
        previous = streamed_ai_text
        delta = normalized[len(previous):] if normalized.startswith(previous) else normalized
        streamed_ai_text = normalized
        state.live_input_streamed_ai_text = normalized
        ai_delta_seq += 1
        await _send_transcript_delta(
            ws,
            state.session_id,
            "ai",
            delta or normalized,
            normalized,
            ai_delta_seq,
            turn_id=turn_id,
        )

    async def on_user_text_update(accumulated_text: str) -> None:
        nonlocal streamed_user_text
        if not state.session_id:
            return
        normalized = domain_sanitize_user_turn_text(accumulated_text)
        if not normalized or normalized == streamed_user_text:
            return
        previous = streamed_user_text
        delta = normalized[len(previous):] if normalized.startswith(previous) else normalized
        streamed_user_text = normalized
        state.realtime_user_transcript = normalized
        state.live_input_streamed_user_text = normalized
        state.realtime_user_delta_seq += 1
        await _send_transcript_delta(
            ws,
            state.session_id,
            "user",
            delta or normalized,
            normalized,
            state.realtime_user_delta_seq,
        )

    started = await runtime_begin_live_audio_input_stream(
        state,
        question_type=question_type,
        answer_quality_hint=answer_quality_hint,
        prompt_user_text=prompt_user_text,
        extra_instruction=extra_instruction,
        on_audio_chunk=on_audio_chunk,
        on_ai_text_update=on_ai_text_update,
        on_user_text_update=on_user_text_update,
        deps=_live_client_deps(),
    )
    if not started:
        return False

    state.live_input_turn_active = True
    state.live_input_turn_id = turn_id
    state.live_input_streamed_provider = "gemini-live-single"
    return True


async def _push_live_input_audio_chunk(
    state: VoiceWsState,
    audio_chunk: list[float],
    sample_rate: int,
) -> bool:
    return await runtime_push_live_audio_input_chunk(
        state,
        audio_chunk=audio_chunk,
        sample_rate=sample_rate,
        deps=_live_client_deps(),
    )


async def _commit_live_input_stream(state: VoiceWsState) -> bool:
    if not state.live_input_turn_active:
        return False
    previous_duration_sec = max(0.0, float(state.live_input_streamed_audio_duration_sec or 0.0))
    previous_chunk_count = max(0, int(state.live_input_streamed_audio_chunk_count or 0))
    previous_user_text = (state.live_input_streamed_user_text or "").strip()
    previous_ai_text = (state.live_input_streamed_ai_text or "").strip()
    user_text, ai_text, provider_name, duration_sec, live_chunk_count = await runtime_commit_live_audio_input_stream(
        state,
        deps=_live_client_deps(),
    )
    state.live_input_streamed_user_text = _prefer_non_regressing_stream_text(previous_user_text, user_text)
    state.live_input_streamed_ai_text = _prefer_non_regressing_stream_text(previous_ai_text, ai_text)
    state.live_input_streamed_provider = (provider_name or "gemini-live-single").strip()
    state.live_input_streamed_audio_duration_sec = max(previous_duration_sec, float(duration_sec or 0.0))
    state.live_input_streamed_audio_chunk_count = max(previous_chunk_count, int(live_chunk_count or 0))
    state.live_input_turn_active = False
    logger.info(
        "audio.out session=%s turn=%s provider=%s chunks=%s sample_rate=%s duration_ms=%s",
        state.session_id,
        state.live_input_turn_id,
        state.live_input_streamed_provider or "gemini-live-single",
        state.live_input_streamed_audio_chunk_count,
        24000,
        int(round(state.live_input_streamed_audio_duration_sec * 1000)),
    )
    return True


async def _repair_ai_turn_if_truncated(
    state: VoiceWsState,
    *,
    ai_text: str,
    prepared_tts: PreparedTtsAudio | None,
) -> tuple[str, PreparedTtsAudio | None]:
    del state
    return await runtime_repair_ai_turn_if_truncated(
        ai_text=ai_text,
        prepared_tts=prepared_tts,
        deps=_live_client_deps(),
    )


async def _send_prepared_tts_audio(
    ws: WebSocket,
    session_id: str,
    prepared: PreparedTtsAudio,
    *,
    turn_id: str,
) -> bool:
    return await runtime_send_prepared_tts_audio(
        ws,
        session_id,
        prepared,
        turn_id=turn_id,
        send_json=_send_json,
    )


async def _generate_and_send_opening_live_turn(ws: WebSocket, state: VoiceWsState) -> bool:
    return await runtime_generate_and_send_opening_live_turn(
        ws,
        state,
        next_turn_id=_next_ai_turn_id,
        live_opening_prompt=LIVE_OPENING_PROMPT,
        runtime_timing=transcript_runtime_timing,
        runtime_executor_deps=_runtime_executor_deps,
    )


async def _generate_and_send_resume_live_turn(ws: WebSocket, state: VoiceWsState) -> bool:
    return await runtime_generate_and_send_resume_live_turn(
        ws,
        state,
        next_turn_id=_next_ai_turn_id,
        to_chat_history=runtime_to_chat_history,
        latest_user_answer=runtime_latest_user_answer,
        build_answer_quality_hint=domain_build_answer_quality_hint,
        derive_question_type_preference=domain_derive_question_type_preference,
        select_next_question_type=domain_select_next_question_type,
        runtime_timing=transcript_runtime_timing,
        runtime_executor_deps=_runtime_executor_deps,
        closing_sentence=CLOSING_SENTENCE,
    )

async def _process_user_utterance(
    ws: WebSocket,
    state: VoiceWsState,
    wav_bytes: bytes,
    *,
    vad_meta: dict[str, Any] | None = None,
) -> None:
    await runtime_entrypoint_process_user_utterance(
        ws,
        state,
        wav_bytes,
        session_engine_deps=_session_engine_deps,
        vad_meta=vad_meta,
        runtime_mode_disabled=RUNTIME_MODE_DISABLED,
        closing_sentence=CLOSING_SENTENCE,
    )


async def _drain_pending_user_segments(ws: WebSocket, state: VoiceWsState) -> None:
    await runtime_entrypoint_drain_pending_user_segments(
        ws,
        state,
        session_engine_deps=_session_engine_deps,
        runtime_mode_disabled=RUNTIME_MODE_DISABLED,
        closing_sentence=CLOSING_SENTENCE,
    )


async def _enqueue_user_segment(
    ws: WebSocket,
    state: VoiceWsState,
    segment: bytes,
    *,
    vad_meta: dict[str, Any] | None = None,
    flush_now: bool = False,
) -> None:
    await runtime_entrypoint_enqueue_user_segment(
        ws,
        state,
        segment,
        session_engine_deps=_session_engine_deps,
        vad_meta=vad_meta,
        flush_now=flush_now,
        runtime_mode_disabled=RUNTIME_MODE_DISABLED,
        closing_sentence=CLOSING_SENTENCE,
    )


async def run_voice_client_ws(websocket: WebSocket) -> None:
    await websocket.accept()
    state = VoiceWsState()
    logger.info(
        "voice ws connected architecture=%s ai_question_repair=%s ai_audio_recovery=%s",
        settings.voice_runtime_architecture,
        settings.voice_enable_ai_question_repair,
        settings.voice_enable_ai_audio_recovery,
    )

    try:
        if not await send_connection_handshake(
            websocket,
            deps=build_runtime_lifecycle_deps(
                create_live_interview_session=runtime_create_live_interview_session,
                send_json=_send_json,
                cancel_playback_resume_task=_cancel_playback_resume_task,
                mark_runtime_disconnected=service_adapter.mark_runtime_disconnected,
            ),
            llm_stream_modes=sorted(LLM_STREAM_MODES),
            tts_modes=sorted(TTS_MODES),
        ):
            return

        await run_client_session(
            websocket,
            state,
            deps=build_client_session_deps(
                send_json=_send_json,
                handle_client_message=lambda ws, state, data: handle_client_message(
                    ws,
                    state,
                    data,
                    deps=_client_message_router_deps(),
                ),
            ),
        )

    except WebSocketDisconnect:
        return
    except RuntimeError as exc:
        # Browser tab close / reconnect races can raise RuntimeError from receive_text.
        if "WebSocket is not connected" in str(exc):
            return
        raise
    finally:
        await runtime_cleanup_connection(
            state,
            deps=build_runtime_lifecycle_deps(
                create_live_interview_session=runtime_create_live_interview_session,
                send_json=_send_json,
                cancel_playback_resume_task=_cancel_playback_resume_task,
                mark_runtime_disconnected=service_adapter.mark_runtime_disconnected,
            ),
            reconnect_grace_sec=RECONNECT_GRACE_SEC,
        )
