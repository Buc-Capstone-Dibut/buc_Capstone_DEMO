"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { useToast } from "@/hooks/use-toast";
import { EMPTY_RESUME } from "@/app/my/[handle]/profile-utils";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import { saveCoverLetterAction } from "@/app/career/cover-letters/actions";
import {
  buildCombinedContent,
  COLOR_TAGS,
  createDefaultRequirementStatus,
  createDefaultWorkflowState,
  createQuestion,
  type CoverLetterQuestion,
  type CoverLetterQuestionPreset,
  type ExperienceSnapshot,
  type IntakeStep,
  type Message,
  normalizeWizardMessage,
  parseAssistantProtocol,
  type Phase,
  type QuestionMessageMap,
  type QuestionRequirementMap,
  type QuestionWorkflowMap,
  sleep,
  type WorkflowStage,
  type WizardForm,
  WIZARD_COMPLETED_KEY,
  WIZARD_CONTEXT_KEY,
  WIZARD_COVER_LETTER_SEED_KEY,
  WIZARD_EXPERIENCE_SNAPSHOT_KEY,
  WIZARD_LAST_GENERATED_KEY,
} from "./model";

export interface CoverLetterWizardOverlayProps {
  experienceIds: string[];
  onCancel: () => void;
  onExit: () => void;
  persistState?: boolean;
  initialCoverLetterId?: string;
  entrySource?: "career" | "cover-letters";
  onIntakeComplete?: (draft: WizardForm) => void;
}

async function parseApiErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const json = (await response.json()) as { error?: string };
    if (typeof json?.error === "string" && json.error.trim()) {
      return json.error;
    }
  } catch {
    // ignore parse error
  }
  return fallbackMessage;
}

function buildAiErrorDisplayMessage(description: string, statusCode?: number) {
  const trimmed = description.trim() || "잠시 후 다시 시도해주세요.";

  if (statusCode === 503) {
    return `현재 AI API 서버가 불안정합니다. 잠시 후 다시 시도해주세요. (오류 코드: 503)\n\n상세: ${trimmed}`;
  }
  if (statusCode === 429) {
    return `현재 AI 요청이 몰리고 있습니다. 잠시 후 다시 시도해주세요. (오류 코드: 429)\n\n상세: ${trimmed}`;
  }
  if (statusCode === 401) {
    return `인증 정보가 만료되었거나 유효하지 않습니다. 다시 로그인 후 시도해주세요. (오류 코드: 401)\n\n상세: ${trimmed}`;
  }
  if (statusCode === 500) {
    return `현재 AI 생성 서버에서 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요. (오류 코드: 500)\n\n상세: ${trimmed}`;
  }

  if (statusCode) {
    return `현재 AI 요청 처리에 실패했습니다. 잠시 후 다시 시도해주세요. (오류 코드: ${statusCode})\n\n상세: ${trimmed}`;
  }

  return `현재 AI 요청 처리에 실패했습니다.\n\n상세: ${trimmed}`;
}

function buildThinkingSteps(questionTitle: string, workflowStage: WorkflowStage) {
  const safeTitle = questionTitle.trim() || "현재 문항";

  if (workflowStage === "direction") {
    return [
      {
        label: "문항 의도 분석 중...",
        message: `'${safeTitle}' 문항의 평가 포인트를 읽고 있습니다.`,
      },
      {
        label: "강조 포인트 정리 중...",
        message: "입력된 프로젝트에서 바로 쓸 수 있는 근거를 추리는 중입니다.",
      },
      {
        label: "작성 방향 정리 중...",
        message: "답안의 핵심 메시지와 질문 흐름을 조합하고 있습니다.",
      },
    ];
  }

  if (workflowStage === "draft") {
    return [
      {
        label: "프로젝트 근거 매칭 중...",
        message: "문항 요구와 프로젝트 키워드를 연결하는 중입니다.",
      },
      {
        label: "초안 문장 구성 중...",
        message: "초안의 첫 문장과 핵심 전개를 구성하고 있습니다.",
      },
      {
        label: "문장 흐름을 다듬는 중...",
        message: "문장 길이와 흐름을 정리해 읽기 쉽게 다듬는 중입니다.",
      },
    ];
  }

  if (workflowStage === "refine") {
    return [
      {
        label: "근거 밀도 보강 중...",
        message: "답안에서 설득력이 약한 지점을 보강하는 중입니다.",
      },
      {
        label: "톤/표현 보정 중...",
        message: "표현 톤을 정리하고 불필요한 문장을 덜어내고 있습니다.",
      },
      {
        label: "최종 문장 정리 중...",
        message: "문항에 바로 적용할 수 있는 형태로 문장을 다듬고 있습니다.",
      },
    ];
  }

  return [
    {
      label: "최종 점검 중...",
      message: "현재 답안이 문항 요구를 충분히 충족하는지 확인하고 있습니다.",
    },
    {
      label: "문항 품질 검토 중...",
      message: "최종 적용 전 부족한 부분이 없는지 마지막으로 점검하는 중입니다.",
    },
  ];
}

const INTRO_THINKING_STEPS = [
  {
    label: "기업/직무 맥락 정리 중...",
    message: "지원 기업과 직무 맥락을 빠르게 정리하고 있습니다.",
  },
  {
    label: "기반 프로젝트 핵심 키워드 분석 중...",
    message: "기반 프로젝트에서 우선적으로 꺼낼 키워드를 추리는 중입니다.",
  },
  {
    label: "맞춤 온보딩 메시지 작성 중...",
    message: "현재 문항에 맞는 첫 코칭 메시지를 구성하고 있습니다.",
  },
] as const;

export function useCoverLetterWizard({
  experienceIds,
  onCancel,
  onExit,
  persistState = false,
  initialCoverLetterId,
  entrySource = "cover-letters",
  onIntakeComplete,
}: CoverLetterWizardOverlayProps) {
  const router = useRouter();
  const { toast } = useToast();
  const introRequestedQuestionIdsRef = useRef<Set<string>>(new Set());
  const [resumePayload] = useState<ResumePayload>(EMPTY_RESUME);
  const [phase, setPhase] = useState<Phase>("intake");
  const [intakeStep, setIntakeStep] = useState<IntakeStep>(1);
  const [coverLetterId, setCoverLetterId] = useState<string>("");
  const [backgroundContext, setBackgroundContext] = useState<string | undefined>();
  const [experienceSnapshot, setExperienceSnapshot] = useState<ExperienceSnapshot[]>([]);

  const [questionMessages, setQuestionMessages] = useState<QuestionMessageMap>({});
  const [questionWorkflowMap, setQuestionWorkflowMap] = useState<QuestionWorkflowMap>({});
  const [questionRequirementMap, setQuestionRequirementMap] =
    useState<QuestionRequirementMap>({});
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamPhaseLabel, setStreamPhaseLabel] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [expandedExperienceIds, setExpandedExperienceIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [generatedContent, setGeneratedContent] = useState("");
  const [nextSuggestedQuestionId, setNextSuggestedQuestionId] = useState<string | null>(null);
  const [lastAiError, setLastAiError] = useState<{
    message: string;
    statusCode?: number;
  } | null>(null);
  const [requestBanner, setRequestBanner] = useState<{
    tone: "progress" | "error";
    message: string;
    statusCode?: number;
  } | null>(null);

  const [form, setForm] = useState<WizardForm>({
    company: "",
    division: "",
    role: "",
    deadline: "",
    workspaceName: "",
    colorTag: COLOR_TAGS[0],
    questions: [createQuestion()],
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const contextData = sessionStorage.getItem(WIZARD_CONTEXT_KEY);
    if (contextData) {
      setBackgroundContext(contextData);
    }
    const rawSnapshot = sessionStorage.getItem(WIZARD_EXPERIENCE_SNAPSHOT_KEY);
    if (rawSnapshot) {
      try {
        const parsed = JSON.parse(rawSnapshot) as ExperienceSnapshot[];
        if (Array.isArray(parsed)) {
          setExperienceSnapshot(
            parsed.filter(
              (item) =>
                item &&
                typeof item.id === "string" &&
                typeof item.title === "string" &&
                Array.isArray(item.tags),
            ),
          );
        }
      } catch {
        // ignore invalid payload
      }
    }
    const seedRaw = sessionStorage.getItem(WIZARD_COVER_LETTER_SEED_KEY);
    if (initialCoverLetterId && seedRaw) {
      try {
        const seed = JSON.parse(seedRaw) as NonNullable<ResumePayload["coverLetters"]>[number];
        if (seed?.id === initialCoverLetterId) {
          const nextQuestions =
            seed.questions?.length
              ? seed.questions.map((q) => ({
                  id: q.id || crypto.randomUUID(),
                  title: q.title || "",
                  maxChars: Number(q.maxChars) || 500,
                  answer: q.answer || "",
                  status: q.status || ((q.answer || "").trim() ? "done" : "draft"),
                  updatedAt: q.updatedAt || new Date().toISOString(),
                }))
              : [createQuestion()];

          setCoverLetterId(seed.id);
          setGeneratedContent(seed.content || "");
          setForm({
            company: seed.company || "",
            division: seed.division || "",
            role: seed.role || "",
            deadline: seed.deadline || "",
            workspaceName: seed.workspaceName || seed.title || "",
            colorTag: seed.colorTag || COLOR_TAGS[0],
            questions: nextQuestions,
          });
          if (
            Array.isArray(seed.sourceExperienceSnapshot) &&
            seed.sourceExperienceSnapshot.length > 0
          ) {
            setExperienceSnapshot(
              seed.sourceExperienceSnapshot.map((item) => ({
                id: item.id,
                title: item.title,
                tags: item.tags || [],
                techStack: item.techStack || [],
                period: item.period || "",
                description: item.description || "",
                situation: item.situation || "",
                role: item.role || "",
                solution: item.solution || "",
                difficulty: item.difficulty || "",
                result: item.result || "",
                lesson: item.lesson || "",
              })),
            );
          }
          const seededQuestionId = nextQuestions[0]?.id || null;
          const nextQuestionMessages: QuestionMessageMap = {};
          const nextQuestionWorkflow: QuestionWorkflowMap = {};
          const nextRequirementMap: QuestionRequirementMap = {};
          if (seed.perQuestionChatHistory && typeof seed.perQuestionChatHistory === "object") {
            Object.entries(seed.perQuestionChatHistory).forEach(([questionId, entries]) => {
              if (!Array.isArray(entries)) return;
              nextQuestionMessages[questionId] = entries
                .filter((entry) => entry && typeof entry.content === "string")
                .map((entry) =>
                  normalizeWizardMessage({
                    role: entry.role === "user" ? "user" : "assistant",
                    content: entry.content || "",
                    createdAt: entry.createdAt,
                    suggestedAnswer: entry.suggestedAnswer,
                    status: "done" as const,
                  }),
                );
            });
          } else if (
            seededQuestionId &&
            Array.isArray(seed.chatHistory) &&
            seed.chatHistory.length > 0
          ) {
            nextQuestionMessages[seededQuestionId] = seed.chatHistory.map((entry) =>
              normalizeWizardMessage({
                role: entry.role === "user" ? "user" : "assistant",
                content: entry.content || "",
                createdAt: entry.createdAt,
                suggestedAnswer: entry.suggestedAnswer,
                status: "done" as const,
              }),
            );
          }

          if (seed.perQuestionWorkflow && typeof seed.perQuestionWorkflow === "object") {
            Object.entries(seed.perQuestionWorkflow).forEach(([questionId, workflow]) => {
              const stage = workflow?.stage;
              if (
                stage !== "direction" &&
                stage !== "draft" &&
                stage !== "refine" &&
                stage !== "confirm"
              ) {
                return;
              }
              nextQuestionWorkflow[questionId] = {
                stage,
                directionAgreedAt:
                  typeof workflow.directionAgreedAt === "string"
                    ? workflow.directionAgreedAt
                    : undefined,
                draftRequestedAt:
                  typeof workflow.draftRequestedAt === "string"
                    ? workflow.draftRequestedAt
                    : undefined,
                refineCount:
                  typeof workflow.refineCount === "number" ? workflow.refineCount : 0,
                confirmedAt:
                  typeof workflow.confirmedAt === "string" ? workflow.confirmedAt : undefined,
              };
              nextRequirementMap[questionId] = {
                competency: Boolean(workflow.competency),
                tone: Boolean(workflow.tone),
                impact: Boolean(workflow.impact),
                ready:
                  typeof workflow.ready === "boolean"
                    ? workflow.ready
                    : Boolean(workflow.confirmedAt),
              };
            });
          }

          nextQuestions.forEach((question) => {
            if (!nextQuestionWorkflow[question.id]) {
              nextQuestionWorkflow[question.id] = createDefaultWorkflowState();
            }
            if (!nextRequirementMap[question.id]) {
              const confirmed = Boolean(nextQuestionWorkflow[question.id]?.confirmedAt);
              nextRequirementMap[question.id] = confirmed
                ? { competency: true, tone: true, impact: true, ready: true }
                : createDefaultRequirementStatus();
            }
          });
          setQuestionMessages(nextQuestionMessages);
          setQuestionWorkflowMap(nextQuestionWorkflow);
          setQuestionRequirementMap(nextRequirementMap);
          setSelectedQuestionId(seededQuestionId);
          setPhase("studio");
          return;
        }
      } catch {
        // ignore invalid seed data
      }
    }

    if (!persistState) return;
    if (initialCoverLetterId) return;
    const savedContent = sessionStorage.getItem(WIZARD_LAST_GENERATED_KEY);
    const savedFlag = sessionStorage.getItem(WIZARD_COMPLETED_KEY);
    if (savedFlag === "true" && savedContent) {
      setGeneratedContent(savedContent);
      setPhase("completed");
    }
  }, [persistState, initialCoverLetterId]);

  const questionSummary = useMemo(
    () =>
      form.questions
        .filter((q) => q.title.trim())
        .map((q, index) => `${index + 1}. ${q.title.trim()} (${q.maxChars}자)`)
        .join("\n"),
    [form.questions],
  );

  const workspaceTitle = useMemo(() => {
    if (form.workspaceName.trim()) return form.workspaceName.trim();
    return `${form.company}_${form.role}`.trim() || "새 자기소개서";
  }, [form.company, form.role, form.workspaceName]);

  const applicationTarget = `${form.company} ${form.role}`.trim();

  const mergedBackgroundContext = useMemo(() => {
    const meta = [
      `[기업] ${form.company}`,
      form.division ? `[사업부] ${form.division}` : "",
      `[직무] ${form.role}`,
      form.deadline ? `[마감일] ${form.deadline}` : "",
      questionSummary ? `[문항 정보]\n${questionSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return [backgroundContext, meta].filter(Boolean).join("\n\n");
  }, [backgroundContext, form.company, form.division, form.role, form.deadline, questionSummary]);

  const latestUpdatedLabel = useMemo(() => {
    const timestamps = form.questions
      .map((q) => q.updatedAt)
      .filter((v): v is string => Boolean(v))
      .map((v) => new Date(v))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());
    if (timestamps.length === 0) return "기록 없음";
    return timestamps[0].toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [form.questions]);

  const selectedQuestion = useMemo(
    () => form.questions.find((q) => q.id === selectedQuestionId) || null,
    [form.questions, selectedQuestionId],
  );

  const activeMessages = useMemo(() => {
    if (!selectedQuestionId) return [] as Message[];
    return questionMessages[selectedQuestionId] || [];
  }, [questionMessages, selectedQuestionId]);

  const setMessagesForQuestion = (
    questionId: string,
    updater: (prev: Message[]) => Message[],
  ) => {
    setQuestionMessages((prev) => ({
      ...prev,
      [questionId]: updater(prev[questionId] || []),
    }));
  };

  useEffect(() => {
    if (form.questions.length === 0) return;
    setQuestionWorkflowMap((prev) => {
      const next: QuestionWorkflowMap = { ...prev };
      let changed = false;
      const validIds = new Set(form.questions.map((q) => q.id));

      form.questions.forEach((question) => {
        if (!next[question.id]) {
          next[question.id] = createDefaultWorkflowState();
          changed = true;
        }
      });

      Object.keys(next).forEach((id) => {
        if (!validIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
    setQuestionRequirementMap((prev) => {
      const next: QuestionRequirementMap = { ...prev };
      let changed = false;
      const validIds = new Set(form.questions.map((q) => q.id));

      form.questions.forEach((question) => {
        if (!next[question.id]) {
          next[question.id] = createDefaultRequirementStatus();
          changed = true;
        }
      });

      Object.keys(next).forEach((id) => {
        if (!validIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [form.questions]);

  const persistCoverLetter = async (manual = false) => {
    if (isSaving) return;
    if (phase !== "studio") return;
    setIsSaving(true);
    setSaveState("saving");
    try {
      const combinedContent = buildCombinedContent(form.questions);
      const serializedQuestionChats: NonNullable<
        NonNullable<ResumePayload["coverLetters"]>[number]["perQuestionChatHistory"]
      > = Object.fromEntries(
        Object.entries(questionMessages).map(([questionId, entries]) => [
          questionId,
          (entries || []).map((entry) => {
            const normalizedEntry = normalizeWizardMessage({
              ...entry,
              createdAt: entry.createdAt || new Date().toISOString(),
            });

            return {
              role: normalizedEntry.role,
              content: normalizedEntry.content,
              createdAt: normalizedEntry.createdAt || new Date().toISOString(),
              suggestedAnswer: normalizedEntry.suggestedAnswer,
            };
          }),
        ]),
      );
      const flattenedChatHistory = Object.values(serializedQuestionChats)
        .flat()
        .slice(-80);
      const serializedWorkflows: NonNullable<
        NonNullable<ResumePayload["coverLetters"]>[number]["perQuestionWorkflow"]
      > = Object.fromEntries(
        Object.entries(questionWorkflowMap).map(([questionId, workflow]) => [
          questionId,
          {
            stage: workflow.stage,
            directionAgreedAt: workflow.directionAgreedAt,
            draftRequestedAt: workflow.draftRequestedAt,
            refineCount: workflow.refineCount,
            confirmedAt: workflow.confirmedAt,
            competency: questionRequirementMap[questionId]?.competency,
            tone: questionRequirementMap[questionId]?.tone,
            impact: questionRequirementMap[questionId]?.impact,
            ready: questionRequirementMap[questionId]?.ready,
          },
        ]),
      );
      const payload = {
        id: coverLetterId,
        title: workspaceTitle,
        content: combinedContent || generatedContent || "문항 작성 중",
        createdAt: new Date().toISOString(),
        sourceExperienceIds: experienceIds,
        sourceExperienceSnapshot: experienceSnapshot,
        applicationTarget,
        company: form.company.trim(),
        division: form.division.trim() || undefined,
        role: form.role.trim(),
        deadline: form.deadline.trim(),
        workspaceName: workspaceTitle,
        colorTag: form.colorTag,
        questions: form.questions.map((q) => ({
          id: q.id,
          title: q.title.trim(),
          maxChars: Number(q.maxChars) || 0,
          answer: q.answer || "",
          status: (q.answer?.trim() ? "done" : "draft") as "done" | "draft",
          updatedAt: q.updatedAt || new Date().toISOString(),
        })),
        chatHistory: flattenedChatHistory,
        perQuestionChatHistory: serializedQuestionChats,
        perQuestionWorkflow: serializedWorkflows,
      };

      if (typeof window !== "undefined") {
        sessionStorage.setItem(WIZARD_COVER_LETTER_SEED_KEY, JSON.stringify(payload));
      }

      const result = await saveCoverLetterAction(payload);
      if (result.success && result.coverLetter?.id) {
        setCoverLetterId(result.coverLetter.id);
      }
      setGeneratedContent(payload.content);
      setSaveState("saved");
      if (manual) {
        toast({ title: "저장 완료", description: "문항 답안이 저장되었습니다." });
      }
    } catch (error) {
      console.error(error);
      setSaveState("error");
      if (manual) {
        toast({
          title: "저장 실패",
          description: "잠시 후 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const debouncedAutosave = useDebouncedCallback(() => {
    void persistCoverLetter(false);
  }, 900);

  useEffect(() => {
    if (phase !== "studio") return;
    debouncedAutosave();
    return () => debouncedAutosave.cancel();
  }, [
    phase,
    form.questions,
    form.company,
    form.division,
    form.role,
    form.deadline,
    form.workspaceName,
    form.colorTag,
    experienceSnapshot,
    questionMessages,
    questionWorkflowMap,
    questionRequirementMap,
    debouncedAutosave,
  ]);

  const clearWizardSessionState = () => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(WIZARD_LAST_GENERATED_KEY);
    sessionStorage.removeItem(WIZARD_COMPLETED_KEY);
    sessionStorage.removeItem(WIZARD_EXPERIENCE_SNAPSHOT_KEY);
    sessionStorage.removeItem(WIZARD_COVER_LETTER_SEED_KEY);
  };

  const validateCompanyStep = () => {
    if (!form.company.trim()) {
      toast({ title: "기업을 입력해주세요.", variant: "destructive" });
      return false;
    }
    if (!form.role.trim()) {
      toast({ title: "직무를 입력해주세요.", variant: "destructive" });
      return false;
    }
    if (!form.deadline.trim()) {
      toast({ title: "마감일정을 입력해주세요.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateQuestionStep = () => {
    if (form.questions.length === 0) {
      toast({ title: "문항을 최소 1개 입력해주세요.", variant: "destructive" });
      return false;
    }
    const invalid = form.questions.some((q) => !q.title.trim() || Number(q.maxChars) <= 0);
    if (invalid) {
      toast({
        title: "문항 제목과 글자수를 모두 입력해주세요.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFormChange = (patch: Partial<Omit<WizardForm, "questions">>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const addQuestion = () => {
    setForm((prev) => {
      if (prev.questions.length >= 6) return prev;
      const next = [...prev.questions, createQuestion()];
      if (!selectedQuestionId) {
        setSelectedQuestionId(next[0].id);
      }
      return { ...prev, questions: next };
    });
  };

  const addPresetQuestion = (preset: CoverLetterQuestionPreset) => {
    setForm((prev) => {
      const now = new Date().toISOString();
      const firstEmptyIndex = prev.questions.findIndex(
        (question) => !question.title.trim() && !question.answer?.trim(),
      );

      if (firstEmptyIndex !== -1) {
        const next = prev.questions.map((question, index) =>
          index === firstEmptyIndex
            ? {
                ...question,
                title: preset.title,
                maxChars: preset.maxChars,
                updatedAt: now,
              }
            : question,
        );
        setSelectedQuestionId(next[firstEmptyIndex]?.id || next[0]?.id || null);
        return { ...prev, questions: next };
      }

      if (prev.questions.length >= 6) return prev;

      const nextQuestion: CoverLetterQuestion = {
        ...createQuestion(),
        title: preset.title,
        maxChars: preset.maxChars,
        updatedAt: now,
      };
      setSelectedQuestionId(nextQuestion.id);
      return { ...prev, questions: [...prev.questions, nextQuestion] };
    });
  };

  const removeQuestion = (id: string) => {
    setForm((prev) => {
      if (prev.questions.length <= 1) return prev;
      const next = prev.questions.filter((q) => q.id !== id);
      if (selectedQuestionId === id) {
        setSelectedQuestionId(next[0]?.id || null);
      }
      return { ...prev, questions: next };
    });
  };

  const updateQuestion = (
    id: string,
    patch: Partial<Pick<CoverLetterQuestion, "title" | "maxChars" | "answer">>,
  ) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === id
          ? {
              ...q,
              ...patch,
              status: (patch.answer ?? q.answer ?? "").trim() ? "done" : "draft",
              updatedAt: new Date().toISOString(),
            }
          : q,
      ),
    }));
  };

  const startStudio = () => {
    if (intakeStep === 1) {
      if (!validateCompanyStep()) return;
      setIntakeStep(2);
      return;
    }
    if (!validateQuestionStep()) return;
    if (onIntakeComplete) {
      onIntakeComplete({
        ...form,
        company: form.company.trim(),
        division: form.division.trim(),
        role: form.role.trim(),
        deadline: form.deadline.trim(),
        workspaceName: form.workspaceName.trim(),
        questions: form.questions.map((q) => ({
          ...q,
          title: q.title.trim(),
          maxChars: Number(q.maxChars) || 500,
          answer: q.answer || "",
          status: ((q.answer || "").trim() ? "done" : "draft") as "done" | "draft",
          updatedAt: q.updatedAt || new Date().toISOString(),
        })),
      });
      return;
    }
    setPhase("studio");
    setSelectedQuestionId(form.questions[0]?.id || null);
  };

  useEffect(() => {
    if (phase !== "studio") return;
    if (!selectedQuestionId) {
      setSelectedQuestionId(form.questions[0]?.id || null);
    }
  }, [phase, selectedQuestionId, form.questions]);

  const runChat = async (prompt?: string) => {
    if (!selectedQuestion) {
      toast({ title: "먼저 문항을 선택해주세요.", variant: "destructive" });
      return;
    }
    if (isStreaming) return;
    const questionId = selectedQuestion.id;
    const workflowStage = questionWorkflowMap[questionId]?.stage || "direction";
    const resolvedOperation = workflowStage === "refine" ? "tone" : "draft";
    setLastAiError(null);
    setRequestBanner(null);

    const defaultPrompt =
      workflowStage === "direction"
        ? `현재 문항 '${selectedQuestion.title}'의 작성 방향을 먼저 합의하자. 강조 역량, 톤, 핵심 성과가 충족되도록 필요한 질문을 먼저 해줘.`
        : workflowStage === "draft"
          ? `${selectedQuestion.title} 문항의 초안을 작성해줘. 합의된 역량/톤/핵심 성과를 반영하고 ${selectedQuestion.maxChars}자 내외로 맞춰줘.`
          : workflowStage === "refine"
            ? "현재 답안을 사용자 피드백에 맞게 다듬어줘. 근거 밀도와 톤을 유지하면서 설득력을 높여줘."
            : "현재 답안을 최종 확정 가능한 상태인지 점검하고 부족하면 한 번 더 개선해줘.";
    const userMessage = (prompt || defaultPrompt).trim();
    const now = new Date().toISOString();
    const prevMessages = [
      ...(questionMessages[questionId] || []),
      { role: "user" as const, content: userMessage, createdAt: now, status: "done" as const },
    ];
    const thinkingSteps = buildThinkingSteps(selectedQuestion.title, workflowStage);
    setMessagesForQuestion(questionId, (prev) => [
      ...prev,
      { role: "user", content: userMessage, createdAt: now, status: "done" },
      {
        role: "assistant",
        content: thinkingSteps[0]?.message || "답안을 구성하기 위한 정보를 정리하고 있습니다.",
        createdAt: now,
        status: "thinking",
      },
    ]);
    setIsStreaming(true);
    setStreamPhaseLabel(thinkingSteps[0]?.label || "작성 중...");
    setRequestBanner({
      tone: "progress",
      message: thinkingSteps[0]?.message || "답안을 구성하기 위한 정보를 정리하고 있습니다.",
    });
    let phaseIndex = 0;
    let hasRequestError = false;
    const phaseTimer = window.setInterval(() => {
      phaseIndex = (phaseIndex + 1) % thinkingSteps.length;
      const nextThinkingStep = thinkingSteps[phaseIndex];
      setStreamPhaseLabel(nextThinkingStep?.label || "작성 중...");
      setRequestBanner({
        tone: "progress",
        message:
          nextThinkingStep?.message || "답안을 구성하기 위한 정보를 정리하고 있습니다.",
      });
      setMessagesForQuestion(questionId, (prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        const lastMessage = next[next.length - 1];
        if (lastMessage?.role !== "assistant" || lastMessage.status !== "thinking") {
          return prev;
        }
        next[next.length - 1] = {
          ...lastMessage,
          content:
            nextThinkingStep?.message || "답안을 구성하기 위한 정보를 정리하고 있습니다.",
        };
        return next;
      });
    }, 900);
    let timeoutId: number | null = null;

    try {
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 25000);
      const response = await fetch("/api/career/cover-letters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: prevMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          targetRole: applicationTarget,
          strengths: "문항별 완성도를 높이는 답안을 작성",
          backgroundContext: mergedBackgroundContext,
          personalInfo: resumePayload,
          selectedQuestion: {
            id: selectedQuestion.id,
            title: selectedQuestion.title,
            maxChars: selectedQuestion.maxChars,
          },
          currentAnswer: selectedQuestion.answer || "",
          operation: resolvedOperation,
          workflowStage,
        }),
      });
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!response.ok) {
        const statusCode = response.status;
        const fallbackMessage =
          statusCode === 429
            ? "요청이 많아 잠시 지연되고 있습니다. 잠시 후 다시 시도해주세요."
            : statusCode === 503
              ? "AI API 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요."
            : "AI 요청 실패";
        const errorMessage = await parseApiErrorMessage(response, fallbackMessage);
        throw new Error(`[${statusCode}] ${errorMessage}`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트리밍 응답을 읽을 수 없습니다.");
      const decoder = new TextDecoder();
      let receivedText = "";
      let renderedText = "";
      let pendingText = "";
      const flushTimer = window.setInterval(() => {
        if (!pendingText) return;
        const chunkSize = Math.max(1, Math.ceil(pendingText.length * 0.3));
        renderedText += pendingText.slice(0, chunkSize);
        pendingText = pendingText.slice(chunkSize);
        setMessagesForQuestion(questionId, (prev) => {
          const next = [...prev];
          if (next.length === 0) return next;
          next[next.length - 1] = {
            role: "assistant",
            content: renderedText,
            createdAt: now,
            status: "streaming",
          };
          return next;
        });
      }, 35);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const decoded = decoder.decode(value, { stream: true });
        receivedText += decoded;
        pendingText += decoded;
      }
      while (pendingText.length > 0) {
        await sleep(28);
      }
      window.clearInterval(flushTimer);
      const parsed = parseAssistantProtocol(receivedText);
      renderedText = parsed.cleanedContent || receivedText;
      if (!renderedText.trim() && !parsed.answer?.trim()) {
        throw new Error("AI 응답 본문이 비어 있습니다. 잠시 후 다시 시도해주세요.");
      }
      const currentRequirement =
        questionRequirementMap[questionId] || createDefaultRequirementStatus();
      const mergedRequirement = {
        competency: parsed.competency ?? currentRequirement.competency,
        tone: parsed.tone ?? currentRequirement.tone,
        impact: parsed.impact ?? currentRequirement.impact,
        ready: parsed.ready ?? currentRequirement.ready,
      };
      setMessagesForQuestion(questionId, (prev) => {
        const next = [...prev];
        if (next.length === 0) return next;
        next[next.length - 1] = {
          role: "assistant",
          content: renderedText,
          createdAt: new Date().toISOString(),
          status: "done",
          suggestedAnswer: parsed.answer?.trim() || undefined,
        };
        return next;
      });
      setQuestionRequirementMap((prev) => {
        return {
          ...prev,
          [questionId]: mergedRequirement,
        };
      });
      setQuestionWorkflowMap((prev) => {
        const current = prev[questionId] || createDefaultWorkflowState();
        const nextStage = parsed.stage || current.stage;
        const nowIso = new Date().toISOString();
        const requirementsSatisfied =
          mergedRequirement.competency &&
          mergedRequirement.tone &&
          mergedRequirement.impact;
        const hasAppliedAnswer = Boolean(selectedQuestion.answer?.trim());
        const shouldConfirm =
          hasAppliedAnswer &&
          requirementsSatisfied &&
          mergedRequirement.ready;
        const safeStage: WorkflowStage = shouldConfirm
          ? "confirm"
          : nextStage === "confirm"
            ? current.stage
            : nextStage;
        return {
          ...prev,
          [questionId]: {
            ...current,
            stage: safeStage,
            directionAgreedAt:
              safeStage !== "direction"
                ? current.directionAgreedAt || nowIso
                : current.directionAgreedAt,
            draftRequestedAt:
              safeStage === "draft" || workflowStage === "draft"
                ? current.draftRequestedAt || nowIso
                : current.draftRequestedAt,
            refineCount:
              safeStage === "refine" || workflowStage === "refine"
                ? (current.refineCount || 0) + 1
                : current.refineCount,
            confirmedAt: shouldConfirm ? current.confirmedAt || nowIso : current.confirmedAt,
          },
        };
      });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message.trim() : "";
      const statusMatch = errorMessage.match(/^\[(\d{3})\]\s*(.*)$/);
      const statusCode = statusMatch ? Number(statusMatch[1]) : undefined;
      const description =
        error instanceof Error && error.name === "AbortError"
          ? "응답 시간이 길어 요청이 중단되었습니다. 잠시 후 다시 시도해주세요."
          : statusMatch && statusMatch[2]
            ? statusMatch[2]
            : error instanceof Error && error.message.trim().length > 0
              ? error.message
            : "잠시 후 다시 시도해주세요.";
      toast({
        title: "AI 생성 실패",
        description,
        variant: "destructive",
      });
      hasRequestError = true;
      setStreamPhaseLabel(
        statusCode
          ? `AI 요청 실패 · 오류 코드 ${statusCode}`
          : "AI 요청 실패 · 잠시 후 다시 시도해주세요.",
      );
      setLastAiError({
        message: description,
        statusCode,
      });
      setRequestBanner({
        tone: "error",
        message: description,
        statusCode,
      });
      setMessagesForQuestion(questionId, (prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: buildAiErrorDisplayMessage(description, statusCode),
          createdAt: new Date().toISOString(),
          status: "done",
        };
        return next;
      });
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      window.clearInterval(phaseTimer);
      setIsStreaming(false);
      if (!hasRequestError) {
        setStreamPhaseLabel("");
        setRequestBanner(null);
      }
    }
  };

  useEffect(() => {
    if (phase !== "studio") return;
    if (!selectedQuestion) return;
    if (isStreaming) return;
    const questionId = selectedQuestion.id;
    if ((questionMessages[questionId] || []).length > 0) return;
    if (introRequestedQuestionIdsRef.current.has(questionId)) return;
    introRequestedQuestionIdsRef.current.add(questionId);

    const selectedQuestionSnapshot = selectedQuestion;
    const now = new Date().toISOString();
    setMessagesForQuestion(questionId, () => [
      {
        role: "assistant",
        createdAt: now,
        status: "thinking",
        content: INTRO_THINKING_STEPS[0].message,
      },
    ]);
    setIsStreaming(true);
    setStreamPhaseLabel(INTRO_THINKING_STEPS[0].label || "작성 중...");
    let phaseIndex = 0;
    const phaseTimer = window.setInterval(() => {
      phaseIndex = (phaseIndex + 1) % INTRO_THINKING_STEPS.length;
      const nextThinkingStep = INTRO_THINKING_STEPS[phaseIndex];
      setStreamPhaseLabel(nextThinkingStep?.label || "작성 중...");
      setMessagesForQuestion(questionId, (prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        const lastMessage = next[next.length - 1];
        if (lastMessage?.role !== "assistant" || lastMessage.status !== "thinking") {
          return prev;
        }
        next[next.length - 1] = {
          ...lastMessage,
          content: nextThinkingStep?.message || INTRO_THINKING_STEPS[0].message,
        };
        return next;
      });
    }, 900);

    const experienceLines =
      experienceSnapshot.length > 0
        ? experienceSnapshot
            .slice(0, 6)
            .map((exp, idx) => {
              const tags = exp.tags?.length ? ` [${exp.tags.slice(0, 4).join(", ")}]` : "";
              const techStack = exp.techStack?.length
                ? ` / 기술: ${exp.techStack.slice(0, 5).join(", ")}`
                : "";
              return `${idx + 1}. ${exp.title}${tags}${techStack}`;
            })
            .join("\n")
        : "기반 프로젝트 없음";
    const questionLines =
      form.questions.length > 0
        ? form.questions
            .map((q, idx) => `${idx + 1}. ${q.title || `문항 ${idx + 1}`} (${q.maxChars}자)`)
            .join("\n")
        : "문항 정보 없음";

    const introPrompt = [
      "아래 정보를 반영해서 자기소개서 코칭 시작 인사 메시지 1개를 작성해줘.",
      "반드시 첫 문장은 '안녕하세요, 디벗 AI 자소서 컨설팅입니다.'로 시작해.",
      "사용자가 입력한 기업명, 직무, 현재 선택 문항을 자연스럽게 언급해.",
      "기반 프로젝트은 핵심 키워드 중심으로 간단히 요약해.",
      "문항 작성을 위한 간단 질문 2~3개를 마지막에 자연스럽게 던져줘.",
      "불릿/번호 목록 없이 대화체 단락으로 작성해.",
      "응답 마지막에는 아래 프로토콜 블록을 반드시 포함해:",
      "<dibut_state>",
      "stage=direction",
      "competency=need",
      "tone=need",
      "impact=need",
      "ready=no",
      "</dibut_state>",
      "<dibut_answer></dibut_answer>",
      "",
      `[기업/직무] ${form.company || "미입력"} / ${form.role || "미입력"}`,
      selectedQuestionSnapshot?.title
        ? `[현재 문항] ${selectedQuestionSnapshot.title} (${selectedQuestionSnapshot.maxChars}자)`
        : "[현재 문항] 미선택",
      "[기반 프로젝트]",
      experienceLines,
      "",
      "[전체 문항 목록]",
      questionLines,
    ].join("\n");

    void (async () => {
      let timeoutId: number | null = null;
      try {
        const controller = new AbortController();
        timeoutId = window.setTimeout(() => controller.abort(), 25000);
        const response = await fetch("/api/career/cover-letters/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: [{ role: "user", content: introPrompt }],
            targetRole: applicationTarget,
            strengths: "",
            backgroundContext: mergedBackgroundContext,
            personalInfo: resumePayload,
            selectedQuestion: selectedQuestionSnapshot
              ? {
                  id: selectedQuestionSnapshot.id,
                  title: selectedQuestionSnapshot.title,
                  maxChars: selectedQuestionSnapshot.maxChars,
                }
              : undefined,
            currentAnswer: selectedQuestionSnapshot?.answer || "",
            operation: "intro",
            workflowStage: "direction",
          }),
        });
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!response.ok) {
          const statusCode = response.status;
          const fallbackMessage =
            statusCode === 429
              ? "요청이 많아 안내 메시지 생성을 잠시 미룹니다. 잠시 후 다시 시도해주세요."
              : statusCode === 503
                ? "AI API 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요."
              : "intro 요청 실패";
          const errorMessage = await parseApiErrorMessage(response, fallbackMessage);
          throw new Error(`[${statusCode}] ${errorMessage}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("intro 스트리밍 응답 없음");
        }
        const decoder = new TextDecoder();
        let receivedText = "";
        let renderedText = "";
        let pendingText = "";
        const flushTimer = window.setInterval(() => {
          if (!pendingText) return;
          const chunkSize = Math.max(1, Math.ceil(pendingText.length * 0.25));
          renderedText += pendingText.slice(0, chunkSize);
          pendingText = pendingText.slice(chunkSize);
          setMessagesForQuestion(questionId, (prev) => {
            const next = [...prev];
            if (next.length === 0) return next;
            next[next.length - 1] = {
              role: "assistant",
              content: renderedText,
              createdAt: now,
              status: "streaming",
            };
            return next;
          });
        }, 35);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const decoded = decoder.decode(value, { stream: true });
          receivedText += decoded;
          pendingText += decoded;
        }
        while (pendingText.length > 0) {
          await sleep(28);
        }
        window.clearInterval(flushTimer);
        const parsed = parseAssistantProtocol(receivedText);
        renderedText = parsed.cleanedContent || receivedText;
        if (!renderedText.trim() && !parsed.answer?.trim()) {
          throw new Error("AI 응답 본문이 비어 있습니다. 잠시 후 다시 시도해주세요.");
        }
        setMessagesForQuestion(questionId, (prev) => {
          const next = [...prev];
          if (next.length === 0) return next;
          next[next.length - 1] = {
            role: "assistant",
            content: renderedText,
            createdAt: new Date().toISOString(),
            status: "done",
            suggestedAnswer: parsed.answer?.trim() || undefined,
          };
          return next;
        });
        setQuestionRequirementMap((prev) => ({
          ...prev,
          [questionId]: {
            competency: parsed.competency ?? false,
            tone: parsed.tone ?? false,
            impact: parsed.impact ?? false,
            ready: parsed.ready ?? false,
          },
        }));
      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message.trim() : "";
        const statusMatch = errorMessage.match(/^\[(\d{3})\]\s*(.*)$/);
        const statusCode = statusMatch ? Number(statusMatch[1]) : undefined;
        const description =
          error instanceof Error && error.name === "AbortError"
            ? "응답 시간이 길어 요청이 중단되었습니다. 잠시 후 다시 시도해주세요."
            : statusMatch && statusMatch[2]
              ? statusMatch[2]
              : error instanceof Error && error.message.trim().length > 0
                ? error.message
                : "잠시 후 다시 시도해주세요.";
        setLastAiError({
          message: description,
          statusCode,
        });
        setRequestBanner({
          tone: "error",
          message: description,
          statusCode,
        });
        setMessagesForQuestion(questionId, () => [
          {
            role: "assistant",
            createdAt: new Date().toISOString(),
            status: "done",
            content: buildAiErrorDisplayMessage(description, statusCode),
          },
        ]);
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        window.clearInterval(phaseTimer);
        setIsStreaming(false);
        setStreamPhaseLabel("");
      }
    })();
  }, [
    phase,
    selectedQuestion,
    questionMessages,
    isStreaming,
    experienceSnapshot,
    form.questions,
    form.company,
    form.role,
    applicationTarget,
    mergedBackgroundContext,
    resumePayload,
  ]);

  const workflowSummary = useMemo(() => {
    const total = form.questions.length;
    let directionCount = 0;
    let draftCount = 0;
    let refineCount = 0;
    let confirmedCount = 0;

    form.questions.forEach((question) => {
      const workflow = questionWorkflowMap[question.id] || createDefaultWorkflowState();
      if (workflow.confirmedAt || workflow.stage === "confirm") {
        confirmedCount += 1;
        return;
      }
      if (workflow.stage === "refine") {
        refineCount += 1;
        return;
      }
      if (workflow.stage === "draft") {
        draftCount += 1;
        return;
      }
      directionCount += 1;
    });

    return {
      total,
      directionCount,
      draftCount,
      refineCount,
      confirmedCount,
      completionPercent: total > 0 ? Math.round((confirmedCount / total) * 100) : 0,
    };
  }, [form.questions, questionWorkflowMap]);

  const allQuestionsConfirmed =
    workflowSummary.total > 0 &&
    workflowSummary.confirmedCount === workflowSummary.total;
  const footerStatusText = useMemo(() => {
    if (!allQuestionsConfirmed) {
      return `모든 문항 확정 후 완료할 수 있습니다. (${workflowSummary.confirmedCount}/${workflowSummary.total})`;
    }
    if (saveState === "saving") return "자동 저장 중...";
    if (saveState === "saved") return "자동 저장됨";
    if (saveState === "error") return "자동 저장 실패";
    return "저장 대기";
  }, [allQuestionsConfirmed, workflowSummary, saveState]);

  const completeWizard = async () => {
    debouncedAutosave.cancel();
    await persistCoverLetter(true);
    const resolvedCoverLetterId = coverLetterId || initialCoverLetterId || "";
    if (entrySource === "career") {
      clearWizardSessionState();
      const params = new URLSearchParams();
      params.set("coverLetterSaved", "1");
      if (resolvedCoverLetterId) {
        params.set("coverLetterId", resolvedCoverLetterId);
      }
      router.push(`/career/projects?${params.toString()}`);
      return;
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        WIZARD_LAST_GENERATED_KEY,
        buildCombinedContent(form.questions),
      );
      sessionStorage.setItem(WIZARD_COMPLETED_KEY, "true");
    }
    setPhase("completed");
  };

  const handleContinueToCoverLetters = () => {
    clearWizardSessionState();
    router.push("/career/cover-letters");
  };

  const applySuggestedAnswerToSelectedQuestion = (answer: string) => {
    if (!selectedQuestionId) return;
    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) return;

    updateQuestion(selectedQuestionId, { answer: trimmedAnswer });

    const currentRequirement =
      questionRequirementMap[selectedQuestionId] || createDefaultRequirementStatus();
    const requirementsSatisfied =
      currentRequirement.competency &&
      currentRequirement.tone &&
      currentRequirement.impact &&
      currentRequirement.ready;

    setQuestionWorkflowMap((prev) => {
      const current = prev[selectedQuestionId] || createDefaultWorkflowState();
      const nowIso = new Date().toISOString();
      const nextStage: WorkflowStage = requirementsSatisfied
        ? "confirm"
        : current.stage === "direction"
          ? "draft"
          : current.stage;

      return {
        ...prev,
        [selectedQuestionId]: {
          ...current,
          stage: nextStage,
          directionAgreedAt: current.directionAgreedAt || nowIso,
          draftRequestedAt:
            nextStage === "draft" || nextStage === "refine" || nextStage === "confirm"
              ? current.draftRequestedAt || nowIso
              : current.draftRequestedAt,
          confirmedAt: nextStage === "confirm" ? current.confirmedAt || nowIso : current.confirmedAt,
        },
      };
    });

    const currentQuestionIndex = form.questions.findIndex(
      (question) => question.id === selectedQuestionId,
    );
    const nextQuestion =
      form.questions.find(
        (question) =>
          question.id !== selectedQuestionId && !(question.answer || "").trim(),
      ) || form.questions[currentQuestionIndex + 1];

    setNextSuggestedQuestionId(nextQuestion?.id || null);
    if (typeof window !== "undefined" && nextQuestion?.id) {
      window.setTimeout(() => {
        setNextSuggestedQuestionId((prev) => (prev === nextQuestion.id ? null : prev));
      }, 3600);
    }

    toast({
      title: "문항에 적용했습니다.",
      description: nextQuestion
        ? `오른쪽 문항 목록에서 '${nextQuestion.title || "다음 문항"}'으로 이어서 작성하세요.`
        : "현재 문항이 반영되었습니다. 필요하면 다른 문항으로 이어서 작성하세요.",
    });
  };

  const handleExit = async () => {
    debouncedAutosave.cancel();
    await persistCoverLetter(false);
    clearWizardSessionState();
    onExit();
  };

  return {
    phase,
    intakeStep,
    form,
    chatInput,
    isStreaming,
    streamPhaseLabel,
    lastAiError,
    requestBanner,
    selectedQuestion,
    selectedQuestionId,
    activeMessages,
    expandedExperienceIds,
    experienceSnapshot,
    footerStatusText,
    isSaving,
    latestUpdatedLabel,
    nextSuggestedQuestionId,
    questionMessages,
    questionWorkflowMap,
    allQuestionsConfirmed,
    handleCancelIntake: onCancel,
    handleIntakeBack: () => setIntakeStep(1),
    handleIntakeSubmit: startStudio,
    handleFormChange,
    handleQuestionChange: updateQuestion,
    handleQuestionAdd: addQuestion,
    handlePresetQuestionAdd: addPresetQuestion,
    handleQuestionRemove: removeQuestion,
    handleChatInputChange: setChatInput,
    handleApplySuggestedAnswer: applySuggestedAnswerToSelectedQuestion,
    handleChatSubmit: () => {
      if (!chatInput.trim()) {
        const message = selectedQuestion?.title
          ? `'${selectedQuestion.title}' 문항 기준으로 AI에게 보낼 요청 내용을 먼저 입력해주세요.`
          : "AI에게 보낼 요청 내용을 먼저 입력해주세요.";
        setLastAiError(null);
        setRequestBanner({
          tone: "error",
          message,
        });
        toast({
          title: "요청 내용을 입력해주세요.",
          description: message,
          variant: "destructive",
        });
        return;
      }
      void runChat(chatInput);
      setChatInput("");
    },
    handleSelectQuestion: (id: string) => {
      setSelectedQuestionId(id);
      setNextSuggestedQuestionId((prev) => (prev === id ? null : prev));
    },
    handleToggleExperience: (id: string) =>
      setExpandedExperienceIds((prev) =>
        prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
      ),
    handleComplete: () => void completeWizard(),
    handleContinueToCoverLetters,
    handleExit: () => void handleExit(),
  };
}
