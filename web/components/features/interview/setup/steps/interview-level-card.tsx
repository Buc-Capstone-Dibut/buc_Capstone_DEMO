"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  interviewLevelLabel,
  INTERVIEW_LEVEL_OPTIONS,
  normalizeInterviewLevel,
  recommendInterviewLevel,
} from "@/lib/interview/interview-level";
import type { InterviewLevel, JobData, ResumeData } from "@/store/interview-setup-store";

interface InterviewLevelCardProps {
  jobData: JobData;
  resumeData?: ResumeData | null;
  updateJobData: (data: Partial<JobData>) => void;
}

export function InterviewLevelCard({
  jobData,
  resumeData,
  updateJobData,
}: InterviewLevelCardProps) {
  const selectedLevel = normalizeInterviewLevel(jobData.interviewLevel);
  const recommendedLevel = recommendInterviewLevel(jobData, resumeData);
  const effectiveLevel = selectedLevel === "auto" ? recommendedLevel : selectedLevel;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">면접 난이도 기준</CardTitle>
          <Badge variant="secondary" className="font-medium">
            추천: {interviewLevelLabel(recommendedLevel)}
          </Badge>
        </div>
        <CardDescription>
          선택한 레벨에 따라 질문의 깊이, 표현 강도, 수치·트레이드오프 질문 빈도가 달라집니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-[220px_1fr] md:items-start">
        <div className="space-y-2">
          <Label htmlFor="interview-level">면접 레벨</Label>
          <Select
            value={selectedLevel}
            onValueChange={(value) => {
              updateJobData({ interviewLevel: value as InterviewLevel });
            }}
          >
            <SelectTrigger id="interview-level">
              <SelectValue placeholder="면접 레벨 선택" />
            </SelectTrigger>
            <SelectContent>
              {INTERVIEW_LEVEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            현재 적용 기준: <span className="font-medium text-foreground">{interviewLevelLabel(effectiveLevel)}</span>
          </p>
          <p>
            신입·주니어는 역할, 구현, 문제 해결 흐름 중심으로 질문하고, 미들·시니어로 갈수록 설계 판단과 우선순위, 트레이드오프 질문이 늘어납니다.
          </p>
          <p>
            자동 추천은 이력서 경력과 직무 문맥을 기준으로 계산됩니다. 원하는 수준이 있으면 직접 고를 수 있습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
