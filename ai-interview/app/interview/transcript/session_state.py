from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.interview.domain.interview_memory import (
    record_question_type,
    remember_model_turn,
    remember_user_turn,
)
from app.interview.domain.pacing import (
    clamp_closing_threshold,
    clamp_target_duration,
    estimated_total_questions,
)
from app.interview.domain.turn_text import build_answer_quality_hint
from app.interview.runtime.session_support import elapsed_seconds
from app.interview.runtime.state import VoiceWsState
from app.interview.transcript.runtime_cache import (
    hydrate_state_from_session_row as cache_hydrate_state_from_session_row,
    hydrate_state_from_turns as cache_hydrate_state_from_turns,
    mark_session_status as cache_mark_session_status,
    reconnect_remaining_sec as cache_reconnect_remaining_sec,
    reset_realtime_user_transcript as cache_reset_realtime_user_transcript,
    runtime_timing as cache_runtime_timing,
)


def reset_realtime_user_transcript(state: VoiceWsState) -> None:
    cache_reset_realtime_user_transcript(state)


def mark_session_status(state: VoiceWsState, status: str, *, phase: str | None = None) -> None:
    cache_mark_session_status(state, status, phase=phase)


def hydrate_state_from_turns(state: VoiceWsState, turns: list[dict[str, Any]]) -> None:
    cache_hydrate_state_from_turns(
        state,
        turns,
        record_question_type=record_question_type,
        remember_model_turn=remember_model_turn,
        remember_user_turn=remember_user_turn,
        build_answer_quality_hint=build_answer_quality_hint,
    )


_logger = logging.getLogger("dibut.transcript")


def _portfolio_source_fetcher() -> Any:
    """포트폴리오 스냅샷 조회 함수를 지연 해석한다.

    InterviewService 를 module import 시점에 붙이면 순환 import 위험이 있어
    호출 시점에 lazy 로 가져오고, 메서드가 없으면(테스트 stub 등) None 을 반환한다.
    """
    try:
        from app.services.interview_service import InterviewService

        return getattr(InterviewService(), "get_portfolio_source", None)
    except Exception:
        return None


async def fetch_portfolio_source_async(session: dict[str, Any] | None) -> dict[str, Any] | None:
    """포트폴리오 스냅샷을 워커 스레드에서 조회한다(RAG-lite retrieve).

    동기 psycopg 쿼리를 이벤트 루프에서 직접 돌리면 같은 프로세스의 모든 실시간
    WS 세션이 함께 멈추므로 반드시 to_thread 로 우회한다. 실패는 경고 후 None —
    면접 진행을 막지 않는다(hydrate 는 job_payload 폴백으로 동작).
    """
    if not session or str(session.get("session_type") or "") != "portfolio_defense":
        return None
    fetcher = _portfolio_source_fetcher()
    if fetcher is None:
        return None
    session_id = str(session.get("id") or "")
    if not session_id:
        return None
    try:
        return await asyncio.to_thread(fetcher, session_id)
    except Exception:
        _logger.warning("portfolio source retrieve failed (session=%s)", session_id, exc_info=True)
        return None


def hydrate_state_from_session_row(
    state: VoiceWsState,
    session: dict[str, Any] | None,
    *,
    turns: list[dict[str, Any]] | None = None,
    portfolio_source: dict[str, Any] | None = None,
) -> None:
    cache_hydrate_state_from_session_row(
        state,
        session,
        turns=turns,
        clamp_target_duration=clamp_target_duration,
        clamp_closing_threshold=clamp_closing_threshold,
        estimated_total_questions=estimated_total_questions,
        hydrate_turns=hydrate_state_from_turns,
        portfolio_source=portfolio_source,
    )


def runtime_timing(state: VoiceWsState) -> tuple[int, int]:
    return cache_runtime_timing(state, elapsed_seconds=elapsed_seconds)


def reconnect_remaining_sec(state: VoiceWsState) -> int:
    return cache_reconnect_remaining_sec(state)


__all__ = [
    "hydrate_state_from_session_row",
    "hydrate_state_from_turns",
    "mark_session_status",
    "reconnect_remaining_sec",
    "reset_realtime_user_transcript",
    "runtime_timing",
]
