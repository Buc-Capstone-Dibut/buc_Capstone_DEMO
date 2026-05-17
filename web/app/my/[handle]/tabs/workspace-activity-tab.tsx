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

function StatInline({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) {
  const isZero = value === 0;
  return (
    <span
      className={
        isZero
          ? "inline-flex items-center gap-1 text-muted-foreground/70"
          : "inline-flex items-center gap-1 text-foreground"
      }
      title={label}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span className="font-medium">{numberLabel(value)}</span>
    </span>
  );
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
        <ul className="divide-y rounded-lg border bg-card">
          {filtered.map((workspace) => {
            const isCompleted = workspace.lifecycleStatus === "COMPLETED";
            const stats = workspace.stats;
            return (
              <li
                key={workspace.id}
                className="px-4 py-3 transition-colors hover:bg-accent/30"
              >
                <div className="flex items-center gap-3">
                  {/* 아바타 */}
                  <Avatar className="h-9 w-9 shrink-0 border">
                    <AvatarImage src={workspace.iconUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                      {workspace.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* 이름 + 메타 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">
                        {workspace.name}
                      </p>
                      <Badge
                        variant="outline"
                        className="h-4 shrink-0 px-1.5 text-[10px]"
                      >
                        {workspace.role === "owner" ? "리더" : "멤버"}
                      </Badge>
                      <Badge
                        variant={isCompleted ? "secondary" : "default"}
                        className="h-4 shrink-0 px-1.5 text-[10px]"
                      >
                        {isCompleted ? "종료" : "진행중"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {getTeamTypeLabel(workspace.category)} ·{" "}
                      {participationLabel(workspace)} ·{" "}
                      {joinedDurationLabel(
                        workspace.joinedAt,
                        workspace.completedAt,
                      )}{" "}
                      참여
                    </p>
                  </div>

                  {/* 우측: stats inline (md 이상) */}
                  <div className="hidden items-center gap-3 text-xs tabular-nums md:flex">
                    <StatInline
                      icon={FileText}
                      label="문서"
                      value={stats.docsCreated}
                    />
                    <StatInline
                      icon={ClipboardList}
                      label="태스크"
                      value={stats.tasksAssigned}
                    />
                    <StatInline
                      icon={MessageSquare}
                      label="메시지"
                      value={stats.messagesSent}
                    />
                    <div className="h-4 w-px bg-border" />
                    <span className="font-semibold text-foreground">
                      총 {numberLabel(stats.totalActivities)}
                    </span>
                  </div>
                </div>

                {/* 모바일: stats를 다음 줄로 */}
                <div className="mt-2 flex items-center gap-3 text-[11px] tabular-nums text-muted-foreground md:hidden">
                  <span>문서 {numberLabel(stats.docsCreated)}</span>
                  <span>·</span>
                  <span>태스크 {numberLabel(stats.tasksAssigned)}</span>
                  <span>·</span>
                  <span>메시지 {numberLabel(stats.messagesSent)}</span>
                  <span>·</span>
                  <span className="font-semibold text-foreground">
                    총 {numberLabel(stats.totalActivities)}
                  </span>
                </div>

                {/* 종료 상태일 때 결과 메모 한 줄 */}
                {isCompleted &&
                  (workspace.resultNote || workspace.resultLink) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2 text-[11px] text-muted-foreground">
                      <CalendarDays className="h-3 w-3" aria-hidden />
                      <span>종료 {formatDate(workspace.completedAt)}</span>
                      {workspace.resultType && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1.5 text-[10px]"
                        >
                          {workspace.resultType}
                        </Badge>
                      )}
                      {workspace.resultNote && (
                        <span className="line-clamp-1 flex-1 text-foreground/80">
                          {workspace.resultNote}
                        </span>
                      )}
                      {workspace.resultLink && (
                        <a
                          href={workspace.resultLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                        >
                          <Link2 className="h-3 w-3" />
                          결과
                        </a>
                      )}
                    </div>
                  )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
