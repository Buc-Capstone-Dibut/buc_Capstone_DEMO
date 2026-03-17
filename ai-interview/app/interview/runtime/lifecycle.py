from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from fastapi import WebSocket

from app.interview.runtime.state import VoiceWsState
from app.services.gemini_live_voice_service import GeminiLiveInterviewSession

logger = logging.getLogger("dibut.ws")


@dataclass(frozen=True)
class RuntimeLifecycleDeps:
    create_live_interview_session: Callable[[], GeminiLiveInterviewSession]
    send_json: Callable[..., Awaitable[bool]]
    cancel_playback_resume_task: Callable[[VoiceWsState], None]
    mark_runtime_disconnected: Callable[[str, int], Awaitable[Any]]


async def send_connection_handshake(
    ws: WebSocket,
    *,
    deps: RuntimeLifecycleDeps,
    llm_stream_modes: list[str],
    tts_modes: list[str],
) -> bool:
    live_single = deps.create_live_interview_session()
    live_single_enabled = live_single.enabled

    if not await deps.send_json(
        ws,
        {
            "type": "ready",
            "status": "ok",
            "message": "Dibut interview ws connected",
        },
    ):
        return False

    return await deps.send_json(
        ws,
        {
            "type": "set-model-and-conf",
            "vad": "silero(rms-mvp)",
            "stt": f"gemini-live-single:{live_single.model}" if live_single_enabled else "disabled",
            "tts": f"gemini-live-single:{live_single.model}" if live_single_enabled else "disabled",
            "llm": f"gemini-live-single:{live_single.model}" if live_single_enabled else "disabled",
            "video": "local-camera-preview",
            "mode": "voice",
            "llmStreamModes": llm_stream_modes,
            "ttsModes": tts_modes,
        },
    )


async def cleanup_connection(
    state: VoiceWsState,
    *,
    deps: RuntimeLifecycleDeps,
    reconnect_grace_sec: int,
) -> None:
    if state.pending_user_segment_task and not state.pending_user_segment_task.done():
        state.pending_user_segment_task.cancel()

    deps.cancel_playback_resume_task(state)

    if state.session_id and state.session_status != "completed":
        state.runtime_status = "reconnecting"
        try:
            await deps.mark_runtime_disconnected(state.session_id, reconnect_grace_sec)
        except Exception:
            logger.warning(
                "failed to persist reconnecting runtime state",
                extra={"session_id": state.session_id},
                exc_info=True,
            )

    if state.live_interview is not None:
        await state.live_interview.close()
