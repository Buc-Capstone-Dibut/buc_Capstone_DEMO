from __future__ import annotations

import asyncio
from functools import partial
from typing import Any, Callable

from app.interview.runtime.state import VoiceWsState
from app.interview.transcript.runtime_cache import append_cached_turn, update_cached_turn_content


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
        row_id=str(row.get("id") or "") or None,
        role=str(row.get("role") or role),
        content=str(row.get("content") or content),
        channel=str(row.get("channel") or channel),
        payload=row.get("payload") or payload,
        turn_index=row.get("turn_index"),
        created_at=row.get("created_at"),
    )
    return row


async def update_turn(
    state: VoiceWsState,
    *,
    update_turn_content: Callable[..., dict[str, Any] | None],
    turn_id: str,
    content: str,
    payload_patch: dict[str, Any] | None = None,
) -> dict[str, Any]:
    updated_turn = await asyncio.to_thread(
        partial(
            update_turn_content,
            turn_id,
            content,
            payload_patch,
        )
    )
    row = updated_turn or {}
    update_cached_turn_content(
        state,
        row_id=str(row.get("id") or turn_id),
        content=str(row.get("content") or content),
        payload=row.get("payload") if isinstance(row.get("payload"), dict) else None,
    )
    return row
