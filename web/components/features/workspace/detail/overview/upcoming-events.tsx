"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRight } from "lucide-react";
import { parseISO, format, isValid, startOfToday } from "date-fns";

interface UpcomingEventsProps {
  projectId: string;
  tasks?: any[];
}

export function UpcomingEvents({ projectId, tasks = [] }: UpcomingEventsProps) {
  // Filter tasks with future due dates
  const today = startOfToday();
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
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
    .slice(0, 5);

  const safeFormat = (dateInput: any, formatStr: string) => {
    try {
      if (!dateInput) return "";
      const date =
        typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
      if (!isValid(date)) return "";
      return format(date, formatStr);
    } catch (e) {
      return "";
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
        {/* 
         <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View Calendar <ArrowRight className="h-3 w-3" />
         </Button>
         */}
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
                  <div className="font-medium text-sm truncate">
                    {task.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    {task.assignee && (
                      <div className="flex items-center gap-1.5 bg-background px-1.5 py-0.5 rounded-md border">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span>{task.assignee.name || "Assigned"}</span>
                      </div>
                    )}
                    {!task.assignee && <span>담당자 없음</span>}
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
