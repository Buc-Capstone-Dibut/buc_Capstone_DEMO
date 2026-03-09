"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { useRouter } from "next/navigation";
import { JdCheckForm } from "./jd-check-form";
import { ResumeCheckForm } from "./resume-check-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RoleTrainingBriefStep } from "./role-training-brief-step";

type SetupTrack = "posting" | "role";

interface FinalCheckStepProps {
  track?: SetupTrack;
}

export function FinalCheckStep({ track = "posting" }: FinalCheckStepProps) {
  const router = useRouter();
  const {
    jobData,
    updateJobData,
    resumeData,
    updateResumeData,
    setStep,
  } = useInterviewSetupStore();

  if (track === "role") {
    return <RoleTrainingBriefStep />;
  }

  const handleStartInterview = () => {
    router.push(`/interview/room/video?duration=7&track=${track}`);
  };
  const hasResumeData = Boolean(resumeData);
  const isResumeRequired = track === "posting";

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

      <Tabs defaultValue={hasResumeData ? "resume" : "jd"} className="w-full">
        <TabsList className={`grid w-full mb-8 ${hasResumeData ? "grid-cols-2" : "grid-cols-1"}`}>
          {hasResumeData && <TabsTrigger value="resume">이력서 정보 확인</TabsTrigger>}
          <TabsTrigger value="jd">{track === "posting" ? "JD / 채용 공고 확인" : "직무 설정 확인"}</TabsTrigger>
        </TabsList>

        {hasResumeData && (
          <TabsContent value="resume" className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-5 h-5" /> 이력서 최종 확인
                </CardTitle>
                <CardDescription>
                  AI 면접관이 이 정보를 바탕으로 질문합니다. 빠진 내용이 없는지 확인하세요.
                </CardDescription>
              </CardHeader>
            </Card>
            <ResumeCheckForm resumeData={resumeData!} updateResumeData={updateResumeData} />
          </TabsContent>
        )}

        <TabsContent value="jd" className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-5 h-5" />
                  {track === "posting" ? "채용 공고(JD) 최종 확인" : "직무 설정 최종 확인"}
                </CardTitle>
                <CardDescription>
                  {track === "posting"
                    ? "이 포지션의 요구사항을 기반으로 면접이 진행됩니다."
                    : hasResumeData
                      ? "설정한 목표 직무와 입력한 이력서를 기반으로 면접이 진행됩니다."
                      : "설정한 목표 직무를 기준으로 이력서 없이 면접이 진행됩니다."}
                </CardDescription>
              </CardHeader>
            </Card>
          <JdCheckForm jobData={jobData} updateJobData={updateJobData} />
        </TabsContent>
      </Tabs>

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
          className="px-8 h-12 text-base shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 animate-pulse hover:animate-none"
        >
          면접 시작하기 <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
