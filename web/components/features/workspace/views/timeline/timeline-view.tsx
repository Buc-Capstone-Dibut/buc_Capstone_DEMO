"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfYear,
  format,
  isValid,
  max,
  min,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarRange, ChevronLeft, ChevronRight, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task } from "../../store/mock-data";

type TimelineScale = "day" | "week" | "month";

type TimelineColumn = {
  id: string;
  title: string;
  category?: string;
};

interface TimelineViewProps {
  tasks: Task[];
  columns: TimelineColumn[];
  onTaskClick: (taskId: string) => void;
}

type TimelineCell = {
  key: string;
  start: Date;
  end: Date;
  label: string;
  sublabel?: string;
};

type TimelineSegment = {
  key: string;
  start: Date;
  end: Date;
  label: string;
};

const SCALE_OPTIONS: Array<{ value: TimelineScale; label: string }> = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];

const STATUS_STYLES: Record<
  string,
  { dot: string; bar: string; barText: string }
> = {
  todo: {
    dot: "text-slate-400",
    bar: "border-slate-300 bg-slate-100",
    barText: "text-slate-700",
  },
  "in-progress": {
    dot: "text-blue-500",
    bar: "border-blue-300 bg-blue-100",
    barText: "text-blue-800",
  },
  done: {
    dot: "text-emerald-500",
    bar: "border-emerald-300 bg-emerald-100",
    barText: "text-emerald-800",
  },
};

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? startOfDay(parsed) : null;
}

function getTimelineRange(scale: TimelineScale, anchorDate: Date) {
  if (scale === "day") {
    const start = subDays(startOfDay(anchorDate), 14);
    return {
      start,
      end: addDays(start, 42),
      pixelsPerDay: 44,
    };
  }

  if (scale === "week") {
    const start = startOfWeek(subWeeks(anchorDate, 8), { weekStartsOn: 1 });
    return {
      start,
      end: addWeeks(start, 16),
      pixelsPerDay: 12,
    };
  }

  const start = startOfMonth(subMonths(anchorDate, 4));
  return {
    start,
    end: addMonths(start, 12),
    pixelsPerDay: 4,
  };
}

function buildTimelineCells(
  scale: TimelineScale,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const cells: TimelineCell[] = [];
  let cursor = rangeStart;

  while (cursor < rangeEnd) {
    if (scale === "day") {
      const next = addDays(cursor, 1);
      cells.push({
        key: format(cursor, "yyyy-MM-dd"),
        start: cursor,
        end: next,
        label: format(cursor, "d"),
        sublabel: format(cursor, "EEE", { locale: ko }),
      });
      cursor = next;
      continue;
    }

    if (scale === "week") {
      const next = min([addWeeks(cursor, 1), rangeEnd]);
      cells.push({
        key: format(cursor, "yyyy-'W'II"),
        start: cursor,
        end: next,
        label: `${format(cursor, "M/d")}–${format(addDays(next, -1), "M/d")}`,
        sublabel: `${format(cursor, "I")}주`,
      });
      cursor = next;
      continue;
    }

    const next = min([addMonths(cursor, 1), rangeEnd]);
    cells.push({
      key: format(cursor, "yyyy-MM"),
      start: cursor,
      end: next,
      label: format(cursor, "M월", { locale: ko }),
      sublabel: format(cursor, "yyyy"),
    });
    cursor = next;
  }

  return cells;
}

function buildHeaderSegments(
  scale: TimelineScale,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const segments: TimelineSegment[] = [];
  let cursor =
    scale === "month" ? startOfYear(rangeStart) : startOfMonth(rangeStart);

  while (cursor < rangeEnd) {
    const periodEnd =
      scale === "month"
        ? addDays(endOfYear(cursor), 1)
        : addDays(endOfMonth(cursor), 1);
    const segmentStart = max([cursor, rangeStart]);
    const segmentEnd = min([periodEnd, rangeEnd]);

    if (segmentStart < segmentEnd) {
      segments.push({
        key:
          scale === "month"
            ? format(cursor, "yyyy")
            : format(cursor, "yyyy-MM"),
        start: segmentStart,
        end: segmentEnd,
        label:
          scale === "month"
            ? format(cursor, "yyyy년", { locale: ko })
            : format(cursor, "yyyy년 M월", { locale: ko }),
      });
    }

    cursor =
      scale === "month"
        ? startOfYear(addMonths(cursor, 12))
        : startOfMonth(addMonths(cursor, 1));
  }

  return segments;
}

export function TimelineView({
  tasks,
  columns,
  onTaskClick,
}: TimelineViewProps) {
  const [scale, setScale] = useState<TimelineScale>("day");
  const [anchorDate, setAnchorDate] = useState(() => {
    const today = startOfDay(new Date());
    const scheduledDates = tasks
      .flatMap((task) => [
        parseDateOnly(task.startDate),
        parseDateOnly(task.endDate),
      ])
      .filter((date): date is Date => Boolean(date));

    if (scheduledDates.length === 0) return today;

    return scheduledDates.reduce((closest, candidate) =>
      Math.abs(differenceInCalendarDays(candidate, today)) <
      Math.abs(differenceInCalendarDays(closest, today))
        ? candidate
        : closest,
    );
  });

  const columnById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  );
  const range = useMemo(
    () => getTimelineRange(scale, anchorDate),
    [anchorDate, scale],
  );
  const cells = useMemo(
    () => buildTimelineCells(scale, range.start, range.end),
    [range.end, range.start, scale],
  );
  const headerSegments = useMemo(
    () => buildHeaderSegments(scale, range.start, range.end),
    [range.end, range.start, scale],
  );

  const totalDays = differenceInCalendarDays(range.end, range.start);
  const timelineWidth = totalDays * range.pixelsPerDay;
  const today = startOfDay(new Date());
  const todayOffset = differenceInCalendarDays(today, range.start);
  const showTodayLine = todayOffset >= 0 && todayOffset < totalDays;
  const scheduledCount = tasks.filter(
    (task) => task.startDate || task.endDate,
  ).length;

  const moveRange = (direction: -1 | 1) => {
    setAnchorDate((current) => {
      if (scale === "day") return addDays(current, direction * 14);
      if (scale === "week") return addWeeks(current, direction * 6);
      return addMonths(current, direction * 3);
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b px-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
          {SCALE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={scale === option.value ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setScale(option.value)}
              aria-pressed={scale === option.value}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => moveRange(-1)}
            aria-label="이전 기간"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setAnchorDate(startOfDay(new Date()))}
          >
            오늘
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => moveRange(1)}
            aria-label="다음 기간"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CalendarRange className="h-3.5 w-3.5" />
          <span>기간 설정 {scheduledCount}</span>
          <span className="text-border">·</span>
          <span>미정 {tasks.length - scheduledCount}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative min-w-max"
          style={{ width: 288 + timelineWidth }}
        >
          <div className="sticky top-0 z-30 flex h-[70px] border-b bg-background">
            <div className="sticky left-0 z-40 flex w-72 shrink-0 items-end border-r bg-background px-4 pb-2">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  작업
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {tasks.length}개
                </div>
              </div>
            </div>

            <div
              className="relative shrink-0 bg-muted/[0.12]"
              style={{ width: timelineWidth }}
            >
              <div className="flex h-8 border-b">
                {headerSegments.map((segment) => {
                  const width =
                    differenceInCalendarDays(segment.end, segment.start) *
                    range.pixelsPerDay;
                  return (
                    <div
                      key={segment.key}
                      className="flex shrink-0 items-center justify-center border-r px-2 text-[11px] font-semibold text-foreground"
                      style={{ width }}
                    >
                      {segment.label}
                    </div>
                  );
                })}
              </div>
              <div className="flex h-[38px]">
                {cells.map((cell) => {
                  const width =
                    differenceInCalendarDays(cell.end, cell.start) *
                    range.pixelsPerDay;
                  const isToday = today >= cell.start && today < cell.end;
                  return (
                    <div
                      key={cell.key}
                      className={cn(
                        "flex shrink-0 items-center justify-center border-r text-center",
                        isToday && "bg-blue-50",
                      )}
                      style={{ width }}
                    >
                      <div className="min-w-0">
                        <div
                          className={cn(
                            "truncate text-[10px] font-medium text-foreground",
                            isToday && "text-blue-700",
                          )}
                        >
                          {cell.label}
                        </div>
                        {cell.sublabel ? (
                          <div className="truncate text-[9px] text-muted-foreground">
                            {cell.sublabel}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              표시할 작업이 없습니다.
            </div>
          ) : (
            tasks.map((task) => {
              const column = task.columnId
                ? columnById.get(task.columnId)
                : undefined;
              const category = column?.category || "todo";
              const statusStyle = STATUS_STYLES[category] || STATUS_STYLES.todo;
              const taskStart = parseDateOnly(task.startDate || task.endDate);
              const taskEnd = parseDateOnly(task.endDate || task.startDate);
              const hasVisibleRange = Boolean(
                taskStart &&
                taskEnd &&
                taskEnd >= range.start &&
                taskStart < range.end,
              );

              let barLeft = 0;
              let barWidth = 0;
              if (hasVisibleRange && taskStart && taskEnd) {
                const clippedStart = max([taskStart, range.start]);
                const clippedEnd = min([addDays(taskEnd, 1), range.end]);
                barLeft =
                  differenceInCalendarDays(clippedStart, range.start) *
                  range.pixelsPerDay;
                barWidth = Math.max(
                  range.pixelsPerDay * 0.72,
                  differenceInCalendarDays(clippedEnd, clippedStart) *
                    range.pixelsPerDay,
                );
              }

              return (
                <div
                  key={task.id}
                  className="group flex h-12 border-b bg-background hover:bg-muted/20"
                >
                  <button
                    type="button"
                    className="sticky left-0 z-20 flex w-72 shrink-0 items-center gap-2 border-r bg-background px-4 text-left group-hover:bg-muted/20"
                    onClick={() => onTaskClick(task.id)}
                  >
                    <Circle
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 fill-current",
                        statusStyle.dot,
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {task.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {column?.title || "미분류"}
                    </span>
                  </button>

                  <div
                    className="relative shrink-0"
                    style={{ width: timelineWidth }}
                  >
                    {cells.map((cell) => {
                      const left =
                        differenceInCalendarDays(cell.start, range.start) *
                        range.pixelsPerDay;
                      return (
                        <div
                          key={cell.key}
                          className="pointer-events-none absolute inset-y-0 border-r"
                          style={{
                            left,
                            width:
                              differenceInCalendarDays(cell.end, cell.start) *
                              range.pixelsPerDay,
                          }}
                        />
                      );
                    })}

                    {showTodayLine ? (
                      <div
                        className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-blue-500/70"
                        style={{
                          left:
                            todayOffset * range.pixelsPerDay +
                            range.pixelsPerDay / 2,
                        }}
                      />
                    ) : null}

                    {hasVisibleRange ? (
                      <button
                        type="button"
                        className={cn(
                          "absolute top-2.5 z-20 h-7 overflow-hidden rounded-md border px-2 text-left text-[10px] font-medium shadow-sm transition hover:brightness-95",
                          statusStyle.bar,
                          statusStyle.barText,
                        )}
                        style={{ left: barLeft, width: barWidth }}
                        onClick={() => onTaskClick(task.id)}
                        title={`${task.title} · ${task.startDate || "미정"} → ${
                          task.endDate || "미정"
                        }`}
                      >
                        <span className="block truncate">{task.title}</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
