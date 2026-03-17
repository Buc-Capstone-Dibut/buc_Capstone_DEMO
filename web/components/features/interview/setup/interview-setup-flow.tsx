"use client";

import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { TargetSelectionStep } from "@/components/features/interview/setup/steps/target-selection-step";
import { JdCheckStep } from "@/components/features/interview/setup/steps/jd-check-step";
import { ResumeInputStep } from "@/components/features/interview/setup/steps/resume-input-step";
import { ResumeCheckStep } from "@/components/features/interview/setup/steps/resume-check-step";
import { FinalCheckStep } from "@/components/features/interview/setup/steps/final-check-step";
import { ModeSelectionStep } from "@/components/features/interview/setup/steps/mode-selection-step";
import { AnimatePresence, motion } from "framer-motion";
import { SetupStepper } from "@/components/features/interview/setup/setup-stepper";
import { useToast } from "@/hooks/use-toast";

type SetupTrack = "posting" | "role";

const ROLE_PROGRESS_STEPS: { id: "target" | "final-check"; label: string }[] = [
  { id: "target", label: "직무 설계" },
  { id: "final-check", label: "훈련 브리프" },
];

interface InterviewSetupFlowProps {
  track: SetupTrack;
}

export function InterviewSetupFlow({ track }: InterviewSetupFlowProps) {
  const { currentStep, reset, setResumeData, setResumePrefillSource } = useInterviewSetupStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const didImportRef = useRef(false);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (track === "role") return;
    const importType = searchParams.get("import");
    if (importType !== "active_resume" || didImportRef.current) return;
    didImportRef.current = true;

    const runImport = async () => {
      try {
        const res = await fetch("/api/my/resume/active", { cache: "no-store" });
        const json = await res.json();

        if (!res.ok || !json?.success || !json?.data?.resumePayload) {
          throw new Error(json?.error || "활성 이력서가 없습니다.");
        }

        setResumeData({
          fileName: json.data.sourceFileName || "마이페이지 활성 이력서",
          parsedContent: json.data.resumePayload,
        });
        setResumePrefillSource("active_resume");
        toast({
          title: "이력서 자동 채움 완료",
          description: "마이페이지 활성 이력서를 setup에 불러왔습니다.",
        });
      } catch {
        setResumePrefillSource(null);
        toast({
          title: "활성 이력서 없음",
          description: "활성 이력서가 없어 기본 입력 흐름으로 진행합니다.",
        });
      }
    };

    runImport();
  }, [searchParams, setResumeData, setResumePrefillSource, toast, track]);

  const renderStep = () => {
    switch (currentStep) {
      case "target":
        return <TargetSelectionStep track={track} />;
      case "jd-check":
        return track === "posting" ? <JdCheckStep /> : <FinalCheckStep track={track} />;
      case "resume":
        return track === "posting" ? <ResumeInputStep track={track} /> : <FinalCheckStep track={track} />;
      case "resume-check":
        return track === "posting" ? <ResumeCheckStep track={track} /> : <FinalCheckStep track={track} />;
      case "final-check":
        return <FinalCheckStep track={track} />;
      case "mode-selection":
        return <ModeSelectionStep track={track} />;
      case "complete":
        return (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-24 px-6 gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">면접 준비 완료</h1>
              <p className="text-muted-foreground text-lg">
                모든 설정이 완료되었습니다. 면접실로 이동하면 AI 면접관이 기다리고 있습니다.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                className="px-5 py-2.5 text-sm text-muted-foreground border rounded-md hover:bg-muted transition-colors"
                onClick={() => reset()}
              >
                처음부터 다시
              </button>
              <button
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20 transition-colors"
                onClick={() => router.push(`/interview/room/video?track=${track}`)}
              >
                면접 시작하기 →
              </button>
            </div>
          </div>
        );
      default:
        return <TargetSelectionStep track={track} />;
    }
  };

  const currentRoleProgressIndex = ROLE_PROGRESS_STEPS.findIndex((step) => step.id === currentStep);
  const currentRoleProgress =
    currentRoleProgressIndex >= 0 ? ROLE_PROGRESS_STEPS[currentRoleProgressIndex] : null;

  return (
    <div className="h-full w-full flex flex-col">
      {currentStep !== "complete" && track === "posting" && <SetupStepper track={track} />}
      {currentStep !== "complete" && track === "role" && currentRoleProgress && (
        <div className="mx-auto w-full max-w-4xl px-6 pt-2 pb-1">
          <div className="flex justify-end">
            <div className="rounded-full border border-border/70 bg-muted/25 px-3 py-1 text-xs font-medium text-muted-foreground">
              {currentRoleProgress.label} · {currentRoleProgressIndex + 1}/{ROLE_PROGRESS_STEPS.length}
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${track}-${currentStep}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
