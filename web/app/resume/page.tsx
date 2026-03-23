"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ResumeEditor } from "../my/[handle]/tabs/resume-editor";
import { ResumeAiAssistant } from "@/components/features/resume/ResumeAiAssistant";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ResumePayload } from "../my/[handle]/profile-types";
import { EMPTY_RESUME, normalizeResumePayload } from "../my/[handle]/profile-utils";
import { cn } from "@/lib/utils";

export default function ResumePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resumePayload, setResumePayload] = useState<ResumePayload>(EMPTY_RESUME);
    const [resumeTitle, setResumeTitle] = useState("");
    const isWizardModeFromUrl = searchParams.get("mode") === "setup";
    const [isWizardMode, setIsWizardMode] = useState(false);

    // Prefill STADRI from career timeline redirect
    const situationFromUrl = searchParams.get("situation") || undefined;
    const sourceFromUrl = searchParams.get("source");
    const initialStadri = situationFromUrl ? { s: situationFromUrl } : undefined;

    useEffect(() => {
        setIsWizardMode(isWizardModeFromUrl);
    }, [isWizardModeFromUrl]);

    useEffect(() => {
        const fetchResume = async () => {
            // In setup mode, we start with a clean slate
            if (isWizardModeFromUrl) {
                setResumePayload(EMPTY_RESUME);
                setLoading(false);
                return;
            }

            try {
                const res = await fetch("/api/my/resume/active", { cache: "no-store" });
                if (res.status === 404) {
                    setResumePayload(EMPTY_RESUME);
                } else {
                    const json = await res.json();
                    if (res.ok && json.success) {
                        setResumePayload(normalizeResumePayload(json.data.resumePayload));
                        setResumeTitle(json.data.title || "");
                    }
                }
            } catch (error) {
                console.error("Failed to fetch resume:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchResume();
    }, [isWizardModeFromUrl]);

    const handleSave = async (silent = false) => {
        setSaving(true);
        try {
            const isNew = searchParams.get("mode") === "setup";
            const url = isNew ? "/api/my/resume" : "/api/my/resume/active";
            const method = isNew ? "POST" : "PUT";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: resumeTitle.trim() || (resumePayload.personalInfo.name ? `${resumePayload.personalInfo.name}의 이력서` : "AI 연구소 작성 이력서"),
                    resumePayload,
                    sourceType: "manual",
                    sourceFileName: "AI 통합 에디터",
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "저장 실패");

            if (!silent) {
                toast({ title: "이력서가 저장되었습니다." });
            }

            if (!silent && searchParams.get("mode") === "setup") {
                router.push("/my/resumes");
            }
        } catch (err: any) {
            toast({
                title: "저장 실패",
                description: err.message || "오류가 발생했습니다.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
                <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm font-medium text-slate-500 animate-pulse">AI가 이력서 정보를 분석하고 있습니다...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Wizard Mode Overlay */}
            {isWizardMode && (
                <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl animate-in fade-in duration-500 flex flex-col">
                    <header className="w-full border-b bg-white/80 backdrop-blur-md px-6 h-16 flex items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Wand2 className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="font-bold text-lg">AI 자소서 작성 가이드</h2>
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto px-6">
                        <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
                            <ResumeAiAssistant
                                isWizard={true}
                                currentPayload={resumePayload}
                                onUpdatePayload={setResumePayload}
                                initialStadri={initialStadri}
                                onWizardComplete={async () => {
                                    if (sourceFromUrl === "career") {
                                        // When coming from the career timeline → save as cover letter and go directly back
                                        const experienceIds = searchParams.get("experienceIds")?.split(",").filter(Boolean) || [];
                                        try {
                                            const { saveCoverLetterAction } = await import("@/app/career/cover-letters/actions");
                                            await saveCoverLetterAction({
                                                id: "",
                                                title: `AI 생성 자소서 (${new Date().toLocaleDateString('ko-KR')})`,
                                                content: resumePayload.selfIntroduction || "",
                                                createdAt: new Date().toISOString(),
                                                sourceExperienceIds: experienceIds,
                                            });
                                            toast({ title: "자소서 저장 완료!", description: "'내 자소서 관리' 탭에서 확인하세요." });
                                            router.push("/career/cover-letters");
                                        } catch (err: any) {
                                            toast({ title: "저장 실패", description: err.message, variant: "destructive" });
                                        }
                                    } else {
                                        setIsWizardMode(false);
                                        toast({
                                            title: "마법사 단계 완료!",
                                            description: "작성하신 내용이 이력서 본문에 반영되었습니다. 전체 저장을 위해 상단의 '저장' 버튼을 눌러주세요.",
                                            variant: "default"
                                        });
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
                <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-slate-100">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                AI 이력서 연구소
                            </h1>
                            <p className="text-[11px] text-muted-foreground font-medium">나만의 고유한 강점을 이력서에 담아보세요</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => router.back()} className="text-slate-500">취소</Button>
                        <Button onClick={() => handleSave()} disabled={saving} className="gap-2 shadow-lg shadow-primary/20 bg-primary px-6">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            저장
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 lg:p-10 min-h-[calc(100vh-4rem)] bg-white shadow-sm border-x border-slate-200/60">
                <ResumeEditor
                    payload={resumePayload}
                    onChange={setResumePayload}
                    onSave={() => handleSave()}
                    saving={saving}
                    onGoSetup={() => { }}
                    title={resumeTitle}
                    onTitleChange={setResumeTitle}
                />
            </main>
        </div>
    );
}
