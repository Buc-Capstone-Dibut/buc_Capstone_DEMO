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

// 마감일은 한국 시간(KST) 기준의 '날짜'다. UTC 타임스탬프를 KST 날짜로 환산해
// all-day 이벤트로 렌더하면, 23:59(KST) 저장값이 자정을 넘겨 이틀로 보이는 문제를 막는다.
const KST_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toKstDateStr(iso: string): string {
  return KST_DATE_FMT.format(new Date(iso)); // "YYYY-MM-DD"
}

function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

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
      events.map((e) => {
        // 마감일 등은 'KST 그 날짜 하루'를 차지해야 한다. 마감은 23:59(KST)로 저장되는데,
        // 시간 있는 timed 이벤트라 FullCalendar 가 기본 1시간 지속을 붙여 자정을 넘기면서
        // 이틀에 걸쳐 보이던 문제가 있었다. KST 날짜 기준 all-day 이벤트로 렌더해 해결.
        const startDate = toKstDateStr(e.start);
        const endKst = e.end ? toKstDateStr(e.end) : null;
        // all-day 이벤트의 end 는 배타적 → 종료일 다음 날로 줘야 종료일까지 포함된다.
        const end = endKst && endKst !== startDate ? addDaysStr(endKst, 1) : undefined;
        return {
          id: e.id,
          title: e.title,
          start: startDate,
          end,
          allDay: true,
          extendedProps: e,
        };
      }),
    [events],
  );

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={koLocale}
        firstDay={1}
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
