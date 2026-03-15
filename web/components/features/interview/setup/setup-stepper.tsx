"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useInterviewSetupStore, InterviewSetupStep } from "@/store/interview-setup-store";
import { motion } from "framer-motion";

type SetupTrack = "posting" | "role";

const POSTING_STEPS: { id: InterviewSetupStep; label: string }[] = [
  { id: "target", label: "공고 선택" },
  { id: "jd-check", label: "공고 확인" },
  { id: "resume", label: "이력서 입력" },
  { id: "resume-check", label: "이력서 확인" },
  { id: "final-check", label: "최종 점검" },
];

const ROLE_STEPS: { id: InterviewSetupStep; label: string }[] = [
  { id: "target", label: "직무 설계" },
  { id: "final-check", label: "훈련 브리프" },
];

interface SetupStepperProps {
  track: SetupTrack;
}

export function SetupStepper({ track }: SetupStepperProps) {
    const { currentStep, setStep } = useInterviewSetupStore();
    const steps = track === "role" ? ROLE_STEPS : POSTING_STEPS;

    const getStepStatus = (stepId: string) => {
        const stepOrder = steps.findIndex((s) => s.id === stepId);
        const currentOrder = steps.findIndex((s) => s.id === currentStep);

        if (stepOrder < currentOrder) return 'completed';
        if (stepOrder === currentOrder) return 'current';
        return 'upcoming';
    };

    return (
        <div className="w-full py-4 px-4 mb-4">
            <div className="max-w-4xl mx-auto">
                <div className="relative flex justify-between">
                    <div className="absolute top-4 left-0 w-full h-[2px] bg-muted -z-10" />

                    <motion.div
                        className="absolute top-4 left-0 h-[2px] bg-primary -z-10"
                        initial={{ width: "0%" }}
                        animate={{
                            width: `${(steps.findIndex((s) => s.id === currentStep) / Math.max(1, steps.length - 1)) * 100}%`
                        }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />

                    {steps.map((step, index) => {
                        const status = getStepStatus(step.id);
                        const isClickable = status === 'completed' || status === 'current';

                        return (
                            <div
                                key={step.id}
                                className="flex flex-col items-center gap-3 relative"
                            >
                                <button
                                    disabled={!isClickable}
                                    onClick={() => isClickable && setStep(step.id)}
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 z-10",
                                        status === 'completed' ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" :
                                            status === 'current' ? "bg-background border-primary text-primary shadow-xl ring-4 ring-primary/10 scale-110" :
                                                "bg-background border-muted text-muted-foreground"
                                    )}
                                >
                                    {status === 'completed' ? (
                                        <Check className="w-4 h-4 stroke-[3px]" />
                                    ) : (
                                        <span className="text-xs font-bold">{index + 1}</span>
                                    )}
                                </button>

                                <span className={cn(
                                    "text-[13px] font-bold transition-colors whitespace-nowrap",
                                    status === 'current' ? "text-primary" :
                                        status === 'completed' ? "text-foreground/80" : "text-muted-foreground"
                                )}>
                                    {step.label}
                                </span>

                                {status === 'current' && (
                                    <motion.div
                                        layoutId="activeStepGlow"
                                        className="absolute -top-1 w-10 h-10 bg-primary/10 rounded-full -z-0 blur-sm"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
