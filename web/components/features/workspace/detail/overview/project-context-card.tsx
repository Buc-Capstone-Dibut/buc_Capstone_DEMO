"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlarmClockCheck,
  Flag,
  Layers3,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

type ProjectContext = {
  team_type_label?: string | null;
  source?: string | null;
  summary?: string | null;
  squad?: {
    title?: string | null;
    typeLabel?: string | null;
    recruitmentPeriod?: string | null;
    techStack?: string[] | null;
  } | null;
  activity?: {
    title?: string | null;
    host?: string | null;
    date?: string | null;
  } | null;
};

type ProgressSummary = {
  openTasks?: number;
  overdueTasks?: number;
  completionRate?: number;
};

interface ProjectContextCardProps {
  context?: ProjectContext | null;
  progress?: ProgressSummary | null;
}

export function ProjectContextCard({
  context,
  progress,
}: ProjectContextCardProps) {
  const techStack = context?.squad?.techStack?.filter(Boolean) ?? [];

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          프로젝트 컨텍스트
        </CardTitle>
        <CardDescription>
          이 공간이 무엇을 위해 열렸는지와 현재 목표를 요약합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Layers3 className="h-4 w-4 text-primary" />
              프로젝트 유형
            </div>
            <p className="text-sm text-muted-foreground">
              {context?.team_type_label || "프로젝트"}
            </p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Flag className="h-4 w-4 text-primary" />
              현재 초점
            </div>
            <p className="text-sm text-muted-foreground">
              {progress?.openTasks
                ? `열린 작업 ${progress.openTasks}개를 정리 중입니다.`
                : "아직 열린 작업이 없습니다."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Target className="h-4 w-4 text-primary" />
            목표 요약
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {context?.summary ||
              "프로젝트 목표와 배경을 정리하면 여기에서 바로 확인할 수 있습니다."}
          </p>
        </div>

        {(context?.activity?.title || context?.squad?.title) && (
          <div className="rounded-2xl border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Trophy className="h-4 w-4 text-primary" />
              시작 배경
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              {context?.activity?.title && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{context.activity.title}</span>
                </div>
              )}
              {context?.activity?.host && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>주최: {context.activity.host}</span>
                </div>
              )}
              {context?.activity?.date && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>일정: {context.activity.date}</span>
                </div>
              )}
              {context?.squad?.title && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{context.squad.title}</span>
                </div>
              )}
              {context?.squad?.recruitmentPeriod && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>모집 기간: {context.squad.recruitmentPeriod}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-background p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <AlarmClockCheck className="h-4 w-4 text-primary" />
            리스크 체크
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {progress?.overdueTasks
              ? `현재 ${progress.overdueTasks}개의 작업이 마감 지연 상태입니다. Overview와 일정 탭에서 먼저 정리하는 것이 좋습니다.`
              : progress?.completionRate
                ? `현재 진행률은 ${progress.completionRate}%이며, 큰 일정 리스크는 보이지 않습니다.`
                : "작업이 쌓이면 여기에서 마감 지연과 현재 상태를 함께 보여줍니다."}
          </p>
        </div>

        {techStack.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">핵심 스택</div>
            <div className="flex flex-wrap gap-2">
              {techStack.slice(0, 8).map((tech) => (
                <Badge key={tech} variant="secondary" className="rounded-full">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
