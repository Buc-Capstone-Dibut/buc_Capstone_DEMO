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
            "SQLD·정보처리산업기사, 문서 1,200여 건 정제, 근거 일치율 87%처럼 경험을 수치로 뒷받침하고, 결제·정산이라는 지원 이유로 바로 연결했습니다.",
        ],
        "improvements": [
            "RAG 경험 하나에 집중해 해커톤 팀장·동시성 처리 경험은 첫인상에서 드러나지 않았습니다. 백엔드 직무와 가까운 경험을 한 문장 덧붙이면 균형이 맞습니다.",
        ],
        "refinedAnswer": (
            "안녕하세요, 데이터의 근거를 끝까지 확인하는 개발자 김디벗입니다. SQLD와 정보처리산업기사를 취득했고, 외국인 비자 플랫폼 "
            "Vizabridge의 RAG 어시스턴트에서 문서 1,200여 건을 정제해 근거 일치율을 87%까지 끌어올렸습니다. 협업 워크스페이스에서는 "
            "버전 기반 낙관적 업데이트로 동시 요청 정합성을 지켜 봤습니다. 숫자 하나가 틀리면 신뢰가 무너지는 결제·정산 영역에서, "
            "더즌의 거래 인프라를 정확하게 지키는 백엔드 개발자가 되고 싶어 지원했습니다."
        ),
        "followUpQuestion": "자기소개에서 말씀하신 경험 중 더즌의 펌뱅킹·가상계좌 업무와 가장 가까운 것은 무엇이라고 보시나요?",
        "evidence": [
            "데이터의 근거를 끝까지 확인하는 개발자 김디벗입니다",
            "숫자 하나가 틀리면 신뢰가 무너지는 결제·정산 일을 하고 싶어 더즌에 지원했습니다",
        ],
        "confidence": 84,
    },
    {  # 1 Java·Spring 수준
        "strengths": [
            "Java 수준을 과장하지 않고 수업·개인 예제 범위로 솔직하게 밝혔습니다.",
            "Spring Boot·JPA로 송금 API를 만들고 있다고 말해, 공고의 기술 스택을 스스로 채워 가는 중이라는 점을 보여줬습니다.",
        ],
        "improvements": [
            "실무 Java·Spring 경험을 보완할 구체적인 산출물(저장소 링크, 테스트 범위)과 완료 일정이 함께 제시되면 좋습니다.",
        ],
        "refinedAnswer": (
            "실무 프로젝트는 Python과 TypeScript 중심이었고, Java는 수업에서 JSP·Servlet 게시판과 스프링 MVC CRUD까지 구현한 수준입니다. "
            "부족한 부분을 알기 때문에 지금 Spring Boot와 JPA로 송금 API를 만들며 서비스 계층 트랜잭션과 엔티티 설계를 직접 다루고 있고, "
            "입사 전까지 테스트 코드와 함께 완성해 저장소로 보여드리겠습니다. 언어보다 트랜잭션 경계와 동시성을 먼저 고민해 온 경험은 Java 환경에서도 그대로 쓰일 것입니다."
        ),
        "followUpQuestion": "송금 API 예제에서 지금까지 직접 구현한 기능과 테스트 범위는 어디까지인가요?",
        "evidence": [
            "수업에서 JSP·Servlet 게시판과 스프링 MVC로 CRUD까지 해 봤고",
            "지금은 Spring Boot와 JPA로 간단한 송금 API를 만들고 있습니다",
        ],
        "confidence": 86,
    },
    {  # 2 트랜잭션 위치(꼬리)
        "strengths": [
            "트랜잭션을 리포지토리가 아닌 서비스 메서드 단위로 걸어야 하는 이유를 '출금과 입금 반영이 함께 롤백돼야 한다'는 업무 단위로 정확히 설명했습니다.",
        ],
        "improvements": [
            "롤백이 실제로 되는지 확인한 근거가 빠졌습니다. 예외를 일부러 발생시켜 롤백을 확인한 테스트를 덧붙이면 설득력이 커집니다.",
        ],
        "refinedAnswer": (
            "서비스 메서드에 @Transactional을 걸었습니다. 출금과 입금 반영은 하나의 업무라서, 리포지토리 단위로 나누면 한쪽만 반영될 수 있기 때문입니다. "
            "입금 반영 직후 예외를 일부러 발생시켜 두 작업이 함께 롤백되는지도 테스트로 확인했습니다."
        ),
        "followUpQuestion": "같은 클래스 안에서 다른 @Transactional 메서드를 호출하면 트랜잭션은 어떻게 동작하나요?",
        "evidence": [
            "서비스 메서드에 걸었습니다",
            "하나만 실패해도 둘 다 롤백되도록 리포지토리가 아니라 서비스 단위로 묶었습니다",
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
    {  # 4 틀린 19개(꼬리)
        "strengths": [
            "오답을 '개정 전 안내문을 근거로 가져온 경우'로 유형화하고 시행일 정보로 최신 문서를 먼저 찾게 해 원인을 직접 겨냥했습니다.",
            "확신이 낮을 때는 답하지 않고 담당자에게 넘기는 안전장치를 두어, 틀린 답보다 모르는 답이 낫다는 기준을 보여줬습니다. 금액을 다루는 업무에도 그대로 통하는 태도입니다.",
        ],
        "improvements": [
            "개선 후 같은 평가셋으로 다시 측정한 결과가 빠져 개선 효과를 수치로 닫지 못했습니다.",
        ],
        "refinedAnswer": (
            "대부분 개정 전 안내문을 근거로 가져온 경우였습니다. 그래서 문서에 시행일 메타데이터를 넣어 최신 문서를 우선 검색하고, 유사도 "
            "임계값 아래면 담당자 연결로 넘겼습니다. 필터를 적용한 뒤 같은 150개 평가셋으로 다시 측정해 개선 효과를 확인했고, 틀린 답보다 "
            "모른다고 하는 쪽이 더 안전하다고 판단했습니다."
        ),
        "followUpQuestion": "임계값은 어떤 기준으로 정하셨고, 담당자 연결로 넘어간 비율은 어느 정도였나요?",
        "evidence": [
            "대부분 개정 전 안내문을 근거로 가져온 경우였습니다",
            "확신이 낮으면 답하지 않고 담당자에게 넘기도록 바꿨습니다",
        ],
        "confidence": 89,
    },
    {  # 5 동시 요청 정합성
        "strengths": [
            "현상(화면마다 다른 카드 위치)에서 근본 원인(서버에 기준이 없음)을 찾아내는 과정을 단계적으로 설명했습니다.",
            "버전 값을 확인한 뒤 확정된 순서만 브로드캐스트하도록 바꿔 서버를 단일 기준으로 세웠습니다.",
        ],
        "improvements": [
            "충돌 발생 빈도나 해결 후 불일치 재현 여부 같은 검증 결과가 함께 제시되면 더 설득력 있습니다.",
        ],
        "refinedAnswer": "버전 기반 확정 브로드캐스트로 바꾼 뒤 두 브라우저 동시 이동 테스트에서 불일치가 사라졌다는 검증 결과를 함께 말해 주세요.",
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
            "잔액·이체 금액처럼 틀리면 안 되는 데이터에는 비관적 락이나 DB 제약이 맞다고 선택 기준의 경계까지 짚었습니다.",
        ],
        "improvements": [
            "낙관적 락에서 충돌이 났을 때 사용자가 겪는 경험(재시도·알림)까지 말하면 설계 설명이 완결됩니다.",
        ],
        "refinedAnswer": (
            "카드 이동은 충돌이 드물고 짧게 자주 일어나서, 매번 잠그면 대기 시간이 더 큰 손해라고 봤습니다. 충돌이 나면 최신 상태를 다시 받아 "
            "화면을 맞추고 사용자에게 변경 사실을 알려줬습니다. 반대로 잔액이나 이체 금액처럼 틀리면 안 되는 데이터는 비관적 락이나 DB 제약을 쓰겠습니다."
        ),
        "followUpQuestion": "같은 계좌에 출금 요청이 동시에 들어올 때 비관적 락을 쓴다면, 데드락은 어떻게 예방하시겠어요?",
        "evidence": [
            "카드 이동은 충돌이 드물고 자주 일어나서, 매번 잠그면 대기 시간이 더 손해라고 봤습니다",
            "이체 금액처럼 절대 틀리면 안 되는 데이터라면 DB 제약이나 비관적 락을 쓰겠습니다",
        ],
        "confidence": 90,
    },
    {  # 7 가상계좌 중복 입금 방지
        "strengths": [
            "은행 거래 고유번호를 멱등성 키로 삼고 유니크 제약으로 중복 저장을 DB에서 막는, 금융 연동의 정석 해법을 바로 제시했습니다.",
            "입금 상태를 한 방향으로만 전이시키고 이미 완료된 건에는 정상 응답만 돌려주겠다고 해, 은행 재전송까지 고려한 설계를 보여줬습니다.",
        ],
        "improvements": [
            "유니크 제약 위반을 애플리케이션에서 어떻게 받아 정상 응답으로 바꿀지(예외 처리 위치)까지 말하면 구현 수준의 이해가 드러납니다.",
        ],
        "refinedAnswer": (
            "은행이 주는 거래 고유번호를 멱등성 키로 쓰고, 그 컬럼에 유니크 제약을 걸어 두 번째 저장은 DB에서 막겠습니다. 중복 키 예외는 "
            "서비스에서 받아 기존 처리 결과를 그대로 돌려주고, 입금 상태는 대기에서 완료로 한 방향으로만 바뀌게 해 이미 완료된 건은 잔액에 "
            "다시 반영하지 않겠습니다. 입금 내역 저장과 잔액 반영은 한 트랜잭션으로 묶겠습니다."
        ),
        "followUpQuestion": "같은 입금 통지가 거의 동시에 두 번 들어와 두 요청이 모두 조회 단계를 통과하면 어떻게 되나요?",
        "evidence": [
            "은행 거래 고유번호를 멱등성 키로 쓰고, 그 컬럼에 유니크 제약을 걸어 두 번째 저장은 DB에서 막겠습니다",
            "이미 완료된 건은 다시 반영하지 않고 정상 응답만 돌려주겠습니다",
        ],
        "confidence": 90,
    },
    {  # 8 펌뱅킹 타임아웃(꼬리)
        "strengths": [
            "타임아웃을 실패로 단정하지 않고 '결과를 모르는 상태'로 다뤄, 재요청이 이중 이체로 이어질 위험을 먼저 짚었습니다.",
            "상태 조회 → 확정·재처리 → 배치 대사로 이어지는 단계적 복구 흐름을 제시했습니다.",
        ],
        "improvements": [
            "상태 조회를 몇 번, 어떤 간격으로 할지와 고객 화면에 무엇을 보여줄지까지는 다루지 못해 운영 관점이 조금 비었습니다.",
        ],
        "refinedAnswer": (
            "타임아웃은 실패가 아니라 결과를 모르는 상태라서, 바로 재요청하지 않고 이체 건을 처리 중으로 둔 뒤 금융기관에 거래 상태를 조회하겠습니다. "
            "조회는 정해진 간격으로 몇 차례만 하고, 성공이면 확정, 미처리면 같은 거래번호로 재처리하겠습니다. 끝까지 불분명한 건은 "
            "배치 대사로 기관 거래 내역과 맞춰 보고 담당자에게 알리며, 고객에게는 처리 중이라고 안내하겠습니다."
        ),
        "followUpQuestion": "처리 중으로 남은 건이 대사 전까지 고객에게 어떻게 보이도록 하시겠어요?",
        "evidence": [
            "바로 다시 요청하면 이중 이체가 될 수 있어서",
            "결과가 불분명한 건은 배치 대사로 기관 거래 내역과 맞춰 보고 담당자에게 알리겠습니다",
        ],
        "confidence": 84,
    },
    {  # 9 해커톤 기능 축소
        "strengths": [
            "심사 기준에 맞춰 기능의 우선순위를 정했다는 판단 근거가 명확했습니다.",
            "팀원들과 합의해 핵심 흐름을 끝까지 완성하고, 잘라낸 기능은 로드맵으로 전환해 발표에 활용했습니다.",
        ],
        "improvements": [
            "합의 과정에서 의견이 어떻게 갈렸고 그 결정이 본선 진출에 어떤 영향을 줬는지가 빠져 있습니다.",
        ],
        "refinedAnswer": "판단 근거에 더해 팀원들의 반대 의견을 어떻게 설득했는지와 본선 진출이라는 결과를 덧붙이면 끝까지 해내는 팀장의 근거가 완성됩니다.",
        "followUpQuestion": "손글씨 기능을 원했던 팀원이 있었다면 어떻게 설득하셨나요?",
        "evidence": [
            "심사 기준이 '실제로 동작하는가'여서",
            "팀원들과 합의해 계획부터 피드백까지 핵심 흐름을 먼저 끝까지 완성했습니다",
        ],
        "confidence": 80,
    },
    {  # 10 정산 배치 실패 대응
        "strengths": [
            "실패한 건만 다시 돌리려면 건별 처리 상태가 남아 있어야 한다며, 재실행해도 안전한 배치 설계를 먼저 떠올렸습니다.",
            "실패 즉시 알림과 원인 문서화까지 언급해 운영 업무에 대한 감각을 보여줬습니다.",
        ],
        "improvements": [
            "재실행 전에 이미 반영된 금액이 맞는지 대사로 확인하는 단계가 빠져, 정산 데이터 검증 관점이 조금 약했습니다.",
        ],
        "refinedAnswer": (
            "먼저 처리 이력 테이블로 어디까지 끝났는지 확인하고, 이미 반영된 금액이 맞는지 대사로 검증한 뒤 실패한 건만 다시 돌리겠습니다. "
            "이를 위해 배치는 건별 처리 상태를 남겨 재실행해도 끝난 건은 건너뛰게 설계하겠습니다. 실패 즉시 담당자에게 알림이 가게 하고, "
            "원인과 조치는 문서로 남겨 같은 실패가 반복되지 않게 하겠습니다."
        ),
        "followUpQuestion": "재실행 중에 같은 배치가 스케줄러로 한 번 더 시작되면 어떻게 막으시겠어요?",
        "evidence": [
            "먼저 처리 이력으로 어디까지 끝났는지 확인하고, 실패한 건만 다시 돌리겠습니다",
            "다시 실행해도 끝난 건은 건너뛰게 만들어 둬야 합니다",
        ],
        "confidence": 85,
    },
    {  # 11 지원동기 — 보이지 않게 잘 돌아가는 인프라
        "strengths": [
            "'사용자는 한 번 틀렸을 때 서비스를 기억한다'는 관점으로 거래 인프라의 가치를 사용자 입장에서 설명했습니다.",
            "기능 추가보다 금액 정확성과 장애 원인 추적을 백엔드의 역할로 정의해, 자소서 지원동기와 답변이 일관됐습니다.",
        ],
        "improvements": [
            "그 역할을 위해 입사 후 무엇부터 할지(로그·모니터링, 대사 자동화 등) 한 문장을 덧붙이면 더 구체적입니다.",
        ],
        "refinedAnswer": "금액이 틀리지 않게 하는 설계와 원인을 바로 찾을 수 있는 로그·대사 체계를 먼저 익히겠다고 실행 계획까지 이어 말해 보세요.",
        "followUpQuestion": "장애 원인을 바로 찾으려면 이체 한 건에 어떤 로그가 남아 있어야 한다고 보시나요?",
        "evidence": [
            "한 번 틀렸을 때 서비스를 기억한다고 생각합니다",
            "장애가 나도 금액이 틀리지 않고 원인을 바로 찾을 수 있게 만드는 것이 백엔드 개발자의 몫이라고 봅니다",
        ],
        "confidence": 85,
    },
    {  # 12 마지막 궁금한 점
        "strengths": [
            "입사 후 펌뱅킹·가상계좌 연동 구조를 익히는 과정을 물어, 공고의 주요 업무를 미리 파악하고 왔다는 인상을 줬습니다.",
            "입사 전 준비할 부분을 함께 물어 빠르게 적응하려는 의지가 드러났습니다.",
        ],
        "improvements": [
            "질문 앞에 지금 준비하고 있는 것(Spring Boot·JPA 송금 API)을 한 문장 붙이면 적극성이 더 잘 전달됩니다.",
        ],
        "refinedAnswer": (
            "지금 Spring Boot와 JPA로 송금 API를 만들며 준비하고 있는데, 신입 개발자가 입사 후 펌뱅킹·가상계좌 연동 구조에 익숙해지기까지 "
            "보통 어떤 과정을 거치는지, 입사 전에 미리 공부해 두면 좋은 부분이 있는지 궁금합니다."
        ),
        "followUpQuestion": "입사 전까지 가장 먼저 보완하고 싶은 기술은 무엇인가요?",
        "evidence": [
            "신입 개발자가 입사 후 펌뱅킹·가상계좌 연동 구조에 익숙해지기까지 보통 어떤 과정을 거치는지 궁금합니다",
        ],
        "confidence": 80,
    },
)


_STRENGTHS = (
    "근거 일치율 87%를 평가셋 150건, 일치 131건, 상담 담당자와의 공동 라벨링까지 측정 방법으로 바로 설명해 수치의 신뢰도를 스스로 입증했습니다.",
    "가상계좌 중복 입금 통지를 거래 고유번호 멱등성 키와 유니크 제약, 한 방향 상태 전이로 막는 정석 해법을 제시했습니다.",
    "펌뱅킹 타임아웃을 실패가 아닌 '결과를 모르는 상태'로 보고 상태 조회 → 확정·재처리 → 배치 대사 순서로 복구하겠다고 해, 이중 이체 위험을 먼저 짚었습니다.",
    "낙관적 락을 고른 이유를 충돌 빈도와 데이터 중요도로 설명하고, 잔액·이체 금액처럼 틀리면 안 되는 데이터는 비관적 락이나 DB 제약을 쓰겠다고 경계까지 그었습니다.",
)

_IMPROVEMENTS = (
    "Java·Spring 경험이 수업과 개인 예제 수준이라 실무 투입 근거가 약합니다. Spring Boot·JPA 송금 API를 테스트 코드와 함께 완성해 트랜잭션·예외 처리 구조를 코드로 보여줄 준비가 필요합니다.",
    "금융기관 연동 경험이 없어 타임아웃 대응이 개념 수준에 머물렀습니다. 상태 조회 횟수·간격, 고객 안내, 대사 결과 처리까지 한 단계 더 구체화하면 좋습니다.",
    "배치 실패 대응에서 재실행 전 금액 대사 검증과 중복 실행 방지가 빠져, 정산 데이터를 다루는 운영 관점을 조금 더 보강할 필요가 있습니다.",
)

# (답변 인덱스, 개선 이유) — refinedAnswer 는 같은 답변의 질문별 분석에서 가져온다.
_BEST_PRACTICES = (
    (1, "솔직한 수준 진단에 '언제까지 무엇으로 보완할지'를 구체적으로 덧붙이면 경험 부족이 실행 계획으로 바뀌어 신뢰도가 높아집니다."),
    (8, "타임아웃 이후의 조회 간격·재처리 기준·고객 안내까지 함께 말하면 개념 설명을 넘어 실제 운영 설계 능력을 보여줄 수 있습니다."),
)

_COMPETENCY_COVERAGE = (
    {"competency": "데이터 정합성·검증", "score": 90, "evidence": "근거 일치율 87%의 측정 방법과 오답 유형 분석, 시행일 필터·임계값 개선까지 수치와 근거로 설명했습니다.", "confidence": 90},
    {"competency": "트랜잭션·동시성 설계", "score": 87, "evidence": "서비스 계층 트랜잭션, 낙관적/비관적 락 선택 기준, 멱등성 키·유니크 제약 기반 중복 입금 방지를 정확히 답했습니다.", "confidence": 88},
    {"competency": "Java·Spring 실무 역량", "score": 66, "evidence": "JSP·Servlet, 스프링 MVC CRUD와 Spring Boot·JPA 개인 예제 수준으로 실무 경험은 확인되지 않았습니다.", "confidence": 82},
    {"competency": "금융 연동·운영 이해", "score": 78, "evidence": "펌뱅킹 타임아웃의 상태 조회·재처리·배치 대사와 배치 재실행 안전성을 제시했지만 실제 연동 경험은 없습니다.", "confidence": 80},
    {"competency": "우선순위 판단·끝까지 해내는 힘", "score": 82, "evidence": "해커톤에서 심사 기준에 맞춰 팀원과 범위를 합의하고 핵심 흐름을 끝까지 완성한 판단을 설명했습니다.", "confidence": 78},
    {"competency": "결제·정산 도메인 관심", "score": 84, "evidence": "금액 정확성과 장애 원인 추적을 백엔드의 역할로 정의하고, 지원동기와 답변을 일관되게 연결했습니다.", "confidence": 80},
)

_JD_COVERAGE = (
    {"requirement": "컴퓨터공학 또는 관련 학과 전공(졸업 예정 포함)", "matched": True, "evidence": "부천대학교 컴퓨터소프트웨어과 2027년 2월 졸업 예정으로 지원 자격을 충족합니다.", "confidence": 95},
    {"requirement": "Java 기본 지식과 Spring Framework 경험", "matched": True, "evidence": "JSP·Servlet 게시판, 스프링 MVC CRUD 구현과 Spring Boot·JPA 송금 API 예제를 진행 중이며, 서비스 계층 트랜잭션 위치를 정확히 설명했습니다.", "confidence": 68},
    {"requirement": "SQL 등 데이터베이스 기본 지식", "matched": True, "evidence": "유니크 제약 기반 중복 입금 방지, 비관적 락·DB 제약 선택 기준을 제시하고 SQLD를 취득했습니다.", "confidence": 90},
    {"requirement": "트랜잭션·동시성에 대한 이해 (우대)", "matched": True, "evidence": "버전 기반 낙관적 업데이트 경험과 잔액·이체 금액에 대한 비관적 락·DB 제약 판단 기준을 설명했습니다.", "confidence": 88},
    {"requirement": "배치·스케줄러 경험 (우대)", "matched": False, "evidence": "건별 처리 상태와 재실행 안전성, 실패 알림을 제시했지만 실제 배치를 개발·운영한 경험은 확인되지 않았습니다.", "confidence": 72},
    {"requirement": "결제·정산·금융 도메인에 대한 관심 (우대)", "matched": True, "evidence": "가상계좌 멱등성 처리와 펌뱅킹 타임아웃 대응, 거래 인프라의 역할에 대한 관점을 일관되게 보여줬습니다.", "confidence": 82},
)

# 리포트 렌더러가 '...' 따옴표로 감싸므로 따옴표 없이 쓴다. 횟수는 지원자 대본 13개 답변에서 센 값.
_HABITS = (
    {"habit": "~하겠습니다 어미 반복", "count": 7, "severity": "low"},
    {"habit": "~라고 생각합니다·봅니다", "count": 4, "severity": "low"},
)

_SUMMARY = (
    "데이터의 근거를 끝까지 확인하는 태도가 답변 전반에서 일관되게 드러난 면접입니다. 근거 일치율 87%의 측정 방법, 가상계좌 중복 입금을 "
    "멱등성 키와 유니크 제약으로 막는 설계처럼 수치와 원리를 함께 설명해 신뢰도가 높았습니다. 다만 Java·Spring은 수업과 개인 예제 수준이고 "
    "금융기관 연동 경험이 없어, 송금 API 예제를 완성하고 연동·배치 운영 흐름을 구체화하는 것이 합격 가능성을 높일 핵심입니다."
)

_FIT_SUMMARY = "금액과 데이터의 정확성을 먼저 따지는 신입으로, Java·Spring 실무와 금융 연동 경험을 빠르게 채우면 더즌의 거래 인프라 개발에 잘 맞습니다."

_NEXT_ACTIONS = (
    "Spring Boot·JPA 송금 API를 테스트 코드와 함께 완성하고, 트랜잭션 경계와 롤백 테스트를 README로 정리하기",
    "가상계좌 입금 통지 멱등성 처리(거래 고유번호 유니크 제약·상태 전이)를 MySQL에서 동시 요청으로 직접 테스트해 결과를 남기기",
    "펌뱅킹 타임아웃 대응과 정산 배치 재실행·대사 흐름을 한 장짜리 설계 문서로 정리해 운영 질문에 대비하기",
)

# 디벗 유형 축별 근거 — document.py 기본 문장(강점 문장·답변 전체를 끼워 넣는 방식) 대신 쓴다. {label} 은 축 라벨.
_AXIS_EVIDENCE = {
    "approach": "근거 일치율 87%를 평가셋 150건 → 일치 131건 → 약 87% 순서로 풀어낸 것처럼, 결론을 먼저 말하고 근거를 차례로 쌓는 구조가 일관돼 {label} 성향이 강하게 읽혔습니다.",
    "scope": "중복 입금을 애플리케이션 조회가 아닌 멱등성 키·유니크 제약과 상태 전이로 막고, 타임아웃은 배치 대사까지 이어 본 것처럼 시스템 전체 흐름에서 해법을 찾는 시야가 보여 {label} 축으로 해석했습니다.",
    "decision": "낙관적 락을 쓰되 잔액·이체 금액처럼 틀리면 안 되는 데이터는 비관적 락이나 DB 제약을 고르겠다고 경계를 그은 것처럼, 위험을 먼저 따지는 판단이 일관돼 {label} 성향이 선명했습니다.",
    "execution": "해커톤에서 10일 안에 핵심 흐름부터 끝까지 완성해 배포한 것처럼, 직접 만들어 동작을 확인하며 나아가는 방식이 보여 {label} 축으로 읽혔습니다.",
}

_NONVERBAL_TOPICS = (
    "자기소개",
    "Java·Spring 수준 답변",
    "트랜잭션 설명",
    "근거 일치율 측정 설명",
    "오답 개선 설명",
    "동시 요청 정합성 설명",
    "락 선택 기준 설명",
    "중복 입금 방지 설계",
    "펌뱅킹 타임아웃 대응",
    "해커톤 판단 근거",
    "배치 실패 대응",
    "지원동기 답변",
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
