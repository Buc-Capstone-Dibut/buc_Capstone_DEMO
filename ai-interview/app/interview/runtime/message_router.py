from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from fastapi import WebSocket

from app.interview.runtime.state import VoiceWsState

VALID_AVATAR_STATES = {"idle", "thinking", "listening", "speaking"}
AUDIO_DATA_MESSAGE_TYPES = {"mic-audio-data", "raw-audio-data"}
AUDIO_END_MESSAGE_TYPES = {"mic-audio-end", "flush-audio", "end-utterance"}


async def _noop_begin_live_input_stream(*_args: Any, **_kwargs: Any) -> bool:
    return False


async def _noop_push_live_audio_chunk(
    *_args: Any,
    **_kwargs: Any,
) -> bool:
    return False


@dataclass(frozen=True)
class ClientMessageRouterDeps:
    send_json: Callable[..., Awaitable[bool]]
    send_avatar_state: Callable[..., Awaitable[bool]]
    handle_session_init: Callable[..., Awaitable[None]]
    coerce_audio_chunk: Callable[[Any], list[float]]
    enqueue_user_segment: Callable[..., Awaitable[None]]
    reset_realtime_user_transcript: Callable[[VoiceWsState], None]
    resume_listening: Callable[..., Awaitable[Any]]
    cancel_playback_resume_task: Callable[[VoiceWsState], None]
    runtime_architecture: str = ""
    begin_live_input_stream: Callable[..., Awaitable[bool]] | None = _noop_begin_live_input_stream
    push_live_input_audio_chunk: Callable[[VoiceWsState, list[float], int], Awaitable[bool]] | None = _noop_push_live_audio_chunk
    push_parallel_stt_audio_chunk: Callable[[WebSocket, VoiceWsState, list[float], int], Awaitable[bool]] | None = _noop_push_live_audio_chunk


async def handle_client_message(
    ws: WebSocket,
    state: VoiceWsState,
    data: dict[str, Any],
    *,
    deps: ClientMessageRouterDeps,
) -> None:
    msg_type = data.get("type")

    if msg_type == "ping":
        await deps.send_json(ws, {"type": "pong"})
        return

    if msg_type == "health":
        await deps.send_json(ws, {"type": "health", "status": "ok"})
        return

    if msg_type == "echo":
        await deps.send_json(ws, {"type": "echo", "data": data.get("data")})
        return

    if msg_type == "init-interview-session":
        await deps.handle_session_init(ws, state, data)
        return

    if msg_type == "avatar.state.set":
        requested = data.get("state", "idle")
        next_state = requested if requested in VALID_AVATAR_STATES else "idle"
        session_for_event = data.get("sessionId") or state.session_id
        await deps.send_avatar_state(ws, next_state, session_for_event)
        return

    if msg_type in AUDIO_DATA_MESSAGE_TYPES:
        if not state.session_id:
            await deps.send_json(ws, {"type": "error", "message": "session is not initialized"})
            return

        audio_chunk = deps.coerce_audio_chunk(data.get("audio"))
        if not audio_chunk:
            return
        sample_rate = data.get("sampleRate")
        try:
            normalized_sample_rate = int(float(sample_rate)) if sample_rate is not None else int(state.vad.sample_rate)
        except (TypeError, ValueError):
            normalized_sample_rate = int(state.vad.sample_rate)
        if normalized_sample_rate < 8000:
            normalized_sample_rate = int(state.vad.sample_rate or 16000)
        state.vad.sample_rate = normalized_sample_rate

        if (
            (deps.runtime_architecture or "").strip().lower() == "live-only"
            and not state.processing_audio
        ):
            live_input_ready = state.live_input_turn_active
            if deps.begin_live_input_stream is not None and not live_input_ready:
                live_input_ready = await deps.begin_live_input_stream(ws, state)
            if deps.push_live_input_audio_chunk is not None and live_input_ready:
                await deps.push_live_input_audio_chunk(state, audio_chunk, normalized_sample_rate)
            if deps.push_parallel_stt_audio_chunk is not None and live_input_ready:
                await deps.push_parallel_stt_audio_chunk(ws, state, audio_chunk, normalized_sample_rate)

        if (
            state.pending_user_segments
            and state.pending_user_segment_task
            and not state.pending_user_segment_task.done()
            and not state.processing_audio
        ):
            chunk_duration_ms = len(audio_chunk) / max(state.vad.sample_rate, 1) * 1000.0
            if state.vad.is_speech_chunk(audio_chunk):
                state.pending_segment_resume_ms += chunk_duration_ms
                architecture = (deps.runtime_architecture or "").strip().lower()
                resume_threshold_ms = max(
                    80.0 if architecture == "live-only" else 160.0,
                    float(state.vad.speech_start_ms) * (0.55 if architecture == "live-only" else 1.0),
                )
                if state.pending_segment_resume_ms >= resume_threshold_ms:
                    state.pending_user_segment_task.cancel()
                    state.pending_user_segment_task = None
                    state.pending_segment_resume_ms = 0.0
            else:
                state.pending_segment_resume_ms = 0.0

        segment = state.vad.feed(audio_chunk)
        if segment:
            state.last_vad_event = dict(state.vad.last_segment_info)
            await deps.enqueue_user_segment(
                ws,
                state,
                segment,
                vad_meta=state.last_vad_event,
                flush_now=False,
            )
        return

    if msg_type in AUDIO_END_MESSAGE_TYPES:
        if not state.session_id:
            return
        segment = state.vad.flush()
        if segment:
            state.last_vad_event = dict(state.vad.last_segment_info)
            await deps.enqueue_user_segment(
                ws,
                state,
                segment,
                vad_meta=state.last_vad_event,
                flush_now=True,
            )
        elif state.pending_user_segments:
            state.pending_segment_resume_ms = 0.0
            await deps.enqueue_user_segment(ws, state, b"", flush_now=True)
        else:
            state.pending_segment_resume_ms = 0.0
            if (
                (deps.runtime_architecture or "").strip().lower() == "live-only"
                and (
                    state.live_input_turn_active
                    or state.live_input_streamed_user_text
                    or state.live_input_streamed_ai_text
                )
            ):
                await deps.enqueue_user_segment(ws, state, b"", flush_now=True)
            else:
                deps.reset_realtime_user_transcript(state)
                await deps.resume_listening(ws, state)
        return

    if msg_type == "audio-playback-complete":
        ack_turn_id = str(data.get("turnId") or "").strip()
        if ack_turn_id and ack_turn_id == state.waiting_playback_turn_id:
            state.waiting_playback_turn_id = ""
            deps.cancel_playback_resume_task(state)
            await deps.resume_listening(ws, state, turn_id=ack_turn_id)
        return

    if msg_type == "update-interview-phase":
        phase = data.get("phase", "introduction")
        state.current_phase = phase
        await deps.send_json(
            ws,
            {
                "type": "interview-phase-updated",
                "phase": phase,
                "guide": "phase updated",
                "message": f"면접 단계가 {phase} 로 갱신되었습니다.",
            },
        )
        return

    if msg_type == "behavior-data":
        await deps.send_json(
            ws,
            {
                "type": "control",
                "text": "warning",
                "message": "MVP: behavior-data 수신됨",
            },
        )
        return

    await deps.send_json(
        ws,
        {
            "type": "warning",
            "message": f"unsupported message type: {msg_type}",
        },
    )
