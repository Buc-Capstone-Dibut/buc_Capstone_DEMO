from __future__ import annotations

import asyncio
from functools import partial
from typing import Any, Callable

from app.interview.runtime.state import VoiceWsState
from app.interview.transcript.runtime_cache import append_cached_turn


async def persist_turn(
    state: VoiceWsState,
    *,
    append_turn: Callable[..., dict[str, Any] | None],
    session_id: str,
    role: str,
    content: str,
    channel: str = "text",
    payload: dict[str, Any] | None = None,
    turn_index: int | None = None,
) -> dict[str, Any]:
    inserted_turn = await asyncio.to_thread(
        partial(
            append_turn,
            session_id,
            role,
            content,
            channel,
            payload,
            turn_index,
        )
    )
    row = inserted_turn or {}
    append_cached_turn(
        state,
        role=str(row.get("role") or role),
        content=str(row.get("content") or content),
        channel=str(row.get("channel") or channel),
        payload=row.get("payload") or payload,
        turn_index=row.get("turn_index"),
        created_at=row.get("created_at"),
    )
    return row
