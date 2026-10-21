"""시연 고정 대본 면접(domain/demo_script.py)의 리포트 — Gemini 분석 없이 미리 쓴 완성본을 저장한다.

발표자가 대본 일부(예: 자기소개 + 3~4개 답변)만 진행하고 '종료'해도 리포트는 13개 답변을 모두 마친
면접 기준의 완성본 그대로다. 질문별 분석은 답변 순서(0 = OPENING 에 대한 자기소개, i ≥ 1 = QUESTIONS[i-1])로
두어, 녹화 탭의 답변 순서 매핑(questionFindings[i] ↔ 답변 i+1)이 실제로 녹화된 답변과 맞물린다.
비언어 코멘트만 실제 카메라 집계값과 실제 답변 수를 따른다.
"""

from __future__ import annotations

from typing import Any

from app.interview.domain.demo_script import CANDIDATE_ANSWERS, OPENING, QUESTIONS
from app.interview.reporting.document import REPORT_SCHEMA_VERSION, _build_profile
from app.schemas.interview import AnalysisReport


def demo_question_for_answer(index: int) -> str:
    return OPENING if index == 0 else QUESTIONS[index - 1]


# 답변 순서별 질문 분석(question/userAnswer 는 조립 시 대본에서 채운다). evidence 는 지원자 대본의 실제 구절.
_FINDINGS: tuple[dict[str, Any], ...] = (
    {  # 0 자기소개
        "strengths": [
            "'데이터의 근거를 끝까지 확인하는 개발자'라는 한 문장으로 정체성을 먼저 제시해 첫인상이 선명했습니다.",
            "SQLD·정보처리산업기사, 문서 1,200여 건 정제, 근거 일치율 87%처럼 경험을 수치로 뒷받침했습니다.",
        ],
        "improvements": [
            "RAG 경험 하나에 집중해 해커톤 팀장·협업 경험은 첫인상에서 드러나지 않았습니다. 리더십 경험을 한 문장으로 덧붙이면 균형이 맞습니다.",
        ],
        "refinedAnswer": (
            "안녕하세요, 데이터의 근거를 끝까지 확인하는 개발자 김정환입니다. SQLD와 정보처리산업기사를 취득했고, 외국인 비자 플랫폼 "
            "Vizabridge의 RAG 어시스턴트에서 문서 1,200여 건을 정제해 근거 일치율을 87%까지 끌어올렸습니다. 이 경험으로 행정 데이터는 "
            "틀리면 안 된다는 것을 배웠고, 학생으로서 매일 쓰는 학사시스템을 이제는 만드는 쪽에서 아카넷의 대학 통합정보시스템에 기여하고 싶습니다."
        ),
        "followUpQuestion": "자기소개에서 말씀하신 경험 중 아카넷 업무와 가장 가까운 것은 무엇이라고 보시나요?",
        "evidence": [
            "데이터의 근거를 끝까지 확인하는 개발자 김정환입니다",
            "비자 행정 문서 1,200여 건을 정제해 RAG 어시스턴트의 근거 일치율을 87%까지 끌어올렸습니다",
        ],
        "confidence": 84,
    },
    {  # 1 Java 수준·지원 동기
        "strengths": [
            "Java 수준을 과장하지 않고 수업·예제 범위로 솔직하게 밝혔습니다.",
            "프로젝트에서 고민한 트랜잭션·데이터 모델링을 Java 환경으로 옮겨 갈 수 있는 역량으로 연결했습니다.",
        ],
        "improvements": [
            "실무 Java 경험이 없다는 점을 보완할 구체적인 학습 산출물과 완료 일정이 함께 제시되면 좋습니다.",
        ],
        "refinedAnswer": (
            "실무 프로젝트는 Python과 TypeScript 중심이었고, Java는 수업에서 JSP·Servlet 게시판과 스프링 MVC CRUD까지 구현한 수준입니다. "
            "부족한 부분을 알기 때문에 지금 전자정부 표준프레임워크로 수강신청 예제를 만들며 서비스 계층 트랜잭션과 MyBatis 매퍼를 직접 다루고 있고, "
            "입사 전까지 이 예제를 완성해 코드로 보여드리겠습니다. 언어보다 데이터 모델과 트랜잭션 경계를 먼저 고민해 온 경험은 Java 환경에서도 그대로 쓰일 것입니다."
        ),
        "followUpQuestion": "전자정부 프레임워크 예제에서 지금까지 직접 구현한 기능은 어디까지인가요?",
        "evidence": [
            "수업에서 JSP·Servlet 게시판과 스프링 MVC로 CRUD까지 해 봤고",
            "프로젝트에서 고민한 트랜잭션과 데이터 모델링은 Java에서도 그대로 쓸 수 있다고 생각합니다",
        ],
        "confidence": 86,
    },
    {  # 2 트랜잭션 위치(꼬리)
        "strengths": [
            "트랜잭션을 매퍼가 아닌 서비스 메서드 단위로 걸어야 하는 이유를 '저장과 인원 증가가 함께 롤백돼야 한다'는 업무 단위로 정확히 설명했습니다.",
        ],
        "improvements": [
            "롤백이 실제로 되는지 확인한 근거가 빠졌습니다. 예외를 일부러 발생시켜 롤백을 확인해 본 경험을 덧붙이면 설득력이 커집니다.",
        ],
        "refinedAnswer": (
            "서비스 구현체의 메서드에 트랜잭션을 걸었습니다. 수강신청 내역 저장과 신청 인원 증가는 하나의 업무라서, 매퍼 단위로 나누면 한쪽만 "
            "반영될 수 있기 때문입니다. 인원 증가 직후 예외를 일부러 발생시켜 두 작업이 함께 롤백되는지도 테스트로 확인하고 있습니다."
        ),
        "followUpQuestion": "같은 서비스 안에서 다른 트랜잭션 메서드를 호출하면 전파는 어떻게 동작하나요?",
        "evidence": [
            "서비스 메서드에 걸었습니다",
            "하나만 실패해도 둘 다 롤백되도록 매퍼가 아니라 서비스 단위로 묶었습니다",
        ],
        "confidence": 88,
    },
    {  # 3 근거 일치율 87% 측정
        "strengths": [
            "평가셋 구성(상담 로그 질문 150개), 정답 기준(담당자 공동 표시), 계산(131/150)까지 측정 방법을 막힘없이 설명했습니다.",
        ],
        "improvements": [
            "평가셋 150개가 실제 질문 분포를 얼마나 대표하는지(비자 유형별 비율)까지 말하면 수치의 신뢰도가 더 높아집니다.",
        ],
        "refinedAnswer": (
            "실제 상담 로그에서 자주 나온 질문 150개로 평가셋을 만들고, 정답 근거 문서는 헬로프렌즈 상담 담당자분과 함께 표시했습니다. "
            "답변의 출처 문서가 표시한 근거와 일치하면 정답으로 봤고 150개 중 131개, 약 87%가 일치했습니다. 질문은 비자 유형별 상담 비율을 "
            "반영해 뽑아 실제 분포와 크게 어긋나지 않게 했습니다."
        ),
        "followUpQuestion": "평가셋 150개는 비자 유형별로 어떻게 나눠 뽑으셨나요?",
        "evidence": [
            "상담 로그에서 자주 나온 질문 150개로 평가셋을 만들고",
            "150개 중 131개가 맞아 87%였습니다",
        ],
        "confidence": 92,
    },
    {  # 4 틀린 13%(꼬리)
        "strengths": [
            "오답을 '개정 전 안내문을 근거로 가져온 경우'로 유형화하고 시행일 정보로 최신 문서를 먼저 찾게 해 원인을 직접 겨냥했습니다.",
            "확신이 낮을 때는 답하지 않고 담당자에게 넘기는 안전장치를 두어, 틀린 답보다 모르는 답이 낫다는 행정 서비스의 기준을 보여줬습니다.",
        ],
        "improvements": [
            "개선 후 같은 평가셋으로 다시 측정한 결과가 빠져 개선 효과를 수치로 닫지 못했습니다.",
        ],
        "refinedAnswer": (
            "대부분 개정 전 안내문을 근거로 가져온 경우였습니다. 그래서 문서에 시행일 메타데이터를 넣어 최신 문서를 우선 검색하고, 유사도 "
            "임계값 아래면 담당자 연결로 넘겼습니다. 필터를 적용한 뒤 같은 150개 평가셋으로 다시 측정해 개선 효과를 확인했고, 틀린 답보다 "
            "모른다고 하는 쪽이 행정 서비스에서 더 안전하다고 판단했습니다."
        ),
        "followUpQuestion": "임계값은 어떤 기준으로 정하셨고, 담당자 연결로 넘어간 비율은 어느 정도였나요?",
        "evidence": [
            "대부분 개정 전 안내문을 근거로 가져온 경우였습니다",
            "확신이 낮으면 답하지 않고 담당자에게 넘기도록 바꿨습니다",
        ],
        "confidence": 89,
    },
    {  # 5 실시간 정합성 문제
        "strengths": [
            "현상(화면마다 다른 카드 위치)에서 근본 원인(서버에 기준이 없음)을 찾아내는 과정을 단계적으로 설명했습니다.",
            "버전 값을 확인한 뒤 확정된 순서만 브로드캐스트하도록 바꿔 서버를 단일 기준으로 세웠습니다.",
        ],
        "improvements": [
            "충돌 발생 빈도나 해결 후 불일치 재현 여부 같은 검증 결과가 함께 제시되면 더 설득력 있습니다.",
        ],
        "refinedAnswer": "버전 기반 확정 브로드캐스트로 바꾼 뒤 동시 이동 테스트에서 불일치가 사라졌다는 검증 결과를 함께 말해 주세요.",
        "followUpQuestion": "버전 충돌로 재요청이 발생했을 때 사용자 화면에서는 어떻게 보이도록 처리했나요?",
        "evidence": [
            "원인은 서버에 기준이 없다는 거였습니다",
            "카드에 버전 값을 두고, 서버가 버전을 확인한 뒤 확정된 순서만 브로드캐스트하게 바꿨습니다",
        ],
        "confidence": 88,
    },
    {  # 6 비관적 락(꼬리)
        "strengths": [
            "낙관적 락을 고른 이유를 충돌 빈도와 대기 비용으로 설명했습니다.",
            "정원·금액처럼 틀리면 안 되는 데이터에는 비관적 락이나 DB 제약이 맞다고 선택 기준의 경계까지 짚었습니다.",
        ],
        "improvements": [
            "낙관적 락에서 충돌이 났을 때 사용자가 겪는 경험(재시도·알림)까지 말하면 설계 설명이 완결됩니다.",
        ],
        "refinedAnswer": (
            "카드 이동은 충돌이 드물고 짧게 자주 일어나서, 매번 잠그면 대기 시간이 더 큰 손해라고 봤습니다. 충돌이 나면 최신 상태를 다시 받아 "
            "화면을 맞추고 사용자에게 변경 사실을 알려줬습니다. 반대로 정원이나 금액처럼 틀리면 안 되는 데이터는 비관적 락이나 DB 제약을 쓰겠습니다."
        ),
        "followUpQuestion": "비관적 락을 쓸 때 데드락은 어떻게 예방하시겠어요?",
        "evidence": [
            "카드 이동은 충돌이 드물고 자주 일어나서, 매번 잠그면 대기 시간이 더 손해라고 봤습니다",
            "정원이나 금액처럼 절대 틀리면 안 되는 데이터라면 DB 제약이나 비관적 락을 쓰겠습니다",
        ],
        "confidence": 90,
    },
    {  # 7 수강신청 정원 초과
        "strengths": [
            "조회 후 비교·저장 사이의 경쟁 조건을 정확히 짚고 판단을 DB 원자 연산으로 옮겼습니다.",
            "조건부 UPDATE의 영향받은 행 수로 성공과 마감을 가르고, 중복 신청은 유니크 제약으로 막는 등 SQLD 수준의 이해를 보여줬습니다.",
        ],
        "improvements": [
            "조건부 UPDATE가 실패했을 때 사용자에게 어떻게 안내할지(마감 안내·대기 등록)까지 이어서 말하면 완성도가 높아집니다.",
        ],
        "refinedAnswer": (
            "판단을 DB 한 번의 원자적 연산으로 옮기겠습니다. '신청 인원이 정원보다 작을 때만 1 증가'하는 조건부 UPDATE를 실행하고, 영향받은 행이 "
            "1이면 신청 내역을 저장, 0이면 마감 안내를 보여주겠습니다. 두 작업은 한 트랜잭션으로 묶고, 중복 신청은 학번·강의 번호 유니크 제약으로 막겠습니다."
        ),
        "followUpQuestion": "Oracle에서 같은 로직을 구현한다면 조건부 UPDATE 대신 SELECT ... FOR UPDATE를 쓸 때와 무엇이 다른가요?",
        "evidence": [
            "'인원이 정원보다 작을 때만 1 증가'하는 조건부 UPDATE 한 번으로 판단하고, 영향받은 행이 0이면 마감 처리하겠습니다",
            "중복 신청은 학번과 강의 번호 유니크 제약으로 막겠습니다",
        ],
        "confidence": 90,
    },
    {  # 8 트래픽 대응(꼬리)
        "strengths": [
            "최종 판단은 DB에 두고 읽기 요청만 캐시로 분리해 정합성과 성능의 책임을 나눴습니다.",
            "사용자에게 대기 순번을 보여주겠다며 사용자 경험까지 고려했습니다.",
        ],
        "improvements": [
            "대기열을 무엇으로 구현할지, 순번 만료·재시도와 장애 시 처리까지는 다루지 못해 개념 수준에 머물렀습니다.",
        ],
        "refinedAnswer": (
            "신청 버튼을 누르면 순번 토큰을 발급해 대기열에 넣고, 일정 처리량만 DB 쓰기로 흘려보내겠습니다. 사용자에게는 대기 순번과 예상 시간을 "
            "보여주고, 토큰에 만료 시간을 두어 이탈한 요청이 자리를 차지하지 않게 하겠습니다. 정원 판단은 계속 조건부 UPDATE로 DB가 하고, "
            "강의 목록·시간표 같은 읽기 요청은 캐시로 분리해 쓰기 경로를 보호하겠습니다."
        ),
        "followUpQuestion": "대기열 서버가 멈추면 이미 받은 신청 요청은 어떻게 보장하시겠어요?",
        "evidence": [
            "신청 요청은 대기열로 받아 순번을 보여주고 순서대로 처리하겠습니다",
            "강의 목록 같은 읽기 요청은 캐시로 분리하겠습니다",
        ],
        "confidence": 82,
    },
    {  # 9 해커톤 기능 축소
        "strengths": [
            "심사 기준에 맞춰 기능의 우선순위를 정했다는 판단 근거가 명확했습니다.",
            "잘라낸 기능을 버리지 않고 로드맵으로 전환해 발표에 활용했습니다.",
        ],
        "improvements": [
            "팀장으로서 팀원과 어떻게 합의했는지, 그 결정이 본선 진출에 어떤 영향을 줬는지가 빠져 있습니다.",
        ],
        "refinedAnswer": "판단 근거에 더해 팀원들과 우선순위를 합의한 방식과 심사 결과를 덧붙이면 리더십 근거가 완성됩니다.",
        "followUpQuestion": "손글씨 기능을 원했던 팀원이 있었다면 어떻게 설득하셨나요?",
        "evidence": [
            "심사 기준이 '실제로 동작하는가'여서",
            "핵심 흐름을 먼저 완성하고 손글씨는 발표에서 로드맵으로 보여드렸습니다",
        ],
        "confidence": 80,
    },
    {  # 10 SI 요구 변경
        "strengths": [
            "요구를 바로 수용하지 않고 실제 필요(전체 변경인지 특정 정보 문제인지)부터 확인하는 접근이 SI 현업에 적합합니다.",
            "최소 수정안과 2차 반영안을 나누고 합의 내용을 문서로 남기겠다는 점에서 산출물 중심 문화와 잘 맞습니다.",
        ],
        "improvements": [
            "일정 리스크를 고객에게 어떤 근거(공수 산정 등)로 설명할지가 더해지면 좋습니다.",
        ],
        "refinedAnswer": "변경 영향 범위를 화면·쿼리·테스트 공수로 나눠 산정해 보여주고, 그 근거로 1차/2차 범위를 합의하겠다고 말하면 더 구체적입니다.",
        "followUpQuestion": "고객이 2차 반영안을 받아들이지 않고 오픈 전 전체 변경을 고집하면 어떻게 하시겠어요?",
        "evidence": [
            "오픈 전 최소 수정안과 오픈 후 2차 반영안으로 나눠 합의하고",
            "합의한 내용은 문서로 남기겠습니다",
        ],
        "confidence": 84,
    },
    {  # 11 학사시스템 개선
        "strengths": [
            "사용자로서 겪은 불편을 장바구니 단계 사전 검사라는 구체적인 개선안으로 연결했습니다.",
            "개선이 신청 순간의 트래픽과 실패 문의 감소로 이어진다는 운영 관점까지 언급했습니다.",
        ],
        "improvements": [
            "선수과목·시간표 데이터를 어디서 가져와 검사할지 등 구현 방향을 한 문장 덧붙이면 좋습니다.",
        ],
        "refinedAnswer": "장바구니 저장 시점에 시간표·선수과목 규칙을 서버에서 검사하고 결과를 바로 표시해, 신청 당일의 실패 요청을 줄이겠다고 구체화해 보세요.",
        "followUpQuestion": "그 사전 검사 로직은 클라이언트와 서버 중 어디에 두는 것이 맞다고 보시나요?",
        "evidence": [
            "장바구니에 담는 순간 시간표 충돌과 선수과목 조건을 미리 검사해 보여주겠습니다",
            "신청 순간의 트래픽과 문의도 함께 줄어든다고 생각합니다",
        ],
        "confidence": 85,
    },
    {  # 12 마지막 궁금한 점
        "strengths": [
            "입사 후 aXis Platform 적응 과정을 물어 회사의 자체 플랫폼을 미리 파악하고 왔다는 인상을 줬습니다.",
            "장기적으로 함께 성장하려는 의지가 드러나는 질문이었습니다.",
        ],
        "improvements": [
            "질문 앞에 지금 준비하고 있는 것(전자정부 프레임워크 학습)을 한 문장 붙이면 적극성이 더 잘 전달됩니다.",
        ],
        "refinedAnswer": (
            "지금 전자정부 표준프레임워크로 수강신청 예제를 만들며 준비하고 있는데, 신입 개발자가 입사 후 aXis Platform에 익숙해지기까지 "
            "보통 어떤 과정을 거치는지, 입사 전에 미리 공부해 두면 좋은 부분이 있는지 궁금합니다."
        ),
        "followUpQuestion": "입사 전까지 가장 먼저 보완하고 싶은 기술은 무엇인가요?",
        "evidence": [
            "신입 개발자가 입사 후 aXis Platform에 익숙해지기까지 보통 어떤 과정을 거치는지 궁금합니다",
        ],
        "confidence": 80,
    },
)


_STRENGTHS = (
    "근거 일치율 87%를 평가셋 150건, 일치 131건, 상담 담당자와의 공동 라벨링까지 측정 방법으로 바로 설명해 수치의 신뢰도를 스스로 입증했습니다.",
    "수강신청 정원 초과 문제를 조건부 UPDATE와 영향받은 행 수 확인, 학번·강의 유니크 제약으로 DB의 원자적 연산에 맡기는 정석 해법으로 답했습니다.",
    "낙관적 락을 선택한 이유를 충돌 빈도와 데이터 중요도라는 기준으로 설명하고, 정원·금액처럼 틀리면 안 되는 데이터는 비관적 락이나 DB 제약을 쓰겠다고 경계까지 짚었습니다.",
    "고객 요구 변경에 대해 이유 확인 → 최소 수정안과 2차 반영안 분리 → 합의 내용 문서화 순서로 SI 현업에 맞는 대응 흐름을 보여줬습니다.",
)

_IMPROVEMENTS = (
    "Java·스프링 경험이 수업과 예제 수준이라 실무 투입 근거가 약합니다. 전자정부 프레임워크 수강신청 예제를 완성해 서비스 계층 트랜잭션과 MyBatis 매퍼 구조를 코드로 보여줄 준비가 필요합니다.",
    "트래픽 대응 답변(대기열·캐시)이 개념 수준에 머물렀습니다. 대기열을 무엇으로 구현할지, 순번 만료·재시도와 장애 시 처리를 한 단계 더 구체화하면 좋습니다.",
    "해커톤 기능 축소 판단은 설득력 있었지만, 팀원과 어떻게 합의했는지와 결과(심사 피드백 등)가 빠져 팀장 역할의 근거가 다소 약했습니다.",
)

# (답변 인덱스, 개선 이유) — refinedAnswer 는 같은 답변의 질문별 분석에서 가져온다.
_BEST_PRACTICES = (
    (1, "솔직한 수준 진단에 '언제까지 무엇으로 보완할지'를 구체적으로 덧붙이면 경험 부족이 실행 계획으로 바뀌어 신뢰도가 높아집니다."),
    (8, "대기열의 구현 방식(순번 토큰·처리량 제한·만료)을 함께 말하면 개념 설명을 넘어 실제 설계 능력을 보여줄 수 있습니다."),
)

_COMPETENCY_COVERAGE = (
    {"competency": "데이터 기반 문제 해결", "score": 90, "evidence": "근거 일치율 87%의 측정 방법과 오답 유형 분석, 시행일 필터·임계값 개선까지 수치와 근거로 설명했습니다.", "confidence": 90},
    {"competency": "DB·트랜잭션 설계", "score": 87, "evidence": "조건부 UPDATE·유니크 제약 기반 정원 관리, 서비스 계층 트랜잭션, 낙관적/비관적 락 선택 기준을 정확히 답했습니다.", "confidence": 88},
    {"competency": "Java·스프링 실무 역량", "score": 64, "evidence": "JSP·Servlet, 스프링 MVC CRUD와 전자정부 프레임워크 예제 학습 수준으로 실무 경험은 확인되지 않았습니다.", "confidence": 82},
    {"competency": "고객 요구 대응·커뮤니케이션", "score": 85, "evidence": "요구 변경 시 이유 확인, 단계별 합의와 문서화 순서를 제시했습니다.", "confidence": 84},
    {"competency": "우선순위 판단·리더십", "score": 80, "evidence": "해커톤에서 심사 기준에 맞춰 핵심 흐름을 우선하고 기능을 로드맵으로 돌린 판단을 설명했습니다.", "confidence": 78},
    {"competency": "대학 도메인 이해", "score": 82, "evidence": "수강신청 장바구니 단계의 시간표 충돌·선수과목 사전 검사를 개선안으로 제시해 대학 업무 흐름에 대한 이해를 보여줬습니다.", "confidence": 78},
)

_JD_COVERAGE = (
    {"requirement": "Java 기반 웹 개발 이해", "matched": True, "evidence": "JSP·Servlet 게시판, 스프링 MVC CRUD 구현과 전자정부 프레임워크 수강신청 예제를 진행 중이라고 답했으나 실무 경험은 부족합니다.", "confidence": 62},
    {"requirement": "관계형 DB와 SQL 활용 능력", "matched": True, "evidence": "조건부 UPDATE와 영향받은 행 수 확인, 유니크 제약으로 수강신청 정원 초과와 중복 신청을 막는 방법을 제시했습니다.", "confidence": 90},
    {"requirement": "SQLD·정보처리 계열 자격증 (우대)", "matched": True, "evidence": "SQLD와 정보처리산업기사를 취득했다고 자기소개에서 밝혔습니다.", "confidence": 95},
    {"requirement": "전자정부 표준프레임워크 경험 (우대)", "matched": False, "evidence": "현재 예제를 따라 만드는 학습 단계로, 트랜잭션 위치는 정확히 이해했지만 프로젝트 적용 경험은 확인되지 않았습니다.", "confidence": 72},
    {"requirement": "대학 행정 업무 이해 (우대)", "matched": True, "evidence": "학사시스템 사용자로서 수강신청 장바구니 단계의 시간표 충돌·선수과목 사전 검사를 개선안으로 제시했습니다.", "confidence": 78},
    {"requirement": "요구사항 분석·고객사 현업 요구 대응", "matched": True, "evidence": "오픈 2주 전 화면 변경 요청에 대해 실제 필요 확인, 1차/2차 범위 합의와 문서화를 제시했습니다.", "confidence": 83},
)

# 리포트 렌더러가 '...' 따옴표로 감싸므로 따옴표 없이 쓴다. 횟수는 지원자 대본 13개 답변에서 센 값.
_HABITS = (
    {"habit": "~하겠습니다 어미 반복", "count": 8, "severity": "low"},
    {"habit": "~라고 생각합니다·봤습니다", "count": 5, "severity": "low"},
)

_SUMMARY = (
    "데이터의 근거를 끝까지 확인하는 태도가 답변 전반에서 일관되게 드러난 면접입니다. 근거 일치율 87%의 측정 방법, 수강신청 정원 초과를 막는 "
    "조건부 UPDATE처럼 수치와 원리를 함께 설명해 신뢰도가 높았습니다. 다만 Java·스프링은 수업과 예제 수준이라, 전자정부 프레임워크 예제를 "
    "완성해 실무 전환 근거를 보강하는 것이 합격 가능성을 높일 핵심입니다."
)

_FIT_SUMMARY = "근거와 수치로 말하는 데이터 중심 신입으로, Java 실무 경험을 빠르게 채우면 대학 SI 현장에 잘 맞습니다."

_NEXT_ACTIONS = (
    "전자정부 표준프레임워크 수강신청 예제를 끝까지 완성하고, 서비스 계층 트랜잭션과 MyBatis 매퍼 구조를 README로 정리하기",
    "조건부 UPDATE·유니크 제약 기반 정원 관리 로직을 Oracle에서 동시 요청으로 직접 테스트해 결과를 수치로 남기기",
    "수강신청 대기열(순번 발급·만료·재시도)을 한 장짜리 설계 문서로 정리해 트래픽 대응 질문에 대비하기",
)

# 디벗 유형 축별 근거 — document.py 기본 문장(강점 문장·답변 전체를 끼워 넣는 방식) 대신 쓴다. {label} 은 축 라벨.
_AXIS_EVIDENCE = {
    "approach": "근거 일치율 87%를 평가셋 150건 → 일치 131건 → 약 87% 순서로 풀어낸 것처럼, 결론을 먼저 말하고 근거를 차례로 쌓는 구조가 일관돼 {label} 성향이 강하게 읽혔습니다.",
    "scope": "수강신청 정원 문제를 애플리케이션 비교가 아닌 DB 원자 연산과 유니크 제약으로 푼 것처럼, 시스템 전체 흐름에서 해법을 찾는 시야가 보여 {label} 축으로 해석했습니다.",
    "decision": "낙관적 락을 쓰되 정원·금액처럼 틀리면 안 되는 데이터는 비관적 락이나 DB 제약을 고르겠다고 경계를 그은 것처럼, 위험을 먼저 따지는 판단이 일관돼 {label} 성향이 선명했습니다.",
    "execution": "해커톤에서 10일 안에 핵심 흐름부터 완성해 배포한 것처럼, 직접 만들어 동작을 확인하며 나아가는 방식이 보여 {label} 축으로 읽혔습니다.",
}

_NONVERBAL_TOPICS = (
    "자기소개",
    "Java 수준 답변",
    "트랜잭션 설명",
    "근거 일치율 측정 설명",
    "오답 개선 설명",
    "실시간 정합성 문제 설명",
    "락 선택 기준 설명",
    "정원 초과 해법",
    "트래픽 대응 답변",
    "해커톤 판단 근거",
    "요구 변경 대응",
    "학사시스템 개선안",
    "마지막 질문",
)


def build_demo_report() -> dict[str, Any]:
    """완성본 compatAnalysis — AnalysisReport 검증 + 리포트 뷰가 쓰는 summary/fitSummary/nextActions."""
    report = AnalysisReport.model_validate(
        {
            "overallScore": 84,
            "passProbability": 78,
            "evaluation": {"jobFit": 81, "logic": 88, "communication": 86, "attitude": 87},
            "sentimentTimeline": [72, 70, 74, 82, 84, 80, 83, 86, 84, 80, 82, 85, 83],
            "habits": list(_HABITS),
            "feedback": {"strengths": list(_STRENGTHS), "improvements": list(_IMPROVEMENTS)},
            "bestPractices": [
                {
                    "question": demo_question_for_answer(index),
                    "userAnswer": CANDIDATE_ANSWERS[index],
                    "refinedAnswer": _FINDINGS[index]["refinedAnswer"],
                    "reason": reason,
                }
                for index, reason in _BEST_PRACTICES
            ],
            "questionFindings": [
                {"question": demo_question_for_answer(index), "userAnswer": CANDIDATE_ANSWERS[index], **finding}
                for index, finding in enumerate(_FINDINGS)
            ],
            "competencyCoverage": list(_COMPETENCY_COVERAGE),
            "jdCoverage": list(_JD_COVERAGE),
        }
    ).model_dump()
    report["summary"] = _SUMMARY
    report["fitSummary"] = _FIT_SUMMARY
    report["nextActions"] = list(_NEXT_ACTIONS)
    return report


def build_demo_report_document(compat_analysis: dict[str, Any]) -> dict[str, Any]:
    """save_report 가 그대로 받는 리포트 문서. reportView.profile 은 다듬은 축 근거로 채우고, 나머지 뷰와
    타임라인은 build_report_document 가 실제 턴 기준으로 채운다."""
    report_view: dict[str, Any] = {}
    profile = _build_profile(
        compat_analysis,
        role="",  # 축 점수의 직무 보정을 고정해 유형이 공고 문구에 흔들리지 않게 한다
        question_findings=compat_analysis.get("questionFindings") or [],
        competency_coverage=compat_analysis.get("competencyCoverage") or [],
        jd_coverage=compat_analysis.get("jdCoverage") or [],
    )
    if profile:
        labels = dict(zip(("approach", "scope", "decision", "execution"), profile.get("typeLabels") or []))
        for axis in profile.get("axisEvidence") or []:
            key = axis.get("axisKey")
            if key in _AXIS_EVIDENCE and key in labels:
                axis["description"] = _AXIS_EVIDENCE[key].format(label=labels[key])
        report_view["profile"] = profile
    return {
        "schemaVersion": REPORT_SCHEMA_VERSION,
        "compatAnalysis": compat_analysis,
        "reportView": report_view,
    }


def build_demo_nonverbal_summary(aggregates: dict[str, Any], *, answer_count: int) -> dict[str, Any]:
    """실제 카메라 집계값(시선 이탈·미소·고개 움직임)에 맞춘 비언어 코멘트 — Gemini 없이 만든다.
    답변별 코멘트는 실제로 녹화된 답변 수만큼(녹화 탭 Q1.. 와 맞물리게) 만든다.
    시선 구간은 웹 리포트(describeAwayRatio)와 같은 기준(10% / 30%)으로 나눈다."""
    answered = max(1, min(len(_NONVERBAL_TOPICS), int(answer_count)))
    away_percent = round(float(aggregates.get("awayRatio") or 0.0) * 100)
    smile_percent = round(float(aggregates.get("smileRatio") or 0.0) * 100)
    head_level = str((aggregates.get("headMovement") or {}).get("level") or "").strip()

    if away_percent <= 10:
        gaze_band = "steady"
        gaze_sentence = "답변 내내 정면 응시가 안정적으로 유지돼 차분하고 신뢰감 있는 인상을 줬습니다."
    elif away_percent <= 30:
        gaze_band = "mixed"
        gaze_sentence = "대체로 화면을 보며 답했지만, 수치나 경험을 떠올리는 순간 시선이 잠시 화면 밖으로 이동했습니다."
    else:
        gaze_band = "away"
        gaze_sentence = "답변 중 시선이 화면 밖으로 향하는 구간이 잦았습니다. 메모나 화면 아래를 보는 시간이 길어지면 전달력이 약해질 수 있습니다."

    if head_level == "높음":
        head_sentence = "고개가 자주 움직여 화면이 흔들려 보일 수 있으니, 상체를 고정하고 말하는 연습을 권합니다."
    elif head_level == "보통":
        head_sentence = "고개 움직임은 말의 흐름에 맞춘 자연스러운 수준이었습니다."
    else:
        head_sentence = "고개 움직임이 적어 자세가 안정적이었습니다."

    if smile_percent >= 15:
        smile_sentence = "미소가 적절히 나타나 부드러운 인상을 더했습니다."
    else:
        smile_sentence = "표정 변화가 적은 편이라 자기소개와 마무리 인사에서 가볍게 미소를 더하면 인상이 더 부드러워집니다."

    if gaze_band != "steady":
        priority = "가장 먼저, 핵심 수치나 결론을 말하는 순간에는 카메라를 바라보는 연습을 해 보세요."
    elif head_level == "높음":
        priority = "가장 먼저, 답변하는 동안 상체와 고개를 고정하는 연습을 해 보세요."
    elif smile_percent < 15:
        priority = "지금의 안정적인 시선은 유지하고, 첫인사와 마무리에서 미소를 더해 보세요."
    else:
        priority = "지금의 시선과 표정을 그대로 유지하면 충분합니다."

    gaze_comments = {
        "steady": (
            "{topic}에서 정면 응시가 유지돼 답변 내용이 또렷하게 전달됐습니다.",
            "{topic} 동안 시선이 흔들리지 않아 자신 있는 인상을 줬습니다.",
            "{topic}에서도 카메라를 보며 말해 집중도가 잘 유지됐습니다.",
        ),
        "mixed": (
            "{topic} 중 시선이 잠시 화면 밖으로 이동했습니다. 핵심 문장을 말할 때는 카메라를 바라보세요.",
            "{topic}에서 대부분 화면을 봤지만, 내용을 떠올리는 구간에 시선이 흐트러졌습니다.",
            "{topic}의 마지막 문장을 카메라를 보며 말하면 전달력이 더 좋아집니다.",
        ),
        "away": (
            "{topic} 동안 시선이 화면 아래로 자주 향했습니다. 첫 문장과 마지막 문장만이라도 카메라를 보며 말해 보세요.",
            "{topic}에서 시선이 화면 밖에 머무는 시간이 길었습니다. 핵심 키워드를 말할 때 카메라를 보세요.",
            "{topic} 중 화면을 보는 시간을 조금만 늘려도 자신감 있는 인상을 줄 수 있습니다.",
        ),
    }[gaze_band]

    return {
        "overall": f"{gaze_sentence} {head_sentence} {smile_sentence} {priority}",
        "perAnswer": [
            {"index": index + 1, "comment": gaze_comments[index % len(gaze_comments)].format(topic=_NONVERBAL_TOPICS[index])}
            for index in range(answered)
        ],
    }


__all__ = [
    "build_demo_nonverbal_summary",
    "build_demo_report",
    "build_demo_report_document",
    "demo_question_for_answer",
]
