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
    onWizardComplete?: () => void;
}

type Mode = "main" | "stadri" | "chat";

export function ResumeAiAssistant({
    currentPayload,
    onUpdatePayload,
    initialMode = "main",
    isWizard = false,
    onWizardComplete
}: ResumeAiAssistantProps) {
    const { toast } = useToast();
    const [mode, setMode] = useState<Mode>(isWizard ? "stadri" : initialMode);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // STADRI State
    const [stadriData, setStadriData] = useState({
        s: "", t: "", a: "", d: "", r: "", i: ""
    });

    // Chat & Streaming State
    const [generatedText, setGeneratedText] = useState("");
    const [chatInput, setChatInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [generatedText]);

    const handleStadriChange = (key: keyof typeof stadriData, value: string) => {
        setStadriData(prev => ({ ...prev, [key]: value }));
    };

    const startStadriGeneration = async () => {
        setMode("chat");
        setGeneratedText("");
        setIsStreaming(true);

        try {
            const response = await fetch("/api/resume/ai-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "stadri-structure",
                    payload: stadriData,
                }),
            });

            if (!response.ok) throw new Error("API 요청 실패");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) return;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setGeneratedText(prev => prev + chunk);
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
        setGeneratedText(prev => prev + `\n\n--- [수정 요청: ${currentInput}] ---\n\n`);

        try {
            const response = await fetch("/api/resume/ai-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "chat-refine",
                    message: currentInput,
                    payload: currentPayload,
                }),
            });

            if (!response.ok) throw new Error("API 요청 실패");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) return;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setGeneratedText(prev => prev + chunk);
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

        // 기존 프로젝트 추가 방식에서 자기소개서(자소서) 필드 업데이트 방식으로 변경
        const currentIntro = updatedPayload.selfIntroduction || "";
        updatedPayload.selfIntroduction = currentIntro
            ? `${currentIntro}\n\n${generatedText}`
            : generatedText;

        onUpdatePayload(updatedPayload);
        toast({ title: "이력서 적용 완료", description: "작성한 내용이 자기소개서 섹션에 반영되었습니다." });

        if (!isWizard) {
            setMode("main");
        } else if (onWizardComplete) {
            onWizardComplete();
        }
    };

    if (mode === "stadri") {
        return (
            <div className={cn("space-y-4 animate-in fade-in slide-in-from-right-4 duration-300", isWizard && "w-full max-w-4xl mx-auto py-8")}>
                {!isWizard && (
                    <Button variant="ghost" size="sm" onClick={() => setMode("main")} className="mb-2 p-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors">
                        <ChevronLeft className="w-4 h-4 mr-1" /> 사이드바 목록
                    </Button>
                )}
                <div className="space-y-2 text-center">
                    <h3 className={cn("font-bold flex items-center gap-2 justify-center", isWizard ? "text-3xl" : "text-lg")}>
                        <Sparkles className="w-6 h-6 text-primary" />
                        {isWizard ? "경험을 AI와 함께 문장으로 만들어요" : "STADRI 경험 정리"}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
                        {isWizard
                            ? "기억나는 대로 단어나 짧은 문장으로 적어도 괜찮아요. AI가 자소서 문장으로 다듬어 드립니다."
                            : "키워드나 짧은 문장으로 적어주시면 AI가 전문적인 자소서 문장을 만듭니다."}
                    </p>
                </div>

                <div className={cn("grid gap-5 mt-8", isWizard ? "grid-cols-2" : "grid-cols-1")}>
                    {[
                        {
                            id: 's',
                            label: '① 어떤 상황이었나요?',
                            sub: '프로젝트/업무의 배경이나 맥락을 자유롭게 적어주세요.',
                            placeholder: '예) 팀 프로젝트에서 백엔드 담당, 사용자 응답 속도가 너무 느린 문제가 생겼어요'
                        },
                        {
                            id: 't',
                            label: '② 내가 맡은 역할·목표는?',
                            sub: '어떤 임무를 맡았고, 무엇을 달성해야 했나요?',
                            placeholder: '예) API 응답 시간을 50% 이상 단축해야 했어요'
                        },
                        {
                            id: 'a',
                            label: '③ 어떻게 해결했나요?',
                            sub: '직접 실행한 행동이나 방법을 구체적으로 적어주세요.',
                            placeholder: '예) DB 쿼리를 분석해서 N+1 문제를 발견하고 배치 쿼리로 교체했어요'
                        },
                        {
                            id: 'd',
                            label: '④ 어떤 어려움이 있었나요?',
                            sub: '과정 중 막혔던 순간이나 까다로웠던 점을 적어주세요.',
                            placeholder: '예) 레거시 코드가 많아서 수정 범위를 파악하는 데 오래 걸렸어요'
                        },
                        {
                            id: 'r',
                            label: '⑤ 결과는 어땠나요?',
                            sub: '수치나 변화가 있다면 적어 주세요.',
                            placeholder: '예) 응답 속도 60% 개선, 사용자 이탈률 15% 감소'
                        },
                        {
                            id: 'i',
                            label: '⑥ 무엇을 배웠나요?',
                            sub: '이 경험에서 얻은 인사이트나 다음에 활용할 점을 적어주세요.',
                            placeholder: '예) 성능 문제는 항상 데이터 흐름부터 분석해야 한다는 걸 배웠어요'
                        },
                    ].map((item) => (
                        <div key={item.id} className="space-y-2 focus-within:translate-x-1 transition-transform">
                            <div>
                                <Label htmlFor={item.id} className="text-sm font-bold text-foreground">{item.label}</Label>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                            </div>
                            <Textarea
                                id={item.id}
                                placeholder={item.placeholder}
                                value={stadriData[item.id as keyof typeof stadriData]}
                                onChange={(e) => handleStadriChange(item.id as keyof typeof stadriData, e.target.value)}
                                className="min-h-[80px] text-sm bg-muted/30 border-none focus-visible:ring-primary/30 transition-shadow resize-none p-3"
                            />
                        </div>
                    ))}
                </div>
                <Button
                    className={cn("w-full mt-6 h-12 font-bold gap-2 shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all", isWizard && "text-lg")}
                    onClick={startStadriGeneration}
                    disabled={!stadriData.s && !stadriData.a}
                >
                    <Sparkles className="w-5 h-5" /> 전문 문구 실시간 생성
                </Button>
            </div>
        );
    }

    if (mode === "chat") {
        return (
            <div className={cn("flex flex-col h-full space-y-4 animate-in fade-in slide-in-from-right-4 duration-300", isWizard && "w-full max-w-4xl mx-auto py-8 min-h-[600px]")}>
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setMode("stadri")} className="p-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors">
                        <ChevronLeft className="w-4 h-4 mr-1" /> 항목 다시 수정하기
                    </Button>
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-primary/10 text-primary border-none">AI 스트리밍 보정 중</Badge>
                </div>

                <Card className="flex-1 min-h-[500px] flex flex-col overflow-hidden border-primary/10 bg-primary/5/30 backdrop-blur-sm shadow-inner">
                    <CardHeader className="p-4 py-4 border-b bg-white/40">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                            <BrainCircuit className="w-5 h-5" /> AI가 추천하는 완성된 이력서 문구
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col">
                        <ScrollArea className="flex-1 p-6" ref={scrollRef as any}>
                            <div className="text-base leading-loose whitespace-pre-wrap font-medium text-slate-700">
                                {generatedText}
                                {isStreaming && (
                                    <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-6 bg-white/60 border-t flex flex-col gap-6">
                            <div className="space-y-3">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <MessageSquare className="w-3" /> 수정하고 싶은 내용이 있다면 AI에게 말해주세요
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="예: 조금 더 수치 중심의 데이터 분석 역량을 강조해줘"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleChatRefine()}
                                        className="h-12 text-sm bg-white border-primary/10 focus-visible:ring-primary/20"
                                    />
                                    <Button size="icon" onClick={handleChatRefine} disabled={isStreaming} className="shrink-0 bg-primary h-12 w-12">
                                        <Send className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                            <Button
                                onClick={applyToResume}
                                disabled={isStreaming || !generatedText}
                                className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-xl shadow-indigo-200 transition-all hover:scale-[1.01]"
                            >
                                <CheckCircle2 className="w-6 h-6" /> 이대로 이력서에 반영하고 계속하기
                            </Button>
                        </div>
                    </CardContent>
                </Card>
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
