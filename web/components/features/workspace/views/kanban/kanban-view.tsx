/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CheckCircle2, Circle, LoaderCircle, MoreHorizontal, EyeOff } from "lucide-react";
import { KanbanColumn } from "./column";
import { TaskCard } from "../../modules/task/card";
import { useKanbanDrag } from "./hooks/use-kanban-drag";
import { cn } from "@/lib/utils";
import { Task } from "../../store/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface KanbanViewProps {
  projectId: string;
  tasks: Task[];
  activeView: any;
  priorities: any[];
  tags: any[];
  groupBy: string;
  displayColumns: any[];
  onUpdateTask: (taskId: string, updates: any) => Promise<void>;
  onMoveColumn: (
    viewId: string,
    fromIndex: number,
    toIndex: number,
  ) => Promise<void>;
  onReorderTask: (
    taskId: string,
    newStatus: string,
    newIndex: number,
  ) => Promise<void>;
  onUpdateView: (projectId: string, viewId: string, updates: any) => void;
  reorderPriorities: (items: any[]) => void;
  reorderTags: (items: any[]) => void;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onTaskClick: (taskId: string) => void;
  onCreateTask: (taskProps: any) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onUpdateColumn: (columnId: string, updates: any) => Promise<void>;
  onHideColumn?: (columnId: string) => void;
  onHideStatusCategory?: (category: "todo" | "in-progress" | "done") => void;
  viewSettings: {
    showTags: boolean;
    showAssignee: boolean;
    showDueDate: boolean;
    showPriority: boolean;
    cardProperties?: string[];
    hiddenStatusCategories?: Array<"todo" | "in-progress" | "done">;
  };
}

const STATUS_SECTIONS = [
  {
    category: "todo" as const,
    label: "할 일",
    icon: <Circle className="h-4 w-4" />,
    accentClass: "text-slate-700",
    lineClass: "bg-slate-300",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
  },
  {
    category: "in-progress" as const,
    label: "진행 중",
    icon: <LoaderCircle className="h-4 w-4" />,
    accentClass: "text-blue-700",
    lineClass: "bg-blue-300",
    badgeClass: "border-blue-200 bg-blue-100 text-blue-700",
  },
  {
    category: "done" as const,
    label: "완료",
    icon: <CheckCircle2 className="h-4 w-4" />,
    accentClass: "text-green-700",
    lineClass: "bg-green-300",
    badgeClass: "border-green-200 bg-green-100 text-green-700",
  },
] as const;

export function KanbanView({
  projectId,
  tasks,
  activeView,
  priorities,
  tags,
  groupBy,
  displayColumns,
  onUpdateTask,
  onMoveColumn,
  onReorderTask,
  onUpdateView,
  reorderPriorities,
  reorderTags,
  onDeleteColumn,
  onTaskClick,
  onCreateTask,
  onDeleteTask,
  onUpdateColumn,
  onHideColumn,
  onHideStatusCategory,
  viewSettings = {
    showTags: true,
    showAssignee: true,
    showDueDate: true,
    showPriority: true,
    cardProperties: [],
  },
}: KanbanViewProps) {
  const disableTaskDrag = groupBy === "tag";
  const allowColumnActions = groupBy === "status";

  const {
    activeId,
    activeColumn,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useKanbanDrag({
    columns: displayColumns,
    groupBy: groupBy as "status" | "priority" | "assignee" | "dueDate" | "tag",
    activeViewId: activeView?.id || "",
    projectId,
    updateTaskStatus: (taskId, status) => onUpdateTask(taskId, { status }),
    updateTask: onUpdateTask,
    moveColumnInView: onMoveColumn,
    reorderTask: onReorderTask,
    priorities,
    tags,
    reorderPriorities,
    reorderTags,
    tasks,
    updateView: onUpdateView,
  });

  const activeTask = tasks.find((t) => t.id === activeId);

  const statusColumnsByCategory = STATUS_SECTIONS.map((section) => ({
    ...section,
    columns: displayColumns.filter(
      (column) => (column.category || "todo") === section.category,
    ),
  })).filter(
    (section) =>
      !viewSettings.hiddenStatusCategories?.includes(section.category),
  );

  const getTasksForColumn = (col: any) =>
    tasks.filter((t) => {
      if (groupBy === "status") {
        return (
          t.status === col.statusId ||
          t.columnId === col.id ||
          (t.status === "todo" && col.category === "todo")
        );
      }
      if (groupBy === "assignee") {
        return col.id === "unassigned" ? !t.assigneeId : t.assigneeId === col.id;
      }
      if (groupBy === "priority") {
        return col.id === "no-priority" ? !t.priorityId : t.priorityId === col.id;
      }
      if (groupBy === "tag") {
        return col.id === "no-tag"
          ? !t.tags || t.tags.length === 0
          : t.tags?.includes(col.id);
      }
      return false;
    });

  const getCreateTaskInput = (column: any) => {
    if (groupBy === "status") {
      return { columnId: column.id };
    }

    if (groupBy === "assignee") {
      return {
        status: "todo",
        assigneeId: column.id === "unassigned" ? null : column.id,
      };
    }

    if (groupBy === "priority") {
      return {
        status: "todo",
        priorityId: column.id === "no-priority" ? null : column.id,
      };
    }

    if (groupBy === "tag") {
      return {
        status: "todo",
        tags: column.id === "no-tag" ? [] : [column.id],
      };
    }

    return { columnId: column.id };
  };

  return (
    <div className="flex-1 h-full overflow-x-auto overflow-y-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {groupBy === "status" ? (
          <div className="h-full min-w-full overflow-x-auto overflow-y-hidden p-4">
            {statusColumnsByCategory.length === 0 ? (
              <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-8 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    숨겨진 상위 섹션만 남아 있습니다.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    보기 설정에서 다시 표시할 축을 켜주세요.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-w-fit items-stretch gap-8">
                {statusColumnsByCategory.map((section) => (
                <section
                  key={section.category}
                  className="flex h-full min-w-fit shrink-0 flex-col"
                >
                  <div className="px-1 pb-4">
                    <div
                      className={cn(
                        "flex items-center gap-2 text-sm font-semibold",
                        section.accentClass,
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                            section.badgeClass,
                          )}
                        >
                          {section.icon}
                          {section.label}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {section.columns.length}개 단계
                        </span>
                      </div>
                      {onHideStatusCategory && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-auto h-7 w-7 text-muted-foreground hover:bg-muted"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => onHideStatusCategory(section.category)}
                            >
                              <EyeOff className="mr-2 h-4 w-4" />
                              이 축 보기 끄기
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="mt-3 h-px w-full bg-border" />
                    <div
                      className={cn(
                        "mt-[-1px] h-0.5 w-16 rounded-full",
                        section.lineClass,
                      )}
                    />
                  </div>

                  <SortableContext
                    items={section.columns.map((column) => column.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {section.columns.length === 0 ? (
                      <div className="flex min-h-[220px] w-[280px] items-center justify-center rounded-2xl border border-dashed bg-muted/10 px-6 text-center">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            표시 중인 세부 단계가 없습니다.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            보기 설정에서 이 축의 단계를 다시 켤 수 있습니다.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full min-w-fit gap-4 pb-2">
                        {section.columns.map((col) => (
                          <KanbanColumn
                            key={col.id}
                            id={col.id}
                            column={col}
                            title={col.title}
                            tasks={getTasksForColumn(col)}
                            groupBy={groupBy}
                            onCreateTask={() => onCreateTask(getCreateTaskInput(col))}
                            color={col.color}
                            viewSettings={viewSettings}
                            onTaskClick={onTaskClick}
                            onDeleteTask={onDeleteTask}
                            onRename={
                              allowColumnActions
                                ? (newTitle) =>
                                    onUpdateColumn(col.id, { title: newTitle })
                                : undefined
                            }
                            onDelete={
                              allowColumnActions
                                ? () => onDeleteColumn(col.id)
                                : undefined
                            }
                            onHide={
                              groupBy === "status" && onHideColumn
                                ? () => onHideColumn(col.id)
                                : undefined
                            }
                            category={section.category}
                            disableTaskDrag={disableTaskDrag}
                            allowColumnActions={allowColumnActions}
                          />
                        ))}
                      </div>
                    )}
                  </SortableContext>
                </section>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex gap-4 p-4 min-w-full">
            <SortableContext
              items={displayColumns.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {displayColumns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  column={col}
                  title={col.title}
                  tasks={getTasksForColumn(col)}
                  groupBy={groupBy}
                  onCreateTask={() => onCreateTask(getCreateTaskInput(col))}
                  color={col.color}
                  viewSettings={viewSettings}
                  onTaskClick={onTaskClick}
                  onDeleteTask={onDeleteTask}
                  onRename={
                    allowColumnActions
                      ? (newTitle) => onUpdateColumn(col.id, { title: newTitle })
                      : undefined
                  }
                    onDelete={
                      allowColumnActions ? () => onDeleteColumn(col.id) : undefined
                    }
                    onHide={
                      groupBy === "status" && onHideColumn
                        ? () => onHideColumn(col.id)
                        : undefined
                    }
                    disableTaskDrag={disableTaskDrag}
                    allowColumnActions={allowColumnActions}
                />
              ))}
            </SortableContext>
          </div>
        )}

        <DragOverlay>
          {activeColumn ? (
            <KanbanColumn
              id={activeColumn.id}
              column={activeColumn}
              tasks={tasks.filter((t) => t.columnId === activeColumn.id)}
              groupBy={groupBy}
              onTaskClick={() => {}}
              onCreateTask={() => {}}
              viewSettings={{
                showTags: true,
                showAssignee: true,
                showDueDate: true,
                showPriority: true,
              }}
              isOverlay
            />
          ) : activeTask ? (
            <TaskCard task={activeTask} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
