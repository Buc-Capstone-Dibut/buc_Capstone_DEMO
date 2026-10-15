type SessionType = "live_interview" | "portfolio_defense";

type UnknownRecord = Record<string, unknown>;

export interface InterviewConsoleRecommendationInput {
  question: string;
  sessionType: SessionType;
  jobData?: UnknownRecord | null;
  resumeData?: unknown;
}

const CLOSING_PATTERNS = [
  "면접을 마치",
  "면접은 여기까지",
  "수고하셨",
  "고생하셨",
  "좋은 결과",
  "참여해 주셔서 감사",
];

const QUESTION_PATTERNS = [
  "?",
  "？",
  "말씀해",
  "설명해",
  "소개해",
  "알려주",
  "들려주",
  "어떻게",
  "어떤",
  "무엇",
  "왜 ",
  "경험",
  "이유",
  "생각",
  "수 있나요",
  "수 있을까요",
  "인가요",
  "했나요",
  "부탁드",
];

const STOP_WORDS = new Set([
  "대해",
  "대한",
  "어떤",
  "어떻게",
  "무엇",
  "말씀",
  "설명",
  "해주세요",
  "해주실",
  "있나요",
  "있을까요",
  "본인이",
  "경험",
]);

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};

const asRecords = (value: unknown): UnknownRecord[] =>
  Array.isArray(value) ? value.map(asRecord).filter((item) => Object.keys(item).length > 0) : [];

const asText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const asTextList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map(asText).filter(Boolean)
    : asText(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

const firstText = (...values: unknown[]): string => {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return "";
};

const shorten = (value: string, limit = 120): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trim()}…`;
};

const quote = (value: string): string => value ? `‘${shorten(value)}’` : "";

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^0-9a-zA-Z가-힣+#.]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));

const getResumeRoot = (resumeData: unknown): UnknownRecord => {
  const resume = asRecord(resumeData);
  const parsedContent = asRecord(resume.parsedContent);
  return Object.keys(parsedContent).length > 0 ? parsedContent : resume;
};

const scoreRecordForQuestion = (record: UnknownRecord, questionTokens: string[]): number => {
  const searchable = Object.values(record)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => typeof value === "object" ? JSON.stringify(value) : String(value ?? ""))
    .join(" ")
    .toLowerCase();

  return questionTokens.reduce(
    (score, token) => score + (searchable.includes(token) ? 1 : 0),
    0,
  );
};

const pickRelevantRecord = (records: UnknownRecord[], question: string): UnknownRecord => {
  if (records.length === 0) return {};
  const questionTokens = tokenize(question);
  return records
    .map((record, index) => ({ record, index, score: scoreRecordForQuestion(record, questionTokens) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)[0].record;
};

const projectFacts = (project: UnknownRecord) => ({
  name: firstText(project.name, project.title),
  description: firstText(project.description, project.summary),
  techStack: asTextList(project.techStack),
  achievements: asTextList(project.achievements),
});

const buildProjectAnswer = (question: string, resume: UnknownRecord): string => {
  const project = projectFacts(pickRelevantRecord(asRecords(resume.projects), question));
  const projectName = project.name || "[질문과 가장 관련 있는 프로젝트명]";
  const situation = project.description
    ? `${quote(project.description)}라는 문제를 다뤘습니다`
    : "[해결해야 했던 문제]가 있었습니다";
  const technology = project.techStack.length > 0
    ? `${project.techStack.slice(0, 3).join(", ")}를 활용해`
    : "[사용한 기술과 선택 이유]를 바탕으로";
  const result = project.achievements[0]
    ? quote(project.achievements[0])
    : "[수치 또는 사용자 영향으로 확인한 결과]";

  return `${projectName} 프로젝트에서 ${situation}. 저는 [본인이 직접 맡은 역할]을 담당했고, ${technology} [핵심 판단과 실행]을 진행했습니다. 그 결과 ${result}를 만들었으며, 이 경험을 통해 [지원 직무와 연결되는 배운 점]을 얻었습니다.`;
};

const buildCollaborationAnswer = (question: string, resume: UnknownRecord): string => {
  const project = projectFacts(pickRelevantRecord(asRecords(resume.projects), question));
  const projectName = project.name || "[협업 사례가 있었던 프로젝트]";
  const result = project.achievements[0]
    ? quote(project.achievements[0])
    : "[팀 또는 사용자에게 생긴 변화]";

  return `협업 사례로 ${projectName} 프로젝트를 말씀드리겠습니다. 당시 [의견 차이 또는 협업 이슈]가 있었고, 저는 [상대의 관점을 확인한 방법]과 [직접 제안·실행한 조율 방식]으로 해결했습니다. 그 결과 ${result}로 이어졌고, 이후에는 [재발 방지를 위해 바꾼 협업 방식]을 적용했습니다.`;
};

const buildMotivationAnswer = (question: string, jobData: UnknownRecord, resume: UnknownRecord): string => {
  const role = asText(jobData.role) || "[지원 직무]";
  const company = asText(jobData.company) || "[지원 회사]";
  const responsibility = asTextList(jobData.responsibilities)[0]
    || asTextList(jobData.requirements)[0]
    || "[JD의 핵심 업무]";
  const project = projectFacts(pickRelevantRecord(asRecords(resume.projects), question));
  const evidence = project.name
    ? `${project.name} 프로젝트에서 ${quote(project.description || "[관련 문제를 해결한 경험]")}을 수행한 경험`
    : "[직무와 직접 연결되는 경험]";

  return `${company}의 ${role} 직무에 지원한 이유는 ${quote(responsibility)} 업무에서 제 경험을 가장 잘 활용할 수 있다고 판단했기 때문입니다. 저는 ${evidence}이 있습니다. 입사 후에는 이 경험을 바탕으로 [초기에 기여할 부분]부터 성과를 만들고, 장기적으로 [성장 방향]까지 확장하겠습니다.`;
};

const buildIntroductionAnswer = (question: string, jobData: UnknownRecord, resume: UnknownRecord): string => {
  const personalInfo = asRecord(resume.personalInfo);
  const intro = asText(personalInfo.intro);
  const role = asText(jobData.role) || "[지원 직무]";
  const project = projectFacts(pickRelevantRecord(asRecords(resume.projects), question));
  const achievement = project.achievements[0]
    ? `, 그 과정에서 ${quote(project.achievements[0])}를 만들었습니다`
    : "";

  return `${intro ? `${intro}. ` : ""}안녕하세요, ${role} 지원자 [이름]입니다. 저는 ${project.name || "[대표 프로젝트]"}에서 ${quote(project.description || "[대표 문제 해결 경험]")}을 수행했습니다${achievement}. 이 경험에서 쌓은 [핵심 역량 1~2개]을 바탕으로 ${role} 업무에 기여하겠습니다.`;
};

const buildStrengthAnswer = (question: string, resume: UnknownRecord): string => {
  const skills = asRecords(resume.skills);
  const skill = pickRelevantRecord(skills, question);
  const skillName = asText(skill.name) || "[핵심 강점]";
  const project = projectFacts(pickRelevantRecord(asRecords(resume.projects), question));

  return `제 강점은 ${skillName}을 활용해 문제를 끝까지 해결하는 점입니다. ${project.name || "[대표 프로젝트]"}에서 [강점이 필요했던 상황]에 ${quote(project.description || "[직접 수행한 행동]")}을 수행했고, [검증 가능한 결과]를 만들었습니다. 다만 [약점]은 보완하기 위해 현재 [구체적인 개선 행동]을 꾸준히 실천하고 있습니다.`;
};

const buildPortfolioAnswer = (jobData: UnknownRecord): string => {
  const repoUrl = asText(jobData.repoUrl);
  const repoName = repoUrl.split("/").filter(Boolean).pop() || "이 포트폴리오";
  const readmeSummary = asText(jobData.readmeSummary);
  const treeSummary = asText(jobData.treeSummary);
  const topics = asTextList(jobData.detectedTopics);
  const overview = firstText(readmeSummary, treeSummary, topics.join(", "));
  const fact = overview ? quote(overview) : "[프로젝트의 핵심 문제와 구조]";
  const technology = topics.length > 0 ? topics.slice(0, 3).join(", ") : "[핵심 기술]";

  return `${repoName}의 핵심은 ${fact}입니다. 저는 ${technology}를 중심으로 [가장 중요한 설계 선택]을 했습니다. [검토한 대안] 대신 이 방식을 선택한 이유는 [요구사항·비용·운영 관점의 근거]였고, 결과는 [성능 수치, 테스트 또는 사용자 효과]로 검증했습니다. 다시 개선한다면 [현재 구조의 한계와 다음 개선안]을 우선 적용하겠습니다.`;
};

export function isLikelyInterviewQuestion(question: string): boolean {
  const normalized = question.replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  if (CLOSING_PATTERNS.some((pattern) => normalized.includes(pattern))) return false;
  return QUESTION_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function buildInterviewConsoleRecommendation({
  question,
  sessionType,
  jobData = {},
  resumeData,
}: InterviewConsoleRecommendationInput): string {
  const normalizedQuestion = question.replace(/\s+/g, " ").trim();
  const job = asRecord(jobData);
  const resume = getResumeRoot(resumeData);

  if (sessionType === "portfolio_defense") return buildPortfolioAnswer(job);
  if (/자기\s*소개|본인.*소개|소개.*부탁/.test(normalizedQuestion)) {
    return buildIntroductionAnswer(normalizedQuestion, job, resume);
  }
  if (/지원\s*동기|지원한 이유|왜.*(회사|직무)|입사/.test(normalizedQuestion)) {
    return buildMotivationAnswer(normalizedQuestion, job, resume);
  }
  if (/협업|갈등|충돌|조율|팀원|의견 차이/.test(normalizedQuestion)) {
    return buildCollaborationAnswer(normalizedQuestion, resume);
  }
  if (/장점|강점|약점|단점|보완/.test(normalizedQuestion)) {
    return buildStrengthAnswer(normalizedQuestion, resume);
  }
  if (/프로젝트|개발|구현|기술|성능|최적화|장애|문제|해결|경험/.test(normalizedQuestion)) {
    return buildProjectAnswer(normalizedQuestion, resume);
  }

  const role = asText(job.role) || "[지원 직무]";
  return `${role} 관점에서 결론부터 말씀드리면 [질문에 대한 한 문장 답변]입니다. 근거로 ${buildProjectAnswer(normalizedQuestion, resume)} 마지막으로 이 경험을 ${role} 업무에서 [어떻게 활용할지]로 연결하겠습니다.`;
}
