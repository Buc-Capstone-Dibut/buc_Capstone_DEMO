"use client";

import useSWR from "swr";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AdvancedTaskModal } from "./board/advanced-task-modal";

interface ScheduleViewProps {
  projectId: string;
  onNavigateToDoc?: (docId: string) => void;
}

type BoardTask = {
  id: string;
  title: string;
  dueDate?: string | null;
  status?: string;
};

type BoardData = {
  tasks?: BoardTask[];
  workspace?: {
    readOnly?: boolean;
  };
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ScheduleView({ projectId, onNavigateToDoc }: ScheduleViewProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const { data: boardData, isLoading } = useSWR<BoardData>(
    `/api/workspaces/${projectId}/board`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  );
  const tasks = boardData?.tasks || [];
  const isReadOnly = Boolean(boardData?.workspace?.readOnly);

  const events = tasks.flatMap((task) => {
    if (!task.dueDate) return [];

    return [
      {
        id: task.id,
        title: task.title,
        date: task.dueDate,
        backgroundColor:
          task.status === "done"
            ? "#10b981"
            : task.status === "in-progress"
              ? "#3b82f6"
              : "#6b7280",
        borderColor: "transparent",
        extendedProps: { status: task.status },
      },
    ];
  });

  const handleEventClick = (info: { event: { id: string } }) => {
    setEditingTaskId(info.event.id);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full p-6 flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Schedule</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            마감일이 지정된 작업을 달력으로 확인합니다.
          </p>
        </div>
      </div>

      {isReadOnly && (
        <div className="mb-4 rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          종료된 팀 공간이라 일정은 읽기 전용으로 보입니다.
        </div>
      )}

      <Card className="flex-1 p-4 shadow-sm border-none bg-background h-full overflow-hidden">
        <div className="h-full w-full calendar-wrapper">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            eventClick={handleEventClick}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,dayGridWeek",
            }}
            height="100%"
            dayMaxEvents={true}
          />
        </div>
        {events.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            아직 마감일이 지정된 작업이 없습니다.
          </div>
        )}
      </Card>

      <AdvancedTaskModal
        taskId={editingTaskId}
        projectId={projectId}
        onNavigateToDoc={onNavigateToDoc}
        open={!!editingTaskId}
        onOpenChange={(open) => !open && setEditingTaskId(null)}
      />

      <style jsx global>{`
        .calendar-wrapper .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 700;
        }
        .calendar-wrapper .fc-button {
          background-color: transparent;
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          box-shadow: none;
        }
        .calendar-wrapper .fc-button:hover {
          background-color: hsl(var(--muted));
          color: hsl(var(--foreground));
        }
        .calendar-wrapper .fc-button-primary:not(:disabled).fc-button-active {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
      `}</style>
    </div>
  );
}
