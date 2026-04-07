from __future__ import annotations

import json
import re
from typing import Any

from app.interview.domain.interview_level import InterviewLevel, normalize_interview_level, resolve_interview_level
from app.interview.runtime.state import VoiceWsState

MEMORY_NOTE_LIMIT = 6
MEMORY_PROMPT_NOTE_LIMIT = 4
QUESTION_TYPE_LABELS = {
    "motivation_validation": "지원 동기 및 적합성 검증",
    "project_context": "프로젝트 맥락 설명",
    "role_contribution": "역할 및 기여 검증",
    "implementation_detail": "구현 디테일 검증",
    "problem_solving_process": "문제 해결 과정 검증",
    "learning_reflection": "회고 및 학습 검증",
    "metric_validation": "성과 지표 검증",
    "tradeoff": "트레이드오프 판단",
    "failure_recovery": "장애/실패 복기",
    "design_decision": "설계 의사결정",
    "collaboration_conflict": "협업 갈등 해결",
    "priority_judgment": "우선순위 판단",
}
QUESTION_TYPE_ROTATION = (
    "project_context",
    "role_contribution",
    "implementation_detail",
    "problem_solving_process",
    "learning_reflection",
    "metric_validation",
    "tradeoff",
    "failure_recovery",
    "design_decision",
    "collaboration_conflict",
    "priority_judgment",
)
QUESTION_TYPE_ROTATION_BY_LEVEL: dict[InterviewLevel, dict[str, tuple[str, ...]]] = {
    "new_grad": {
        "early": (
            "project_context",
            "role_contribution",
            "implementation_detail",
            "problem_solving_process",
            "learning_reflection",
            "failure_recovery",
            "collaboration_conflict",
        ),
        "middle": (
            "role_contribution",
            "implementation_detail",
            "problem_solving_process",
            "failure_recovery",
            "learning_reflection",
            "collaboration_conflict",
            "design_decision",
            "metric_validation",
        ),
        "late": (
            "implementation_detail",
            "problem_solving_process",
            "failure_recovery",
            "learning_reflection",
            "collaboration_conflict",
            "design_decision",
            "metric_validation",
            "tradeoff",
        ),
    },
    "junior": {
        "early": (
            "role_contribution",
            "implementation_detail",
            "problem_solving_process",
            "failure_recovery",
            "learning_reflection",
            "collaboration_conflict",
            "design_decision",
        ),
        "middle": (
            "implementation_detail",
            "problem_solving_process",
            "failure_recovery",
            "design_decision",
            "collaboration_conflict",
            "learning_reflection",
            "metric_validation",
            "tradeoff",
        ),
        "late": (
            "design_decision",
            "problem_solving_process",
            "failure_recovery",
            "collaboration_conflict",
            "metric_validation",
            "tradeoff",
            "priority_judgment",
            "learning_reflection",
        ),
    },
    "mid": {
        "early": (
            "role_contribution",
            "implementation_detail",
            "design_decision",
            "problem_solving_process",
            "failure_recovery",
            "collaboration_conflict",
            "learning_reflection",
        ),
        "middle": (
            "implementation_detail",
            "design_decision",
            "problem_solving_process",
            "failure_recovery",
            "collaboration_conflict",
            "metric_validation",
            "tradeoff",
            "priority_judgment",
        ),
        "late": (
            "design_decision",
            "tradeoff",
            "metric_validation",
            "priority_judgment",
            "failure_recovery",
            "collaboration_conflict",
            "problem_solving_process",
            "learning_reflection",
        ),
    },
    "senior": {
        "early": (
            "role_contribution",
            "design_decision",
            "implementation_detail",
            "problem_solving_process",
            "collaboration_conflict",
            "priority_judgment",
        ),
        "middle": (
            "design_decision",
            "tradeoff",
            "priority_judgment",
            "metric_validation",
            "failure_recovery",
            "collaboration_conflict",
            "implementation_detail",
        ),
        "late": (
            "tradeoff",
            "priority_judgment",
            "design_decision",
            "metric_validation",
            "failure_recovery",
            "collaboration_conflict",
            "implementation_detail",
            "learning_reflection",
        ),
    },
}
QUESTION_TYPE_COOLDOWN_TYPES = {"metric_validation", "tradeoff"}
QUESTION_TYPE_REPEATABLE_TYPES = {
    "implementation_detail",
    "problem_solving_process",
    "failure_recovery",
}
QUESTION_TYPE_FAMILIES = {
    "motivation_validation": "motivation",
    "project_context": "experience_detail",
    "role_contribution": "experience_detail",
    "implementation_detail": "experience_detail",
    "problem_solving_process": "experience_detail",
    "learning_reflection": "reflection",
    "metric_validation": "decision_heavy",
    "tradeoff": "decision_heavy",
    "design_decision": "decision_heavy",
    "priority_judgment": "decision_heavy",
    "failure_recovery": "challenge",
    "collaboration_conflict": "collaboration",
}
PROJECT_CONTEXT_PATTERN = re.compile(r"(서비스|제품|플랫폼|프로젝트|기능|시스템|도메인|문제)", re.IGNORECASE)
ROLE_PATTERN = re.compile(r"(역할|담당|기여|주도|리딩|책임|맡았)", re.IGNORECASE)
IMPLEMENTATION_PATTERN = re.compile(
    r"(구현|개발|코드|로직|모듈|쿼리|api|웹소켓|백엔드|프론트|테스트|배포|캐시|redis|kafka|db|database|아키텍처)",
    re.IGNORECASE,
)
PROBLEM_SOLVING_PATTERN = re.compile(r"(문제|원인|해결|개선|조정|디버깅|최적화|병목|대응)", re.IGNORECASE)
LEARNING_PATTERN = re.compile(r"(배운|회고|아쉬|개선하고|다시|다음에는|느낀)", re.IGNORECASE)
METRIC_PATTERN = re.compile(r"\d+[%건명개번일월년]|\d+\s*(ms|sec|s|배|명|건|회|rps|tps|qps|p95|p99)", re.IGNORECASE)
METRIC_CONTEXT_PATTERN = re.compile(r"(성능|응답|지연|트래픽|처리량|최적화|latency|throughput|p95|p99|병목|scale|확장성)", re.IGNORECASE)
FAILURE_PATTERN = re.compile(r"(실패|장애|이슈|문제|사고|rollback|에러|error|incident|트러블)", re.IGNORECASE)
DESIGN_PATTERN = re.compile(r"(설계|구조|아키텍처|architecture|db|database|api|모듈|시스템|모델링)", re.IGNORECASE)
COLLABORATION_PATTERN = re.compile(r"(협업|팀|갈등|커뮤니케이션|리뷰|stakeholder|동료|조율)", re.IGNORECASE)
PRIORITY_PATTERN = re.compile(r"(우선|priority|마감|일정|impact|리소스|순서|급한)", re.IGNORECASE)
TRADEOFF_PATTERN = re.compile(r"(트레이드오프|장단점|비용|속도|안정성|복잡도|선택 기준|비교)", re.IGNORECASE)
MEMORY_STOPWORDS = {
    "그냥",
    "정도",
    "부분",
    "경우",
    "관련",
    "이번",
    "저희",
    "회사",
    "업무",
    "프로젝트",
    "문제",
    "해결",
    "결과",
    "경험",
    "이유",
    "생각",
    "부분이",
    "부분은",
    "있는",
    "있습니다",
    "합니다",
    "했던",
    "있었고",
    "그리고",
    "그래서",
    "그때",
    "이어서",
    "말씀",
    "주세요",
}


def compact_context_text(value: Any, max_chars: int = 1200) -> str:
    try:
        serialized = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    except Exception:
        serialized = str(value)
    normalized = re.sub(r"\s+", " ", serialized).strip()
    if len(normalized) <= max_chars:
        return normalized
    return f"{normalized[:max_chars]}..."


def compress_memory_text(text: str, max_chars: int = 120) -> str:
    normalized = re.sub(r"\s+", " ", (text or "")).strip()
    if not normalized:
        return ""
    clipped = normalized if len(normalized) <= max_chars else f"{normalized[:max_chars].rstrip()}..."
    sentence_parts = [piece.strip() for piece in re.split(r"(?<=[.!?])\s+", clipped) if piece.strip()]
    return sentence_parts[0] if sentence_parts else clipped


def extract_memory_keywords(text: str, *, max_items: int = 3) -> list[str]:
    tokens = re.findall(r"[0-9A-Za-z가-힣]{2,}", (text or "").lower())
    keywords: list[str] = []
    for token in tokens:
        if token in MEMORY_STOPWORDS:
            continue
        if token.isdigit():
            continue
        if token not in keywords:
            keywords.append(token)
        if len(keywords) >= max_items:
            break
    return keywords


def append_memory_note(state: VoiceWsState, note: str) -> None:
    normalized = (note or "").strip()
    if not normalized:
        return
    if state.memory_notes and state.memory_notes[-1] == normalized:
        return
    state.memory_notes.append(normalized)
    if len(state.memory_notes) > MEMORY_NOTE_LIMIT:
        state.memory_notes = state.memory_notes[-MEMORY_NOTE_LIMIT:]


def question_type_label(question_type: str | None) -> str:
    normalized = (question_type or "").strip()
    return QUESTION_TYPE_LABELS.get(normalized, normalized or "일반 심층 검증")


def resolve_state_interview_level(state: VoiceWsState) -> InterviewLevel:
    return resolve_interview_level(
        state.job_data if isinstance(state.job_data, dict) else {},
        state.resume_data,
    )


def _closing_question_preference(state: VoiceWsState) -> str:
    normalized_job_data = state.job_data if isinstance(state.job_data, dict) else {}
    explicit_level = normalize_interview_level(normalized_job_data.get("interviewLevel"), allow_auto=True)
    if explicit_level in {"new_grad", "junior"}:
        return "learning_reflection"
    if explicit_level == "auto" and state.resume_data and resolve_state_interview_level(state) in {"new_grad", "junior"}:
        return "learning_reflection"
    return "priority_judgment"


def select_opening_question_type(state: VoiceWsState) -> str:
    level = resolve_state_interview_level(state)
    if level == "new_grad":
        return "project_context"
    return "role_contribution"


def _question_stage(state: VoiceWsState) -> str:
    asked_count = len(state.recent_question_types)
    if asked_count <= 1:
        return "early"
    if asked_count <= 3:
        return "middle"
    return "late"


def _candidate_rotation(state: VoiceWsState) -> tuple[str, ...]:
    level = resolve_state_interview_level(state)
    stage = _question_stage(state)
    return QUESTION_TYPE_ROTATION_BY_LEVEL[level][stage]


def _recent_window(state: VoiceWsState, size: int) -> list[str]:
    if size <= 0:
        return []
    return state.recent_question_types[-size:]


def _cooldown_blocked(state: VoiceWsState, candidate: str) -> bool:
    recent = _recent_window(state, 4)
    if candidate in QUESTION_TYPE_COOLDOWN_TYPES and recent.count(candidate) >= 1:
        return True

    family = QUESTION_TYPE_FAMILIES.get(candidate, "")
    if family == "decision_heavy":
        recent_decision_heavy = sum(
            1 for question_type in _recent_window(state, 2)
            if QUESTION_TYPE_FAMILIES.get(question_type) == "decision_heavy"
        )
        if recent_decision_heavy >= 1:
            return True
    if family == "experience_detail":
        recent_experience_detail = sum(
            1 for question_type in _recent_window(state, 2)
            if QUESTION_TYPE_FAMILIES.get(question_type) == "experience_detail"
        )
        if recent_experience_detail >= 2:
            return True
    return False


def _can_repeat_followup(state: VoiceWsState, candidate: str) -> bool:
    if candidate not in QUESTION_TYPE_REPEATABLE_TYPES:
        return False
    if _question_stage(state) != "early":
        return False
    if len(state.recent_question_types) > 2:
        return False
    consecutive = 0
    for recent_type in reversed(state.recent_question_types):
        if recent_type != candidate:
            break
        consecutive += 1
    return consecutive < 2


def can_repeat_followup_question_type(state: VoiceWsState, question_type: str | None) -> bool:
    normalized = (question_type or "").strip()
    if not normalized:
        return False
    return _can_repeat_followup(state, normalized)


def _is_question_type_allowed(state: VoiceWsState, candidate: str, *, preferred: bool = False) -> bool:
    stage = _question_stage(state)
    allowed = _candidate_rotation(state)
    if candidate not in allowed and candidate not in QUESTION_TYPE_ROTATION:
        return False
    if stage == "early" and candidate in {"metric_validation", "tradeoff", "priority_judgment"}:
        return False
    if _cooldown_blocked(state, candidate):
        return False
    if state.recent_question_types and state.recent_question_types[-1] == candidate:
        return preferred and _can_repeat_followup(state, candidate)
    return True


def _default_question_candidates(state: VoiceWsState) -> list[str]:
    return list(_candidate_rotation(state)) + list(QUESTION_TYPE_ROTATION)


def _ranked_preference_candidates(state: VoiceWsState, answer_text: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", (answer_text or "")).strip().lower()
    stage = _question_stage(state)
    level = resolve_state_interview_level(state)
    scores: dict[str, int] = {question_type: 0 for question_type in QUESTION_TYPE_ROTATION}

    has_metric = bool(METRIC_PATTERN.search(normalized))
    has_metric_context = bool(METRIC_CONTEXT_PATTERN.search(normalized))
    has_failure = bool(FAILURE_PATTERN.search(normalized))
    has_design = bool(DESIGN_PATTERN.search(normalized))
    has_collaboration = bool(COLLABORATION_PATTERN.search(normalized))
    has_priority = bool(PRIORITY_PATTERN.search(normalized))
    has_tradeoff = bool(TRADEOFF_PATTERN.search(normalized))
    has_role = bool(ROLE_PATTERN.search(normalized))
    has_project_context = bool(PROJECT_CONTEXT_PATTERN.search(normalized))
    has_implementation = bool(IMPLEMENTATION_PATTERN.search(normalized))
    has_problem_solving = bool(PROBLEM_SOLVING_PATTERN.search(normalized))
    has_learning = bool(LEARNING_PATTERN.search(normalized))

    if has_project_context:
        scores["project_context"] += 4
    if has_role:
        scores["role_contribution"] += 7
    if has_implementation:
        scores["implementation_detail"] += 8
    if has_problem_solving:
        scores["problem_solving_process"] += 7
    if has_learning:
        scores["learning_reflection"] += 6
    if has_failure:
        scores["failure_recovery"] += 13
        scores["problem_solving_process"] += 4
    if has_design:
        scores["design_decision"] += 8
    if has_collaboration:
        scores["collaboration_conflict"] += 9
    if has_priority:
        scores["priority_judgment"] += 9
    if has_tradeoff:
        scores["tradeoff"] += 9
        scores["design_decision"] += 3
    else:
        scores["tradeoff"] -= 3
    if has_metric:
        scores["metric_validation"] += 12 if has_metric_context else 9
    elif has_metric_context and stage == "late" and level in {"mid", "senior"}:
        scores["metric_validation"] += 3
    else:
        scores["metric_validation"] -= 3

    if stage == "early":
        scores["project_context"] += 3
        scores["role_contribution"] += 4
        scores["implementation_detail"] += 2
        scores["metric_validation"] -= 8
        scores["tradeoff"] -= 8
        scores["design_decision"] -= 3
        scores["priority_judgment"] -= 4
    elif stage == "middle":
        scores["problem_solving_process"] += 2
        scores["failure_recovery"] += 2
        scores["metric_validation"] -= 2
        scores["tradeoff"] -= 2
        scores["priority_judgment"] -= 1
    else:
        scores["metric_validation"] += 1 if level in {"mid", "senior"} else 0
        scores["tradeoff"] += 1 if level in {"mid", "senior"} else 0

    if level == "new_grad":
        scores["priority_judgment"] -= 5
        scores["tradeoff"] -= 4
        scores["metric_validation"] -= 2
    elif level == "junior":
        scores["priority_judgment"] -= 3
        scores["tradeoff"] -= 2

    rotation_index = {name: index for index, name in enumerate(_default_question_candidates(state))}
    ranked = sorted(
        scores.items(),
        key=lambda item: (-item[1], rotation_index.get(item[0], 999)),
    )
    return [candidate for candidate, score in ranked if score > 0]


def remember_user_turn(state: VoiceWsState, text: str) -> None:
    summary = compress_memory_text(text, max_chars=110)
    if not summary:
        return
    keywords = extract_memory_keywords(text)
    note = f"지원자 답변: {summary}"
    if keywords:
        note = f"{note} | 키워드: {', '.join(keywords)}"
    state.last_user_memory = note
    append_memory_note(state, note)


def remember_model_turn(state: VoiceWsState, text: str, *, question_type: str | None = None) -> None:
    summary = compress_memory_text(text, max_chars=110)
    if not summary:
        return
    label = question_type_label(question_type) if question_type else "일반 심층 검증"
    note = f"최근 질문({label}): {summary}"
    state.last_model_memory = note
    append_memory_note(state, note)


def build_memory_snapshot(state: VoiceWsState, *, max_chars: int = 420) -> str:
    notes: list[str] = []
    if state.last_model_memory:
        notes.append(state.last_model_memory)
    if state.last_user_memory:
        notes.append(state.last_user_memory)
    for note in state.memory_notes[-MEMORY_PROMPT_NOTE_LIMIT:]:
        if note not in notes:
            notes.append(note)
    if not notes:
        return ""

    joined = " / ".join(notes[-MEMORY_PROMPT_NOTE_LIMIT:])
    if len(joined) <= max_chars:
        return joined
    return f"{joined[:max_chars].rstrip()}..."


def derive_question_type_preference(
    state: VoiceWsState,
    answer_text: str,
    is_closing: bool = False,
) -> str | None:
    if is_closing:
        return _closing_question_preference(state)

    normalized = re.sub(r"\s+", " ", (answer_text or "")).strip().lower()
    if not normalized:
        return None

    for candidate in _ranked_preference_candidates(state, normalized):
        if _is_question_type_allowed(state, candidate, preferred=True):
            return candidate
    return None


def select_question_strategy(
    state: VoiceWsState,
    answer_text: str,
    *,
    is_closing: bool = False,
) -> tuple[str, str]:
    normalized_answer = re.sub(r"\s+", " ", (answer_text or "")).strip()
    if is_closing:
        return "transition", select_next_question_type(state, preferred=_closing_question_preference(state))

    if not normalized_answer:
        retry_type = (state.recent_question_types[-1] if state.recent_question_types else "").strip()
        return "retry", retry_type or "motivation_validation"

    preferred = derive_question_type_preference(state, normalized_answer, False)
    last_type = (state.recent_question_types[-1] if state.recent_question_types else "").strip()

    if preferred and preferred != last_type:
        return "followup", preferred

    if preferred and preferred == last_type:
        if _can_repeat_followup(state, preferred):
            return "followup", preferred
        return "transition", select_next_question_type(state)

    if not last_type:
        return "followup", select_next_question_type(state, preferred="motivation_validation")

    return "transition", select_next_question_type(state, preferred=preferred)


def select_next_question_type(state: VoiceWsState, *, preferred: str | None = None) -> str:
    normalized_preferred = (preferred or "").strip()
    if normalized_preferred:
        if _is_question_type_allowed(state, normalized_preferred, preferred=True):
            return normalized_preferred

    candidates = _default_question_candidates(state)
    total = len(candidates)
    start = state.question_type_cursor % max(total, 1)
    for offset in range(total):
        candidate = candidates[(start + offset) % total]
        if _is_question_type_allowed(state, candidate):
            return candidate

    return candidates[start]


def record_question_type(state: VoiceWsState, question_type: str | None) -> None:
    normalized = (question_type or "").strip()
    if not normalized:
        return
    state.recent_question_types.append(normalized)
    if len(state.recent_question_types) > 5:
        state.recent_question_types = state.recent_question_types[-5:]
    if normalized in QUESTION_TYPE_ROTATION:
        idx = QUESTION_TYPE_ROTATION.index(normalized)
        state.question_type_cursor = (idx + 1) % len(QUESTION_TYPE_ROTATION)


__all__ = [
    "append_memory_note",
    "build_memory_snapshot",
    "can_repeat_followup_question_type",
    "compact_context_text",
    "compress_memory_text",
    "derive_question_type_preference",
    "extract_memory_keywords",
    "question_type_label",
    "record_question_type",
    "remember_model_turn",
    "remember_user_turn",
    "resolve_state_interview_level",
    "select_opening_question_type",
    "select_question_strategy",
    "select_next_question_type",
]
