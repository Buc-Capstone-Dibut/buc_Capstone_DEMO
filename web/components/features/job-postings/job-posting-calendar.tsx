"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";
import { KIND_COLOR, KIND_GRADIENT } from "@/lib/job-postings/visual-tokens";

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
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end ?? undefined,
        backgroundColor: KIND_COLOR[e.kind],
        borderColor: KIND_COLOR[e.kind],
        extendedProps: e,
      })),
    [events],
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
        // 3D-look: 단색 backgroundColor 위에 그라데이션을 덧입혀 광택 표현
        eventDidMount={(info) => {
          const kind = (info.event.extendedProps as CalendarEvent).kind;
          const gradient = KIND_GRADIENT[kind];
          if (gradient) {
            info.el.style.background = gradient;
            info.el.style.borderColor = "rgba(0,0,0,0.05)";
            info.el.style.boxShadow =
              "0 4px 8px -3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.4)";
          }
        }}
      />
    </div>
  );
}
