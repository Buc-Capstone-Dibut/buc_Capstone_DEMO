"""시연 고정 대본 — 다음 대본 줄 음성 선생성(prefetch).

면접관 대사가 고정이므로 한 줄을 전달하자마자 다음 줄 음성을 백그라운드에서 미리 만들어 둔다.
지원자가 '전송'을 누르면 만들어 둔 음성을 바로 재생해, 라이브 낭독(4~8초)을 임계 경로에서 뺀다.

- 캐시 키는 대본 줄 인덱스(demo_script_line 의 인자)다. 전달 실패로 커서가 되돌아가 같은 줄을
  다시 보내면 같은 음성을 재사용한다. 이미 지나간 줄의 (끝난) 태스크만 다음 예약 때 정리한다.
- 선생성은 전용 라이브 세션(state.demo_script_prefetch_live)에서만 돈다. 본 세션(state.live_interview)과
  세션 문맥·close()·응답 스트림을 공유하지 않으므로, 캐시를 놓친 임계 경로 요청과 겹쳐도 서로 오염되지 않는다.
  GeminiLiveInterviewSession 은 턴 송수신만 잠그고 close() 는 진행 중인 턴과 경합하므로, 전용 세션 위에서도
  선생성끼리는 잠금으로 직렬화한다.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable

from app.interview.domain.demo_script import QUESTIONS, demo_script_line
from app.interview.runtime.live_turns import is_demo_script_state
from app.interview.runtime.state import PreparedTtsAudio, VoiceWsState

logger = logging.getLogger("dibut.ws")

# 진행 중인 선생성을 기다리는 상한 — 보통 처음부터 새로 읽히는 것보다 빠르지만, 멈춘 요청에 묶이지는 않게 한다.
DEMO_SCRIPT_PREFETCH_WAIT_SEC = 8.0

ScriptedLineSpeaker = Callable[[VoiceWsState, str], Awaitable[PreparedTtsAudio | None]]


def _task_audio(task: asyncio.Task[PreparedTtsAudio | None]) -> PreparedTtsAudio | None:
    if not task.done() or task.cancelled() or task.exception() is not None:
        return None
    return task.result()


def schedule_demo_script_prefetch(
    state: VoiceWsState,
    *,
    line_index: int,
    speak: ScriptedLineSpeaker | None,
) -> None:
    """대본 줄 line_index(마지막 질문 다음이면 CLOSING_TEXT) 음성을 백그라운드에서 만들어 둔다."""
    if speak is None or not is_demo_script_state(state) or state.session_status == "completed":
        return
    if line_index < 0 or line_index > len(QUESTIONS):
        return
    tasks = state.demo_script_prefetch_tasks
    for stale_index in [index for index, task in tasks.items() if index < line_index and task.done()]:
        tasks.pop(stale_index, None)
    existing = tasks.get(line_index)
    if existing is not None and (not existing.done() or _task_audio(existing) is not None):
        return

    text, _ = demo_script_line(line_index)
    if state.demo_script_prefetch_lock is None:
        state.demo_script_prefetch_lock = asyncio.Lock()
    lock = state.demo_script_prefetch_lock

    async def runner() -> PreparedTtsAudio | None:
        try:
            async with lock:
                return await speak(state, text)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.warning(
                "demo script line prefetch failed (session=%s, line=%s)",
                state.session_id,
                line_index,
                exc_info=True,
            )
            return None

    tasks[line_index] = asyncio.create_task(runner())


async def take_demo_script_prefetched_audio(
    state: VoiceWsState,
    line_index: int,
    *,
    wait_sec: float = DEMO_SCRIPT_PREFETCH_WAIT_SEC,
) -> PreparedTtsAudio | None:
    """선생성된 음성을 돌려준다. 아직 만드는 중이면 wait_sec 까지 기다리고, 없거나 실패면 None(기존 경로로 폴백)."""
    task = state.demo_script_prefetch_tasks.get(line_index)
    if task is None:
        return None
    if not task.done():
        try:
            await asyncio.wait_for(asyncio.shield(task), timeout=wait_sec)
        except asyncio.TimeoutError:
            logger.warning(
                "demo script line prefetch still running; falling back (session=%s, line=%s)",
                state.session_id,
                line_index,
            )
            return None
        except asyncio.CancelledError:
            if task.cancelled():
                return None
            raise
    return _task_audio(task)


async def clear_demo_script_prefetch(state: VoiceWsState) -> None:
    """세션 종료·재초기화·연결 정리 시 선생성 태스크를 취소하고 전용 라이브 세션을 닫는다."""
    tasks = list(state.demo_script_prefetch_tasks.values())
    state.demo_script_prefetch_tasks.clear()
    for task in tasks:
        if not task.done():
            task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    live = state.demo_script_prefetch_live
    state.demo_script_prefetch_live = None
    if live is not None:
        try:
            await live.close()
        except Exception:
            logger.warning("demo script prefetch live session close failed", exc_info=True)


__all__ = [
    "DEMO_SCRIPT_PREFETCH_WAIT_SEC",
    "ScriptedLineSpeaker",
    "clear_demo_script_prefetch",
    "schedule_demo_script_prefetch",
    "take_demo_script_prefetched_audio",
]
