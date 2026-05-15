"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  KIND_COLOR,
  KIND_LABEL,
} from "@/lib/job-postings/visual-tokens";
import type { CalendarEvent } from "@/components/features/job-postings/job-posting-calendar";

const FMT = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

function dDay(start: string): { label: string; days: number; tone: string } {
  const days = Math.ceil((new Date(start).getTime() - Date.now()) / 86400000);
  if (days < 0)
    return { label: `D+${Math.abs(days)}`, days, tone: "text-muted-foreground/60" };
  if (days === 0) return { label: "D-Day", days, tone: "text-red-600 font-bold" };
  if (days <= 3) return { label: `D-${days}`, days, tone: "text-red-600 font-semibold" };
  if (days <= 7) return { label: `D-${days}`, days, tone: "text-orange-600 font-semibold" };
  return { label: `D-${days}`, days, tone: "text-foreground/80" };
}

interface UpcomingSchedulePanelProps {
  events: CalendarEvent[];
  /** 며칠 앞까지 노출. 기본 14일 */
  daysAhead?: number;
  /** 최대 개수. 기본 8 */
  limit?: number;
}

/**
 * 사이드바 하단의 「다가오는 일정」 패널.
 * 캘린더 events 를 기반으로 오늘부터 N일 안의 일정을 D-day 정렬로 노출.
 * 클릭 시 해당 공고 상세로 이동.
 */
export function UpcomingSchedulePanel({
  events,
  daysAhead = 14,
  limit = 8,
}: UpcomingSchedulePanelProps) {
  const now = Date.now();
  const horizon = now + daysAhead * 86400000;
  const upcoming = events
    .filter((e) => {
      const t = new Date(e.start).getTime();
      return t >= now - 86400000 && t <= horizon; // 오늘 자정 이후 + horizon 안
    })
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    .slice(0, limit);

  return (
    <section className="mt-4 rounded-md border border-border/50 bg-background/40 p-3">
      <header className="mb-2 flex items-center gap-1.5">
        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          다가오는 일정
        </h3>
      </header>
      {upcoming.length === 0 ? (
        <p className="text-[11px] leading-snug text-muted-foreground/70">
          {daysAhead}일 안에 예정된 일정이 없어요.
        </p>
      ) : (
        <ul className="space-y-1">
          {upcoming.map((ev) => {
            const d = dDay(ev.start);
            return (
              <li key={ev.id}>
                <Link
                  href={`/my/job-postings/${ev.jobPostingId}`}
                  className="flex items-baseline gap-2 rounded-sm px-1.5 py-1 text-xs transition-colors hover:bg-foreground/[0.04]"
                >
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: KIND_COLOR[ev.kind] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground/80">
                    {ev.title}
                  </span>
                  <span className={cn("tabular-nums", d.tone)}>{d.label}</span>
                </Link>
                <p className="ml-3 truncate pl-1.5 text-[10px] text-muted-foreground/70">
                  {FMT.format(new Date(ev.start))} ·{" "}
                  {KIND_LABEL[ev.kind] ?? "일정"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
