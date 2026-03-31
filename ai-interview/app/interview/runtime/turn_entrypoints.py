from __future__ import annotations

from typing import Any, Awaitable, Callable

from fastapi import WebSocket

from app.interview.runtime.executor import RuntimeExecutorDeps, execute_opening_live_turn, execute_resume_live_turn
from app.interview.runtime.live_turns import prepare_opening_turn, prepare_resume_turn
from app.interview.runtime.prepared_opening_store import PreparedOpeningArtifact
from app.interview.runtime.session_engine import (
    SessionEngineDeps,
    drain_pending_user_segments as runtime_drain_pending_user_segments,
    enqueue_user_segment as runtime_enqueue_user_segment,
    process_user_utterance as runtime_process_user_utterance,
)
from app.interview.runtime.state import VoiceWsState


async def generate_and_send_opening_live_turn(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    next_turn_id: Callable[[str], str],
    live_opening_prompt: str,
    runtime_timing: Callable[[VoiceWsState], tuple[int, int]],
    runtime_executor_deps: Callable[[], RuntimeExecutorDeps],
) -> bool:
    if not state.session_id:
        return False

    opening_spec = prepare_opening_turn(
        state,
        next_turn_id=next_turn_id(state.session_id),
        prompt=live_opening_prompt,
        question_type="motivation_validation",
        runtime_timing=runtime_timing,
    )
    return await execute_opening_live_turn(
        ws,
        state,
        spec=opening_spec,
        deps=runtime_executor_deps(),
    )


async def send_prepared_opening_live_turn(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    artifact: PreparedOpeningArtifact,
    runtime_executor_deps: Callable[[], RuntimeExecutorDeps],
) -> bool:
    return await execute_opening_live_turn(
        ws,
        state,
        spec=artifact.spec,
        deps=runtime_executor_deps(),
        prepared_delivery_plan=artifact.delivery_plan,
        spoken_provider_override=artifact.spoken_provider,
    )


async def generate_and_send_resume_live_turn(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    next_turn_id: Callable[[str], str],
    to_chat_history: Callable[[list[dict[str, Any]]], list[dict[str, str]]],
    latest_user_answer: Callable[[list[dict[str, Any]]], str],
    build_answer_quality_hint: Callable[[str], str],
    derive_question_type_preference: Callable[..., str | None],
    select_next_question_type: Callable[..., str],
    runtime_timing: Callable[[VoiceWsState], tuple[int, int]],
    runtime_executor_deps: Callable[[], RuntimeExecutorDeps],
    closing_sentence: str,
) -> bool:
    if not state.session_id:
        return False

    history = to_chat_history(state.turn_history)
    latest_user_text = latest_user_answer(history)
    answer_quality_hint = state.last_answer_quality_hint or build_answer_quality_hint(latest_user_text)
    resume_spec = prepare_resume_turn(
        state,
        next_turn_id=next_turn_id(state.session_id),
        latest_user_text=latest_user_text,
        answer_quality_hint=answer_quality_hint,
        closing_sentence=closing_sentence,
        derive_question_type_preference=derive_question_type_preference,
        select_next_question_type=select_next_question_type,
        runtime_timing=runtime_timing,
    )
    return await execute_resume_live_turn(
        ws,
        state,
        spec=resume_spec,
        deps=runtime_executor_deps(),
    )


async def process_user_utterance(
    ws: WebSocket,
    state: VoiceWsState,
    wav_bytes: bytes,
    *,
    session_engine_deps: Callable[[], SessionEngineDeps],
    vad_meta: dict[str, Any] | None = None,
    runtime_mode_disabled: str,
    closing_sentence: str,
) -> None:
    await runtime_process_user_utterance(
        ws,
        state,
        wav_bytes,
        deps=session_engine_deps(),
        vad_meta=vad_meta,
        runtime_mode_disabled=runtime_mode_disabled,
        closing_sentence=closing_sentence,
    )


async def drain_pending_user_segments(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    session_engine_deps: Callable[[], SessionEngineDeps],
    runtime_mode_disabled: str,
    closing_sentence: str,
) -> None:
    await runtime_drain_pending_user_segments(
        ws,
        state,
        deps=session_engine_deps(),
        runtime_mode_disabled=runtime_mode_disabled,
        closing_sentence=closing_sentence,
    )


async def enqueue_user_segment(
    ws: WebSocket,
    state: VoiceWsState,
    segment: bytes,
    *,
    session_engine_deps: Callable[[], SessionEngineDeps],
    vad_meta: dict[str, Any] | None = None,
    flush_now: bool = False,
    runtime_mode_disabled: str,
    closing_sentence: str,
) -> None:
    await runtime_enqueue_user_segment(
        ws,
        state,
        segment,
        deps=session_engine_deps(),
        vad_meta=vad_meta,
        flush_now=flush_now,
        runtime_mode_disabled=runtime_mode_disabled,
        closing_sentence=closing_sentence,
    )


__all__ = [
    "drain_pending_user_segments",
    "enqueue_user_segment",
    "generate_and_send_opening_live_turn",
    "generate_and_send_resume_live_turn",
    "process_user_utterance",
    "send_prepared_opening_live_turn",
]
