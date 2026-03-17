from __future__ import annotations

import json
import re
from typing import Any

from app.interview.runtime.state import VoiceWsState

MEMORY_NOTE_LIMIT = 6
MEMORY_PROMPT_NOTE_LIMIT = 4
QUESTION_TYPE_LABELS = {
    "motivation_validation": "지원 동기 및 적합성 검증",
    "metric_validation": "성과 지표 검증",
    "tradeoff": "트레이드오프 판단",
    "failure_recovery": "장애/실패 복기",
    "design_decision": "설계 의사결정",
    "collaboration_conflict": "협업 갈등 해결",
    "priority_judgment": "우선순위 판단",
}
QUESTION_TYPE_ROTATION = (
    "metric_validation",
    "tradeoff",
    "failure_recovery",
    "design_decision",
    "collaboration_conflict",
    "priority_judgment",
)
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
        return "priority_judgment"

    normalized = re.sub(r"\s+", " ", (answer_text or "")).strip().lower()
    if not normalized:
        return None

    recent = set(state.recent_question_types[-2:])
    has_metric = bool(re.search(r"\d+[%건명개번일월년]|\d+\s*(ms|sec|s|배)", normalized))
    has_failure = bool(re.search(r"(실패|장애|이슈|문제|사고|rollback|에러|error|incident|트러블)", normalized))
    has_design = bool(re.search(r"(설계|구조|아키텍처|architecture|db|database|api|모듈|시스템)", normalized))
    has_collaboration = bool(re.search(r"(협업|팀|갈등|커뮤니케이션|리뷰|stakeholder|동료|조율)", normalized))
    has_priority = bool(re.search(r"(우선|priority|마감|일정|impact|리소스|순서|급한)", normalized))
    has_tradeoff = bool(re.search(r"(트레이드오프|장단점|비용|속도|안정성|복잡도|선택 기준)", normalized))

    candidates: list[str] = []
    if not has_metric:
        candidates.append("metric_validation")
    if has_failure:
        candidates.append("failure_recovery")
    if has_design:
        candidates.append("design_decision")
    if has_collaboration:
        candidates.append("collaboration_conflict")
    if has_priority:
        candidates.append("priority_judgment")
    if has_tradeoff:
        candidates.append("tradeoff")

    for candidate in candidates:
        if candidate not in recent:
            return candidate
    return candidates[0] if candidates else None


def select_next_question_type(state: VoiceWsState, *, preferred: str | None = None) -> str:
    normalized_preferred = (preferred or "").strip()
    if normalized_preferred:
        consecutive_same = 0
        for recent_type in reversed(state.recent_question_types):
            if recent_type != normalized_preferred:
                break
            consecutive_same += 1
        if consecutive_same < 2:
            return normalized_preferred

    recent = set(state.recent_question_types[-2:])

    total = len(QUESTION_TYPE_ROTATION)
    start = state.question_type_cursor % max(total, 1)
    for offset in range(total):
        candidate = QUESTION_TYPE_ROTATION[(start + offset) % total]
        if candidate not in recent:
            return candidate

    return QUESTION_TYPE_ROTATION[start]


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
    "compact_context_text",
    "compress_memory_text",
    "derive_question_type_preference",
    "extract_memory_keywords",
    "question_type_label",
    "record_question_type",
    "remember_model_turn",
    "remember_user_turn",
    "select_next_question_type",
]
