"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";

export type CalendarEvent = {
  id: string;
  jobPostingId: string;
  title: string;
  start: string;
  end: string | null;
  kind: "deadline" | "document_due" | "interview" | "other";
  company: string;
  role: string;
};

const KIND_COLOR: Record<CalendarEvent["kind"], string> = {
  deadline: "#ef4444",
  document_due: "#3b82f6",
  interview: "#f97316",
  other: "#64748b",
};

export function JobPostingCalendar({
  events,
  onEventClick,
  onDateClick,
}: {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}) {
  const fcEvents = useMemo(
    () => events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end ?? undefined,
      backgroundColor: KIND_COLOR[e.kind],
      borderColor: KIND_COLOR[e.kind],
      extendedProps: e,
    })),
    [events]
  );

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={koLocale}
        firstDay={0}
        height="auto"
        headerToolbar={{ start: "prev,next today", center: "title", end: "" }}
        buttonText={{ today: "오늘" }}
        events={fcEvents}
        eventClick={(info) => {
          const ev = info.event.extendedProps as CalendarEvent;
          onEventClick?.(ev);
        }}
        dateClick={(info) => onDateClick?.(info.date)}
        eventDisplay="block"
      />
    </div>
  );
}
