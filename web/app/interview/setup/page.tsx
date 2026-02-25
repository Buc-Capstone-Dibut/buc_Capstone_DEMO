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
import { PersonalitySelectionStep } from "@/components/features/interview/setup/steps/personality-selection-step";
import { AnimatePresence, motion } from "framer-motion";
import { SetupStepper } from "@/components/features/interview/setup/setup-stepper";
import { useToast } from "@/hooks/use-toast";

export default function InterviewSetupPage() {
  const { currentStep, reset, setResumeData, setResumePrefillSource } = useInterviewSetupStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const didImportRef = useRef(false);

  // Reset store when entering setup page to ensure we start from Step 1
  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
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
  }, [searchParams, setResumeData, setResumePrefillSource, toast]);

  const renderStep = () => {
    switch (currentStep) {
      case 'target':
        return <TargetSelectionStep />;
      case 'jd-check':
        return <JdCheckStep />;
      case 'resume':
        return <ResumeInputStep />;
      case 'resume-check':
        return <ResumeCheckStep />;
      case 'final-check':
        return <FinalCheckStep />;
      case 'personality-selection':
        return <PersonalitySelectionStep />;
      case 'mode-selection':
        return <ModeSelectionStep />;

      case 'complete':
        return (
          <div className="w-full max-w-4xl mx-auto p-6 space-y-6 overflow-y-auto max-h-[80vh]">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">🛠️ Developer Debug Board</h1>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                Development Mode
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="p-4 bg-white border rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    🎯 Target Info
                  </h2>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Category</dt>
                      <dd className="font-medium">{useInterviewSetupStore.getState().targetJobCategory}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-gray-500">URL</dt>
                      <dd className="font-mono text-xs bg-gray-50 p-1 rounded break-all">
                        {useInterviewSetupStore.getState().targetUrl || 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 bg-white border rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    📄 Resume Data
                  </h2>
                  <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto">
                    {JSON.stringify(useInterviewSetupStore.getState().resumeData, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white border rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    💼 Job Data (JD)
                  </h2>
                  <pre className="text-xs bg-gray-900 text-blue-400 p-4 rounded-md overflow-x-auto max-h-[500px]">
                    {JSON.stringify(useInterviewSetupStore.getState().jobData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                onClick={() => window.location.reload()}
              >
                Reset
              </button>
              <button
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium shadow-sm transition-colors"
                onClick={() => {
                  // 실제 구현시에는 여기서 API를 호출하여 세션을 생성할 수 있습니다.
                  // 지금은 구동을 위해 바로 면접실로 이동합니다.
                  router.push('/interview/room');
                }}
              >
                Start Interview Session
              </button>
            </div>
          </div>
        );
      default:
        return <TargetSelectionStep />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {currentStep !== 'complete' && <SetupStepper />}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
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
