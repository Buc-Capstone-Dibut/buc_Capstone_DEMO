from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from app.interview.domain.demo_script import (
    DEMO_SCRIPT_COMPLETION_REASON,
    OPENING as DEMO_SCRIPT_OPENING,
    QUESTIONS as DEMO_SCRIPT_QUESTIONS,
    demo_script_line,
    demo_script_question_index,
    is_demo_script_session,
    is_last_demo_script_question,
)
from app.interview.domain.interview_memory import can_repeat_followup_question_type
from app.interview.domain.turn_text import build_opening_turn_text, compose_ai_question_text
from app.interview.domain.turn_policy import (
    phase_for_question_index,
    plan_next_question,
    resolve_completion_decision,
    runtime_question_count,
)
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
    completion_reason: str = ""
    script_line_index: int = -1


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
    script_line_index: int = -1


def is_demo_script_state(state: VoiceWsState) -> bool:
    return is_demo_script_session(state.job_data, state.session_type)


def rollback_demo_script_cursor(state: VoiceWsState, *, claimed_line_index: int, turn_id: str) -> None:
    """대본 줄이 지원자에게 전달되지 못했으면 커서를 되돌려 다음 답변에서 같은 줄을 다시 시도한다.

    executor 는 줄을 저장한 뒤(질문 턴 활성화 후)에도 음성 실패 등으로 False 를 돌려줄 수 있다.
    그 줄은 이미 자막·기록에 남았으므로 되돌리지 않는다 — 되돌리면 같은 줄이 두 번 나간다.
    """
    if claimed_line_index < 0 or state.demo_script_cursor != claimed_line_index + 1:
        return
    if turn_id and state.active_question_turn_id == turn_id:
        return
    state.demo_script_cursor = claimed_line_index


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
        prompt=DEMO_SCRIPT_OPENING if is_demo_script_state(state) else build_opening_turn_text(
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
    if is_demo_script_state(state):
        # 재연결 복구도 대본 커서 위치의 줄을 그대로 이어간다(마지막 줄 이후면 종료 턴).
        line_index = state.demo_script_cursor
        script_text, is_completion = demo_script_line(line_index)
        question_index = demo_script_question_index(line_index)
        is_last = is_last_demo_script_question(line_index)
        return ResumeTurnSpec(
            turn_id=next_turn_id,
            latest_user_text=latest_user_text,
            answer_quality_hint=answer_quality_hint,
            question_type="",
            question_index=question_index,
            should_announce_closing=is_last,
            phase=phase_for_question_index(question_index, is_closing=is_last or is_completion),
            prompt=script_text,
            target_duration_sec=state.target_duration_sec,
            closing_threshold_sec=state.closing_threshold_sec,
            elapsed_sec=elapsed_sec,
            remaining_sec=remaining_sec,
            estimated_total_questions=state.estimated_total_questions,
            completion_reason=DEMO_SCRIPT_COMPLETION_REASON if is_completion else "",
            script_line_index=line_index,
        )
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

    if followup_spec.script_line_index >= 0:
        # 시연 고정 대본 — 답변 내용과 무관하게 커서 위치의 대사(종료 턴이면 CLOSING_TEXT)를 그대로 쓴다.
        strategy = "scripted"
        planned_question_text, _ = demo_script_line(followup_spec.script_line_index)
    elif followup_spec.completion_reason:
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
    if is_demo_script_state(state):
        # 시연 고정 대본은 시간/질문 상한이 아니라 대본 커서로만 종료를 결정한다.
        line_index = state.demo_script_cursor
        _, is_completion = demo_script_line(line_index)
        question_index = demo_script_question_index(line_index)
        is_last = is_last_demo_script_question(line_index)
        return LiveUserFollowupSpec(
            model_count=state.model_turn_count,
            target_duration_sec=state.target_duration_sec,
            closing_threshold_sec=state.closing_threshold_sec,
            elapsed_sec=elapsed_sec,
            remaining_sec=remaining_sec,
            estimated_total_questions=state.estimated_total_questions,
            completion_reason=DEMO_SCRIPT_COMPLETION_REASON if is_completion else "",
            question_index=0 if is_completion else question_index,
            should_announce_closing=is_last,
            phase=phase_for_question_index(question_index, is_closing=is_last or is_completion),
            response_question_index=1 + len(DEMO_SCRIPT_QUESTIONS) if is_completion else question_index,
            script_line_index=line_index,
        )
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
