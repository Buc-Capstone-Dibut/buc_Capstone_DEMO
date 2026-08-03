import Link from "next/link";
import { ArrowRight, Circle, ListTodo, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WorkspaceTask = {
  id: string;
  title: string;
  status?: string | null;
  category?: string | null;
  columnTitle?: string | null;
  endDate?: string | null;
  assignee?: string | null;
};

interface TeamPulseProps {
  tasks: WorkspaceTask[];
  projectId: string;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

export function TeamPulse({ tasks, projectId }: TeamPulseProps) {
  const visibleTasks = [...tasks]
    .filter((task) => task.category !== "done" && task.status !== "done")
    .sort((a, b) => {
      const aProgress =
        a.category === "in-progress" || a.status === "in-progress" ? 0 : 1;
      const bProgress =
        b.category === "in-progress" || b.status === "in-progress" ? 0 : 1;
      if (aProgress !== bProgress) return aProgress - bProgress;
      return (a.endDate || "9999-12-31").localeCompare(
        b.endDate || "9999-12-31",
      );
    })
    .slice(0, 6);

  return (
    <Card className="flex h-full min-h-[280px] max-h-[420px] flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 px-5 pb-3 pt-4">
        <CardTitle className="flex items-center justify-between text-lg font-semibold">
          <span className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            빠른 작업
          </span>
          <Badge variant="secondary" className="text-[11px] font-medium">
            바로 할 일 {visibleTasks.length}건
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleTasks.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {visibleTasks.map((task) => {
                const inProgress =
                  task.category === "in-progress" ||
                  task.status === "in-progress";
                const due = formatDate(task.endDate);
                return (
                  <Link
                    key={task.id}
                    href={`/workspace/${projectId}?tab=board&task=${task.id}`}
                    className="group flex items-center gap-2.5 px-5 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <Circle
                      className={
                        inProgress
                          ? "h-2.5 w-2.5 shrink-0 fill-blue-500 text-blue-500"
                          : "h-2.5 w-2.5 shrink-0 fill-slate-300 text-slate-300"
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {task.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <UserRound className="h-3 w-3 shrink-0" />
                        {task.assignee || "담당자 없음"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {due ||
                        (inProgress ? "진행 중" : task.columnTitle || "대기")}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              진행 중인 작업이 없습니다.
            </p>
          )}
        </div>
        <div className="border-t border-slate-100 p-3">
          <Link
            href={`/workspace/${projectId}?tab=board`}
            className="flex items-center justify-center gap-1 rounded-md bg-slate-50 py-2 text-xs font-medium text-primary hover:bg-slate-100 hover:underline"
          >
            작업 보드 열기 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
