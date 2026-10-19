type ProjectKind = "hello" | "tiny" | "blavers";
type Stage = "direction" | "draft" | "refine" | "confirm";
type Evidence = {
  kind: ProjectKind;
  name: string;
  focus: string;
  problem: string;
  action: string;
  result: string;
  lesson: string;
};

// Prepared, qualitative wording for the agreed projects. Match against the owner's
// selected records; never ship private resume snapshots, attachments or account IDs.
const EVIDENCE: Record<ProjectKind, Evidence> = {
  hello: {
    kind: "hello", name: "헬로프렌즈", focus: "근거를 추적할 수 있는 데이터 처리",
    problem: "헬로프렌즈의 외국인 행정·비자 플랫폼에서는 안내 문서가 흩어져 같은 문의가 반복되는 문제가 있었습니다.",
    action: "저는 비자·행정 문서를 수집하고 정제한 뒤, Python과 LangChain으로 문서 검색부터 근거를 활용한 답변까지 이어지는 RAG 파이프라인을 구현했습니다.",
    result: "답변에 문서 출처를 함께 제공해 사용자가 안내의 근거를 확인할 수 있도록 했습니다.",
    lesson: "이 과정에서 모델의 선택만큼 데이터 전처리와 검색 설계가 서비스 품질을 좌우한다는 점을 배웠습니다.",
  },
  tiny: {
    kind: "tiny", name: "티니타이거", focus: "API 연동과 데이터 정합성",
    problem: "티니타이거 프로젝트에서는 팀의 업무 현황과 산출물이 여러 도구에 흩어져 진행 상황을 파악하기 어려웠습니다.",
    action: "저는 워크스페이스 정보 구조와 칸반 보드, 멤버 권한을 담당하며 서버 API와 클라이언트 상태를 연결했습니다.",
    result: "작업 보드와 문서 접근 경로를 통합해 팀이 회의 전에 진행 상황을 확인하는 시간을 줄였습니다.",
    lesson: "권한별 접근 범위와 실시간 갱신 시점의 정합성 문제를 겪으며, 같은 데이터를 일관되게 보여주는 설계의 중요성을 배웠습니다.",
  },
  blavers: {
    kind: "blavers", name: "블레이버스", focus: "데이터 모델·인증 설계와 협업",
    problem: "블레이버스 MVP 개발 해커톤에서는 멘토와 멘티의 학습 관리가 여러 도구에 흩어지는 문제를 해결해야 했습니다.",
    action: "팀장으로서 PM·디자이너와 기능 우선순위를 조율하고, Next.js와 Supabase를 활용해 역할별 화면과 데이터 모델·인증을 구현했습니다.",
    result: "멘토와 멘티의 핵심 흐름이 동작하는 학습 관리 플랫폼 MVP를 배포하고 본선에 진출했습니다.",
    lesson: "제한된 일정에는 핵심 흐름을 먼저 완성하고, 직군이 다른 팀원들과 구현 범위를 합의하는 것이 중요하다는 점을 배웠습니다.",
  },
};

export function identifyCareerDemoProject(value: unknown): ProjectKind | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = typeof record.company === "string" ? record.company : record.title;
  if (typeof title !== "string") return null;
  if (/헬로프렌즈|vizabridge/i.test(title)) return "hello";
  if (/티니타이거/i.test(title)) return "tiny";
  if (/블레이버스|몽구리|monguri/i.test(title)) return "blavers";
  return null;
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

function chooseEvidence(projects: Evidence[], question: string, prompt: string): Evidence {
  const named = projects.find((project) => prompt.includes(project.name));
  if (named) return named;
  const preferred: ProjectKind[] =
    ["collaboration", "conflict", "project", "motivation", "strength"].includes(question)
      ? ["blavers", "tiny", "hello"]
      : question === "competency"
        ? ["tiny", "hello", "blavers"]
        : ["hello", "tiny", "blavers"];
  return preferred.map((kind) => projects.find((project) => project.kind === kind)).find(Boolean)!;
}

/** Keep complete sentences and the form's character ceiling, including line breaks. */
export function fitCareerDemoAnswer(text: string, maxChars: number): string {
  const normalized = text.trim().replace(/[ \t]+/g, " ");
  if (normalized.length <= maxChars) return normalized;
  const sentences = normalized.split(/(?<=[.!?。])\s+|\n+/u).filter(Boolean);
  let result = "";
  for (const sentence of sentences) {
    const next = result ? `${result} ${sentence}` : sentence;
    if (next.length <= maxChars) result = next;
  }
  if (result) return result;
  const short = "데이터의 정확성을 중시하며 사용자 문제를 해결하는 개발자입니다.";
  return short.length <= maxChars ? short : "사용자 문제를 해결하는 개발자입니다.";
}

function buildDraft(question: string, evidence: Evidence, projects: Evidence[], refined: boolean): string {
  const domain = "클래스101의 결제·주문·정산 시스템";
  const opening = refined
    ? "제가 개발 과정에서 가장 중요하게 생각하는 기준은 데이터의 정확성과 사용자가 체감하는 안정성입니다."
    : "저는 사용자의 문제를 데이터와 서비스 구조로 풀어내는 개발자입니다.";
  const experience = [evidence.problem, evidence.action, evidence.result, evidence.lesson].join(" ");
  const contribution = `이 경험을 바탕으로 ${domain}에서도 요구사항과 데이터 흐름을 정확히 이해하고, 동료들과 설계를 검토하며 신뢰할 수 있는 기능을 만들겠습니다.`;
  const secondary = projects.find((project) => project.kind !== evidence.kind);

  switch (question) {
    case "motivation":
      return `배움을 통해 사람의 선택지를 넓히는 클래스101에서, 크리에이터와 수강생이 안심하고 이용할 수 있는 서비스 기반을 만들고 싶어 지원했습니다. 특히 결제부터 정산까지 데이터의 정확성을 책임지는 백엔드 업무에 관심이 있습니다.\n\n${experience}\n\n${contribution}`;
    case "goal":
      return `입사 후에는 ${domain}의 업무 규칙과 데이터 흐름을 먼저 익히겠습니다. 기능의 정상 동작뿐 아니라 예외 상황에서 데이터가 어떻게 유지되어야 하는지 동료들과 확인하고, 변경의 영향을 검토하는 습관을 갖추겠습니다.\n\n${evidence.action} ${evidence.lesson}\n\n장기적으로는 운영에서 발견한 문제를 재현하고 원인을 설명할 수 있는 백엔드 엔지니어로 성장하겠습니다. 작은 변경부터 검증하며 서비스의 정확성과 안정성을 높이겠습니다.`;
    case "collaboration":
      return `협업에서 중요하게 생각하는 것은 팀원들이 같은 목표와 구현 범위를 이해하도록 만드는 일입니다. ${evidence.problem}\n\n${evidence.action} ${evidence.result}\n\n${evidence.lesson} 의견을 조율할 때도 개인의 선호보다 사용자에게 필요한 핵심 흐름과 일정의 제약을 기준으로 논의하겠습니다. 클래스101에서도 기획·디자인·개발의 관점을 연결하며 문제를 끝까지 해결하겠습니다.`;
    case "conflict":
      return `직군마다 중요하게 보는 요구사항이 다를 때는 사용자에게 필요한 핵심 흐름과 일정의 제약을 함께 놓고 논의하려고 합니다. ${evidence.problem}\n\n${evidence.action} ${evidence.result}\n\n${evidence.lesson} 이 경험을 바탕으로 의견 차이를 개인 간의 문제로 다루기보다 공통의 목표와 구현 범위를 확인하는 대화로 풀어가겠습니다. 클래스101에서도 결정의 근거를 공유하며 협업하겠습니다.`;
    case "strength":
      return `저의 강점은 사용자 문제를 핵심 기능으로 구체화하고 구현까지 연결하는 실행력입니다. ${evidence.action} ${evidence.result}\n\n한편 구현 범위와 완성도의 균형은 계속 발전시켜야 할 과제입니다. ${evidence.lesson} 앞으로도 핵심 요구사항과 검증 기준을 먼저 정리하고, 진행 상황을 팀과 공유하며 개발하겠습니다.`;
    case "growth":
      return `프로젝트를 경험하며 좋은 개발의 기준이 기능의 개수에서 사용자와 팀이 신뢰할 수 있는 구조로 바뀌었습니다. ${experience}\n\n이 경험은 기술을 선택하기 전에 해결할 문제와 데이터의 흐름부터 이해하는 태도로 이어졌습니다. 클래스101에서도 구현의 이유를 설명하고 동료의 피드백을 반영하는 개발자로 성장하겠습니다.`;
    case "challenge":
      return `어려운 문제를 만났을 때는 결과에 영향을 주는 데이터와 처리 흐름부터 살펴봅니다. ${experience}\n\n이 경험을 통해 기술을 적용하는 것에서 멈추지 않고, 입력과 처리 과정이 결과에 미치는 영향을 확인하는 태도를 배웠습니다. ${contribution}`;
    case "project":
      return `${evidence.problem}\n\n${evidence.action} ${evidence.result}\n\n${evidence.lesson} ${contribution}`;
    case "introduction":
      return `${opening} ${evidence.action} ${evidence.result}${secondary ? ` 또한 ${secondary.name} 프로젝트에서는 ${secondary.focus}의 중요성을 경험했습니다.` : ""}\n\n${evidence.lesson} ${contribution}`;
    default:
      return `${opening} ${experience}${secondary ? ` ${secondary.name} 프로젝트를 통해서는 ${secondary.focus} 경험도 쌓았습니다.` : ""}\n\n${contribution}`;
  }
}

function protocol(stage: Stage, answer = "", ready = false): string {
  const quality = answer ? "ok" : "need";
  return `<dibut_state>\nstage=${stage}\ncompetency=${quality}\ntone=${quality}\nimpact=${quality}\nready=${ready ? "yes" : "no"}\n</dibut_state>\n<dibut_answer>${answer}</dibut_answer>`;
}

export function buildCareerDemoReply(body: DemoRequest, projects: Evidence[]) {
  if (!projects.length) throw new Error("Select a supported career demo project");
  const title = typeof body.selectedQuestion?.title === "string"
    ? body.selectedQuestion.title.trim().slice(0, 200) : "직무 역량";
  const prompt = latestUserMessage(body.messages);
  const question = classifyQuestion(title);
  const currentAnswer = typeof body.currentAnswer === "string" ? body.currentAnswer.trim().slice(0, 10000) : "";
  const evidence = chooseEvidence(projects, question, projects.some((project) => prompt.includes(project.name)) ? prompt : currentAnswer || prompt);
  const projectNames = projects.map((project) => project.name).join("·");
  const rawLimit = body.selectedQuestion?.maxChars;
  const fieldLimit = typeof rawLimit === "number" && Number.isFinite(rawLimit)
    ? Math.max(40, Math.min(3000, Math.floor(rawLimit))) : 700;
  const requestedLimit = prompt.match(/(\d{2,4})\s*자/)?.[1];
  const concise = /짧게|간결|줄여|줄이|요약/.test(prompt);
  const maxChars = Math.min(fieldLimit, requestedLimit ? Math.max(40, Number(requestedLimit)) : concise ? 350 : fieldLimit);

  if (body.operation === "intro") {
    return {
      content: `안녕하세요, 디벗 AI 자소서 컨설팅입니다. 클래스101 백엔드 엔지니어 공고와 ${projectNames} 프로젝트를 바탕으로 ‘${title}’ 문항을 함께 작성하겠습니다.\n\n이 공고에서는 데이터의 정확성, API·데이터 모델 설계, 주도적인 협업이 핵심입니다. 이번 문항은 ${evidence.name}의 ${evidence.focus} 경험을 중심으로 풀어내면 좋겠습니다.\n\n이 경험을 중심으로 작성할까요? 더 강조하고 싶은 프로젝트나 역량이 있으면 말씀해 주세요. 바로 초안을 요청하셔도 됩니다.`,
      protocol: protocol("direction"),
    };
  }

  const explicitlyDraft = /초안|작성해|써\s*줘|써주세요|만들어|바로\s*작성/.test(prompt);
  if (body.workflowStage === "direction" && !explicitlyDraft && !currentAnswer && body.operation !== "tone" && body.operation !== "fit-length") {
    return {
      content: `‘${title}’ 문항은 ${evidence.name} 경험을 중심으로 구성하겠습니다.\n\n${evidence.problem} ${evidence.action}\n\n여기서 ${evidence.focus} 역량을 강조하고, 결과와 배운 점을 클래스101이 요구하는 데이터 정확성·안정성과 연결하겠습니다. 과장된 수치보다 직접 맡은 작업과 판단을 드러내는 담백한 문체가 적합합니다.\n\n이 방향을 바탕으로 ${maxChars}자 이내의 초안을 작성해 드릴까요?`,
      protocol: protocol("draft"),
    };
  }

  const refine = body.operation === "tone" || body.workflowStage === "refine";
  const fitLength = body.operation === "fit-length" || concise || /글자\s*수|분량|\d+\s*자/.test(prompt) && Boolean(currentAnswer);
  const confirm = body.workflowStage === "confirm" || /최종|확정|제출/.test(prompt);
  let draft = buildDraft(question, evidence, projects, refine);
  // Preserve the user's applied/edited answer when refining it. Project-switch requests
  // intentionally rebuild from the named, selected evidence instead.
  const requestsProjectSwitch = projects.some((project) => prompt.includes(project.name));
  if (currentAnswer && (refine || fitLength || confirm) && !requestsProjectSwitch) {
    draft = currentAnswer
      .replace(/(?:정말|매우|굉장히)\s+/g, "")
      .replace(/했어요\./g, "했습니다.")
      .replace(/배웠어요\./g, "배웠습니다.")
      .replace(/\n{3,}/g, "\n\n");
    if (refine && !fitLength && !confirm && !draft.includes("클래스101")) {
      draft += " 클래스101에서도 데이터의 정확성과 안정성을 기준으로 기능을 구현하겠습니다.";
    }
  }
  if (/첫\s*문장|도입부/.test(prompt)) {
    const opening = question === "motivation"
      ? "사용자가 안심하고 배우는 경험을 정확한 데이터와 안정적인 백엔드로 뒷받침하고 싶습니다."
      : "저는 구현의 이유를 설명하고, 사용자와 팀이 신뢰할 수 있는 서비스를 만드는 개발자입니다.";
    draft = opening + " " + draft.replace(/^[\s\S]*?[.!?。](?:\s+|$)/u, "");
  }
  const answer = fitCareerDemoAnswer(draft, maxChars);
  const ready = confirm && Boolean(currentAnswer);
  const description = confirm
    ? "공고와의 연결, 경험 근거, 문장 흐름과 분량을 최종 점검했습니다."
    : fitLength
      ? `핵심 경험을 유지하면서 ${maxChars}자 이내로 정리했습니다.`
      : refine
        ? "직접 수행한 작업과 배운 점이 드러나도록 문장을 정리했습니다."
        : `${evidence.name} 경험을 중심으로 ‘${title}’ 초안을 작성했습니다.`;
  return {
    content: `${description}\n\n${answer}\n\n현재 ${answer.length}자입니다. ‘적용하기’를 누르면 이 문항의 답안으로 반영됩니다.`,
    protocol: protocol(ready ? "confirm" : "refine", answer, ready),
  };
}
