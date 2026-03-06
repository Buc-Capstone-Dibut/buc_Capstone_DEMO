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
from app.services.gemini_live_voice_service import GeminiLiveSttService, GeminiLiveTtsService
from app.services.interview_service import InterviewService
from app.services.llm_gemini import GeminiService
from app.services.voice_pipeline import (
    VadSegmenter,
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
VOICE_TURN_END_GRACE_SEC = max(0.2, settings.voice_turn_end_grace_ms / 1000.0)
VOICE_AI_ECHO_GUARD_SEC = max(0.5, settings.voice_ai_echo_guard_ms / 1000.0)
VOICE_AI_PLAYBACK_SKEW_SEC = 0.35
SHORT_STT_REPROMPT = "이어서 조금만 더 말씀해 주세요."
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
        voice=settings.gemini_live_tts_voice,
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
    return "final"


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
    llm_stream_mode: str = "final"
    tts_mode: str = "server"
    processing_audio: bool = False
    pending_user_segments: list[bytes] = field(default_factory=list)
    pending_user_segment_task: asyncio.Task[None] | None = None
    last_ai_tts_text: str = ""
    last_ai_audio_guard_until: float = 0.0
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


def _build_context(state: VoiceWsState) -> dict[str, Any]:
    return {
        "jobData": state.job_data,
        "resumeData": state.resume_data,
        "personality": state.personality,
    }


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
    prepared_tts = await _prepare_tts_audio(ws, text, turn_id=turn_id)
    _remember_ai_tts(state, text, prepared_tts)

    await _send_transcript(ws, state.session_id, "ai", text, turn_id=turn_id)
    await _send_json(ws, {"type": "full-text", "text": text, "turnId": turn_id})

    if prepared_tts is not None:
        await _send_avatar_state(ws, "speaking", state.session_id)
        await _send_prepared_tts_audio(ws, state.session_id, prepared_tts, turn_id=turn_id)
        await _send_avatar_state(ws, "idle", state.session_id)

    await _resume_listening(ws, state, turn_id=turn_id)


async def _generate_and_send_ai_turn(
    ws: WebSocket,
    state: VoiceWsState,
    answer_quality_hint: str,
) -> dict[str, Any]:
    if not state.session_id:
        return {"completed": False, "text": ""}

    await _ensure_plan(state)

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
        }
        await asyncio.to_thread(
            service.append_turn,
            state.session_id,
            "model",
            ai_text,
            "voice",
            payload,
        )

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
            "turnId": turn_id,
        },
    ):
        return {"completed": True, "text": ai_text, "turnId": turn_id}

    # Prepare TTS first so transcript display and audio playback start nearly together.
    prepared_tts = await _prepare_tts_audio(ws, ai_text, turn_id=turn_id)
    _remember_ai_tts(state, ai_text, prepared_tts)

    if not await _send_transcript(ws, state.session_id, "ai", ai_text, turn_id=turn_id):
        return {"completed": True, "text": ai_text, "turnId": turn_id}
    if not await _send_json(ws, {"type": "full-text", "text": ai_text, "turnId": turn_id}):
        return {"completed": True, "text": ai_text, "turnId": turn_id}

    if prepared_tts is not None:
        if not await _send_avatar_state(ws, "speaking", state.session_id):
            return {"completed": True, "text": ai_text, "turnId": turn_id}
        if not await _send_prepared_tts_audio(ws, state.session_id, prepared_tts, turn_id=turn_id):
            return {"completed": True, "text": ai_text, "turnId": turn_id}
        if not await _send_avatar_state(ws, "idle", state.session_id):
            return {"completed": True, "text": ai_text, "turnId": turn_id}

    is_complete = bool(completion_reason)
    if not is_complete:
        await _resume_listening(ws, state, turn_id=turn_id)

    return {
        "completed": is_complete,
        "text": ai_text,
        "turnId": turn_id,
        "closingAnnounced": announced_closing_this_turn,
        "completionReason": completion_reason,
    }


async def _process_user_utterance(ws: WebSocket, state: VoiceWsState, wav_bytes: bytes) -> None:
    if not state.session_id or state.processing_audio:
        return

    state.processing_audio = True

    try:
        if not await _send_json(ws, {"type": "control", "text": "mic-audio-end"}):
            return
        if not await _send_avatar_state(ws, "thinking", state.session_id):
            return

        stt = get_stt_service()
        if not stt.enabled:
            await _send_json(
                ws,
                {
                    "type": "warning",
                    "message": "STT provider is disabled. Set GEMINI_API_KEY to enable speech transcription.",
                },
            )
            await _resume_listening(ws, state)
            return

        stt_result = await stt.transcribe_wav(wav_bytes, "ko")
        user_text = (stt_result.text or "").strip()
        if not user_text:
            await _resume_listening(ws, state)
            return
        if _is_probable_ai_echo(state, user_text, wav_bytes):
            logger.info(
                "suppressed probable ai echo from STT (text=%r, session_id=%s)",
                user_text,
                state.session_id,
            )
            await _resume_listening(ws, state)
            return
        if _is_short_stt_result(user_text, wav_bytes):
            logger.info(
                "short stt result detected; requesting continuation (text=%r, session_id=%s)",
                user_text,
                state.session_id,
            )
            await _send_continue_prompt(ws, state)
            return

        await asyncio.to_thread(
            service.append_turn,
            state.session_id,
            "user",
            user_text,
            "voice",
            {"provider": stt_result.provider, "input": "speech"},
        )
        if not await _send_transcript(ws, state.session_id, "user", user_text):
            return

        turns = await asyncio.to_thread(service.get_turns, state.session_id)
        history = _to_chat_history(turns)
        answer_quality_hint = _build_answer_quality_hint(_latest_user_answer(history))
        await _generate_and_send_ai_turn(ws, state, answer_quality_hint)

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
    merged_wav = _merge_wav_segments(segments)
    if not merged_wav:
        return
    await _process_user_utterance(ws, state, merged_wav)


async def _enqueue_user_segment(
    ws: WebSocket,
    state: VoiceWsState,
    segment: bytes,
    *,
    flush_now: bool = False,
) -> None:
    if segment:
        state.pending_user_segments.append(segment)

    if state.pending_user_segment_task and not state.pending_user_segment_task.done():
        state.pending_user_segment_task.cancel()
        state.pending_user_segment_task = None

    if flush_now:
        await _drain_pending_user_segments(ws, state)
        return

    async def _delayed_drain() -> None:
        current_task = asyncio.current_task()
        try:
            await asyncio.sleep(VOICE_TURN_END_GRACE_SEC)
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

    stt = get_stt_service()
    tts = get_tts_service()

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
                "stt": f"gemini-live:{settings.gemini_live_stt_model}" if stt.enabled else "disabled",
                "tts": f"gemini-tts:{settings.gemini_tts_model}" if tts.enabled else "disabled",
                "llm": f"gemini:{settings.gemini_model}" if settings.gemini_api_key else "disabled",
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

                state.session_id = session["id"]
                state.session_type = session_type
                state.personality = personality
                state.job_data = job_data
                state.resume_data = resume_data
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
                state.last_ai_tts_text = ""
                state.last_ai_audio_guard_until = 0.0
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
                await _generate_and_send_ai_turn(
                    websocket,
                    state,
                    answer_quality_hint="직전 답변 없음: 기본 난이도로 시작",
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

                segment = state.vad.feed(audio_chunk)
                if segment:
                    await _enqueue_user_segment(websocket, state, segment, flush_now=False)
                continue

            if msg_type in {"mic-audio-end", "flush-audio", "end-utterance"}:
                if not state.session_id:
                    continue
                segment = state.vad.flush()
                if segment:
                    await _enqueue_user_segment(websocket, state, segment, flush_now=True)
                elif state.pending_user_segments:
                    await _enqueue_user_segment(websocket, state, b"", flush_now=True)
                else:
                    await _resume_listening(websocket, state)
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
