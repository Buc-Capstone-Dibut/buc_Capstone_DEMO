"use client";

import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
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
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task } from "../../store/mock-data";
import {
  TimelineBody,
  type TimelineCell,
  type TimelineColumn,
  type TimelineGroupBy,
  type TimelineScale,
} from "./timeline-body";

type ScheduleFilter = "all" | "scheduled" | "unscheduled";

interface TimelineViewProps {
  tasks: Task[];
  groupBy: TimelineGroupBy;
  groupColumns: TimelineColumn[];
  statusColumns: TimelineColumn[];
  onTaskClick: (taskId: string) => void;
  onUpdateTask: (
    taskId: string,
    updates: Partial<Task>,
  ) => Promise<void> | void;
  readOnly?: boolean;
  allGroupsCollapsed?: boolean;
}

type TimelineSegment = {
  key: string;
  start: Date;
  end: Date;
  label: string;
};

type TaskPanelResizeInteraction = {
  pointerId: number;
  originClientX: number;
  originWidth: number;
};

const DEFAULT_TASK_PANEL_WIDTH = 288;
const MIN_TASK_PANEL_WIDTH = 220;
const MAX_TASK_PANEL_WIDTH = 480;

const SCALE_OPTIONS: Array<{ value: TimelineScale; label: string }> = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];

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

function clampTaskPanelWidth(width: number) {
  return Math.min(
    MAX_TASK_PANEL_WIDTH,
    Math.max(MIN_TASK_PANEL_WIDTH, Math.round(width)),
  );
}

export function TimelineView({
  tasks,
  groupBy,
  groupColumns,
  statusColumns,
  onTaskClick,
  onUpdateTask,
  readOnly = false,
  allGroupsCollapsed,
}: TimelineViewProps) {
  const [scale, setScale] = useState<TimelineScale>("day");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const timelineAnimation = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const [taskPanelWidth, setTaskPanelWidth] = useState(
    DEFAULT_TASK_PANEL_WIDTH,
  );
  const taskPanelResizeRef = useRef<TaskPanelResizeInteraction | null>(null);
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
  const { scheduledTasks, unscheduledTasks } = useMemo(
    () =>
      tasks.reduce(
        (result, task) => {
          if (task.startDate || task.endDate) {
            result.scheduledTasks.push(task);
          } else {
            result.unscheduledTasks.push(task);
          }
          return result;
        },
        {
          scheduledTasks: [] as Task[],
          unscheduledTasks: [] as Task[],
        },
      ),
    [tasks],
  );
  const scheduledCount = scheduledTasks.length;
  const unscheduledCount = unscheduledTasks.length;
  const displayedTasks =
    scheduleFilter === "scheduled"
      ? scheduledTasks
      : scheduleFilter === "unscheduled"
        ? unscheduledTasks
        : tasks;

  const animateRangeChange = (
    direction: -1 | 1,
    updateAnchorDate: () => void,
  ) => {
    if (!reduceMotion) {
      timelineAnimation.stop();
      timelineAnimation.set({ x: direction * 28, opacity: 0.72 });
    }

    updateAnchorDate();

    if (!reduceMotion) {
      void timelineAnimation.start({
        x: 0,
        opacity: 1,
        transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
      });
    }
  };

  const moveRange = (direction: -1 | 1) => {
    animateRangeChange(direction, () =>
      setAnchorDate((current) => {
      if (scale === "day") return addDays(current, direction * 14);
      if (scale === "week") return addWeeks(current, direction * 6);
      return addMonths(current, direction * 3);
      }),
    );
  };

  const moveToToday = () => {
    const nextAnchorDate = startOfDay(new Date());
    const dayDifference = differenceInCalendarDays(nextAnchorDate, anchorDate);
    if (dayDifference === 0) return;
    animateRangeChange(dayDifference > 0 ? 1 : -1, () =>
      setAnchorDate(nextAnchorDate),
    );
  };

  const rangeStepLabel =
    scale === "day" ? "2주" : scale === "week" ? "6주" : "3개월";

  const beginTaskPanelResize = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    taskPanelResizeRef.current = {
      pointerId: event.pointerId,
      originClientX: event.clientX,
      originWidth: taskPanelWidth,
    };
  };

  const continueTaskPanelResize = (event: PointerEvent<HTMLButtonElement>) => {
    const interaction = taskPanelResizeRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    setTaskPanelWidth(
      clampTaskPanelWidth(
        interaction.originWidth + event.clientX - interaction.originClientX,
      ),
    );
  };

  const finishTaskPanelResize = (event: PointerEvent<HTMLButtonElement>) => {
    const interaction = taskPanelResizeRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    taskPanelResizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleTaskPanelResizeKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key === "Home") {
      event.preventDefault();
      setTaskPanelWidth(DEFAULT_TASK_PANEL_WIDTH);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    setTaskPanelWidth((current) =>
      clampTaskPanelWidth(current + direction * 16),
    );
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
            aria-label={`이전 ${rangeStepLabel}`}
            title={`이전 ${rangeStepLabel}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={moveToToday}
          >
            오늘
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => moveRange(1)}
            aria-label={`다음 ${rangeStepLabel}`}
            title={`다음 ${rangeStepLabel}`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-0.5 rounded-md bg-muted/50 p-0.5">
          {[
            { value: "all", label: "전체", count: tasks.length },
            {
              value: "scheduled",
              label: "기간 설정",
              count: scheduledCount,
            },
            {
              value: "unscheduled",
              label: "미정",
              count: unscheduledCount,
            },
          ].map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={scheduleFilter === option.value ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2 text-[11px]"
              onClick={() => setScheduleFilter(option.value as ScheduleFilter)}
              aria-pressed={scheduleFilter === option.value}
            >
              {option.value === "scheduled" ? (
                <CalendarRange className="h-3.5 w-3.5" />
              ) : null}
              {option.label}
              <span className="text-[10px] text-muted-foreground">
                {option.count}
              </span>
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative min-w-max"
          style={{ width: taskPanelWidth + timelineWidth }}
        >
          <div className="sticky top-0 z-30 flex h-[70px] border-b bg-background">
            <div
              className="sticky left-0 z-40 flex shrink-0 items-end border-r bg-background px-4 pb-2"
              style={{ width: taskPanelWidth }}
            >
              <div>
                <div className="text-xs font-semibold text-foreground">
                  작업
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {displayedTasks.length}개
                </div>
              </div>
              <button
                type="button"
                className="group/resizer absolute inset-y-0 -right-1 z-50 w-2 touch-none cursor-col-resize select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                aria-label="작업 패널 너비 조절"
                title="드래그하여 너비 조절 · 더블클릭하여 초기화"
                onPointerDown={beginTaskPanelResize}
                onPointerMove={continueTaskPanelResize}
                onPointerUp={finishTaskPanelResize}
                onPointerCancel={finishTaskPanelResize}
                onDoubleClick={() =>
                  setTaskPanelWidth(DEFAULT_TASK_PANEL_WIDTH)
                }
                onKeyDown={handleTaskPanelResizeKeyDown}
              >
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover/resizer:bg-primary/60 group-focus-visible/resizer:bg-primary/60" />
              </button>
            </div>

            <motion.div
              animate={timelineAnimation}
              className="relative shrink-0 bg-muted/[0.12]"
              style={{ width: timelineWidth }}
            >
              <div className="flex h-8 border-b">
                {headerSegments.map((segment) => {
                  const width =
                    differenceInCalendarDays(segment.end, segment.start) *
                    range.pixelsPerDay;
                  const visibleLabel =
                    scale !== "month" && width < 72
                      ? format(segment.start, "M월", { locale: ko })
                      : segment.label;
                  return (
                    <div
                      key={segment.key}
                      className="flex min-w-0 shrink-0 items-center justify-center overflow-hidden border-r px-1 text-[11px] font-semibold text-foreground"
                      style={{ width }}
                      title={segment.label}
                    >
                      <span className="block min-w-0 truncate whitespace-nowrap">
                        {visibleLabel}
                      </span>
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
            </motion.div>
          </div>

          <TimelineBody
            tasks={displayedTasks}
            groupBy={groupBy}
            groupColumns={groupColumns}
            statusColumns={statusColumns}
            cells={cells}
            rangeStart={range.start}
            rangeEnd={range.end}
            pixelsPerDay={range.pixelsPerDay}
            timelineWidth={timelineWidth}
            taskPanelWidth={taskPanelWidth}
            scale={scale}
            today={today}
            onTaskClick={onTaskClick}
            onUpdateTask={onUpdateTask}
            readOnly={readOnly}
            allGroupsCollapsed={allGroupsCollapsed}
            timelineAnimation={timelineAnimation}
          />
        </div>
      </div>
    </div>
  );
}
