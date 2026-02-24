"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function ModeSelectionStep() {
    const { setStep } = useInterviewSetupStore();
    const router = useRouter();

    const handleModeSelect = (mode: 'chat' | 'video') => {
        if (mode === 'chat') {
            router.push('/interview/room?mode=chat');
        } else {
            // Video mode is currently unavailable
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="mb-12 text-center space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">면접 방식 선택</h1>
                <p className="text-muted-foreground text-lg">
                    가장 편안하게 집중할 수 있는 면접 방식을 선택해주세요.
                </p>
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

                {/* 2. Video Interview (Coming Soon) */}
                <Card
                    className="relative overflow-hidden border-2 border-dashed border-border transition-all duration-300 shadow-none bg-neutral-50/50"
                >
                    <CardHeader className="pb-3 px-8 pt-10">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Video Interview
                            </span>
                            <CardTitle className="text-2xl font-bold tracking-tight text-neutral-400">화상 면접</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-10">
                        <CardDescription className="text-sm leading-relaxed mb-8 h-12 text-neutral-400">
                            카메라와 마이크를 사용하여 실전처럼 진행합니다.<br />
                            조금 더 생생한 면접 경험을 위해 준비 중입니다.
                        </CardDescription>

                        <div className="flex items-center justify-between opacity-40">
                            <div className="h-1 w-12 rounded-full bg-neutral-300" />
                            <div className="text-[10px] font-bold text-neutral-500 uppercase">
                                Coming Soon
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
