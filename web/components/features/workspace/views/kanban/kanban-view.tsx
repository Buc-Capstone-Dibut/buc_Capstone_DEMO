/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  CheckCircle2,
  Circle,
  LoaderCircle,
  MoreHorizontal,
  EyeOff,
} from "lucide-react";
import { KanbanColumn } from "./column";
import { TaskCard } from "../../modules/task/card";
import { useKanbanDrag } from "./hooks/use-kanban-drag";
import { cn } from "@/lib/utils";
import { Task } from "../../store/mock-data";
import { useEffect, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  isTaskAssignedTo,
  isTaskUnassigned,
} from "@/lib/workspace/task-assignees";

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
    taskSnapshot?: Task[],
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
  onDragStateChange?: (isDragging: boolean) => void;
  viewSettings: {
    showTags: boolean;
    showAssignee: boolean;
    showDueDate: boolean;
    showPriority: boolean;
    cardProperties?: string[];
    hiddenStatusCategories?: Array<"todo" | "in-progress" | "done">;
    statusCategoryOrder?: Array<"todo" | "in-progress" | "done">;
  };
}

const STATUS_SECTIONS = [
  {
    category: "todo" as const,
    label: "할 일",
    icon: <Circle className="h-4 w-4" />,
    accentClass: "text-slate-700",
    badgeClass: "border-transparent bg-transparent text-slate-700",
  },
  {
    category: "in-progress" as const,
    label: "진행 중",
    icon: <LoaderCircle className="h-4 w-4" />,
    accentClass: "text-blue-700",
    badgeClass: "border-transparent bg-transparent text-blue-700",
  },
  {
    category: "done" as const,
    label: "완료",
    icon: <CheckCircle2 className="h-4 w-4" />,
    accentClass: "text-green-700",
    badgeClass: "border-transparent bg-transparent text-green-700",
  },
] as const;

const kanbanCollisionDetection: CollisionDetection = (args) => {
  const isColumnDrag = args.active.data.current?.type === "Column";

  if (isColumnDrag) {
    const columnContainers = args.droppableContainers.filter(
      (container) =>
        container.id !== args.active.id &&
        container.data.current?.type === "Column",
    );

    return closestCorners({
      ...args,
      droppableContainers: columnContainers,
    });
  }

  const taskContainers = args.droppableContainers.filter(
    (container) =>
      container.id !== args.active.id &&
      (container.data.current?.type === "Task" ||
        container.data.current?.type === "ColumnDropZone"),
  );
  const taskCollisionArgs = {
    ...args,
    droppableContainers: taskContainers,
  };

  // Task drag only considers cards and the small end-of-column drop target.
  const pointerCollisions = pointerWithin(taskCollisionArgs);
  if (pointerCollisions.length === 0) {
    return args.pointerCoordinates
      ? []
      : closestCorners(taskCollisionArgs);
  }

  const collisionsByType = (type: "Task" | "ColumnDropZone") =>
    pointerCollisions.filter(
      (collision) =>
        collision.data?.droppableContainer.data.current?.type === type,
    );

  const taskCollisions = collisionsByType("Task");
  if (taskCollisions.length > 0) return taskCollisions;

  const columnDropCollisions = collisionsByType("ColumnDropZone");
  if (columnDropCollisions.length > 0) return columnDropCollisions;

  return pointerCollisions;
};

function KanbanColumnOverlay({
  column,
  tasks,
}: {
  column: { id: string; title?: string };
  tasks: Task[];
}) {
  return (
    <div className="w-80 overflow-hidden rounded-md border border-slate-200 bg-background p-2 shadow-xl">
      <div className="mb-2 flex items-center justify-between border-b pb-2 text-xs font-semibold">
        <span className="truncate">{column.title || "컬럼"}</span>
        <span className="text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.slice(0, 4).map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length > 4 ? (
          <div className="py-1 text-center text-[10px] text-muted-foreground">
            외 {tasks.length - 4}개 작업
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function KanbanView({
  projectId,
  tasks,
  activeView,
  groupBy,
  displayColumns,
  onUpdateTask,
  onMoveColumn,
  onReorderTask,
  onUpdateView,
  onDeleteColumn,
  onTaskClick,
  onCreateTask,
  onDeleteTask,
  onUpdateColumn,
  onHideColumn,
  onHideStatusCategory,
  onDragStateChange,
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
  const [optimisticTasks, setOptimisticTasks] = useState(tasks);

  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  const {
    activeId,
    activeColumn,
    dropPreview,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useKanbanDrag({
    columns: displayColumns,
    groupBy: groupBy as "status" | "priority" | "assignee" | "tag",
    activeViewId: activeView?.id || "",
    projectId,
    updateTask: onUpdateTask,
    moveColumnInView: onMoveColumn,
    reorderTask: onReorderTask,
    tasks: optimisticTasks,
    setTasks: setOptimisticTasks,
    resetTasks: () => setOptimisticTasks(tasks),
    updateView: onUpdateView,
  });

  const activeTask = optimisticTasks.find((t) => t.id === activeId);

  useEffect(() => {
    onDragStateChange?.(Boolean(activeId));
  }, [activeId, onDragStateChange]);

  useEffect(
    () => () => {
      onDragStateChange?.(false);
    },
    [onDragStateChange],
  );

  const statusColumnsByCategory = useMemo(() => {
    const sectionMap = new Map(
      STATUS_SECTIONS.map((section) => [section.category, section]),
    );
    const configuredOrder = viewSettings.statusCategoryOrder || [];
    const categoryOrder = [
      ...configuredOrder,
      ...STATUS_SECTIONS.map((section) => section.category).filter(
        (category) => !configuredOrder.includes(category),
      ),
    ];

    return categoryOrder
      .map((category) => sectionMap.get(category))
      .filter((section): section is (typeof STATUS_SECTIONS)[number] =>
        Boolean(section),
      )
      .map((section) => ({
        ...section,
        columns: displayColumns.filter(
          (column) => (column.category || "todo") === section.category,
        ),
      }))
      .filter(
        (section) =>
          !viewSettings.hiddenStatusCategories?.includes(section.category),
      );
  }, [
    displayColumns,
    viewSettings.hiddenStatusCategories,
    viewSettings.statusCategoryOrder,
  ]);

  const getTasksForColumn = (col: any) =>
    optimisticTasks.filter((t) => {
      if (groupBy === "status") {
        if (t.columnId) return t.columnId === col.id;
        return (
          t.status === col.statusId ||
          (t.status === "todo" && col.category === "todo")
        );
      }
      if (groupBy === "assignee") {
        return col.id === "unassigned"
          ? isTaskUnassigned(t)
          : isTaskAssignedTo(t, col.id);
      }
      if (groupBy === "priority") {
        return col.id === "no-priority"
          ? !t.priorityId
          : t.priorityId === col.id;
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
        assigneeIds: column.id === "unassigned" ? [] : [column.id],
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
    <div className="relative flex-1 h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth sm:snap-none">
      <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full border bg-background/90 px-3 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur sm:hidden">
        좌우로 밀어 다른 컬럼 보기
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {groupBy === "status" ? (
          <div className="h-full min-w-full overflow-x-auto overflow-y-hidden p-3">
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
              <div className="flex h-full min-w-fit items-stretch gap-6">
                {statusColumnsByCategory.map((section) => (
                  <section
                    key={section.category}
                    className="flex h-full min-w-fit shrink-0 flex-col"
                  >
                    <div className="px-1 pb-0.5">
                      <div
                        className={cn(
                          "flex items-center gap-2 text-sm font-semibold",
                          section.accentClass,
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-bold",
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
                                onClick={() =>
                                  onHideStatusCategory(section.category)
                                }
                              >
                                <EyeOff className="mr-2 h-4 w-4" />이 축 보기
                                끄기
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      <div className="mt-1.5 h-px w-full bg-border/70" />
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
                        <div className="flex h-full min-w-fit gap-5 pb-2">
                          {section.columns.map((col) => (
                            <KanbanColumn
                              key={col.id}
                              id={col.id}
                              column={col}
                              title={col.title}
                              tasks={getTasksForColumn(col)}
                              groupBy={groupBy}
                              onCreateTask={() =>
                                onCreateTask(getCreateTaskInput(col))
                              }
                              color={col.color}
                              viewSettings={viewSettings}
                              onTaskClick={onTaskClick}
                              onDeleteTask={onDeleteTask}
                              onRename={
                                allowColumnActions
                                  ? (newTitle) =>
                                      onUpdateColumn(col.id, {
                                        title: newTitle,
                                      })
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
                              dropPreview={
                                dropPreview?.columnId === col.id
                                  ? dropPreview
                                  : null
                              }
                              activeTaskId={activeId}
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
                  disableTaskDrag={disableTaskDrag}
                  allowColumnActions={allowColumnActions}
                  dropPreview={
                    dropPreview?.columnId === col.id ? dropPreview : null
                  }
                  activeTaskId={activeId}
                />
              ))}
            </SortableContext>
          </div>
        )}

        <DragOverlay>
          {activeColumn ? (
            <KanbanColumnOverlay
              column={activeColumn}
              tasks={optimisticTasks.filter(
                (task) => task.columnId === activeColumn.id,
              )}
            />
          ) : activeTask ? (
            <TaskCard task={activeTask} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
