// 더즌 시연 면접 대본의 (면접관 질문 → 지원자 답변) 쌍. 원본은
// ai-interview/app/interview/domain/demo_script.py 이며 demo-script.test.ts 가 두 파일이 같은지 검사한다.
// 콘솔 면접 코치(interviewCoach)가 현재 질문의 모범답변으로 이 답변을 보여준다.

export const DEMO_SCRIPT_PAIRS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "안녕하세요, 김디벗 지원자님. 더즌 개발본부 백엔드 신입 면접 시작하겠습니다. 보내주신 이력서랑 자소서, 포트폴리오는 미리 읽어 봤어요. 먼저 1분 정도 자기소개 부탁드립니다.",
    answer: "안녕하세요, 데이터의 근거를 끝까지 확인하는 개발자 김디벗입니다. SQLD와 정보처리산업기사를 취득했고, 행정 문서 1,200여 건을 정제해 RAG 어시스턴트의 근거 일치율을 87%까지 끌어올렸습니다. 숫자 하나가 틀리면 신뢰가 무너지는 결제·정산 일을 하고 싶어 더즌에 지원했습니다.",
  },
  {
    question: "네. 이력서 보니까 Spring MVC는 Beginner로 적으셨고, 프로젝트는 대부분 Python, Next.js던데요. 저희 개발본부는 Java, Spring 기반입니다. Java는 실제로 어디까지 해 보셨어요?",
    answer: "솔직히 실무 경험은 없습니다. 수업에서 JSP·Servlet 게시판과 스프링 MVC로 CRUD까지 해 봤고, 지금은 Spring Boot와 JPA로 간단한 송금 API를 만들고 있습니다. 프로젝트에서 고민한 트랜잭션과 동시성 처리는 Java에서도 그대로 쓸 수 있다고 생각합니다.",
  },
  {
    question: "송금 API를 만들고 계시다니 바로 확인해 볼게요. 출금이랑 입금 반영, 트랜잭션은 어디에 거셨어요?",
    answer: "서비스 메서드에 걸었습니다. 출금과 입금 반영은 하나의 업무라서, 하나만 실패해도 둘 다 롤백되도록 리포지토리가 아니라 서비스 단위로 묶었습니다.",
  },
  {
    question: "좋습니다. 포트폴리오에 근거 일치율 87%가 크게 적혀 있던데요. 그 87%, 정확히 어떻게 측정하신 거예요?",
    answer: "상담 로그에서 자주 나온 질문 150개로 평가셋을 만들고, 정답 근거는 헬로프렌즈 상담 담당자분과 함께 표시했습니다. 답변의 출처가 그 근거와 일치하면 정답으로 봤고, 150개 중 131개가 맞아 87%였습니다.",
  },
  {
    question: "그럼 틀린 19개는요? 어떤 유형이었고, 그냥 두진 않으셨을 것 같은데요.",
    answer: "대부분 개정 전 안내문을 근거로 가져온 경우였습니다. 그래서 문서에 시행일을 넣어 최신 문서를 먼저 찾게 했고, 확신이 낮으면 답하지 않고 담당자에게 넘기도록 바꿨습니다.",
  },
  {
    question: "자소서에 칸반 카드를 동시에 옮기면 화면마다 결과가 달랐다고 쓰셨죠. 저희 일도 동시 요청 정합성이 핵심인데, 그 문제 어떻게 푸셨어요?",
    answer: "원인은 서버에 기준이 없다는 거였습니다. 카드에 버전 값을 두고, 서버가 버전을 확인한 뒤 확정된 순서만 브로드캐스트하게 바꿨습니다. 충돌한 요청은 최신 상태를 다시 받아 화면을 맞췄습니다.",
  },
  {
    question: "버전으로 막으셨으면 낙관적 락이네요. 비관적 락은 왜 안 쓰셨어요?",
    answer: "카드 이동은 충돌이 드물고 자주 일어나서, 매번 잠그면 대기 시간이 더 손해라고 봤습니다. 다만 잔액이나 이체 금액처럼 절대 틀리면 안 되는 데이터라면 DB 제약이나 비관적 락을 쓰겠습니다.",
  },
  {
    question: "방금 금액 얘기를 하셨으니 저희 업무로 가 볼게요. 은행에서 가상계좌 입금 통지가 같은 건으로 두 번 들어오면, 입금이 두 번 처리되지 않게 어떻게 막으시겠어요?",
    answer: "은행 거래 고유번호를 멱등성 키로 쓰고, 그 컬럼에 유니크 제약을 걸어 두 번째 저장은 DB에서 막겠습니다. 입금 상태도 대기에서 완료로 한 방향으로만 바뀌게 해서, 이미 완료된 건은 다시 반영하지 않고 정상 응답만 돌려주겠습니다.",
  },
  {
    question: "반대로 저희가 보낸 펌뱅킹 이체 요청에 금융기관 응답이 타임아웃으로 안 오면요? 성공했는지 실패했는지 모르는 상황인데요.",
    answer: "바로 다시 요청하면 이중 이체가 될 수 있어서, 먼저 처리 중으로 두고 금융기관에 거래 상태를 조회한 뒤 확정하거나 재처리하겠습니다. 그래도 결과가 불분명한 건은 배치 대사로 기관 거래 내역과 맞춰 보고 담당자에게 알리겠습니다.",
  },
  {
    question: "이력서에 해커톤 팀장, 10일 만에 MVP라고 있던데요. 분명 잘라낸 기능이 있었을 텐데, 가장 아까웠던 것 하나와 자른 이유를 말씀해 주세요.",
    answer: "멘토가 학습자료에 손글씨로 피드백하는 기능이 가장 아까웠습니다. 하지만 심사 기준이 '실제로 동작하는가'여서, 팀원들과 합의해 계획부터 피드백까지 핵심 흐름을 먼저 끝까지 완성했습니다. 손글씨는 발표에서 로드맵으로 보여드렸습니다.",
  },
  {
    question: "저희는 정산 배치가 새벽에 돕니다. 새벽 3시에 정산 배치가 중간에 실패했다면, 출근해서 어떻게 하시겠어요?",
    answer: "먼저 처리 이력으로 어디까지 끝났는지 확인하고, 실패한 건만 다시 돌리겠습니다. 그러려면 배치가 건별 처리 상태를 남겨서, 다시 실행해도 끝난 건은 건너뛰게 만들어 둬야 합니다. 실패하면 바로 담당자에게 알림이 가게 하고 원인은 문서로 남기겠습니다.",
  },
  {
    question: "마지막 질문입니다. 자소서 지원동기에 거래 인프라는 보이지 않게 잘 돌아가야 한다고 쓰셨던데, 백엔드 개발자에게 그게 구체적으로 어떤 의미라고 보세요?",
    answer: "사용자는 이체가 잘될 때가 아니라 한 번 틀렸을 때 서비스를 기억한다고 생각합니다. 그래서 기능을 하나 더 만드는 것보다, 장애가 나도 금액이 틀리지 않고 원인을 바로 찾을 수 있게 만드는 것이 백엔드 개발자의 몫이라고 봅니다.",
  },
  {
    question: "네, 87% 측정 방법이나 중복 입금 처리를 근거로 차분하게 설명하신 점이 인상적이었고, Java·Spring 실무와 금융기관 연동은 입사 후 빠르게 채워야 할 부분으로 보입니다. 마지막으로 궁금한 점 있으세요?",
    answer: "신입 개발자가 입사 후 펌뱅킹·가상계좌 연동 구조에 익숙해지기까지 보통 어떤 과정을 거치는지 궁금합니다. 입사 전에 미리 공부해 두면 좋은 부분도 알고 싶습니다.",
  },
];

export function isDemoScriptJobPayload(jobPayload: unknown): boolean {
  if (!jobPayload || typeof jobPayload !== "object") return false;
  const record = jobPayload as Record<string, unknown>;
  if (record.demoScript === "dozn-2026-backend") return true;
  return /더즌|dozn/i.test(String(record.company ?? ""));
}

const normalize = (text: string) => text.replace(/[^0-9A-Za-z가-힣]/g, "");

function bigrams(text: string): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i < text.length - 1; i += 1) grams.add(text.slice(i, i + 2));
  return grams;
}

/** 화면에 나온 질문(자막·STT 차이 허용)에 가장 가까운 대본 줄의 지원자 답변. */
export function findDemoScriptAnswer(question: string): string | null {
  const target = normalize(question);
  if (!target) return null;
  const exact = DEMO_SCRIPT_PAIRS.find((pair) => normalize(pair.question) === target);
  if (exact) return exact.answer;

  const targetGrams = bigrams(target);
  let best: { answer: string; score: number } | null = null;
  for (const pair of DEMO_SCRIPT_PAIRS) {
    const grams = bigrams(normalize(pair.question));
    let shared = 0;
    for (const gram of grams) if (targetGrams.has(gram)) shared += 1;
    const score = shared / Math.max(1, Math.min(grams.size, targetGrams.size));
    if (!best || score > best.score) best = { answer: pair.answer, score };
  }
  return best && best.score >= 0.5 ? best.answer : null;
}
