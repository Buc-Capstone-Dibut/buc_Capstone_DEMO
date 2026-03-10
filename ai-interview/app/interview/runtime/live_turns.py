from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

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
    return OpeningTurnSpec(
        turn_id=next_turn_id,
        prompt=prompt,
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
    question_type = select_next_question_type(
        state,
        preferred=derive_question_type_preference(
            state,
            latest_user_text,
            turn_plan.should_announce_closing or state.current_phase == "closing",
        ) or ("priority_judgment" if turn_plan.should_announce_closing else None),
    )
    return ResumeTurnSpec(
        turn_id=next_turn_id,
        latest_user_text=latest_user_text,
        answer_quality_hint=answer_quality_hint,
        question_type=question_type,
        question_index=turn_plan.question_index,
        should_announce_closing=turn_plan.should_announce_closing,
        phase=turn_plan.phase,
        prompt=build_resume_live_prompt(
            should_announce_closing=turn_plan.should_announce_closing,
            closing_sentence=closing_sentence,
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
) -> LiveUserRequestSpec:
    prompt_user_text = state.realtime_user_transcript.strip()
    planned_question_type = ""
    extra_instruction = ""
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
            prompt_user_text,
            should_bias_closing,
        )
        planned_question_type = select_next_question_type(
            state,
            preferred=preferred_question_type or ("priority_judgment" if should_bias_closing else None),
        )
        if followup_spec.should_announce_closing:
            extra_instruction = (
                "이번 턴은 마지막 질문입니다. "
                "시간이 얼마 남지 않았음을 자연스럽게 안내한 뒤 질문은 정확히 1개만 하세요. "
                f"마지막 문장은 반드시 '{closing_sentence}' 문장 그대로 사용하세요."
            )

    answer_quality_hint = (
        build_answer_quality_hint(prompt_user_text)
        if prompt_user_text
        else state.last_answer_quality_hint
    )
    return LiveUserRequestSpec(
        prompt_user_text=prompt_user_text,
        answer_quality_hint=answer_quality_hint,
        planned_question_type=planned_question_type,
        extra_instruction=extra_instruction,
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
