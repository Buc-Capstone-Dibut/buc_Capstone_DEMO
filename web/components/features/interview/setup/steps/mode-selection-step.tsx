"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { useRouter } from "next/navigation";

export function ModeSelectionStep() {
    const { setStep } = useInterviewSetupStore();
    const router = useRouter();
    const [durationMinutes, setDurationMinutes] = useState<5 | 7 | 10>(7);

    const handleModeSelect = (mode: 'chat' | 'video') => {
        const nextPath = mode === "video" ? "/interview/room/video" : "/interview/room/chat";
        router.push(`${nextPath}?duration=${durationMinutes}`);
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="mb-12 text-center space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">면접 방식 선택</h1>
                <p className="text-muted-foreground text-lg">
                    가장 편안하게 집중할 수 있는 면접 방식을 선택해주세요.
                </p>
                <div className="pt-4 flex items-center justify-center gap-2">
                    {[5, 7, 10].map((minute) => (
                        <Button
                            key={minute}
                            type="button"
                            variant={durationMinutes === minute ? "default" : "outline"}
                            className="h-8 px-3 text-xs"
                            onClick={() => setDurationMinutes(minute as 5 | 7 | 10)}
                        >
                            {minute}분
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
                {/* 1. Chat Interview */}
                <Card
                    className="relative overflow-hidden border-2 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md hover:border-primary/50"
                    onClick={() => handleModeSelect('chat')}
                >
                    <CardHeader className="pb-3 px-8 pt-10">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                Chat Interview
                            </span>
                            <CardTitle className="text-2xl font-bold tracking-tight">채팅 면접</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-10">
                        <CardDescription className="text-sm leading-relaxed mb-8 h-12">
                            텍스트 채팅을 통해 면접을 진행합니다.<br />
                            실시간 대화로 차분하게 생각을 정리하여 답변하기 좋습니다.
                        </CardDescription>

                        <div className="flex items-center justify-between">
                            <div className="h-1 w-12 rounded-full bg-primary" />
                            <div className="text-xs font-bold text-primary flex items-center gap-1">
                                지금 시작하기 <ArrowRight className="w-3 h-3" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Video Interview */}
                <Card
                    className="relative overflow-hidden border-2 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md hover:border-primary/50"
                    onClick={() => handleModeSelect('video')}
                >
                    <CardHeader className="pb-3 px-8 pt-10">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                Video Interview
                            </span>
                            <CardTitle className="text-2xl font-bold tracking-tight">화상 면접</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-10">
                        <CardDescription className="text-sm leading-relaxed mb-8 h-12">
                            카메라와 마이크를 사용하여 실전처럼 진행합니다.<br />
                            LiveKit 베타 연결로 실제 면접 상황을 연습할 수 있습니다.
                        </CardDescription>

                        <div className="flex items-center justify-between">
                            <div className="h-1 w-12 rounded-full bg-primary" />
                            <div className="text-xs font-bold text-primary flex items-center gap-1">
                                지금 시작하기 <ArrowRight className="w-3 h-3" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-16 flex justify-center border-t pt-8">
                <Button variant="ghost" onClick={() => setStep('personality-selection')} className="gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" /> 이전 단계: 성격 선택으로
                </Button>
            </div>
        </div>
    );
}
