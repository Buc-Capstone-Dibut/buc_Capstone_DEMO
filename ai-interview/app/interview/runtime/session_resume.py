from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from fastapi import WebSocket

from app.interview.runtime.state import VoiceWsState


@dataclass(frozen=True)
class SessionResumeDeps:
    mark_runtime_resumed: Callable[[str], Awaitable[dict[str, Any] | None]]
    mark_runtime_connected: Callable[[str, str, str], Awaitable[dict[str, Any] | None]]
    hydrate_state_from_session_row: Callable[..., None]
    send_json: Callable[..., Awaitable[bool]]
    send_avatar_state: Callable[..., Awaitable[bool]]
    send_cached_turn_history: Callable[..., Awaitable[None]]
    send_runtime_meta_snapshot: Callable[..., Awaitable[bool]]
    replay_last_model_turn: Callable[..., Awaitable[bool]]
    generate_and_send_resume_live_turn: Callable[..., Awaitable[bool]]
    resume_listening: Callable[..., Awaitable[Any]]
    live_active_model: Callable[[VoiceWsState], str]


async def resume_existing_session(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    session: dict[str, Any],
    turns: list[dict[str, Any]],
    deps: SessionResumeDeps,
) -> bool:
    resumed_session = await deps.mark_runtime_resumed(str(session.get("id") or ""))
    if resumed_session:
        session = resumed_session

    connected_session = await deps.mark_runtime_connected(
        str(session.get("id") or ""),
        state.live_interview.provider if state.live_interview is not None else "gemini-live",
        deps.live_active_model(state),
    )
    if connected_session:
        session = connected_session

    deps.hydrate_state_from_session_row(state, session, turns=turns)

    await deps.send_json(
        ws,
        {
            "type": "interview-session-created",
            "client_uid": state.session_id,
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
            "resumed": True,
            "historyCount": len(state.turn_history),
        },
    )
    await deps.send_json(
        ws,
        {
            "type": "connection.resumed",
            "sessionId": state.session_id,
            "message": "연결이 복구되었습니다.",
        },
    )
    await deps.send_avatar_state(ws, "idle", state.session_id)
    await deps.send_cached_turn_history(ws, state)
    await deps.send_runtime_meta_snapshot(
        ws,
        state,
        finish_reason="already_completed" if state.session_status == "completed" else "",
    )

    if state.session_status == "completed":
        await deps.send_json(
            ws,
            {
                "type": "interview-phase-updated",
                "phase": state.current_phase,
                "guide": "resume-complete",
                "message": "완료된 면접 세션을 복구했습니다.",
            },
        )
        return True

    last_turn = state.turn_history[-1] if state.turn_history else {}
    last_role = str(last_turn.get("role") or "")
    if last_role in {"model", "ai"}:
        return await deps.replay_last_model_turn(ws, state)

    if last_role == "user":
        resumed_live_turn = await deps.generate_and_send_resume_live_turn(ws, state)
        if not resumed_live_turn:
            await deps.send_json(
                ws,
                {
                    "type": "warning",
                    "phase": state.current_phase,
                    "guide": "resume-live-unavailable",
                    "message": "재연결 후 질문 복구에 실패했습니다. 잠시 후 다시 시도해 주세요.",
                },
            )
            await deps.resume_listening(ws, state)
        return True

    await deps.send_json(
        ws,
        {
            "type": "interview-phase-updated",
            "phase": state.current_phase,
            "guide": "resume-listening",
            "message": "연결이 복구되었습니다. 이어서 답변해 주세요.",
        },
    )
    await deps.resume_listening(ws, state)
    return True
