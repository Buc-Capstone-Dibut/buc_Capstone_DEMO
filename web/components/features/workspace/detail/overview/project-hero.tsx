"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, FileText, KanbanSquare, Settings, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { getTeamTypeLabel } from "@/lib/team-types";

type ProjectContext = {
  team_type_label?: string | null;
  headline?: string | null;
  summary?: string | null;
  activity?: {
    title?: string | null;
    date?: string | null;
  } | null;
};

type HeroProject = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  my_role?: string | null;
  lifecycle_status?: "IN_PROGRESS" | "COMPLETED";
  project_context?: ProjectContext | null;
};

interface ProjectHeroProps {
  project: HeroProject | null | undefined;
}

export function ProjectHero({ project }: ProjectHeroProps) {
  const router = useRouter();
  const isOwner = project?.my_role === "owner";
  const context = project?.project_context;
  const categoryLabel =
    context?.team_type_label || getTeamTypeLabel(project?.category);

  if (!project) return null;

  return (
    <Card className="overflow-hidden border bg-background shadow-sm">
      <CardContent className="p-6 md:p-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/20 bg-background text-primary"
            >
              {categoryLabel}
            </Badge>
            {context?.activity?.title && (
              <Badge
                variant="outline"
                className="max-w-full gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              >
                <Trophy className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{context.activity.title}</span>
              </Badge>
            )}
            {project.lifecycle_status === "COMPLETED" && (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                완료된 프로젝트
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {project.name}
            </h1>
            <p className="text-lg leading-relaxed text-foreground/90">
              {context?.headline || project.description || "팀 공간 설명이 아직 없습니다."}
            </p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {context?.summary ||
                "프로젝트 목표와 배경을 정리하면 Overview에서 더 분명하게 전달됩니다."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              className="rounded-full shadow-sm"
              onClick={() => router.push(`/workspace/${project.id}?tab=board`)}
            >
              <KanbanSquare className="mr-2 h-4 w-4" />
              보드로 이동
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => router.push(`/workspace/${project.id}?tab=docs`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              문서 열기
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => router.push(`/workspace/${project.id}?tab=schedule`)}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              일정 보기
            </Button>
            {isOwner && (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => router.push(`/workspace/${project.id}?tab=settings`)}
              >
                <Settings className="mr-2 h-4 w-4" />
                설정
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
