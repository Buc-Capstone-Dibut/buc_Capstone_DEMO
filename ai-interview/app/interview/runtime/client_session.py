from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Awaitable, Callable

from fastapi import WebSocket

from app.interview.runtime.state import VoiceWsState


@dataclass(frozen=True)
class ClientSessionDeps:
    send_json: Callable[..., Awaitable[bool]]
    handle_client_message: Callable[..., Awaitable[None]]


async def run_client_session(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    deps: ClientSessionDeps,
) -> None:
    while True:
        raw = await ws.receive_text()

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            await deps.send_json(ws, {"type": "error", "message": "invalid json payload"})
            continue

        await deps.handle_client_message(ws, state, data)
