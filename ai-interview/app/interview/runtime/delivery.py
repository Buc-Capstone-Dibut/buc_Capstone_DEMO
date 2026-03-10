from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from itertools import count
from typing import Any, Awaitable, Callable

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from app.interview.runtime.state import AiDeliveryPlan, PreparedDeliverySegment, PreparedTtsAudio, VoiceWsState

AUDIO_PACKET_SEQ = count()
AI_DELIVERY_LOOKAHEAD_SEC = 0.32


def remember_ai_tts(
    state: VoiceWsState,
    text: str,
    prepared: PreparedTtsAudio | None,
    *,
    playback_skew_sec: float,
    audio_guard_sec: float,
) -> None:
    if not prepared or not prepared.chunks:
        state.last_ai_tts_text = ""
        state.last_ai_audio_guard_until = 0.0
        return
    state.last_ai_tts_text = (text or "").strip()
    state.last_ai_audio_guard_until = time.monotonic() + prepared.duration_sec + playback_skew_sec + audio_guard_sec


async def build_ai_delivery_plan(
    *,
    text: str,
    preferred_full_audio: PreparedTtsAudio | None = None,
) -> AiDeliveryPlan:
    normalized = " ".join((text or "").split()).strip()
    if not normalized:
        return AiDeliveryPlan()

    if preferred_full_audio is None:
        return AiDeliveryPlan(
            segments=[PreparedDeliverySegment(text=normalized, prepared_audio=None)],
            mode="text-only",
            provider="",
        )

    return AiDeliveryPlan(
        segments=[PreparedDeliverySegment(text=normalized, prepared_audio=preferred_full_audio)],
        mode="live-audio",
        provider=preferred_full_audio.provider,
    )


def to_prepared_tts_audio_from_pcm(
    pcm_bytes: bytes,
    *,
    sample_rate: int,
    provider: str,
    pcm_to_base64_chunks: Callable[..., tuple[list[str], float]],
) -> PreparedTtsAudio | None:
    if not pcm_bytes:
        return None
    chunks, duration_sec = pcm_to_base64_chunks(pcm_bytes, sample_rate=sample_rate)
    if not chunks:
        return None
    return PreparedTtsAudio(
        chunks=chunks,
        sample_rate=sample_rate,
        provider=provider,
        duration_sec=duration_sec,
    )


async def send_prepared_tts_audio(
    ws: WebSocket,
    session_id: str,
    prepared: PreparedTtsAudio,
    *,
    turn_id: str,
    send_json: Callable[..., Awaitable[bool]],
) -> bool:
    if not prepared.chunks:
        return ws.client_state == WebSocketState.CONNECTED

    for idx, chunk in enumerate(prepared.chunks):
        sent = await send_json(
            ws,
            {
                "type": "audio",
                "audioBase64": chunk,
                "sampleRate": prepared.sample_rate,
                "provider": prepared.provider,
                "sessionId": session_id,
                "turnId": turn_id,
                "chunkIndex": idx,
                "chunkCount": len(prepared.chunks),
                "packetSeq": next(AUDIO_PACKET_SEQ),
                "isFinalChunk": idx == len(prepared.chunks) - 1,
            },
        )
        if not sent:
            return False
    return True


async def stream_prepared_ai_delivery(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    delivery_plan: AiDeliveryPlan,
    turn_id: str,
    emit_delta: bool,
    starting_seq: int = 0,
    remember_ai_tts_fn: Callable[..., None],
    send_transcript_delta: Callable[..., Awaitable[bool]],
    send_avatar_state: Callable[..., Awaitable[bool]],
    send_prepared_tts_audio_fn: Callable[..., Awaitable[bool]],
) -> bool:
    if not state.session_id or not delivery_plan.segments:
        return False

    has_audio = False
    delta_seq = starting_seq
    accumulated = ""
    for idx, segment in enumerate(delivery_plan.segments):
        segment_text = (segment.text or "").strip()
        if not segment_text:
            continue

        accumulated = f"{accumulated} {segment_text}".strip() if accumulated else segment_text
        if emit_delta:
            delta_seq += 1
            await send_transcript_delta(
                ws,
                state.session_id,
                "ai",
                segment_text,
                accumulated,
                delta_seq,
                turn_id=turn_id,
            )

        prepared = segment.prepared_audio
        remember_ai_tts_fn(state, segment_text, prepared)
        if prepared is None:
            continue

        if not has_audio:
            if not await send_avatar_state(ws, "speaking", state.session_id):
                return False
            has_audio = True

        if not await send_prepared_tts_audio_fn(ws, state.session_id, prepared, turn_id=turn_id):
            return has_audio

        has_later_audio = any(
            next_segment.prepared_audio is not None for next_segment in delivery_plan.segments[idx + 1 :]
        )
        if has_later_audio:
            await asyncio.sleep(max(0.0, prepared.duration_sec - AI_DELIVERY_LOOKAHEAD_SEC))

    if has_audio:
        await send_avatar_state(ws, "idle", state.session_id)
    return has_audio


@dataclass(frozen=True)
class ReplayLastModelTurnDeps:
    build_ai_delivery_plan: Callable[..., Awaitable[AiDeliveryPlan]]
    set_runtime_status: Callable[[str, str, str | None], Awaitable[Any]]
    send_json: Callable[..., Awaitable[bool]]
    send_runtime_meta_snapshot: Callable[..., Awaitable[bool]]
    stream_prepared_ai_delivery: Callable[..., Awaitable[bool]]
    log_runtime_event: Callable[..., None]
    arm_playback_resume: Callable[..., None]
    resume_listening: Callable[..., Awaitable[Any]]


async def replay_last_model_turn(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    next_turn_id: Callable[[str], str],
    deps: ReplayLastModelTurnDeps,
) -> bool:
    if not state.session_id or not state.turn_history:
        return False

    for turn in reversed(state.turn_history):
        role = turn.get("role")
        if role not in {"model", "ai"}:
            continue
        text = (turn.get("content") or "").strip()
        if not text:
            continue
        payload = turn.get("payload") if isinstance(turn.get("payload"), dict) else {}
        stored_turn_id = str(payload.get("turn_id") or payload.get("turnId") or "").strip()
        turn_id = stored_turn_id or next_turn_id(state.session_id)
        delivery_plan = await deps.build_ai_delivery_plan(text=text, turn_id=turn_id)
        state.runtime_status = "model_speaking"
        await deps.set_runtime_status(state.session_id, "model_speaking", state.current_phase)
        await deps.send_json(
            ws,
            {
                "type": "resume.replay",
                "sessionId": state.session_id,
                "turnId": turn_id,
                "message": "연결이 복구되어 마지막 질문을 다시 들려드립니다.",
            },
        )
        await deps.send_json(
            ws,
            {
                "type": "interview-phase-updated",
                "phase": state.current_phase,
                "guide": "resume-replay",
                "message": "연결이 복구되어 마지막 질문을 다시 들려드립니다.",
                "turnId": turn_id,
            },
        )
        await deps.send_runtime_meta_snapshot(ws, state, turn_id=turn_id)
        await deps.send_json(ws, {"type": "full-text", "text": text, "turnId": turn_id})
        has_audio = await deps.stream_prepared_ai_delivery(
            ws,
            state,
            delivery_plan=delivery_plan,
            turn_id=turn_id,
            emit_delta=True,
        )
        deps.log_runtime_event(
            "resume-replay",
            state,
            turn_id=turn_id,
            phase=state.current_phase,
            delivery_mode=delivery_plan.mode,
            delivery_segments=delivery_plan.segment_count,
            audio_duration_ms=int(round(delivery_plan.total_duration_sec * 1000)),
        )
        if has_audio:
            deps.arm_playback_resume(
                ws,
                state,
                turn_id=turn_id,
                timeout_sec=max(1.2, delivery_plan.total_duration_sec + 0.8),
            )
        else:
            await deps.resume_listening(ws, state, turn_id=turn_id)
        return True
    return False
