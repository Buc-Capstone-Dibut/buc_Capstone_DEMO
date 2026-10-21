import { CAREER_DEMO_FULL_COVER_LETTER, identifyCareerDemoProjectText, type CareerDemoProjectKind } from "./persona";

type ProjectKind = CareerDemoProjectKind;
type Stage = "direction" | "draft" | "refine" | "confirm";
type Evidence = {
  kind: ProjectKind;
  name: string;
  focus: string;
  problem: string;
  action: string;
  /** A concrete technical judgment behind the action. */
  detail: string;
  result: string;
  lesson: string;
  /** Noun phrase ending in "경험" for one-line references. */
  summary: string;
  /** Self-contained two-sentence brief (context + outcome) for intro/strength answers. */
  highlight: string;
  /** One sentence on aligning the team, used as supporting evidence in teamwork answers. */
  teamwork: string;
  /** One sentence on how the experience maps onto the Acanet posting. */
  fit: string;
};

// Prepared wording for the persona's three projects, framed for the Acanet Java web posting.
// Never ship private resume snapshots, attachments or account IDs here.
const EVIDENCE: Record<ProjectKind, Evidence> = {
  hello: {
    kind: "hello",
    name: "헬로프렌즈",
    focus: "데이터 정합성과 근거 검증",
    problem:
      "㈜헬로프렌즈의 외국인 행정·비자 플랫폼 Vizabridge에서는 비자 안내문·법령·FAQ가 스캔 PDF와 표, 여러 언어로 흩어져 있어 같은 문의가 반복되고 있었습니다.",
    action:
      "저는 문서 약 1,200건을 정제해 의미 단위로 나누고 pgvector에 적재한 뒤, 상담 로그에서 뽑은 질문 150개로 평가셋을 만들어 오답 원인을 추적했습니다. 개정 전 문서가 근거로 쓰이는 문제를 확인하고, 시행일 메타데이터로 최신 문서를 우선 검색하도록 바꿨습니다.",
    detail:
      "유사도가 임계값보다 낮으면 답을 지어내지 않고 담당자에게 넘기도록 설계했는데, 행정 서비스에서는 틀린 답보다 모른다고 말하는 편이 더 안전하다고 판단했기 때문입니다.",
    result:
      "그 결과 근거 일치율을 약 87%(150문항 중 131문항)까지 끌어올리고, 평균 응답 시간도 3초 이내로 유지했습니다.",
    lesson:
      "모델보다 데이터의 정합성과 검증 기준이 서비스 품질을 결정한다는 것을 배웠고, SQLD를 준비하며 익힌 정규화·트랜잭션 개념이 실제 판단 기준이 됐습니다.",
    summary:
      "헬로프렌즈 Vizabridge에서 행정 문서 약 1,200건을 정제하고 근거 일치율을 약 87%까지 끌어올린 경험",
    highlight:
      "청년미래일경험으로 참여한 ㈜헬로프렌즈 Vizabridge 프로젝트에서 행정 문서 약 1,200건을 정제하고, 상담 로그 기반 평가셋 150문항으로 오답 원인을 추적했습니다. 개정 전 문서가 근거로 쓰이던 문제를 시행일 기준 검색으로 바로잡아 근거 일치율을 약 87%까지 끌어올리고, 평균 응답도 3초 이내로 유지했습니다.",
    teamwork:
      "헬로프렌즈 프로젝트에서도 상담 담당자와 함께 정답 근거를 표시하며 평가 기준부터 맞췄습니다.",
    fit: "대학 행정 데이터를 정확하게 다뤄야 하는 아카넷의 업무와 맞닿아 있습니다.",
  },
  tiny: {
    kind: "tiny",
    name: "티니타이거",
    focus: "실시간 데이터 정합성",
    problem:
      "청년미래일경험으로 참여한 ㈜에쉬 티니타이거 쇼핑몰 리뉴얼 프로젝트에서 문서·칸반·메시지를 한곳에서 관리하는 협업 워크스페이스를 만들었는데, 두 사람이 같은 카드를 동시에 옮기면 화면마다 결과가 달라지는 문제가 있었습니다.",
    action:
      "클라이언트 상태만 맞추는 대신 서버에 기준을 두기로 하고, 카드에 버전 값을 둬 서버가 확정한 순서만 브로드캐스트하도록 구조를 바꿨습니다. 충돌한 요청은 최신 상태를 다시 받아 화면을 맞추게 했습니다.",
    detail:
      "카드 이동은 충돌이 드물고 짧게 자주 일어나는 작업이라, 매번 잠그는 비관적 락 대신 버전을 비교하는 낙관적 방식을 선택했습니다.",
    result:
      "멤버 권한별 접근 범위까지 정리하면서, 팀이 회의 전에 진행 상황을 확인하는 시간이 눈에 띄게 줄었습니다.",
    lesson:
      "같은 데이터를 모든 사용자에게 같은 모습으로 보여주려면 화면보다 서버의 기준과 데이터 흐름을 먼저 설계해야 한다는 것을 배웠습니다.",
    summary:
      "티니타이거 협업 워크스페이스에서 버전 기반 낙관적 업데이트로 칸반 데이터의 실시간 정합성을 지킨 경험",
    highlight:
      "㈜에쉬 티니타이거 쇼핑몰 리뉴얼 프로젝트에서는 두 사람이 같은 칸반 카드를 동시에 옮기면 화면마다 결과가 달라지는 문제를 맡았습니다. 카드에 버전 값을 두고 서버가 확정한 순서만 브로드캐스트하도록 바꿔, 모든 팀원이 같은 화면을 보게 만들었습니다.",
    teamwork:
      "티니타이거 프로젝트에서도 권한별 접근 범위와 갱신 시점을 팀과 먼저 합의해 모두가 같은 화면을 보도록 만들었습니다.",
    fit: "수천 명이 같은 순간에 접속하는 학사시스템 개발에 그대로 이어질 수 있다고 생각합니다.",
  },
  blavers: {
    kind: "blavers",
    name: "블레이버스",
    focus: "우선순위 합의와 팀 리딩",
    problem:
      "제4회 블레이버스 MVP 개발 해커톤에서는 PM·디자이너·개발자로 구성된 팀의 팀장을 맡아, 10일 안에 멘티와 멘토 두 사용자군의 학습 관리 흐름을 모두 완성해야 했습니다.",
    action:
      "데모 효과가 큰 손글씨 피드백 기능은 다음 단계로 미루고, '계획 → 학습 → 피드백' 핵심 흐름부터 완성하도록 팀과 범위를 합의했습니다. 저는 Next.js와 Supabase로 역할별 화면과 데이터 모델을 직접 구현했습니다.",
    detail:
      "멘티·멘토 화면은 route group으로 나누고 알림·피드백·북마크 스키마를 먼저 확정해, 팀원들이 서로를 기다리지 않고 병렬로 작업할 수 있게 했습니다.",
    result: "그 결과 멘토링 플랫폼 '몽구리' MVP를 Vercel에 배포하고 본선에 진출했습니다.",
    lesson:
      "일정이 촉박할수록 범위와 우선순위를 먼저 합의하는 것이 팀 전체의 속도를 높인다는 것을 배웠습니다.",
    summary: "블레이버스 해커톤에서 팀장으로 범위를 합의하고 10일 만에 MVP를 배포해 본선에 진출한 경험",
    highlight:
      "제4회 블레이버스 MVP 개발 해커톤에서는 팀장을 맡아, 데모 효과가 큰 기능보다 '계획 → 학습 → 피드백' 핵심 흐름을 먼저 완성하도록 범위를 합의했습니다. 그 결과 10일 만에 멘토링 플랫폼 '몽구리' MVP를 배포하고 본선에 진출했습니다.",
    teamwork:
      "블레이버스 해커톤에서도 직군이 다른 팀원들과 구현 범위를 먼저 합의해 10일 안에 MVP를 완성했습니다.",
    fit: "고객 요구가 자주 바뀌는 대학 SI 현장에서 큰 힘이 될 것이라 생각합니다.",
  },
};

const ALL_KINDS: ProjectKind[] = ["hello", "tiny", "blavers"];

/** All three prepared evidence entries, used when the selection cannot be matched. */
export function getAllCareerDemoEvidence(): Evidence[] {
  return ALL_KINDS.map((kind) => EVIDENCE[kind]);
}

export function identifyCareerDemoProject(value: unknown): ProjectKind | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return (
    identifyCareerDemoProjectText(record.company) ??
    identifyCareerDemoProjectText(record.title) ??
    identifyCareerDemoProjectText(record.name)
  );
}

export function selectCareerDemoProjects(timeline: unknown, ids: unknown): Evidence[] {
  if (!Array.isArray(timeline) || !Array.isArray(ids)) return [];
  const selectedIds = new Set(ids.filter((id): id is string => typeof id === "string"));
  const seen = new Set<ProjectKind>();
  return timeline.flatMap((record) => {
    if (!record || typeof record !== "object" || !selectedIds.has(record.id)) return [];
    const kind = identifyCareerDemoProject(record);
    if (!kind || seen.has(kind)) return [];
    seen.add(kind);
    return [EVIDENCE[kind]];
  });
}

type DemoRequest = {
  messages?: unknown;
  selectedQuestion?: { id?: unknown; title?: unknown; maxChars?: unknown };
  currentAnswer?: unknown;
  operation?: unknown;
  workflowStage?: unknown;
};

/**
 * The resume AI assistant posts without a question, operation or workflow stage and renders the
 * raw stream, so it gets the plain full letter instead of the wizard protocol.
 */
export function isCareerDemoPlainCoverLetterRequest(body: DemoRequest): boolean {
  return body.operation === undefined && body.workflowStage === undefined && !body.selectedQuestion;
}

export function buildCareerDemoFullCoverLetter() {
  return { content: CAREER_DEMO_FULL_COVER_LETTER, protocol: "" };
}

/** A two-paragraph project story (STADRI builder) for whichever project the memo mentions. */
export function buildCareerDemoProjectStory(text: unknown): string {
  const evidence = EVIDENCE[identifyCareerDemoProjectText(text) ?? "hello"];
  return `${evidence.problem} ${evidence.action}\n\n${evidence.result} ${evidence.lesson} 이 경험은 ${evidence.fit}`;
}

function latestUserMessage(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user" && typeof message.content === "string") {
      return message.content.slice(0, 5000);
    }
  }
  return "";
}

function classifyQuestion(title: string) {
  if (/지원.?동기|motivation/i.test(title)) return "motivation";
  if (/포부|목표|career-goal/i.test(title)) return "goal";
  if (/장점|단점|강점|약점|strength/i.test(title)) return "strength";
  if (/성장.?과정|가치관|growth/i.test(title)) return "growth";
  if (/갈등|conflict/i.test(title)) return "conflict";
  if (/협업|팀워크|소통|collaboration/i.test(title)) return "collaboration";
  if (/도전|어려움|문제.?해결|challenge/i.test(title)) return "challenge";
  if (/대표|프로젝트|project/i.test(title)) return "project";
  if (/자기.?소개|self-introduction/i.test(title)) return "introduction";
  return "competency";
}

function namedProject(projects: Evidence[], text: string): Evidence | undefined {
  return projects.find((project) => text.includes(project.name))
    ?? projects.find((project) => identifyCareerDemoProjectText(text) === project.kind);
}

function chooseEvidence(projects: Evidence[], question: string, prompt: string): Evidence {
  const named = namedProject(projects, prompt);
  if (named) return named;
  const preferred: ProjectKind[] =
    question === "collaboration" || question === "conflict"
      ? ["blavers", "tiny", "hello"]
      : question === "project" || question === "challenge"
        ? ["tiny", "hello", "blavers"]
        : ["hello", "tiny", "blavers"];
  return preferred.map((kind) => projects.find((project) => project.kind === kind)).find(Boolean)!;
}

/** Keep complete sentences, paragraph breaks and the form's character ceiling. */
export function fitCareerDemoAnswer(text: string, maxChars: number): string {
  const normalized = text.trim().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  if (normalized.length <= maxChars) return normalized;
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split(/(?<=[.!?。])\s+|\n+/u).map((sentence) => sentence.trim()).filter(Boolean));
  let result = "";
  for (const sentences of paragraphs) {
    let paragraphStarted = false;
    for (const sentence of sentences) {
      const separator = !result ? "" : paragraphStarted ? " " : "\n\n";
      const next = `${result}${separator}${sentence}`;
      if (next.length <= maxChars) {
        result = next;
        paragraphStarted = true;
      }
    }
  }
  if (result) return result;
  const short = "데이터의 근거를 끝까지 확인하는 개발자입니다.";
  return short.length <= maxChars ? short : "근거를 확인하는 개발자입니다.";
}

function buildDraft(question: string, evidence: Evidence, projects: Evidence[], refined: boolean): string {
  const opening = refined
    ? "제가 개발에서 가장 중요하게 여기는 기준은 데이터가 정확한지, 그리고 그 근거를 설명할 수 있는지입니다."
    : "저는 데이터의 근거를 끝까지 확인하는 습관으로 문제를 풀어 온 개발자입니다.";
  const story = [evidence.problem, evidence.action, evidence.result].join(" ");
  const secondary = projects.find((project) => project.kind !== evidence.kind);

  switch (question) {
    case "motivation":
      return `수강신청 날마다 장바구니에 담아 둔 과목이 시간표에서 겹친다는 사실을 신청 직전에야 알게 되곤 했습니다. 그때마다 이 검사를 장바구니 단계에서 미리 해 줄 수는 없을까 생각했습니다. 학생 수천 명이 같은 순간에 같은 화면을 쓰는 학사시스템은, 작은 불편 하나도 수천 번 반복된다는 점에서 가장 영향력 큰 서비스라고 생각합니다.\n\n아카넷은 대학 통합정보시스템(URP/CRP)과 자체 프레임워크 aXis Platform으로 학사·학생·취업 데이터를 하나의 흐름으로 연결하고 있습니다. ${evidence.summary}은 ${evidence.fit} 특히 SQLD와 정보처리산업기사를 준비하며 익힌 정규화·트랜잭션 개념을, 학사 데이터를 직접 다루는 현장에서 제대로 써 보고 싶습니다.\n\n사용자로 느꼈던 불편을 개발자로 직접 고치는 첫 회사가 아카넷이기를 바랍니다.`;
    case "goal":
      return `입사 전부터 전자정부 표준프레임워크로 수강신청 예제를 직접 구현하며 서비스 계층 트랜잭션과 MyBatis 매퍼 구조를 공부하고 있습니다. 수습 3개월 동안에는 aXis Platform의 구조와 대학 업무 흐름을 빠르게 익히고, 기존 대학 사이트 유지보수 업무에서 장애 원인을 문서로 남기는 습관부터 들이겠습니다. 1년 안에는 학사 업무 한 모듈을 요구사항 분석부터 화면·DB 설계, 테스트까지 책임지는 개발자가 되겠습니다.\n\n${evidence.summary}을 살려, 문제를 데이터로 확인하고 근거를 기록으로 남기는 방식을 아카넷에서도 지키겠습니다.\n\n3년 뒤에는 수강신청 장바구니 단계의 시간표 충돌·선수과목 사전 검사처럼, 학생으로서 겪었던 불편을 데이터로 증명하고 고치는 개선안을 먼저 제안하는 개발자가 되겠습니다. 그 개선이 학생 수천 명의 시간을 아끼는 일이라는 것을 누구보다 잘 알기 때문입니다.`;
    case "collaboration":
      return `협업에서 가장 중요하게 생각하는 것은 모든 팀원이 같은 기준과 같은 화면을 보게 만드는 일입니다. ${evidence.problem}\n\n${evidence.action} ${evidence.result}\n\n${evidence.lesson}${secondary ? ` ${secondary.teamwork}` : ""} 요구가 자주 바뀌는 SI 현장에서도 범위와 우선순위를 먼저 합의하고, 합의한 내용을 문서로 남기는 팀원이 되겠습니다.`;
    case "conflict":
      return `의견이 부딪힐 때는 각자의 선호보다 사용자에게 꼭 필요한 흐름과 일정의 제약을 함께 놓고 이야기하려고 합니다. ${evidence.problem}\n\n${evidence.action} ${evidence.result}\n\n${evidence.lesson}${secondary ? ` ${secondary.teamwork}` : ""} 아카넷에서도 결정의 근거를 공유하고, 고객(대학) 현업의 언어로 문제를 다시 정의하며 협업하겠습니다.`;
    case "strength":
      return `저의 강점은 데이터의 근거를 끝까지 확인하는 습관입니다. ${evidence.highlight}\n\n반면 처음부터 완벽한 구조를 만들려다 일정이 빠듯해진 적이 있습니다. 그래서 지금은 핵심 요구사항과 검증 기준을 먼저 정리하고, 진행 상황을 팀과 짧은 주기로 공유하며 개발합니다.\n\n${evidence.lesson} 아카넷에서도 근거를 확인하는 꼼꼼함과 일정을 지키는 균형을 함께 갖춘 개발자가 되겠습니다.`;
    case "growth":
      return `학과 수업에서 JSP·Servlet으로 게시판을 만들 때만 해도 좋은 개발의 기준은 '동작하는 기능'이었습니다. 실무 프로젝트를 거치며 그 기준은 '사용자와 팀이 믿을 수 있는 데이터'로 바뀌었습니다.\n\n${story}\n\n이후 기술을 고르기 전에 해결할 문제와 데이터의 흐름부터 확인하는 태도가 생겼습니다. 아카넷에서도 구현의 이유를 설명하고 동료의 피드백을 반영하며 성장하겠습니다.`;
    case "challenge":
      return `어려운 문제를 만나면 결과에 영향을 주는 데이터와 처리 흐름부터 확인합니다. ${evidence.problem}\n\n${evidence.action} ${evidence.detail} ${evidence.result}\n\n${evidence.lesson} 아카넷에서도 운영 이슈가 생기면 원인을 재현하고 근거를 남기며 끝까지 해결하겠습니다.`;
    case "project":
      return `${evidence.problem}\n\n${evidence.action} ${evidence.detail} ${evidence.result}\n\n${evidence.lesson} 이 경험은 ${evidence.fit}`;
    case "introduction":
      return `데이터의 근거를 끝까지 확인하는 개발자 김정환입니다. 부천대학교 컴퓨터소프트웨어과 졸업을 앞두고 있으며, SQLD와 정보처리산업기사를 취득했습니다.\n\n${evidence.highlight}${secondary ? ` 또한 ${secondary.summary}도 있습니다.` : ""}\n\n학생으로서 매일 쓰던 학사시스템을 이제는 만드는 쪽에서, 아카넷의 대학 통합정보시스템에 기여하고 싶습니다.`;
    default:
      return `${opening} ${evidence.problem}\n\n${evidence.action} ${evidence.detail} ${evidence.result}\n\n${evidence.lesson}${secondary ? ` ${secondary.name} 프로젝트에서는 ${secondary.focus} 경험도 쌓았습니다.` : ""} 아카넷에서도 학사 데이터의 정합성을 먼저 확인하는 개발자가 되겠습니다.`;
  }
}

function protocol(stage: Stage, answer = "", ready = false): string {
  const quality = answer ? "ok" : "need";
  return `<dibut_state>\nstage=${stage}\ncompetency=${quality}\ntone=${quality}\nimpact=${quality}\nready=${ready ? "yes" : "no"}\n</dibut_state>\n<dibut_answer>${answer}</dibut_answer>`;
}

export function buildCareerDemoReply(body: DemoRequest, projects: Evidence[]) {
  if (!projects.length) projects = getAllCareerDemoEvidence();
  const title = typeof body.selectedQuestion?.title === "string" && body.selectedQuestion.title.trim()
    ? body.selectedQuestion.title.trim().slice(0, 200) : "직무 역량";
  const prompt = latestUserMessage(body.messages);
  const question = classifyQuestion(title);
  const currentAnswer = typeof body.currentAnswer === "string" ? body.currentAnswer.trim().slice(0, 10000) : "";
  const isIntro = body.operation === "intro";
  // The intro prompt lists every selected project, so it must not pick the evidence.
  const requestsProjectSwitch = !isIntro && Boolean(namedProject(projects, prompt));
  const evidence = chooseEvidence(projects, question, isIntro ? "" : requestsProjectSwitch ? prompt : currentAnswer || prompt);
  const projectNames = projects.map((project) => project.name).join("·");
  const rawLimit = body.selectedQuestion?.maxChars;
  const fieldLimit = typeof rawLimit === "number" && Number.isFinite(rawLimit)
    ? Math.max(40, Math.min(3000, Math.floor(rawLimit))) : 700;
  const requestedLimit = prompt.match(/(\d{2,4})\s*자/)?.[1];
  const concise = /짧게|간결|줄여|줄이|요약/.test(prompt);
  const maxChars = Math.min(fieldLimit, requestedLimit ? Math.max(40, Number(requestedLimit)) : concise ? 350 : fieldLimit);

  if (isIntro) {
    return {
      content: `안녕하세요, 디벗 AI 자소서 컨설팅입니다. ㈜아카넷 웹개발자(Java) 신입 공고와 ${projectNames} 프로젝트를 바탕으로 ‘${title}’ 문항을 함께 작성하겠습니다.\n\n이 공고는 대학 통합정보시스템(URP/CRP)을 Java·전자정부 표준프레임워크로 개발하는 포지션으로, 데이터 정합성과 SQL 활용 능력, 요구사항 분석이 핵심이고 SQLD 보유자를 우대합니다. 이번 문항은 ${evidence.name}의 ${evidence.focus} 경험을 중심으로 풀어내면 공고와 가장 잘 맞습니다.\n\n이 경험을 중심으로 작성할까요? 더 강조하고 싶은 프로젝트나 역량이 있으면 말씀해 주세요. 바로 초안을 요청하셔도 됩니다.`,
      protocol: protocol("direction"),
    };
  }

  const explicitlyDraft = /초안|작성해|써\s*줘|써주세요|만들어|바로\s*작성/.test(prompt);
  if (body.workflowStage === "direction" && !explicitlyDraft && !currentAnswer && body.operation !== "tone" && body.operation !== "fit-length") {
    return {
      content: `‘${title}’ 문항은 ${evidence.name} 경험을 중심으로 구성하겠습니다.\n\n${evidence.problem} ${evidence.action}\n\n여기서 ${evidence.focus} 역량을 강조하고, 결과와 배운 점을 아카넷 공고의 핵심인 학사 데이터 처리·요구사항 분석 역량과 연결하겠습니다. 수치는 측정 방법까지 설명할 수 있는 것만 담고, 직접 맡은 작업과 판단이 드러나는 담백한 문체로 쓰겠습니다.\n\n이 방향으로 ${maxChars}자 이내의 초안을 작성해 드릴까요?`,
      protocol: protocol("draft"),
    };
  }

  const refine = body.operation === "tone" || body.workflowStage === "refine";
  const fitLength = body.operation === "fit-length" || concise || /글자\s*수|분량|\d+\s*자/.test(prompt) && Boolean(currentAnswer);
  const confirm = body.workflowStage === "confirm" || /최종|확정|제출/.test(prompt);
  let draft = buildDraft(question, evidence, projects, refine);
  // Preserve the user's applied/edited answer when refining it. Project-switch requests
  // intentionally rebuild from the named, selected evidence instead.
  if (currentAnswer && (refine || fitLength || confirm) && !requestsProjectSwitch) {
    draft = currentAnswer
      .replace(/(?:정말|매우|굉장히)\s+/g, "")
      .replace(/했어요\./g, "했습니다.")
      .replace(/배웠어요\./g, "배웠습니다.")
      .replace(/\n{3,}/g, "\n\n");
    if (refine && !fitLength && !confirm && !draft.includes("아카넷")) {
      draft += " 아카넷에서도 데이터의 정합성을 먼저 확인하며 신뢰할 수 있는 기능을 만들겠습니다.";
    }
  }
  if (/첫\s*문장|도입부/.test(prompt)) {
    const opening = question === "motivation"
      ? "매일 쓰던 학사시스템을, 이제는 만드는 쪽에서 더 낫게 만들고 싶습니다."
      : "저는 데이터의 근거를 끝까지 확인하고, 그 이유를 설명할 수 있는 개발자입니다.";
    draft = opening + " " + draft.replace(/^[\s\S]*?[.!?。](?:\s+|$)/u, "");
  }
  const answer = fitCareerDemoAnswer(draft, maxChars);
  const ready = confirm && Boolean(currentAnswer);
  const description = confirm
    ? "공고와의 연결, 경험 근거, 문장 흐름과 분량을 최종 점검했습니다."
    : fitLength
      ? `핵심 경험과 수치는 유지하면서 ${maxChars}자 이내로 정리했습니다.`
      : refine
        ? "직접 수행한 작업과 판단, 아카넷 공고와의 연결이 더 잘 드러나도록 문장을 다듬었습니다."
        : `${evidence.name} 경험을 중심으로 ‘${title}’ 초안을 작성했습니다.`;
  return {
    content: `${description}\n\n${answer}\n\n현재 ${answer.length}자입니다. ‘적용하기’를 누르면 이 문항의 답안으로 반영됩니다.`,
    protocol: protocol(ready ? "confirm" : "refine", answer, ready),
  };
}
