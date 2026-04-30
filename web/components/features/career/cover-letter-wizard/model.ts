"use client";

export type Phase = "intake" | "studio" | "completed";
export type IntakeStep = 1 | 2;

export type Message = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  status?: "thinking" | "streaming" | "done";
  suggestedAnswer?: string;
};

export type QuestionMessageMap = Record<string, Message[]>;
export type WorkflowStage = "direction" | "draft" | "refine" | "confirm";

export type QuestionWorkflow = {
  stage: WorkflowStage;
  directionAgreedAt?: string;
  draftRequestedAt?: string;
  refineCount: number;
  confirmedAt?: string;
};

export type QuestionWorkflowMap = Record<string, QuestionWorkflow>;

export type RequirementStatus = {
  competency: boolean;
  tone: boolean;
  impact: boolean;
  ready: boolean;
};

export type QuestionRequirementMap = Record<string, RequirementStatus>;

export type CoverLetterQuestion = {
  id: string;
  title: string;
  maxChars: number;
  answer?: string;
  status?: "draft" | "done";
  updatedAt?: string;
};

export type WizardForm = {
  company: string;
  division: string;
  role: string;
  deadline: string;
  workspaceName: string;
  colorTag: string;
  questions: CoverLetterQuestion[];
};

export type CoverLetterQuestionPreset = {
  id: string;
  title: string;
  maxChars: number;
  description: string;
};

export type ExperienceSnapshot = {
  id: string;
  title: string;
  tags: string[];
  techStack?: string[];
  period?: string;
  description?: string;
  situation?: string;
  role?: string;
  solution?: string;
  difficulty?: string;
  result?: string;
  lesson?: string;
};

export const WIZARD_LAST_GENERATED_KEY = "wizard_last_generated";
export const WIZARD_COMPLETED_KEY = "wizard_is_completed";
export const WIZARD_CONTEXT_KEY = "wizard_context_data";
export const WIZARD_EXPERIENCE_SNAPSHOT_KEY = "wizard_experience_snapshot";
export const WIZARD_COVER_LETTER_SEED_KEY = "wizard_cover_letter_seed";

export const COVER_LETTER_QUESTION_PRESETS: CoverLetterQuestionPreset[] = [
  {
    id: "self-introduction",
    title: "자기소개",
    maxChars: 500,
    description: "성격, 강점, 가치관을 압축",
  },
  {
    id: "motivation",
    title: "지원동기",
    maxChars: 700,
    description: "회사/직무 적합성과 성장 계획",
  },
  {
    id: "career-goal",
    title: "입사 후 포부",
    maxChars: 700,
    description: "입사 후 포부 단독 문항",
  },
  {
    id: "strength-weakness",
    title: "장점과 단점",
    maxChars: 600,
    description: "강점/약점과 보완 노력",
  },
  {
    id: "growth-background",
    title: "성장 과정",
    maxChars: 700,
    description: "가치관 형성 배경",
  },
  {
    id: "collaboration",
    title: "협업 경험",
    maxChars: 700,
    description: "협업 방식과 기여도",
  },
  {
    id: "challenge",
    title: "도전 경험",
    maxChars: 700,
    description: "문제 해결 과정",
  },
  {
    id: "conflict",
    title: "갈등 해결",
    maxChars: 700,
    description: "커뮤니케이션 역량",
  },
  {
    id: "job-competency",
    title: "직무 역량",
    maxChars: 800,
    description: "직무역량/기술역량",
  },
  {
    id: "representative-project",
    title: "대표 프로젝트",
    maxChars: 800,
    description: "대표 프로젝트",
  },
] as const;

export const COLOR_TAGS = [
  "#64748b",
  "#e2e8f0",
  "#e85d75",
  "#e9d66b",
  "#42b883",
  "#5b8def",
  "#58b7e8",
] as const;

export const WORKFLOW_STAGES: Array<{
  id: WorkflowStage;
  label: string;
  description: string;
}> = [
  {
    id: "direction",
    label: "작성 방향 합의",
    description: "강조 역량, 톤, 핵심 성과를 먼저 맞춥니다.",
  },
  {
    id: "draft",
    label: "초안 생성",
    description: "합의된 방향으로 첫 문장을 만듭니다.",
  },
  {
    id: "refine",
    label: "근거/톤 개선",
    description: "증거 밀도와 문장 톤을 보정합니다.",
  },
  {
    id: "confirm",
    label: "문항 확정",
    description: "최종 답안을 확정하고 저장합니다.",
  },
];

export const WORKFLOW_STAGE_INDEX: Record<WorkflowStage, number> = {
  direction: 0,
  draft: 1,
  refine: 2,
  confirm: 3,
};

export function createDefaultWorkflowState(): QuestionWorkflow {
  return {
    stage: "direction",
    refineCount: 0,
  };
}

export function getWorkflowStageLabel(stage: WorkflowStage): string {
  if (stage === "direction") return "방향 합의";
  if (stage === "draft") return "초안 생성";
  if (stage === "refine") return "근거/톤 개선";
  return "문항 확정";
}

export function createDefaultRequirementStatus(): RequirementStatus {
  return {
    competency: false,
    tone: false,
    impact: false,
    ready: false,
  };
}

export function createQuestion(): CoverLetterQuestion {
  return {
    id: crypto.randomUUID(),
    title: "",
    maxChars: 500,
    answer: "",
    status: "draft",
    updatedAt: new Date().toISOString(),
  };
}

export function toDateInputValue(value: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function buildCombinedContent(questions: CoverLetterQuestion[]): string {
  const validQuestions = questions.filter((q) => q.title.trim() || q.answer?.trim());
  if (validQuestions.length === 0) return "";
  return validQuestions
    .map(
      (q, index) =>
        `${index + 1}. ${q.title.trim() || `문항 ${index + 1}`}\n${(q.answer || "").trim()}`,
    )
    .join("\n\n");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseProtocolSection(section: string) {
  return Object.fromEntries(
    section
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes("="))
      .map((line) => {
        const [rawKey, ...rest] = line.split("=");
        return [rawKey.trim().toLowerCase(), rest.join("=").trim().toLowerCase()];
      }),
  ) as Record<string, string>;
}

export function parseAssistantProtocol(rawContent: string) {
  const stateMatch = rawContent.match(/<dibut_state>([\s\S]*?)<\/dibut_state>/i);
  const answerMatch = rawContent.match(/<dibut_answer>([\s\S]*?)<\/dibut_answer>/i);

  const cleanedContent = rawContent
    .replace(/<dibut_state>[\s\S]*?<\/dibut_state>/gi, "")
    .replace(/<dibut_answer>[\s\S]*?<\/dibut_answer>/gi, "")
    .trim();

  const parsedState = stateMatch ? parseProtocolSection(stateMatch[1]) : null;
  const parsedAnswer = answerMatch?.[1]?.trim() || "";

  const parsedStage = parsedState?.stage;
  const stage: WorkflowStage | undefined =
    parsedStage === "direction" ||
    parsedStage === "draft" ||
    parsedStage === "refine" ||
    parsedStage === "confirm"
      ? parsedStage
      : undefined;

  const toStateBool = (value?: string): boolean | undefined => {
    if (!value) return undefined;
    if (value === "ok" || value === "yes" || value === "true") return true;
    if (value === "need" || value === "no" || value === "false") return false;
    return undefined;
  };

  return {
    cleanedContent,
    stage,
    competency: toStateBool(parsedState?.competency),
    tone: toStateBool(parsedState?.tone),
    impact: toStateBool(parsedState?.impact),
    ready: toStateBool(parsedState?.ready),
    answer: parsedAnswer,
  };
}

export function normalizeWizardMessage(message: Message): Message {
  if (message.role !== "assistant") {
    return message;
  }

  const parsed = parseAssistantProtocol(message.content || "");

  return {
    ...message,
    content: parsed.cleanedContent || message.content || "",
    suggestedAnswer: message.suggestedAnswer?.trim() || parsed.answer?.trim() || undefined,
  };
}
