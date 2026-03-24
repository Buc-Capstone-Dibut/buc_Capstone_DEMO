from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.config import settings
from app.interview.domain.pacing import DEFAULT_CLOSING_THRESHOLD_SEC, DEFAULT_TARGET_DURATION_SEC, estimated_total_questions
from app.services.gemini_live_voice_service import GeminiLiveInterviewSession
from app.services.voice_pipeline import VadSegmenter


def _is_live_only_architecture() -> bool:
    return (settings.voice_runtime_architecture or "").strip().lower() == "live-only"


def _effective_voice_vad_threshold() -> float:
    threshold = float(settings.voice_vad_threshold)
    if _is_live_only_architecture():
        threshold = max(threshold, 0.03)
    return threshold


def _effective_voice_vad_silence_ms() -> int:
    silence_ms = int(settings.voice_vad_silence_ms)
    if _is_live_only_architecture():
        silence_ms = max(silence_ms, 980)
    return silence_ms


def _effective_voice_vad_min_utterance_ms() -> int:
    min_utterance_ms = int(settings.voice_vad_min_utterance_ms)
    if _is_live_only_architecture():
        min_utterance_ms = max(min_utterance_ms, 900)
    return min_utterance_ms


def _effective_voice_vad_short_utterance_silence_ms() -> int:
    short_silence_ms = int(settings.voice_vad_short_utterance_silence_ms)
    if _is_live_only_architecture():
        short_silence_ms = max(short_silence_ms, 1650)
    return short_silence_ms


def _effective_turn_end_grace_sec() -> float:
    grace_sec = settings.voice_turn_end_grace_ms / 1000.0
    if _is_live_only_architecture():
        grace_sec = max(grace_sec, 0.14)
    return max(0.08, grace_sec)


def build_vad_segmenter() -> VadSegmenter:
    return VadSegmenter(
        sample_rate=16000,
        threshold=_effective_voice_vad_threshold(),
        speech_start_ms=settings.voice_vad_speech_start_ms,
        silence_ms=_effective_voice_vad_silence_ms(),
        min_speech_ms=settings.voice_min_speech_ms,
        min_utterance_ms=_effective_voice_vad_min_utterance_ms(),
        short_utterance_silence_ms=_effective_voice_vad_short_utterance_silence_ms(),
        max_segment_ms=settings.voice_max_segment_ms,
    )


@dataclass
class PreparedTtsAudio:
    chunks: list[str]
    sample_rate: int
    provider: str
    duration_sec: float = 0.0


@dataclass
class PreparedDeliverySegment:
    text: str
    prepared_audio: PreparedTtsAudio | None = None


@dataclass
class AiDeliveryPlan:
    segments: list[PreparedDeliverySegment] = field(default_factory=list)
    mode: str = "full"
    provider: str = ""

    @property
    def total_duration_sec(self) -> float:
        return sum(
            segment.prepared_audio.duration_sec
            for segment in self.segments
            if segment.prepared_audio is not None
        )

    @property
    def segment_count(self) -> int:
        return len(self.segments)


@dataclass
class PendingUserSegment:
    audio: bytes
    vad: dict[str, Any] = field(default_factory=dict)


@dataclass
class VoiceWsState:
    session_id: str = ""
    session_type: str = "live_interview"
    session_status: str = "created"
    runtime_status: str = "created"
    session_started_at: datetime | None = None
    session_ended_at: datetime | None = None
    last_disconnect_at: datetime | None = None
    reconnect_deadline_at: datetime | None = None
    last_paused_at: datetime | None = None
    paused_duration_sec: int = 0
    personality: str = "professional"
    job_data: dict[str, Any] = field(default_factory=dict)
    resume_data: Any = field(default_factory=dict)
    current_phase: str = "introduction"
    target_duration_sec: int = DEFAULT_TARGET_DURATION_SEC
    closing_threshold_sec: int = DEFAULT_CLOSING_THRESHOLD_SEC
    estimated_total_questions: int = estimated_total_questions(DEFAULT_TARGET_DURATION_SEC)
    closing_announced: bool = False
    model_turn_count: int = 0
    llm_stream_mode: str = "delta"
    tts_mode: str = "server"
    runtime_mode: str = "live-single"
    runtime_mode_reason: str = ""
    question_type_cursor: int = 0
    recent_question_types: list[str] = field(default_factory=list)
    recent_user_durations_ms: list[float] = field(default_factory=list)
    short_reprompt_streak: int = 0
    memory_notes: list[str] = field(default_factory=list)
    last_user_memory: str = ""
    last_model_memory: str = ""
    last_answer_quality_hint: str = ""
    turn_history: list[dict[str, Any]] = field(default_factory=list)
    turn_end_grace_sec: float = _effective_turn_end_grace_sec()
    processing_audio: bool = False
    pending_user_segments: list[PendingUserSegment] = field(default_factory=list)
    pending_user_segment_task: asyncio.Task[None] | None = None
    pending_segment_resume_ms: float = 0.0
    realtime_user_transcript: str = ""
    realtime_user_delta_seq: int = 0
    live_interview: GeminiLiveInterviewSession | None = None
    live_input_turn_active: bool = False
    live_input_turn_id: str = ""
    live_input_streamed_user_text: str = ""
    live_input_streamed_ai_text: str = ""
    live_input_streamed_provider: str = ""
    live_input_streamed_audio_duration_sec: float = 0.0
    live_input_streamed_audio_chunk_count: int = 0
    parallel_stt_turn_id: str = ""
    parallel_stt_sample_rate: int = 16000
    parallel_stt_samples: list[float] = field(default_factory=list)
    parallel_stt_best_text: str = ""
    parallel_stt_last_requested_sample_count: int = 0
    parallel_stt_task: asyncio.Task[None] | None = None
    last_ai_tts_text: str = ""
    last_ai_audio_guard_until: float = 0.0
    waiting_playback_turn_id: str = ""
    playback_resume_task: asyncio.Task[None] | None = None
    active_question_turn_id: str = ""
    active_question_heard_audio: bool = False
    current_question_retry_count: int = 0
    last_vad_event: dict[str, Any] = field(default_factory=dict)
    vad: VadSegmenter = field(default_factory=build_vad_segmenter)
