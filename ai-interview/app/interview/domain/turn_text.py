from __future__ import annotations

import re

COMPLETE_ANSWER_ENDINGS = (
    "습니다",
    "입니다",
    "니다",
    "해요",
    "했어요",
    "했습니다",
    "합니다",
    "예요",
    "이에요",
    "네요",
    "군요",
    "죠",
    "어요",
    "아요",
)
AI_META_LEADING_PATTERNS = (
    re.compile(r"^\s*\*{0,2}\s*(reading the text precisely|acknowledging(?: directives| the text)?)\s*\*{0,2}\s*", re.IGNORECASE),
    re.compile(r"^\s*(i've received|i am now reading|i understand that i must|i will avoid|i will read)\b[^가-힣A-Za-z0-9]*", re.IGNORECASE),
    re.compile(r"^\s*\[\s*(운영 메모|실행 지시)[^\]]*\]\s*", re.IGNORECASE),
    re.compile(r"^\s*(운영 메모|실행 지시|메타 발화|지시 사항)\s*[:：]\s*", re.IGNORECASE),
)
AI_META_INLINE_PATTERNS = (
    re.compile(r"\[\s*(운영 메모|실행 지시)[^\]]*\]", re.IGNORECASE),
    re.compile(r"\*{0,2}(reading the text precisely|acknowledging(?: directives| the text)?)\*{0,2}", re.IGNORECASE),
)
AI_META_TOKENS = (
    "reading the text precisely",
    "acknowledging directives",
    "acknowledging the text",
    "i've received the korean text",
    "i am now reading",
    "i understand that i must",
    "운영 메모",
    "실행 지시",
    "절대 그대로 읽지 말 것",
    "이번 턴 우선 질문 유형",
    "최근 사용한 질문 유형",
    "직전 답변 검증 포인트",
)
QUESTION_ENDINGS = (
    "요",
    "나요",
    "까요",
    "세요",
    "드립니다",
    "말씀해 주세요",
    "설명해 주세요",
    "공유해 주세요",
    "어떻게 했나요",
)


def build_answer_quality_hint(answer: str) -> str:
    text = (answer or "").strip()
    if not text:
        return "직전 답변 없음: 기본 난이도로 질문하세요."

    length = len(text)
    has_metric = bool(re.search(r"\d+[%건명개번일월년]|\d+\s*(ms|sec|s|배)", text))
    has_structure = bool(re.search(r"(문제|원인|해결|결과|배운 점|회고|기여)", text))

    hints: list[str] = []
    if length < 60:
        hints.append("답변이 매우 짧습니다. 추가 맥락과 구체 사례를 요구하세요.")
    elif length < 140:
        hints.append("핵심은 있으나 디테일이 부족할 수 있습니다. 근거와 의사결정 기준을 캐물으세요.")
    else:
        hints.append("답변 길이는 충분합니다. 깊이와 재현 가능성을 검증하세요.")

    if not has_metric:
        hints.append("수치화된 성과나 지표를 반드시 다시 요청하세요.")
    if not has_structure:
        hints.append("문제-행동-결과 구조(STAR)에 맞춰 다시 답변하도록 유도하세요.")

    return " ".join(hints)


def sanitize_ai_turn_text(text: str) -> str:
    raw = (text or "").strip()
    if not raw:
        return ""

    cleaned = raw.replace("<verbatim>", " ").replace("</verbatim>", " ")
    cleaned = re.sub(r"```(?:json)?|```", " ", cleaned, flags=re.IGNORECASE)

    kept_lines: list[str] = []
    for line in re.split(r"[\r\n]+", cleaned):
        candidate = (line or "").strip()
        if not candidate:
            continue
        for pattern in AI_META_LEADING_PATTERNS:
            candidate = pattern.sub("", candidate, count=1).strip(" :-")
        for pattern in AI_META_INLINE_PATTERNS:
            candidate = pattern.sub(" ", candidate)
        candidate = re.sub(r"\s+", " ", candidate).strip(" -*")
        if not candidate:
            continue
        lowered = candidate.lower()
        if any(token in lowered for token in AI_META_TOKENS):
            continue
        kept_lines.append(candidate)

    cleaned = re.sub(r"\s+", " ", " ".join(kept_lines)).strip(" -*")
    lowered = cleaned.lower()
    if any(token in lowered for token in AI_META_TOKENS):
        return ""
    return cleaned


def looks_like_complete_answer(text: str) -> bool:
    normalized = (text or "").strip().rstrip("\"' ")
    if not normalized:
        return False
    if normalized[-1] in ".!?":
        return True
    return any(normalized.endswith(ending) for ending in COMPLETE_ANSWER_ENDINGS)


def looks_like_complete_ai_question(text: str) -> bool:
    normalized = (text or "").strip().rstrip("\"' ")
    if not normalized:
        return False
    if normalized[-1] in ".?!":
        return True
    return any(normalized.endswith(ending) for ending in QUESTION_ENDINGS)


__all__ = [
    "build_answer_quality_hint",
    "looks_like_complete_ai_question",
    "looks_like_complete_answer",
    "sanitize_ai_turn_text",
]
