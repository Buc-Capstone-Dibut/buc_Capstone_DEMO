from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
import threading
import time
from difflib import SequenceMatcher
from itertools import count
from datetime import datetime, timezone
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from app.config import settings
from app.services.gemini_live_voice_service import (
    GeminiLiveInterviewSession,
    GeminiLiveSttService,
    GeminiLiveTtsService,
)
from app.services.interview_service import InterviewService
from app.services.llm_gemini import GeminiService
from app.services.voice_pipeline import (
    VadSegmenter,
    float_samples_to_pcm16le_bytes,
    float_samples_to_wav_bytes,
    wav_bytes_to_float_samples,
)

router = APIRouter(prefix="/v1/interview/ws", tags=["ws"])
service = InterviewService()
logger = logging.getLogger("dibut.ws")

AvatarState = str  # idle | thinking | listening | speaking

DEFAULT_TARGET_DURATION_SEC = 7 * 60
MIN_TARGET_DURATION_SEC = 5 * 60
MAX_TARGET_DURATION_SEC = 10 * 60
DEFAULT_CLOSING_THRESHOLD_SEC = 60
MIN_CLOSING_THRESHOLD_SEC = 30
MAX_CLOSING_THRESHOLD_SEC = 120
AVERAGE_TURN_SEC = 75
MIN_DYNAMIC_QUESTIONS = 4
MAX_DYNAMIC_QUESTIONS = 9
SESSION_GRACE_SEC = 20
CLOSING_ANNOUNCE_PREFIX = "시간 관계상 마지막 질문 드리겠습니다."
CLOSING_SENTENCE = "수고하셨습니다. 이것으로 모든 면접을 마치겠습니다."
LLM_STREAM_MODES = {"final", "delta"}
TTS_MODES = {"server"}
AUDIO_PACKET_SEQ = count()
AI_TURN_SEQ = count(1)
RUNTIME_MODE_LIVE_SINGLE = "live-single"
RUNTIME_MODE_DEGRADED_FALLBACK = "degraded-fallback"
RUNTIME_MODE_DISABLED = "disabled"
DEGRADED_MODE_SHORT_COOLDOWN_SEC = 18
DEGRADED_MODE_BASE_COOLDOWN_SEC = 45
DEGRADED_MODE_MAX_COOLDOWN_SEC = 180
VOICE_TURN_END_GRACE_SEC = max(0.2, settings.voice_turn_end_grace_ms / 1000.0)
VOICE_AI_ECHO_GUARD_SEC = max(0.5, settings.voice_ai_echo_guard_ms / 1000.0)
VOICE_AI_PLAYBACK_SKEW_SEC = 0.35
SHORT_STT_REPROMPT = "이어서 조금만 더 말씀해 주세요."
LIVE_OPENING_PROMPT = (
    "면접을 시작하세요. 간단한 인사 후 2~3문장으로 맥락을 짚고, "
    "마지막 문장에서 첫 질문 1개를 구체적으로 하세요. "
    "질문 외 메타설명은 금지합니다."
)
AI_TTS_SEGMENT_MAX_CHARS = 96
MEMORY_NOTE_LIMIT = 6
MEMORY_PROMPT_NOTE_LIMIT = 4
QUESTION_TYPE_LABELS = {
    "motivation_validation": "지원 동기 및 적합성 검증",
    "metric_validation": "성과 지표 검증",
    "tradeoff": "트레이드오프 판단",
    "failure_recovery": "장애/실패 복기",
    "design_decision": "설계 의사결정",
    "collaboration_conflict": "협업 갈등 해결",
    "priority_judgment": "우선순위 판단",
}
QUESTION_TYPE_ROTATION = (
    "metric_validation",
    "tradeoff",
    "failure_recovery",
    "design_decision",
    "collaboration_conflict",
    "priority_judgment",
)
_COMPLETE_ANSWER_ENDINGS = (
    "습니다",
    "입니다",
    "니다",
    "해요",
    "했어요",
    "했습니다",
    "합니다",
    "예요",
    "이에요",
    "네요",
    "군요",
    "죠",
    "어요",
    "아요",
)
_MEMORY_STOPWORDS = {
    "그냥",
    "정도",
    "부분",
    "경우",
    "관련",
    "이번",
    "저희",
    "회사",
    "업무",
    "프로젝트",
    "문제",
    "해결",
    "결과",
    "경험",
    "이유",
    "생각",
    "부분이",
    "부분은",
    "있는",
    "있습니다",
    "합니다",
    "했던",
    "있었고",
    "그리고",
    "그래서",
    "그때",
    "이어서",
    "말씀",
    "주세요",
}


@lru_cache
def get_gemini_service() -> GeminiService | None:
    if not settings.gemini_api_key:
        return None
    return GeminiService(api_key=settings.gemini_api_key, model_name=settings.gemini_model)


@lru_cache
def get_stt_service() -> GeminiLiveSttService:
    return GeminiLiveSttService(
        api_key=settings.gemini_api_key,
        model=settings.gemini_live_stt_model,
    )


@lru_cache
def get_tts_service() -> GeminiLiveTtsService:
    return GeminiLiveTtsService(
        api_key=settings.gemini_api_key,
        model=settings.gemini_tts_model,
        voice=(settings.gemini_live_tts_voice or "Kore"),
    )


def _create_live_interview_session() -> GeminiLiveInterviewSession:
    model_name = (settings.gemini_live_stt_model or "").strip() or "gemini-2.5-flash-native-audio-latest"
    fallback_models = [
        (settings.gemini_live_tts_model or "").strip(),
        "gemini-2.5-flash-native-audio-latest",
        "gemini-live-2.5-flash-preview",
        "gemini-2.0-flash-live-001",
    ]
    return GeminiLiveInterviewSession(
        api_key=settings.gemini_api_key,
        model=model_name,
        fallback_models=fallback_models,
        voice=(settings.gemini_live_tts_voice or "Kore"),
    )


def _clamp_target_duration(duration_sec: int | None) -> int:
    value = int(duration_sec or DEFAULT_TARGET_DURATION_SEC)
    return max(MIN_TARGET_DURATION_SEC, min(MAX_TARGET_DURATION_SEC, value))


def _clamp_closing_threshold(threshold_sec: int | None) -> int:
    value = int(threshold_sec or DEFAULT_CLOSING_THRESHOLD_SEC)
    return max(MIN_CLOSING_THRESHOLD_SEC, min(MAX_CLOSING_THRESHOLD_SEC, value))


def _estimated_total_questions(target_duration_sec: int) -> int:
    estimated = round(target_duration_sec / AVERAGE_TURN_SEC)
    return max(MIN_DYNAMIC_QUESTIONS, min(MAX_DYNAMIC_QUESTIONS, estimated))


def _phase_for_question_index(question_index: int, is_closing: bool = False) -> str:
    if is_closing:
        return "closing"
    if question_index <= 1:
        return "introduction"
    if question_index == 2:
        return "experience"
    if question_index == 3:
        return "technical"
    return "problem_solving"


def _elapsed_seconds(started_at: datetime | None) -> int:
    if not isinstance(started_at, datetime):
        return 0
    anchor = started_at if started_at.tzinfo else started_at.replace(tzinfo=timezone.utc)
    diff = datetime.now(timezone.utc) - anchor.astimezone(timezone.utc)
    return max(0, int(diff.total_seconds()))


def _latest_user_answer(messages: list[dict[str, Any]]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return (message.get("parts") or "").strip()
    return ""


def _build_answer_quality_hint(answer: str) -> str:
    text = (answer or "").strip()
    if not text:
        return "직전 답변 없음: 기본 난이도로 질문하세요."

    length = len(text)
    has_metric = bool(re.search(r"\d+[%건명개번일월년]|\d+\s*(ms|sec|s|배)", text))
    has_structure = bool(re.search(r"(문제|원인|해결|결과|배운 점|회고|기여)", text))

    hints: list[str] = []
    if length < 60:
        hints.append("답변이 매우 짧습니다. 추가 맥락과 구체 사례를 요구하세요.")
    elif length < 140:
        hints.append("핵심은 있으나 디테일이 부족할 수 있습니다. 근거와 의사결정 기준을 캐물으세요.")
    else:
        hints.append("답변 길이는 충분합니다. 깊이와 재현 가능성을 검증하세요.")

    if not has_metric:
        hints.append("수치화된 성과나 지표를 반드시 다시 요청하세요.")
    if not has_structure:
        hints.append("문제-행동-결과 구조(STAR)에 맞춰 다시 답변하도록 유도하세요.")

    return " ".join(hints)


def _looks_like_complete_answer(text: str) -> bool:
    normalized = (text or "").strip().rstrip("\"' ")
    if not normalized:
        return False
    if normalized[-1] in ".!?":
        return True
    return any(normalized.endswith(ending) for ending in _COMPLETE_ANSWER_ENDINGS)


def _looks_like_complete_ai_question(text: str) -> bool:
    normalized = (text or "").strip().rstrip("\"' ")
    if not normalized:
        return False
    if normalized[-1] in ".?!":
        return True
    question_endings = (
        "요",
        "나요",
        "까요",
        "세요",
        "드립니다",
        "말씀해 주세요",
        "설명해 주세요",
        "공유해 주세요",
        "어떻게 했나요",
    )
    return any(normalized.endswith(ending) for ending in question_endings)


def _is_short_stt_result(text: str, wav_bytes: bytes) -> bool:
    tokens = re.findall(r"[0-9A-Za-z가-힣]+", text or "")
    char_count = sum(len(token) for token in tokens)
    if char_count <= 2:
        return True

    complete = _looks_like_complete_answer(text)
    samples, sample_rate = wav_bytes_to_float_samples(wav_bytes)
    duration_ms = (len(samples) / max(sample_rate, 1)) * 1000.0 if samples else 0.0

    if not complete and char_count <= settings.voice_min_answer_chars:
        if duration_ms <= settings.voice_short_answer_max_duration_ms:
            return True
        if len(tokens) <= 2 and char_count <= settings.voice_min_answer_chars + 4:
            return True

    return False


def _normalize_compare_text(text: str) -> str:
    lowered = (text or "").lower()
    lowered = re.sub(r"\s+", "", lowered)
    return re.sub(r"[^0-9a-z가-힣]", "", lowered)


def _estimate_wav_duration_ms(wav_bytes: bytes) -> float:
    samples, sample_rate = wav_bytes_to_float_samples(wav_bytes)
    if not samples:
        return 0.0
    return (len(samples) / max(sample_rate, 1)) * 1000.0


def _live_active_model(state: VoiceWsState) -> str:
    live = state.live_interview
    if live is None:
        return ""
    return getattr(live, "active_model", "") or getattr(live, "model", "")


def _snapshot_vad_config(state: VoiceWsState) -> dict[str, Any]:
    return {
        "threshold": float(state.vad.threshold),
        "silence_ms": int(state.vad.silence_ms),
        "short_utterance_silence_ms": int(state.vad.short_utterance_silence_ms),
        "min_utterance_ms": int(state.vad.min_utterance_ms),
        "turn_end_grace_ms": int(round(state.turn_end_grace_sec * 1000.0)),
    }


def _merge_vad_events(events: list[dict[str, Any]]) -> dict[str, Any]:
    valid = [event for event in events if event]
    if not valid:
        return {}
    duration_ms = sum(float(event.get("duration_ms") or 0.0) for event in valid)
    merged = dict(valid[-1])
    merged["segment_count"] = len(valid)
    merged["duration_ms"] = round(duration_ms, 1)
    merged["reasons"] = [str(event.get("reason") or "") for event in valid if event.get("reason")]
    return merged


def _retune_vad_for_next_turn(state: VoiceWsState, *, utterance_duration_ms: float, short_answer: bool) -> None:
    if utterance_duration_ms > 0:
        state.recent_user_durations_ms.append(float(utterance_duration_ms))
        if len(state.recent_user_durations_ms) > 5:
            state.recent_user_durations_ms = state.recent_user_durations_ms[-5:]

    if short_answer:
        state.short_reprompt_streak = min(state.short_reprompt_streak + 1, 3)
    else:
        state.short_reprompt_streak = 0

    recent = state.recent_user_durations_ms[-3:]
    avg_ms = sum(recent) / len(recent) if recent else 0.0
    silence_ms = settings.voice_vad_silence_ms
    short_silence_ms = settings.voice_vad_short_utterance_silence_ms
    turn_end_grace_ms = settings.voice_turn_end_grace_ms

    if short_answer:
        silence_ms += 260
        short_silence_ms += 320
        turn_end_grace_ms += 180
    elif avg_ms >= 5200:
        silence_ms += 220
        short_silence_ms += 260
        turn_end_grace_ms += 140
    elif avg_ms >= 3200:
        silence_ms += 120
        short_silence_ms += 160
        turn_end_grace_ms += 80
    elif avg_ms and avg_ms <= 1800:
        silence_ms -= 80
        short_silence_ms -= 120
        turn_end_grace_ms -= 80

    if state.short_reprompt_streak >= 2:
        silence_ms += 140
        short_silence_ms += 180
        turn_end_grace_ms += 120

    silence_ms = max(500, min(short_silence_ms, silence_ms))
    short_silence_ms = max(silence_ms + 120, min(2600, short_silence_ms))
    turn_end_grace_ms = max(800, min(2200, turn_end_grace_ms))

    state.turn_end_grace_sec = turn_end_grace_ms / 1000.0
    state.vad.reconfigure(
        silence_ms=silence_ms,
        short_utterance_silence_ms=short_silence_ms,
    )


def _degraded_retry_after_sec(state: VoiceWsState) -> int:
    remaining = state.degraded_until_monotonic - time.monotonic()
    return max(0, int(round(remaining)))


def _degraded_cooldown_for_reason(reason: str, fail_count: int = 0) -> int:
    normalized = (reason or "").strip().lower()
    if normalized in {"stt-fallback", "continue-fallback"}:
        base = DEGRADED_MODE_SHORT_COOLDOWN_SEC
    elif normalized in {"live-disabled"}:
        base = DEGRADED_MODE_MAX_COOLDOWN_SEC
    else:
        base = DEGRADED_MODE_BASE_COOLDOWN_SEC
    if fail_count > 1:
        base += min((fail_count - 1) * 15, 60)
    return min(DEGRADED_MODE_MAX_COOLDOWN_SEC, base)


def _live_attempt_allowed(state: VoiceWsState) -> bool:
    if state.runtime_mode != RUNTIME_MODE_DEGRADED_FALLBACK:
        return True
    return _degraded_retry_after_sec(state) <= 0


def _pcm16le_bytes_to_base64_chunks(
    pcm_bytes: bytes,
    *,
    sample_rate: int,
    chunk_ms: int = 320,
) -> tuple[list[str], float]:
    if not pcm_bytes:
        return [], 0.0

    aligned_sample_rate = max(int(sample_rate or 24000), 1)
    bytes_per_sample = 2
    samples_per_chunk = max(int(aligned_sample_rate * chunk_ms / 1000.0), 2048)
    bytes_per_chunk = max(samples_per_chunk * bytes_per_sample, 4096)
    if bytes_per_chunk % 2:
        bytes_per_chunk += 1

    chunks = [
        base64.b64encode(pcm_bytes[idx:idx + bytes_per_chunk]).decode("ascii")
        for idx in range(0, len(pcm_bytes), bytes_per_chunk)
        if pcm_bytes[idx:idx + bytes_per_chunk]
    ]
    duration_sec = len(pcm_bytes) / float(aligned_sample_rate * bytes_per_sample)
    return chunks, duration_sec


def _coerce_audio_chunk(payload: Any, max_len: int = 16000) -> list[float]:
    if not isinstance(payload, list):
        return []

    chunk: list[float] = []
    for value in payload[:max_len]:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            continue
        if numeric > 1.0:
            numeric = 1.0
        elif numeric < -1.0:
            numeric = -1.0
        chunk.append(numeric)
    return chunk


def _normalize_llm_stream_mode(mode: Any) -> str:
    if isinstance(mode, str):
        lowered = mode.strip().lower()
        if lowered in LLM_STREAM_MODES:
            return lowered
    return "delta"


def _normalize_tts_mode(mode: Any) -> str:
    if not isinstance(mode, str):
        return "server"
    lowered = mode.strip().lower()
    if lowered in {"server", "full", "sentence", "client"}:
        return "server"
    return "server"


def _to_chat_history(turns: list[dict[str, Any]]) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []
    for turn in turns:
        role = turn.get("role", "user")
        normalized_role = "model" if role in ("ai", "model") else "user"
        history.append(
            {
                "role": normalized_role,
                "parts": (turn.get("content") or "").strip(),
            }
        )
    return history


def _merge_wav_segments(segments: list[bytes]) -> bytes:
    merged_samples: list[float] = []
    sample_rate = 16000

    for segment in segments:
        if not segment:
            continue
        samples, detected_rate = wav_bytes_to_float_samples(segment)
        if not samples:
            continue
        sample_rate = detected_rate or sample_rate
        merged_samples.extend(samples)

    if not merged_samples:
        return b""
    return float_samples_to_wav_bytes(merged_samples, sample_rate=sample_rate)


@dataclass
class VoiceWsState:
    session_id: str = ""
    session_type: str = "live_interview"
    personality: str = "professional"
    job_data: dict[str, Any] = field(default_factory=dict)
    resume_data: Any = field(default_factory=dict)
    current_phase: str = "introduction"
    target_duration_sec: int = DEFAULT_TARGET_DURATION_SEC
    closing_threshold_sec: int = DEFAULT_CLOSING_THRESHOLD_SEC
    estimated_total_questions: int = _estimated_total_questions(DEFAULT_TARGET_DURATION_SEC)
    planned_questions: list[dict[str, Any]] = field(default_factory=list)
    plan_attempted: bool = False
    plan_bootstrap_task: asyncio.Task[None] | None = None
    llm_stream_mode: str = "delta"
    tts_mode: str = "server"
    runtime_mode: str = RUNTIME_MODE_LIVE_SINGLE
    runtime_mode_reason: str = ""
    runtime_retry_after_sec: int = 0
    degraded_until_monotonic: float = 0.0
    degraded_fail_count: int = 0
    question_type_cursor: int = 0
    recent_question_types: list[str] = field(default_factory=list)
    recent_user_durations_ms: list[float] = field(default_factory=list)
    short_reprompt_streak: int = 0
    memory_notes: list[str] = field(default_factory=list)
    last_user_memory: str = ""
    last_model_memory: str = ""
    last_answer_quality_hint: str = ""
    turn_end_grace_sec: float = VOICE_TURN_END_GRACE_SEC
    processing_audio: bool = False
    pending_user_segments: list["PendingUserSegment"] = field(default_factory=list)
    pending_user_segment_task: asyncio.Task[None] | None = None
    realtime_user_pcm: bytearray = field(default_factory=bytearray)
    realtime_user_transcript: str = ""
    realtime_user_delta_seq: int = 0
    realtime_user_last_emit_at: float = 0.0
    live_interview: GeminiLiveInterviewSession | None = None
    last_ai_tts_text: str = ""
    last_ai_audio_guard_until: float = 0.0
    waiting_playback_turn_id: str = ""
    playback_resume_task: asyncio.Task[None] | None = None
    last_vad_event: dict[str, Any] = field(default_factory=dict)
    vad: VadSegmenter = field(
        default_factory=lambda: VadSegmenter(
            sample_rate=16000,
            threshold=settings.voice_vad_threshold,
            silence_ms=settings.voice_vad_silence_ms,
            min_speech_ms=settings.voice_min_speech_ms,
            min_utterance_ms=settings.voice_vad_min_utterance_ms,
            short_utterance_silence_ms=settings.voice_vad_short_utterance_silence_ms,
            max_segment_ms=settings.voice_max_segment_ms,
        )
    )


@dataclass
class PreparedTtsAudio:
    chunks: list[str]
    sample_rate: int
    provider: str
    duration_sec: float = 0.0


@dataclass
class PendingUserSegment:
    audio: bytes
    vad: dict[str, Any] = field(default_factory=dict)


async def _send_json(ws: WebSocket, payload: dict[str, Any]) -> bool:
    if ws.client_state != WebSocketState.CONNECTED:
        return False
    try:
        await ws.send_json(payload)
        return True
    except (WebSocketDisconnect, RuntimeError):
        return False


async def _send_avatar_state(ws: WebSocket, state: AvatarState, session_id: str) -> bool:
    return await _send_json(
        ws,
        {
            "type": "avatar.state",
            "state": state,
            "sessionId": session_id,
            "timestamp": int(time.time()),
        },
    )


async def _set_runtime_mode(
    ws: WebSocket,
    state: VoiceWsState,
    mode: str,
    reason: str = "",
    *,
    turn_id: str | None = None,
    retry_after_sec: int | None = None,
) -> None:
    normalized_mode = (mode or "").strip() or RUNTIME_MODE_DISABLED
    normalized_reason = (reason or "").strip()
    normalized_retry_after = max(0, int(retry_after_sec or 0))
    if (
        state.runtime_mode == normalized_mode
        and state.runtime_mode_reason == normalized_reason
        and state.runtime_retry_after_sec == normalized_retry_after
    ):
        return

    state.runtime_mode = normalized_mode
    state.runtime_mode_reason = normalized_reason
    state.runtime_retry_after_sec = normalized_retry_after
    if not state.session_id:
        return

    message = ""
    if normalized_mode == RUNTIME_MODE_DEGRADED_FALLBACK:
        message = "실시간 음성 경로가 불안정해 보조 처리 경로로 전환되었습니다."
    elif normalized_mode == RUNTIME_MODE_LIVE_SINGLE:
        message = "실시간 음성 경로가 정상화되었습니다."
    elif normalized_mode == RUNTIME_MODE_DISABLED:
        message = "실시간 음성 경로가 비활성화되어 있습니다."
    if normalized_retry_after > 0:
        message = f"{message} 약 {normalized_retry_after}초 뒤 Live 재시도를 허용합니다.".strip()

    payload: dict[str, Any] = {
        "type": "runtime.mode",
        "runtimeMode": normalized_mode,
        "runtimeReason": normalized_reason,
        "retryAfterSec": normalized_retry_after,
        "sessionId": state.session_id,
        "timestamp": int(time.time()),
        "message": message,
    }
    if turn_id:
        payload["turnId"] = turn_id
    await _send_json(ws, payload)


async def _enter_degraded_mode(
    ws: WebSocket,
    state: VoiceWsState,
    reason: str,
    *,
    turn_id: str | None = None,
) -> None:
    normalized_reason = (reason or "").strip()
    active_cooldown = _degraded_retry_after_sec(state) > 0
    if active_cooldown and state.runtime_mode == RUNTIME_MODE_DEGRADED_FALLBACK:
        await _set_runtime_mode(
            ws,
            state,
            RUNTIME_MODE_DEGRADED_FALLBACK,
            state.runtime_mode_reason or normalized_reason,
            turn_id=turn_id,
            retry_after_sec=_degraded_retry_after_sec(state),
        )
        return

    if state.runtime_mode_reason != normalized_reason:
        state.degraded_fail_count += 1
    cooldown_sec = _degraded_cooldown_for_reason(normalized_reason, state.degraded_fail_count)
    state.degraded_until_monotonic = max(state.degraded_until_monotonic, time.monotonic() + cooldown_sec)
    await _set_runtime_mode(
        ws,
        state,
        RUNTIME_MODE_DEGRADED_FALLBACK,
        normalized_reason,
        turn_id=turn_id,
        retry_after_sec=_degraded_retry_after_sec(state),
    )


async def _restore_live_mode(
    ws: WebSocket,
    state: VoiceWsState,
    reason: str,
    *,
    turn_id: str | None = None,
) -> None:
    state.degraded_until_monotonic = 0.0
    state.degraded_fail_count = 0
    await _set_runtime_mode(ws, state, RUNTIME_MODE_LIVE_SINGLE, reason, turn_id=turn_id)


def _cancel_playback_resume_task(state: VoiceWsState) -> None:
    if state.playback_resume_task and not state.playback_resume_task.done():
        state.playback_resume_task.cancel()
    state.playback_resume_task = None


def _arm_playback_resume(ws: WebSocket, state: VoiceWsState, *, turn_id: str, timeout_sec: float) -> None:
    state.waiting_playback_turn_id = turn_id
    _cancel_playback_resume_task(state)

    async def _resume_on_timeout() -> None:
        try:
            await asyncio.sleep(max(0.8, timeout_sec))
        except asyncio.CancelledError:
            return
        if state.waiting_playback_turn_id != turn_id:
            return
        logger.warning(
            "audio playback ack timeout; forcing mic resume",
            extra={"session_id": state.session_id, "turn_id": turn_id},
        )
        state.waiting_playback_turn_id = ""
        state.playback_resume_task = None
        await _resume_listening(ws, state, turn_id=turn_id)

    state.playback_resume_task = asyncio.create_task(_resume_on_timeout())


async def _send_transcript(
    ws: WebSocket,
    session_id: str,
    role: str,
    text: str,
    *,
    turn_id: str | None = None,
) -> bool:
    return await _send_json(
        ws,
        {
            "type": "transcript.final",
            "role": role,
            "text": text,
            "sessionId": session_id,
            "turnId": turn_id,
            "timestamp": int(time.time()),
        },
    )


def _remember_ai_tts(state: VoiceWsState, text: str, prepared: PreparedTtsAudio | None) -> None:
    if not prepared or not prepared.chunks:
        state.last_ai_tts_text = ""
        state.last_ai_audio_guard_until = 0.0
        return
    state.last_ai_tts_text = (text or "").strip()
    state.last_ai_audio_guard_until = (
        time.monotonic() + prepared.duration_sec + VOICE_AI_PLAYBACK_SKEW_SEC + VOICE_AI_ECHO_GUARD_SEC
    )


def _is_probable_ai_echo(state: VoiceWsState, text: str, wav_bytes: bytes) -> bool:
    if time.monotonic() > state.last_ai_audio_guard_until:
        return False

    reference = _normalize_compare_text(state.last_ai_tts_text)
    candidate = _normalize_compare_text(text)
    if not reference or not candidate:
        return False

    similarity = SequenceMatcher(None, candidate, reference).ratio()
    contains = candidate in reference or reference in candidate
    duration_ms = _estimate_wav_duration_ms(wav_bytes)

    if similarity >= 0.72:
        return True
    if contains and len(candidate) >= 6:
        return True
    if duration_ms <= 1600 and len(candidate) <= settings.voice_min_answer_chars:
        return True
    return False


async def _resume_listening(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    turn_id: str | None = None,
) -> None:
    state.waiting_playback_turn_id = ""
    _cancel_playback_resume_task(state)
    payload: dict[str, Any] = {"type": "control", "text": "start-mic"}
    if turn_id:
        payload["turnId"] = turn_id
    if state.session_id and await _send_json(ws, payload):
        await _send_avatar_state(ws, "listening", state.session_id)


async def _send_transcript_delta(
    ws: WebSocket,
    session_id: str,
    role: str,
    delta: str,
    accumulated_text: str,
    sequence: int,
    *,
    turn_id: str | None = None,
) -> bool:
    return await _send_json(
        ws,
        {
            "type": "transcript.delta",
            "role": role,
            "delta": delta,
            "accumulatedText": accumulated_text,
            "sessionId": session_id,
            "turnId": turn_id,
            "seq": sequence,
            "timestamp": int(time.time()),
        },
    )


def _reset_realtime_user_transcript(state: VoiceWsState) -> None:
    state.realtime_user_transcript = ""
    state.realtime_user_delta_seq = 0
    state.realtime_user_last_emit_at = 0.0


async def _emit_realtime_user_delta(
    ws: WebSocket,
    state: VoiceWsState,
    text: str,
) -> None:
    if not state.session_id:
        return

    cleaned = (text or "").strip()
    if not cleaned:
        return
    if cleaned == state.realtime_user_transcript:
        return

    previous = state.realtime_user_transcript
    if cleaned.startswith(previous):
        delta = cleaned[len(previous):]
    else:
        delta = cleaned
    state.realtime_user_transcript = cleaned
    state.realtime_user_delta_seq += 1
    state.realtime_user_last_emit_at = time.monotonic()
    await _send_transcript_delta(
        ws,
        state.session_id,
        "user",
        delta,
        cleaned,
        state.realtime_user_delta_seq,
    )


def _build_context(state: VoiceWsState) -> dict[str, Any]:
    return {
        "jobData": state.job_data,
        "resumeData": state.resume_data,
        "personality": state.personality,
        "memoryNotes": state.memory_notes[-MEMORY_NOTE_LIMIT:],
        "recentQuestionTypes": state.recent_question_types[-4:],
        "lastAnswerQualityHint": state.last_answer_quality_hint,
    }


def _compact_context_text(value: Any, max_chars: int = 1200) -> str:
    try:
        serialized = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    except Exception:
        serialized = str(value)
    normalized = re.sub(r"\s+", " ", serialized).strip()
    if len(normalized) <= max_chars:
        return normalized
    return f"{normalized[:max_chars]}..."


def _compress_memory_text(text: str, max_chars: int = 120) -> str:
    normalized = re.sub(r"\s+", " ", (text or "")).strip()
    if not normalized:
        return ""
    clipped = normalized if len(normalized) <= max_chars else f"{normalized[:max_chars].rstrip()}..."
    sentence_parts = [piece.strip() for piece in re.split(r"(?<=[.!?])\s+", clipped) if piece.strip()]
    return sentence_parts[0] if sentence_parts else clipped


def _extract_memory_keywords(text: str, *, max_items: int = 3) -> list[str]:
    tokens = re.findall(r"[0-9A-Za-z가-힣]{2,}", (text or "").lower())
    keywords: list[str] = []
    for token in tokens:
        if token in _MEMORY_STOPWORDS:
            continue
        if token.isdigit():
            continue
        if token not in keywords:
            keywords.append(token)
        if len(keywords) >= max_items:
            break
    return keywords


def _append_memory_note(state: VoiceWsState, note: str) -> None:
    normalized = (note or "").strip()
    if not normalized:
        return
    if state.memory_notes and state.memory_notes[-1] == normalized:
        return
    state.memory_notes.append(normalized)
    if len(state.memory_notes) > MEMORY_NOTE_LIMIT:
        state.memory_notes = state.memory_notes[-MEMORY_NOTE_LIMIT:]


def _remember_user_turn(state: VoiceWsState, text: str) -> None:
    summary = _compress_memory_text(text, max_chars=110)
    if not summary:
        return
    keywords = _extract_memory_keywords(text)
    note = f"지원자 답변: {summary}"
    if keywords:
        note = f"{note} | 키워드: {', '.join(keywords)}"
    state.last_user_memory = note
    _append_memory_note(state, note)


def _remember_model_turn(state: VoiceWsState, text: str, *, question_type: str | None = None) -> None:
    summary = _compress_memory_text(text, max_chars=110)
    if not summary:
        return
    label = _question_type_label(question_type) if question_type else "일반 심층 검증"
    note = f"최근 질문({label}): {summary}"
    state.last_model_memory = note
    _append_memory_note(state, note)


def _build_memory_snapshot(state: VoiceWsState, *, max_chars: int = 420) -> str:
    notes: list[str] = []
    if state.last_model_memory:
        notes.append(state.last_model_memory)
    if state.last_user_memory:
        notes.append(state.last_user_memory)
    for note in state.memory_notes[-MEMORY_PROMPT_NOTE_LIMIT:]:
        if note not in notes:
            notes.append(note)
    if not notes:
        return ""

    joined = " / ".join(notes[-MEMORY_PROMPT_NOTE_LIMIT:])
    if len(joined) <= max_chars:
        return joined
    return f"{joined[:max_chars].rstrip()}..."


def _question_type_label(question_type: str | None) -> str:
    normalized = (question_type or "").strip()
    return QUESTION_TYPE_LABELS.get(normalized, normalized or "일반 심층 검증")


def _derive_question_type_preference(
    state: VoiceWsState,
    answer_text: str,
    *,
    is_closing: bool = False,
) -> str | None:
    if is_closing:
        return "priority_judgment"

    normalized = re.sub(r"\s+", " ", (answer_text or "")).strip().lower()
    if not normalized:
        return None

    recent = set(state.recent_question_types[-2:])
    has_metric = bool(re.search(r"\d+[%건명개번일월년]|\d+\s*(ms|sec|s|배)", normalized))
    has_failure = bool(re.search(r"(실패|장애|이슈|문제|사고|rollback|에러|error|incident|트러블)", normalized))
    has_design = bool(re.search(r"(설계|구조|아키텍처|architecture|db|database|api|모듈|시스템)", normalized))
    has_collaboration = bool(re.search(r"(협업|팀|갈등|커뮤니케이션|리뷰|stakeholder|동료|조율)", normalized))
    has_priority = bool(re.search(r"(우선|priority|마감|일정|impact|리소스|순서|급한)", normalized))
    has_tradeoff = bool(re.search(r"(트레이드오프|장단점|비용|속도|안정성|복잡도|선택 기준)", normalized))

    candidates: list[str] = []
    if not has_metric:
        candidates.append("metric_validation")
    if has_failure:
        candidates.append("failure_recovery")
    if has_design:
        candidates.append("design_decision")
    if has_collaboration:
        candidates.append("collaboration_conflict")
    if has_priority:
        candidates.append("priority_judgment")
    if has_tradeoff:
        candidates.append("tradeoff")

    for candidate in candidates:
        if candidate not in recent:
            return candidate
    return candidates[0] if candidates else None


def _select_next_question_type(state: VoiceWsState, *, preferred: str | None = None) -> str:
    recent = set(state.recent_question_types[-2:])
    if preferred and preferred not in recent:
        return preferred

    total = len(QUESTION_TYPE_ROTATION)
    start = state.question_type_cursor % max(total, 1)
    for offset in range(total):
        candidate = QUESTION_TYPE_ROTATION[(start + offset) % total]
        if candidate not in recent:
            return candidate

    return QUESTION_TYPE_ROTATION[start]


def _record_question_type(state: VoiceWsState, question_type: str | None) -> None:
    normalized = (question_type or "").strip()
    if not normalized:
        return
    state.recent_question_types.append(normalized)
    if len(state.recent_question_types) > 5:
        state.recent_question_types = state.recent_question_types[-5:]
    if normalized in QUESTION_TYPE_ROTATION:
        idx = QUESTION_TYPE_ROTATION.index(normalized)
        state.question_type_cursor = (idx + 1) % len(QUESTION_TYPE_ROTATION)


def _build_live_session_instruction(state: VoiceWsState) -> str:
    personality = (state.personality or "professional").strip()
    job_brief = _compact_context_text(state.job_data, max_chars=900)
    resume_brief = _compact_context_text(state.resume_data, max_chars=900)
    target_min = max(1, int(state.target_duration_sec // 60))
    return (
        "당신은 한국어 AI 면접관 Dibut입니다.\n"
        "절대 규칙:\n"
        "1) 매 턴 반드시 질문 1개만 한다(질문은 마지막 문장에 위치).\n"
        "2) 메타발화(예: 지시/프롬프트 설명/영어 문장/마크다운/별표) 금지.\n"
        "3) 답변이 짧거나 불완전하면 다음 질문 대신 '이어서 조금만 더 말씀해 주세요.'를 말한다.\n"
        "4) 지원자 답변을 직접 대신 말하지 않는다.\n"
        "5) 질문은 구체적이고 검증 가능한 꼬리질문 위주로 한다.\n"
        "6) 각 턴은 2~4문장으로 구성하고, 전체 길이는 대략 80~220자 내에서 자연스럽게 말한다.\n"
        "7) 대괄호로 둘러싼 운영 메모는 내부 지시다. 절대 그대로 읽거나 노출하지 말고 질문 생성 제어에만 사용한다.\n"
        "8) 직전 답변 키워드를 최소 1개 반영하고, 매 턴 질문 유형을 바꾼다.\n"
        f"면접 스타일: {personality}\n"
        f"권장 면접 길이: 약 {target_min}분\n"
        f"채용 맥락 요약: {job_brief}\n"
        f"지원자 요약: {resume_brief}\n"
        "출력은 자연스러운 한국어 음성 문장으로만 생성한다."
    )


def _build_live_turn_prompt(
    state: VoiceWsState,
    *,
    question_type: str | None = None,
    answer_quality_hint: str = "",
    user_text: str = "",
    extra_instruction: str = "",
) -> str:
    parts: list[str] = ["[운영 메모 - 절대 그대로 읽지 말 것]"]
    if question_type:
        parts.append(f"- 이번 턴 우선 질문 유형: {_question_type_label(question_type)}")
    recent_type_labels = ", ".join(_question_type_label(item) for item in state.recent_question_types[-3:])
    if recent_type_labels:
        parts.append(f"- 최근 사용한 질문 유형: {recent_type_labels}")
    memory_snapshot = _build_memory_snapshot(state)
    if memory_snapshot:
        parts.append(f"- 최근 면접 메모: {memory_snapshot}")
    quality_hint = (answer_quality_hint or state.last_answer_quality_hint or "").strip()
    if quality_hint:
        parts.append(f"- 직전 답변 검증 포인트: {quality_hint}")
    else:
        parts.append("- 직전 답변에서 수치, 근거, 의사결정 기준이 빠졌다면 그 부분을 우선 검증할 것")
    if user_text:
        parts.append(f"- 참고 사용자 답변: {_compact_context_text(user_text, max_chars=240)}")
    if extra_instruction:
        parts.append(f"- 추가 지시: {extra_instruction}")
    parts.append("- 위 메모를 참고하되, 실제 출력은 자연스러운 한국어 음성 문장만 생성할 것")
    return "\n".join(parts)


def _hard_split_text(text: str, max_chars: int) -> list[str]:
    normalized = (text or "").strip()
    if not normalized:
        return []
    parts: list[str] = []
    cursor = 0
    while cursor < len(normalized):
        upper = min(cursor + max_chars, len(normalized))
        if upper < len(normalized):
            split_at = normalized.rfind(" ", cursor, upper)
            if split_at > cursor + max(8, max_chars // 3):
                upper = split_at
        piece = normalized[cursor:upper].strip()
        if piece:
            parts.append(piece)
        cursor = upper
        while cursor < len(normalized) and normalized[cursor] == " ":
            cursor += 1
    return parts


def _split_ai_delivery_text(text: str, max_chars: int = AI_TTS_SEGMENT_MAX_CHARS) -> list[str]:
    cleaned = re.sub(r"\s+", " ", (text or "")).strip()
    if not cleaned:
        return []

    sentences = [piece.strip() for piece in re.split(r"(?<=[.!?])\s*", cleaned) if piece.strip()]
    if not sentences:
        sentences = [cleaned]

    segments: list[str] = []
    for sentence in sentences:
        if len(sentence) <= max_chars:
            segments.append(sentence)
            continue

        clauses = [piece.strip() for piece in re.split(r"(?<=[,;:])\s*", sentence) if piece.strip()]
        if len(clauses) <= 1:
            segments.extend(_hard_split_text(sentence, max_chars=max_chars))
            continue

        current = ""
        for clause in clauses:
            candidate = f"{current} {clause}".strip() if current else clause
            if len(candidate) <= max_chars:
                current = candidate
                continue
            if current:
                segments.append(current)
            if len(clause) <= max_chars:
                current = clause
            else:
                hard_parts = _hard_split_text(clause, max_chars=max_chars)
                if hard_parts:
                    segments.extend(hard_parts[:-1])
                    current = hard_parts[-1]
                else:
                    current = clause
        if current:
            segments.append(current)

    return [segment for segment in segments if segment]


async def _stream_ai_tts_by_segments(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    text: str,
    turn_id: str,
    emit_delta: bool,
    starting_seq: int = 0,
) -> bool:
    if not state.session_id:
        return False

    segments = _split_ai_delivery_text(text)
    if not segments:
        segments = [(text or "").strip()] if (text or "").strip() else []

    has_audio = False
    delta_seq = starting_seq
    accumulated = ""
    for segment in segments:
        accumulated = f"{accumulated} {segment}".strip() if accumulated else segment
        if emit_delta:
            delta_seq += 1
            await _send_transcript_delta(
                ws,
                state.session_id,
                "ai",
                segment,
                accumulated,
                delta_seq,
                turn_id=turn_id,
            )

        prepared = await _prepare_tts_audio(ws, segment, turn_id=turn_id)
        _remember_ai_tts(state, segment, prepared)
        if prepared is None:
            continue

        if not has_audio:
            if not await _send_avatar_state(ws, "speaking", state.session_id):
                return
            has_audio = True

        if not await _send_prepared_tts_audio(ws, state.session_id, prepared, turn_id=turn_id):
            return has_audio

    if has_audio:
        await _send_avatar_state(ws, "idle", state.session_id)
    return has_audio


async def _bootstrap_plan(state: VoiceWsState) -> None:
    if not state.session_id:
        state.plan_bootstrap_task = None
        return

    gemini = get_gemini_service()
    if not gemini:
        state.plan_bootstrap_task = None
        return

    try:
        planned_questions = await asyncio.wait_for(
            asyncio.to_thread(
                gemini.build_interview_plan,
                _build_context(state),
                1,
            ),
            timeout=6.0,
        )
        state.planned_questions = planned_questions
        await asyncio.to_thread(service.set_planned_questions, state.session_id, planned_questions)
    except Exception:
        logger.info(
            "planned-question bootstrap failed; continuing without precomputed plan",
            extra={"session_id": state.session_id},
        )
    finally:
        state.plan_bootstrap_task = None


async def _ensure_plan(state: VoiceWsState) -> None:
    if not state.session_id or state.planned_questions:
        return

    if state.plan_bootstrap_task:
        if state.plan_bootstrap_task.done():
            state.plan_bootstrap_task = None
        return

    if state.plan_attempted:
        return

    state.plan_attempted = True
    state.plan_bootstrap_task = asyncio.create_task(_bootstrap_plan(state))


async def _iter_streaming_question_chunks(
    gemini: GeminiService,
    *,
    context: dict[str, Any],
    chat_history: list[dict[str, str]],
    question_index: int,
    planned_questions: list[dict[str, Any]],
    current_phase: str,
    answer_quality_hint: str,
    total_questions: int,
):
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[tuple[str, Any]] = asyncio.Queue()

    def worker() -> None:
        try:
            for chunk in gemini.stream_next_question_text(
                context=context,
                chat_history=chat_history,
                question_index=question_index,
                planned_questions=planned_questions,
                current_phase=current_phase,
                answer_quality_hint=answer_quality_hint,
                total_questions=total_questions,
            ):
                if not chunk:
                    continue
                loop.call_soon_threadsafe(queue.put_nowait, ("chunk", chunk))
        except Exception as exc:  # pragma: no cover - defensive
            loop.call_soon_threadsafe(queue.put_nowait, ("error", exc))
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, ("done", None))

    threading.Thread(target=worker, daemon=True).start()

    while True:
        message_type, payload = await queue.get()
        if message_type == "chunk":
            yield str(payload)
            continue
        if message_type == "error":
            raise payload
        return


def _fallback_opening_question_text() -> str:
    return "안녕하세요. 만나서 반갑습니다. 먼저 본인의 지원 동기와 이 직무에 적합하다고 생각하는 이유를 말씀해 주세요."


def _to_prepared_tts_audio_from_pcm(
    pcm_bytes: bytes,
    *,
    sample_rate: int,
    provider: str,
) -> PreparedTtsAudio | None:
    if not pcm_bytes:
        return None
    chunks, duration_sec = _pcm16le_bytes_to_base64_chunks(pcm_bytes, sample_rate=sample_rate)
    if not chunks:
        return None
    return PreparedTtsAudio(
        chunks=chunks,
        sample_rate=sample_rate,
        provider=provider,
        duration_sec=duration_sec,
    )


def _get_or_create_live_interview(state: VoiceWsState) -> GeminiLiveInterviewSession:
    if state.live_interview is None:
        state.live_interview = _create_live_interview_session()
    return state.live_interview


async def _request_live_text_turn(
    state: VoiceWsState,
    *,
    text: str,
    question_type: str | None = None,
    extra_instruction: str = "",
    user_text: str = "",
) -> tuple[str, PreparedTtsAudio | None]:
    live = _get_or_create_live_interview(state)
    if not live.enabled or not _live_attempt_allowed(state):
        return "", None

    result = await live.request_text_turn(
        session_instruction=_build_live_session_instruction(state),
        turn_prompt=_build_live_turn_prompt(
            state,
            question_type=question_type,
            user_text=user_text,
            extra_instruction=extra_instruction,
        ),
        text=text,
    )
    prepared = _to_prepared_tts_audio_from_pcm(
        result.audio_pcm_bytes,
        sample_rate=result.sample_rate,
        provider=result.provider,
    )
    return (result.ai_text or "").strip(), prepared


async def _request_live_audio_turn(
    state: VoiceWsState,
    *,
    wav_bytes: bytes,
    question_type: str | None = None,
    answer_quality_hint: str = "",
    prompt_user_text: str = "",
) -> tuple[str, str, PreparedTtsAudio | None, str]:
    live = _get_or_create_live_interview(state)
    if not live.enabled or not _live_attempt_allowed(state):
        return "", "", None, ""

    samples, sample_rate = wav_bytes_to_float_samples(wav_bytes)
    if not samples:
        return "", "", None, ""

    pcm_bytes = float_samples_to_pcm16le_bytes(samples)
    result = await live.request_audio_turn(
        session_instruction=_build_live_session_instruction(state),
        turn_prompt=_build_live_turn_prompt(
            state,
            question_type=question_type,
            answer_quality_hint=answer_quality_hint,
            user_text=prompt_user_text,
        ),
        pcm_bytes=pcm_bytes,
        sample_rate=sample_rate,
    )
    prepared = _to_prepared_tts_audio_from_pcm(
        result.audio_pcm_bytes,
        sample_rate=result.sample_rate,
        provider=result.provider,
    )
    return (
        (result.user_text or "").strip(),
        (result.ai_text or "").strip(),
        prepared,
        result.provider,
    )


async def _repair_ai_turn_if_truncated(
    state: VoiceWsState,
    *,
    ai_text: str,
    prepared_tts: PreparedTtsAudio | None,
) -> tuple[str, PreparedTtsAudio | None]:
    text = (ai_text or "").strip()
    if not text:
        return text, prepared_tts
    if _looks_like_complete_ai_question(text):
        return text, prepared_tts

    repaired_text, repaired_audio = await _request_live_text_turn(
        state,
        text=(
            "방금 면접 질문이 중간에 끊긴 것처럼 들립니다. "
            "동일 의도를 유지해서 질문을 처음부터 완결형 2~3문장으로 다시 말해 주세요."
        ),
    )
    if repaired_text and _looks_like_complete_ai_question(repaired_text):
        return repaired_text, (repaired_audio or prepared_tts)
    return text, prepared_tts


async def _prepare_tts_audio(
    ws: WebSocket,
    text: str,
    *,
    turn_id: str | None = None,
) -> PreparedTtsAudio | None:
    tts = get_tts_service()
    if not tts.enabled:
        await _send_json(
            ws,
            {
                "type": "warning",
                "message": "TTS provider is disabled. Set GEMINI_API_KEY to enable synthesized audio.",
                "turnId": turn_id,
            },
        )
        return None

    tts_result = await tts.synthesize_pcm(text)
    if not tts_result.audio_pcm_bytes:
        logger.warning("tts returned empty audio payload", extra={"text_len": len(text or "")})
        is_quota_exhausted = bool(getattr(tts, "quota_exhausted", False))
        retry_after = int(getattr(tts, "quota_retry_after_sec", 0) or 0)
        retry_text = f" (약 {retry_after}초 후 재시도)" if retry_after > 0 else ""
        await _send_json(
            ws,
            {
                "type": "warning",
                "message": (
                    f"Gemini TTS 할당량/리소스 제한으로 이번 턴 음성 출력은 생략됩니다.{retry_text}"
                    if is_quota_exhausted
                    else "Gemini TTS 오디오 생성에 실패했습니다. 이번 턴 음성 출력은 생략됩니다."
                ),
                "turnId": turn_id,
            },
        )
        return None

    sample_rate = tts_result.sample_rate
    chunks, duration_sec = _pcm16le_bytes_to_base64_chunks(
        tts_result.audio_pcm_bytes,
        sample_rate=sample_rate,
    )
    return PreparedTtsAudio(
        chunks=chunks,
        sample_rate=sample_rate,
        provider=tts_result.provider,
        duration_sec=duration_sec,
    )


async def _send_prepared_tts_audio(
    ws: WebSocket,
    session_id: str,
    prepared: PreparedTtsAudio,
    *,
    turn_id: str,
) -> bool:
    if not prepared.chunks:
        return ws.client_state == WebSocketState.CONNECTED

    for idx, chunk in enumerate(prepared.chunks):
        sent = await _send_json(
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


async def _send_continue_prompt(ws: WebSocket, state: VoiceWsState, text: str = SHORT_STT_REPROMPT) -> None:
    if not state.session_id:
        return

    turn_id = f"{state.session_id}:{next(AI_TURN_SEQ)}"

    live_text, live_prepared_tts = await _request_live_text_turn(
        state,
        text=f"사용자 답변이 너무 짧습니다. 다음 문장을 그대로 말하세요: {text}",
    )
    prompt_text = live_text or text
    prepared_tts = live_prepared_tts or await _prepare_tts_audio(ws, prompt_text, turn_id=turn_id)
    if live_text and live_prepared_tts is not None:
        await _restore_live_mode(ws, state, "continue-live", turn_id=turn_id)
    else:
        await _enter_degraded_mode(ws, state, "continue-fallback", turn_id=turn_id)
    _remember_ai_tts(state, prompt_text, prepared_tts)

    await _send_transcript(ws, state.session_id, "ai", prompt_text, turn_id=turn_id)
    await _send_json(ws, {"type": "full-text", "text": prompt_text, "turnId": turn_id})
    _remember_model_turn(state, prompt_text)

    if prepared_tts is not None:
        await _send_avatar_state(ws, "speaking", state.session_id)
        await _send_prepared_tts_audio(ws, state.session_id, prepared_tts, turn_id=turn_id)
        await _send_avatar_state(ws, "idle", state.session_id)
        _arm_playback_resume(ws, state, turn_id=turn_id, timeout_sec=prepared_tts.duration_sec + 1.2)
    else:
        await _resume_listening(ws, state, turn_id=turn_id)

    _reset_realtime_user_transcript(state)


async def _generate_and_send_opening_live_turn(ws: WebSocket, state: VoiceWsState) -> bool:
    if not state.session_id:
        return False

    opening_started_at = time.monotonic()
    turn_id = f"{state.session_id}:{next(AI_TURN_SEQ)}"
    opening_question_type = "motivation_validation"
    ai_text, prepared_live_audio = await _request_live_text_turn(
        state,
        text=LIVE_OPENING_PROMPT,
        question_type=opening_question_type,
    )
    if not ai_text:
        ai_text = _fallback_opening_question_text()
    original_ai_text = ai_text
    ai_text, prepared_live_audio = await _repair_ai_turn_if_truncated(
        state,
        ai_text=ai_text,
        prepared_tts=prepared_live_audio,
    )
    repair_applied = ai_text != original_ai_text
    if prepared_live_audio is not None and ai_text:
        await _restore_live_mode(ws, state, "opening-live", turn_id=turn_id)
    else:
        await _enter_degraded_mode(ws, state, "opening-fallback", turn_id=turn_id)

    session = await asyncio.to_thread(service.get_session, state.session_id)
    target_duration_sec = _clamp_target_duration(
        (session or {}).get("target_duration_sec") or state.target_duration_sec
    )
    closing_threshold_sec = _clamp_closing_threshold(
        (session or {}).get("closing_threshold_sec") or state.closing_threshold_sec
    )
    elapsed_sec = _elapsed_seconds((session or {}).get("started_at"))
    remaining_sec = max(0, target_duration_sec - elapsed_sec)
    estimated_total_questions = _estimated_total_questions(target_duration_sec)

    state.current_phase = "introduction"
    payload = {
        "phase": state.current_phase,
        "question_index": 1,
        "channel": "voice",
        "remaining_sec": remaining_sec,
        "target_duration_sec": target_duration_sec,
        "closing_threshold_sec": closing_threshold_sec,
        "estimated_total_questions": estimated_total_questions,
        "stream_mode": "live-single",
        "tts_mode": "live-single",
        "turn_id": turn_id,
        "question_type": opening_question_type,
        "runtime_mode": state.runtime_mode,
        "runtime_reason": state.runtime_mode_reason,
        "provider": prepared_live_audio.provider if prepared_live_audio is not None else "",
        "latency_ms": int((time.monotonic() - opening_started_at) * 1000),
        "audio_duration_ms": int(round((prepared_live_audio.duration_sec if prepared_live_audio else 0.0) * 1000)),
        "repair_applied": repair_applied,
        "live_model": _live_active_model(state),
        "vad_config": _snapshot_vad_config(state),
        "memory_snapshot": _build_memory_snapshot(state),
    }
    await asyncio.to_thread(
        service.append_turn,
        state.session_id,
        "model",
        ai_text,
        "voice",
        payload,
    )
    _remember_model_turn(state, ai_text, question_type=opening_question_type)
    await asyncio.to_thread(service.update_session_status, state.session_id, "in_progress", state.current_phase)

    if not await _send_json(
        ws,
        {
            "type": "interview-phase-updated",
            "phase": state.current_phase,
            "guide": "voice-turn",
            "message": f"면접 단계: {state.current_phase}",
            "turnId": turn_id,
        },
    ):
        return False
    if not await _send_json(
        ws,
        {
            "type": "runtime.meta",
            "targetDurationSec": target_duration_sec,
            "closingThresholdSec": closing_threshold_sec,
            "elapsedSec": elapsed_sec,
            "remainingSec": remaining_sec,
            "estimatedTotalQuestions": estimated_total_questions,
            "questionCount": 1,
            "isClosingPhase": False,
            "interviewComplete": False,
            "finishReason": "",
            "runtimeMode": state.runtime_mode,
            "runtimeReason": state.runtime_mode_reason,
            "retryAfterSec": _degraded_retry_after_sec(state),
            "turnId": turn_id,
        },
    ):
        return False

    if not await _send_transcript(ws, state.session_id, "ai", ai_text, turn_id=turn_id):
        return False
    if not await _send_json(ws, {"type": "full-text", "text": ai_text, "turnId": turn_id}):
        return False

    prepared_tts = prepared_live_audio or await _prepare_tts_audio(ws, ai_text, turn_id=turn_id)
    _record_question_type(state, opening_question_type)
    _remember_ai_tts(state, ai_text, prepared_tts)
    if prepared_tts is not None:
        if not await _send_avatar_state(ws, "speaking", state.session_id):
            return False
        if not await _send_prepared_tts_audio(ws, state.session_id, prepared_tts, turn_id=turn_id):
            return False
        if not await _send_avatar_state(ws, "idle", state.session_id):
            return False
        _arm_playback_resume(ws, state, turn_id=turn_id, timeout_sec=prepared_tts.duration_sec + 1.2)
    else:
        await _resume_listening(ws, state, turn_id=turn_id)
    return True


async def _generate_and_send_ai_turn(
    ws: WebSocket,
    state: VoiceWsState,
    answer_quality_hint: str,
    forced_question_type: str | None = None,
) -> dict[str, Any]:
    if not state.session_id:
        return {"completed": False, "text": ""}

    await _ensure_plan(state)
    state.last_answer_quality_hint = (answer_quality_hint or "").strip()

    turns = await asyncio.to_thread(service.get_turns, state.session_id)
    history = _to_chat_history(turns)
    model_count = len([message for message in history if message.get("role") == "model"])
    session = await asyncio.to_thread(service.get_session, state.session_id)
    target_duration_sec = _clamp_target_duration(
        (session or {}).get("target_duration_sec") or state.target_duration_sec
    )
    closing_threshold_sec = _clamp_closing_threshold(
        (session or {}).get("closing_threshold_sec") or state.closing_threshold_sec
    )
    elapsed_sec = _elapsed_seconds((session or {}).get("started_at"))
    remaining_sec = max(0, target_duration_sec - elapsed_sec)
    estimated_total_questions = _estimated_total_questions(target_duration_sec)
    closing_announced = bool((session or {}).get("closing_announced", False))

    state.target_duration_sec = target_duration_sec
    state.closing_threshold_sec = closing_threshold_sec
    state.estimated_total_questions = estimated_total_questions

    completion_reason = ""
    announced_closing_this_turn = False
    if closing_announced:
        completion_reason = "closing_answer_submitted"
    elif elapsed_sec >= target_duration_sec + SESSION_GRACE_SEC:
        completion_reason = "time_limit_reached"
    elif model_count >= MAX_DYNAMIC_QUESTIONS:
        completion_reason = "question_cap_reached"
    elif (session or {}).get("status") == "completed":
        completion_reason = "already_completed"

    used_delta_stream = False
    streamed_delta_count = 0
    turn_id = f"{state.session_id}:{next(AI_TURN_SEQ)}"
    await _enter_degraded_mode(ws, state, "legacy-llm-tts", turn_id=turn_id)
    turn_started_at = time.monotonic()

    if completion_reason:
        ai_text = f"면접 시간이 종료되어 마무리하겠습니다. {CLOSING_SENTENCE}"
        state.current_phase = "closing"
        last_turn = turns[-1] if turns else {}
        if last_turn.get("role") != "model" or CLOSING_SENTENCE not in (last_turn.get("content") or ""):
            await asyncio.to_thread(
                service.append_turn,
                state.session_id,
                "model",
                ai_text,
                "voice",
                {"phase": "closing", "finish_reason": completion_reason, "channel": "voice"},
            )
        await asyncio.to_thread(service.update_session_status, state.session_id, "completed", "closing")
    else:
        question_index = model_count + 1
        should_announce_closing = (
            remaining_sec <= closing_threshold_sec
            or question_index >= estimated_total_questions
            or question_index >= MAX_DYNAMIC_QUESTIONS
        )
        phase = _phase_for_question_index(question_index, is_closing=should_announce_closing)
        gemini = get_gemini_service()
        question_type = forced_question_type or _select_next_question_type(
            state,
            preferred="priority_judgment" if should_announce_closing else None,
        )
        if question_type:
            answer_quality_hint = (
                f"{answer_quality_hint} 이번 질문 유형은 {_question_type_label(question_type)}입니다."
            ).strip()

        if gemini:
            prompt_total_questions = question_index if should_announce_closing else estimated_total_questions
            if state.llm_stream_mode == "delta":
                used_delta_stream = True
                streamed_text = ""
                delta_seq = 0
                state.current_phase = "closing" if should_announce_closing else phase

                try:
                    async for delta_chunk in _iter_streaming_question_chunks(
                        gemini,
                        context=_build_context(state),
                        chat_history=history,
                        question_index=question_index,
                        planned_questions=state.planned_questions,
                        current_phase=phase,
                        answer_quality_hint=answer_quality_hint,
                        total_questions=prompt_total_questions,
                    ):
                        if not delta_chunk:
                            continue
                        streamed_text += delta_chunk
                        delta_seq += 1
                        streamed_delta_count = delta_seq
                        if not await _send_transcript_delta(
                            ws,
                            state.session_id,
                            "ai",
                            delta_chunk,
                            streamed_text,
                            delta_seq,
                            turn_id=turn_id,
                        ):
                            return {"completed": True, "text": streamed_text, "turnId": turn_id}

                    ai_text = gemini.finalize_streamed_question(
                        text=streamed_text,
                        context=_build_context(state),
                        question_index=question_index,
                        planned_questions=state.planned_questions,
                        current_phase=phase,
                        total_questions=prompt_total_questions,
                    )
                except Exception:
                    logger.exception("delta streaming failed, fallback to non-streaming", extra={"session_id": state.session_id})
                    used_delta_stream = False
                    generated = await asyncio.to_thread(
                        gemini.generate_next_question_structured,
                        _build_context(state),
                        history,
                        question_index,
                        state.planned_questions,
                        phase,
                        answer_quality_hint,
                        prompt_total_questions,
                    )
                    ai_text = (generated.get("question") or "").strip()
                    state.current_phase = "closing" if should_announce_closing else (generated.get("phase") or phase)
            else:
                generated = await asyncio.to_thread(
                    gemini.generate_next_question_structured,
                    _build_context(state),
                    history,
                    question_index,
                    state.planned_questions,
                    phase,
                    answer_quality_hint,
                    prompt_total_questions,
                )
                ai_text = (generated.get("question") or "").strip()
                state.current_phase = "closing" if should_announce_closing else (generated.get("phase") or phase)
        else:
            ai_text = "음성 면접 엔진이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요."
            state.current_phase = phase

        if should_announce_closing:
            announced_closing_this_turn = True
            if CLOSING_ANNOUNCE_PREFIX not in ai_text:
                ai_text = f"{CLOSING_ANNOUNCE_PREFIX} {ai_text}".strip()
            if CLOSING_SENTENCE not in ai_text:
                ai_text = f"{ai_text} {CLOSING_SENTENCE}".strip()
            await asyncio.to_thread(service.set_closing_announced, state.session_id, True)

        payload = {
            "phase": state.current_phase,
            "question_index": question_index,
            "question_type": question_type,
            "answer_quality_hint": answer_quality_hint,
            "channel": "voice",
            "remaining_sec": remaining_sec,
            "target_duration_sec": target_duration_sec,
            "closing_threshold_sec": closing_threshold_sec,
            "estimated_total_questions": estimated_total_questions,
            "stream_mode": "delta" if used_delta_stream else "final",
            "tts_mode": state.tts_mode,
            "delta_count": streamed_delta_count,
            "turn_id": turn_id,
            "runtime_mode": state.runtime_mode,
            "runtime_reason": state.runtime_mode_reason,
            "latency_ms": int((time.monotonic() - turn_started_at) * 1000),
            "live_model": _live_active_model(state),
            "vad_config": _snapshot_vad_config(state),
            "memory_snapshot": _build_memory_snapshot(state),
        }
        await asyncio.to_thread(
            service.append_turn,
            state.session_id,
            "model",
            ai_text,
            "voice",
            payload,
        )
        _record_question_type(state, question_type)
        _remember_model_turn(state, ai_text, question_type=question_type)

        await asyncio.to_thread(service.update_session_status, state.session_id, "in_progress", state.current_phase)

    if not await _send_json(
        ws,
        {
            "type": "interview-phase-updated",
            "phase": state.current_phase,
            "guide": "voice-turn",
            "message": f"면접 단계: {state.current_phase}",
            "turnId": turn_id,
        },
    ):
        return {"completed": True, "text": ai_text, "turnId": turn_id}
    if not await _send_json(
        ws,
        {
            "type": "runtime.meta",
            "targetDurationSec": target_duration_sec,
            "closingThresholdSec": closing_threshold_sec,
            "elapsedSec": elapsed_sec,
            "remainingSec": remaining_sec,
            "estimatedTotalQuestions": estimated_total_questions,
            "questionCount": model_count + (0 if completion_reason else 1),
            "isClosingPhase": state.current_phase == "closing",
            "interviewComplete": bool(completion_reason),
            "finishReason": completion_reason,
            "runtimeMode": state.runtime_mode,
            "runtimeReason": state.runtime_mode_reason,
            "retryAfterSec": _degraded_retry_after_sec(state),
            "turnId": turn_id,
        },
    ):
        return {"completed": True, "text": ai_text, "turnId": turn_id}

    if not await _send_transcript(ws, state.session_id, "ai", ai_text, turn_id=turn_id):
        return {"completed": True, "text": ai_text, "turnId": turn_id}
    if not await _send_json(ws, {"type": "full-text", "text": ai_text, "turnId": turn_id}):
        return {"completed": True, "text": ai_text, "turnId": turn_id}

    has_audio = await _stream_ai_tts_by_segments(
        ws,
        state,
        text=ai_text,
        turn_id=turn_id,
        emit_delta=not used_delta_stream,
        starting_seq=streamed_delta_count,
    )

    is_complete = bool(completion_reason)
    if not is_complete:
        if has_audio:
            _arm_playback_resume(ws, state, turn_id=turn_id, timeout_sec=max(1.2, len(ai_text) / 18.0))
        else:
            await _resume_listening(ws, state, turn_id=turn_id)

    return {
        "completed": is_complete,
        "text": ai_text,
        "turnId": turn_id,
        "closingAnnounced": announced_closing_this_turn,
        "completionReason": completion_reason,
    }


async def _process_user_utterance(
    ws: WebSocket,
    state: VoiceWsState,
    wav_bytes: bytes,
    *,
    vad_meta: dict[str, Any] | None = None,
) -> None:
    if not state.session_id or state.processing_audio:
        return

    state.processing_audio = True
    user_turn_started_at = time.monotonic()
    utterance_duration_ms = _estimate_wav_duration_ms(wav_bytes)
    effective_vad_meta = dict(vad_meta or state.last_vad_event or {})

    try:
        if not await _send_json(ws, {"type": "control", "text": "mic-audio-end"}):
            return
        if not await _send_avatar_state(ws, "thinking", state.session_id):
            return

        live = _get_or_create_live_interview(state)
        prompt_user_text = state.realtime_user_transcript.strip()
        should_bias_closing = state.current_phase == "closing"
        preferred_question_type = _derive_question_type_preference(
            state,
            prompt_user_text,
            is_closing=should_bias_closing,
        )
        planned_question_type = _select_next_question_type(
            state,
            preferred=preferred_question_type or ("priority_judgment" if should_bias_closing else None),
        )
        if not live.enabled:
            await _set_runtime_mode(ws, state, RUNTIME_MODE_DISABLED, "live-disabled")
            await _send_json(
                ws,
                {
                    "type": "warning",
                    "message": "Gemini Live single session is disabled. Set GEMINI_API_KEY to enable voice interview.",
                },
            )
            await _resume_listening(ws, state)
            return

        live_user_text, live_ai_text, live_prepared_tts, live_provider = await _request_live_audio_turn(
            state,
            wav_bytes=wav_bytes,
            question_type=planned_question_type,
            answer_quality_hint=(
                _build_answer_quality_hint(prompt_user_text) if prompt_user_text else state.last_answer_quality_hint
            ),
            prompt_user_text=prompt_user_text,
        )
        provider_name = live_provider or live.provider
        user_text = live_user_text or state.realtime_user_transcript.strip()
        if not user_text:
            stt = get_stt_service()
            if stt.enabled:
                stt_result = await stt.transcribe_wav(wav_bytes, "ko")
                user_text = (stt_result.text or "").strip()
                if user_text:
                    provider_name = stt_result.provider
                    await _enter_degraded_mode(ws, state, "stt-fallback")
        if not user_text:
            _reset_realtime_user_transcript(state)
            await _resume_listening(ws, state)
            return
        await _emit_realtime_user_delta(ws, state, user_text)
        if _is_probable_ai_echo(state, user_text, wav_bytes):
            logger.info(
                "suppressed probable ai echo from STT (text=%r, session_id=%s)",
                user_text,
                state.session_id,
            )
            await _resume_listening(ws, state)
            return

        state.last_answer_quality_hint = _build_answer_quality_hint(user_text)
        _remember_user_turn(state, user_text)

        await asyncio.to_thread(
            service.append_turn,
            state.session_id,
            "user",
            user_text,
            "voice",
            {
                "provider": provider_name,
                "input": "speech",
                "runtime_mode": state.runtime_mode,
                "runtime_reason": state.runtime_mode_reason,
                "speech_duration_ms": round(utterance_duration_ms, 1),
                "stt_text_len": len(user_text),
                "live_model": _live_active_model(state),
                "vad": effective_vad_meta,
                "vad_config": _snapshot_vad_config(state),
                "answer_quality_hint": state.last_answer_quality_hint,
                "memory_snapshot": _build_memory_snapshot(state),
            },
        )
        if not await _send_transcript(ws, state.session_id, "user", user_text):
            return
        _reset_realtime_user_transcript(state)
        state.realtime_user_pcm.clear()

        is_short_answer = _is_short_stt_result(user_text, wav_bytes)
        _retune_vad_for_next_turn(state, utterance_duration_ms=utterance_duration_ms, short_answer=is_short_answer)

        if is_short_answer:
            await asyncio.to_thread(
                service.append_turn,
                state.session_id,
                "system",
                SHORT_STT_REPROMPT,
                "voice",
                {
                    "phase": state.current_phase,
                    "channel": "voice",
                    "reason": "short-answer-reprompt",
                    "runtime_mode": state.runtime_mode,
                    "runtime_reason": state.runtime_mode_reason,
                    "speech_duration_ms": round(utterance_duration_ms, 1),
                    "vad": effective_vad_meta,
                    "vad_config": _snapshot_vad_config(state),
                    "answer_quality_hint": state.last_answer_quality_hint,
                    "memory_snapshot": _build_memory_snapshot(state),
                },
            )
            await _send_continue_prompt(ws, state)
            return

        turns = await asyncio.to_thread(service.get_turns, state.session_id)
        model_count = len([turn for turn in turns if turn.get("role") in {"model", "ai"}])
        session = await asyncio.to_thread(service.get_session, state.session_id)

        target_duration_sec = _clamp_target_duration(
            (session or {}).get("target_duration_sec") or state.target_duration_sec
        )
        closing_threshold_sec = _clamp_closing_threshold(
            (session or {}).get("closing_threshold_sec") or state.closing_threshold_sec
        )
        elapsed_sec = _elapsed_seconds((session or {}).get("started_at"))
        remaining_sec = max(0, target_duration_sec - elapsed_sec)
        estimated_total_questions = _estimated_total_questions(target_duration_sec)
        closing_announced = bool((session or {}).get("closing_announced", False))

        state.target_duration_sec = target_duration_sec
        state.closing_threshold_sec = closing_threshold_sec
        state.estimated_total_questions = estimated_total_questions

        completion_reason = ""
        announced_closing_this_turn = False
        if closing_announced:
            completion_reason = "closing_answer_submitted"
        elif elapsed_sec >= target_duration_sec + SESSION_GRACE_SEC:
            completion_reason = "time_limit_reached"
        elif model_count >= MAX_DYNAMIC_QUESTIONS:
            completion_reason = "question_cap_reached"
        elif (session or {}).get("status") == "completed":
            completion_reason = "already_completed"

        turn_id = f"{state.session_id}:{next(AI_TURN_SEQ)}"
        prepared_tts = live_prepared_tts
        repair_applied = False

        if completion_reason:
            closing_default = f"면접 시간이 종료되어 마무리하겠습니다. {CLOSING_SENTENCE}"
            closing_text, closing_audio = await _request_live_text_turn(
                state,
                text=(
                    "면접 종료 멘트를 자연스럽게 말하세요. "
                    "질문 없이 종료 문장으로 끝내세요."
                ),
            )
            ai_text = closing_text or closing_default
            if closing_audio is not None:
                prepared_tts = closing_audio
            if closing_text and closing_audio is not None and provider_name == live.provider:
                await _restore_live_mode(ws, state, "closing-live", turn_id=turn_id)
            else:
                await _enter_degraded_mode(ws, state, "closing-fallback", turn_id=turn_id)
            state.current_phase = "closing"
            await asyncio.to_thread(service.update_session_status, state.session_id, "completed", "closing")
        else:
            question_index = model_count + 1
            should_announce_closing = (
                remaining_sec <= closing_threshold_sec
                or question_index >= estimated_total_questions
                or question_index >= MAX_DYNAMIC_QUESTIONS
            )
            state.current_phase = _phase_for_question_index(question_index, is_closing=should_announce_closing)

            ai_text = (live_ai_text or "").strip()
            if should_announce_closing:
                announced_closing_this_turn = True
                closing_prompt_text, closing_prompt_audio = await _request_live_text_turn(
                    state,
                    text=(
                        "다음 턴은 마지막 질문입니다. "
                        "반드시 마지막 질문 안내 후 질문 1개를 하고, 마지막에 "
                        f"'{CLOSING_SENTENCE}' 문장을 포함해 마무리하세요."
                    ),
                )
                if closing_prompt_text:
                    ai_text = closing_prompt_text
                    prepared_tts = closing_prompt_audio or prepared_tts
                if CLOSING_SENTENCE not in ai_text:
                    ai_text = f"{ai_text} {CLOSING_SENTENCE}".strip()
                await asyncio.to_thread(service.set_closing_announced, state.session_id, True)

            if ai_text and prepared_tts is not None and provider_name == live.provider:
                await _restore_live_mode(ws, state, "live-turn", turn_id=turn_id)

            if not ai_text:
                await _enter_degraded_mode(ws, state, "llm-fallback", turn_id=turn_id)
                turns = await asyncio.to_thread(service.get_turns, state.session_id)
                history = _to_chat_history(turns)
                answer_quality_hint = _build_answer_quality_hint(_latest_user_answer(history))
                state.last_answer_quality_hint = answer_quality_hint
                fallback_question_type = _select_next_question_type(
                    state,
                    preferred=_derive_question_type_preference(
                        state,
                        user_text,
                        is_closing=state.current_phase == "closing",
                    )
                    or planned_question_type,
                )
                await _generate_and_send_ai_turn(
                    ws,
                    state,
                    answer_quality_hint,
                    forced_question_type=fallback_question_type,
                )
                return

        ai_text_before_repair = ai_text
        ai_text, prepared_tts = await _repair_ai_turn_if_truncated(
            state,
            ai_text=ai_text,
            prepared_tts=prepared_tts,
        )
        repair_applied = bool(ai_text) and ai_text != ai_text_before_repair and not completion_reason
        if ai_text and prepared_tts is None:
            await _enter_degraded_mode(ws, state, "tts-pending-fallback", turn_id=turn_id)

        payload = {
            "phase": state.current_phase,
            "question_index": model_count + 1 if not completion_reason else model_count,
            "channel": "voice",
            "remaining_sec": remaining_sec,
            "target_duration_sec": target_duration_sec,
            "closing_threshold_sec": closing_threshold_sec,
            "estimated_total_questions": estimated_total_questions,
            "stream_mode": "live-single",
            "tts_mode": "live-single",
            "turn_id": turn_id,
            "question_type": "" if completion_reason else planned_question_type,
            "completion_reason": completion_reason,
            "runtime_mode": state.runtime_mode,
            "runtime_reason": state.runtime_mode_reason,
            "provider": prepared_tts.provider if prepared_tts is not None else live_provider or "",
            "latency_ms": int((time.monotonic() - user_turn_started_at) * 1000),
            "audio_duration_ms": int(round((prepared_tts.duration_sec if prepared_tts else 0.0) * 1000)),
            "repair_applied": repair_applied,
            "live_model": _live_active_model(state),
            "vad_config": _snapshot_vad_config(state),
            "user_speech_duration_ms": round(utterance_duration_ms, 1),
            "vad": effective_vad_meta,
            "answer_quality_hint": state.last_answer_quality_hint,
            "memory_snapshot": _build_memory_snapshot(state),
        }

        await asyncio.to_thread(
            service.append_turn,
            state.session_id,
            "model",
            ai_text,
            "voice",
            payload,
        )
        if not completion_reason:
            _record_question_type(state, planned_question_type)
            _remember_model_turn(state, ai_text, question_type=planned_question_type)
        else:
            _remember_model_turn(state, ai_text)
        if not completion_reason:
            await asyncio.to_thread(service.update_session_status, state.session_id, "in_progress", state.current_phase)

        if not await _send_json(
            ws,
            {
                "type": "interview-phase-updated",
                "phase": state.current_phase,
                "guide": "voice-turn",
                "message": f"면접 단계: {state.current_phase}",
                "turnId": turn_id,
            },
        ):
            return
        if not await _send_json(
            ws,
            {
                "type": "runtime.meta",
                "targetDurationSec": target_duration_sec,
                "closingThresholdSec": closing_threshold_sec,
                "elapsedSec": elapsed_sec,
                "remainingSec": remaining_sec,
                "estimatedTotalQuestions": estimated_total_questions,
                "questionCount": model_count + (0 if completion_reason else 1),
                "isClosingPhase": state.current_phase == "closing",
                "interviewComplete": bool(completion_reason),
                "finishReason": completion_reason,
                "runtimeMode": state.runtime_mode,
                "runtimeReason": state.runtime_mode_reason,
                "retryAfterSec": _degraded_retry_after_sec(state),
                "turnId": turn_id,
            },
        ):
            return
        if not await _send_transcript(ws, state.session_id, "ai", ai_text, turn_id=turn_id):
            return
        if not await _send_json(ws, {"type": "full-text", "text": ai_text, "turnId": turn_id}):
            return

        if prepared_tts is None:
            prepared_tts = await _prepare_tts_audio(ws, ai_text, turn_id=turn_id)
            await _enter_degraded_mode(ws, state, "tts-fallback", turn_id=turn_id)
        elif live_ai_text and live_prepared_tts is not None and provider_name == live.provider:
            await _restore_live_mode(ws, state, "live-turn", turn_id=turn_id)
        _remember_ai_tts(state, ai_text, prepared_tts)

        if prepared_tts is not None:
            if not await _send_avatar_state(ws, "speaking", state.session_id):
                return
            if not await _send_prepared_tts_audio(ws, state.session_id, prepared_tts, turn_id=turn_id):
                return
            if not await _send_avatar_state(ws, "idle", state.session_id):
                return
            if not completion_reason:
                _arm_playback_resume(ws, state, turn_id=turn_id, timeout_sec=prepared_tts.duration_sec + 1.2)
        elif not completion_reason:
            await _resume_listening(ws, state, turn_id=turn_id)

    except Exception as exc:
        logger.exception("voice turn processing error", extra={"session_id": state.session_id})
        sent = await _send_json(
            ws,
            {
                "type": "error",
                "message": f"voice pipeline error: {exc}",
            },
        )
        if sent:
            await _resume_listening(ws, state)
    finally:
        state.processing_audio = False


async def _drain_pending_user_segments(ws: WebSocket, state: VoiceWsState) -> None:
    if not state.pending_user_segments:
        return
    if state.processing_audio:
        async def _retry() -> None:
            try:
                await asyncio.sleep(0.25)
            except asyncio.CancelledError:
                return
            await _drain_pending_user_segments(ws, state)

        if not state.pending_user_segment_task or state.pending_user_segment_task.done():
            state.pending_user_segment_task = asyncio.create_task(_retry())
        return

    segments = state.pending_user_segments[:]
    state.pending_user_segments.clear()
    merged_wav = _merge_wav_segments([segment.audio for segment in segments])
    if not merged_wav:
        return
    merged_vad_meta = _merge_vad_events([segment.vad for segment in segments])
    state.last_vad_event = dict(merged_vad_meta)
    await _process_user_utterance(ws, state, merged_wav, vad_meta=merged_vad_meta)


async def _enqueue_user_segment(
    ws: WebSocket,
    state: VoiceWsState,
    segment: bytes,
    *,
    vad_meta: dict[str, Any] | None = None,
    flush_now: bool = False,
) -> None:
    if segment:
        state.pending_user_segments.append(PendingUserSegment(audio=segment, vad=dict(vad_meta or {})))

    if state.pending_user_segment_task and not state.pending_user_segment_task.done():
        state.pending_user_segment_task.cancel()
        state.pending_user_segment_task = None

    if flush_now:
        await _drain_pending_user_segments(ws, state)
        return

    async def _delayed_drain() -> None:
        current_task = asyncio.current_task()
        try:
            await asyncio.sleep(state.turn_end_grace_sec)
        except asyncio.CancelledError:
            return
        await _drain_pending_user_segments(ws, state)
        if state.pending_user_segment_task is current_task:
            state.pending_user_segment_task = None

    state.pending_user_segment_task = asyncio.create_task(_delayed_drain())


@router.websocket("/client")
async def client_ws(websocket: WebSocket):
    await websocket.accept()
    state = VoiceWsState()

    live_single = _create_live_interview_session()
    live_single_enabled = live_single.enabled

    try:
        if not await _send_json(
            websocket,
            {
                "type": "ready",
                "status": "ok",
                "message": "Dibut interview ws connected",
            },
        ):
            return
        if not await _send_json(
            websocket,
            {
                "type": "set-model-and-conf",
                "vad": "silero(rms-mvp)",
                "stt": f"gemini-live-single:{live_single.model}" if live_single_enabled else "disabled",
                "tts": f"gemini-live-single:{live_single.model}" if live_single_enabled else "disabled",
                "llm": f"gemini-live-single:{live_single.model}" if live_single_enabled else "disabled",
                "video": "local-camera-preview",
                "mode": "voice",
                "llmStreamModes": sorted(LLM_STREAM_MODES),
                "ttsModes": sorted(TTS_MODES),
            },
        ):
            return

        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await _send_json(websocket, {"type": "error", "message": "invalid json payload"})
                continue

            msg_type = data.get("type")

            if msg_type == "ping":
                await _send_json(websocket, {"type": "pong"})
                continue

            if msg_type == "health":
                await _send_json(websocket, {"type": "health", "status": "ok"})
                continue

            if msg_type == "echo":
                await _send_json(websocket, {"type": "echo", "data": data.get("data")})
                continue

            if msg_type == "init-interview-session":
                requested_session_type = data.get("sessionType", "live_interview")
                session_type = (
                    requested_session_type
                    if requested_session_type in {"live_interview", "portfolio_defense"}
                    else "live_interview"
                )
                personality = data.get("style", "professional")
                target_duration_sec = _clamp_target_duration(data.get("targetDurationSec"))
                closing_threshold_sec = _clamp_closing_threshold(data.get("closingThresholdSec"))
                llm_stream_mode = _normalize_llm_stream_mode(data.get("llmStreamMode"))
                tts_mode = _normalize_tts_mode(data.get("ttsMode"))

                raw_job_data = data.get("jobData")
                if isinstance(raw_job_data, dict):
                    job_data = raw_job_data
                else:
                    job_data = {"raw": data.get("jd", "")}

                raw_resume_data = data.get("resumeData")
                resume_data: Any
                if isinstance(raw_resume_data, dict):
                    resume_data = raw_resume_data
                elif isinstance(raw_resume_data, str):
                    resume_data = {"raw": raw_resume_data}
                else:
                    resume_data = {"raw": data.get("resume", "")}

                session = await asyncio.to_thread(
                    service.create_session,
                    None,
                    "voice",
                    personality,
                    job_data,
                    resume_data,
                    "running",
                    session_type,
                    None,
                    None,
                    target_duration_sec,
                    closing_threshold_sec,
                )

                if state.live_interview is not None:
                    await state.live_interview.close()
                state.live_interview = _create_live_interview_session()
                state.session_id = session["id"]
                state.session_type = session_type
                state.personality = personality
                state.job_data = job_data
                state.resume_data = resume_data
                state.runtime_mode = RUNTIME_MODE_LIVE_SINGLE if state.live_interview.enabled else RUNTIME_MODE_DISABLED
                state.runtime_mode_reason = "" if state.live_interview.enabled else "live-disabled"
                state.runtime_retry_after_sec = 0
                state.degraded_until_monotonic = 0.0
                state.degraded_fail_count = 0
                state.current_phase = "introduction"
                state.target_duration_sec = target_duration_sec
                state.closing_threshold_sec = closing_threshold_sec
                state.estimated_total_questions = _estimated_total_questions(target_duration_sec)
                if state.plan_bootstrap_task and not state.plan_bootstrap_task.done():
                    state.plan_bootstrap_task.cancel()
                state.plan_bootstrap_task = None
                state.planned_questions = []
                state.plan_attempted = False
                state.llm_stream_mode = llm_stream_mode
                state.tts_mode = tts_mode
                if state.pending_user_segment_task and not state.pending_user_segment_task.done():
                    state.pending_user_segment_task.cancel()
                state.pending_user_segment_task = None
                state.pending_user_segments = []
                state.realtime_user_pcm.clear()
                state.realtime_user_transcript = ""
                state.realtime_user_delta_seq = 0
                state.realtime_user_last_emit_at = 0.0
                state.last_ai_tts_text = ""
                state.last_ai_audio_guard_until = 0.0
                state.waiting_playback_turn_id = ""
                state.last_vad_event = {}
                state.question_type_cursor = 0
                state.recent_question_types = []
                state.recent_user_durations_ms = []
                state.short_reprompt_streak = 0
                state.memory_notes = []
                state.last_user_memory = ""
                state.last_model_memory = ""
                state.last_answer_quality_hint = ""
                state.turn_end_grace_sec = VOICE_TURN_END_GRACE_SEC
                _cancel_playback_resume_task(state)
                state.vad = VadSegmenter(
                    sample_rate=16000,
                    threshold=settings.voice_vad_threshold,
                    silence_ms=settings.voice_vad_silence_ms,
                    min_speech_ms=settings.voice_min_speech_ms,
                    min_utterance_ms=settings.voice_vad_min_utterance_ms,
                    short_utterance_silence_ms=settings.voice_vad_short_utterance_silence_ms,
                    max_segment_ms=settings.voice_max_segment_ms,
                )

                await _send_json(
                    websocket,
                    {
                        "type": "interview-session-created",
                        "client_uid": session["id"],
                        "mode": "voice",
                        "sessionType": session_type,
                        "targetDurationSec": target_duration_sec,
                        "closingThresholdSec": closing_threshold_sec,
                        "estimatedTotalQuestions": state.estimated_total_questions,
                        "runtimeMode": state.runtime_mode,
                        "runtimeReason": state.runtime_mode_reason,
                        "retryAfterSec": _degraded_retry_after_sec(state),
                        "llmStreamMode": state.llm_stream_mode,
                        "ttsMode": state.tts_mode,
                    },
                )
                await _send_avatar_state(websocket, "idle", session["id"])
                await _send_json(
                    websocket,
                    {
                        "type": "interview-phase-updated",
                        "phase": "introduction",
                        "guide": "voice pipeline connected",
                        "message": "음성 면접 실시간 파이프라인이 시작되었습니다.",
                    },
                )
                generated = await _generate_and_send_opening_live_turn(websocket, state)
                if not generated:
                    await _generate_and_send_ai_turn(
                        websocket,
                        state,
                        answer_quality_hint="직전 답변 없음: 기본 난이도로 시작",
                        forced_question_type="motivation_validation",
                    )
                continue

            if msg_type == "avatar.state.set":
                requested = data.get("state", "idle")
                valid_states = {"idle", "thinking", "listening", "speaking"}
                next_state = requested if requested in valid_states else "idle"
                session_for_event = data.get("sessionId") or state.session_id
                await _send_avatar_state(websocket, next_state, session_for_event)
                continue

            if msg_type in {"mic-audio-data", "raw-audio-data"}:
                if not state.session_id:
                    await _send_json(websocket, {"type": "error", "message": "session is not initialized"})
                    continue

                audio_chunk = _coerce_audio_chunk(data.get("audio"))
                if not audio_chunk:
                    continue

                state.realtime_user_pcm.extend(float_samples_to_pcm16le_bytes(audio_chunk))
                segment = state.vad.feed(audio_chunk)
                if segment:
                    state.last_vad_event = dict(state.vad.last_segment_info)
                    await _enqueue_user_segment(
                        websocket,
                        state,
                        segment,
                        vad_meta=state.last_vad_event,
                        flush_now=False,
                    )
                continue

            if msg_type in {"mic-audio-end", "flush-audio", "end-utterance"}:
                if not state.session_id:
                    continue
                segment = state.vad.flush()
                if segment:
                    state.last_vad_event = dict(state.vad.last_segment_info)
                    await _enqueue_user_segment(
                        websocket,
                        state,
                        segment,
                        vad_meta=state.last_vad_event,
                        flush_now=True,
                    )
                elif state.pending_user_segments:
                    await _enqueue_user_segment(websocket, state, b"", flush_now=True)
                else:
                    _reset_realtime_user_transcript(state)
                    state.realtime_user_pcm.clear()
                    await _resume_listening(websocket, state)
                continue

            if msg_type == "audio-playback-complete":
                ack_turn_id = str(data.get("turnId") or "").strip()
                if ack_turn_id and ack_turn_id == state.waiting_playback_turn_id:
                    state.waiting_playback_turn_id = ""
                    _cancel_playback_resume_task(state)
                    await _resume_listening(websocket, state, turn_id=ack_turn_id)
                continue

            if msg_type == "update-interview-phase":
                phase = data.get("phase", "introduction")
                state.current_phase = phase
                await _send_json(
                    websocket,
                    {
                        "type": "interview-phase-updated",
                        "phase": phase,
                        "guide": "phase updated",
                        "message": f"면접 단계가 {phase} 로 갱신되었습니다.",
                    },
                )
                continue

            if msg_type == "behavior-data":
                await _send_json(
                    websocket,
                    {
                        "type": "control",
                        "text": "warning",
                        "message": "MVP: behavior-data 수신됨",
                    },
                )
                continue

            await _send_json(
                websocket,
                {
                    "type": "warning",
                    "message": f"unsupported message type: {msg_type}",
                },
            )

    except WebSocketDisconnect:
        return
    except RuntimeError as exc:
        # Browser tab close / reconnect races can raise RuntimeError from receive_text.
        if "WebSocket is not connected" in str(exc):
            return
        raise
    finally:
        if state.plan_bootstrap_task and not state.plan_bootstrap_task.done():
            state.plan_bootstrap_task.cancel()
        if state.pending_user_segment_task and not state.pending_user_segment_task.done():
            state.pending_user_segment_task.cancel()
        _cancel_playback_resume_task(state)
        if state.live_interview is not None:
            await state.live_interview.close()
