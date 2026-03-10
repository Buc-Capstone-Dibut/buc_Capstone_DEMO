from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

from app.interview.runtime.client_session import ClientSessionDeps
from app.interview.runtime.executor import RuntimeExecutorDeps
from app.interview.runtime.lifecycle import RuntimeLifecycleDeps
from app.interview.runtime.live_client import LiveClientDeps
from app.interview.runtime.message_router import ClientMessageRouterDeps
from app.interview.runtime.session_engine import SessionEngineDeps
from app.interview.runtime.session_interaction import ResumeListeningDeps
from app.interview.runtime.state import PreparedTtsAudio, VoiceWsState


def build_resume_listening_deps(
    *,
    cancel_playback_resume_task: Callable[[VoiceWsState], None],
    set_runtime_status: Callable[[str, str, str | None], Awaitable[Any]],
    send_json: Callable[..., Awaitable[bool]],
    send_avatar_state: Callable[..., Awaitable[bool]],
    send_runtime_meta_snapshot: Callable[..., Awaitable[bool]],
    logger: logging.Logger,
) -> ResumeListeningDeps:
    return ResumeListeningDeps(
        cancel_playback_resume_task=cancel_playback_resume_task,
        set_runtime_status=set_runtime_status,
        send_json=send_json,
        send_avatar_state=send_avatar_state,
        send_runtime_meta_snapshot=send_runtime_meta_snapshot,
        logger=logger,
    )


def build_live_client_deps(
    *,
    create_live_interview_session: Callable[[], Any],
    build_session_instruction: Callable[[VoiceWsState], str],
    build_turn_prompt: Callable[..., str],
    to_prepared_tts_audio_from_pcm: Callable[..., PreparedTtsAudio | None],
    sanitize_ai_turn_text: Callable[[str], str],
    looks_like_complete_ai_question: Callable[[str], bool],
) -> LiveClientDeps:
    return LiveClientDeps(
        create_live_interview_session=create_live_interview_session,
        build_session_instruction=build_session_instruction,
        build_turn_prompt=build_turn_prompt,
        to_prepared_tts_audio_from_pcm=to_prepared_tts_audio_from_pcm,
        sanitize_ai_turn_text=sanitize_ai_turn_text,
        looks_like_complete_ai_question=looks_like_complete_ai_question,
    )


def build_runtime_executor_deps(
    *,
    request_live_text_turn: Callable[..., Awaitable[tuple[str, Any]]],
    repair_ai_turn_if_truncated: Callable[..., Awaitable[tuple[str, Any]]],
    build_ai_delivery_plan: Callable[..., Awaitable[Any]],
    persist_turn: Callable[..., Awaitable[Any]],
    set_runtime_status: Callable[[str, str, str | None], Awaitable[Any]],
    update_session_status: Callable[[str, str, str | None], Awaitable[Any]],
    set_closing_announced: Callable[[str], Awaitable[Any]],
    mark_session_status: Callable[..., None],
    log_runtime_event: Callable[..., None],
    send_json: Callable[..., Awaitable[bool]],
    send_transcript: Callable[..., Awaitable[bool]],
    stream_prepared_ai_delivery: Callable[..., Awaitable[bool]],
    arm_playback_resume: Callable[..., None],
    resume_listening: Callable[..., Awaitable[Any]],
    reconnect_remaining_sec: Callable[[VoiceWsState], int],
    live_active_model: Callable[[VoiceWsState], str],
    snapshot_vad_config: Callable[[VoiceWsState], dict[str, Any]],
    build_memory_snapshot: Callable[[VoiceWsState], str],
    remember_model_turn: Callable[..., None],
    record_question_type: Callable[[VoiceWsState, str | None], None],
) -> RuntimeExecutorDeps:
    return RuntimeExecutorDeps(
        request_live_text_turn=request_live_text_turn,
        repair_ai_turn_if_truncated=repair_ai_turn_if_truncated,
        build_ai_delivery_plan=build_ai_delivery_plan,
        persist_turn=persist_turn,
        set_runtime_status=set_runtime_status,
        update_session_status=update_session_status,
        set_closing_announced=set_closing_announced,
        mark_session_status=mark_session_status,
        log_runtime_event=log_runtime_event,
        send_json=send_json,
        send_transcript=send_transcript,
        stream_prepared_ai_delivery=stream_prepared_ai_delivery,
        arm_playback_resume=arm_playback_resume,
        resume_listening=resume_listening,
        reconnect_remaining_sec=reconnect_remaining_sec,
        live_active_model=live_active_model,
        snapshot_vad_config=snapshot_vad_config,
        build_memory_snapshot=build_memory_snapshot,
        remember_model_turn=remember_model_turn,
        record_question_type=record_question_type,
    )


def build_session_engine_deps(
    *,
    create_live_interview_session: Callable[[], Any],
    normalize_llm_stream_mode: Callable[[Any], str],
    normalize_tts_mode: Callable[[Any], str],
    reset_voice_runtime_state: Callable[..., None],
    get_session: Callable[[str], dict[str, Any] | None],
    get_turns: Callable[[str], list[dict[str, Any]]],
    mark_runtime_expired: Callable[[str], dict[str, Any] | None],
    mark_runtime_connected: Callable[[str, str, str], dict[str, Any] | None],
    hydrate_state_from_session_row: Callable[..., None],
    resume_existing_session: Callable[..., Awaitable[bool]],
    generate_and_send_opening_live_turn: Callable[..., Awaitable[bool]],
    send_json: Callable[..., Awaitable[bool]],
    send_avatar_state: Callable[..., Awaitable[bool]],
    send_runtime_meta_snapshot: Callable[..., Awaitable[bool]],
    live_active_model: Callable[[VoiceWsState], str],
    set_runtime_mode: Callable[..., Awaitable[None]],
    set_runtime_status: Callable[..., Awaitable[Any]],
    get_or_create_live_interview: Callable[[VoiceWsState], Any],
    build_answer_quality_hint: Callable[[str], str],
    derive_question_type_preference: Callable[..., str | None],
    select_next_question_type: Callable[..., str],
    request_live_audio_turn: Callable[..., Awaitable[tuple[str, str, PreparedTtsAudio | None, str]]],
    emit_realtime_user_delta: Callable[..., Awaitable[None]],
    is_probable_ai_echo: Callable[[VoiceWsState, str, bytes], bool],
    reset_realtime_user_transcript: Callable[[VoiceWsState], None],
    remember_user_turn: Callable[[VoiceWsState, str], None],
    persist_turn: Callable[..., Awaitable[Any]],
    send_transcript: Callable[..., Awaitable[bool]],
    log_runtime_event: Callable[..., None],
    is_short_stt_result: Callable[[str, bytes], bool],
    retune_vad_for_next_turn: Callable[..., None],
    runtime_timing: Callable[[VoiceWsState], tuple[int, int]],
    runtime_executor_deps: Callable[[], RuntimeExecutorDeps],
    estimate_wav_duration_ms: Callable[[bytes], float],
    snapshot_vad_config: Callable[[VoiceWsState], dict[str, Any]],
    build_memory_snapshot: Callable[[VoiceWsState], str],
    merge_wav_segments: Callable[[list[bytes]], bytes],
    merge_vad_events: Callable[[list[dict[str, Any]]], dict[str, Any]],
    resume_listening: Callable[..., Awaitable[Any]],
    next_ai_turn_id: Callable[[str], str],
) -> SessionEngineDeps:
    return SessionEngineDeps(
        create_live_interview_session=create_live_interview_session,
        normalize_llm_stream_mode=normalize_llm_stream_mode,
        normalize_tts_mode=normalize_tts_mode,
        reset_voice_runtime_state=reset_voice_runtime_state,
        get_session=get_session,
        get_turns=get_turns,
        mark_runtime_expired=mark_runtime_expired,
        mark_runtime_connected=mark_runtime_connected,
        hydrate_state_from_session_row=hydrate_state_from_session_row,
        resume_existing_session=resume_existing_session,
        generate_and_send_opening_live_turn=generate_and_send_opening_live_turn,
        send_json=send_json,
        send_avatar_state=send_avatar_state,
        send_runtime_meta_snapshot=send_runtime_meta_snapshot,
        live_active_model=live_active_model,
        set_runtime_mode=set_runtime_mode,
        set_runtime_status=set_runtime_status,
        get_or_create_live_interview=get_or_create_live_interview,
        build_answer_quality_hint=build_answer_quality_hint,
        derive_question_type_preference=derive_question_type_preference,
        select_next_question_type=select_next_question_type,
        request_live_audio_turn=request_live_audio_turn,
        emit_realtime_user_delta=emit_realtime_user_delta,
        is_probable_ai_echo=is_probable_ai_echo,
        reset_realtime_user_transcript=reset_realtime_user_transcript,
        remember_user_turn=remember_user_turn,
        persist_turn=persist_turn,
        send_transcript=send_transcript,
        log_runtime_event=log_runtime_event,
        is_short_stt_result=is_short_stt_result,
        retune_vad_for_next_turn=retune_vad_for_next_turn,
        runtime_timing=runtime_timing,
        runtime_executor_deps=runtime_executor_deps,
        estimate_wav_duration_ms=estimate_wav_duration_ms,
        snapshot_vad_config=snapshot_vad_config,
        build_memory_snapshot=build_memory_snapshot,
        merge_wav_segments=merge_wav_segments,
        merge_vad_events=merge_vad_events,
        resume_listening=resume_listening,
        next_ai_turn_id=next_ai_turn_id,
    )


def build_client_message_router_deps(
    *,
    send_json: Callable[..., Awaitable[bool]],
    send_avatar_state: Callable[..., Awaitable[bool]],
    handle_session_init: Callable[..., Awaitable[None]],
    coerce_audio_chunk: Callable[[Any], list[float]],
    enqueue_user_segment: Callable[..., Awaitable[None]],
    reset_realtime_user_transcript: Callable[[VoiceWsState], None],
    resume_listening: Callable[..., Awaitable[Any]],
    cancel_playback_resume_task: Callable[[VoiceWsState], None],
) -> ClientMessageRouterDeps:
    return ClientMessageRouterDeps(
        send_json=send_json,
        send_avatar_state=send_avatar_state,
        handle_session_init=handle_session_init,
        coerce_audio_chunk=coerce_audio_chunk,
        enqueue_user_segment=enqueue_user_segment,
        reset_realtime_user_transcript=reset_realtime_user_transcript,
        resume_listening=resume_listening,
        cancel_playback_resume_task=cancel_playback_resume_task,
    )


def build_runtime_lifecycle_deps(
    *,
    create_live_interview_session: Callable[[], Any],
    send_json: Callable[..., Awaitable[bool]],
    cancel_playback_resume_task: Callable[[VoiceWsState], None],
    mark_runtime_disconnected: Callable[[str, int], Awaitable[Any]],
) -> RuntimeLifecycleDeps:
    return RuntimeLifecycleDeps(
        create_live_interview_session=create_live_interview_session,
        send_json=send_json,
        cancel_playback_resume_task=cancel_playback_resume_task,
        mark_runtime_disconnected=mark_runtime_disconnected,
    )


def build_client_session_deps(
    *,
    send_json: Callable[..., Awaitable[bool]],
    handle_client_message: Callable[..., Awaitable[None]],
) -> ClientSessionDeps:
    return ClientSessionDeps(
        send_json=send_json,
        handle_client_message=handle_client_message,
    )
