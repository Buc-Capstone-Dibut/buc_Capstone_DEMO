from __future__ import annotations

from fastapi import APIRouter, WebSocket

from app.interview.runtime.ws_runtime import run_voice_client_ws

router = APIRouter(prefix="/v1/interview/ws", tags=["ws"])


@router.websocket("/client")
async def client_ws(websocket: WebSocket) -> None:
    await run_voice_client_ws(websocket)
