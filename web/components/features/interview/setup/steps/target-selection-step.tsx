"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Briefcase, CheckCircle2, ChevronRight, Link as LinkIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import {
  findRoleTemplateByLabel,
  getRoleCategoryById,
  ROLE_TRACK_CATEGORIES,
} from "@/lib/interview/role-taxonomy";
import {
  buildRoleTrainingJobData,
  getRoleTrackFocusAreas,
} from "@/lib/interview/role-track";

type SetupTrack = "posting" | "role";

interface TargetSelectionStepProps {
  track?: SetupTrack;
}

export function TargetSelectionStep({ track = "posting" }: TargetSelectionStepProps) {
  const {
    targetUrl,
    targetJobCategory,
    setTarget,
    setJobData,
    setStep,
    jobData,
    rolePrepData,
    setRolePrepData,
  } = useInterviewSetupStore();
  const [urlInput, setUrlInput] = useState(targetUrl);
  const [isLoading, setIsLoading] = useState(false);

  const matchedRole = findRoleTemplateByLabel(jobData?.role);
  const initialCategory =
    getRoleCategoryById(rolePrepData?.categoryId || targetJobCategory) ??
    matchedRole?.category ??
    ROLE_TRACK_CATEGORIES[0];
  const initialRoleId = [rolePrepData?.roleId, matchedRole?.role.id].find((roleId) =>
    initialCategory.roles.some((role) => role.id === roleId),
  ) ?? null;

  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategory.id);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialRoleId);

  const selectedCategory = useMemo(
    () => ROLE_TRACK_CATEGORIES.find((category) => category.id === selectedCategoryId) ?? ROLE_TRACK_CATEGORIES[0],
    [selectedCategoryId],
  );
  const selectedRole = useMemo(
    () => selectedCategory.roles.find((role) => role.id === selectedRoleId),
    [selectedCategory, selectedRoleId],
  );

  const autoFocusAreas = useMemo(() => {
    return getRoleTrackFocusAreas(selectedCategory, selectedRole, rolePrepData?.focusAreas);
  }, [rolePrepData?.focusAreas, selectedCategory.roles, selectedRole]);
  const isRoleListScrollable = selectedCategory.roles.length >= 4;

  const roleGuideTitle = selectedRole?.label ?? `${selectedCategory.label} 공통 기준`;
  const roleGuideDescription = selectedRole
    ? `${selectedRole.label} 면접은 ${selectedRole.description} 맥락에서 판단 기준과 문제 접근 방식을 확인하는 질문이 중심이 됩니다.`
    : `${selectedCategory.label} 범주의 공통 직무 기준으로 기본 역량과 문제 접근 방식을 확인하는 질문이 중심이 됩니다.`;
  const roleGuideFocus = autoFocusAreas.slice(0, 2).join(", ");
  const roleGuideAdvice = selectedRole
    ? `${roleGuideFocus || "핵심 포인트"}에 대해 무엇을 했는지보다 왜 그렇게 판단했는지를 함께 설명하는 답변이 좋습니다.`
    : `${roleGuideFocus || "공통 핵심 포인트"}와 관련해 본인이 우선순위를 어떻게 두는지 설명할 수 있으면 좋습니다.`;

  const handleRoleTrackNext = () => {
    const nextPrep = {
      categoryId: selectedCategory.id,
      roleId: selectedRole?.id ?? null,
      focusAreas: autoFocusAreas,
    } as const;

    setRolePrepData(nextPrep);
    setTarget("", selectedCategory.id);
    setJobData(buildRoleTrainingJobData(selectedCategory, selectedRole, nextPrep));
    setStep("final-check");
  };

  const handleNext = async () => {
    if (track === "role") {
      handleRoleTrackNext();
      return;
    }

    if (!urlInput.trim()) return;

    const { targetUrl: storedUrl, jobData: storedJobData } = useInterviewSetupStore.getState();
    if (storedUrl === urlInput && storedJobData && storedJobData.role) {
      setTarget(urlInput, "Custom");
      setStep("jd-check");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/interview/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse");
      }

      const result = data.data;

      setTarget(urlInput, "Custom");
      setRolePrepData(null);
      setJobData({
        role: result.title || "Unknown Position",
        company: result.company || "Unknown Company",
        companyDescription: result.description || "",
        teamCulture: result.culture || [],
        techStack: result.techStack || [],
        responsibilities: result.responsibilities || [],
        requirements: result.requirements || [],
        preferred: result.preferred || [],
      });
      setStep("jd-check");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "분석 실패";
      alert(`분석 실패: ${message}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (track === "posting") {
    return (
      <div className="max-w-5xl mx-auto py-12 px-6">
        <div className="mb-10 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">어떤 포지션에 지원하시나요?</h1>
          <p className="text-muted-foreground text-lg">
            채용 공고 URL을 입력해주세요.
            <br />
            AI가 JD를 분석하여 맞춤형 면접을 준비해드립니다.
          </p>
        </div>

        <Card className="mb-8 border-2 hover:border-primary/50 transition-colors shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" /> 채용 공고 URL
            </CardTitle>
            <CardDescription>사람인, 원티드, 점핏 등 채용 플랫폼의 공고 링크를 입력하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="https://..."
                  className="pl-9 h-12 text-base"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                />
              </div>
              <Button size="lg" className="h-12 px-6" onClick={handleNext} disabled={isLoading || !urlInput}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    분석 중...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    다음 <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-6">
      <div className="mb-3 text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">어떤 직무를 기준으로 준비할까요?</h1>
        <p className="text-muted-foreground text-base leading-7">
          채용공고 대신 목표 직무를 먼저 정하면,
          <br />
          그 기준으로 질문 흐름을 자동으로 맞춥니다.
        </p>
      </div>

      <div className="min-h-[680px] overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-sm">
        <div className="border-b border-border/60 px-6 py-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Briefcase className="w-4 h-4 text-primary" />
            목표 직무 설정
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            공고 기반 셋업처럼 핵심 정보만 빠르게 고르면 됩니다. 세부 직무를 고르지 않으면 범주 공통 기준으로 진행합니다.
          </p>
        </div>

        <div className="grid gap-0 md:grid-cols-[168px_minmax(0,1fr)]">
          <aside className="border-b border-border/60 bg-muted/15 md:border-b-0 md:border-r">
            <div className="px-3 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">직무 범주</p>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                  선택 가능
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {ROLE_TRACK_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      setSelectedRoleId(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all",
                      selectedCategoryId === category.id
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                    )}
                  >
                    <span>{category.label}</span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4",
                        selectedCategoryId === category.id ? "text-primary" : "opacity-50",
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                진하게 표시된 항목이 현재 선택입니다.
              </p>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="border-b border-border/60 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">{selectedCategory.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedCategory.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  세부 직무 선택
                </span>
              </div>
            </div>

            <div className="px-3 py-3">
              <div
                className={cn(
                  "space-y-2",
                  isRoleListScrollable && "max-h-[360px] overflow-y-auto pr-1",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedRoleId(null)}
                  className={cn(
                    "flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left transition-all",
                    selectedRoleId === null
                      ? "border-primary/30 bg-primary/[0.08] shadow-sm ring-1 ring-primary/15"
                      : "border-border/70 bg-background hover:border-primary/20 hover:bg-primary/[0.04]",
                  )}
                >
                  <div className="pr-4">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className={cn("font-semibold", selectedRoleId === null && "text-primary")}>세부 직무 선택 안 함</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCategory.label} 범주의 공통 질문 흐름으로 면접을 구성합니다.
                      </p>
                    </div>
                  </div>
                  {selectedRoleId === null && <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />}
                </button>

                {selectedCategory.roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={cn(
                      "flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left transition-all",
                      selectedRoleId === role.id
                        ? "border-primary/30 bg-primary/[0.08] shadow-sm ring-1 ring-primary/15"
                        : "border-border/70 bg-background hover:border-primary/20 hover:bg-primary/[0.04]",
                    )}
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className={cn("font-semibold", selectedRoleId === role.id && "text-primary")}>{role.label}</p>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                      <p className="mt-3 text-[11px] font-semibold text-muted-foreground">중점 확인</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {role.focusAreas.slice(0, 3).map((focusArea) => (
                          <span
                            key={focusArea}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-medium",
                              selectedRoleId === role.id
                                ? "border-primary/20 bg-primary text-primary-foreground"
                                : "border-border/60 bg-muted text-muted-foreground",
                            )}
                          >
                            {focusArea}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedRoleId === role.id && <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-border/60 bg-muted/15 px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {selectedCategory.label}
                </span>
                <p className="truncate text-base font-semibold text-foreground">{roleGuideTitle}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{roleGuideDescription}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{roleGuideAdvice}</p>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-2 md:w-[170px]">
              <Button size="lg" className="h-11 rounded-full px-7" onClick={handleRoleTrackNext}>
                다음 단계
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-center text-[11px] leading-5 text-muted-foreground">
                다음 단계에서 면접 기준을 확인합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
