"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";
import { KIND_COLOR, KIND_TONE } from "@/lib/job-postings/visual-tokens";
import { cn } from "@/lib/utils";

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
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n}`}
        eventContent={(arg) => {
          const ev = arg.event.extendedProps as CalendarEvent;
          const tone = KIND_TONE[ev.kind] ?? KIND_TONE.other;
          return (
            <div
              className={cn(
                "flex w-full items-center gap-1 truncate rounded-md px-1.5 py-[2px] text-[11px] font-medium leading-tight",
                tone,
              )}
            >
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: KIND_COLOR[ev.kind] }}
              />
              <span className="truncate">{arg.event.title}</span>
            </div>
          );
        }}
      />
    </div>
  );
}
