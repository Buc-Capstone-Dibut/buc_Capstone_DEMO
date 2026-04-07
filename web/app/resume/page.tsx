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


export default function ResumePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resumePayload, setResumePayload] = useState<ResumePayload>(EMPTY_RESUME);
    const [resumeTitle, setResumeTitle] = useState("");
    const isWizardModeFromUrl = searchParams.get("mode") === "setup";
    const isNewModeFromUrl = searchParams.get("mode") === "new";
    const [isWizardMode, setIsWizardMode] = useState(isWizardModeFromUrl);

    useEffect(() => {
        const fetchResume = async () => {
            const isPrefill = searchParams.get("prefill") === "true";
            const resumeId = searchParams.get("id");

            // 1. Determine fetch URL: Specific ID or Active
            const fetchUrl = resumeId ? `/api/my/resume/${resumeId}` : "/api/my/resume/active";
            let currentPayload = { ...EMPTY_RESUME };
            let currentTitle = "";

            try {
                const res = await fetch(fetchUrl, { cache: "no-store" });
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        const payload = json.data.resume_payload || json.data.resumePayload;
                        currentPayload = normalizeResumePayload(payload);
                        currentTitle = json.data.title || "";
                    }
                }
            } catch (error) {
                console.error("Failed to fetch current resume:", error);
            }

            // 2. Handle prefill from Career Wizard
            if (isPrefill) {
                const coverLetter = sessionStorage.getItem("prefill_cover_letter");
                const prefilledPayload = { ...currentPayload };

                if (coverLetter) {
                    prefilledPayload.selfIntroduction = coverLetter;
                }

                // (경험 자동 불러오기 로직 삭제됨 - 사용자가 수동으로 불러오도록 변경)

                setResumePayload(prefilledPayload);
                if (!currentTitle) {
                    setResumeTitle(`커리어 허브 연동 이력서 (${new Date().toLocaleDateString("ko-KR")})`);
                } else {
                    setResumeTitle(currentTitle);
                }

                setIsWizardMode(false);
                setLoading(false);

                // Clean up session storage
                sessionStorage.removeItem("prefill_cover_letter");
                sessionStorage.removeItem("prefill_experience_ids");
                return;
            }

            // In setup mode or new mode, we start with a clean slate
            if ((isWizardModeFromUrl || isNewModeFromUrl) && !resumeId) {
                setResumePayload(EMPTY_RESUME);
                setLoading(false);
                return;
            }

            try {
                // Determine fetch URL: Specific ID or Active
                const url = resumeId ? `/api/my/resume/${resumeId}` : "/api/my/resume/active";
                const res = await fetch(url, { cache: "no-store" });

                if (res.status === 404) {
                    setResumePayload(EMPTY_RESUME);
                } else {
                    const json = await res.json();
                    if (res.ok && json.success) {
                        const payload = json.data.resume_payload || json.data.resumePayload;
                        setResumePayload(normalizeResumePayload(payload));
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
    }, [isNewModeFromUrl, isWizardModeFromUrl, searchParams]);

    const handleSave = async (silent = false) => {
        setSaving(true);
        try {
            const isNew = searchParams.get("mode") === "setup" || searchParams.get("mode") === "new";
            const resumeId = searchParams.get("id");

            // Determine URL and Method based on mode and presence of ID
            let url = "/api/my/resume/active";
            let method = "PUT";

            if (isNew && !resumeId) {
                url = "/api/my/resume";
                method = "POST";
            } else if (resumeId) {
                url = `/api/my/resume/${resumeId}`;
                method = "PUT";
            }

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

            if (!silent && isNew && !resumeId) {
                router.push("/career/resumes");
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "오류가 발생했습니다.";
            toast({
                title: "저장 실패",
                description: message,
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
                <p className="text-sm font-medium text-slate-500 animate-pulse">저장된 데이터와 이력서를 불러오는 중입니다...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Wizard Mode Overlay (for /resume?mode=setup, non-career flow) */}
            {isWizardMode && (
                <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl animate-in fade-in duration-500 flex flex-col">
                    <header className="w-full border-b bg-white/80 backdrop-blur-md px-6 h-16 flex items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Wand2 className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="font-bold text-lg">AI 이력서 작성 가이드</h2>
                        </div>
                        <button
                            onClick={() => setIsWizardMode(false)}
                            className="ml-auto text-sm text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-100"
                        >
                            나중에 작성하기
                        </button>
                    </header>
                    <div className="flex-1 overflow-y-auto px-6">
                        <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
                            <ResumeAiAssistant
                                isWizard={true}
                                currentPayload={resumePayload}
                                onUpdatePayload={setResumePayload}
                                onWizardComplete={() => {
                                    setIsWizardMode(false);
                                    toast({
                                        title: "마법사 단계 완료!",
                                        description: "작성하신 내용이 이력서 본문에 반영되었습니다. 전체 저장을 위해 상단의 '저장' 버튼을 눌러주세요.",
                                    });
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
                                {/* <Sparkles className="w-4 h-4 text-primary" /> */}
                                이력서 연구소
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
