"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";

import { DashboardCalendar } from "./overview/dashboard-calendar";

interface ScheduleViewProps {
  projectId: string;
}

type BoardTask = {
  id: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  category?: string | null;
  priority?: string | null;
};

type BoardData = {
  tasks?: BoardTask[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ScheduleView({ projectId }: ScheduleViewProps) {
  const { data: boardData, isLoading } = useSWR<BoardData>(
    `/api/workspaces/${projectId}/board`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">일정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          개요와 동일한 월간 화면에서 작업 일정을 확인하고 날짜를 조정할 수
          있습니다.
        </p>
      </div>
      <div className="min-h-0 flex-1 rounded-2xl border bg-background p-2 shadow-sm sm:p-4">
        <DashboardCalendar
          projectId={projectId}
          tasks={boardData?.tasks ?? []}
        />
      </div>
    </div>
  );
}
