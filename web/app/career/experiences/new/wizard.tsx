"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getWorkspaceExperienceImportCandidatesAction,
  markWorkspaceExperienceCandidateImportedAction,
  prepareWorkspaceExperienceDraftAction,
  saveExperienceAction,
  type ExperienceInput,
  type WorkspaceExperienceImportCandidate,
} from "../actions";
import { Button } from "@/components/ui/button";
import { MonthRangePicker } from "@/components/features/resume/MonthRangePicker";
import {
  X,
  ChevronRight,
  Check,
  BriefcaseBusiness,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const STEPS = [
  { id: "basic", label: "기본 정보" },
  {
    id: "s",
    question: "이 경험은 어떤 배경에서 시작하게 된 건가요?",
    placeholder:
      "예: 팀 프로젝트에서 백엔드 담당, 응답 속도가 느린 문제가 발생했어요",
  },
  {
    id: "t",
    question: "여기서 나의 주된 임무는 무엇이었나요?",
    placeholder: "예: API 응답 시간을 50% 이상 단축해야 했어요",
  },
  {
    id: "a",
    question: "구체적으로 어떤 행동을 했나요?",
    placeholder: "예: 쿼리를 분석하고 N+1 문제를 찾아 배치 쿼리로 개선했어요",
  },
  {
    id: "d",
    question: "진행하며 가장 힘들었던 점은 무엇인가요?",
    placeholder:
      "예: 레거시 코드가 많아 구조를 완전히 파악하는 데 시간이 오래 걸렸어요",
  },
  {
    id: "r",
    question: "어떤 성과나 결과물이 있었나요?",
    placeholder: "예: 응답 속도를 60% 개선했고 사용자 이탈률을 15% 줄였어요",
  },
  {
    id: "i",
    question: "이 경험을 통해 새롭게 깨닫거나 배운 점은 무엇인가요?",
    placeholder:
      "예: 성능 문제는 항상 데이터 구조와 흐름에서 답을 찾아야 함을 배웠어요",
  },
];

const IMPORT_LOADING_STEPS = [
  {
    id: "collect",
    title: "워크스페이스 기록을 불러오는 중",
    description: "완료 태스크와 역할 정보를 정리하고 있어요.",
  },
  {
    id: "analyze",
    title: "활동 내용을 분석하는 중",
    description: "핵심 성과와 경험 포인트를 추출하고 있어요.",
  },
  {
    id: "draft",
    title: "경험 초안을 작성하는 중",
    description: "기본정보와 질문 단계 답변을 채우고 있어요.",
  },
  {
    id: "polish",
    title: "문장을 다듬는 중",
    description: "읽기 쉬운 표현으로 정리하고 태그를 보완하고 있어요.",
  },
];

function formatDateLabel(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("ko-KR");
}

function buildCandidatePeriod(candidate: WorkspaceExperienceImportCandidate) {
  if (candidate.periodLabel?.trim()) {
    return candidate.periodLabel.trim();
  }
  const start = formatDateLabel(candidate.startedAt);
  const end = formatDateLabel(candidate.completedAt);
  return `${start} ~ ${end}`;
}

export default function ExperienceWizardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredWorkspaceId = searchParams.get("workspaceId")?.trim() || null;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Partial<ExperienceInput>>({
    company: "",
    period: "",
    tags: [],
    situation: "",
    role: "",
    solution: "",
    difficulty: "",
    result: "",
    lesson: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [applyingWorkspaceId, setApplyingWorkspaceId] = useState<string | null>(
    null,
  );
  const [loadingWorkspaceName, setLoadingWorkspaceName] = useState<string | null>(
    null,
  );
  const [importLoadingStepIndex, setImportLoadingStepIndex] = useState(0);
  const [candidates, setCandidates] = useState<WorkspaceExperienceImportCandidate[]>(
    [],
  );
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState<string | null>(
    null,
  );
  const [workspaceDraftNotice, setWorkspaceDraftNotice] = useState<string | null>(
    null,
  );

  const isImportPreparing = Boolean(applyingWorkspaceId);

  useEffect(() => {
    if (!isImportPreparing) {
      setImportLoadingStepIndex(0);
      return;
    }

    setImportLoadingStepIndex(0);
    const timer = window.setInterval(() => {
      setImportLoadingStepIndex((prev) =>
        prev >= IMPORT_LOADING_STEPS.length - 1 ? prev : prev + 1,
      );
    }, 1300);

    return () => {
      window.clearInterval(timer);
    };
  }, [isImportPreparing]);

  useEffect(() => {
    let cancelled = false;

    const loadCandidates = async () => {
      try {
        setCandidatesLoading(true);
        const next = await getWorkspaceExperienceImportCandidatesAction();
        if (!cancelled) {
          setCandidates(next);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setCandidatesLoading(false);
        }
      }
    };

    void loadCandidates();

    return () => {
      cancelled = true;
    };
  }, []);

  const pendingCandidates = useMemo(() => {
    const pending = candidates.filter((candidate) => candidate.status === "PENDING");
    if (!preferredWorkspaceId) {
      return pending;
    }
    return [...pending].sort((a, b) => {
      if (a.workspaceId === preferredWorkspaceId) return -1;
      if (b.workspaceId === preferredWorkspaceId) return 1;
      return 0;
    });
  }, [candidates, preferredWorkspaceId]);

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const tags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    setFormData((prev) => ({ ...prev, tags }));
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      return;
    }
    void handleSave();
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleSave = async () => {
    if (!formData.company?.trim()) {
      alert("활동명(제목)은 필수입니다. 작성 항목으로 돌아갑니다.");
      setCurrentStepIndex(0);
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveExperienceAction(formData as ExperienceInput);

      if (
        selectedWorkspaceId &&
        saved.success &&
        saved.experience?.id &&
        typeof saved.experience.id === "string"
      ) {
        try {
          await markWorkspaceExperienceCandidateImportedAction(
            selectedWorkspaceId,
            saved.experience.id,
          );
        } catch (markError) {
          console.warn("[career] failed to mark workspace candidate imported:", markError);
        }
      }

      router.push("/career/experiences");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyWorkspaceCandidate = async (
    workspaceId: string,
    workspaceName: string,
  ) => {
    try {
      setLoadingWorkspaceName(workspaceName);
      setApplyingWorkspaceId(workspaceId);
      const result = await prepareWorkspaceExperienceDraftAction(workspaceId);
      if (!result.success) {
        throw new Error("워크스페이스 경험 초안 불러오기에 실패했습니다.");
      }

      const nextTags = Array.isArray(result.draft.tags) ? result.draft.tags : [];
      setFormData((prev) => ({
        ...prev,
        ...result.draft,
        tags: nextTags,
      }));
      setTagsInput(nextTags.join(", "));
      setSelectedWorkspaceId(result.workspaceId);
      setSelectedWorkspaceName(result.workspaceName);
      setWorkspaceDraftNotice(result.message);
      setImportDialogOpen(false);
      toast.success(`'${result.workspaceName}' 활동 초안을 불러왔습니다.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "워크스페이스 경험 초안 불러오기에 실패했습니다.",
      );
    } finally {
      setApplyingWorkspaceId(null);
      setLoadingWorkspaceName(null);
    }
  };

  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="h-full flex flex-col">
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="font-bold text-[14px]">나의 경험 기록하기</div>
        <button
          onClick={() => router.push("/career/experiences")}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          {currentStepIndex === 0 && (
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  먼저 기본 정보를 입력할게요
                </h1>
                <p className="text-[14px] text-slate-500">
                  경험에 붙일 이름표를 달아주세요.
                </p>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    <Sparkles className="h-4 w-4 text-primary" />
                    워크스페이스 경험 불러오기
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8"
                    onClick={() => setImportDialogOpen(true)}
                    disabled={candidatesLoading}
                  >
                    {candidatesLoading ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    불러오기
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  후보를 선택하면 AI가 워크스페이스 활동 내역을 분석해 기본정보와
                  질문 단계 초안을 자동으로 채웁니다.
                </p>
                {selectedWorkspaceName ? (
                  <p className="mt-2 text-xs font-medium text-primary">
                    현재 적용된 워크스페이스: {selectedWorkspaceName}
                  </p>
                ) : null}
              </div>

              {workspaceDraftNotice ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {workspaceDraftNotice}
                </div>
              ) : null}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                    활동명 (프로젝트 / 직무 / 대외활동 등)
                  </label>
                  <input
                    value={formData.company || ""}
                    onChange={(event) =>
                      setFormData({ ...formData, company: event.target.value })
                    }
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[15px] font-medium placeholder:text-slate-300"
                    placeholder="예: GDSC 웹 파트너"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                    진행 기간 (언제부터 언제까지였나요?)
                  </label>
                  <MonthRangePicker
                    value={formData.period || ""}
                    onChange={(value) => setFormData({ ...formData, period: value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                    핵심 태그 (쉼표로 구분)
                  </label>
                  <input
                    value={tagsInput}
                    onChange={(event) => handleTagsChange(event.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px]"
                    placeholder="예: 리더십, 소통, React, 배포"
                  />
                </div>
              </div>

              <div className="pt-8">
                <Button
                  onClick={handleNext}
                  disabled={isSaving || !formData.company?.trim()}
                  className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-[16px] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  다음 단계로 <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {currentStepIndex > 0 && currentStepIndex < STEPS.length && (
            <div className="space-y-10" key={currentStepIndex}>
              <div className="space-y-4">
                <div className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary font-bold text-[12px] rounded-full uppercase tracking-widest">
                  Question {currentStepIndex} of 6
                </div>
                <h1 className="text-3xl font-bold leading-tight text-slate-900 dark:text-white">
                  {STEPS[currentStepIndex].question}
                </h1>
                <p className="text-[14px] text-slate-500">
                  키워드나 짧은 문장으로 가볍게 적어도 좋고, 서술형으로 꼼꼼히 적어도
                  좋습니다.
                </p>
                {workspaceDraftNotice && selectedWorkspaceName && currentStepIndex === 1 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {selectedWorkspaceName} 활동 분석 초안이 반영되어 있습니다. 필요하면
                    수정하고 진행하세요.
                  </div>
                ) : null}
              </div>

              <Textarea
                value={
                  currentStepIndex === 1
                    ? formData.situation || ""
                    : currentStepIndex === 2
                      ? formData.role || ""
                      : currentStepIndex === 3
                        ? formData.solution || ""
                        : currentStepIndex === 4
                          ? formData.difficulty || ""
                          : currentStepIndex === 5
                            ? formData.result || ""
                            : formData.lesson || ""
                }
                onChange={(event) => {
                  const value = event.target.value;
                  if (currentStepIndex === 1) {
                    setFormData({ ...formData, situation: value });
                    return;
                  }
                  if (currentStepIndex === 2) {
                    setFormData({ ...formData, role: value });
                    return;
                  }
                  if (currentStepIndex === 3) {
                    setFormData({ ...formData, solution: value });
                    return;
                  }
                  if (currentStepIndex === 4) {
                    setFormData({ ...formData, difficulty: value });
                    return;
                  }
                  if (currentStepIndex === 5) {
                    setFormData({ ...formData, result: value });
                    return;
                  }
                  setFormData({ ...formData, lesson: value });
                }}
                className="w-full min-h-[160px] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[16px] leading-relaxed resize-none shadow-sm placeholder:text-slate-300"
                placeholder={STEPS[currentStepIndex].placeholder}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    handleNext();
                  }
                }}
              />

              <div className="flex flex-col gap-3 pt-6">
                <Button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-[16px] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center gap-2 justify-center"
                >
                  {currentStepIndex === STEPS.length - 1 ? (
                    <>
                      <Check className="w-5 h-5" />
                      기록 완료 및 저장
                    </>
                  ) : (
                    <>
                      다음 질문
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSkip}
                  variant="ghost"
                  disabled={isSaving}
                  className="w-full h-12 text-slate-400 hover:text-slate-600 font-medium"
                >
                  이 항목은 건너뛰기
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>워크스페이스 경험 불러오기</DialogTitle>
            <DialogDescription>
              후보를 선택하면 기본정보와 질문 단계 답변을 AI가 초안으로 채워줍니다.
              채워진 내용은 이후 직접 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {candidatesLoading ? (
              <div className="py-8 text-sm text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                후보를 불러오는 중...
              </div>
            ) : pendingCandidates.length === 0 ? (
              <div className="py-8 text-sm text-slate-500 text-center">
                불러올 수 있는 워크스페이스 경험 후보가 없습니다.
              </div>
            ) : (
              pendingCandidates.map((candidate) => (
                <div
                  key={candidate.workspaceId}
                  className={`rounded-xl border p-3 ${
                    preferredWorkspaceId === candidate.workspaceId
                      ? "border-primary/50 bg-primary/5"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <BriefcaseBusiness className="h-4 w-4 text-primary" />
                        <span className="truncate">{candidate.workspaceName}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {buildCandidatePeriod(candidate)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {candidate.taskSummary || "완료 태스크 요약이 없습니다."}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0"
                      disabled={Boolean(applyingWorkspaceId)}
                      onClick={() =>
                        handleApplyWorkspaceCandidate(
                          candidate.workspaceId,
                          candidate.workspaceName,
                        )
                      }
                    >
                      {applyingWorkspaceId === candidate.workspaceId ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      이 경험으로 채우기
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={Boolean(applyingWorkspaceId)}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isImportPreparing ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-background p-5 shadow-2xl dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {IMPORT_LOADING_STEPS[importLoadingStepIndex]?.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {IMPORT_LOADING_STEPS[importLoadingStepIndex]?.description}
                </p>
                {loadingWorkspaceName ? (
                  <p className="text-xs font-medium text-primary">
                    대상 워크스페이스: {loadingWorkspaceName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{
                  width: `${((importLoadingStepIndex + 1) / IMPORT_LOADING_STEPS.length) * 100}%`,
                }}
              />
            </div>

            <div className="mt-4 space-y-2">
              {IMPORT_LOADING_STEPS.map((step, index) => {
                const done = index < importLoadingStepIndex;
                const current = index === importLoadingStepIndex;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 text-xs ${
                      done
                        ? "text-emerald-600"
                        : current
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : current ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-current/40" />
                    )}
                    <span>{step.title}</span>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              AI가 워크스페이스 활동을 분석해 작성 초안을 만드는 중입니다.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
