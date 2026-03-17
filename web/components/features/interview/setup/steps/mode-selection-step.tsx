"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { useRouter } from "next/navigation";

type SetupTrack = "posting" | "role";

interface ModeSelectionStepProps {
    track?: SetupTrack;
}

export function ModeSelectionStep({ track = "posting" }: ModeSelectionStepProps) {
    const { setStep } = useInterviewSetupStore();
    const router = useRouter();
    const [durationMinutes, setDurationMinutes] = useState<5 | 10 | 15>(10);

    const handleVideoStart = () => {
        router.push(`/interview/room/video?duration=${durationMinutes}&track=${track}`);
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="mb-12 text-center space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">면접 방식 선택</h1>
                <p className="text-muted-foreground text-lg">
                    {track === "posting"
                        ? "가장 편안하게 집중할 수 있는 면접 방식을 선택해주세요."
                        : "설계한 직무 훈련 브리프를 어떤 방식으로 실행할지 선택해주세요."}
                </p>
                <div className="pt-4 flex items-center justify-center gap-2">
                    {[5, 10, 15].map((minute) => (
                        <Button
                            key={minute}
                            type="button"
                            variant={durationMinutes === minute ? "default" : "outline"}
                            className="h-8 px-3 text-xs"
                            onClick={() => setDurationMinutes(minute as 5 | 10 | 15)}
                        >
                            {minute}분
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
                <Card
                    className="relative overflow-hidden border-2 border-dashed border-muted-foreground/20 bg-muted/20 shadow-sm"
                >
                    <CardHeader className="pb-3 px-8 pt-10">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Chat Interview
                            </span>
                            <CardTitle className="text-2xl font-bold tracking-tight">채팅 면접</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-10">
                        <CardDescription className="text-sm leading-relaxed mb-8 h-12">
                            텍스트 채팅 면접은 현재 제품 경로에서 비활성화되어 있습니다.<br />
                            아래 실시간 음성 면접만 지원합니다.
                        </CardDescription>

                        <div className="flex items-center justify-between">
                            <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
                            <div className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                UI 스텁만 유지
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="relative overflow-hidden border-2 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md hover:border-primary/50"
                    onClick={handleVideoStart}
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
                            {track === "posting" ? (
                                <>
                                    카메라와 마이크를 사용하여 실전처럼 진행합니다.<br />
                                    LiveKit 베타 연결로 실제 면접 상황을 연습할 수 있습니다.
                                </>
                            ) : (
                                <>
                                    실제 압박감에 가깝게 직무 시나리오 대응을 연습합니다.<br />
                                    현업 질문에 바로 말로 답하는 감각을 점검하기 좋습니다.
                                </>
                            )}
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
                <Button variant="ghost" onClick={() => setStep('final-check')} className="gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" /> 이전 단계: {track === "posting" ? "최종 점검으로" : "훈련 브리프로"}
                </Button>
            </div>
        </div>
    );
}
