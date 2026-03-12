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
HANGUL_PATTERN = re.compile(r"[가-힣]")
DENSE_HANGUL_MIN_LENGTH = 10
SPACE_DENSITY_THRESHOLD = 0.06
AI_META_LEADING_PATTERNS = (
    re.compile(r"^\s*\*{0,2}\s*(reading the text precisely|acknowledging(?: directives| the text)?)\s*\*{0,2}\s*", re.IGNORECASE),
    re.compile(r"^\s*(i've received|i am now reading|i understand that i must|i will avoid|i will read)\b[^가-힣A-Za-z0-9]*", re.IGNORECASE),
    re.compile(r"^\s*(initiating|initializing|confirming)\s+interview\s+(protocol|setup)\b[^가-힣A-Za-z0-9]*", re.IGNORECASE),
    re.compile(r"^\s*i(?:'| a)?m now ready to start the interview process\b[^가-힣A-Za-z0-9]*", re.IGNORECASE),
    re.compile(r"^\s*i have finished the opening setup\b[^가-힣A-Za-z0-9]*", re.IGNORECASE),
    re.compile(r"^\s*\[\s*(운영 메모|실행 지시)[^\]]*\]\s*", re.IGNORECASE),
    re.compile(r"^\s*(운영 메모|실행 지시|메타 발화|지시 사항)\s*[:：]\s*", re.IGNORECASE),
)
AI_META_INLINE_PATTERNS = (
    re.compile(r"\[\s*(운영 메모|실행 지시)[^\]]*\]", re.IGNORECASE),
    re.compile(r"\*{0,2}(reading the text precisely|acknowledging(?: directives| the text)?)\*{0,2}", re.IGNORECASE),
    re.compile(r"\b(initiating interview protocol|confirming interview setup)\b", re.IGNORECASE),
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
    "initiating interview protocol",
    "confirming interview setup",
    "interview protocol",
    "interview setup",
    "opening setup",
    "start the interview process",
    "finished the opening setup",
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
KOREAN_SPACING_REPLACEMENTS = (
    (re.compile(r"AI면접관"), "AI 면접관"),
    (re.compile(r"저희회사"), "저희 회사"),
    (re.compile(r"저희팀"), "저희 팀"),
    (re.compile(r"회사서비스"), "회사 서비스"),
    (re.compile(r"서비스백엔드직무"), "서비스 백엔드 직무"),
    (re.compile(r"서비스백엔드"), "서비스 백엔드"),
    (re.compile(r"백엔드직무"), "백엔드 직무"),
    (re.compile(r"서비스백엔드개발"), "서비스 백엔드 개발"),
    (re.compile(r"지원해주셔서"), "지원해 주셔서"),
    (re.compile(r"주셔서감사합니다"), "주셔서 감사합니다"),
    (re.compile(r"지원자분께서"), "지원자분께서 "),
    (re.compile(r"지원자님께서"), "지원자님께서 "),
    (re.compile(r"지원하신"), "지원하신 "),
    (re.compile(r"지원서를바탕으로"), "지원서를 바탕으로"),
    (re.compile(r"직무에대한"), "직무에 대한"),
    (re.compile(r"경험과역량"), "경험과 역량"),
    (re.compile(r"확인하고자합니다"), "확인하고자 합니다"),
    (re.compile(r"만나뵙게되어"), "만나 뵙게 되어"),
    (re.compile(r"먼저간단히"), "먼저 간단히"),
    (re.compile(r"간단히자기소개"), "간단히 자기 소개"),
    (re.compile(r"자기소개부터부탁드립니다"), "자기소개부터 부탁드립니다"),
    (re.compile(r"소개부터부탁드립니다"), "소개부터 부탁드립니다"),
    (re.compile(r"자기소개"), "자기 소개"),
    (re.compile(r"지원동기"), "지원 동기"),
    (re.compile(r"코드리뷰"), "코드 리뷰"),
    (re.compile(r"지표기반의사결정"), "지표 기반 의사결정"),
    (re.compile(r"재처리전략"), "재처리 전략"),
    (re.compile(r"응답시간"), "응답 시간"),
    (re.compile(r"대용량트래픽"), "대용량 트래픽"),
    (re.compile(r"트래픽처리"), "트래픽 처리"),
    (re.compile(r"데이터정합성"), "데이터 정합성"),
    (re.compile(r"정합성관리"), "정합성 관리"),
    (re.compile(r"해당직무"), "해당 직무"),
    (re.compile(r"직무에지원"), "직무에 지원"),
    (re.compile(r"직무는"), "직무는 "),
    (re.compile(r"특히어떤"), "특히 어떤"),
    (re.compile(r"특히코드"), "특히 코드"),
    (re.compile(r"처리와"), "처리와 "),
    (re.compile(r"관리가"), "관리가 "),
    (re.compile(r"매우중요합니다"), "매우 중요합니다"),
    (re.compile(r"리뷰와"), "리뷰와 "),
    (re.compile(r"의사결정을"), "의사결정을 "),
    (re.compile(r"팀에맞는"), "팀에 맞는"),
    (re.compile(r"맞는경험을"), "맞는 경험을 "),
    (re.compile(r"경험을설명했습니다"), "경험을 설명했습니다"),
    (re.compile(r"전략을조정해"), "전략을 조정해"),
    (re.compile(r"로줄였습니다"), "로 줄였습니다"),
    (re.compile(r"설명해주실"), "설명해 주실"),
    (re.compile(r"주실수있을까요"), "주실 수 있을까요"),
    (re.compile(r"관련해"), "관련해 "),
    (re.compile(r"바탕으로"), "바탕으로 "),
    (re.compile(r"기반으로"), "기반으로 "),
)
KOREAN_BOUNDARY_PATTERNS = (
    (
        re.compile(r"(바탕으로|기반으로|통해|위해|대해|대한|관련해|조정해|활용해|구성해|진행해|검증해|분석해|설명해|정리해)(?=[가-힣A-Za-z0-9]{2,})"),
        r"\1 ",
    ),
    (
        re.compile(r"(합니다|했습니다|있습니다|있었고|중요합니다|필요합니다|가능합니다|어렵습니다|좋습니다|맞습니다|보입니다|보였습니다|느꼈습니다|줄였습니다|늘렸습니다)(?=[가-힣A-Za-z0-9]{2,})"),
        r"\1 ",
    ),
    (
        re.compile(r"(하는|되는|했던|하면서|했고|하고|하며)(?=[가-힣A-Za-z0-9]{2,})"),
        r"\1 ",
    ),
)


def _contains_hangul(text: str) -> bool:
    return bool(HANGUL_PATTERN.search(text or ""))


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _looks_like_meta_english_sentence(text: str) -> bool:
    lowered = re.sub(r"\s+", " ", (text or "").strip().lower())
    if not lowered or _contains_hangul(lowered):
        return False
    return any(token in lowered for token in AI_META_TOKENS)


def _should_apply_korean_spacing_heuristic(text: str) -> bool:
    normalized = _normalize_whitespace(text)
    if len(normalized) < DENSE_HANGUL_MIN_LENGTH:
        return False
    hangul_count = len(HANGUL_PATTERN.findall(normalized))
    if hangul_count < int(len(normalized) * 0.6):
        return False
    space_count = normalized.count(" ")
    return space_count == 0 or (space_count / max(1, len(normalized))) < SPACE_DENSITY_THRESHOLD


def _apply_korean_spacing_heuristic(text: str) -> str:
    formatted = _normalize_whitespace(text)
    if not formatted:
        return ""

    formatted = re.sub(r"([,.:!?])(?=\S)", r"\1 ", formatted)
    formatted = re.sub(r"([A-Za-z])([가-힣])", r"\1 \2", formatted)
    formatted = re.sub(r"([가-힣])([A-Za-z0-9])", r"\1 \2", formatted)
    formatted = re.sub(
        r"([A-Za-z0-9]+)\s+(과|와|을|를|은|는|이|가|도|만|에|의|로|에서|으로)(?=[가-힣A-Za-z0-9])",
        r"\1\2",
        formatted,
    )
    formatted = re.sub(
        r"([A-Za-z0-9]+)\s+(과|와|을|를|은|는|이|가|도|만|에|의|로|에서|으로)\s+([A-Za-z0-9가-힣])",
        r"\1\2 \3",
        formatted,
    )
    formatted = re.sub(
        r"([A-Za-z0-9]+)(응답|캐시|트래픽|서비스|백엔드|전략|시간|지표|성능)",
        r"\1 \2",
        formatted,
    )
    for pattern, replacement in KOREAN_SPACING_REPLACEMENTS:
        formatted = pattern.sub(replacement, formatted)
    for pattern, replacement in KOREAN_BOUNDARY_PATTERNS:
        formatted = pattern.sub(replacement, formatted)
        formatted = pattern.sub(replacement, formatted)

    if not _should_apply_korean_spacing_heuristic(formatted):
        return _normalize_whitespace(formatted)

    formatted = (
        formatted
        .replace("다음질문", "다음 질문")
        .replace("자기소개", "자기 소개")
        .replace("프로젝트경험", "프로젝트 경험")
        .replace("문제해결", "문제 해결")
        .replace("기술스택", "기술 스택")
        .replace("잘들었습니다", "잘 들었습니다")
        .replace("에대한", "에 대한")
        .replace("에대해", "에 대해")
        .replace("라고생각", "라고 생각")
        .replace("답변잘", "답변 잘")
        .replace("중시하는저희 팀", "중시하는 저희 팀")
    )
    formatted = re.sub(
        r"^(음|어|아|네|예|근데|근데요|그리고|그래서|그러면|일단|사실)(?=[가-힣])",
        r"\1 ",
        formatted,
    )
    formatted = re.sub(
        r"(습니다|입니다|해요|했어요|했습니다|예요|이에요|네요|거든요|아요|어요|죠)"
        r"(그리고|그래서|근데|그런데|그러면|다음|혹시|제가|저는|저희는|음|어|아|네|예)",
        r"\1 \2",
        formatted,
    )
    formatted = re.sub(
        r"(질문)(부탁드립니다|부탁드리겠습니다|주세요|해 주세요)",
        r"\1 \2",
        formatted,
    )
    formatted = re.sub(
        r"(잘 들었습니다|어렵습니다|좋습니다|괜찮습니다|감사합니다|부탁드립니다|생각합니다|같습니다)"
        r"(그리고|그래서|근데|다음|제가|저는|혹시)",
        r"\1 \2",
        formatted,
    )
    formatted = re.sub(
        r"(저는|제가|저희는|저희가)(이|그|저)(?=[가-힣])",
        r"\1 \2",
        formatted,
    )
    formatted = re.sub(
        r"(이|그|저)(프로젝트|질문|답변|문장|부분|경험|상황|내용|기술|직무|회사)(?=[가-힣]?)",
        r"\1 \2",
        formatted,
    )
    formatted = re.sub(
        r"(지원 동기|자기 소개|프로젝트 경험|문제 해결|기술 스택)(에|의|가|이|를|을|와|과|는|은)",
        r"\1 \2",
        formatted,
    )
    return _normalize_whitespace(formatted)


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
    sentence_parts = [part.strip(" -*") for part in re.split(r"(?<=[.!?])\s+", cleaned) if part.strip(" -*")]
    has_hangul_sentence = any(_contains_hangul(part) for part in sentence_parts)
    if has_hangul_sentence:
        sentence_parts = [
            part for part in sentence_parts
            if _contains_hangul(part) or not _looks_like_meta_english_sentence(part)
        ]
        cleaned = " ".join(sentence_parts).strip(" -*")
    cleaned = _apply_korean_spacing_heuristic(cleaned)

    lowered = cleaned.lower()
    if any(token in lowered for token in AI_META_TOKENS):
        return ""
    return cleaned


def sanitize_user_turn_text(text: str) -> str:
    return _apply_korean_spacing_heuristic(text)


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
    "sanitize_user_turn_text",
]
