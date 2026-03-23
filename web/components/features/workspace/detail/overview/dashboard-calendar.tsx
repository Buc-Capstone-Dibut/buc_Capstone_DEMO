"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import { AdvancedTaskModal } from "../board/advanced-task-modal";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";

type CalendarTask = {
  id: string;
  title: string;
  dueDate?: string | null;
  status?: string | null;
  category?: string | null;
  priority?: string | null;
  assignee?: unknown;
};

interface DashboardCalendarProps {
  projectId: string;
  tasks?: CalendarTask[];
}

type BoardMetaResponse = {
  workspace?: {
    readOnly?: boolean;
  };
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DashboardCalendar({
  projectId,
  tasks = [],
}: DashboardCalendarProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const { mutate } = useSWRConfig();
  const { data: boardMeta } = useSWR<BoardMetaResponse>(
    `/api/workspaces/${projectId}/board`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  );
  const isReadOnly = Boolean(boardMeta?.workspace?.readOnly);

  // Helper for status color (based on stable API category)
  const getStatusColor = (category: string) => {
    switch (category) {
      case "done":
        return "hsl(142.1 76.2% 36.3%)"; // Green
      case "in-progress":
        return "hsl(217.2 91.2% 59.8%)"; // Blue
      default:
        return "hsl(220 8.9% 46.1%)"; // Gray (todo)
    }
  };

  const events: EventInput[] = tasks
    .filter((t) => t.dueDate)
    .map((t) => ({
      id: t.id,
      title: t.title,
      start: String(t.dueDate), // FullCalendar prefers 'start'
      backgroundColor: "transparent",
      borderColor: "transparent",
      extendedProps: {
        status: t.status,
        category: t.category || "todo", // Stable category from API
        priority: t.priority,
        assignee: t.assignee,
      },
    }));

  const handleEventClick = (info: EventClickArg) => {
    setEditingTaskId(info.event.id);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const { event } = info;
    const newDate = event.start;

    if (isReadOnly) {
      info.revert();
      return;
    }

    try {
      const res = await fetch(`/api/workspaces/${projectId}/board/tasks/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDate }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success(`Rescheduled "${event.title}"`);
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to reschedule task");
      info.revert();
    }
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    const props = eventInfo.event.extendedProps;
    const color = getStatusColor(props.category);
    const isUrgent = props.priority === "urgent" || props.priority === "high";

    return (
      <div
        className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded-sm border-l-[3px] shadow-sm bg-card/90 hover:bg-accent/50 transition-all cursor-pointer overflow-hidden"
        style={{ borderLeftColor: color }}
      >
        {isUrgent && (
          <span className="text-[10px] leading-none shrink-0 text-red-500">
            !!
          </span>
        )}
        <span className="truncate text-xs font-medium text-foreground leading-tight">
          {eventInfo.event.title}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {isReadOnly && (
        <div className="mb-3 rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          종료된 팀 공간이라 일정 이동은 잠겨 있습니다.
        </div>
      )}
      <Card className="flex-1 p-4 shadow-none border-none bg-transparent overflow-visible">
        <div className="w-full calendar-wrapper-dashboard">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            displayEventTime={false}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,dayGridWeek",
            }}
            height="auto"
            dayMaxEvents={3}
            fixedWeekCount={false}
            editable={!isReadOnly}
            eventDrop={handleEventDrop}
            droppable={!isReadOnly}
          />
        </div>
        {events.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed bg-muted/20 px-4 py-5 text-center text-sm text-muted-foreground">
            아직 마감일이 잡힌 작업이 없습니다. 보드에서 작업에 마감일을 지정하면 여기에 일정이 표시됩니다.
          </div>
        )}
      </Card>

      <AdvancedTaskModal
        taskId={editingTaskId}
        projectId={projectId}
        open={!!editingTaskId}
        onOpenChange={(open) => !open && setEditingTaskId(null)}
      />

      <style jsx global>{`
        .calendar-wrapper-dashboard .fc {
          --fc-border-color: hsl(var(--border) / 0.5);
          --fc-button-text-color: hsl(var(--foreground));
          --fc-button-bg-color: transparent;
          --fc-button-border-color: hsl(var(--border));
          --fc-button-hover-bg-color: hsl(var(--muted));
          --fc-button-hover-border-color: hsl(var(--border));
          --fc-button-active-bg-color: hsl(var(--primary) / 0.1);
          --fc-button-active-border-color: hsl(var(--primary));
          --fc-today-bg-color: hsl(var(--accent) / 0.3);
          --fc-page-bg-color: transparent;
        }
        .calendar-wrapper-dashboard .fc-toolbar-title {
          font-size: 1rem !important;
          font-weight: 600;
        }
        .calendar-wrapper-dashboard .fc-col-header-cell {
          padding: 8px 0;
          background-color: transparent;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: hsl(var(--muted-foreground));
        }
        .calendar-wrapper-dashboard .fc-daygrid-day-number {
          font-size: 0.75rem;
          padding: 4px 8px;
          color: hsl(var(--muted-foreground));
        }
        .calendar-wrapper-dashboard .fc-daygrid-event {
          background: transparent;
          border: none;
          margin-top: 2px;
        }
        .calendar-wrapper-dashboard .fc-day-today .fc-daygrid-day-number {
          font-weight: bold;
          color: hsl(var(--primary));
        }
      `}</style>
    </div>
  );
}
