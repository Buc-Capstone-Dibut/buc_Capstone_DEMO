// 아카넷 시연 면접 대본의 (면접관 질문 → 지원자 답변) 쌍. 원본은
// ai-interview/app/interview/domain/demo_script.py 이며 demo-script.test.ts 가 두 파일이 같은지 검사한다.
// 콘솔 면접 코치(interviewCoach)가 현재 질문의 모범답변으로 이 답변을 보여준다.

export const DEMO_SCRIPT_PAIRS: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "안녕하세요, 김정환 지원자님. 아카넷 웹개발 직무 면접 시작하겠습니다. 긴장 푸시고요, 먼저 1분 정도로 자기소개 부탁드립니다.",
    answer: "안녕하세요, 데이터의 근거를 끝까지 확인하는 개발자 김정환입니다. 부천대학교 컴퓨터소프트웨어과 졸업을 앞두고 있고, SQLD와 정보처리산업기사를 취득했습니다. 고용노동부 청년미래일경험으로 외국인 비자 플랫폼 Vizabridge의 RAG 어시스턴트를 만들며 문서 1,200여 건을 정제해 근거 일치율을 87%까지 끌어올렸고, 쇼핑몰 리뉴얼 프로젝트에서는 칸반·메시지 협업 기능의 실시간 정합성 문제를 해결했습니다. 블레이버스 해커톤에서는 팀장으로 10일 만에 MVP를 배포해 본선에 진출했습니다. 학생으로서 매일 쓰는 학사시스템을 이제는 만드는 쪽에서, 아카넷의 대학 통합정보시스템에 기여하고 싶습니다.",
  },
  {
    question: "네, 감사합니다. 바로 짚고 넘어갈게요. 이력서 보면 Python, Next.js 쪽 경험이 대부분인데, 저희는 Java·스프링, 전자정부 프레임워크 기반 SI 회사입니다. Java는 솔직히 어느 수준이세요? 그리고 왜 굳이 Java 웹개발로 지원하셨어요?",
    answer: "솔직하게 말씀드리면 실무 프로젝트는 Python과 TypeScript가 중심이었습니다. Java는 학과 수업에서 객체지향과 JSP·Servlet 게시판, 스프링 MVC로 CRUD와 로그인까지 구현해 본 수준입니다. 다만 제가 프로젝트에서 실제로 고민한 건 언어보다 데이터 모델, 트랜잭션, API 경계였고, 이건 Java 환경에서도 그대로 쓰인다고 생각합니다. 대학·공공 시스템은 대부분 Java 기반이라, 제가 하고 싶은 도메인을 하려면 Java가 맞다고 판단해 지금 전자정부 표준프레임워크로 수강신청 예제를 따라 만들고 있습니다.",
  },
  {
    question: "전자정부 프레임워크 예제를 만들고 계신다고 했는데, 거기서 MyBatis 매퍼랑 서비스 계층 트랜잭션은 어디에 거셨어요?",
    answer: "서비스 구현체에 트랜잭션을 걸었습니다. 수강신청 저장과 신청 인원 증가가 하나의 작업이라, 매퍼 단위가 아니라 서비스 메서드 단위로 묶어야 중간에 실패해도 같이 롤백된다고 이해했습니다.",
  },
  {
    question: "좋습니다. Vizabridge 얘기로 가 볼게요. 근거 일치율 87%라고 쓰셨는데, 그 87%는 정확히 어떻게 측정한 거예요? 평가 데이터는 몇 건이고, 정답은 누가 만들었죠?",
    answer: "실제 상담 로그에서 자주 나온 질문 150개를 뽑아 평가셋을 만들었고, 정답 근거 문서는 헬로프렌즈 상담 담당자분과 함께 표시했습니다. 답변에 붙은 출처 문서가 담당자가 표시한 근거와 일치하면 정답으로 봤고, 150개 중 131개가 일치해서 약 87%였습니다.",
  },
  {
    question: "그럼 틀린 13%는요? 어떤 유형이었고, 그걸 그냥 두셨어요?",
    answer: "대부분 비자 종류는 맞는데 개정 전 안내문을 근거로 가져온 경우였습니다. 그래서 문서에 시행일 메타데이터를 넣고 최신 문서를 우선하도록 검색 단계에서 필터를 걸었고, 유사도 임계값 아래면 답을 만들지 않고 담당자 연결로 넘기도록 했습니다. 틀린 답을 하는 것보다 모른다고 하는 게 행정 서비스에서는 더 안전하다고 판단했습니다.",
  },
  {
    question: "쇼핑몰 리뉴얼 프로젝트에서 실시간 갱신 정합성 문제가 있었다고 하셨죠. 구체적으로 어떤 상황이었고, 어떻게 해결했는지 설명해 주세요.",
    answer: "두 사람이 같은 칸반 카드를 동시에 옮기면, 소켓 이벤트 도착 순서에 따라 화면마다 카드 위치가 달라지는 문제가 있었습니다. 처음에는 클라이언트 상태만 맞추려고 했는데 근본 원인은 서버에 기준이 없다는 거였습니다. 그래서 카드에 버전 값을 두고, 서버가 버전을 확인한 뒤 확정된 순서만 브로드캐스트하도록 바꿨습니다. 충돌하면 늦게 온 요청은 최신 상태를 다시 받아 화면을 맞추게 했습니다.",
  },
  {
    question: "그건 낙관적 락이네요. 비관적 락은 왜 안 쓰셨어요?",
    answer: "카드 이동은 충돌이 드물고 아주 짧게 자주 일어나서, 매번 잠그면 대기 시간이 더 손해라고 봤습니다. 반대로 충돌이 잦고 돈이나 정원처럼 절대 틀리면 안 되는 데이터라면 비관적 락이나 DB 제약이 맞다고 생각합니다.",
  },
  {
    question: "마침 그 얘기가 나왔네요. SQLD 있으시니까 물어볼게요. 수강신청에서 정원이 30명인 강의에 마지막 1자리를 두고 100명이 동시에 신청 버튼을 누릅니다. 정원 초과, 어떻게 막으시겠어요?",
    answer: "애플리케이션에서 인원을 조회하고 비교한 뒤 저장하면 그 사이에 다른 요청이 끼어들어 초과가 생깁니다. 그래서 판단을 DB 한 번의 원자적 연산으로 옮기겠습니다. 예를 들어 '신청 인원이 정원보다 작을 때만 1 증가'하는 조건부 UPDATE를 실행하고, 영향받은 행이 1이면 신청 내역을 저장하고 0이면 마감으로 처리합니다. 둘을 한 트랜잭션으로 묶고, 같은 학생의 중복 신청은 학번과 강의 번호 유니크 제약으로 막겠습니다.",
  },
  {
    question: "수강신청 시작 순간엔 트래픽이 몰려서 DB가 버티기 어려울 텐데요. DB 앞단에서는 뭘 하시겠어요?",
    answer: "신청 요청을 대기열로 받아 순서대로 처리하고, 사용자에게는 대기 순번을 보여주겠습니다. 정원 같은 최종 판단은 계속 DB가 하되, 강의 목록 조회 같은 읽기 요청은 캐시로 분리해 쓰기 요청이 DB를 쓰도록 하겠습니다.",
  },
  {
    question: "해커톤에서 팀장을 맡으셨죠. 10일이면 분명 잘라낸 기능이 있었을 텐데, 가장 아까웠던 기능 하나와 그걸 자른 판단 근거를 말씀해 주세요.",
    answer: "멘토가 학습자료에 바로 손글씨 피드백을 남기는 기능이 가장 아까웠습니다. 데모 임팩트는 컸지만, 심사 기준이 '창업 아이템이 실제로 동작하는가'였고, 멘티가 계획을 세우고 멘토가 피드백하는 기본 흐름이 끊기면 아무 의미가 없다고 판단했습니다. 그래서 텍스트 피드백으로 핵심 흐름을 먼저 완성하고, 손글씨는 발표 자료에서 다음 단계 로드맵으로 보여드렸습니다.",
  },
  {
    question: "SI는 고객 요구가 자주 바뀝니다. 오픈 2주 전에 대학 담당자가 \"성적 조회 화면 구조를 통째로 바꿔 달라\"고 하면 어떻게 하시겠어요?",
    answer: "먼저 바꾸고 싶은 이유를 확인하겠습니다. 실제로 필요한 게 화면 전체 변경인지, 특정 정보가 안 보이는 문제인지에 따라 공수가 크게 달라지기 때문입니다. 그다음 영향 범위와 일정 리스크를 정리해 팀장님께 공유하고, 오픈 범위 안에서 할 수 있는 최소 수정안과 오픈 이후 2차 반영안을 나눠 고객과 합의하겠습니다. 합의한 내용은 반드시 문서로 남기겠습니다.",
  },
  {
    question: "마지막 질문입니다. 학생으로서 학교 학사시스템을 쓰면서 가장 불편했던 점 하나, 그리고 아카넷 개발자라면 그걸 어떻게 고치겠어요?",
    answer: "수강신청 기간마다 장바구니에 담은 과목의 시간표 충돌을 신청 직전에야 알게 되는 점이 가장 불편했습니다. 저라면 장바구니 단계에서 시간표 충돌과 선수과목 조건을 미리 검사해 보여주겠습니다. 신청 순간의 트래픽과 실패 문의도 같이 줄일 수 있다고 생각합니다. 사용자로서 느낀 불편을 개발자로서 고치는 게 제가 아카넷에 지원한 이유입니다.",
  },
  {
    question: "네, 답변 잘 들었습니다. 수치를 어떻게 측정했는지 바로 설명하신 점이 인상적이었고, Java 실무 경험은 입사 후 빠르게 채워야 할 부분으로 보입니다. 마지막으로 궁금한 점 있으시면 하나 말씀해 주세요.",
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
