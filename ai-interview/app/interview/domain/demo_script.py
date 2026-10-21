"""시연용 고정 대본 면접 — ㈜아카넷 「2026년 하반기 Acanet 웹개발자 채용 [서울] - 신입」.

발표 시연에서 공고 기반 모의면접이 실제 라이브 면접과 똑같은 화면·아바타·음성으로 진행되되,
면접관 발화는 아래 대본 순서대로만 나간다(리포트는 reporting/demo_report.py).

- 지원자는 실제로 말하고(대본을 읽고) '전송'을 누른다. 무엇을 말하든 면접관은 다음 대본 줄로 넘어간다.
- 오프닝(OPENING) → QUESTIONS[0..] 순서 → 마지막 답변 뒤 CLOSING_TEXT 와 함께 면접 종료.
- 대본 진행 위치는 VoiceWsState.demo_script_cursor(다음에 보낼 QUESTIONS 인덱스)로 관리한다.
"""

from __future__ import annotations

from typing import Any

DEMO_SCRIPT_ID = "acanet-2026-web"
DEMO_SCRIPT_COMPLETION_REASON = "closing_answer_submitted"
_COMPANY_MARKERS = ("아카넷", "acanet")

OPENING = (
    "안녕하세요, 김정환 지원자님. 아카넷 웹개발 면접 시작하겠습니다. 보내주신 이력서랑 자소서, 포트폴리오는 미리 읽어 봤어요. "
    "먼저 1분 정도 자기소개 부탁드립니다."
)

# 오프닝 이후 면접관 대사(꼬리질문 포함) — 지원자 답변 1개마다 한 줄씩 진행한다.
# 제출 서류(이력서·자소서·포트폴리오)와 직전 답변을 짚으며 이어지는 실전형 질문이다.
QUESTIONS: tuple[str, ...] = (
    # 1 — 이력서 기술 스택
    "네. 이력서 보니까 Spring MVC는 Beginner로 적으셨고, 프로젝트는 대부분 Python, Next.js던데요. "
    "저희는 Java 기반 SI입니다. Java는 실제로 어디까지 해 보셨어요?",
    # 1-꼬리 — 직전 답변(수강신청 예제)
    "수강신청 예제를 만든다고 하셨으니 바로 확인해 볼게요. 신청 저장이랑 인원 증가, 트랜잭션은 어디에 거셨어요?",
    # 2 — 포트폴리오 수치
    "좋습니다. 포트폴리오에 근거 일치율 87%가 크게 적혀 있던데요. 그 87%, 정확히 어떻게 측정하신 거예요?",
    # 2-꼬리 — 직전 답변(131/150)
    "그럼 틀린 19개는요? 어떤 유형이었고, 그냥 두진 않으셨을 것 같은데요.",
    # 3 — 자소서 문제해결 문항
    "자소서에 칸반 카드를 동시에 옮기면 화면마다 결과가 달랐다고 쓰셨죠. 쇼핑몰 리뉴얼 때 그 문제, 어떻게 푸셨어요?",
    # 3-꼬리 — 직전 답변(버전 값)
    "버전으로 막으셨으면 낙관적 락이네요. 비관적 락은 왜 안 쓰셨어요?",
    # 4 — 직전 답변(정원) + SQLD
    "방금 정원 얘기를 하셨으니 이어서 갈게요. SQLD도 있으시고요. 정원 30명 강의에 마지막 한 자리를 두고 "
    "100명이 동시에 신청합니다. 어떻게 막으시겠어요?",
    # 4-꼬리 — 트래픽
    "DB는 그렇게 지킨다 치고요. 신청 시작 순간에 트래픽이 몰리면 DB 앞단에서는 뭘 하시겠어요?",
    # 5 — 이력서 해커톤
    "이력서에 해커톤 팀장, 10일 만에 MVP라고 있던데요. 분명 잘라낸 기능이 있었을 텐데, 가장 아까웠던 것 하나와 자른 이유를 말씀해 주세요.",
    # 6 — SI 요구 변경
    "SI는 요구가 자주 바뀝니다. 오픈 2주 전에 대학 담당자가 성적 조회 화면을 통째로 바꿔 달라고 하면 어떻게 하시겠어요?",
    # 7 — 자소서 지원동기
    "마지막 질문입니다. 자소서 지원동기에 수강신청 장바구니 얘기를 쓰셨던데, 아카넷 개발자라면 그거 어떻게 고치시겠어요?",
    # 8 (마무리 피드백 + 궁금한 점)
    "네, 측정 방법까지 바로 설명하신 점이 인상적이었고, Java 실무는 입사 후 빠르게 채워야 할 부분으로 보입니다. "
    "마지막으로 궁금한 점 있으세요?",
)

CLOSING_TEXT = (
    "처음 3개월은 수습 기간 동안 플랫폼 교육과 기존 대학 사이트 유지보수 업무를 같이 하시게 됩니다. "
    "오늘 면접은 여기까지입니다. 수고 많으셨습니다."
)

# 지원자 대본 — CANDIDATE_ANSWERS[0] 은 OPENING 에 대한 답, [i + 1] 은 QUESTIONS[i] 에 대한 답. 한 턴에 2~3문장.
CANDIDATE_ANSWERS: tuple[str, ...] = (
    "안녕하세요, 데이터의 근거를 끝까지 확인하는 개발자 김정환입니다. SQLD와 정보처리산업기사를 취득했고, "
    "비자 행정 문서 1,200여 건을 정제해 RAG 어시스턴트의 근거 일치율을 87%까지 끌어올렸습니다. "
    "매일 쓰던 학사시스템을 이제는 만드는 쪽에서 일하고 싶어 지원했습니다.",
    "솔직히 실무 경험은 없습니다. 수업에서 JSP·Servlet 게시판과 스프링 MVC로 CRUD까지 해 봤고, "
    "지금은 전자정부 프레임워크로 수강신청 예제를 만들고 있습니다. 프로젝트에서 고민한 트랜잭션과 데이터 모델링은 "
    "Java에서도 그대로 쓸 수 있다고 생각합니다.",
    "서비스 메서드에 걸었습니다. 신청 저장과 인원 증가가 하나의 업무라서, 하나만 실패해도 둘 다 롤백되도록 "
    "매퍼가 아니라 서비스 단위로 묶었습니다.",
    "상담 로그에서 자주 나온 질문 150개로 평가셋을 만들고, 정답 근거는 헬로프렌즈 상담 담당자분과 함께 표시했습니다. "
    "답변의 출처가 그 근거와 일치하면 정답으로 봤고, 150개 중 131개가 맞아 87%였습니다.",
    "대부분 개정 전 안내문을 근거로 가져온 경우였습니다. 그래서 문서에 시행일을 넣어 최신 문서를 먼저 찾게 했고, "
    "확신이 낮으면 답하지 않고 담당자에게 넘기도록 바꿨습니다.",
    "원인은 서버에 기준이 없다는 거였습니다. 카드에 버전 값을 두고, 서버가 버전을 확인한 뒤 확정된 순서만 "
    "브로드캐스트하게 바꿨습니다. 충돌한 요청은 최신 상태를 다시 받아 화면을 맞췄습니다.",
    "카드 이동은 충돌이 드물고 자주 일어나서, 매번 잠그면 대기 시간이 더 손해라고 봤습니다. 다만 정원이나 "
    "금액처럼 절대 틀리면 안 되는 데이터라면 DB 제약이나 비관적 락을 쓰겠습니다.",
    "조회하고 비교한 뒤 저장하면 그 사이에 다른 요청이 끼어듭니다. 그래서 '인원이 정원보다 작을 때만 1 증가'하는 "
    "조건부 UPDATE 한 번으로 판단하고, 영향받은 행이 0이면 마감 처리하겠습니다. 중복 신청은 학번과 강의 번호 "
    "유니크 제약으로 막겠습니다.",
    "신청 요청은 대기열로 받아 순번을 보여주고 순서대로 처리하겠습니다. 최종 판단은 계속 DB가 하고, "
    "강의 목록 같은 읽기 요청은 캐시로 분리하겠습니다.",
    "멘토가 학습자료에 손글씨로 피드백하는 기능이 가장 아까웠습니다. 하지만 심사 기준이 '실제로 동작하는가'여서, "
    "계획부터 피드백까지 핵심 흐름을 먼저 완성하고 손글씨는 발표에서 로드맵으로 보여드렸습니다.",
    "먼저 왜 바꾸고 싶은지부터 확인하겠습니다. 화면 전체 문제인지 특정 정보가 안 보이는 문제인지에 따라 공수가 "
    "크게 다르기 때문입니다. 그다음 오픈 전 최소 수정안과 오픈 후 2차 반영안으로 나눠 합의하고, 합의한 내용은 "
    "문서로 남기겠습니다.",
    "장바구니에 담는 순간 시간표 충돌과 선수과목 조건을 미리 검사해 보여주겠습니다. 신청 직전에 실패하는 일이 줄면, "
    "신청 순간의 트래픽과 문의도 함께 줄어든다고 생각합니다.",
    "신입 개발자가 입사 후 aXis Platform에 익숙해지기까지 보통 어떤 과정을 거치는지 궁금합니다.",
)


def is_demo_script_session(job_data: Any, session_type: str | None = "live_interview") -> bool:
    """아카넷 시연 공고로 시작한 실시간(공고 기반) 면접이면 True."""
    if (session_type or "live_interview").strip() != "live_interview":
        return False
    if not isinstance(job_data, dict):
        return False
    if str(job_data.get("demoScript") or "").strip() == DEMO_SCRIPT_ID:
        return True
    company = str(job_data.get("company") or "").strip().lower()
    return any(marker in company for marker in _COMPANY_MARKERS)


def demo_script_line(line_index: int) -> tuple[str, bool]:
    """대본 커서 위치의 면접관 대사와 종료 턴 여부. 마지막 줄 이후는 CLOSING_TEXT(종료 턴)."""
    index = max(0, int(line_index))
    if index < len(QUESTIONS):
        return QUESTIONS[index], False
    return CLOSING_TEXT, True


def demo_script_question_index(line_index: int) -> int:
    """화면/payload 용 질문 번호(오프닝 = 1)."""
    return max(0, int(line_index)) + 2


def is_last_demo_script_question(line_index: int) -> bool:
    return int(line_index) == len(QUESTIONS) - 1


def demo_script_cursor_from_model_turns(model_turn_count: int) -> int:
    """재연결 복구용 — 저장된 면접관 턴은 오프닝 + 전달 완료된 대본 줄이므로 오프닝을 뺀 수가 커서다."""
    return max(0, min(len(QUESTIONS) + 1, int(model_turn_count) - 1))


__all__ = [
    "CANDIDATE_ANSWERS",
    "CLOSING_TEXT",
    "DEMO_SCRIPT_COMPLETION_REASON",
    "DEMO_SCRIPT_ID",
    "OPENING",
    "QUESTIONS",
    "demo_script_cursor_from_model_turns",
    "demo_script_line",
    "demo_script_question_index",
    "is_demo_script_session",
    "is_last_demo_script_question",
]
