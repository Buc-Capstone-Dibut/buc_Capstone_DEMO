"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { motion } from "framer-motion";

const PERSONALITIES = [
    {
        id: 'professional',
        name: '신뢰 중심',
        subtitle: 'Professional',
        description: '공식적이고 구조화된 질문을 던지며 실전과 같은 긴장감을 제공합니다.',
        color: 'primary'
    },
    {
        id: 'friendly',
        name: '따뜻한 격려',
        subtitle: 'Friendly',
        description: '부드러운 말투로 긴장을 풀어주며 긍정적인 피드백과 함께 진행합니다.',
        color: 'orange-500'
    },
    {
        id: 'cold',
        name: '압박 면접',
        subtitle: 'Challenge',
        description: '꼬리 질문과 날카로운 피드백으로 압박 상황에 대처하는 능력을 훈련합니다.',
        color: 'purple-500'
    }
];

export function PersonalitySelectionStep() {
    const { setStep, interviewerPersonality, setInterviewerPersonality } = useInterviewSetupStore();

    const handleNext = () => {
        setStep('mode-selection');
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="mb-12 text-center space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">AI 면접관의 성격 스타일</h1>
                <p className="text-muted-foreground text-lg">
                    원하시는 면접 분위기에 맞춰 스타일을 선택해주세요.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {PERSONALITIES.map((p) => {
                    const isSelected = interviewerPersonality === p.id;
                    return (
                        <Card
                            key={p.id}
                            className={`relative overflow-hidden border-2 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md ${isSelected
                                    ? 'border-primary bg-primary/[0.02] ring-4 ring-primary/5'
                                    : 'hover:border-primary/30 border-border'
                                }`}
                            onClick={() => setInterviewerPersonality(p.id)}
                        >
                            <CardHeader className="pb-3 px-6 pt-8">
                                <div className="space-y-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {p.subtitle}
                                    </span>
                                    <CardTitle className="text-xl font-bold tracking-tight">{p.name}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="px-6 pb-8">
                                <CardDescription className="text-sm leading-relaxed mb-6 h-12">
                                    {p.description}
                                </CardDescription>

                                <div className="flex items-center justify-between">
                                    <div className={`h-1 w-12 rounded-full transition-all duration-500 ${isSelected ? 'bg-primary w-20' : 'bg-muted'}`} />
                                    {isSelected && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                                        >
                                            <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                                        </motion.div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-16 flex justify-between items-center max-w-2xl mx-auto border-t pt-8">
                <Button variant="ghost" onClick={() => setStep('final-check')} className="gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" /> 이전 단계
                </Button>
                <div className="flex-1" />
                <Button onClick={handleNext} className="gap-2 px-10 h-12 font-bold shadow-xl shadow-primary/20 transition-all hover:translate-y-[-2px] active:translate-y-0">
                    다음: 면접 방식 선택 <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
