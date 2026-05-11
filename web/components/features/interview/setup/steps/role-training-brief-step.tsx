"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, Clock3, Layers3, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getRoleTrackFocusAreas,
  getRoleTrackKeywords,
} from "@/lib/interview/role-track";
import { getRoleCategoryById, ROLE_TRACK_CATEGORIES } from "@/lib/interview/role-taxonomy";
import { getRoleCategoryVisual, getRoleDetailIcon } from "@/lib/interview/role-visuals";
import { startInterviewPreflight } from "@/lib/interview/start-interview-preflight";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { TechLogoChip } from "@/components/features/interview/tech-logo-chip";
import { InterviewLevelCard } from "./interview-level-card";
import {
  buildInterviewTypePayload,
  resolveInterviewTypeVisual,
} from "@/lib/interview/interview-type-visuals";

export function RoleTrainingBriefStep() {
  const router = useRouter();
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const { jobData, rolePrepData, updateJobData, setInterviewSessionId, setStep } = useInterviewSetupStore();

  if (!jobData || !rolePrepData) {
    return (
      <div className="p-8 text-center">
        <p>직무 설계 정보가 없습니다. 처음 단계부터 다시 진행해주세요.</p>
        <Button onClick={() => setStep("target")} className="mt-4">
          직무 설계로 이동
        </Button>
      </div>
    );
  }

  const category =
    getRoleCategoryById(rolePrepData.categoryId) ??
    ROLE_TRACK_CATEGORIES.find((item) => item.roles.some((role) => role.id === rolePrepData.roleId)) ??
    ROLE_TRACK_CATEGORIES[0];
  const selectedRole = category.roles.find((role) => role.id === rolePrepData.roleId);
  const isCommonTrack = !selectedRole;
  const focusAreas = getRoleTrackFocusAreas(category, selectedRole, rolePrepData.focusAreas);
  const roleKeywords = getRoleTrackKeywords(category, selectedRole).slice(0, isCommonTrack ? 6 : 5);
  const roleTitle = selectedRole?.label ?? `${category.label} 공통 기준`;
  const roleDescription = selectedRole?.description ?? category.description;
  const questionFlowLabel = selectedRole ? "선택한 세부 직무 기준" : `${category.label} 범주의 공통 기준`;
  const categoryVisual = getRoleCategoryVisual(category.id);
  const selectedRoleIcon = getRoleDetailIcon(selectedRole?.id);
  const briefingSteps = [
    { label: "직무 기준", value: category.label },
    { label: "질문 흐름", value: questionFlowLabel },
    { label: "진행 시간", value: "10분 고정" },
  ] as const;
  const handleStartInterview = async () => {
    if (isStartingInterview) return;
    setIsStartingInterview(true);
    try {
      const baseJobData = { ...jobData, interviewTrack: "role" as const };
      const interviewTypePayload = buildInterviewTypePayload(resolveInterviewTypeVisual({
        sessionType: "live_interview",
        role: baseJobData.role,
        company: baseJobData.company,
        jobData: baseJobData,
        sourceText: [
          category.label,
          roleTitle,
          roleDescription,
          focusAreas,
          roleKeywords,
          baseJobData.techStack,
        ].join(" "),
      }));
      const { sessionId } = await startInterviewPreflight({
        sessionStartEndpoint: "/api/interview/session/start",
        sessionStartBody: {
          mode: "video",
          personality: "professional",
          jobData: { ...baseJobData, ...interviewTypePayload },
          resumeData: {},
          targetDurationSec: 10 * 60,
          closingThresholdSec: 60,
        },
      });
      setInterviewSessionId(sessionId);
      router.push(`/interview/room/video?duration=10&track=role&sessionId=${encodeURIComponent(sessionId)}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "면접 시작 준비에 실패했습니다.");
    } finally {
      setIsStartingInterview(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 pb-20">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#cfe1c1] bg-[#f3faef] px-3 py-1 text-xs font-bold text-[#5f8f36]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          직무 설계 · 2/2
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-[#172033] md:text-4xl">
          이 기준으로 면접을 시작할까요?
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-[#5f6b7a]">
          선택한 직무 기준, 질문 포커스, 면접 난이도를 확인한 뒤 10분 화상면접으로 바로 들어갑니다.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-[30px] border border-[#dfe7ef] bg-white shadow-sm">
        <div className="grid gap-6 border-b border-[#e6edf4] bg-[#fbfcfe] px-6 py-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div className="flex min-w-0 gap-5">
            <div className="relative hidden h-28 w-28 shrink-0 items-center justify-center sm:flex">
              <span className={cn("absolute inset-2 rounded-full blur-2xl", categoryVisual.glow)} />
              <Image
                src={categoryVisual.icon}
                alt=""
                width={160}
                height={160}
                className="relative h-28 w-28 object-contain drop-shadow-[0_18px_18px_rgba(23,32,51,0.12)]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#edf6e6] px-3 py-1 text-xs font-black text-[#6f9f3b]">
                  {category.label}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#637083] shadow-sm">
                  {selectedRole?.label ?? "공통 기준"}
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-[#172033] md:text-3xl">{roleTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6b7a]">{roleDescription}</p>
              {isCommonTrack ? (
                <p className="mt-3 text-sm font-bold text-[#6f9f3b]">
                  세부 직무를 고르지 않아 {category.label} 범주의 공통 기준으로 진행됩니다.
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative hidden h-56 lg:block">
            <div className="absolute inset-x-10 bottom-4 h-12 rounded-full bg-[#172033]/[0.08] blur-2xl" />
            <Image
              src="/images/interview/setup/hero/role-final-brief.png"
              alt="직무 면접 최종 확인"
              width={700}
              height={420}
              priority
              className="relative z-10 h-full w-full object-contain drop-shadow-[0_24px_24px_rgba(23,32,51,0.12)]"
            />
          </div>
        </div>

        <div className="grid gap-5 px-6 py-6 md:grid-cols-3">
          {briefingSteps.map((step, index) => (
            <div key={step.label} className="rounded-2xl border border-[#dfe7ef] bg-[#fbfcfe] px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a96a6]">0{index + 1} · {step.label}</p>
              <p className="mt-3 text-base font-black text-[#172033]">{step.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 border-t border-[#e6edf4] px-6 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="flex items-center gap-2 text-sm font-black text-[#172033]">
              <Layers3 className="h-4 w-4 text-[#7cad46]" />
              생성된 면접 기준
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#dfe7ef] bg-white px-4 py-4">
                <p className="text-sm font-black text-[#172033]">중점 확인</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {focusAreas.map((item) => (
                    <span key={item} className="rounded-full border border-[#dfe7ef] bg-[#f8fafc] px-3 py-1 text-xs font-bold text-[#637083]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[#dfe7ef] bg-white px-4 py-4">
                <p className="text-sm font-black text-[#172033]">참고 키워드</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {roleKeywords.map((item) => (
                    <TechLogoChip
                      key={item}
                      label={item}
                      className="border-[#cfe1c1] bg-[#f3faef] text-[#5f8f36]"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <InterviewLevelCard jobData={jobData} updateJobData={updateJobData} />
            </div>
          </section>

          <aside className="rounded-3xl border border-[#dfe7ef] bg-[#fbfcfe] p-5">
            <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
              <span className="absolute inset-4 rounded-full bg-[#dceecf] blur-2xl" />
              <Image
                src={selectedRoleIcon}
                alt=""
                width={160}
                height={160}
                className="relative h-28 w-28 object-contain drop-shadow-[0_18px_18px_rgba(23,32,51,0.12)]"
              />
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2 font-black text-[#172033]">
                <Briefcase className="h-4 w-4 text-[#7cad46]" />
                {selectedRole?.label ?? `${category.label} 공통`}
              </div>
              <p className="leading-6 text-[#5f6b7a]">{jobData.companyDescription}</p>
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-[#5f6b7a] shadow-sm">
                <Clock3 className="h-4 w-4 text-[#7cad46]" />
                <span className="font-bold">10분 화상면접으로 고정 진행</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-[#5f6b7a] shadow-sm">
                <Sparkles className="h-4 w-4 text-[#7cad46]" />
                <span className="font-bold">역할 판단 기준 중심 질문 생성</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#e6edf4] bg-[#fbfcfe] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={() => setStep("target")} className="h-12 rounded-xl border-[#dfe7ef] px-5 font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" />
            직무 설계로
          </Button>
          <Button
            onClick={() => void handleStartInterview()}
            disabled={isStartingInterview}
            className="h-12 rounded-xl bg-[#7cad46] px-7 font-bold hover:bg-[#6f9f3b]"
          >
            {isStartingInterview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isStartingInterview ? "면접 준비 중..." : "화상면접 시작"}
            {!isStartingInterview ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
