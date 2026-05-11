"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, CheckCircle2, ChevronRight, Link as LinkIcon, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getRoleCategoryVisual, getRoleDetailIcon } from "@/lib/interview/role-visuals";
import { TechLogoChip } from "@/components/features/interview/tech-logo-chip";

type SetupTrack = "posting" | "role";

const ROLE_SETUP_STEPS = [
  { label: "직무 범주", description: "큰 방향 선택" },
  { label: "세부 직무", description: "역할 기준 조정" },
  { label: "면접 기준", description: "질문 흐름 확정" },
] as const;

const POSTING_FLOW_ITEMS = [
  {
    label: "URL 입력",
    description: "공고 링크 수집",
    icon: "/images/interview/setup/flow-icons/setup-flow-url-input.png",
  },
  {
    label: "JD 분석",
    description: "요구사항 추출",
    icon: "/images/interview/setup/flow-icons/setup-flow-jd-analysis.png",
  },
  {
    label: "이력서 매칭",
    description: "경험 연결",
    icon: "/images/interview/setup/flow-icons/setup-flow-resume-match.png",
  },
] as const;

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
  const selectedCategoryVisual = getRoleCategoryVisual(selectedCategory.id);
  const selectedRoleIcon = getRoleDetailIcon(selectedRole?.id);
  const commonRoleIcon = getRoleDetailIcon(null);

  const autoFocusAreas = useMemo(() => {
    return getRoleTrackFocusAreas(selectedCategory, selectedRole, rolePrepData?.focusAreas);
  }, [rolePrepData?.focusAreas, selectedCategory, selectedRole]);
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
        interviewLevel: "auto",
        interviewTrack: "posting",
        sourceUrl: urlInput.trim(),
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
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cfe1c1] bg-[#f3faef] px-3 py-1 text-xs font-bold text-[#5f8f36]">
              <LinkIcon className="h-3.5 w-3.5" />
              공고 설계 · 1/4
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-[#172033] md:text-4xl">
                어떤 포지션에 지원하시나요?
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#5f6b7a]">
                채용 공고 URL을 넣으면 JD 핵심 요구사항을 분석하고, 이력서와 맞춰 실제 지원 상황에 가까운 질문 흐름을 만듭니다.
              </p>
            </div>
          </div>

          <div className="relative hidden h-64 lg:block">
            <div className="absolute inset-x-8 bottom-6 h-14 rounded-full bg-[#172033]/[0.08] blur-2xl" />
            <Image
              src="/images/interview/setup/hero/posting-setup-hero.png"
              alt="채용공고 기반 면접 설정"
              width={760}
              height={420}
              priority
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_24px_24px_rgba(23,32,51,0.12)]"
            />
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-[#dfe7ef] bg-white shadow-sm">
          <div className="border-b border-[#e6edf4] px-6 py-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-[#172033]">채용 공고 URL</p>
                <p className="mt-1 text-sm text-[#6d7888]">사람인, 원티드, 점핏 등 공개 공고 링크를 입력하세요.</p>
              </div>
              <div className="grid min-w-[300px] grid-cols-3 gap-2">
                {POSTING_FLOW_ITEMS.map((item, index) => (
                  <div key={item.label} className="rounded-2xl border border-[#dfe7ef] bg-[#f8fafc] px-3 py-3 text-center">
                    <Image src={item.icon} alt="" width={72} height={72} className="mx-auto h-12 w-12 object-contain" />
                    <p className="mt-1 text-[11px] font-black text-[#7cad46]">0{index + 1}</p>
                    <p className="mt-0.5 text-xs font-black text-[#172033]">{item.label}</p>
                    <p className="mt-0.5 text-[11px] text-[#8a96a6]">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a96a6]" />
                <Input
                  placeholder="https://..."
                  className="h-14 rounded-xl border-[#dfe7ef] bg-[#fbfcfe] pl-11 text-base shadow-sm"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                />
              </div>
              <p className="text-sm leading-6 text-[#6d7888]">
                분석이 끝나면 회사/직무/요구역량을 확인하고, 다음 단계에서 이력서를 연결합니다.
              </p>
              <Button
                size="lg"
                className="h-12 rounded-xl bg-[#7cad46] px-7 text-base font-bold hover:bg-[#6f9f3b]"
                onClick={handleNext}
                disabled={isLoading || !urlInput}
              >
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

            <div className="rounded-2xl border border-[#e6edf4] bg-[#f8fafc] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#172033]">
                <Sparkles className="h-4 w-4 text-[#7cad46]" />
                분석 후 생성되는 기준
              </div>
              <div className="mt-4 space-y-3 text-sm text-[#5f6b7a]">
                <p>지원 직무와 주요 업무</p>
                <p>필수/우대 역량</p>
                <p>이력서 매칭 질문 포인트</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 pb-20">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#cfe1c1] bg-[#f3faef] px-3 py-1 text-xs font-bold text-[#5f8f36]">
          <Briefcase className="h-3.5 w-3.5" />
          직무 설계 · 1/2
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-[#172033] md:text-4xl">
          어떤 직무를 기준으로 준비할까요?
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-[#5f6b7a]">
          채용공고 없이도 목표 직무를 먼저 정하면, 선택한 역할 기준으로 질문 흐름을 자동 구성합니다.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-[30px] border border-[#dfe7ef] bg-white shadow-sm">
        <div className="grid gap-6 border-b border-[#e6edf4] bg-[#fbfcfe] px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <div className="grid gap-3 sm:grid-cols-3">
              {ROLE_SETUP_STEPS.map((step, index) => (
                <div key={step.label} className="rounded-2xl border border-[#dfe7ef] bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7cad46] text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#172033]">{step.label}</p>
                      <p className="mt-0.5 text-xs text-[#6d7888]">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-[#6d7888]">
              세부 직무를 고르지 않으면 범주 공통 기준으로 진행하고, 고르면 해당 역할에서 자주 검증되는 역량으로 질문을 좁힙니다.
            </p>
          </div>

          <div className="relative hidden h-56 lg:block">
            <div className={cn("absolute inset-x-10 bottom-4 h-12 rounded-full blur-2xl", selectedCategoryVisual.glow)} />
            <Image
              src="/images/interview/setup/hero/role-setup-flow.png"
              alt="직무 기반 면접 흐름"
              width={700}
              height={420}
              priority
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_24px_24px_rgba(23,32,51,0.12)]"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-[#e6edf4] bg-[#f8fafc] p-4 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a96a6]">Category</p>
              <span className="rounded-full bg-[#edf6e6] px-2 py-1 text-[11px] font-bold text-[#6f9f3b]">8개</span>
            </div>
            <div className="mt-3 space-y-2">
              {ROLE_TRACK_CATEGORIES.map((category) => {
                const visual = getRoleCategoryVisual(category.id);
                const isSelected = selectedCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      setSelectedRoleId(null);
                    }}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all",
                      isSelected
                        ? "bg-white font-black text-[#172033] shadow-sm ring-1 ring-[#cfe1c1]"
                        : "text-[#5f6b7a] hover:bg-white hover:text-[#172033]",
                    )}
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                      <span className={cn("absolute inset-1 rounded-full blur-md", visual.glow, isSelected ? "opacity-90" : "opacity-0 group-hover:opacity-70")} />
                      <Image
                        src={visual.icon}
                        alt=""
                        width={52}
                        height={52}
                        className="relative h-10 w-10 object-contain"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{category.label}</span>
                    <ChevronRight className={cn("h-4 w-4", isSelected ? "text-[#7cad46]" : "text-[#a1acba]")} />
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="grid gap-5 border-b border-[#e6edf4] px-6 py-5 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  <span className={cn("absolute inset-2 rounded-full blur-xl", selectedCategoryVisual.glow)} />
                  <motion.div
                    key={selectedCategory.id}
                    initial={{ opacity: 0, y: 8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22 }}
                    className="relative"
                  >
                    <Image
                      src={selectedCategoryVisual.icon}
                      alt=""
                      width={120}
                      height={120}
                      className="h-20 w-20 object-contain drop-shadow-[0_14px_16px_rgba(23,32,51,0.12)]"
                    />
                  </motion.div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a96a6]">Selected Role Track</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[#172033]">{selectedCategory.label}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#5f6b7a]">{selectedCategory.description}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#dfe7ef] bg-[#fbfcfe] px-4 py-3 text-sm">
                <p className="font-black text-[#172033]">{selectedRole ? "세부 직무 선택됨" : "공통 기준"}</p>
                <p className="mt-1 text-xs leading-5 text-[#6d7888]">
                  {selectedRole ? "선택한 역할 기준으로 질문 난도를 좁힙니다." : "범주 공통 질문으로 넓게 시작합니다."}
                </p>
              </div>
            </div>

            <div className="px-5 py-5">
              <div className={cn("grid gap-3", isRoleListScrollable && "max-h-[410px] overflow-y-auto pr-1")}>
                <button
                  type="button"
                  onClick={() => setSelectedRoleId(null)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all",
                    selectedRoleId === null
                      ? "border-[#b8dca1] bg-[#f3faef] shadow-sm ring-1 ring-[#cfe1c1]"
                      : "border-[#dfe7ef] bg-white hover:border-[#cfe1c1] hover:bg-[#fbfcfe]",
                  )}
                >
                  <Image src={commonRoleIcon} alt="" width={72} height={72} className="h-14 w-14 shrink-0 object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-black", selectedRoleId === null ? "text-[#5f8f36]" : "text-[#172033]")}>
                      세부 직무 선택 안 함
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#5f6b7a]">
                      {selectedCategory.label} 범주의 공통 질문 흐름으로 면접을 구성합니다.
                    </p>
                  </div>
                  {selectedRoleId === null ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[#7cad46]" /> : null}
                </button>

                {selectedCategory.roles.map((role) => {
                  const isSelected = selectedRoleId === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all",
                        isSelected
                          ? "border-[#b8dca1] bg-[#f3faef] shadow-sm ring-1 ring-[#cfe1c1]"
                          : "border-[#dfe7ef] bg-white hover:border-[#cfe1c1] hover:bg-[#fbfcfe]",
                      )}
                    >
                      <Image
                        src={getRoleDetailIcon(role.id)}
                        alt=""
                        width={72}
                        height={72}
                        className="h-14 w-14 shrink-0 object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className={cn("font-black", isSelected ? "text-[#5f8f36]" : "text-[#172033]")}>{role.label}</p>
                          <p className="text-sm text-[#6d7888]">{role.description}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {role.focusAreas.slice(0, 3).map((focusArea) => (
                            <span
                              key={focusArea}
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-xs font-bold",
                                isSelected
                                  ? "border-[#cfe1c1] bg-white text-[#5f8f36]"
                                  : "border-[#dfe7ef] bg-[#f8fafc] text-[#637083]",
                              )}
                            >
                              {focusArea}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {role.techStack.slice(0, 4).map((tech) => (
                            <TechLogoChip
                              key={tech}
                              label={tech}
                              className={cn(
                                "min-h-7 px-2 py-0.5 text-[11px]",
                                isSelected
                                  ? "border-[#cfe1c1] bg-white text-[#5f8f36]"
                                  : "border-[#dfe7ef] bg-[#fbfcfe] text-[#637083]",
                              )}
                              iconClassName="h-4 w-4"
                            />
                          ))}
                        </div>
                      </div>
                      {isSelected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[#7cad46]" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-[#e6edf4] bg-[#fbfcfe] px-6 py-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 gap-4">
              <Image src={selectedRoleIcon} alt="" width={72} height={72} className="h-14 w-14 shrink-0 object-contain" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#637083] shadow-sm">
                    {selectedCategory.label}
                  </span>
                  <p className="truncate text-base font-black text-[#172033]">{roleGuideTitle}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5f6b7a]">{roleGuideDescription}</p>
                <p className="mt-1 text-sm leading-6 text-[#5f6b7a]">{roleGuideAdvice}</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-2 md:w-[190px]">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-[#7cad46] px-7 font-bold hover:bg-[#6f9f3b]"
                onClick={handleRoleTrackNext}
              >
                다음 단계
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-center text-xs leading-5 text-[#8a96a6]">다음 단계에서 면접 기준을 확인합니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
