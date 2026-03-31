from __future__ import annotations

from dataclasses import replace

from app.interview.domain.interview_memory import compact_context_text
from app.interview.domain.turn_text import (
    looks_like_complete_ai_question,
    sanitize_ai_turn_text,
)
from app.interview.runtime.delivery import build_ai_delivery_plan, to_prepared_tts_audio_from_pcm
from app.interview.runtime.live_client import (
    build_live_session_instruction,
    request_live_spoken_text_turn,
)
from app.interview.runtime.live_turns import prepare_opening_turn
from app.interview.runtime.prepared_opening_store import PreparedOpeningArtifact
from app.interview.runtime.session_support import create_live_interview_session
from app.interview.runtime.state import VoiceWsState
from app.interview.runtime.turn_ids import next_ai_turn_id
from app.interview.transcript.session_state import hydrate_state_from_session_row, runtime_timing
from app.interview.runtime.ws_runtime_wiring import build_live_client_deps
from app.interview.runtime.voice_support import pcm16le_bytes_to_base64_chunks


def _build_preflight_session_instruction(state: VoiceWsState) -> str:
    return build_live_session_instruction(
        state,
        compact_context_text=compact_context_text,
    )


def _noop_turn_prompt(*_args, **_kwargs) -> str:
    return ""


def _to_prepared_audio(pcm_bytes: bytes, *, sample_rate: int, provider: str):
    return to_prepared_tts_audio_from_pcm(
        pcm_bytes,
        sample_rate=sample_rate,
        provider=provider,
        pcm_to_base64_chunks=pcm16le_bytes_to_base64_chunks,
    )


_LIVE_CLIENT_DEPS = build_live_client_deps(
    create_live_interview_session=create_live_interview_session,
    build_session_instruction=_build_preflight_session_instruction,
    build_turn_prompt=_noop_turn_prompt,
    to_prepared_tts_audio_from_pcm=_to_prepared_audio,
    sanitize_ai_turn_text=sanitize_ai_turn_text,
    looks_like_complete_ai_question=looks_like_complete_ai_question,
)


async def prepare_opening_artifact_from_session(
    session: dict[str, object],
) -> PreparedOpeningArtifact | None:
    state = VoiceWsState()
    hydrate_state_from_session_row(state, session, turns=[])

    spec = prepare_opening_turn(
        state,
        next_turn_id=next_ai_turn_id(state.session_id),
        prompt="",
        question_type="motivation_validation",
        runtime_timing=runtime_timing,
    )

    try:
        authoritative_text, prepared_audio, spoken_provider = await request_live_spoken_text_turn(
            state,
            text=spec.prompt,
            deps=_LIVE_CLIENT_DEPS,
        )
        if prepared_audio is None:
            return None
        delivery_plan = await build_ai_delivery_plan(
            text=authoritative_text,
            preferred_full_audio=prepared_audio,
        )
        if not delivery_plan.segments:
            return None
        return PreparedOpeningArtifact(
            spec=replace(spec, prompt=authoritative_text),
            delivery_plan=delivery_plan,
            spoken_provider=spoken_provider,
        )
    finally:
        if state.live_interview is not None:
            await state.live_interview.close()


__all__ = ["prepare_opening_artifact_from_session"]
