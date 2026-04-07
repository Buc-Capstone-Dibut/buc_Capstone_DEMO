"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveExperienceAction, type ExperienceInput } from "../actions";
import { Button } from "@/components/ui/button";
import { MonthRangePicker } from "@/components/features/resume/MonthRangePicker";
import { X, ChevronRight, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const STEPS = [
  { id: "basic", label: "기본 정보" },
  { id: "s", question: "이 경험은 어떤 배경에서 시작하게 된 건가요?", placeholder: "예: 팀 프로젝트에서 백엔드 담당, 응답 속도가 느린 문제가 발생했어요" },
  { id: "t", question: "여기서 나의 주된 임무는 무엇이었나요?", placeholder: "예: API 응답 시간을 50% 이상 단축해야 했어요" },
  { id: "a", question: "구체적으로 어떤 행동을 했나요?", placeholder: "예: 쿼리를 분석하고 N+1 문제를 찾아 배치 쿼리로 개선했어요" },
  { id: "d", question: "진행하며 가장 힘들었던 점은 무엇인가요?", placeholder: "예: 레거시 코드가 많아 구조를 완전히 파악하는 데 시간이 오래 걸렸어요" },
  { id: "r", question: "어떤 성과나 결과물이 있었나요?", placeholder: "예: 응답 속도를 60% 개선했고 사용자 이탈률을 15% 줄였어요" },
  { id: "i", question: "이 경험을 통해 새롭게 깨닫거나 배운 점은 무엇인가요?", placeholder: "예: 성능 문제는 항상 데이터 구조와 흐름에서 답을 찾아야 함을 배웠어요" }
];

export default function ExperienceWizardClient() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Partial<ExperienceInput>>({
    company: "",
    period: "",
    tags: [],
    situation: "",
    role: "",
    solution: "",
    difficulty: "",
    result: "",
    lesson: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  const handleTagsChange = (val: string) => {
    setTagsInput(val);
    const tags = val.split(",").map(t => t.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleSave();
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleSave = async () => {
    if (!formData.company?.trim()) {
      alert("활동명(제목)은 필수입니다. 작성 항목으로 돌아갑니다.");
      setCurrentStepIndex(0);
      return;
    }
    setIsSaving(true);
    try {
      await saveExperienceAction(formData as ExperienceInput);
      router.push("/career/experiences");
      router.refresh();
    } catch(err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
      setIsSaving(false);
    }
  };

  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="h-full flex flex-col">
      {/* 초미니멀 상단 바 */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="font-bold text-[14px]">나의 경험 기록하기</div>
        <button 
          onClick={() => router.push("/career/experiences")} 
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {currentStepIndex === 0 && (
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">먼저 기본 정보를 입력할게요</h1>
                <p className="text-[14px] text-slate-500">경험에 붙일 이름표를 달아주세요.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">활동명 (프로젝트 / 직무 / 대외활동 등)</label>
                  <input 
                    value={formData.company || ""} 
                    onChange={e => setFormData({...formData, company: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[15px] font-medium placeholder:text-slate-300" 
                    placeholder="예: GDSC 웹 파트너" 
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">진행 기간 (언제부터 언제까지였나요?)</label>
                  <MonthRangePicker 
                    value={formData.period || ""} 
                    onChange={v => setFormData({...formData, period: v})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">핵심 태그 (쉽표로 구분)</label>
                  <input 
                    value={tagsInput} 
                    onChange={e => handleTagsChange(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px]" 
                    placeholder="예: 리더십, 소통, React, 배포" 
                  />
                </div>
              </div>

              <div className="pt-8">
                <Button 
                  onClick={handleNext}
                  disabled={!formData.company?.trim()}
                  className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-[16px] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  다음 단계로 <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {currentStepIndex > 0 && currentStepIndex < STEPS.length && (
            <div className="space-y-10" key={currentStepIndex}>
              <div className="space-y-4">
                <div className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary font-bold text-[12px] rounded-full uppercase tracking-widest">
                  Question {currentStepIndex} of 6
                </div>
                <h1 className="text-3xl font-bold leading-tight text-slate-900 dark:text-white">
                  {STEPS[currentStepIndex].question}
                </h1>
                <p className="text-[14px] text-slate-500">키워드나 짧은 문장으로 가볍게 적어도 좋고, 서술형으로 꼼꼼히 적어도 좋습니다.</p>
              </div>

              <Textarea 
                value={
                  currentStepIndex === 1 ? formData.situation || "" :
                  currentStepIndex === 2 ? formData.role || "" :
                  currentStepIndex === 3 ? formData.solution || "" :
                  currentStepIndex === 4 ? formData.difficulty || "" :
                  currentStepIndex === 5 ? formData.result || "" :
                  formData.lesson || ""
                }
                onChange={e => {
                  const val = e.target.value;
                  if (currentStepIndex === 1) setFormData({ ...formData, situation: val });
                  else if (currentStepIndex === 2) setFormData({ ...formData, role: val });
                  else if (currentStepIndex === 3) setFormData({ ...formData, solution: val });
                  else if (currentStepIndex === 4) setFormData({ ...formData, difficulty: val });
                  else if (currentStepIndex === 5) setFormData({ ...formData, result: val });
                  else setFormData({ ...formData, lesson: val });
                }}
                className="w-full min-h-[160px] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[16px] leading-relaxed resize-none shadow-sm placeholder:text-slate-300"
                placeholder={STEPS[currentStepIndex].placeholder}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleNext();
                  }
                }}
              />

              <div className="flex flex-col gap-3 pt-6">
                <Button 
                  onClick={handleNext}
                  className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-[16px] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center gap-2 justify-center"
                >
                  {currentStepIndex === STEPS.length - 1 ? (
                    <><Check className="w-5 h-5"/> 기록 완료 및 저장</>
                  ) : (
                    <>다음 질문 <ChevronRight className="w-5 h-5" /></>
                  )}
                </Button>
                
                <Button 
                  onClick={handleSkip}
                  variant="ghost"
                  className="w-full h-12 text-slate-400 hover:text-slate-600 font-medium"
                >
                  이 항목은 건너뛰기
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
