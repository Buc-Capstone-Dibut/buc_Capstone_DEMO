from __future__ import annotations

import asyncio
from typing import Any

from app.interview.runtime.state import VoiceWsState
from app.interview.transcript.store import persist_turn as persist_transcript_turn
from app.interview.transcript.store import update_turn as update_transcript_turn
from app.services.interview_service import InterviewService


class RuntimeServiceAdapter:
    def __init__(self, service: InterviewService) -> None:
        self._service = service

    async def persist_turn(
        self,
        state: VoiceWsState,
        *,
        role: str,
        content: str,
        channel: str,
        payload: dict[str, Any],
    ) -> Any:
        return await persist_transcript_turn(
            state,
            append_turn=self._service.append_turn,
            session_id=state.session_id,
            role=role,
            content=content,
            channel=channel,
            payload=payload,
        )

    async def update_turn_content(
        self,
        state: VoiceWsState,
        *,
        turn_id: str,
        content: str,
        payload_patch: dict[str, Any] | None = None,
    ) -> Any:
        return await update_transcript_turn(
            state,
            update_turn_content=self._service.update_turn_content,
            turn_id=turn_id,
            content=content,
            payload_patch=payload_patch,
        )

    async def update_session_status(
        self,
        session_id: str,
        status: str,
        current_phase: str | None = None,
    ) -> None:
        await asyncio.to_thread(self._service.update_session_status, session_id, status, current_phase)

    async def set_runtime_status(
        self,
        session_id: str,
        runtime_status: str,
        current_phase: str | None = None,
    ) -> Any:
        return await asyncio.to_thread(
            self._service.set_runtime_status,
            session_id,
            runtime_status,
            current_phase,
        )

    async def set_closing_announced(self, session_id: str) -> None:
        await asyncio.to_thread(self._service.set_closing_announced, session_id, True)

    async def mark_runtime_resumed(self, session_id: str) -> dict[str, Any] | None:
        return await asyncio.to_thread(self._service.mark_runtime_resumed, session_id)

    async def mark_runtime_connected(
        self,
        session_id: str,
        live_provider: str,
        live_model: str,
    ) -> dict[str, Any] | None:
        return await asyncio.to_thread(
            self._service.mark_runtime_connected,
            session_id,
            live_provider=live_provider,
            live_model=live_model,
        )

    async def mark_runtime_disconnected(self, session_id: str, grace_sec: int) -> Any:
        return await asyncio.to_thread(
            self._service.mark_runtime_disconnected,
            session_id,
            grace_sec=grace_sec,
        )


__all__ = ["RuntimeServiceAdapter"]
