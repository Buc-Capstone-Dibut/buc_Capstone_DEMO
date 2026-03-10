from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.interview.runtime.orchestration import build_runtime_meta_payload
from app.interview.runtime.state import VoiceWsState
from app.interview.transcript.runtime_cache import reconnect_remaining_sec, runtime_timing

logger = logging.getLogger("dibut.ws")


async def send_json(ws: WebSocket, payload: dict[str, Any]) -> bool:
    if ws.client_state != WebSocketState.CONNECTED:
        return False
    try:
        await ws.send_json(payload)
        return True
    except (WebSocketDisconnect, RuntimeError):
        return False


async def send_avatar_state(ws: WebSocket, avatar_state: str, session_id: str) -> bool:
    return await send_json(
        ws,
        {
            "type": "avatar.state",
            "state": avatar_state,
            "sessionId": session_id,
            "timestamp": int(time.time()),
        },
    )


async def set_runtime_mode(
    ws: WebSocket,
    state: VoiceWsState,
    mode: str,
    reason: str = "",
    *,
    turn_id: str | None = None,
    live_single_mode: str = "live-single",
    disabled_mode: str = "disabled",
) -> None:
    normalized_mode = (mode or "").strip() or disabled_mode
    normalized_reason = (reason or "").strip()
    if state.runtime_mode == normalized_mode and state.runtime_mode_reason == normalized_reason:
        return

    state.runtime_mode = normalized_mode
    state.runtime_mode_reason = normalized_reason
    if not state.session_id:
        return

    message = ""
    if normalized_mode == live_single_mode:
        message = "실시간 음성 경로가 정상화되었습니다."
    elif normalized_mode == disabled_mode:
        message = "실시간 음성 경로가 비활성화되어 있습니다."

    payload: dict[str, Any] = {
        "type": "runtime.mode",
        "runtimeMode": normalized_mode,
        "runtimeReason": normalized_reason,
        "retryAfterSec": 0,
        "sessionId": state.session_id,
        "timestamp": int(time.time()),
        "message": message,
    }
    if turn_id:
        payload["turnId"] = turn_id
    await send_json(ws, payload)


def cancel_playback_resume_task(state: VoiceWsState) -> None:
    if state.playback_resume_task and not state.playback_resume_task.done():
        state.playback_resume_task.cancel()
    state.playback_resume_task = None


async def send_transcript(
    ws: WebSocket,
    session_id: str,
    role: str,
    text: str,
    *,
    turn_id: str | None = None,
) -> bool:
    return await send_json(
        ws,
        {
            "type": "transcript.final",
            "role": role,
            "text": text,
            "sessionId": session_id,
            "turnId": turn_id,
            "timestamp": int(time.time()),
        },
    )


async def send_transcript_delta(
    ws: WebSocket,
    session_id: str,
    role: str,
    delta: str,
    accumulated_text: str,
    sequence: int,
    *,
    turn_id: str | None = None,
) -> bool:
    return await send_json(
        ws,
        {
            "type": "transcript.delta",
            "role": role,
            "delta": delta,
            "accumulatedText": accumulated_text,
            "sessionId": session_id,
            "turnId": turn_id,
            "seq": sequence,
            "timestamp": int(time.time()),
        },
    )


async def send_runtime_meta_snapshot(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    turn_id: str | None = None,
    finish_reason: str = "",
) -> bool:
    elapsed_sec, remaining_sec = runtime_timing(state, elapsed_seconds=lambda started_at: int((time.time() - started_at.timestamp())) if started_at else 0)
    return await send_json(
        ws,
        build_runtime_meta_payload(
            target_duration_sec=state.target_duration_sec,
            closing_threshold_sec=state.closing_threshold_sec,
            elapsed_sec=elapsed_sec,
            remaining_sec=remaining_sec,
            estimated_total_questions=state.estimated_total_questions,
            question_count=state.model_turn_count,
            is_closing_phase=state.current_phase == "closing",
            interview_complete=state.session_status == "completed",
            finish_reason=finish_reason,
            session_paused=state.runtime_status == "reconnecting",
            reconnect_remaining_sec=reconnect_remaining_sec(state),
            runtime_status=state.runtime_status,
            runtime_mode=state.runtime_mode,
            runtime_reason=state.runtime_mode_reason,
            retry_after_sec=0,
            turn_id=turn_id,
        ),
    )


async def send_cached_turn_history(ws: WebSocket, state: VoiceWsState) -> None:
    if not state.session_id:
        return

    for turn in state.turn_history:
        role = turn.get("role")
        if role not in {"user", "model", "ai"}:
            continue
        content = (turn.get("content") or "").strip()
        if not content:
            continue
        payload = turn.get("payload") if isinstance(turn.get("payload"), dict) else {}
        turn_id = str(payload.get("turn_id") or payload.get("turnId") or "").strip() or None
        normalized_role = "ai" if role in {"model", "ai"} else "user"
        await send_transcript(ws, state.session_id, normalized_role, content, turn_id=turn_id)
