from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from app.interview.runtime.state import VoiceWsState


def reset_realtime_user_transcript(state: VoiceWsState) -> None:
    state.realtime_user_transcript = ""
    state.realtime_user_delta_seq = 0


def append_cached_turn(
    state: VoiceWsState,
    *,
    role: str,
    content: str,
    channel: str = "text",
    payload: dict[str, Any] | None = None,
    turn_index: int | None = None,
    created_at: datetime | None = None,
) -> None:
    cached_turn: dict[str, Any] = {
        "role": (role or "user").strip() or "user",
        "channel": (channel or "text").strip() or "text",
        "content": (content or "").strip(),
        "payload": payload if isinstance(payload, dict) else {},
    }
    if turn_index is not None:
        cached_turn["turn_index"] = turn_index
    if isinstance(created_at, datetime):
        cached_turn["created_at"] = created_at
    state.turn_history.append(cached_turn)
    if cached_turn["role"] in {"model", "ai"}:
        state.model_turn_count += 1


def mark_session_status(state: VoiceWsState, status: str, *, phase: str | None = None) -> None:
    normalized = (status or state.session_status or "created").strip() or "created"
    state.session_status = normalized
    if phase:
        state.current_phase = phase
    if normalized in {"running", "in_progress"} and state.session_started_at is None:
        state.session_started_at = datetime.now(timezone.utc)
    if normalized == "reconnecting":
        state.runtime_status = "reconnecting"
    if normalized in {"completed", "failed", "expired"}:
        state.runtime_status = "completed" if normalized == "completed" else "failed"
        state.session_ended_at = datetime.now(timezone.utc)
        state.last_disconnect_at = None
        state.reconnect_deadline_at = None
        state.last_paused_at = None
    else:
        state.session_ended_at = None


def hydrate_state_from_turns(
    state: VoiceWsState,
    turns: list[dict[str, Any]],
    *,
    record_question_type: Callable[[VoiceWsState, str | None], None],
    remember_model_turn: Callable[[VoiceWsState, str], None] | Callable[..., None],
    remember_user_turn: Callable[[VoiceWsState, str], None],
    build_answer_quality_hint: Callable[[str], str],
) -> None:
    state.turn_history = []
    state.model_turn_count = 0
    state.recent_question_types = []
    state.question_type_cursor = 0
    state.memory_notes = []
    state.last_user_memory = ""
    state.last_model_memory = ""

    for turn in turns:
        append_cached_turn(
            state,
            role=str(turn.get("role") or "user"),
            content=str(turn.get("content") or ""),
            channel=str(turn.get("channel") or "text"),
            payload=turn.get("payload") if isinstance(turn.get("payload"), dict) else {},
            turn_index=turn.get("turn_index"),
            created_at=turn.get("created_at"),
        )

    for turn in state.turn_history:
        payload = turn.get("payload") if isinstance(turn.get("payload"), dict) else {}
        question_type = (payload.get("question_type") or "").strip()
        if question_type:
            record_question_type(state, question_type)

    for turn in state.turn_history[-8:]:
        content = (turn.get("content") or "").strip()
        if not content:
            continue
        role = turn.get("role")
        payload = turn.get("payload") if isinstance(turn.get("payload"), dict) else {}
        if role in {"model", "ai"}:
            question_type = (payload.get("question_type") or "").strip() or None
            remember_model_turn(state, content, question_type=question_type)
        elif role == "user":
            remember_user_turn(state, content)

    latest_user_text = ""
    for turn in reversed(state.turn_history):
        if turn.get("role") == "user":
            latest_user_text = (turn.get("content") or "").strip()
            break
    state.last_answer_quality_hint = build_answer_quality_hint(latest_user_text) if latest_user_text else ""


def hydrate_state_from_session_row(
    state: VoiceWsState,
    session: dict[str, Any] | None,
    *,
    turns: list[dict[str, Any]] | None = None,
    clamp_target_duration: Callable[[int | None], int],
    clamp_closing_threshold: Callable[[int | None], int],
    estimated_total_questions: Callable[[int], int],
    hydrate_turns: Callable[[VoiceWsState, list[dict[str, Any]]], None],
) -> None:
    if not session:
        return

    state.session_id = str(session.get("id") or state.session_id or "")
    state.session_type = str(session.get("session_type") or state.session_type or "live_interview")
    state.session_status = str(session.get("status") or state.session_status or "created")
    state.runtime_status = str(session.get("runtime_status") or state.session_status or "created")
    state.personality = str(session.get("personality") or state.personality or "professional")

    job_payload = session.get("job_payload")
    if job_payload is not None:
        state.job_data = job_payload
    resume_payload = session.get("resume_payload")
    if resume_payload is not None:
        state.resume_data = resume_payload

    state.current_phase = str(session.get("current_phase") or state.current_phase or "introduction")
    state.target_duration_sec = clamp_target_duration(session.get("target_duration_sec") or state.target_duration_sec)
    state.closing_threshold_sec = clamp_closing_threshold(
        session.get("closing_threshold_sec") or state.closing_threshold_sec
    )
    state.estimated_total_questions = estimated_total_questions(state.target_duration_sec)
    state.closing_announced = bool(session.get("closing_announced", state.closing_announced))

    started_at = session.get("started_at")
    state.session_started_at = started_at if isinstance(started_at, datetime) else state.session_started_at
    ended_at = session.get("ended_at")
    state.session_ended_at = ended_at if isinstance(ended_at, datetime) else None
    disconnected_at = session.get("last_disconnect_at")
    state.last_disconnect_at = disconnected_at if isinstance(disconnected_at, datetime) else None
    reconnect_deadline_at = session.get("reconnect_deadline_at")
    state.reconnect_deadline_at = reconnect_deadline_at if isinstance(reconnect_deadline_at, datetime) else None
    last_paused_at = session.get("last_paused_at")
    state.last_paused_at = last_paused_at if isinstance(last_paused_at, datetime) else None
    state.paused_duration_sec = max(0, int(session.get("paused_duration_sec") or 0))

    planned_questions = session.get("planned_questions")
    if isinstance(planned_questions, list):
        state.planned_questions = planned_questions
        state.plan_attempted = bool(planned_questions)

    if turns is not None:
        hydrate_turns(state, turns)


def runtime_timing(
    state: VoiceWsState,
    *,
    elapsed_seconds: Callable[[datetime | None], int],
) -> tuple[int, int]:
    elapsed_sec = max(0, elapsed_seconds(state.session_started_at) - max(0, int(state.paused_duration_sec or 0)))
    remaining_sec = max(0, state.target_duration_sec - elapsed_sec)
    return elapsed_sec, remaining_sec


def reconnect_remaining_sec(state: VoiceWsState) -> int:
    deadline = state.reconnect_deadline_at
    if not isinstance(deadline, datetime):
        return 0
    anchor = deadline if deadline.tzinfo else deadline.replace(tzinfo=timezone.utc)
    diff = anchor.astimezone(timezone.utc) - datetime.now(timezone.utc)
    return max(0, int(diff.total_seconds()))
