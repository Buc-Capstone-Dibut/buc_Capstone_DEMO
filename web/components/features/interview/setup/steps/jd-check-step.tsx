"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { JdCheckForm } from "./jd-check-form";

export function JdCheckStep() {
  const { jobData, updateJobData, setStep } = useInterviewSetupStore();
  // Local state for editing to prevent constant store updates on every keystroke if needed,
  // but Zustand is fast enough. We'll use local state for "Add New Item" inputs.



  if (!jobData) {
      // Fallback if accessed directly without data
      return (
          <div className="p-8 text-center">
              <p>데이터가 없습니다. 처음부터 다시 시작해주세요.</p>
              <Button onClick={() => setStep('target')} className="mt-4">돌아가기</Button>
          </div>
      );
  }



  return (
    <div className="max-w-4xl mx-auto py-8 px-6 pb-20">
      <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">JD 분석 결과 확인</h1>
            <p className="text-muted-foreground">
                AI가 분석한 채용 공고 내용입니다. 정확하지 않은 부분은 직접 수정해주세요.
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
             <div className="font-medium text-foreground">{jobData.role}</div>
             <div>{jobData.company}</div>
          </div>
      </div>

      <JdCheckForm jobData={jobData} updateJobData={updateJobData} />

      <div className="flex justify-between mt-10">
          <Button variant="outline" onClick={() => setStep('target')} className="px-6 h-12">
             <ArrowLeft className="mr-2 w-4 h-4" /> 다시 선택
          </Button>

          <Button onClick={() => setStep('resume')} className="px-8 h-12 text-base shadow-lg shadow-primary/20">
             정보가 정확합니다 (다음) <Check className="ml-2 w-4 h-4" />
          </Button>
      </div>
    </div>
  );
}
