from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from app.interview.domain.interview_memory import can_repeat_followup_question_type
from app.interview.domain.turn_text import build_opening_turn_text, compose_ai_question_text
from app.interview.domain.turn_policy import plan_next_question, resolve_completion_decision, runtime_question_count
from app.interview.runtime.orchestration import build_resume_live_prompt
from app.interview.runtime.state import VoiceWsState


@dataclass(frozen=True)
class OpeningTurnSpec:
    turn_id: str
    prompt: str
    question_type: str
    phase: str
    question_index: int
    target_duration_sec: int
    closing_threshold_sec: int
    elapsed_sec: int
    remaining_sec: int
    estimated_total_questions: int


@dataclass(frozen=True)
class ResumeTurnSpec:
    turn_id: str
    latest_user_text: str
    answer_quality_hint: str
    question_type: str
    question_index: int
    should_announce_closing: bool
    phase: str
    prompt: str
    target_duration_sec: int
    closing_threshold_sec: int
    elapsed_sec: int
    remaining_sec: int
    estimated_total_questions: int


@dataclass(frozen=True)
class LiveUserRequestSpec:
    prompt_user_text: str
    answer_quality_hint: str
    planned_question_type: str
    extra_instruction: str
    planned_question_text: str = ""
    strategy: str = "followup"


@dataclass(frozen=True)
class LiveUserFollowupSpec:
    model_count: int
    target_duration_sec: int
    closing_threshold_sec: int
    elapsed_sec: int
    remaining_sec: int
    estimated_total_questions: int
    completion_reason: str
    question_index: int
    should_announce_closing: bool
    phase: str
    response_question_index: int


def prepare_opening_turn(
    state: VoiceWsState,
    *,
    next_turn_id: str,
    prompt: str,
    question_type: str,
    runtime_timing: Callable[[VoiceWsState], tuple[int, int]],
) -> OpeningTurnSpec:
    elapsed_sec, remaining_sec = runtime_timing(state)
    job_data = state.job_data if isinstance(state.job_data, dict) else {}
    return OpeningTurnSpec(
        turn_id=next_turn_id,
        prompt=build_opening_turn_text(
            session_type=state.session_type,
            company=str(job_data.get("company") or "").strip(),
            role=str(job_data.get("role") or "").strip(),
            job_data=job_data,
            resume_data=state.resume_data,
            interview_level=str(job_data.get("interviewLevel") or "").strip(),
            seed_text=state.session_id or next_turn_id,
        ),
        question_type=question_type,
        phase="introduction",
        question_index=1,
        target_duration_sec=state.target_duration_sec,
        closing_threshold_sec=state.closing_threshold_sec,
        elapsed_sec=elapsed_sec,
        remaining_sec=remaining_sec,
        estimated_total_questions=state.estimated_total_questions,
    )


def prepare_resume_turn(
    state: VoiceWsState,
    *,
    next_turn_id: str,
    latest_user_text: str,
    answer_quality_hint: str,
    closing_sentence: str,
    derive_question_type_preference: Callable[[VoiceWsState, str, bool], str | None],
    select_next_question_type: Callable[[VoiceWsState], str] | Callable[..., str],
    runtime_timing: Callable[[VoiceWsState], tuple[int, int]],
) -> ResumeTurnSpec:
    elapsed_sec, remaining_sec = runtime_timing(state)
    turn_plan = plan_next_question(
        model_turn_count=state.model_turn_count,
        remaining_sec=remaining_sec,
        closing_threshold_sec=state.closing_threshold_sec,
        estimated_total_questions=state.estimated_total_questions,
        closing_announced=state.closing_announced,
    )
    should_bias_closing = turn_plan.should_announce_closing or state.current_phase == "closing"
    preferred_question_type = derive_question_type_preference(
        state,
        latest_user_text,
        should_bias_closing,
    )
    last_type = (state.recent_question_types[-1] if state.recent_question_types else "").strip()
    if should_bias_closing:
        strategy = "transition"
        question_type = select_next_question_type(
            state,
            preferred=preferred_question_type or "priority_judgment",
        )
    elif not latest_user_text.strip():
        strategy = "retry"
        question_type = last_type or "motivation_validation"
    elif preferred_question_type and preferred_question_type != last_type:
        strategy = "followup"
        question_type = preferred_question_type
    elif preferred_question_type and preferred_question_type == last_type and can_repeat_followup_question_type(state, preferred_question_type):
        strategy = "followup"
        question_type = preferred_question_type
    else:
        strategy = "transition"
        question_type = select_next_question_type(
            state,
            preferred=preferred_question_type or None,
        )
    job_data = state.job_data if isinstance(state.job_data, dict) else {}
    return ResumeTurnSpec(
        turn_id=next_turn_id,
        latest_user_text=latest_user_text,
        answer_quality_hint=answer_quality_hint,
        question_type=question_type,
        question_index=turn_plan.question_index,
        should_announce_closing=turn_plan.should_announce_closing,
        phase=turn_plan.phase,
        prompt=compose_ai_question_text(
            user_text=latest_user_text,
            question_type=question_type,
            strategy=strategy,
            session_type=state.session_type,
            interview_level=str(job_data.get("interviewLevel") or "").strip(),
            question_index=turn_plan.question_index,
            job_data=job_data,
            resume_data=state.resume_data,
        ),
        target_duration_sec=state.target_duration_sec,
        closing_threshold_sec=state.closing_threshold_sec,
        elapsed_sec=elapsed_sec,
        remaining_sec=remaining_sec,
        estimated_total_questions=state.estimated_total_questions,
    )


def prepare_live_user_request(
    state: VoiceWsState,
    *,
    followup_spec: LiveUserFollowupSpec,
    closing_sentence: str,
    build_answer_quality_hint: Callable[[str], str],
    derive_question_type_preference: Callable[[VoiceWsState, str, bool], str | None],
    select_next_question_type: Callable[[VoiceWsState], str] | Callable[..., str],
    prompt_user_text: str | None = None,
) -> LiveUserRequestSpec:
    resolved_prompt_user_text = (
        prompt_user_text
        if prompt_user_text is not None
        else state.realtime_user_transcript
    ).strip()
    planned_question_type = ""
    extra_instruction = ""
    planned_question_text = ""
    strategy = "transition"
    should_bias_closing = followup_spec.should_announce_closing or state.current_phase == "closing"

    if followup_spec.completion_reason:
        extra_instruction = (
            "이번 턴은 질문 없이 면접을 종료하는 턴입니다. "
            "지원자의 방금 답변을 짧게 받아주고, 추가 질문 없이 종료 멘트만 말하세요. "
            f"마지막 문장은 반드시 '{closing_sentence}' 문장 그대로 사용하세요."
        )
    else:
        preferred_question_type = derive_question_type_preference(
            state,
            resolved_prompt_user_text,
            should_bias_closing,
        )
        last_type = (state.recent_question_types[-1] if state.recent_question_types else "").strip()
        if should_bias_closing:
            strategy = "transition"
            planned_question_type = select_next_question_type(
                state,
                preferred=preferred_question_type or "priority_judgment",
            )
        elif not resolved_prompt_user_text:
            strategy = "retry"
            planned_question_type = last_type or "motivation_validation"
        elif preferred_question_type and preferred_question_type != last_type:
            strategy = "followup"
            planned_question_type = preferred_question_type
        elif preferred_question_type and preferred_question_type == last_type and can_repeat_followup_question_type(state, preferred_question_type):
            strategy = "followup"
            planned_question_type = preferred_question_type
        else:
            strategy = "transition"
            planned_question_type = select_next_question_type(
                state,
                preferred=preferred_question_type or None,
            )
        job_data = state.job_data if isinstance(state.job_data, dict) else {}
        planned_question_text = compose_ai_question_text(
            user_text=resolved_prompt_user_text,
            question_type=planned_question_type,
            strategy=strategy,
            session_type=state.session_type,
            interview_level=str(job_data.get("interviewLevel") or "").strip(),
            question_index=followup_spec.question_index,
            job_data=job_data,
            resume_data=state.resume_data,
        )
        if followup_spec.should_announce_closing:
            extra_instruction = (
                "이번 턴은 마지막 질문입니다. 질문은 정확히 1개만 하세요."
            )

    answer_quality_hint = (
        build_answer_quality_hint(resolved_prompt_user_text)
        if resolved_prompt_user_text
        else state.last_answer_quality_hint
    )
    return LiveUserRequestSpec(
        prompt_user_text=resolved_prompt_user_text,
        answer_quality_hint=answer_quality_hint,
        planned_question_type=planned_question_type,
        extra_instruction=extra_instruction,
        planned_question_text=planned_question_text,
        strategy=strategy,
    )


def prepare_live_user_followup(
    state: VoiceWsState,
    *,
    runtime_timing: Callable[[VoiceWsState], tuple[int, int]],
) -> LiveUserFollowupSpec:
    elapsed_sec, remaining_sec = runtime_timing(state)
    completion = resolve_completion_decision(
        closing_announced=state.closing_announced,
        elapsed_sec=elapsed_sec,
        target_duration_sec=state.target_duration_sec,
        model_turn_count=state.model_turn_count,
        session_status=state.session_status,
    )
    if completion.is_complete:
        return LiveUserFollowupSpec(
            model_count=state.model_turn_count,
            target_duration_sec=state.target_duration_sec,
            closing_threshold_sec=state.closing_threshold_sec,
            elapsed_sec=elapsed_sec,
            remaining_sec=remaining_sec,
            estimated_total_questions=state.estimated_total_questions,
            completion_reason=completion.reason,
            question_index=0,
            should_announce_closing=False,
            phase="closing",
            response_question_index=runtime_question_count(state.model_turn_count, completed=True),
        )

    turn_plan = plan_next_question(
        model_turn_count=state.model_turn_count,
        remaining_sec=remaining_sec,
        closing_threshold_sec=state.closing_threshold_sec,
        estimated_total_questions=state.estimated_total_questions,
    )
    return LiveUserFollowupSpec(
        model_count=state.model_turn_count,
        target_duration_sec=state.target_duration_sec,
        closing_threshold_sec=state.closing_threshold_sec,
        elapsed_sec=elapsed_sec,
        remaining_sec=remaining_sec,
        estimated_total_questions=state.estimated_total_questions,
        completion_reason="",
        question_index=turn_plan.question_index,
        should_announce_closing=turn_plan.should_announce_closing,
        phase=turn_plan.phase,
        response_question_index=runtime_question_count(state.model_turn_count, completed=False),
    )
