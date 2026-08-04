"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  max,
  min,
  parseISO,
  startOfDay,
} from "date-fns";
import { ChevronDown, Circle } from "lucide-react";
import { motion } from "framer-motion";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  adjustTimelineDateRange,
  type TimelineDateRange,
  type TimelineInteractionMode,
} from "@/lib/workspace/timeline-range";
import type { Task } from "../../store/mock-data";

export type TimelineScale = "day" | "week" | "month";
export type TimelineGroupBy = "status" | "assignee" | "priority" | "tag";

export type TimelineColumn = {
  id: string;
  title: string;
  category?: string;
  color?: string;
  icon?: string;
};

export type TimelineCell = {
  key: string;
  start: Date;
  end: Date;
  label: string;
  sublabel?: string;
};

type TimelineBodyProps = {
  tasks: Task[];
  groupBy: TimelineGroupBy;
  groupColumns: TimelineColumn[];
  statusColumns: TimelineColumn[];
  cells: TimelineCell[];
  rangeStart: Date;
  rangeEnd: Date;
  pixelsPerDay: number;
  timelineWidth: number;
  taskPanelWidth: number;
  scale: TimelineScale;
  today: Date;
  onTaskClick: (taskId: string) => void;
  onUpdateTask: (
    taskId: string,
    updates: Partial<Task>,
  ) => Promise<void> | void;
  readOnly?: boolean;
  allGroupsCollapsed?: boolean;
  timelineAnimation: ReturnType<
    typeof import("framer-motion")["useAnimationControls"]
  >;
};

type TimelineGroup = {
  id: string;
  title: string;
  category?: string;
  color?: string;
  icon?: string;
  tasks: Task[];
};

type DateOverride = {
  startDate: string;
  endDate: string;
};

type TimelineInteraction = {
  pointerId: number;
  taskId: string;
  mode: TimelineInteractionMode;
  originClientX: number;
  initialStart: Date;
  initialEnd: Date;
  moved: boolean;
};

const STATUS_STYLES: Record<
  string,
  {
    bar: string;
    barText: string;
    accent: string;
    line: string;
    categoryLabel: string;
  }
> = {
  todo: {
    bar: "border-[#D6D5D2] bg-[#EDECE9]",
    barText: "text-[#37352F]",
    accent: "#787774",
    line: "#D6D5D2",
    categoryLabel: "할 일",
  },
  "in-progress": {
    bar: "border-[#BBDCE8] bg-[#E7F3F8]",
    barText: "text-[#2B5F75]",
    accent: "#4D7C9B",
    line: "#BBDCE8",
    categoryLabel: "진행 중",
  },
  done: {
    bar: "border-[#C8DCC8] bg-[#EDF3EC]",
    barText: "text-[#3F6548]",
    accent: "#5D865F",
    line: "#C8DCC8",
    categoryLabel: "완료",
  },
};

const GROUP_COLOR_ACCENTS: Record<string, string> = {
  red: "#C4554D",
  orange: "#C77B30",
  yellow: "#A98A32",
  green: "#5D865F",
  blue: "#4D7C9B",
  indigo: "#5F6FA6",
  violet: "#8067A8",
  purple: "#8067A8",
  pink: "#B35C81",
  gray: "#787774",
  slate: "#787774",
};

const ASSIGNEE_GROUP_ACCENTS = [
  "#4D7C9B",
  "#8067A8",
  "#5D865F",
  "#B35C81",
  "#A47A44",
  "#547E82",
] as const;

function getStableAssigneeAccent(value: string) {
  const hash = Array.from(value).reduce(
    (result, character) => (result * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
  return ASSIGNEE_GROUP_ACCENTS[hash % ASSIGNEE_GROUP_ACCENTS.length];
}

function getGroupColorAccent(color?: string) {
  if (!color) return GROUP_COLOR_ACCENTS.slate;
  if (color.startsWith("#")) return color;

  const normalized = color
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/^(bg|text|border)-/, "")
    .replace(/-\d+(?:\/\d+)?$/, "");

  return GROUP_COLOR_ACCENTS[normalized] || GROUP_COLOR_ACCENTS.slate;
}

function parseTaskDate(value?: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? startOfDay(parsed) : null;
}

function getTaskGroupId(task: Task, groupBy: TimelineGroupBy) {
  if (groupBy === "assignee") return task.assigneeId || "unassigned";
  if (groupBy === "priority") return task.priorityId || "no-priority";
  if (groupBy === "tag") return task.tags?.[0] || "no-tag";
  return task.columnId || "unassigned-status";
}

function groupTasks(
  tasks: Task[],
  groupBy: TimelineGroupBy,
  groupColumns: TimelineColumn[],
) {
  const tasksByGroup = new Map<string, Task[]>();
  tasks.forEach((task) => {
    const groupId = getTaskGroupId(task, groupBy);
    const groupTasks = tasksByGroup.get(groupId) || [];
    groupTasks.push(task);
    tasksByGroup.set(groupId, groupTasks);
  });

  const groups: TimelineGroup[] = [];
  groupColumns.forEach((column) => {
    const groupedTasks = tasksByGroup.get(column.id);
    if (!groupedTasks?.length) return;
    groups.push({
      id: column.id,
      title: column.title,
      category: column.category,
      color: column.color,
      icon: column.icon,
      tasks: groupedTasks,
    });
    tasksByGroup.delete(column.id);
  });

  tasksByGroup.forEach((unmatchedTasks, groupId) => {
    groups.push({
      id: groupId,
      title: "미분류",
      category: groupBy === "status" ? "todo" : undefined,
      color: "slate",
      tasks: unmatchedTasks,
    });
  });

  return groups;
}

function resolveDateRange(
  task: Task,
  dateOverrides: Record<string, DateOverride>,
) {
  const dateOverride = dateOverrides[task.id];
  const start = parseTaskDate(
    dateOverride?.startDate || task.startDate || task.endDate,
  );
  const end = parseTaskDate(
    dateOverride?.endDate || task.endDate || task.startDate,
  );
  return start && end ? { start, end } : null;
}

function calculateInteractionRange(
  interaction: TimelineInteraction,
  clientX: number,
  pixelsPerDay: number,
): TimelineDateRange {
  const deltaDays = Math.round(
    (clientX - interaction.originClientX) / pixelsPerDay,
  );
  return adjustTimelineDateRange(
    {
      start: interaction.initialStart,
      end: interaction.initialEnd,
    },
    interaction.mode,
    deltaDays,
  );
}

function toDateOverride(dateRange: TimelineDateRange): DateOverride {
  return {
    startDate: format(dateRange.start, "yyyy-MM-dd"),
    endDate: format(dateRange.end, "yyyy-MM-dd"),
  };
}

function TimelineGrid({
  cells,
  rangeStart,
  rangeEnd,
  pixelsPerDay,
  today,
}: {
  cells: TimelineCell[];
  rangeStart: Date;
  rangeEnd: Date;
  pixelsPerDay: number;
  today: Date;
}) {
  const todayOffset = differenceInCalendarDays(today, rangeStart);

  return (
    <>
      {cells.map((cell) => {
        const left =
          differenceInCalendarDays(cell.start, rangeStart) * pixelsPerDay;
        return (
          <div
            key={cell.key}
            className="pointer-events-none absolute inset-y-0 border-r"
            style={{
              left,
              width:
                differenceInCalendarDays(cell.end, cell.start) * pixelsPerDay,
            }}
          />
        );
      })}
      {today >= rangeStart && today < rangeEnd ? (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-blue-500/70"
          style={{ left: todayOffset * pixelsPerDay + pixelsPerDay / 2 }}
        />
      ) : null}
    </>
  );
}

export function TimelineBody({
  tasks,
  groupBy,
  groupColumns,
  statusColumns,
  cells,
  rangeStart,
  rangeEnd,
  pixelsPerDay,
  timelineWidth,
  taskPanelWidth,
  scale,
  today,
  onTaskClick,
  onUpdateTask,
  readOnly = false,
  allGroupsCollapsed,
  timelineAnimation,
}: TimelineBodyProps) {
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [dateOverrides, setDateOverrides] = useState<
    Record<string, DateOverride>
  >({});
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const interactionRef = useRef<TimelineInteraction | null>(null);
  const collapseCommandRef = useRef<boolean | undefined>(undefined);

  const statusColumnById = useMemo(
    () => new Map(statusColumns.map((column) => [column.id, column])),
    [statusColumns],
  );
  const groups = useMemo(
    () => groupTasks(tasks, groupBy, groupColumns),
    [groupBy, groupColumns, tasks],
  );

  useEffect(() => {
    if (
      typeof allGroupsCollapsed !== "boolean" ||
      collapseCommandRef.current === allGroupsCollapsed
    ) {
      return;
    }

    collapseCommandRef.current = allGroupsCollapsed;
    setCollapsedGroupIds(
      allGroupsCollapsed ? new Set(groups.map((group) => group.id)) : new Set(),
    );
  }, [allGroupsCollapsed, groups]);

  const setTaskDateOverride = (
    taskId: string,
    dateRange: TimelineDateRange,
  ) => {
    setDateOverrides((current) => ({
      ...current,
      [taskId]: toDateOverride(dateRange),
    }));
  };

  const clearTaskDateOverride = (taskId: string) => {
    setDateOverrides((current) => {
      if (!current[taskId]) return current;
      const next = { ...current };
      delete next[taskId];
      return next;
    });
  };

  const beginInteraction = (
    event: PointerEvent<HTMLElement>,
    task: Task,
    mode: TimelineInteractionMode,
  ) => {
    if (readOnly) return;
    const initialRange = resolveDateRange(task, dateOverrides);
    if (!initialRange) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      pointerId: event.pointerId,
      taskId: task.id,
      mode,
      originClientX: event.clientX,
      initialStart: initialRange.start,
      initialEnd: initialRange.end,
      moved: false,
    };
    setDraggingTaskId(task.id);
  };

  const continueInteraction = (event: PointerEvent<HTMLElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;

    if (Math.abs(event.clientX - interaction.originClientX) >= 3) {
      interaction.moved = true;
    }
    setTaskDateOverride(
      interaction.taskId,
      calculateInteractionRange(interaction, event.clientX, pixelsPerDay),
    );
  };

  const finishInteraction = async (event: PointerEvent<HTMLElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;

    const finalRange = calculateInteractionRange(
      interaction,
      event.clientX,
      pixelsPerDay,
    );
    const didMove = interaction.moved;
    interactionRef.current = null;
    setDraggingTaskId(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!didMove) {
      clearTaskDateOverride(interaction.taskId);
      if (interaction.mode === "move") onTaskClick(interaction.taskId);
      return;
    }

    const dateOverride = toDateOverride(finalRange);
    setTaskDateOverride(interaction.taskId, finalRange);
    try {
      await onUpdateTask(interaction.taskId, dateOverride);
    } catch {
      // 상위 저장 큐가 오류 알림과 서버 확정값 롤백을 담당한다.
    } finally {
      clearTaskDateOverride(interaction.taskId);
    }
  };

  const cancelInteraction = (event: PointerEvent<HTMLElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    interactionRef.current = null;
    setDraggingTaskId(null);
    clearTaskDateOverride(interaction.taskId);
  };

  const handleBarKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    taskId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onTaskClick(taskId);
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        이 조건에 해당하는 작업이 없습니다.
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => {
        const collapsed = collapsedGroupIds.has(group.id);
        const groupStyle =
          STATUS_STYLES[group.category || "todo"] || STATUS_STYLES.todo;
        const groupAccent =
          groupBy === "status"
            ? group.color
              ? getGroupColorAccent(group.color)
              : groupStyle.accent
            : groupBy === "assignee"
              ? group.id === "unassigned"
                ? GROUP_COLOR_ACCENTS.slate
                : getStableAssigneeAccent(group.id)
              : getGroupColorAccent(group.color);
        const groupLine =
          groupBy === "status"
            ? group.color
              ? `color-mix(in srgb, ${groupAccent} 38%, white)`
              : groupStyle.line
            : `color-mix(in srgb, ${groupAccent} 38%, white)`;
        const scheduledTaskCount = group.tasks.filter(
          (task) => task.startDate || task.endDate,
        ).length;

        return (
          <section key={group.id}>
            <div
              className="flex h-8 border-b-2 bg-background"
              style={{ borderBottomColor: groupLine }}
            >
              <button
                type="button"
                className="sticky left-0 z-30 flex shrink-0 items-center gap-2 border-r px-3 text-left"
                style={{
                  width: taskPanelWidth,
                  backgroundColor: `color-mix(in srgb, ${groupAccent} 8%, white)`,
                }}
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!collapsed}
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    collapsed && "-rotate-90",
                  )}
                  style={{ color: groupAccent }}
                />
                {groupBy === "assignee" ? (
                  <Avatar className="h-4 w-4 shrink-0">
                    {group.icon && group.icon !== "U" && group.icon !== "❓" ? (
                      <AvatarImage src={group.icon} alt="" />
                    ) : null}
                    <AvatarFallback className="bg-muted text-[8px] text-muted-foreground">
                      {group.id === "unassigned"
                        ? "?"
                        : group.title.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <span
                  className="truncate text-xs font-semibold"
                  style={{
                    color: groupBy === "assignee" ? undefined : groupAccent,
                  }}
                >
                  {group.title}
                </span>
                {groupBy === "status" ? (
                  <span
                    className="rounded-sm border px-1.5 py-0.5 text-[9px]"
                    style={{
                      borderColor: groupLine,
                      backgroundColor: `color-mix(in srgb, ${groupAccent} 8%, white)`,
                      color: groupAccent,
                    }}
                  >
                    {groupStyle.categoryLabel}
                  </span>
                ) : null}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {scheduledTaskCount}/{group.tasks.length} 기간 설정
                </span>
              </button>
              <motion.div
                animate={timelineAnimation}
                className="relative shrink-0"
                style={{
                  width: timelineWidth,
                  backgroundColor: `color-mix(in srgb, ${groupAccent} 5%, white)`,
                }}
              />
            </div>

            {!collapsed
              ? group.tasks.map((task) => {
                  const statusColumn = task.columnId
                    ? statusColumnById.get(task.columnId)
                    : undefined;
                  const statusStyle =
                    STATUS_STYLES[statusColumn?.category || "todo"] ||
                    STATUS_STYLES.todo;
                  const taskAccent = statusColumn?.color
                    ? getGroupColorAccent(statusColumn.color)
                    : statusStyle.accent;
                  const taskRange = resolveDateRange(task, dateOverrides);
                  const hasVisibleRange = Boolean(
                    taskRange &&
                    taskRange.end >= rangeStart &&
                    taskRange.start < rangeEnd,
                  );
                  const isDragging = draggingTaskId === task.id;

                  let barLeft = 0;
                  let barWidth = 0;
                  if (hasVisibleRange && taskRange) {
                    const clippedStart = max([taskRange.start, rangeStart]);
                    const clippedEnd = min([
                      addDays(taskRange.end, 1),
                      rangeEnd,
                    ]);
                    barLeft =
                      differenceInCalendarDays(clippedStart, rangeStart) *
                      pixelsPerDay;
                    barWidth = Math.max(
                      scale === "month" ? 18 : pixelsPerDay,
                      differenceInCalendarDays(clippedEnd, clippedStart) *
                        pixelsPerDay,
                    );
                  }

                  return (
                    <div
                      key={task.id}
                      className="group flex h-10 border-b bg-background hover:bg-muted/20"
                    >
                      <button
                        type="button"
                        className="sticky left-0 z-30 flex shrink-0 items-center gap-2 border-r bg-background px-3 text-left group-hover:bg-muted/20"
                        style={{ width: taskPanelWidth }}
                        onClick={() => onTaskClick(task.id)}
                      >
                        <Circle
                          className="h-2.5 w-2.5 shrink-0 fill-current"
                          style={{ color: taskAccent }}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">
                          {task.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {statusColumn?.title || "미분류"}
                        </span>
                      </button>

                      <motion.div
                        animate={timelineAnimation}
                        className="relative shrink-0"
                        style={{ width: timelineWidth }}
                      >
                        <TimelineGrid
                          cells={cells}
                          rangeStart={rangeStart}
                          rangeEnd={rangeEnd}
                          pixelsPerDay={pixelsPerDay}
                          today={today}
                        />

                        {hasVisibleRange ? (
                          <div
                            role="button"
                            tabIndex={0}
                            className={cn(
                              "absolute top-1.5 z-20 flex h-7 touch-none select-none items-center overflow-visible rounded-none border px-2 text-left text-[10px] font-medium shadow-none transition-[filter,opacity] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              readOnly
                                ? "cursor-pointer"
                                : isDragging
                                  ? "cursor-grabbing opacity-90"
                                  : "cursor-grab",
                              statusStyle.bar,
                              statusStyle.barText,
                            )}
                            style={{
                              left: barLeft,
                              width: barWidth,
                              ...(statusColumn?.color
                                ? {
                                    borderColor: `color-mix(in srgb, ${taskAccent} 44%, white)`,
                                    backgroundColor: `color-mix(in srgb, ${taskAccent} 14%, white)`,
                                    color: taskAccent,
                                  }
                                : {}),
                            }}
                            onPointerDown={(event) =>
                              beginInteraction(event, task, "move")
                            }
                            onPointerMove={continueInteraction}
                            onPointerUp={(event) => {
                              void finishInteraction(event);
                            }}
                            onPointerCancel={cancelInteraction}
                            onClick={() => {
                              if (readOnly) onTaskClick(task.id);
                            }}
                            onKeyDown={(event) =>
                              handleBarKeyDown(event, task.id)
                            }
                            title={`${task.title} · ${
                              taskRange
                                ? `${format(taskRange.start, "yyyy-MM-dd")} → ${format(
                                    taskRange.end,
                                    "yyyy-MM-dd",
                                  )}`
                                : "기간 미정"
                            }`}
                          >
                            {!readOnly ? (
                              <button
                                type="button"
                                className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize border-l-2 border-transparent hover:border-current"
                                aria-label={`${task.title} 시작일 조절`}
                                onPointerDown={(event) =>
                                  beginInteraction(event, task, "resize-start")
                                }
                                onPointerMove={continueInteraction}
                                onPointerUp={(event) => {
                                  void finishInteraction(event);
                                }}
                                onPointerCancel={cancelInteraction}
                              />
                            ) : null}
                            <span className="block min-w-0 flex-1 truncate px-1">
                              {task.title}
                            </span>
                            {!readOnly ? (
                              <button
                                type="button"
                                className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize border-r-2 border-transparent hover:border-current"
                                aria-label={`${task.title} 종료일 조절`}
                                onPointerDown={(event) =>
                                  beginInteraction(event, task, "resize-end")
                                }
                                onPointerMove={continueInteraction}
                                onPointerUp={(event) => {
                                  void finishInteraction(event);
                                }}
                                onPointerCancel={cancelInteraction}
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </motion.div>
                    </div>
                  );
                })
              : null}
          </section>
        );
      })}
    </div>
  );
}
