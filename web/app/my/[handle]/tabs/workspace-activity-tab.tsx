"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Loader2,
  MessageSquare,
  Users,
  Link2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProfileWorkspaceItem } from "../profile-types";
import { ProfileEmptyState } from "./empty-state";
import { getTeamTypeLabel } from "@/lib/team-types";

interface WorkspaceActivityTabProps {
  loading?: boolean;
  error?: string;
  workspaces: ProfileWorkspaceItem[];
}

type WorkspaceFilter = "all" | "in_progress" | "completed";

function numberLabel(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR");
}

function joinedDurationLabel(
  joinedAt: string | null,
  completedAt: string | null,
): string {
  if (!joinedAt) return "정보 없음";

  const joined = new Date(joinedAt);
  if (Number.isNaN(joined.getTime())) return "정보 없음";

  const end = completedAt ? new Date(completedAt) : new Date();
  if (Number.isNaN(end.getTime())) return "정보 없음";

  const diffMs = Math.max(end.getTime() - joined.getTime(), 0);
  const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  return `${numberLabel(days)}일`;
}

function participationLabel(workspace: ProfileWorkspaceItem): string {
  const start = formatDate(workspace.startedAt || workspace.joinedAt);
  const end =
    workspace.lifecycleStatus === "COMPLETED"
      ? formatDate(workspace.completedAt)
      : "진행중";
  return `${start} ~ ${end}`;
}

export function WorkspaceActivityTab({
  loading,
  error,
  workspaces,
}: WorkspaceActivityTabProps) {
  const [filter, setFilter] = useState<WorkspaceFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "in_progress") {
      return workspaces.filter((ws) => ws.lifecycleStatus === "IN_PROGRESS");
    }
    if (filter === "completed") {
      return workspaces.filter((ws) => ws.lifecycleStatus === "COMPLETED");
    }
    return workspaces;
  }, [filter, workspaces]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        불러오는 중...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500 py-20 text-center">{error}</p>;
  }

  if (workspaces.length === 0) {
    return (
      <ProfileEmptyState
        icon={Users}
        message="참여 중인 스페이스 활동 데이터가 없습니다."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={filter === "all" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          전체
        </Button>
        <Button
          type="button"
          variant={filter === "in_progress" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("in_progress")}
        >
          진행중
        </Button>
        <Button
          type="button"
          variant={filter === "completed" ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          종료
        </Button>
      </div>

      {filtered.length === 0 ? (
        <ProfileEmptyState
          icon={Users}
          message="선택한 상태에 해당하는 팀 공간이 없습니다."
        />
      ) : (
        filtered.map((workspace) => {
          const isCompleted = workspace.lifecycleStatus === "COMPLETED";

          return (
            <section
              key={workspace.id}
              className="border rounded-xl bg-card text-card-foreground overflow-hidden"
            >
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-3">
                <Avatar className="w-9 h-9 border">
                  <AvatarImage src={workspace.iconUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {workspace.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{workspace.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getTeamTypeLabel(workspace.category)} ·{" "}
                    {participationLabel(workspace)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                    {workspace.role === "owner" ? "리더" : "멤버"}
                  </Badge>
                  <Badge
                    variant={isCompleted ? "secondary" : "default"}
                    className="text-[10px] px-1.5 h-4"
                  >
                    {isCompleted ? "종료" : "진행중"}
                  </Badge>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      문서 작성
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {numberLabel(workspace.stats.docsCreated)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />
                      담당 태스크
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {numberLabel(workspace.stats.tasksAssigned)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      채팅 메시지
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {numberLabel(workspace.stats.messagesSent)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      참여 기간
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {joinedDurationLabel(workspace.joinedAt, workspace.completedAt)}
                    </p>
                  </div>
                </div>

                {isCompleted && (
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>종료일</span>
                      <span className="font-medium text-foreground">
                        {formatDate(workspace.completedAt)}
                      </span>
                      {workspace.resultType && (
                        <Badge variant="outline" className="h-5 text-[10px]">
                          {workspace.resultType}
                        </Badge>
                      )}
                    </div>
                    {workspace.resultNote && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {workspace.resultNote}
                      </p>
                    )}
                    {workspace.resultLink && (
                      <a
                        href={workspace.resultLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Link2 className="w-3 h-3" />
                        결과 링크 보기
                      </a>
                    )}
                  </div>
                )}

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    이 스페이스 총 활동량
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {numberLabel(workspace.stats.totalActivities)}
                  </span>
                </div>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
