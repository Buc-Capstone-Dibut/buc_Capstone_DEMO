"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CalendarClock, CircleAlert, UserRound } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import { ko } from "date-fns/locale";

type NextAction = {
  id: string;
  title: string;
  dueDate?: string | null;
  priority?: string | null;
  isOverdue?: boolean;
  assignee?: string | { name?: string | null } | null;
  column?: { title?: string | null } | null;
};

interface NextActionsCardProps {
  actions: NextAction[];
}

function getPriorityLabel(priority?: string | null) {
  switch (priority) {
    case "urgent":
      return "긴급";
    case "high":
      return "높음";
    case "low":
      return "낮음";
    default:
      return "보통";
  }
}

function getAssigneeLabel(action: NextAction) {
  if (!action.assignee) return "담당자 미지정";
  if (typeof action.assignee === "string") return action.assignee;
  return action.assignee.name || "담당자 미지정";
}

export function NextActionsCard({ actions }: NextActionsCardProps) {
  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowRight className="h-5 w-5 text-primary" />
          다음 액션
        </CardTitle>
        <CardDescription>
          지금 가장 먼저 확인해야 할 작업을 정리했습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length > 0 ? (
          <div className="space-y-3">
            {actions.slice(0, 4).map((action) => {
              const dueDate = action.dueDate ? new Date(action.dueDate) : null;
              const isOverdue = action.isOverdue ?? (dueDate ? isPast(dueDate) : false);

              return (
                <div
                  key={action.id}
                  className="rounded-2xl border bg-background p-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="font-medium leading-6 text-foreground">
                        {action.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {action.column?.title && (
                          <span className="rounded-full border bg-muted/40 px-2 py-0.5">
                            {action.column.title}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3.5 w-3.5" />
                          {getAssigneeLabel(action)}
                        </span>
                        {dueDate && (
                          <span
                            className={
                              isOverdue
                                ? "inline-flex items-center gap-1 text-amber-600"
                                : "inline-flex items-center gap-1"
                            }
                          >
                            {isOverdue ? (
                              <CircleAlert className="h-3.5 w-3.5" />
                            ) : (
                              <CalendarClock className="h-3.5 w-3.5" />
                            )}
                            {formatDistanceToNow(dueDate, {
                              addSuffix: true,
                              locale: ko,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        action.priority === "urgent"
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          : action.priority === "high"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {getPriorityLabel(action.priority)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            아직 우선순위가 잡힌 액션이 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
