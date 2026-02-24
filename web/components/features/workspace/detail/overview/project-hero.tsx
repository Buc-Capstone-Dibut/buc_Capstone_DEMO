"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Plus,
  FileText,
  Video,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EditWorkspaceDialog } from "../../dialogs/edit-workspace-dialog";

interface ProjectHeroProps {
  project: any;
  progress: number;
  totalTasks: number;
  completedTasks: number;
}

export function ProjectHero({
  project,
  progress,
  totalTasks,
  completedTasks,
}: ProjectHeroProps) {
  if (!project) return null;

  return (
    <Card className="border bg-background shadow-sm">
      <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
        {/* Left: Info */}
        <div className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-background border-primary/20 text-primary"
              >
                {project.category || "사이드 프로젝트"}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {project.name}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {project.description || "No description provided."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button className="rounded-full shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              새 작업
            </Button>
            <Button variant="secondary" className="rounded-full">
              <FileText className="h-4 w-4 mr-2" />
              새 문서
            </Button>

            <EditWorkspaceDialog workspace={project} />
          </div>
        </div>

        {/* Right: Simple Stats */}
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col items-center justify-center p-4 border rounded-xl min-w-[120px] bg-muted/30">
            <CheckCircle2 className="h-5 w-5 text-primary mb-2 opacity-80" />
            <span className="text-2xl font-bold">{totalTasks}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase">
              전체 작업
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 border rounded-xl min-w-[120px] bg-muted/30">
            <div className="h-5 w-5 rounded-full border-2 border-green-500 flex items-center justify-center mb-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              {completedTasks}
            </span>
            <span className="text-xs text-muted-foreground font-medium uppercase">
              완료됨
            </span>
          </div>
          {project.members && (
            <div className="flex flex-col items-center justify-center p-4 border rounded-xl min-w-[120px] bg-muted/30">
              <span className="text-xl mb-2">👥</span>
              <span className="text-2xl font-bold">
                {project.members.length}
              </span>
              <span className="text-xs text-muted-foreground font-medium uppercase">
                멤버
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
