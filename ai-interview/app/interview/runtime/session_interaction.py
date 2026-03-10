from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any, Awaitable, Callable

from fastapi import WebSocket

from app.interview.runtime.state import VoiceWsState


def is_probable_ai_echo(
    state: VoiceWsState,
    text: str,
    wav_bytes: bytes,
    *,
    normalize_compare_text: Callable[[str], str],
    estimate_wav_duration_ms: Callable[[bytes], float],
    voice_min_answer_chars: int,
) -> bool:
    reference = normalize_compare_text(state.last_ai_tts_text)
    candidate = normalize_compare_text(text)
    if not reference or not candidate:
        return False

    similarity = SequenceMatcher(None, candidate, reference).ratio()
    contains = candidate in reference or reference in candidate
    duration_ms = estimate_wav_duration_ms(wav_bytes)

    if similarity >= 0.72:
        return True
    if contains and len(candidate) >= 6:
        return True
    if duration_ms <= 1600 and len(candidate) <= voice_min_answer_chars:
        return True
    return False


async def emit_realtime_user_delta(
    ws: WebSocket,
    state: VoiceWsState,
    text: str,
) -> None:
    del ws
    if not state.session_id:
        return

    cleaned = (text or "").strip()
    if not cleaned:
        return
    if cleaned == state.realtime_user_transcript:
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


def log_runtime_event(
    logger: logging.Logger,
    event: str,
    state: VoiceWsState,
    *,
    live_active_model: Callable[[VoiceWsState], str],
    turn_id: str = "",
    **fields: Any,
) -> None:
    extra: dict[str, Any] = {
        "session_id": state.session_id,
        "turn_id": turn_id,
        "runtime_mode": state.runtime_mode,
        "runtime_reason": state.runtime_mode_reason,
        "live_model": live_active_model(state),
    }
    for key, value in fields.items():
        if value in (None, "", [], {}):
            continue
        extra[key] = value
    logger.info("voice runtime %s", event, extra=extra)


@dataclass(frozen=True)
class ResumeListeningDeps:
    cancel_playback_resume_task: Callable[[VoiceWsState], None]
    set_runtime_status: Callable[[str, str, str | None], Awaitable[Any]]
    send_json: Callable[..., Awaitable[bool]]
    send_avatar_state: Callable[..., Awaitable[bool]]
    send_runtime_meta_snapshot: Callable[..., Awaitable[bool]]
    logger: logging.Logger


async def resume_listening(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    turn_id: str | None = None,
    deps: ResumeListeningDeps,
) -> None:
    state.waiting_playback_turn_id = ""
    deps.cancel_playback_resume_task(state)
    if state.session_id and state.session_status != "completed":
        state.runtime_status = "awaiting_user"
        try:
            await deps.set_runtime_status(state.session_id, "awaiting_user", state.current_phase)
        except Exception:
            deps.logger.warning(
                "failed to persist awaiting_user runtime state",
                extra={"session_id": state.session_id, "turn_id": turn_id},
                exc_info=True,
            )
    payload: dict[str, Any] = {"type": "control", "text": "start-mic"}
    if turn_id:
        payload["turnId"] = turn_id
    if state.session_id and await deps.send_json(ws, payload):
        await deps.send_avatar_state(ws, "listening", state.session_id)
        await deps.send_runtime_meta_snapshot(ws, state, turn_id=turn_id)


def arm_playback_resume(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    turn_id: str,
    timeout_sec: float,
    resume_listening_fn: Callable[..., Awaitable[None]],
    deps: ResumeListeningDeps,
) -> None:
    state.waiting_playback_turn_id = turn_id
    deps.cancel_playback_resume_task(state)

    async def _resume_on_timeout() -> None:
        try:
            await asyncio.sleep(max(0.8, timeout_sec))
        except asyncio.CancelledError:
            return
        if state.waiting_playback_turn_id != turn_id:
            return
        deps.logger.warning(
            "audio playback ack timeout; forcing mic resume",
            extra={"session_id": state.session_id, "turn_id": turn_id},
        )
        state.waiting_playback_turn_id = ""
        state.playback_resume_task = None
        await resume_listening_fn(ws, state, turn_id=turn_id)

    state.playback_resume_task = asyncio.create_task(_resume_on_timeout())


__all__ = [
    "ResumeListeningDeps",
    "arm_playback_resume",
    "emit_realtime_user_delta",
    "is_probable_ai_echo",
    "log_runtime_event",
    "resume_listening",
]
