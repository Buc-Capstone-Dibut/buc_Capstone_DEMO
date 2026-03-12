from __future__ import annotations

import base64
import re
from typing import Any, Callable

from app.config import settings
from app.interview.runtime.state import VoiceWsState, build_vad_segmenter
from app.services.voice_pipeline import float_samples_to_wav_bytes, wav_bytes_to_float_samples

LLM_STREAM_MODES = {"final", "delta"}
TTS_MODES = {"server"}


def is_short_stt_result(
    text: str,
    wav_bytes: bytes,
    *,
    looks_like_complete_answer: Callable[[str], bool],
) -> bool:
    tokens = re.findall(r"[0-9A-Za-z가-힣]+", text or "")
    char_count = sum(len(token) for token in tokens)
    if char_count <= 2:
        return True

    complete = looks_like_complete_answer(text)
    samples, sample_rate = wav_bytes_to_float_samples(wav_bytes)
    duration_ms = (len(samples) / max(sample_rate, 1)) * 1000.0 if samples else 0.0

    if not complete and char_count <= settings.voice_min_answer_chars:
        if duration_ms <= settings.voice_short_answer_max_duration_ms:
            return True
        if len(tokens) <= 2 and char_count <= settings.voice_min_answer_chars + 4:
            return True

    return False


def normalize_compare_text(text: str) -> str:
    lowered = (text or "").lower()
    lowered = re.sub(r"\s+", "", lowered)
    return re.sub(r"[^0-9a-z가-힣]", "", lowered)


def estimate_wav_duration_ms(wav_bytes: bytes) -> float:
    samples, sample_rate = wav_bytes_to_float_samples(wav_bytes)
    if not samples:
        return 0.0
    return (len(samples) / max(sample_rate, 1)) * 1000.0


def live_active_model(state: VoiceWsState) -> str:
    live = state.live_interview
    if live is None:
        return ""
    return getattr(live, "active_model", "") or getattr(live, "model", "")


def snapshot_vad_config(state: VoiceWsState) -> dict[str, Any]:
    return {
        "threshold": float(state.vad.threshold),
        "speech_start_ms": int(state.vad.speech_start_ms),
        "silence_ms": int(state.vad.silence_ms),
        "short_utterance_silence_ms": int(state.vad.short_utterance_silence_ms),
        "min_utterance_ms": int(state.vad.min_utterance_ms),
        "turn_end_grace_ms": int(round(state.turn_end_grace_sec * 1000.0)),
    }


def merge_vad_events(events: list[dict[str, Any]]) -> dict[str, Any]:
    valid = [event for event in events if event]
    if not valid:
        return {}
    duration_ms = sum(float(event.get("duration_ms") or 0.0) for event in valid)
    merged = dict(valid[-1])
    merged["segment_count"] = len(valid)
    merged["duration_ms"] = round(duration_ms, 1)
    merged["reasons"] = [str(event.get("reason") or "") for event in valid if event.get("reason")]
    return merged


def pcm16le_bytes_to_base64_chunks(
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


def coerce_audio_chunk(payload: Any, max_len: int = 16000) -> list[float]:
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


def normalize_llm_stream_mode(mode: Any) -> str:
    if isinstance(mode, str):
        lowered = mode.strip().lower()
        if lowered in LLM_STREAM_MODES:
            return lowered
    return "delta"


def normalize_tts_mode(mode: Any) -> str:
    if not isinstance(mode, str):
        return "server"
    lowered = mode.strip().lower()
    if lowered in {"server", "full", "sentence", "client"}:
        return "server"
    return "server"


def to_chat_history(turns: list[dict[str, Any]]) -> list[dict[str, str]]:
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


def merge_wav_segments(segments: list[bytes]) -> bytes:
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


def reset_voice_runtime_state(
    state: VoiceWsState,
    *,
    llm_stream_mode: str,
    tts_mode: str,
    default_target_duration_sec: int,
    default_closing_threshold_sec: int,
    estimated_total_questions: Callable[[int], int],
    runtime_mode_live_single: str,
    runtime_mode_disabled: str,
    turn_end_grace_sec: float,
    cancel_playback_resume_task: Callable[[VoiceWsState], None],
) -> None:
    state.session_id = ""
    state.session_type = "live_interview"
    state.session_status = "created"
    state.runtime_status = "created"
    state.session_started_at = None
    state.session_ended_at = None
    state.last_disconnect_at = None
    state.reconnect_deadline_at = None
    state.last_paused_at = None
    state.paused_duration_sec = 0
    state.personality = "professional"
    state.job_data = {}
    state.resume_data = {}
    state.runtime_mode = runtime_mode_live_single if state.live_interview and state.live_interview.enabled else runtime_mode_disabled
    state.runtime_mode_reason = "" if state.runtime_mode == runtime_mode_live_single else "live-disabled"
    state.current_phase = "introduction"
    state.target_duration_sec = default_target_duration_sec
    state.closing_threshold_sec = default_closing_threshold_sec
    state.estimated_total_questions = estimated_total_questions(default_target_duration_sec)
    state.closing_announced = False
    state.model_turn_count = 0
    state.llm_stream_mode = llm_stream_mode
    state.tts_mode = tts_mode
    if state.pending_user_segment_task and not state.pending_user_segment_task.done():
        state.pending_user_segment_task.cancel()
    state.pending_user_segment_task = None
    state.pending_user_segments = []
    state.realtime_user_transcript = ""
    state.realtime_user_delta_seq = 0
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
    state.turn_history = []
    state.turn_end_grace_sec = turn_end_grace_sec
    cancel_playback_resume_task(state)
    state.vad = build_vad_segmenter()


__all__ = [
    "LLM_STREAM_MODES",
    "TTS_MODES",
    "coerce_audio_chunk",
    "estimate_wav_duration_ms",
    "is_short_stt_result",
    "live_active_model",
    "merge_vad_events",
    "merge_wav_segments",
    "normalize_compare_text",
    "normalize_llm_stream_mode",
    "normalize_tts_mode",
    "pcm16le_bytes_to_base64_chunks",
    "reset_voice_runtime_state",
    "snapshot_vad_config",
    "to_chat_history",
]
