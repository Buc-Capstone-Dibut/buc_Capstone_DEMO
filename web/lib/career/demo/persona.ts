// Shared copy for the presentation persona. Every career demo response reads from here so the
// numbers (≈1,200건, 87% = 131/150, 3초 이내, 10일 MVP) stay identical across features.

export const CAREER_DEMO_PERSONA = {
  name: "김정환",
  headline: "데이터의 근거를 끝까지 확인하는 신입 웹 개발자",
  school: "부천대학교",
  major: "컴퓨터소프트웨어과",
  educationStart: "2024-03",
  educationEnd: "2027-02",
  certifications: [
    { name: "SQLD", issuer: "한국데이터산업진흥원", date: "2026.06" },
    { name: "정보처리산업기사", issuer: "한국산업인력공단", date: "2026.09" },
  ],
} as const;

export type CareerDemoProjectKind = "hello" | "tiny" | "blavers";

/** Recognise one of the persona's three projects from a title/company/name string. */
export function identifyCareerDemoProjectText(text: unknown): CareerDemoProjectKind | null {
  if (typeof text !== "string") return null;
  if (/헬로프렌즈|vizabridge|비자/i.test(text)) return "hello";
  // 같은 프로젝트가 이력서에는 "협업 워크스페이스", "멘토-멘티 플랫폼" 같은 다른 이름으로 저장돼 있다.
  if (/티니타이거|에쉬|tiny\s*tiger|협업\s*워크스페이스|칸반/i.test(text)) return "tiny";
  if (/블레이버스|몽구리|monguri|해커톤|멘토|멘티/i.test(text)) return "blavers";
  return null;
}

/** Full four-section cover letter (plain text, no protocol) for the one-shot generator. */
export const CAREER_DEMO_FULL_COVER_LETTER = `[지원동기] 매일 쓰던 학사시스템을, 이제는 만드는 쪽에서

수강신청 날마다 장바구니에 담아 둔 과목이 시간표에서 겹친다는 사실을 신청 직전에야 알게 되곤 했습니다. 학생 수천 명이 같은 순간에 같은 화면을 쓰는 학사시스템은, 작은 불편 하나도 수천 번 반복된다는 점에서 개발자가 만들 수 있는 가장 영향력 큰 서비스라고 생각했습니다.
아카넷은 대학 통합정보시스템(URP/CRP)과 자체 프레임워크 aXis Platform으로 학사·학생·취업 데이터를 하나의 흐름으로 연결하고 있습니다. 저는 고용노동부 청년미래일경험에서 흩어진 행정 문서를 정제해 근거 있는 답변으로 연결하는 일을 했고, 이 경험이 대학 행정 데이터를 다루는 아카넷의 업무와 맞닿아 있다고 확신해 지원했습니다. 사용자로 느꼈던 불편을 개발자로 직접 고치는 첫 회사가 아카넷이기를 바랍니다.

[직무역량] 데이터의 근거를 끝까지 확인하는 습관

㈜헬로프렌즈의 외국인 행정·비자 플랫폼 Vizabridge에서 RAG 기반 AI 어시스턴트를 구축했습니다. 비자 안내문·법령·FAQ는 스캔 PDF, 표, 다국어가 뒤섞여 있어 그대로는 검색이 되지 않았습니다. 문서 약 1,200건을 정제하고 의미 단위로 청킹해 pgvector에 적재했지만, 처음 측정한 근거 일치율은 기대에 못 미쳤습니다.
원인을 찾기 위해 상담 로그에서 자주 나온 질문 150개로 평가셋을 만들고 담당자와 함께 정답 근거를 표시했습니다. 오답 대부분이 개정 전 문서를 근거로 삼은 경우라는 걸 확인하고, 문서에 시행일 메타데이터를 넣어 최신 문서를 우선 검색하게 했습니다. 유사도가 낮으면 답을 지어내지 않고 담당자에게 넘기도록 설계해, 근거 일치율 약 87%와 평균 응답 3초 이내를 달성했습니다.
SQLD와 정보처리산업기사를 준비하며 익힌 정규화·트랜잭션 개념은 이 과정에서 실제 판단 기준이 됐습니다. 아카넷에서도 학사 데이터의 정합성을 먼저 확인하는 개발자가 되겠습니다.

[문제해결·협업] 같은 화면을 보게 만드는 일

청년미래일경험 ㈜에쉬 티니타이거 쇼핑몰 리뉴얼 프로젝트에서 팀이 문서·칸반·메시지를 한곳에서 관리하는 협업 워크스페이스를 개발했습니다. 두 사람이 같은 카드를 동시에 옮기면 소켓 이벤트 순서에 따라 화면마다 결과가 달라지는 문제가 생겼습니다.
클라이언트 상태만 맞추는 대신 서버에 기준을 두기로 하고, 카드에 버전 값을 둬 서버가 확정한 순서만 브로드캐스트하도록 바꿨습니다. 충돌한 요청은 최신 상태를 다시 받아 화면을 맞추게 했고, 회의 전 진행 상황을 확인하는 시간이 눈에 띄게 줄었습니다.
제4회 블레이버스 MVP 개발 해커톤에서는 PM·디자이너·개발자로 구성된 팀의 팀장을 맡았습니다. 10일 안에 멘티와 멘토 두 사용자군의 흐름을 모두 만들어야 했기에, 데모 효과가 큰 손글씨 피드백 기능을 과감히 미루고 '계획 → 학습 → 피드백' 핵심 흐름부터 완성했습니다. 그 결과 MVP를 Vercel에 배포해 본선에 진출했습니다. 요구가 자주 바뀌는 SI 현장에서도 범위와 우선순위를 먼저 합의하는 팀원이 되겠습니다.

[입사 후 포부] 3개월, 1년, 3년

수습 3개월 동안 Java·스프링과 전자정부 표준프레임워크, aXis Platform의 구조를 빠르게 익히고, 기존 대학 사이트 유지보수 업무에서 장애 원인을 문서로 남기는 습관부터 들이겠습니다. 1년 안에는 학사 업무 한 모듈을 요구사항 분석부터 화면·DB 설계, 테스트까지 책임지는 개발자가 되겠습니다. 3년 뒤에는 수강신청 장바구니 단계의 시간표 충돌·선수과목 사전 검사처럼, 학생으로서 겪었던 불편을 데이터로 증명하고 고치는 개선안을 먼저 제안하는 개발자가 되겠습니다.`;
