"""시연 고정 대본 — 오프닝 음성 프로세스 공용 캐시와 기동 워밍업.

시연 세션의 오프닝 대사(DEMO_SCRIPT_OPENING)는 세션마다 글자까지 같다. 그래서 오프닝 음성을 프로세스당
한 번만 만들어 모든 시연 세션이 재사용한다(Render 단일 프로세스 — 메모리 캐시로 충분). '면접 시작하기'를
누른 뒤 prepare-opening 이 라이브 낭독(13초+)을 기다리느라 버튼이 오래 막히던 문제를 없앤다.
다음 대본 줄은 기존 세션별 선생성(demo_script_prefetch.py)이 그대로 맡는다.

- 키는 정규화한 오프닝 원문이다. 대본을 고치면 키가 달라져 옛 음성이 나갈 수 없고, 항목은 하나뿐이다.
- 만드는 중이면 공용 태스크 하나만 돈다. 기다리는 쪽은 shield 로 기다리므로 한 요청이 기다림을 그만둬도
  (시간 초과·연결 종료) 다른 세션이 기대는 생성은 계속된다.
- 실패(None·예외)는 캐시하지 않는다 — 다음 요청 때 다시 만든다. 공용 생성은 검증(coverage ≥ 0.8, 2회 시도)을
  통과한 음성만 돌려준다(accept_unverified=False). 어긋난 음성이 모든 세션에 박히지 않게 하기 위해서다.
- 생성은 프로세스 전용 라이브 세션에서 잠금으로 직렬화한다. GeminiLiveInterviewSession 의 close() 는
  진행 중인 턴과 경합하므로 세션을 동시 턴끼리 공유하지 않는다. 오류가 나면 닫고 다음 생성 때 새로 연다.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import replace
from time import monotonic
from typing import Awaitable, Callable

from app.interview.domain.demo_script import DEMO_SCRIPT_ID, OPENING
from app.interview.domain.interview_memory import compact_context_text
from app.interview.domain.turn_text import looks_like_complete_ai_question, sanitize_ai_turn_text
from app.interview.runtime.delivery import to_prepared_tts_audio_from_pcm
from app.interview.runtime.live_client import (
    LiveClientDeps,
    build_live_session_instruction,
    request_live_scripted_speech_turn,
)
from app.interview.runtime.session_support import create_live_interview_session
from app.interview.runtime.state import PreparedTtsAudio, VoiceWsState
from app.interview.runtime.voice_support import pcm16le_bytes_to_base64_chunks
from app.services.gemini_live_voice_service import GeminiLiveInterviewSession

logger = logging.getLogger("dibut.ws")

# 공용 생성기 — 세션 자원에 묶이면 안 된다(만든 음성·진행 중인 태스크를 다른 세션도 쓴다).
OpeningAudioGenerator = Callable[[str], Awaitable[PreparedTtsAudio | None]]


def _opening_key() -> str:
    return " ".join((OPENING or "").split()).strip()


_audio: dict[str, PreparedTtsAudio] = {}
_tasks: dict[str, asyncio.Task[PreparedTtsAudio | None]] = {}
_live: GeminiLiveInterviewSession | None = None
_live_lock: asyncio.Lock | None = None
_warmup_task: asyncio.Task[None] | None = None


def _copy(audio: PreparedTtsAudio) -> PreparedTtsAudio:
    # 전달 경로는 chunks 를 읽기만 하지만, 공용 객체를 세션마다 그대로 넘기지 않도록 목록은 복사해 준다.
    return replace(audio, chunks=list(audio.chunks))


def _shared_demo_state() -> VoiceWsState:
    # 실제 시연 세션과 같은 지시문·목소리가 나오도록 시연 판정 값만 둔 중립 상태(세션·지원자 정보 없음).
    return VoiceWsState(
        session_id="demo-script-shared",
        session_type="live_interview",
        job_data={"company": "더즌(dozn)", "demoScript": DEMO_SCRIPT_ID},
    )


_LIVE_CLIENT_DEPS = LiveClientDeps(
    create_live_interview_session=create_live_interview_session,
    build_session_instruction=lambda state: build_live_session_instruction(
        state,
        compact_context_text=compact_context_text,
    ),
    build_turn_prompt=lambda *_args, **_kwargs: "",
    to_prepared_tts_audio_from_pcm=lambda pcm_bytes, *, sample_rate, provider: to_prepared_tts_audio_from_pcm(
        pcm_bytes,
        sample_rate=sample_rate,
        provider=provider,
        pcm_to_base64_chunks=pcm16le_bytes_to_base64_chunks,
    ),
    sanitize_ai_turn_text=sanitize_ai_turn_text,
    looks_like_complete_ai_question=looks_like_complete_ai_question,
)


async def _close_live_locked() -> None:
    global _live
    live, _live = _live, None
    if live is not None:
        try:
            await live.close()
        except Exception:
            logger.warning("demo script shared live session close failed", exc_info=True)


async def generate_demo_script_opening_audio(text: str) -> PreparedTtsAudio | None:
    """프로세스 전용 라이브 세션에서 오프닝을 검증된 음성으로 읽힌다(잠금으로 직렬화)."""
    global _live, _live_lock
    if _live_lock is None:
        _live_lock = asyncio.Lock()
    async with _live_lock:
        if _live is None:
            _live = create_live_interview_session()
        try:
            _, audio, _ = await request_live_scripted_speech_turn(
                _shared_demo_state(),
                text=text,
                deps=_LIVE_CLIENT_DEPS,
                live=_live,
                accept_unverified=False,
            )
        except BaseException:
            # 턴 도중 끊긴 세션은 응답 스트림이 남아 다음 낭독을 오염시킬 수 있다 — 닫고 다음 생성 때 새로 연다.
            await _close_live_locked()
            raise
        # 다 읽힌 뒤에는 쉬는 라이브 세션을 붙잡아 두지 않는다(다음 생성 때 새로 연다).
        await _close_live_locked()
        return audio


async def _generate(key: str, generate: OpeningAudioGenerator) -> PreparedTtsAudio | None:
    audio: PreparedTtsAudio | None = None
    try:
        audio = await generate(key)
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.warning("demo script shared opening audio generation failed", exc_info=True)
    finally:
        if _tasks.get(key) is asyncio.current_task():
            _tasks.pop(key, None)
    if audio is not None:
        _audio[key] = audio
    return audio


async def get_demo_script_opening_audio(
    *,
    wait_sec: float | None,
    start: bool = True,
    generate: OpeningAudioGenerator | None = None,
) -> PreparedTtsAudio | None:
    """공용 오프닝 음성(복사본)을 돌려준다.

    캐시돼 있으면 바로 돌려준다. 만드는 중이면 그 태스크를 wait_sec 까지 기다린다(None = 끝까지).
    아무것도 없으면 start=True 일 때만 공용 생성을 시작해 기다리고, start=False 면 바로 None.
    시간 초과·실패면 None — 호출부가 기존 경로로 폴백한다. 기다림을 그만둬도 공용 생성은 계속된다.
    """
    key = _opening_key()
    cached = _audio.get(key)
    if cached is not None:
        return _copy(cached)
    task = _tasks.get(key)
    if task is None:
        if not start:
            return None
        task = asyncio.create_task(_generate(key, generate or generate_demo_script_opening_audio))
        _tasks[key] = task
    try:
        audio = await asyncio.wait_for(asyncio.shield(task), timeout=wait_sec)
    except asyncio.TimeoutError:
        logger.info("demo script shared opening audio still generating (wait_sec=%s)", wait_sec)
        return None
    except asyncio.CancelledError:
        if task.cancelled():
            return None
        raise
    return _copy(audio) if audio is not None else None


async def warm_up_demo_script_opening(*, generate: OpeningAudioGenerator | None = None) -> None:
    """기동 직후 오프닝 음성을 만들어 둔다. 실패는 로그만 남긴다(다음 prepare-opening 때 다시 만든다)."""
    started_at = monotonic()
    audio: PreparedTtsAudio | None = None
    try:
        audio = await get_demo_script_opening_audio(wait_sec=None, generate=generate)
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.warning("demo script opening warm-up failed", exc_info=True)
    logger.info(
        "demo script opening warm-up finished (ready=%s, elapsed=%.1fs)",
        audio is not None,
        monotonic() - started_at,
    )


def start_demo_script_opening_warmup() -> asyncio.Task[None]:
    """워밍업을 백그라운드로 띄운다(기동을 막지 않는다). 이미 돌고 있으면 그 태스크를 돌려준다."""
    global _warmup_task
    if _warmup_task is None or _warmup_task.done():
        _warmup_task = asyncio.create_task(warm_up_demo_script_opening())
    return _warmup_task


async def shutdown_demo_script_opening_cache() -> None:
    """프로세스 종료 시 워밍업·공용 생성을 멈추고 전용 라이브 세션을 닫는다."""
    global _warmup_task
    pending = [task for task in (_warmup_task, *_tasks.values()) if task is not None and not task.done()]
    _warmup_task = None
    for task in pending:
        task.cancel()
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)
    await _close_live_locked()


def reset_demo_script_opening_cache() -> None:
    """테스트용 — 캐시·진행 중 태스크 참조·전용 세션 참조를 비운다(이벤트 루프가 바뀌는 테스트 사이)."""
    global _live, _live_lock, _warmup_task
    _audio.clear()
    _tasks.clear()
    _live = None
    _live_lock = None
    _warmup_task = None


__all__ = [
    "OpeningAudioGenerator",
    "generate_demo_script_opening_audio",
    "get_demo_script_opening_audio",
    "reset_demo_script_opening_cache",
    "shutdown_demo_script_opening_cache",
    "start_demo_script_opening_warmup",
    "warm_up_demo_script_opening",
]
