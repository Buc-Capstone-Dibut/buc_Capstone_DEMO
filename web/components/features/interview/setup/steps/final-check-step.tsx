"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { useRouter } from "next/navigation";
import { JdCheckForm } from "./jd-check-form";
import { ResumeCheckForm } from "./resume-check-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startInterviewPreflight } from "@/lib/interview/start-interview-preflight";
import { RoleTrainingBriefStep } from "./role-training-brief-step";
import { InterviewLevelCard } from "./interview-level-card";
import {
  buildInterviewTypePayload,
  resolveInterviewTypeVisual,
} from "@/lib/interview/interview-type-visuals";

type SetupTrack = "posting" | "role";

// 시연용 고정 대본 면접(㈜아카넷 공고) — FastAPI domain/demo_script.py 의 DEMO_SCRIPT_ID 와 같아야 한다.
const DEMO_SCRIPT_ID = "acanet-2026-web";
const DEMO_SCRIPT_DURATION_MIN = 15;
const DEFAULT_DURATION_MIN = 10;
const isDemoScriptCompany = (company: unknown) =>
  typeof company === "string" && /아카넷|acanet/i.test(company);

interface FinalCheckStepProps {
  track?: SetupTrack;
}

export function FinalCheckStep({ track = "posting" }: FinalCheckStepProps) {
  const router = useRouter();
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const {
    jobData,
    updateJobData,
    resumeData,
    updateResumeData,
    setInterviewSessionId,
    setStep,
    attachedPortfolios,
    attachedProjects,
  } = useInterviewSetupStore();

  if (track === "role") {
    return <RoleTrainingBriefStep />;
  }

  const handleStartInterview = async () => {
    if (isStartingInterview) return;
    setIsStartingInterview(true);
    try {
      const isDemoScript = isDemoScriptCompany(jobData?.company);
      const durationMin = isDemoScript ? DEMO_SCRIPT_DURATION_MIN : DEFAULT_DURATION_MIN;
      const baseJobData = jobData
        ? {
            ...jobData,
            interviewTrack: "posting" as const,
            ...(isDemoScript ? { demoScript: DEMO_SCRIPT_ID } : {}),
          }
        : jobData;
      const interviewTypePayload = baseJobData
        ? buildInterviewTypePayload(resolveInterviewTypeVisual({
            sessionType: "live_interview",
            role: baseJobData.role,
            company: baseJobData.company,
            jobData: baseJobData,
            sourceText: [
              baseJobData.companyDescription,
              baseJobData.originalText,
              baseJobData.responsibilities,
              baseJobData.requirements,
              baseJobData.techStack,
            ].join(" "),
          }))
        : null;
      const { sessionId } = await startInterviewPreflight({
        sessionStartEndpoint: "/api/interview/session/start",
        sessionStartBody: {
          mode: "video",
          personality: "professional",
          jobData: baseJobData && interviewTypePayload
            ? { ...baseJobData, ...interviewTypePayload }
            : baseJobData,
          resumeData,
          targetDurationSec: durationMin * 60,
          closingThresholdSec: 60,
        },
      });
      setInterviewSessionId(sessionId);
      router.push(`/interview/room/video?duration=${durationMin}&track=${track}&sessionId=${encodeURIComponent(sessionId)}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "면접 시작 준비에 실패했습니다.");
    } finally {
      setIsStartingInterview(false);
    }
  };
  const hasResumeData = Boolean(resumeData);
  const isResumeRequired = track === "posting";

  // 채용공고에서 불러온 연결 자료 — 면접 질문 생성에 함께 쓰이므로 최종 점검에서 보여준다.
  const coverLetter = jobData?.supportingMaterials?.coverLetter ?? null;
  const projects = attachedProjects.length
    ? attachedProjects
    : jobData?.supportingMaterials?.projects ?? [];
  const linkedMaterials = [
    resumeData?.fileName ? { kind: "이력서", names: [resumeData.fileName] } : null,
    coverLetter ? { kind: "자기소개서", names: [coverLetter.title || "제목 없음"] } : null,
    attachedPortfolios.length
      ? { kind: "포트폴리오", names: attachedPortfolios.map((p) => p.title || "제목 없음") }
      : null,
    projects.length ? { kind: "프로젝트", names: projects.map((p) => p.name || "이름 없음") } : null,
  ].filter((item): item is { kind: string; names: string[] } => item !== null);
  const showLinkedMaterials = Boolean(jobData?.supportingMaterials);

  if (!jobData || (isResumeRequired && !hasResumeData)) {
    return (
      <div className="p-8 text-center">
        <p>필수 데이터가 누락되었습니다. 처음부터 다시 시도해주세요.</p>
        <Button onClick={() => setStep('target')} className="mt-4">처음으로</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">최종 점검</h1>
          <p className="text-muted-foreground">
            면접 시작 전, 입력된 정보를 마지막으로 확인하고 수정할 수 있습니다.
          </p>
        </div>
      </div>

      {showLinkedMaterials && (
        <section className="mb-6 rounded-lg border bg-card px-5 py-4">
          <h2 className="mb-3 text-sm font-semibold">채용공고 연결 자료</h2>
          {linkedMaterials.length > 0 ? (
            <dl className="space-y-1.5 text-sm">
              {linkedMaterials.map((item) => (
                <div key={item.kind} className="grid grid-cols-[5.5rem_1fr] gap-3">
                  <dt className="text-muted-foreground">{item.kind}</dt>
                  <dd className="text-foreground/90">{item.names.join(", ")}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              이 공고에 연결된 자료가 없습니다. 채용공고 상세에서 이력서·자기소개서·포트폴리오를 연결할 수 있어요.
            </p>
          )}
        </section>
      )}

      <Tabs defaultValue={hasResumeData ? "resume" : "jd"} className="w-full">
        <TabsList className={`grid w-full mb-4 ${hasResumeData ? "grid-cols-2" : "grid-cols-1"}`}>
          {hasResumeData && <TabsTrigger value="resume">이력서 정보 확인</TabsTrigger>}
          <TabsTrigger value="jd">{track === "posting" ? "JD / 채용 공고 확인" : "직무 설정 확인"}</TabsTrigger>
        </TabsList>

        {hasResumeData && (
          <TabsContent value="resume" className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p className="text-foreground/90">
                AI 면접관이 <b>이 정보 그대로</b> 질문합니다. 비어있거나 잘못된 부분은 셀을 클릭해 바로 수정하세요.
              </p>
            </div>
            <ResumeCheckForm resumeData={resumeData!} updateResumeData={updateResumeData} />
          </TabsContent>
        )}

        <TabsContent value="jd" className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-foreground/90">
              {track === "posting"
                ? "이 포지션의 요구사항을 기반으로 면접이 진행됩니다."
                : hasResumeData
                  ? "설정한 목표 직무와 입력한 이력서를 기반으로 면접이 진행됩니다."
                  : "설정한 목표 직무를 기준으로 이력서 없이 면접이 진행됩니다."}
            </p>
          </div>
          <JdCheckForm jobData={jobData} updateJobData={updateJobData} />
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <InterviewLevelCard
          jobData={jobData}
          resumeData={resumeData}
          updateJobData={updateJobData}
        />
      </div>

      <div className="flex justify-between mt-10">
        <Button
          variant="outline"
          onClick={() => setStep(hasResumeData ? 'resume-check' : 'resume')}
          className="px-6 h-12"
        >
          <ArrowLeft className="mr-2 w-4 h-4" /> 이전 단계
        </Button>

        <Button
          onClick={handleStartInterview}
          disabled={isStartingInterview}
          className="px-8 h-12 text-base shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 animate-pulse hover:animate-none"
        >
          {isStartingInterview ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
          {isStartingInterview ? "면접 준비 중..." : "면접 시작하기"}
          {!isStartingInterview ? <ArrowRight className="ml-2 w-4 h-4" /> : null}
        </Button>
      </div>
    </div>
  );
}
