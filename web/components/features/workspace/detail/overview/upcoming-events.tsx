"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRight } from "lucide-react";
import { parseISO, format, isValid, differenceInCalendarDays } from "date-fns";

type UpcomingTask = {
  id: string;
  title: string;
  dueDate?: string | Date | null;
  status?: string | null;
  assignee?: unknown;
};

interface UpcomingEventsProps {
  projectId: string;
  tasks?: UpcomingTask[];
}

export function UpcomingEvents({ projectId, tasks = [] }: UpcomingEventsProps) {
  const toDate = (value: unknown) => {
    if (!value) return null;
    if (value instanceof Date) return isValid(value) ? value : null;
    if (typeof value === "string") {
      const parsed = parseISO(value);
      return isValid(parsed) ? parsed : null;
    }

    return null;
  };

  const upcomingTasks = tasks
    .filter((t) => {
      if (!t.dueDate) return false;
      // Check if done
      if (
        t.status === "done" ||
        t.status === "completed" ||
        t.status === "finished"
      )
        return false;
      return true;
    })
    .sort(
      (a, b) =>
        (toDate(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY) -
        (toDate(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY),
    )
    .slice(0, 5);

  const safeFormat = (dateInput: unknown, formatStr: string) => {
    try {
      if (!dateInput) return "";
      const date = toDate(dateInput);
      if (!date) return "";
      if (!isValid(date)) return "";
      return format(date, formatStr);
    } catch {
      return "";
    }
  };

  const getAssigneeName = (assignee: unknown) => {
    if (!assignee) return null;
    if (typeof assignee === "string") return assignee;
    if (typeof assignee === "object" && assignee && "name" in assignee) {
      return String((assignee as { name?: unknown }).name || "");
    }
    return null;
  };

  const getDeadlineLabel = (dueDate: unknown) => {
    try {
      const parsed = toDate(dueDate);
      if (!parsed) return null;
      if (!isValid(parsed)) return null;
      const diff = differenceInCalendarDays(parsed, new Date());
      if (diff < 0) return "지연";
      if (diff === 0) return "오늘";
      if (diff === 1) return "D-1";
      return `D-${diff}`;
    } catch {
      return null;
    }
  };

  return (
    <Card className="h-full flex flex-col border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-0 pt-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">
            예정된 일정
          </CardTitle>
          <CardDescription>곧 마감되는 작업입니다</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
          <Link href={`/workspace/${projectId}?tab=schedule`}>
            일정 보기 <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 px-0 overflow-y-auto">
        {upcomingTasks.length > 0 ? (
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border"
              >
                <div className="flex flex-col items-center justify-center min-w-[3.5rem] p-2 bg-background rounded-lg border shadow-sm">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    {safeFormat(task.dueDate, "MMM")}
                  </span>
                  <span className="text-xl font-bold leading-none mt-0.5">
                    {safeFormat(task.dueDate, "d")}
                  </span>
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-sm truncate">
                      {task.title}
                    </div>
                    {getDeadlineLabel(task.dueDate) && (
                      <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground border">
                        {getDeadlineLabel(task.dueDate)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    {getAssigneeName(task.assignee) && (
                      <div className="flex items-center gap-1.5 bg-background px-1.5 py-0.5 rounded-md border">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span>{getAssigneeName(task.assignee)}</span>
                      </div>
                    )}
                    {!getAssigneeName(task.assignee) && <span>담당자 없음</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10 min-h-[200px] border-2 border-dashed rounded-xl bg-muted/20">
            <CalendarDays className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">예정된 일정이 없습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
