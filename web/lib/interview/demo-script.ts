// 아카넷 시연 면접 대본의 (면접관 질문 → 지원자 답변) 쌍. 원본은
// ai-interview/app/interview/domain/demo_script.py 이며 demo-script.test.ts 가 두 파일이 같은지 검사한다.
// 콘솔 면접 코치(interviewCoach)가 현재 질문의 모범답변으로 이 답변을 보여준다.

export const DEMO_SCRIPT_PAIRS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "안녕하세요, 김정환 지원자님. 아카넷 웹개발 면접 시작하겠습니다. 보내주신 이력서랑 자소서, 포트폴리오는 미리 읽어 봤어요. 먼저 1분 정도 자기소개 부탁드립니다.",
    answer: "안녕하세요, 데이터의 근거를 끝까지 확인하는 개발자 김정환입니다. SQLD와 정보처리산업기사를 취득했고, 비자 행정 문서 1,200여 건을 정제해 RAG 어시스턴트의 근거 일치율을 87%까지 끌어올렸습니다. 매일 쓰던 학사시스템을 이제는 만드는 쪽에서 일하고 싶어 지원했습니다.",
  },
  {
    question: "네. 이력서 보니까 Spring MVC는 Beginner로 적으셨고, 프로젝트는 대부분 Python, Next.js던데요. 저희는 Java 기반 SI입니다. Java는 실제로 어디까지 해 보셨어요?",
    answer: "솔직히 실무 경험은 없습니다. 수업에서 JSP·Servlet 게시판과 스프링 MVC로 CRUD까지 해 봤고, 지금은 전자정부 프레임워크로 수강신청 예제를 만들고 있습니다. 프로젝트에서 고민한 트랜잭션과 데이터 모델링은 Java에서도 그대로 쓸 수 있다고 생각합니다.",
  },
  {
    question: "수강신청 예제를 만든다고 하셨으니 바로 확인해 볼게요. 신청 저장이랑 인원 증가, 트랜잭션은 어디에 거셨어요?",
    answer: "서비스 메서드에 걸었습니다. 신청 저장과 인원 증가가 하나의 업무라서, 하나만 실패해도 둘 다 롤백되도록 매퍼가 아니라 서비스 단위로 묶었습니다.",
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
    question: "자소서에 칸반 카드를 동시에 옮기면 화면마다 결과가 달랐다고 쓰셨죠. 쇼핑몰 리뉴얼 때 그 문제, 어떻게 푸셨어요?",
    answer: "원인은 서버에 기준이 없다는 거였습니다. 카드에 버전 값을 두고, 서버가 버전을 확인한 뒤 확정된 순서만 브로드캐스트하게 바꿨습니다. 충돌한 요청은 최신 상태를 다시 받아 화면을 맞췄습니다.",
  },
  {
    question: "버전으로 막으셨으면 낙관적 락이네요. 비관적 락은 왜 안 쓰셨어요?",
    answer: "카드 이동은 충돌이 드물고 자주 일어나서, 매번 잠그면 대기 시간이 더 손해라고 봤습니다. 다만 정원이나 금액처럼 절대 틀리면 안 되는 데이터라면 DB 제약이나 비관적 락을 쓰겠습니다.",
  },
  {
    question: "방금 정원 얘기를 하셨으니 이어서 갈게요. SQLD도 있으시고요. 정원 30명 강의에 마지막 한 자리를 두고 100명이 동시에 신청합니다. 어떻게 막으시겠어요?",
    answer: "조회하고 비교한 뒤 저장하면 그 사이에 다른 요청이 끼어듭니다. 그래서 '인원이 정원보다 작을 때만 1 증가'하는 조건부 UPDATE 한 번으로 판단하고, 영향받은 행이 0이면 마감 처리하겠습니다. 중복 신청은 학번과 강의 번호 유니크 제약으로 막겠습니다.",
  },
  {
    question: "DB는 그렇게 지킨다 치고요. 신청 시작 순간에 트래픽이 몰리면 DB 앞단에서는 뭘 하시겠어요?",
    answer: "신청 요청은 대기열로 받아 순번을 보여주고 순서대로 처리하겠습니다. 최종 판단은 계속 DB가 하고, 강의 목록 같은 읽기 요청은 캐시로 분리하겠습니다.",
  },
  {
    question: "이력서에 해커톤 팀장, 10일 만에 MVP라고 있던데요. 분명 잘라낸 기능이 있었을 텐데, 가장 아까웠던 것 하나와 자른 이유를 말씀해 주세요.",
    answer: "멘토가 학습자료에 손글씨로 피드백하는 기능이 가장 아까웠습니다. 하지만 심사 기준이 '실제로 동작하는가'여서, 계획부터 피드백까지 핵심 흐름을 먼저 완성하고 손글씨는 발표에서 로드맵으로 보여드렸습니다.",
  },
  {
    question: "SI는 요구가 자주 바뀝니다. 오픈 2주 전에 대학 담당자가 성적 조회 화면을 통째로 바꿔 달라고 하면 어떻게 하시겠어요?",
    answer: "먼저 왜 바꾸고 싶은지부터 확인하겠습니다. 화면 전체 문제인지 특정 정보가 안 보이는 문제인지에 따라 공수가 크게 다르기 때문입니다. 그다음 오픈 전 최소 수정안과 오픈 후 2차 반영안으로 나눠 합의하고, 합의한 내용은 문서로 남기겠습니다.",
  },
  {
    question: "마지막 질문입니다. 자소서 지원동기에 수강신청 장바구니 얘기를 쓰셨던데, 아카넷 개발자라면 그거 어떻게 고치시겠어요?",
    answer: "장바구니에 담는 순간 시간표 충돌과 선수과목 조건을 미리 검사해 보여주겠습니다. 신청 직전에 실패하는 일이 줄면, 신청 순간의 트래픽과 문의도 함께 줄어든다고 생각합니다.",
  },
  {
    question: "네, 측정 방법까지 바로 설명하신 점이 인상적이었고, Java 실무는 입사 후 빠르게 채워야 할 부분으로 보입니다. 마지막으로 궁금한 점 있으세요?",
    answer: "신입 개발자가 입사 후 aXis Platform에 익숙해지기까지 보통 어떤 과정을 거치는지 궁금합니다.",
  },
];

export function isDemoScriptJobPayload(jobPayload: unknown): boolean {
  if (!jobPayload || typeof jobPayload !== "object") return false;
  const record = jobPayload as Record<string, unknown>;
  if (record.demoScript === "acanet-2026-web") return true;
  return /아카넷|acanet/i.test(String(record.company ?? ""));
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
