from __future__ import annotations

import logging
from dataclasses import replace
from typing import Callable

from app.interview.domain.interview_memory import compact_context_text, select_opening_question_type
from app.interview.domain.turn_text import (
    looks_like_complete_ai_question,
    sanitize_ai_turn_text,
)
from app.interview.runtime.delivery import build_ai_delivery_plan, to_prepared_tts_audio_from_pcm
from app.interview.runtime.demo_script_opening_cache import get_demo_script_opening_audio
from app.interview.runtime.live_client import (
    build_live_session_instruction,
    request_live_spoken_text_turn,
)
from app.interview.runtime.live_turns import is_demo_script_state, prepare_opening_turn
from app.interview.runtime.prepared_opening_store import PreparedOpeningArtifact
from app.interview.runtime.session_support import create_live_interview_session
from app.interview.runtime.state import VoiceWsState
from app.interview.runtime.turn_ids import next_ai_turn_id
from app.interview.transcript.session_state import (
    fetch_portfolio_source_async,
    hydrate_state_from_session_row,
    runtime_timing,
)
from app.interview.runtime.ws_runtime_wiring import build_live_client_deps
from app.interview.runtime.voice_support import pcm16le_bytes_to_base64_chunks

logger = logging.getLogger("dibut.prepared_opening")

# 시연 대본 prepare-opening 이 공용 오프닝 생성을 기다리는 상한 — '면접 시작하기' 버튼을 오래 막지 않는다.
# 넘기면 prepared:false 로 응답하고, 방(WS)이 같은 공용 생성을 이어 기다린다(DEMO_SCRIPT_ROOM_OPENING_WAIT_SEC).
DEMO_SCRIPT_PREPARE_OPENING_WAIT_SEC = 1.5
# 방에서 진행 중인 공용 오프닝 생성을 기다리는 상한. 폴백(본 세션 새 낭독)은 처음부터 다시 읽혀 13초+ 걸리므로
# 이미 돌고 있는 공용 생성(검증 2회 포함)을 넉넉히 기다리는 편이 빠르다. 멈춘 요청에 묶이지는 않게 한다.
DEMO_SCRIPT_ROOM_OPENING_WAIT_SEC = 20.0


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


async def build_demo_script_opening_artifact(
    state: VoiceWsState,
    *,
    next_turn_id: str,
    runtime_timing: Callable[[VoiceWsState], tuple[int, int]],
    wait_sec: float,
    start: bool,
) -> PreparedOpeningArtifact | None:
    """시연 대본 오프닝을 프로세스 공용 음성으로 조립한다. 음성을 못 받으면 None(호출부 기존 경로)."""
    spec = prepare_opening_turn(
        state,
        next_turn_id=next_turn_id,
        prompt="",
        question_type=select_opening_question_type(state),
        runtime_timing=runtime_timing,
    )
    audio = await get_demo_script_opening_audio(wait_sec=wait_sec, start=start)
    if audio is None:
        return None
    delivery_plan = await build_ai_delivery_plan(text=spec.prompt, preferred_full_audio=audio)
    if not delivery_plan.segments:
        return None
    return PreparedOpeningArtifact(spec=spec, delivery_plan=delivery_plan, spoken_provider=audio.provider)


async def prepare_opening_artifact_from_session(
    session: dict[str, object],
) -> PreparedOpeningArtifact | None:
    state = VoiceWsState()
    portfolio_source = await fetch_portfolio_source_async(session)  # type: ignore[arg-type]
    hydrate_state_from_session_row(state, session, turns=[], portfolio_source=portfolio_source)

    if is_demo_script_state(state):
        # 시연 대본 — 오프닝 음성은 모든 세션이 같으므로 공용 캐시에서 꺼낸다. 아직이면 공용 생성만 걸어 두고
        # 잠깐만 기다린다(라이브 세션을 새로 열어 낭독을 기다리지 않는다).
        return await build_demo_script_opening_artifact(
            state,
            next_turn_id=next_ai_turn_id(state.session_id),
            runtime_timing=runtime_timing,
            wait_sec=DEMO_SCRIPT_PREPARE_OPENING_WAIT_SEC,
            start=True,
        )

    spec = prepare_opening_turn(
        state,
        next_turn_id=next_ai_turn_id(state.session_id),
        prompt="",
        question_type=select_opening_question_type(state),
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
    except Exception:
        # 프리플라이트(오프닝 선생성)는 부가 최적화다. Live 실패가 500 으로 전파되지 않게
        # 삼키고 None 을 반환하면 상위 핸들러가 prepared:false 로 우아하게 응답한다.
        logger.warning("prepared opening generation failed (session=%s)", state.session_id, exc_info=True)
        return None
    finally:
        if state.live_interview is not None:
            await state.live_interview.close()


__all__ = [
    "DEMO_SCRIPT_PREPARE_OPENING_WAIT_SEC",
    "DEMO_SCRIPT_ROOM_OPENING_WAIT_SEC",
    "build_demo_script_opening_artifact",
    "prepare_opening_artifact_from_session",
]
