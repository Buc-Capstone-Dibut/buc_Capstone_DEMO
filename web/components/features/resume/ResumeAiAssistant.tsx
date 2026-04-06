"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Sparkles,
    BrainCircuit,
    Wand2,
    Lightbulb,
    Loader2,
    Send,
    ChevronLeft,
    CheckCircle2,
    MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import { cn } from "@/lib/utils";

interface ResumeAiAssistantProps {
    currentPayload: ResumePayload;
    onUpdatePayload: (payload: ResumePayload) => void;
    initialMode?: Mode;
    isWizard?: boolean;
    onWizardComplete?: (content: string) => void;
    initialStadri?: Partial<{ s: string; t: string; a: string; d: string; r: string; i: string }>;
    backgroundContext?: string;
}

type Mode = "main" | "setup" | "chat" | "stadri";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export function ResumeAiAssistant({
    currentPayload,
    onUpdatePayload,
    initialMode = "main",
    isWizard = false,
    onWizardComplete,
    initialStadri,
    backgroundContext,
}: ResumeAiAssistantProps) {
    const { toast } = useToast();
    const [mode, setMode] = useState<Mode>(isWizard ? "setup" : initialMode as Mode);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // Chat & Messages State
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);

    // Setup State
    const [targetRole, setTargetRole] = useState("");
    const [strengths, setStrengths] = useState("");

    const [chatInput, setChatInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom whenever messages or streaming content changes
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isStreaming]);

    const startCoverLetterGeneration = async () => {
        setMode("chat");
        // 빈 assistant 메시지를 fetch 전에 미리 추가 → 스켈레톤이 바로 표시됨
        setMessages([
            { role: "user", content: "내 경험을 바탕으로 자기소개서를 작성해줘." },
            { role: "assistant", content: "" },
        ]);
        setIsStreaming(true);

        try {
            const response = await fetch("/api/career/cover-letters/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: "내 경험을 바탕으로 자기소개서를 작성해줘." }],
                    targetRole,
                    strengths,
                    backgroundContext,
                    personalInfo: currentPayload,
                }),
            });

            if (!response.ok) throw new Error("API 요청 실패");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) return;

            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                // Update the last message (the assistant's response)
                setMessages(prev => {
                    const next = [...prev];
                    if (next.length > 0) {
                        next[next.length - 1] = { ...next[next.length - 1], content: fullText };
                    }
                    return next;
                });
            }
        } catch (err: any) {
            toast({ title: "생성 실패", description: err.message, variant: "destructive" });
        } finally {
            setIsStreaming(false);
        }
    };

    const handleChatRefine = async () => {
        if (!chatInput.trim() || isStreaming) return;

        const currentInput = chatInput;
        setChatInput("");
        setIsStreaming(true);

        // Add user message and a placeholder assistant message
        setMessages(prev => [
            ...prev,
            { role: "user", content: currentInput },
            { role: "assistant", content: "" }
        ]);

        const lastAssistantMessage = messages
            .filter(m => m.role === "assistant")
            .pop()?.content || "";

        try {
            const response = await fetch("/api/resume/ai-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "chat-refine",
                    message: currentInput,
                    payload: currentPayload,
                    previousContent: lastAssistantMessage, // Pass previous context
                }),
            });

            if (!response.ok) throw new Error("API 요청 실패");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) return;

            let fullText = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                // Update the last message
                setMessages(prev => {
                    const next = [...prev];
                    if (next.length > 0) {
                        next[next.length - 1] = { ...next[next.length - 1], content: fullText };
                    }
                    return next;
                });
            }
        } catch (err: any) {
            toast({ title: "수정 실패", description: err.message, variant: "destructive" });
        } finally {
            setIsStreaming(false);
        }
    };

    const handleAiAction = async (action: "refine" | "draft" | "highlight") => {
        setLoading(true);
        try {
            const res = await fetch("/api/resume/ai-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, payload: currentPayload }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "AI 요청 실패");

            if (action === "highlight") {
                setSuggestions(json.data.suggestions || []);
            } else if (json.data.updatedPayload) {
                onUpdatePayload(json.data.updatedPayload);
                toast({ title: "AI 제안 완료", description: "내용이 업데이트되었습니다." });
            }
        } catch (err: any) {
            toast({ title: "AI 요청 실패", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const applyToResume = () => {
        const updatedPayload = { ...currentPayload };

        // Use the latest assistant message content
        const latestAssistantMessage = messages
            .filter(m => m.role === "assistant")
            .pop();

        if (!latestAssistantMessage?.content) {
            toast({ title: "반영할 내용 없음", description: "AI가 생성한 내용이 없습니다." });
            return;
        }

        const currentIntro = updatedPayload.selfIntroduction || "";
        // If it's a new generation, we might want to replace or append. 
        // User's previous request suggests adding a "Self-Introduction" field, so we replace/update it.
        updatedPayload.selfIntroduction = latestAssistantMessage.content;

        onUpdatePayload(updatedPayload);
        toast({ title: "이력서 적용 완료", description: "작성한 내용이 자기소개서 섹션에 반영되었습니다." });

        if (!isWizard) {
            setMode("main");
        } else if (onWizardComplete) {
            onWizardComplete(latestAssistantMessage.content);
        }
    };

    if (mode === "setup") {
        return (
            <div className={cn("space-y-4 animate-in fade-in slide-in-from-right-4 duration-300", isWizard && "w-full max-w-4xl mx-auto py-8")}>
                {!isWizard && (
                    <Button variant="ghost" size="sm" onClick={() => setMode("main")} className="mb-2 p-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors">
                        <ChevronLeft className="w-4 h-4 mr-1" /> 사이드바 목록
                    </Button>
                )}
                <div className="space-y-4 text-center pb-6 border-b border-border/40">
                    <h3 className={cn("font-bold flex items-center gap-2 justify-center", isWizard ? "text-3xl" : "text-xl")}>
                        <Sparkles className="w-6 h-6 text-primary" />
                        {isWizard ? "내 경험으로 맞춤형 자소서 생성하기" : "맞춤형 자소서 생성하기"}
                    </h3>
                    <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xl mx-auto">
                        선택하신 경험 기록들을 바탕으로 압도적인 자기소개서를 작성합니다.<br />
                        AI가 글을 잘 쓸 수 있도록 <strong className="text-foreground">지원 직무</strong>만 알려주세요.
                    </p>
                </div>

                <div className="space-y-8 mt-8 pb-4 max-w-2xl mx-auto">
                    <div className="space-y-3 focus-within:translate-x-1 transition-transform bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                        <div>
                            <Label className="text-[15px] font-bold text-foreground">어느 회사에 어떤 직무로 지원하시나요? <span className="text-red-500">*</span></Label>
                            <p className="text-[13px] text-muted-foreground mt-1">예: 카카오 프론트엔드 개발자, 네이버 서비스 기획자</p>
                        </div>
                        <Input
                            placeholder="지원 직무를 적어주세요 (필수)"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            className="h-12 text-[15px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-primary/30"
                        />
                    </div>

                    <div className="space-y-3 focus-within:translate-x-1 transition-transform bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                        <div>
                            <Label className="text-[15px] font-bold text-foreground">이 자소서에서 특별히 자랑하고 싶은 나의 강점은? <span className="text-muted-foreground font-normal">(선택)</span></Label>
                            <p className="text-[13px] text-muted-foreground mt-1">예: 주도적으로 문제를 찾아 해결하는 능력을 강조해줘</p>
                        </div>
                        <Textarea
                            placeholder="원하시는 강조 포인트가 있다면 적어주세요"
                            value={strengths}
                            onChange={(e) => setStrengths(e.target.value)}
                            className="min-h-[100px] text-[15px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-primary/30 resize-none p-4"
                        />
                    </div>
                </div>

                <div className="max-w-2xl mx-auto mt-8">
                    <Button
                        className={cn("w-full h-14 font-bold gap-2 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-[1.02] active:scale-[0.98] rounded-2xl transition-all", isWizard && "text-lg")}
                        onClick={startCoverLetterGeneration}
                        disabled={!targetRole.trim()}
                    >
                        <Sparkles className="w-5 h-5" /> 전문 자소서 실시간 생성 시작
                    </Button>
                </div>
            </div>
        );
    }

    if (mode === "chat") {
        return (
            <div className={cn("flex flex-col h-full space-y-4 animate-in fade-in slide-in-from-right-4 duration-300", isWizard && "w-full max-w-4xl mx-auto py-8")}>
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setMode("setup")} className="p-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors">
                        <ChevronLeft className="w-4 h-4 mr-1" /> 항목 및 기획 다시 수정하기
                    </Button>
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-primary/10 text-primary border-none">
                        {isStreaming ? "AI 스트리밍 보정 중" : "맞춤형 보정 완료"}
                    </Badge>
                </div>

                <div className="flex-1 flex flex-col bg-transparent">
                    <div className="flex-1 pb-44"> {/* Extra padding for sticky input area */}
                        <div className="flex flex-col gap-10">
                            {messages.map((msg, i) => (
                                <div key={i} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-500", msg.role === "user" ? "justify-end" : "justify-start items-start gap-4")}>
                                    {msg.role === "user" ? (
                                        <div className="max-w-[80%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-md bg-primary text-white rounded-tr-none">
                                            <div className="whitespace-pre-wrap">{msg.content}</div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-5 w-full">
                                            <div className="p-2.5 h-11 w-11 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-lg border-2 border-white mt-1">
                                                <Sparkles className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1 space-y-4 pt-2">
                                                {i === 0 && (
                                                    <div className="flex items-center gap-2 text-primary font-bold text-[12px] uppercase tracking-[0.2em] mb-2 opacity-80">
                                                        <BrainCircuit className="w-4 h-4" /> AI 추천 자소서 전문
                                                    </div>
                                                )}

                                                {/* 스켈레톤: 스트리밍 중이고 아직 내용이 없을 때 */}
                                                {isStreaming && i === messages.length - 1 && msg.content === "" ? (
                                                    <div className="space-y-1 py-1">
                                                        <p className="text-[12px] text-slate-400 font-medium mb-3 flex items-center gap-1.5">
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            AI 답변을 생성하고 있어요...
                                                        </p>
                                                        <div className="space-y-3">
                                                            <div className="skeleton-shimmer h-5 rounded-lg w-full" />
                                                            <div className="skeleton-shimmer h-5 rounded-lg w-[85%]" style={{ animationDelay: "0.15s" }} />
                                                            <div className="skeleton-shimmer h-5 rounded-lg w-[65%]" style={{ animationDelay: "0.3s" }} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-[17px] leading-[1.8] text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-normal selection:bg-primary/20">
                                                        {msg.content}
                                                        {isStreaming && i === messages.length - 1 && (
                                                            <span className="inline-block w-1.5 h-6 ml-1 bg-primary animate-pulse align-middle" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={bottomRef} className="h-4" />
                        </div>
                    </div>

                    {/* Sticky Input Area */}
                    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
                        <div className={cn("max-w-4xl mx-auto w-full p-6 pb-8 pointer-events-auto", !isWizard && "pl-[300px]")}> {/* Adjust padding if in sidebar mode */}
                            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl shadow-2xl p-4 space-y-4">
                                <div className="relative group">
                                    <Textarea
                                        placeholder="예) 좀 더 도전적인 느낌으로 수정해줘, 기술 역량을 더 강조해줘"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        className="min-h-[80px] pr-14 bg-transparent border-none focus-visible:ring-0 transition-all resize-none text-[15px]"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleChatRefine();
                                            }
                                        }}
                                    />
                                    <Button
                                        size="icon"
                                        className="absolute right-2 bottom-2 h-10 w-10 rounded-xl shadow-xl hover:scale-105 transition-transform"
                                        onClick={handleChatRefine}
                                        disabled={isStreaming || !chatInput.trim()}
                                    >
                                        {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </Button>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-12 rounded-2xl font-medium border-slate-200 hover:bg-slate-50 transition-colors"
                                        onClick={() => setMode("stadri")}
                                    >
                                        처음부터 다시 쓰기
                                    </Button>
                                    <Button
                                        className="flex-[2] h-12 rounded-2xl font-bold bg-slate-900 border-none hover:bg-slate-800 shadow-xl transition-all"
                                        onClick={applyToResume}
                                    >
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        {isWizard ? "이 내용으로 가이드 완료하기" : "이력서에 즉시 반영하기"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
                <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                    <BrainCircuit className="w-5 h-5" />
                    AI 어시스턴트
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    당신의 경험을 가장 빛나게 만들어줄 AI 코치입니다.
                </p>
            </div>

            <div className="grid gap-3">
                <Card className="hover:ring-1 hover:ring-primary/30 transition-all cursor-pointer bg-gradient-to-br from-white to-primary/5 group border-primary/5 active:scale-[0.98]" onClick={() => setMode("stadri")}>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold group-hover:text-primary transition-colors">STADRI 경험 빌더</p>
                            <p className="text-[11px] text-muted-foreground">기억나는 조각들로 전문성 있는 자소서 완성</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-slate-100 active:scale-[0.98]" onClick={() => handleAiAction("highlight")}>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 shadow-sm">
                            <Lightbulb className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">내 고유 강점 분석</p>
                            <p className="text-[11px] text-muted-foreground">내 이력서 데이터에서 차별점 찾기</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:bg-primary/5 transition-colors cursor-pointer border-slate-100 active:scale-[0.98]" onClick={() => handleAiAction("refine")}>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 shadow-sm">
                            <Wand2 className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">비즈니스 문장 교정</p>
                            <p className="text-[11px] text-muted-foreground">기존 문구를 더 전문적인 표현으로 보정</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-10 scale-150">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            )}

            {suggestions.length > 0 && (
                <Card className="border-primary/10 bg-primary/5/20 backdrop-blur-sm animate-in zoom-in-95 duration-300">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                            <Sparkles className="w-4 h-4" />
                            AI가 분석한 당신의 강점
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <ScrollArea className="h-48 pr-4">
                            <ul className="space-y-3">
                                {suggestions.map((s, i) => (
                                    <li key={i} className="text-sm flex gap-2 group">
                                        <span className="text-primary font-bold group-hover:scale-125 transition-transform">•</span>
                                        <span className="leading-relaxed text-slate-700">{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8" />
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 w-fit px-2 py-0.5 rounded-full">Pro Tip</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed relative z-10">
                    단순 나열보다는 **배경(S)**과 **난관(D)**, 그리고 **성찰(I)**이 담긴 글이 채용우대 대상이 될 확률이 70% 이상 높습니다. 구체적인 경험을 문장으로 녹여낼 때 STADRI 빌더가 가장 큰 힘이 됩니다.
                </p>
            </div>
        </div>
    );
}
