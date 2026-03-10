from __future__ import annotations

from dataclasses import dataclass
from time import monotonic
from typing import Any, Awaitable, Callable

from fastapi import WebSocket

from app.interview.runtime.live_turns import (
    LiveUserFollowupSpec,
    LiveUserRequestSpec,
    OpeningTurnSpec,
    ResumeTurnSpec,
)
from app.interview.runtime.orchestration import build_runtime_meta_payload, build_voice_model_turn_payload
from app.interview.runtime.state import AiDeliveryPlan, VoiceWsState


@dataclass(frozen=True)
class RuntimeExecutorDeps:
    request_live_text_turn: Callable[..., Awaitable[tuple[str, Any]]]
    repair_ai_turn_if_truncated: Callable[..., Awaitable[tuple[str, Any]]]
    build_ai_delivery_plan: Callable[..., Awaitable[AiDeliveryPlan]]
    persist_turn: Callable[..., Awaitable[Any]]
    set_runtime_status: Callable[[str, str, str | None], Awaitable[Any]]
    update_session_status: Callable[[str, str, str | None], Awaitable[Any]]
    set_closing_announced: Callable[[str], Awaitable[Any]]
    mark_session_status: Callable[..., None]
    log_runtime_event: Callable[..., None]
    send_json: Callable[..., Awaitable[bool]]
    send_transcript: Callable[..., Awaitable[bool]]
    stream_prepared_ai_delivery: Callable[..., Awaitable[bool]]
    arm_playback_resume: Callable[..., None]
    resume_listening: Callable[..., Awaitable[Any]]
    reconnect_remaining_sec: Callable[[VoiceWsState], int]
    live_active_model: Callable[[VoiceWsState], str]
    snapshot_vad_config: Callable[[VoiceWsState], dict[str, Any]]
    build_memory_snapshot: Callable[[VoiceWsState], str]
    remember_model_turn: Callable[..., None]
    record_question_type: Callable[[VoiceWsState, str | None], None]


async def execute_opening_live_turn(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    spec: OpeningTurnSpec,
    deps: RuntimeExecutorDeps,
) -> bool:
    if not state.session_id:
        return False

    started_at = monotonic()
    ai_text, prepared_live_audio = await deps.request_live_text_turn(
        state,
        text=spec.prompt,
        question_type=spec.question_type,
    )
    if not ai_text or prepared_live_audio is None:
        await deps.send_json(
            ws,
            {
                "type": "warning",
                "message": "첫 질문 생성에 실패했습니다. 잠시 후 다시 연결해 주세요.",
                "turnId": spec.turn_id,
            },
        )
        return False

    original_ai_text = ai_text
    ai_text, prepared_live_audio = await deps.repair_ai_turn_if_truncated(
        state,
        ai_text=ai_text,
        prepared_tts=prepared_live_audio,
    )
    if not ai_text or prepared_live_audio is None:
        await deps.send_json(
            ws,
            {
                "type": "warning",
                "message": "Gemini Live 오디오 응답이 없어 첫 질문 생성에 실패했습니다. 다시 시작해 주세요.",
                "turnId": spec.turn_id,
            },
        )
        return False
    repair_applied = ai_text != original_ai_text
    delivery_plan = await deps.build_ai_delivery_plan(
        ws,
        text=ai_text,
        turn_id=spec.turn_id,
        preferred_full_audio=prepared_live_audio,
    )

    state.current_phase = spec.phase
    state.runtime_status = "model_speaking"
    await deps.set_runtime_status(state.session_id, "model_speaking", state.current_phase)
    payload = build_voice_model_turn_payload(
        phase=state.current_phase,
        question_index=spec.question_index,
        remaining_sec=spec.remaining_sec,
        target_duration_sec=spec.target_duration_sec,
        closing_threshold_sec=spec.closing_threshold_sec,
        estimated_total_questions=spec.estimated_total_questions,
        delivery_mode=delivery_plan.mode,
        delivery_segments=delivery_plan.segment_count,
        turn_id=spec.turn_id,
        runtime_mode=state.runtime_mode,
        runtime_reason=state.runtime_mode_reason,
        provider=delivery_plan.provider,
        latency_ms=int((monotonic() - started_at) * 1000),
        audio_duration_ms=int(round(delivery_plan.total_duration_sec * 1000)),
        live_model=deps.live_active_model(state),
        vad_config=deps.snapshot_vad_config(state),
        memory_snapshot=deps.build_memory_snapshot(state),
        question_type=spec.question_type,
        repair_applied=repair_applied,
    )
    await deps.persist_turn(
        state,
        role="model",
        content=ai_text,
        channel="voice",
        payload=payload,
    )
    deps.remember_model_turn(state, ai_text, question_type=spec.question_type)
    deps.mark_session_status(state, "in_progress", phase=state.current_phase)
    deps.log_runtime_event(
        "opening-turn",
        state,
        turn_id=spec.turn_id,
        phase=state.current_phase,
        question_index=spec.question_index,
        question_type=spec.question_type,
        delivery_mode=delivery_plan.mode,
        delivery_segments=delivery_plan.segment_count,
        latency_ms=payload["latency_ms"],
        audio_duration_ms=payload["audio_duration_ms"],
    )

    if not await deps.send_json(
        ws,
        {
            "type": "interview-phase-updated",
            "phase": state.current_phase,
            "guide": "voice-turn",
            "message": f"면접 단계: {state.current_phase}",
            "turnId": spec.turn_id,
        },
    ):
        return False
    if not await deps.send_json(
        ws,
        build_runtime_meta_payload(
            target_duration_sec=spec.target_duration_sec,
            closing_threshold_sec=spec.closing_threshold_sec,
            elapsed_sec=spec.elapsed_sec,
            remaining_sec=spec.remaining_sec,
            estimated_total_questions=spec.estimated_total_questions,
            question_count=state.model_turn_count,
            is_closing_phase=False,
            interview_complete=False,
            finish_reason="",
            session_paused=state.runtime_status == "reconnecting",
            reconnect_remaining_sec=deps.reconnect_remaining_sec(state),
            runtime_status=state.runtime_status,
            runtime_mode=state.runtime_mode,
            runtime_reason=state.runtime_mode_reason,
            retry_after_sec=0,
            turn_id=spec.turn_id,
        ),
    ):
        return False

    if not await deps.send_transcript(ws, state.session_id, "ai", ai_text, turn_id=spec.turn_id):
        return False
    if not await deps.send_json(ws, {"type": "full-text", "text": ai_text, "turnId": spec.turn_id}):
        return False

    deps.record_question_type(state, spec.question_type)
    has_audio = await deps.stream_prepared_ai_delivery(
        ws,
        state,
        delivery_plan=delivery_plan,
        turn_id=spec.turn_id,
        emit_delta=True,
    )
    if has_audio:
        deps.arm_playback_resume(
            ws,
            state,
            turn_id=spec.turn_id,
            timeout_sec=max(1.2, delivery_plan.total_duration_sec + 0.8),
        )
    else:
        await deps.resume_listening(ws, state, turn_id=spec.turn_id)
    return True


async def execute_resume_live_turn(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    spec: ResumeTurnSpec,
    deps: RuntimeExecutorDeps,
) -> bool:
    if not state.session_id:
        return False

    started_at = monotonic()
    state.current_phase = spec.phase
    ai_text, prepared_live_audio = await deps.request_live_text_turn(
        state,
        text=spec.prompt,
        question_type=spec.question_type,
        extra_instruction="연결 복구 직후이므로 이전 면접관의 말투와 질문 깊이를 그대로 유지할 것",
        user_text=spec.latest_user_text,
    )
    if not ai_text:
        return False

    original_ai_text = ai_text
    ai_text, prepared_live_audio = await deps.repair_ai_turn_if_truncated(
        state,
        ai_text=ai_text,
        prepared_tts=prepared_live_audio,
    )
    if not ai_text or prepared_live_audio is None:
        await deps.send_json(
            ws,
            {
                "type": "warning",
                "message": "재연결 후 Gemini Live 오디오 응답을 복구하지 못했습니다.",
                "turnId": spec.turn_id,
            },
        )
        return False
    repair_applied = ai_text != original_ai_text

    if spec.should_announce_closing:
        await deps.set_closing_announced(state.session_id)
        state.closing_announced = True

    delivery_plan = await deps.build_ai_delivery_plan(
        ws,
        text=ai_text,
        turn_id=spec.turn_id,
        preferred_full_audio=prepared_live_audio,
    )
    state.runtime_status = "model_speaking"
    await deps.set_runtime_status(state.session_id, "model_speaking", state.current_phase)
    payload = build_voice_model_turn_payload(
        phase=state.current_phase,
        question_index=spec.question_index,
        remaining_sec=spec.remaining_sec,
        target_duration_sec=spec.target_duration_sec,
        closing_threshold_sec=spec.closing_threshold_sec,
        estimated_total_questions=spec.estimated_total_questions,
        delivery_mode=delivery_plan.mode,
        delivery_segments=delivery_plan.segment_count,
        turn_id=spec.turn_id,
        runtime_mode=state.runtime_mode,
        runtime_reason=state.runtime_mode_reason,
        provider=delivery_plan.provider,
        latency_ms=int((monotonic() - started_at) * 1000),
        audio_duration_ms=int(round(delivery_plan.total_duration_sec * 1000)),
        live_model=deps.live_active_model(state),
        vad_config=deps.snapshot_vad_config(state),
        memory_snapshot=deps.build_memory_snapshot(state),
        question_type=spec.question_type,
        answer_quality_hint=spec.answer_quality_hint,
        repair_applied=repair_applied,
        extra={"resume_generated": True},
    )
    await deps.persist_turn(
        state,
        role="model",
        content=ai_text,
        channel="voice",
        payload=payload,
    )
    deps.record_question_type(state, spec.question_type)
    deps.remember_model_turn(state, ai_text, question_type=spec.question_type)
    deps.mark_session_status(state, "in_progress", phase=state.current_phase)
    deps.log_runtime_event(
        "resume-live-turn",
        state,
        turn_id=spec.turn_id,
        phase=state.current_phase,
        question_index=spec.question_index,
        question_type=spec.question_type,
        delivery_mode=delivery_plan.mode,
        delivery_segments=delivery_plan.segment_count,
        latency_ms=payload["latency_ms"],
        audio_duration_ms=payload["audio_duration_ms"],
    )

    if not await deps.send_json(
        ws,
        {
            "type": "interview-phase-updated",
            "phase": state.current_phase,
            "guide": "resume-live-turn",
            "message": "연결이 복구되어 다음 질문을 이어갑니다.",
            "turnId": spec.turn_id,
        },
    ):
        return False
    if not await deps.send_json(
        ws,
        build_runtime_meta_payload(
            target_duration_sec=spec.target_duration_sec,
            closing_threshold_sec=spec.closing_threshold_sec,
            elapsed_sec=spec.elapsed_sec,
            remaining_sec=spec.remaining_sec,
            estimated_total_questions=spec.estimated_total_questions,
            question_count=state.model_turn_count,
            is_closing_phase=state.current_phase == "closing",
            interview_complete=False,
            finish_reason="",
            session_paused=state.runtime_status == "reconnecting",
            reconnect_remaining_sec=deps.reconnect_remaining_sec(state),
            runtime_status=state.runtime_status,
            runtime_mode=state.runtime_mode,
            runtime_reason=state.runtime_mode_reason,
            retry_after_sec=0,
            turn_id=spec.turn_id,
        ),
    ):
        return False
    if not await deps.send_transcript(ws, state.session_id, "ai", ai_text, turn_id=spec.turn_id):
        return False
    if not await deps.send_json(ws, {"type": "full-text", "text": ai_text, "turnId": spec.turn_id}):
        return False

    has_audio = await deps.stream_prepared_ai_delivery(
        ws,
        state,
        delivery_plan=delivery_plan,
        turn_id=spec.turn_id,
        emit_delta=True,
    )
    if has_audio:
        deps.arm_playback_resume(
            ws,
            state,
            turn_id=spec.turn_id,
            timeout_sec=max(1.2, delivery_plan.total_duration_sec + 0.8),
        )
    else:
        await deps.resume_listening(ws, state, turn_id=spec.turn_id)
    return True


async def execute_live_user_followup_turn(
    ws: WebSocket,
    state: VoiceWsState,
    *,
    spec: LiveUserFollowupSpec,
    user_request: LiveUserRequestSpec,
    next_turn_id: str,
    live_ai_text: str,
    prepared_live_audio: Any,
    provider_name: str,
    active_live_provider: str,
    utterance_duration_ms: float,
    vad_meta: dict[str, Any],
    started_at: float,
    deps: RuntimeExecutorDeps,
) -> bool:
    turn_id = next_turn_id
    prepared_audio = prepared_live_audio
    repair_applied = False

    if spec.completion_reason:
        ai_text = (live_ai_text or "").strip()
        if not ai_text or prepared_audio is None:
            await deps.send_json(
                ws,
                {
                    "type": "error",
                    "message": "면접 종료 음성을 생성하지 못했습니다. 다시 연결해 주세요.",
                    "turnId": turn_id,
                },
            )
            return False
        state.current_phase = "closing"
        await deps.update_session_status(state.session_id, "completed", "closing")
        deps.mark_session_status(state, "completed", phase="closing")
        deps.log_runtime_event(
            "live-closing-turn",
            state,
            turn_id=turn_id,
            phase="closing",
            finish_reason=spec.completion_reason,
            question_count=spec.model_count,
        )
    else:
        state.current_phase = spec.phase
        ai_text = (live_ai_text or "").strip()
        if spec.should_announce_closing:
            await deps.set_closing_announced(state.session_id)
            state.closing_announced = True

        if not ai_text:
            await deps.send_json(
                ws,
                {
                    "type": "error",
                    "message": "Gemini Live 응답 생성에 실패했습니다. 잠시 후 다시 말씀해 주세요.",
                    "turnId": turn_id,
                },
            )
            await deps.resume_listening(ws, state)
            return False

    ai_text_before_repair = ai_text
    ai_text, prepared_audio = await deps.repair_ai_turn_if_truncated(
        state,
        ai_text=ai_text,
        prepared_tts=prepared_audio,
    )
    repair_applied = bool(ai_text) and ai_text != ai_text_before_repair and not spec.completion_reason
    if not ai_text or prepared_audio is None:
        await deps.send_json(
            ws,
            {
                "type": "error",
                "message": "Gemini Live 오디오 응답을 받지 못했습니다. 다시 연결해 주세요.",
                "turnId": turn_id,
            },
        )
        if not spec.completion_reason:
            await deps.resume_listening(ws, state, turn_id=turn_id)
        return False

    delivery_plan = await deps.build_ai_delivery_plan(
        ws,
        text=ai_text,
        turn_id=turn_id,
        preferred_full_audio=prepared_audio,
    )
    if not spec.completion_reason:
        state.runtime_status = "model_speaking"
        await deps.set_runtime_status(state.session_id, "model_speaking", state.current_phase)
    payload = build_voice_model_turn_payload(
        phase=state.current_phase,
        question_index=spec.response_question_index,
        remaining_sec=spec.remaining_sec,
        target_duration_sec=spec.target_duration_sec,
        closing_threshold_sec=spec.closing_threshold_sec,
        estimated_total_questions=spec.estimated_total_questions,
        delivery_mode=delivery_plan.mode,
        delivery_segments=delivery_plan.segment_count,
        turn_id=turn_id,
        runtime_mode=state.runtime_mode,
        runtime_reason=state.runtime_mode_reason,
        provider=delivery_plan.provider or provider_name,
        latency_ms=int((monotonic() - started_at) * 1000),
        audio_duration_ms=int(round(delivery_plan.total_duration_sec * 1000)),
        live_model=deps.live_active_model(state),
        vad_config=deps.snapshot_vad_config(state),
        memory_snapshot=deps.build_memory_snapshot(state),
        question_type="" if spec.completion_reason else user_request.planned_question_type,
        answer_quality_hint=state.last_answer_quality_hint,
        completion_reason=spec.completion_reason,
        repair_applied=repair_applied,
        user_speech_duration_ms=round(utterance_duration_ms, 1),
        vad=vad_meta,
    )
    await deps.persist_turn(
        state,
        role="model",
        content=ai_text,
        channel="voice",
        payload=payload,
    )
    if not spec.completion_reason:
        deps.record_question_type(state, user_request.planned_question_type)
        deps.remember_model_turn(state, ai_text, question_type=user_request.planned_question_type)
        deps.mark_session_status(state, "in_progress", phase=state.current_phase)
        deps.log_runtime_event(
            "live-model-turn",
            state,
            turn_id=turn_id,
            phase=state.current_phase,
            question_index=spec.question_index,
            question_type=user_request.planned_question_type,
            delivery_mode=delivery_plan.mode,
            delivery_segments=delivery_plan.segment_count,
            latency_ms=payload["latency_ms"],
            audio_duration_ms=payload["audio_duration_ms"],
            vad_reason=vad_meta.get("reason"),
        )
    else:
        deps.remember_model_turn(state, ai_text)

    if not await deps.send_json(
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
    if not await deps.send_json(
        ws,
        build_runtime_meta_payload(
            target_duration_sec=spec.target_duration_sec,
            closing_threshold_sec=spec.closing_threshold_sec,
            elapsed_sec=spec.elapsed_sec,
            remaining_sec=spec.remaining_sec,
            estimated_total_questions=spec.estimated_total_questions,
            question_count=spec.response_question_index,
            is_closing_phase=state.current_phase == "closing",
            interview_complete=bool(spec.completion_reason),
            finish_reason=spec.completion_reason,
            session_paused=state.runtime_status == "reconnecting",
            reconnect_remaining_sec=deps.reconnect_remaining_sec(state),
            runtime_status=state.runtime_status,
            runtime_mode=state.runtime_mode,
            runtime_reason=state.runtime_mode_reason,
            retry_after_sec=0,
            turn_id=turn_id,
        ),
    ):
        return False
    if not await deps.send_transcript(ws, state.session_id, "ai", ai_text, turn_id=turn_id):
        return False
    if not await deps.send_json(ws, {"type": "full-text", "text": ai_text, "turnId": turn_id}):
        return False

    if delivery_plan.total_duration_sec <= 0 and prepared_audio is None:
        await deps.send_json(
            ws,
            {
                "type": "error",
                "message": "Gemini Live 오디오 응답을 받지 못했습니다. 잠시 후 다시 말씀해 주세요.",
                "turnId": turn_id,
            },
        )
        await deps.resume_listening(ws, state, turn_id=turn_id)
        return False

    has_audio = await deps.stream_prepared_ai_delivery(
        ws,
        state,
        delivery_plan=delivery_plan,
        turn_id=turn_id,
        emit_delta=True,
    )
    if has_audio:
        if not spec.completion_reason:
            deps.arm_playback_resume(
                ws,
                state,
                turn_id=turn_id,
                timeout_sec=max(1.2, delivery_plan.total_duration_sec + 0.8),
            )
    elif not spec.completion_reason:
        await deps.resume_listening(ws, state, turn_id=turn_id)
    return True
