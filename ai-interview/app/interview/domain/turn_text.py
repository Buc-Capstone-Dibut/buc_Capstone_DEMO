from __future__ import annotations

import hashlib
import re
from typing import Any

from app.interview.domain.interview_level import InterviewLevel, resolve_interview_level

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
SPACE_DENSITY_THRESHOLD = 0.03
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
QUESTION_TEXT_TEMPLATES: dict[str, dict[str, str]] = {
    "motivation_validation": {
        "soft": "{focus_phrase} 경험이 이번 직무와 가장 맞닿아 있다고 판단하신 이유는 무엇인가요?",
        "hard": "{focus_phrase} 경험이 이번 직무와 직접적으로 이어진다고 보신 근거를 조금 더 분명하게 말씀해 주실 수 있을까요?",
    },
    "project_context": {
        "soft": "{focus_phrase}가 어떤 문제를 풀기 위한 프로젝트였는지 먼저 설명해 주실 수 있을까요?",
        "hard": "{focus_phrase}가 해결하려던 문제와 프로젝트 목표를 먼저 정리해 주실 수 있을까요?",
    },
    "role_contribution": {
        "soft": "{focus_phrase}에서 본인이 맡았던 역할과 직접 기여한 부분을 중심으로 말씀해 주실 수 있을까요?",
        "hard": "{focus_phrase}에서 본인이 책임졌던 범위와 실제 의사결정에 관여한 지점을 구체적으로 말씀해 주실 수 있을까요?",
    },
    "implementation_detail": {
        "soft": "{focus_phrase}를 구현하실 때 실제로 어떻게 풀어가셨는지 설명해 주실 수 있을까요?",
        "hard": "{focus_phrase}를 구현할 때 핵심 로직이나 구조를 어떤 식으로 나눠 설계했는지 구체적으로 말씀해 주실 수 있을까요?",
    },
    "problem_solving_process": {
        "soft": "{focus_phrase}를 진행하면서 어떤 문제를 발견했고, 어떤 순서로 해결하셨는지 말씀해 주실 수 있을까요?",
        "hard": "{focus_phrase}에서 문제가 생겼을 때 원인을 어떻게 좁혀 갔고, 어떤 기준으로 해결 방향을 정하셨는지 설명해 주실 수 있을까요?",
    },
    "learning_reflection": {
        "soft": "{focus_phrase}를 통해 본인이 가장 크게 배운 점은 무엇이었나요?",
        "hard": "{focus_phrase}를 다시 진행한다면 다르게 가져갈 판단이나 개선 포인트는 무엇일까요?",
    },
    "metric_validation": {
        "soft": "{focus_phrase}의 성과를 어떻게 확인하셨는지 말씀해 주실 수 있을까요?",
        "hard": "{focus_phrase}에서 어떤 수치나 지표를 기준으로 성과를 검증하셨나요?",
    },
    "tradeoff": {
        "soft": "{focus_phrase}에서 왜 그 방식을 선택하셨는지 설명해 주실 수 있을까요?",
        "hard": "{focus_phrase}를 진행할 때 어떤 선택지를 비교했고 무엇을 기준으로 결정하셨나요?",
    },
    "failure_recovery": {
        "soft": "{focus_phrase}에서 가장 어려웠던 문제를 어떻게 해결하셨는지 말씀해 주실 수 있을까요?",
        "hard": "{focus_phrase}에서 가장 큰 문제나 장애가 생겼을 때 어떻게 복구하셨나요?",
    },
    "design_decision": {
        "soft": "{focus_phrase}와 관련해, 핵심 설계 결정을 어떻게 내리셨나요?",
        "hard": "{focus_phrase}와 관련해, 대안들과 비교했을 때 왜 그 설계를 채택했는지 설명해 주실 수 있을까요?",
    },
    "collaboration_conflict": {
        "soft": "{focus_phrase}를 진행하면서 협업상 조율이 필요했던 순간을 어떻게 해결하셨나요?",
        "hard": "{focus_phrase}를 진행하면서 의견이 갈렸던 지점이 있다면, 어떤 기준으로 합의를 이끌어 내셨나요?",
    },
    "priority_judgment": {
        "soft": "{focus_phrase}에서 무엇을 우선순위로 두고 판단하셨나요?",
        "hard": "{focus_phrase}에서 일정, 품질, 구현 범위가 충돌했을 때 무엇을 우선순위로 두고 판단하셨나요?",
    },
}
FOCUS_KEYWORD_STOPWORDS = {
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
ALLOWED_SHORT_ASCII_TRANSCRIPT_TOKENS = {
    "ai",
    "api",
    "aws",
    "sql",
    "ttl",
    "sse",
    "rpc",
    "db",
    "ui",
    "ux",
    "cpu",
    "gpu",
    "cdn",
    "http",
    "https",
    "tcp",
    "udp",
    "jvm",
    "kpi",
    "rps",
    "tps",
    "ws",
    "ci",
    "cd",
    "ms",
}
OPENING_VARIANT_SEED_SALT = "opening-v2"
QUESTION_INTENT_PATTERNS = (
    re.compile(r"(말씀|설명|공유|정리|답변)해\s*주(?:세요|실\s*수\s*있을까요|시겠습니까)", re.IGNORECASE),
    re.compile(r"(어떤|어떻게|왜|무엇|얼마나|어느 정도|구체적으로)\b"),
    re.compile(r"(역할|경험|사례|근거|이유|과정|문제|장애|지표|수치)\s*(을|를|이|가)?\s*.*(말씀|설명|공유)", re.IGNORECASE),
    re.compile(r"\?$"),
)
KOREAN_SPACING_REPLACEMENTS = (
    (re.compile(r"AI면접관"), "AI 면접관"),
    (re.compile(r"세션별상태"), "세션별 상태"),
    (re.compile(r"상태를가볍게"), "상태를 가볍게"),
    (re.compile(r"상태를가\s*볍게"), "상태를 가볍게"),
    (re.compile(r"가볍게유지하고"), "가볍게 유지하고"),
    (re.compile(r"가볍게\s*유지\s*하고"), "가볍게 유지하고"),
    (re.compile(r"이벤트처리"), "이벤트 처리"),
    (re.compile(r"처리비동기로"), "처리 비동기로"),
    (re.compile(r"비동기로분"), "비동기로 분"),
    (re.compile(r"분했으며서버"), "분했으며 서버"),
    (re.compile(r"서버인스턴"), "서버 인스턴"),
    (re.compile(r"서버인\s*스턴"), "서버 인스턴"),
    (re.compile(r"인스턴나눠"), "인스턴 나눠"),
    (re.compile(r"나눠연결"), "나눠 연결"),
    (re.compile(r"나눠\s*연결"), "나눠 연결"),
    (re.compile(r"시키는방식으로"), "시키는 방식으로"),
    (re.compile(r"시키\s*는방식"), "시키는 방식"),
    (re.compile(r"방식으로병목"), "방식으로 병목"),
    (re.compile(r"병목줄여"), "병목 줄여"),
    (re.compile(r"줄여수십명접속"), "줄여 수십명 접속"),
    (re.compile(r"끊김없"), "끊김 없"),
    (re.compile(r"끊김 없안정적으로"), "끊김 없이 안정적으로"),
    (re.compile(r"안정적으로운영"), "안정적으로 운영"),
    (re.compile(r"운\s*영했습니다"), "운영했습니다"),
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
        re.compile(
            r"(을|를|이|가|은|는|과|와|도|만|에|에서|로|으로)"
            r"(?=(비교|선택|설명|진행|구현|분석|정리|설계|검증|개선|적용|도입|확인|사용|처리|구축|운영|말씀|공유|도출|판단|조정|관리|요청|응답|생성|전달|보고|측정|줄였|늘렸|해결|복구|정의|학습|배포|분리|결정|마무리|작성|수립|기록|모니터링))"
        ),
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
USER_TECHNICAL_RECOVERY_PATTERNS = (
    (re.compile(r"웹\s*소켓", re.IGNORECASE), "웹소켓"),
    (re.compile(r"실\s*시간"), "실시간"),
    (re.compile(r"백\s*엔드"), "백엔드"),
    (re.compile(r"AI\s*면접서\s*비스", re.IGNORECASE), "AI 면접 서비스"),
    (re.compile(r"면접서\s*비스"), "면접 서비스"),
    (re.compile(r"회사서\s*비스"), "회사 서비스"),
    (re.compile(r"서비스\s*를개발"), "서비스를 개발"),
    (re.compile(r"서비스\s*를\s*개발"), "서비스를 개발"),
    (re.compile(r"개발하며웹소켓"), "개발하며 웹소켓"),
    (re.compile(r"웹소켓기반"), "웹소켓 기반"),
    (re.compile(r"기반통신"), "기반 통신"),
    (re.compile(r"\bP\s*I(?=\s*(구조|설계|명세|엔드포인트|게이트웨이|통신|를|가|는|도|와|과))", re.IGNORECASE), "API"),
    (re.compile(r"API구조설계", re.IGNORECASE), "API 구조 설계"),
    (re.compile(r"구조설계"), "구조 설계"),
    (re.compile(r"통신과백엔드"), "통신과 백엔드"),
    (re.compile(r"동요청"), "동시 요청"),
    (re.compile(r"요청을안정적으로"), "요청을 안정적으로"),
    (re.compile(r"안정\s*적으로"), "안정적으로"),
    (re.compile(r"처리\s*하는"), "처리하는"),
    (re.compile(r"스템(?=\s*(구현|구축|운영|현한|현)\b)"), "시스템"),
    (re.compile(r"시스템\s*현한"), "시스템 구현한"),
    (re.compile(r"경험\s+이\s+있습니다"), "경험이 있습니다"),
)


def _contains_hangul(text: str) -> bool:
    return bool(HANGUL_PATTERN.search(text or ""))


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _collapse_fragmented_transcript_tokens(text: str) -> str:
    normalized = _normalize_whitespace(text)
    if not normalized:
        return ""

    tokens = normalized.split(" ")
    if len(tokens) < 4:
        return normalized

    single_token_count = sum(1 for token in tokens if re.fullmatch(r"[0-9A-Za-z가-힣]", token or ""))
    if single_token_count < max(4, int(len(tokens) * 0.6)):
        return normalized

    collapsed: list[str] = []
    fragment_buffer: list[str] = []
    for token in tokens:
        if re.fullmatch(r"[0-9A-Za-z가-힣]", token or ""):
            fragment_buffer.append(token)
            continue
        if fragment_buffer:
            collapsed.append("".join(fragment_buffer))
            fragment_buffer.clear()
        collapsed.append(token)
    if fragment_buffer:
        collapsed.append("".join(fragment_buffer))

    return " ".join(collapsed).strip()


def _should_recompact_fragmented_tokens(text: str) -> bool:
    normalized = _normalize_whitespace(text)
    if not normalized:
        return False

    tokens = normalized.split(" ")
    if len(tokens) < 5:
        return False

    compact_lengths = [
        len(re.sub(r"[^0-9A-Za-z가-힣]", "", token))
        for token in tokens
    ]
    short_token_count = sum(1 for length in compact_lengths if 0 < length <= 2)
    single_token_count = sum(1 for length in compact_lengths if length == 1)
    return short_token_count >= max(4, int(len(tokens) * 0.45)) or single_token_count >= 3


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
    formatted = _collapse_fragmented_transcript_tokens(text)
    if not formatted:
        return ""

    formatted = re.sub(r"([,.:!?])(?=\S)", r"\1 ", formatted)
    formatted = re.sub(r"([A-Za-z0-9]+)([가-힣])", r"\1 \2", formatted)
    formatted = re.sub(r"([가-힣])([A-Za-z0-9]+)", r"\1 \2", formatted)
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


def _apply_user_transcript_cleanup(text: str) -> str:
    formatted = _collapse_fragmented_transcript_tokens(text)
    if not formatted:
        return ""

    formatted = re.sub(r"([,.:!?])(?=\S)", r"\1 ", formatted)
    formatted = re.sub(r"([A-Za-z0-9]+)([가-힣])", r"\1 \2", formatted)
    formatted = re.sub(r"([가-힣])([A-Za-z0-9]+)", r"\1 \2", formatted)
    formatted = re.sub(r"\b([A-Za-z])\s+([A-Za-z])\b", r"\1\2", formatted)
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
    for pattern, replacement in USER_TECHNICAL_RECOVERY_PATTERNS:
        formatted = pattern.sub(replacement, formatted)
    for pattern, replacement in KOREAN_SPACING_REPLACEMENTS:
        formatted = pattern.sub(replacement, formatted)
    for pattern, replacement in KOREAN_BOUNDARY_PATTERNS:
        formatted = pattern.sub(replacement, formatted)
        formatted = pattern.sub(replacement, formatted)
    formatted = re.sub(
        r"(습니다|입니다|해요|했어요|했습니다|예요|이에요|네요|거든요|아요|어요|죠)"
        r"(그리고|그래서|근데|그런데|그러면|다음|혹시|제가|저는|저희는|음|어|아|네|예)",
        r"\1 \2",
        formatted,
    )
    formatted = re.sub(
        r"(하는|되는|했던|하면서|했고|하고|하며)(?=[가-힣A-Za-z0-9]{2,})",
        r"\1 ",
        formatted,
    )
    formatted = re.sub(r"\s+", " ", formatted).strip()
    if _should_recompact_fragmented_tokens(formatted):
        recompacted = _apply_korean_spacing_heuristic(formatted)
        if recompacted:
            formatted = recompacted
    return formatted


def build_answer_quality_hint(answer: str) -> str:
    text = (answer or "").strip()
    if not text:
        return "직전 답변 없음: 기본 난이도로 질문하세요."

    length = len(text)
    has_metric = bool(re.search(r"\d+[%건명개번일월년]|\d+\s*(ms|sec|s|배)", text))
    has_structure = bool(re.search(r"(문제|원인|해결|결과|배운 점|회고|기여)", text))

    hints: list[str] = []
    if length < 60:
        hints.append("답변이 짧을 수 있습니다. 다음 질문에서 추가 맥락과 구체 사례를 자연스럽게 확인하세요.")
    elif length < 140:
        hints.append("핵심은 있으나 디테일이 부족할 수 있습니다. 다음 질문에서 근거와 의사결정 기준을 검증하세요.")
    else:
        hints.append("답변 길이는 충분합니다. 깊이와 재현 가능성을 검증하세요.")

    if not has_metric:
        hints.append("가능하면 다음 질문에서 수치화된 성과나 지표를 확인하세요.")
    if not has_structure:
        hints.append("다음 질문은 문제-행동-결과 구조가 드러나도록 구체 상황을 확인하는 방향으로 이어가세요.")

    return " ".join(hints)


def _extract_focus_keywords(text: str, *, max_items: int = 8) -> list[str]:
    tokens = re.findall(r"[0-9A-Za-z가-힣]{2,}", (text or "").lower())
    keywords: list[str] = []
    for token in tokens:
        if token in FOCUS_KEYWORD_STOPWORDS:
            continue
        if token.isdigit():
            continue
        if token not in keywords:
            keywords.append(token)
        if len(keywords) >= max_items:
            break
    return keywords


def _normalize_focus_keyword(token: str) -> str:
    normalized = re.sub(r"(과|와|을|를|이|가|은|는|에|에서|로|으로|도|만)$", "", (token or "").strip())
    return normalized or (token or "").strip()


def _build_focus_phrase(user_text: str, *, session_type: str) -> str:
    raw_keywords = [
        _normalize_focus_keyword(keyword)
        for keyword in _extract_focus_keywords(user_text, max_items=8)
    ]
    keywords: list[str] = []
    metric_keywords = [keyword for keyword in raw_keywords if re.search(r"[0-9]", keyword)]
    for keyword in metric_keywords + raw_keywords:
        if keyword and keyword not in keywords:
            keywords.append(keyword)
        if len(keywords) >= 2:
            break
    if keywords:
        if len(keywords) == 1:
            return f"방금 말씀하신 {keywords[0]}"
        return f"방금 말씀하신 {keywords[0]}와 {keywords[1]}"
    if session_type == "portfolio_defense":
        return "방금 설명하신 프로젝트"
    return "방금 말씀하신 경험"


def _to_string_list(value: Any) -> list[str]:
    if isinstance(value, str):
        normalized = value.strip()
        return [normalized] if normalized else []
    if isinstance(value, (list, tuple, set)):
        result: list[str] = []
        for item in value:
            normalized = str(item or "").strip()
            if normalized:
                result.append(normalized)
        return result
    return []


def _normalize_opening_focus_term(value: str) -> str:
    normalized = re.sub(r"\s+", " ", (value or "").strip())
    normalized = re.sub(r"[\"'()\\[\\]{}]+", "", normalized)
    normalized = normalized.strip(" ,.:;/-")
    if not normalized or len(normalized) > 24:
        return ""
    if normalized.lower() in {"backend", "frontend", "fullstack", "developer", "engineer"}:
        return ""
    return normalized


def _extract_opening_focus_term(
    *,
    job_data: dict[str, Any] | None = None,
    resume_data: Any = None,
) -> str:
    normalized_job_data = job_data if isinstance(job_data, dict) else {}
    candidates: list[str] = []
    for key in ("techStack", "tech_stack", "requirements", "skills"):
        candidates.extend(_to_string_list(normalized_job_data.get(key)))

    if isinstance(resume_data, dict):
        for key in ("skills", "techStack", "tech_stack"):
            candidates.extend(_to_string_list(resume_data.get(key)))

    for raw in candidates:
        normalized = _normalize_opening_focus_term(raw)
        if normalized:
            return normalized
    return ""


def _opening_variant_index(seed_text: str, variant_count: int) -> int:
    if variant_count <= 1:
        return 0
    digest = hashlib.sha1(f"{OPENING_VARIANT_SEED_SALT}:{seed_text}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % variant_count


def build_opening_turn_text(
    *,
    session_type: str,
    company: str = "",
    role: str = "",
    job_data: dict[str, Any] | None = None,
    resume_data: Any = None,
    interview_level: str | None = None,
    seed_text: str = "",
) -> str:
    normalized_company = (company or "").strip()
    normalized_role = (role or "").strip()
    context_target = " ".join(part for part in (normalized_company, normalized_role) if part).strip()
    role_target = normalized_role or "이번 직무"
    focus_term = _extract_opening_focus_term(job_data=job_data, resume_data=resume_data)
    effective_level = _normalize_interview_level_for_prompt(interview_level, job_data=job_data, resume_data=resume_data)
    variant_seed = seed_text or "|".join(
        (
            session_type,
            normalized_company,
            normalized_role,
            focus_term,
            effective_level,
        )
    )
    if session_type == "portfolio_defense":
        variants = (
            "안녕하세요. 포트폴리오에서 본인이 가장 주도적으로 설계하거나 구현한 부분을 먼저 설명해 주실 수 있을까요?",
            "안녕하세요. 포트폴리오 중에서 이번 면접과 가장 직접적으로 연결된 프로젝트 한 가지를 골라 설명해 주실 수 있을까요?",
            "안녕하세요. 포트폴리오에서 본인 기여가 가장 선명하게 드러나는 대표 프로젝트를 먼저 말씀해 주실 수 있을까요?",
        )
        return variants[_opening_variant_index(variant_seed, len(variants))]

    if effective_level == "new_grad":
        variants = [
            f"안녕하세요. {context_target or '이번 직무'}와 가장 직접적으로 연결되는 프로젝트 경험 한 가지를 먼저 말씀해 주실 수 있을까요?",
            f"안녕하세요. 지금까지 경험 중에서 {role_target}와 가장 맞닿아 있던 프로젝트 하나를 골라, 어떤 문제를 풀었는지와 본인 역할을 함께 설명해 주실 수 있을까요?",
            f"안녕하세요. {role_target}에 지원하시면서 가장 대표적으로 보여주고 싶은 프로젝트 경험 한 가지를 먼저 말씀해 주실 수 있을까요?",
        ]
    elif effective_level == "junior":
        variants = [
            f"안녕하세요. {context_target or '이번 직무'}와 가장 직접적으로 연결되는 프로젝트 경험 한 가지를 먼저 말씀해 주실 수 있을까요?",
            f"안녕하세요. {role_target}와 가장 가까웠던 프로젝트 하나를 골라, 본인 기여와 구현 포인트 중심으로 설명해 주실 수 있을까요?",
            f"안녕하세요. {role_target}에 지원하시면서 가장 대표적으로 보여주고 싶은 프로젝트 경험 한 가지를 먼저 말씀해 주실 수 있을까요?",
        ]
    elif effective_level == "mid":
        variants = [
            f"안녕하세요. {role_target}와 가장 직접적으로 연결되는 프로젝트 하나를 골라, 본인 기여와 핵심 설계 판단을 함께 말씀해 주실 수 있을까요?",
            f"안녕하세요. 지금까지 경험 중에서 {role_target}와 가장 맞닿아 있던 프로젝트 하나를 골라, 어떤 판단을 주도했는지 중심으로 설명해 주실 수 있을까요?",
            f"안녕하세요. {role_target}에 지원하시면서 가장 대표적으로 보여주고 싶은 프로젝트 경험 한 가지를 먼저 말씀해 주실 수 있을까요?",
        ]
    else:
        variants = [
            f"안녕하세요. {role_target}와 가장 직접적으로 연결되는 프로젝트 하나를 골라, 본인이 주도한 핵심 의사결정과 영향 범위를 함께 말씀해 주실 수 있을까요?",
            f"안녕하세요. 지금까지 경험 중에서 {role_target}와 가장 맞닿아 있던 프로젝트 하나를 골라, 어떤 문제를 어떻게 판단하며 풀었는지 중심으로 설명해 주실 수 있을까요?",
            f"안녕하세요. {role_target}에 지원하시면서 가장 대표적으로 보여주고 싶은 프로젝트 경험 한 가지를 먼저 말씀해 주실 수 있을까요?",
        ]
    if focus_term:
        variants.append(
            f"안녕하세요. {role_target}와 관련해 특히 {focus_term} 활용 경험이 있다면, 가장 대표적인 프로젝트 한 가지를 말씀해 주실 수 있을까요?"
        )
    return variants[_opening_variant_index(variant_seed, len(variants))]


def build_retry_question_text(user_text: str = "") -> str:
    focus_phrase = _build_focus_phrase(user_text, session_type="live_interview") if user_text.strip() else "방금 말씀하신 내용"
    return f"답변이 잘 들리지 않았습니다. {focus_phrase}과 관련된 내용을 한 번만 다시 말씀해 주실 수 있을까요?"


def compose_ai_question_text(
    *,
    user_text: str,
    question_type: str | None,
    strategy: str,
    session_type: str,
    interview_level: str | None = None,
    question_index: int = 1,
    job_data: dict[str, Any] | None = None,
    resume_data: Any = None,
) -> str:
    normalized_strategy = (strategy or "").strip() or "transition"
    normalized_type = (question_type or "").strip() or "metric_validation"
    effective_level = _normalize_interview_level_for_prompt(
        interview_level,
        job_data=job_data,
        resume_data=resume_data,
    )

    if normalized_strategy == "retry":
        return build_retry_question_text(user_text)

    if session_type == "portfolio_defense":
        focus_phrase = _build_focus_phrase(user_text, session_type=session_type)
        if normalized_type == "metric_validation":
            return f"{focus_phrase}에서 어떤 지표나 사용자 반응으로 성과를 검증하셨나요?"
        if normalized_type == "tradeoff":
            return f"{focus_phrase}를 진행할 때 어떤 선택지를 비교했고 무엇을 기준으로 결정하셨나요?"
        if normalized_type == "failure_recovery":
            return f"{focus_phrase}에서 가장 큰 문제나 장애가 생겼을 때 어떻게 복구하셨나요?"
        return f"{focus_phrase}에서 본인이 가장 크게 기여한 설계 판단은 무엇이었나요?"

    focus_phrase = _build_focus_phrase(user_text, session_type=session_type)
    template = QUESTION_TEXT_TEMPLATES.get(
        normalized_type,
        {
            "soft": "{focus_phrase}에서 가장 중요했던 판단 기준을 설명해 주실 수 있을까요?",
            "hard": "{focus_phrase}에서 가장 중요했던 판단 기준을 구체적으로 말씀해 주실 수 있을까요?",
        },
    )
    variant = "hard" if _should_use_hard_question_variant(
        effective_level,
        question_type=normalized_type,
        question_index=question_index,
    ) else "soft"
    question = template.get(variant, template.get("soft", "")).format(focus_phrase=focus_phrase).strip()
    if question.endswith("?"):
        return question
    if question.endswith(("주세요", "주실 수 있을까요", "주실 수 있나요", "말씀해 주실 수 있을까요")):
        return f"{question}?"
    return question


def _normalize_interview_level_for_prompt(
    interview_level: str | None,
    *,
    job_data: dict[str, Any] | None = None,
    resume_data: Any = None,
) -> InterviewLevel:
    return resolve_interview_level(
        {
            **(job_data if isinstance(job_data, dict) else {}),
            "interviewLevel": interview_level or (job_data.get("interviewLevel") if isinstance(job_data, dict) else ""),
        },
        resume_data,
    )


def _should_use_hard_question_variant(
    interview_level: InterviewLevel,
    *,
    question_type: str,
    question_index: int,
) -> bool:
    if question_type in {"project_context", "role_contribution", "implementation_detail", "problem_solving_process", "learning_reflection"}:
        return False
    if interview_level in {"new_grad", "junior"}:
        return False
    if interview_level == "mid":
        return question_type in {"metric_validation", "tradeoff", "design_decision", "priority_judgment"} and question_index >= 5
    return question_type in {"metric_validation", "tradeoff", "design_decision", "priority_judgment", "collaboration_conflict"} and question_index >= 4


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
    return _apply_user_transcript_cleanup(text)


def _compact_transcript_length(text: str) -> int:
    return len(re.findall(r"[0-9A-Za-z가-힣]", text or ""))


def score_user_transcript_text(text: str) -> int:
    normalized = sanitize_user_turn_text(text)
    if not normalized:
        return 0

    compact_len = _compact_transcript_length(normalized)
    hangul_bonus = 40 if _contains_hangul(normalized) else 0
    complete_bonus = 30 if looks_like_complete_answer(normalized) else 0
    space_bonus = min(48, normalized.count(" ") * 4)

    suspicious_short_ascii_tokens = [
        token
        for token in re.findall(r"\b[A-Za-z]{1,3}\b", normalized)
        if token.lower() not in ALLOWED_SHORT_ASCII_TRANSCRIPT_TOKENS
    ]
    suspicious_penalty = min(48, len(suspicious_short_ascii_tokens) * 12)

    dense_penalty = 0
    if _contains_hangul(normalized) and compact_len >= 18:
        space_density = normalized.count(" ") / max(1, compact_len)
        token_count = len(normalized.split())
        if space_density < 0.025:
            dense_penalty += 30
        if token_count <= max(3, compact_len // 20):
            dense_penalty += 18
        dense_penalty += min(24, len(re.findall(r"[가-힣]{10,}", normalized)) * 6)

    return compact_len + hangul_bonus + complete_bonus + space_bonus - suspicious_penalty - dense_penalty


def looks_like_degraded_user_transcript(
    text: str,
    *,
    utterance_duration_ms: float = 0.0,
) -> bool:
    normalized = sanitize_user_turn_text(text)
    if not normalized:
        return True

    compact_len = _compact_transcript_length(normalized)
    if utterance_duration_ms >= 2200 and compact_len < 18:
        return True
    if utterance_duration_ms >= 3200 and compact_len < 26:
        return True

    if not _contains_hangul(normalized):
        return False

    token_count = len(normalized.split())
    space_density = normalized.count(" ") / max(1, compact_len)
    suspicious_short_ascii_tokens = [
        token
        for token in re.findall(r"\b[A-Za-z]{1,3}\b", normalized)
        if token.lower() not in ALLOWED_SHORT_ASCII_TRANSCRIPT_TOKENS
    ]

    if compact_len >= 24 and space_density < 0.025:
        return True
    if compact_len >= 28 and token_count <= 4:
        return True
    if suspicious_short_ascii_tokens:
        return True
    return False


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
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", normalized) if part.strip()]
    tail = sentences[-1] if sentences else normalized
    has_question_intent = any(pattern.search(tail) for pattern in QUESTION_INTENT_PATTERNS)
    if not has_question_intent:
        return False
    if normalized[-1] in ".?!":
        return True
    return any(normalized.endswith(ending) for ending in QUESTION_ENDINGS)


__all__ = [
    "build_opening_turn_text",
    "build_answer_quality_hint",
    "build_retry_question_text",
    "compose_ai_question_text",
    "looks_like_complete_ai_question",
    "looks_like_complete_answer",
    "looks_like_degraded_user_transcript",
    "sanitize_ai_turn_text",
    "sanitize_user_turn_text",
    "score_user_transcript_text",
]
