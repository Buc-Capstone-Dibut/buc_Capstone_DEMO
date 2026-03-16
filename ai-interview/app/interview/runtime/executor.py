from __future__ import annotations

import asyncio
import logging
import re
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

logger = logging.getLogger("dibut.ws")
FOLLOWUP_GROUNDING_STOPWORDS = {
    "그냥",
    "정도",
    "부분",
    "경우",
    "관련",
    "이번",
    "회사",
    "업무",
    "프로젝트",
    "문제",
    "해결",
    "결과",
    "경험",
    "이유",
    "생각",
    "있습니다",
    "합니다",
    "그리고",
    "그래서",
    "말씀",
    "주세요",
    "지원자",
    "직무",
}


def _build_fallback_opening_text(state: VoiceWsState) -> str:
    if state.session_type == "portfolio_defense":
        return (
            "안녕하세요. Dibut입니다. 포트폴리오 디펜스를 시작하겠습니다. "
            "먼저 이 프로젝트를 한 문단 정도로 소개해 주시고, 본인이 가장 주도적으로 맡은 부분을 함께 말씀해 주세요."
        )

    job_data = state.job_data if isinstance(state.job_data, dict) else {}
    company = str(job_data.get("company") or "").strip()
    role = str(job_data.get("role") or "").strip()
    if company and role:
        return (
            f"안녕하세요. Dibut입니다. {company} {role} 포지션 면접을 시작하겠습니다. "
            "먼저 간단한 자기소개와 함께, 이 포지션에 지원한 이유를 말씀해 주세요."
        )
    if role:
        return (
            f"안녕하세요. Dibut입니다. {role} 포지션 면접을 시작하겠습니다. "
            "먼저 간단한 자기소개와 함께, 이 직무에 지원한 이유를 말씀해 주세요."
        )
    return (
        "안녕하세요. Dibut입니다. 면접을 시작하겠습니다. "
        "먼저 간단한 자기소개와 지원 동기를 함께 말씀해 주세요."
    )


def _fallback_question_for_type(state: VoiceWsState, question_type: str | None) -> str:
    if state.session_type == "portfolio_defense":
        return "이 프로젝트에서 본인이 가장 주도적으로 설계하거나 구현한 부분을 구체적으로 말씀해 주세요."

    normalized = (question_type or "").strip()
    if normalized == "motivation_validation":
        return "이 직무와 가장 관련 있는 프로젝트 경험 한 가지를 구체적으로 말씀해 주세요."
    if normalized == "metric_validation":
        return "그 경험에서 만든 성과를 수치와 지표 중심으로 구체적으로 말씀해 주세요."
    if normalized == "tradeoff":
        return "그 상황에서 어떤 선택지를 두고 무엇을 기준으로 판단했는지 구체적으로 말씀해 주세요."
    if normalized == "failure_recovery":
        return "가장 어려웠던 장애나 실패 사례 한 가지와 복구 과정을 구체적으로 말씀해 주세요."
    if normalized == "design_decision":
        return "핵심 설계 결정 한 가지와 그 이유를 구체적으로 말씀해 주세요."
    if normalized == "collaboration_conflict":
        return "협업 과정에서 조율이 필요했던 사례와 해결 방식을 구체적으로 말씀해 주세요."
    if normalized == "priority_judgment":
        return "우선순위가 충돌했던 상황에서 무엇을 기준으로 판단했는지 구체적으로 말씀해 주세요."
    return "이 부분을 대표할 수 있는 사례 한 가지를 구체적으로 말씀해 주세요."


def _extract_grounding_keywords(text: str, *, max_items: int = 4) -> list[str]:
    tokens = re.findall(r"[0-9A-Za-z가-힣]{2,}", (text or "").lower())
    keywords: list[str] = []
    for token in tokens:
        if token in FOLLOWUP_GROUNDING_STOPWORDS:
            continue
        if token.isdigit():
            continue
        if token not in keywords:
            keywords.append(token)
        if len(keywords) >= max_items:
            break
    return keywords


def _is_followup_grounded_in_user_answer(user_text: str, ai_text: str) -> bool:
    keywords = _extract_grounding_keywords(user_text)
    if not keywords:
        return True
    normalized_ai = re.sub(r"\s+", "", (ai_text or "").lower())
    return any(keyword in normalized_ai for keyword in keywords)


def _build_grounded_followup_fallback_text(
    state: VoiceWsState,
    *,
    user_text: str,
    question_type: str | None,
) -> str:
    focus_keyword = (_extract_grounding_keywords(user_text, max_items=1) or ["방금 말씀하신 내용"])[0]
    focus_label = f"'{focus_keyword}'" if focus_keyword != "방금 말씀하신 내용" else focus_keyword
    normalized = (question_type or "").strip()
    if normalized == "metric_validation":
        return f"방금 말씀하신 {focus_label}과 관련해, 어떤 수치나 지표로 성과를 검증하셨는지 구체적으로 말씀해 주세요."
    if normalized == "failure_recovery":
        return f"방금 말씀하신 {focus_label} 사례에서 가장 큰 문제와 복구 과정을 구체적으로 말씀해 주세요."
    if normalized == "design_decision":
        return f"방금 말씀하신 {focus_label}와 관련해, 핵심 설계 결정과 그 이유를 구체적으로 말씀해 주세요."
    if normalized == "collaboration_conflict":
        return f"방금 말씀하신 {focus_label}를 진행하면서 협업상 조율이 필요했던 순간을 구체적으로 말씀해 주세요."
    if normalized == "priority_judgment":
        return f"방금 말씀하신 {focus_label}와 관련해, 무엇을 기준으로 우선순위를 판단했는지 구체적으로 말씀해 주세요."
    if normalized == "tradeoff":
        return f"방금 말씀하신 {focus_label}와 관련해, 어떤 선택지를 비교했고 무엇을 기준으로 결정했는지 구체적으로 말씀해 주세요."
    return f"방금 말씀하신 {focus_label}와 관련해, 가장 핵심적인 사례를 하나 더 구체적으로 말씀해 주세요."


def _extract_required_closing_sentence(extra_instruction: str) -> str:
    quoted = re.findall(r"'([^']+)'", extra_instruction or "")
    for candidate in quoted:
        normalized = " ".join(candidate.split()).strip()
        if normalized.endswith("면접을 마치겠습니다."):
            return normalized
    return "수고하셨습니다. 이것으로 모든 면접을 마치겠습니다."


def _build_fallback_closing_text(
    state: VoiceWsState,
    *,
    user_text: str,
    closing_sentence: str,
) -> str:
    normalized_answer = " ".join((user_text or "").split()).strip()
    if state.session_type == "portfolio_defense":
        prefix = (
            "설명 잘 들었습니다. 프로젝트 의도와 구현 포인트가 잘 전달되었습니다."
            if normalized_answer
            else "포트폴리오 설명 잘 들었습니다."
        )
        return f"{prefix} {closing_sentence}".strip()

    prefix = (
        "답변 잘 들었습니다. 오늘 말씀해 주신 경험을 바탕으로 면접을 마무리하겠습니다."
        if normalized_answer
        else "오늘 면접 답변 잘 들었습니다. 면접을 마무리하겠습니다."
    )
    return f"{prefix} {closing_sentence}".strip()


def _activate_question_turn(
    state: VoiceWsState,
    *,
    turn_id: str,
    preserve_retry_count: bool = False,
) -> None:
    state.active_question_turn_id = (turn_id or "").strip()
    state.active_question_heard_audio = False
    if not preserve_retry_count:
        state.current_question_retry_count = 0


def _normalize_completion_turn_text(
    state: VoiceWsState,
    *,
    text: str,
    user_text: str,
    extra_instruction: str,
) -> str:
    closing_sentence = _extract_required_closing_sentence(extra_instruction)
    normalized = " ".join((text or "").split()).strip()
    if not normalized:
        return _build_fallback_closing_text(
            state,
            user_text=user_text,
            closing_sentence=closing_sentence,
        )
    if closing_sentence in normalized:
        return normalized
    if "?" in normalized or normalized.endswith("주세요.") or normalized.endswith("니까"):
        return _build_fallback_closing_text(
            state,
            user_text=user_text,
            closing_sentence=closing_sentence,
        )
    return f"{normalized} {closing_sentence}".strip()


def _complete_incomplete_ai_question_text(
    state: VoiceWsState,
    *,
    text: str,
    question_type: str | None,
) -> str:
    normalized = " ".join((text or "").split()).strip()
    fallback_question = _fallback_question_for_type(state, question_type)
    if not normalized:
        return fallback_question

    last_complete_idx = max(normalized.rfind("."), normalized.rfind("?"), normalized.rfind("!"))
    if last_complete_idx >= 0:
        prefix = normalized[: last_complete_idx + 1].strip()
    else:
        prefix = ""

    if prefix and prefix.endswith(fallback_question):
        return prefix
    if prefix:
        return f"{prefix} {fallback_question}".strip()
    return fallback_question


async def _recover_live_audio_for_ai_text(
    state: VoiceWsState,
    *,
    ai_text: str,
    question_type: str | None,
    extra_instruction: str,
    user_text: str,
    deps: RuntimeExecutorDeps,
) -> tuple[str, Any]:
    normalized = " ".join((ai_text or "").split()).strip()
    if not normalized:
        return "", None

    logger.warning(
        "recovering live audio for ai text (session=%s, text=%s)",
        state.session_id,
        normalized,
    )
    try:
        recovered_text, recovered_audio = await deps.request_live_text_turn(
            state,
            text=normalized,
            question_type=question_type,
            extra_instruction=(
                "방금 면접관 발화의 의미와 질문 의도를 바꾸지 말고, "
                "자연스러운 한국어 음성 문장으로 다시 말하세요. "
                "메타 설명 없이 질문은 그대로 유지하세요. "
                f"{extra_instruction}".strip()
            ),
            user_text=user_text,
        )
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.warning(
            "live audio recovery failed (session=%s, text=%s)",
            state.session_id,
            normalized,
            exc_info=True,
        )
        return normalized, None
    if not recovered_text:
        return normalized, None

    recovered_text, recovered_audio = await deps.repair_ai_turn_if_truncated(
        state,
        ai_text=recovered_text,
        prepared_tts=recovered_audio,
    )
    if not recovered_text or not deps.looks_like_complete_ai_question(recovered_text):
        return normalized, None
    return recovered_text, recovered_audio


@dataclass(frozen=True)
class RuntimeExecutorDeps:
    request_live_text_turn: Callable[..., Awaitable[tuple[str, Any]]]
    repair_ai_turn_if_truncated: Callable[..., Awaitable[tuple[str, Any]]]
    looks_like_complete_ai_question: Callable[[str], bool]
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


async def _repair_incomplete_ai_question(
    state: VoiceWsState,
    *,
    ai_text: str,
    prepared_audio: Any,
    question_type: str | None,
    extra_instruction: str,
    user_text: str,
    deps: RuntimeExecutorDeps,
) -> tuple[str, Any, bool]:
    normalized = (ai_text or "").strip()
    if not normalized or deps.looks_like_complete_ai_question(normalized):
        return normalized, prepared_audio, False

    current_text = normalized
    current_audio = prepared_audio
    for attempt in range(1, 2):
        logger.warning(
            "repairing incomplete ai question (session=%s, attempt=%s, text=%s)",
            state.session_id,
            attempt,
            current_text,
        )
        repaired_text, repaired_audio = await deps.request_live_text_turn(
            state,
            text=current_text,
            question_type=question_type,
            extra_instruction=(
                "방금 생성한 면접관 발화가 중간에서 끊겼습니다. "
                "메타 설명 없이 자연스러운 한국어 2~4문장으로 완성하고, 마지막 문장에는 질문 1개만 두세요. "
                "이미 나온 표현과 맥락을 최대한 유지하면서 끊긴 문장을 자연스럽게 마무리하세요. "
                f"{extra_instruction}".strip()
            ),
            user_text=user_text,
        )
        if not repaired_text:
            continue

        repaired_text, repaired_audio = await deps.repair_ai_turn_if_truncated(
            state,
            ai_text=repaired_text,
            prepared_tts=repaired_audio,
        )
        if not repaired_text:
            continue

        current_text = repaired_text
        current_audio = repaired_audio
        if deps.looks_like_complete_ai_question(repaired_text):
            return repaired_text, repaired_audio, repaired_text != normalized

    completed_text = _complete_incomplete_ai_question_text(
        state,
        text=current_text,
        question_type=question_type,
    )
    logger.warning(
        "falling back to deterministic completion for incomplete ai question (session=%s, text=%s)",
        state.session_id,
        completed_text,
    )
    return completed_text, None, completed_text != normalized


async def _regenerate_ungrounded_followup(
    state: VoiceWsState,
    *,
    ai_text: str,
    prepared_audio: Any,
    question_type: str | None,
    user_text: str,
    deps: RuntimeExecutorDeps,
) -> tuple[str, Any, bool]:
    normalized = (ai_text or "").strip()
    grounded_user_text = (user_text or "").strip()
    if not normalized or not grounded_user_text:
        return normalized, prepared_audio, False
    if _is_followup_grounded_in_user_answer(grounded_user_text, normalized):
        return normalized, prepared_audio, False

    logger.warning(
        "regenerating ungrounded followup (session=%s, ai_text=%s, user_text=%s)",
        state.session_id,
        normalized,
        grounded_user_text,
    )
    regenerated_text, regenerated_audio = await deps.request_live_text_turn(
        state,
        text="지원자의 방금 답변을 바탕으로 후속 질문을 다시 구성하세요.",
        question_type=question_type,
        extra_instruction=(
            "방금 답변의 키워드/기술명/수치 중 최소 1개를 질문 문장에 직접 언급하세요. "
            "답변과 무관한 새 주제로 넘어가지 말고, 방금 답변의 구체 디테일을 파고드는 꼬리질문만 하세요."
        ),
        user_text=grounded_user_text,
    )
    if regenerated_text:
        regenerated_text, regenerated_audio = await deps.repair_ai_turn_if_truncated(
            state,
            ai_text=regenerated_text,
            prepared_tts=regenerated_audio,
        )
        if regenerated_text and _is_followup_grounded_in_user_answer(grounded_user_text, regenerated_text):
            return regenerated_text, regenerated_audio, regenerated_text != normalized

    fallback_text = _build_grounded_followup_fallback_text(
        state,
        user_text=grounded_user_text,
        question_type=question_type,
    )
    logger.warning(
        "falling back to grounded followup completion (session=%s, text=%s)",
        state.session_id,
        fallback_text,
    )
    return fallback_text, None, fallback_text != normalized


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
    fallback_used = False
    base_opening_text = _build_fallback_opening_text(state)
    ai_text, prepared_live_audio = await deps.request_live_text_turn(
        state,
        text=base_opening_text,
        question_type=spec.question_type,
        extra_instruction=(
            "첫 면접 질문은 반드시 완전한 문장으로 마무리하세요. "
            "지원자에게 바로 답변을 요청하는 마지막 질문 1개를 유지하세요."
        ),
    )
    original_ai_text = ai_text or base_opening_text
    if ai_text:
        ai_text, prepared_live_audio = await deps.repair_ai_turn_if_truncated(
            state,
            ai_text=ai_text,
            prepared_tts=prepared_live_audio,
        )
        ai_text, prepared_live_audio, repaired_incomplete = await _repair_incomplete_ai_question(
            state,
            ai_text=ai_text,
            prepared_audio=prepared_live_audio,
            question_type=spec.question_type,
            extra_instruction="면접 시작 멘트와 첫 질문을 완성하세요.",
            user_text="",
            deps=deps,
        )
    else:
        repaired_incomplete = False

    if not ai_text:
        fallback_used = True
        ai_text = base_opening_text
        prepared_live_audio = None
        logger.warning(
            "opening turn falling back to deterministic text (session=%s, turn=%s, original_ai_text=%s)",
            state.session_id,
            spec.turn_id,
            original_ai_text,
        )
        await deps.send_json(
            ws,
            {
                "type": "warning",
                "message": "Gemini opening 응답이 불안정해 기본 질문으로 면접을 시작합니다.",
                "turnId": spec.turn_id,
            },
        )
    elif prepared_live_audio is None:
        ai_text, prepared_live_audio = await _recover_live_audio_for_ai_text(
            state,
            ai_text=ai_text,
            question_type=spec.question_type,
            extra_instruction="면접 시작 인사와 첫 질문을 같은 의미로 다시 말하세요.",
            user_text="",
            deps=deps,
        )
        if prepared_live_audio is None:
            logger.warning(
                "opening turn proceeding without audio (session=%s, turn=%s, ai_text=%s)",
                state.session_id,
                spec.turn_id,
                ai_text,
            )
    repair_applied = ai_text != original_ai_text or repaired_incomplete
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
        provider=delivery_plan.provider or ("text-fallback" if fallback_used else "text-only"),
        latency_ms=int((monotonic() - started_at) * 1000),
        audio_duration_ms=int(round(delivery_plan.total_duration_sec * 1000)),
        live_model=deps.live_active_model(state),
        vad_config=deps.snapshot_vad_config(state),
        memory_snapshot=deps.build_memory_snapshot(state),
        question_type=spec.question_type,
        repair_applied=repair_applied,
        extra={"opening_fallback": fallback_used},
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
    _activate_question_turn(state, turn_id=spec.turn_id)
    has_audio = await deps.stream_prepared_ai_delivery(
        ws,
        state,
        delivery_plan=delivery_plan,
        turn_id=spec.turn_id,
        emit_delta=delivery_plan.mode != "text-only",
    )
    if has_audio:
        deps.arm_playback_resume(
            ws,
            state,
            turn_id=spec.turn_id,
            timeout_sec=max(1.2, delivery_plan.total_duration_sec + 0.8),
        )
    else:
        await deps.send_json(
            ws,
            {
                "type": "error",
                "message": "첫 질문 음성을 생성하지 못했습니다. 새로고침 후 다시 시작해 주세요.",
                "turnId": spec.turn_id,
            },
        )
        return False
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
    ai_text, prepared_live_audio, repaired_incomplete = await _repair_incomplete_ai_question(
        state,
        ai_text=ai_text,
        prepared_audio=prepared_live_audio,
        question_type=spec.question_type,
        extra_instruction="이전 면접 흐름과 말투를 유지하면서 다음 질문을 완성하세요.",
        user_text=spec.latest_user_text,
        deps=deps,
    )
    if not ai_text:
        await deps.send_json(
            ws,
            {
                "type": "warning",
                "message": "재연결 후 다음 질문 텍스트를 복구하지 못했습니다.",
                "turnId": spec.turn_id,
            },
        )
        return False
    if prepared_live_audio is None:
        ai_text, prepared_live_audio = await _recover_live_audio_for_ai_text(
            state,
            ai_text=ai_text,
            question_type=spec.question_type,
            extra_instruction="연결 복구 직후의 질문을 같은 의미로 다시 말하세요.",
            user_text=spec.latest_user_text,
            deps=deps,
        )
        if prepared_live_audio is None:
            logger.warning(
                "resume turn proceeding with text-only delivery (session=%s, turn=%s, ai_text=%s)",
                state.session_id,
                spec.turn_id,
                ai_text,
            )
    repair_applied = ai_text != original_ai_text or repaired_incomplete

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

    _activate_question_turn(state, turn_id=spec.turn_id)
    has_audio = await deps.stream_prepared_ai_delivery(
        ws,
        state,
        delivery_plan=delivery_plan,
        turn_id=spec.turn_id,
        emit_delta=delivery_plan.mode != "text-only",
    )
    if has_audio:
        deps.arm_playback_resume(
            ws,
            state,
            turn_id=spec.turn_id,
            timeout_sec=max(1.2, delivery_plan.total_duration_sec + 0.8),
        )
    else:
        await deps.send_json(
            ws,
            {
                "type": "warning",
                "message": "다음 질문 음성을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
                "turnId": spec.turn_id,
            },
        )
        return False
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
    fallback_followup_used = False

    if spec.completion_reason:
        ai_text = _normalize_completion_turn_text(
            state,
            text=live_ai_text or "",
            user_text=user_request.prompt_user_text,
            extra_instruction=user_request.extra_instruction,
        )
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
            ai_text = (
                _build_grounded_followup_fallback_text(
                    state,
                    user_text=user_request.prompt_user_text,
                    question_type=user_request.planned_question_type,
                )
                if user_request.prompt_user_text
                else _fallback_question_for_type(state, user_request.planned_question_type)
            )
            prepared_audio = None
            fallback_followup_used = True
            logger.warning(
                "live followup turn falling back after empty ai response (session=%s, turn=%s, user_text=%s)",
                state.session_id,
                turn_id,
                user_request.prompt_user_text,
            )
            await deps.send_json(
                ws,
                {
                    "type": "warning",
                    "message": "AI 후속 질문 생성이 비어 기본 꼬리질문으로 이어갑니다.",
                    "turnId": turn_id,
                },
            )

    ai_text_before_repair = ai_text
    ai_text, prepared_audio = await deps.repair_ai_turn_if_truncated(
        state,
        ai_text=ai_text,
        prepared_tts=prepared_audio,
    )
    if spec.completion_reason:
        ai_text = _normalize_completion_turn_text(
            state,
            text=ai_text,
            user_text=user_request.prompt_user_text,
            extra_instruction=user_request.extra_instruction,
        )
    if spec.completion_reason:
        repaired_incomplete = False
    else:
        ai_text, prepared_audio, repaired_incomplete = await _repair_incomplete_ai_question(
            state,
            ai_text=ai_text,
            prepared_audio=prepared_audio,
            question_type=user_request.planned_question_type,
            extra_instruction="지원자의 직전 답변을 바탕으로 자연스러운 후속 질문을 완성하세요.",
            user_text=user_request.prompt_user_text,
            deps=deps,
        )
        regrounded_followup = False
        repaired_after_regrounding = False
    repair_applied = bool(ai_text) and (
        ai_text != ai_text_before_repair
        or repaired_incomplete
        or (False if spec.completion_reason else regrounded_followup)
        or (False if spec.completion_reason else repaired_after_regrounding)
        or fallback_followup_used
    ) and not spec.completion_reason
    if not ai_text:
        if spec.completion_reason:
            ai_text = _build_fallback_closing_text(
                state,
                user_text=user_request.prompt_user_text,
                closing_sentence=_extract_required_closing_sentence(user_request.extra_instruction),
            )
            prepared_audio = None
            logger.warning(
                "closing turn fell back to deterministic text after empty repair (session=%s, turn=%s)",
                state.session_id,
                turn_id,
            )
        else:
            ai_text = (
                _build_grounded_followup_fallback_text(
                    state,
                    user_text=user_request.prompt_user_text,
                    question_type=user_request.planned_question_type,
                )
                if user_request.prompt_user_text
                else _fallback_question_for_type(state, user_request.planned_question_type)
            )
            prepared_audio = None
            repair_applied = True
            logger.warning(
                "live followup turn fell back after failed repair (session=%s, turn=%s, user_text=%s)",
                state.session_id,
                turn_id,
                user_request.prompt_user_text,
            )
            await deps.send_json(
                ws,
                {
                    "type": "warning",
                    "message": "후속 질문 복구에 실패해 기본 꼬리질문으로 이어갑니다.",
                    "turnId": turn_id,
                },
            )
    if prepared_audio is None:
        ai_text, prepared_audio = await _recover_live_audio_for_ai_text(
            state,
            ai_text=ai_text,
            question_type=user_request.planned_question_type,
            extra_instruction="지원자의 직전 답변을 반영한 같은 질문을 다시 말하세요.",
            user_text=user_request.prompt_user_text,
            deps=deps,
        )
        if prepared_audio is None:
            logger.warning(
                "live followup turn proceeding with text-only delivery (session=%s, turn=%s, ai_text=%s)",
                state.session_id,
                turn_id,
                ai_text,
            )

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
        _activate_question_turn(state, turn_id=turn_id)
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
        if spec.completion_reason:
            logger.warning(
                "closing turn proceeding without audio (session=%s, turn=%s)",
                state.session_id,
                turn_id,
            )
            return True
        logger.warning(
            "live followup turn proceeding text-only without audio (session=%s, turn=%s)",
            state.session_id,
            turn_id,
        )
        await deps.send_json(
            ws,
            {
                "type": "warning",
                "message": "이번 질문 음성을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
                "turnId": turn_id,
            },
        )
        return False

    has_audio = await deps.stream_prepared_ai_delivery(
        ws,
        state,
        delivery_plan=delivery_plan,
        turn_id=turn_id,
        emit_delta=delivery_plan.mode != "text-only",
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
        await deps.send_json(
            ws,
            {
                "type": "warning",
                "message": "이번 질문 음성을 재생하지 못했습니다. 잠시 후 다시 시도해 주세요.",
                "turnId": turn_id,
            },
        )
        return False
    return True
