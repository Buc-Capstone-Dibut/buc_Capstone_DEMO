"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ResumeAiAssistant } from "@/components/features/resume/ResumeAiAssistant";
import { Loader2, Wand2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { EMPTY_RESUME } from "@/app/my/[handle]/profile-utils";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import { saveCoverLetterAction } from "@/app/career/cover-letters/actions";

export default function CoverLetterWizardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [resumePayload, setResumePayload] = useState<ResumePayload>(EMPTY_RESUME);
    const [saving, setSaving] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [generatedContent, setGeneratedContent] = useState("");

    const experienceIds = searchParams.get("experienceIds")?.split(",").filter(Boolean) || [];
    
    // We read the rich context passed from the timeline via sessionStorage
    const [backgroundContext, setBackgroundContext] = useState<string | undefined>(undefined);

    // Check session storage on mount to survive page refreshes/revalidations
    useState(() => {
        if (typeof window !== "undefined") {
            const savedContent = sessionStorage.getItem("wizard_last_generated");
            const savedFlag = sessionStorage.getItem("wizard_is_completed");
            if (savedFlag === "true" && savedContent) {
                setGeneratedContent(savedContent);
                setIsCompleted(true);
            }

            const contextData = sessionStorage.getItem("wizard_context_data");
            if (contextData) {
                setBackgroundContext(contextData);
            }
        }
    });

    const handleWizardComplete = async (content: string) => {
        try {
            setSaving(true);
            // 1. First save to DB
            await saveCoverLetterAction({
                id: "",
                title: `AI 생성 자소서 (${new Date().toLocaleDateString("ko-KR")})`,
                content,
                createdAt: new Date().toISOString(),
                sourceExperienceIds: experienceIds,
            });

            // 2. On success, store in session and update UI
            sessionStorage.setItem("wizard_last_generated", content);
            sessionStorage.setItem("wizard_is_completed", "true");

            setGeneratedContent(content);
            setIsCompleted(true);
            toast({ title: "자소서 저장 완료!" });
        } catch (err: any) {
            toast({ title: "저장 실패", description: err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleContinueToResume = () => {
        // Save to sessionStorage for pre-filling the resume editor
        sessionStorage.setItem("prefill_cover_letter", generatedContent);
        sessionStorage.setItem("prefill_experience_ids", experienceIds.join(","));

        // Clean up temporary wizard state
        sessionStorage.removeItem("wizard_last_generated");
        sessionStorage.removeItem("wizard_is_completed");

        router.push("/resume?mode=setup&prefill=true");
    };

    const handleExit = () => {
        sessionStorage.removeItem("wizard_last_generated");
        sessionStorage.removeItem("wizard_is_completed");
        router.push("/career/cover-letters");
    };

    return (
        <div className="fixed inset-0 z-[50] bg-white flex flex-col">
            {/* Header */}
            <header className="w-full border-b bg-white/80 backdrop-blur-md px-6 h-16 flex items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Wand2 className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-bold text-lg">AI 자소서 작성 가이드</h2>
                </div>
                {!isCompleted && (
                    <div className="ml-auto flex items-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        <button
                            onClick={() => router.back()}
                            className="text-sm text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-100"
                        >
                            취소
                        </button>
                    </div>
                )}
            </header>

            {/* Wizard Content */}
            <div className="flex-1 overflow-y-auto px-6 relative">
                {!isCompleted ? (
                    <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
                        <ResumeAiAssistant
                            isWizard={true}
                            currentPayload={resumePayload}
                            onUpdatePayload={setResumePayload}
                            backgroundContext={backgroundContext}
                            onWizardComplete={handleWizardComplete}
                        />
                    </div>
                ) : (
                    <div className="max-w-xl mx-auto h-full flex flex-col items-center justify-center text-center space-y-8 animate-in mt-[-5vh]">
                        <div className="space-y-4">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-bounce duration-[2000ms]">
                                <Sparkles className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                저장 완료!
                            </h2>
                            <p className="text-slate-500 font-medium animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-200">
                                AI가 추천한 자소서가 안전하게 저장되었습니다.<br />
                                이제 이 내용을 바탕으로 이력서를 완성해볼까요?
                            </p>
                        </div>

                        <div className="flex flex-col w-full gap-3 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                            <Button
                                size="lg"
                                onClick={handleContinueToResume}
                                className="h-14 rounded-2xl bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                이어서 이력서 쓰기
                            </Button>
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={handleExit}
                                className="h-14 rounded-2xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all"
                            >
                                나중에 쓰기
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
