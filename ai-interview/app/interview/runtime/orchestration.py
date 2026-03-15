from __future__ import annotations

from typing import Any


def build_runtime_meta_payload(
    *,
    target_duration_sec: int,
    closing_threshold_sec: int,
    elapsed_sec: int,
    remaining_sec: int,
    estimated_total_questions: int,
    question_count: int,
    is_closing_phase: bool,
    interview_complete: bool,
    finish_reason: str,
    session_paused: bool,
    reconnect_remaining_sec: int,
    runtime_status: str,
    runtime_mode: str,
    runtime_reason: str,
    retry_after_sec: int,
    turn_id: str | None = None,
) -> dict[str, Any]:
    return {
        "type": "runtime.meta",
        "targetDurationSec": target_duration_sec,
        "closingThresholdSec": closing_threshold_sec,
        "elapsedSec": elapsed_sec,
        "remainingSec": remaining_sec,
        "estimatedTotalQuestions": estimated_total_questions,
        "questionCount": question_count,
        "isClosingPhase": is_closing_phase,
        "interviewComplete": interview_complete,
        "finishReason": finish_reason,
        "sessionPaused": session_paused,
        "reconnectRemainingSec": reconnect_remaining_sec,
        "runtimeStatus": runtime_status,
        "runtimeMode": runtime_mode,
        "runtimeReason": runtime_reason,
        "retryAfterSec": retry_after_sec,
        "turnId": turn_id,
    }


def build_resume_live_prompt(*, should_announce_closing: bool, closing_sentence: str) -> str:
    if should_announce_closing:
        return (
            "연결이 복구되었습니다. 이번 턴은 마지막 질문입니다. "
            "반드시 마지막 질문 안내 후 질문 1개를 하고, 마지막에 "
            f"'{closing_sentence}' 문장을 포함해 마무리하세요."
        )
    return "연결이 복구되었습니다. 직전 지원자 답변을 자연스럽게 이어 받아 다음 질문 1개만 2~3문장으로 말하세요."


def build_voice_model_turn_payload(
    *,
    phase: str,
    question_index: int,
    remaining_sec: int,
    target_duration_sec: int,
    closing_threshold_sec: int,
    estimated_total_questions: int,
    delivery_mode: str,
    delivery_segments: int,
    turn_id: str,
    runtime_mode: str,
    runtime_reason: str,
    provider: str,
    latency_ms: int,
    audio_duration_ms: int,
    live_model: str,
    vad_config: dict[str, Any],
    memory_snapshot: str,
    stream_mode: str = "live-single",
    tts_mode: str = "live-single",
    question_type: str = "",
    answer_quality_hint: str = "",
    completion_reason: str = "",
    repair_applied: bool = False,
    delta_count: int = 0,
    user_speech_duration_ms: float = 0.0,
    vad: dict[str, Any] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "phase": phase,
        "question_index": question_index,
        "channel": "voice",
        "remaining_sec": remaining_sec,
        "target_duration_sec": target_duration_sec,
        "closing_threshold_sec": closing_threshold_sec,
        "estimated_total_questions": estimated_total_questions,
        "stream_mode": stream_mode,
        "tts_mode": tts_mode,
        "delivery_mode": delivery_mode,
        "delivery_segments": delivery_segments,
        "turn_id": turn_id,
        "question_type": question_type,
        "completion_reason": completion_reason,
        "runtime_mode": runtime_mode,
        "runtime_reason": runtime_reason,
        "provider": provider,
        "latency_ms": latency_ms,
        "audio_duration_ms": audio_duration_ms,
        "repair_applied": repair_applied,
        "live_model": live_model,
        "vad_config": vad_config,
        "memory_snapshot": memory_snapshot,
    }
    if answer_quality_hint:
        payload["answer_quality_hint"] = answer_quality_hint
    if delta_count > 0:
        payload["delta_count"] = delta_count
    if user_speech_duration_ms > 0:
        payload["user_speech_duration_ms"] = user_speech_duration_ms
    if vad:
        payload["vad"] = vad
    if extra:
        payload.update(extra)
    return payload


def build_voice_user_turn_payload(
    *,
    provider: str,
    runtime_mode: str,
    runtime_reason: str,
    speech_duration_ms: float,
    stt_text_len: int,
    live_model: str,
    vad: dict[str, Any],
    vad_config: dict[str, Any],
    answer_quality_hint: str,
    memory_snapshot: str,
) -> dict[str, Any]:
    return {
        "provider": provider,
        "input": "speech",
        "runtime_mode": runtime_mode,
        "runtime_reason": runtime_reason,
        "speech_duration_ms": speech_duration_ms,
        "stt_text_len": stt_text_len,
        "live_model": live_model,
        "vad": vad,
        "vad_config": vad_config,
        "answer_quality_hint": answer_quality_hint,
        "memory_snapshot": memory_snapshot,
    }
