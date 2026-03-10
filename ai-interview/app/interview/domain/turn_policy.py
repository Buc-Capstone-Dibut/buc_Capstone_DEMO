from __future__ import annotations

from dataclasses import dataclass

from app.interview.domain.pacing import MAX_DYNAMIC_QUESTIONS, SESSION_GRACE_SEC


@dataclass(frozen=True)
class CompletionDecision:
    reason: str = ""

    @property
    def is_complete(self) -> bool:
        return bool(self.reason)


@dataclass(frozen=True)
class QuestionTurnPlan:
    question_index: int
    should_announce_closing: bool
    phase: str
    prompt_total_questions: int


def phase_for_question_index(question_index: int, is_closing: bool = False) -> str:
    if is_closing:
        return "closing"
    if question_index <= 1:
        return "introduction"
    if question_index == 2:
        return "experience"
    if question_index == 3:
        return "technical"
    return "problem_solving"


def resolve_completion_decision(
    *,
    closing_announced: bool,
    elapsed_sec: int,
    target_duration_sec: int,
    model_turn_count: int,
    session_status: str,
) -> CompletionDecision:
    if closing_announced:
        return CompletionDecision("closing_answer_submitted")
    if elapsed_sec >= target_duration_sec + SESSION_GRACE_SEC:
        return CompletionDecision("time_limit_reached")
    if model_turn_count >= MAX_DYNAMIC_QUESTIONS:
        return CompletionDecision("question_cap_reached")
    if (session_status or "").strip() == "completed":
        return CompletionDecision("already_completed")
    return CompletionDecision()


def plan_next_question(
    *,
    model_turn_count: int,
    remaining_sec: int,
    closing_threshold_sec: int,
    estimated_total_questions: int,
    closing_announced: bool = False,
) -> QuestionTurnPlan:
    question_index = model_turn_count + 1
    should_announce_closing = (
        closing_announced
        or remaining_sec <= closing_threshold_sec
        or question_index >= estimated_total_questions
        or question_index >= MAX_DYNAMIC_QUESTIONS
    )
    return QuestionTurnPlan(
        question_index=question_index,
        should_announce_closing=should_announce_closing,
        phase=phase_for_question_index(question_index, is_closing=should_announce_closing),
        prompt_total_questions=question_index if should_announce_closing else estimated_total_questions,
    )


def runtime_question_count(model_turn_count: int, *, completed: bool) -> int:
    return model_turn_count + (0 if completed else 1)
