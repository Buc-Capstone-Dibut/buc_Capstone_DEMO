import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import {
  type ViewColumn,
  type Task,
  type TaskStatus,
  type Priority,
  type Tag,
} from "../../../store/mock-data";
import {
  getTaskAssigneeIds,
  getTaskAssignees,
  isTaskAssignedTo,
  isTaskUnassigned,
  moveTaskAssigneeIds,
} from "@/lib/workspace/task-assignees";

type KanbanDragColumn = {
  id: string;
  statusId?: string;
  title?: string;
};

export type KanbanDropPreview = {
  columnId: string;
  index: number;
};

interface UseKanbanDragProps {
  columns: KanbanDragColumn[];
  groupBy: "status" | "assignee" | "priority" | "dueDate" | "tag";
  activeViewId: string;
  reorderTask: (
    taskId: string,
    newStatus: string,
    newIndex: number,
    taskSnapshot?: Task[],
  ) => Promise<void> | void;
  tasks: Task[];
  setTasks?: Dispatch<SetStateAction<Task[]>>;
  resetTasks?: () => void;
  updateTaskStatus?: (taskId: string, statusId: TaskStatus) => void;
  updateTask: (
    taskId: string,
    updates: Partial<Task>,
  ) => Promise<void> | void;
  moveColumnInView: (
    viewId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  updateView: (
    projectId: string,
    viewId: string,
    updates: Record<string, unknown>,
  ) => void;
  priorities?: Priority[];
  tags?: Tag[];
  reorderPriorities?: (newOrder: Priority[]) => void;
  reorderTags?: (newOrder: Tag[]) => void;
  projectId: string;
}

export function useKanbanDrag({
  columns,
  groupBy,
  activeViewId,
  updateTask,
  moveColumnInView,
  reorderTask,
  tasks,
  setTasks,
  resetTasks,
  updateView,
  projectId,
}: UseKanbanDragProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<ViewColumn | null>(null);
  const [dropPreview, setDropPreview] = useState<KanbanDropPreview | null>(null);
  const dropPreviewRef = useRef<KanbanDropPreview | null>(null);
  const dragStartTasksRef = useRef<Task[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const getTaskGroupValue = (task: Task) => {
    if (groupBy === "status") return task.columnId || task.status;
    if (groupBy === "assignee")
      return getTaskAssigneeIds(task)[0] || "unassigned";
    if (groupBy === "priority") return task.priorityId || "no-priority";
    if (groupBy === "tag") return task.tags?.[0] || "no-tag";
    return undefined;
  };

  const getColumnForTask = (task: Task) => {
    if (groupBy === "status") {
      const exactColumn = columns.find((column) => column.id === task.columnId);
      if (exactColumn) return exactColumn;
      return columns.find((column) => column.statusId === task.status);
    }
    if (groupBy === "priority") {
      return columns.find(
        (column) => column.id === (task.priorityId || "no-priority"),
      );
    }
    if (groupBy === "assignee") {
      return columns.find(
        (column) =>
          column.id === (getTaskAssigneeIds(task)[0] || "unassigned"),
      );
    }
    return undefined;
  };

  const getTaskUpdatesForColumn = (column: KanbanDragColumn): Partial<Task> => {
    if (groupBy === "status") {
      return {
        columnId: column.id,
        status: column.statusId || column.id,
      };
    }
    if (groupBy === "priority") {
      return {
        priorityId: column.id === "no-priority" ? undefined : column.id,
      };
    }
    return {};
  };

  const taskBelongsToColumn = (task: Task, columnId: string) => {
    if (groupBy === "status") {
      return task.columnId === columnId || task.status === columnId;
    }
    if (groupBy === "priority") {
      return (task.priorityId || "no-priority") === columnId;
    }
    if (groupBy === "assignee") {
      return columnId === "unassigned"
        ? isTaskUnassigned(task)
        : isTaskAssignedTo(task, columnId);
    }
    if (groupBy === "tag") {
      return columnId === "no-tag"
        ? !task.tags?.length
        : Boolean(task.tags?.includes(columnId));
    }
    return false;
  };

  const updateDropPreview = (nextPreview: KanbanDropPreview | null) => {
    const current = dropPreviewRef.current;
    if (
      current?.columnId === nextPreview?.columnId &&
      current?.index === nextPreview?.index
    ) {
      return;
    }
    dropPreviewRef.current = nextPreview;
    setDropPreview(nextPreview);
  };

  const buildTaskMoveSnapshot = (
    taskId: string,
    targetColumn: KanbanDragColumn,
    requestedIndex: number,
  ) => {
    const activeTask = tasks.find((task) => task.id === taskId);
    if (!activeTask) return tasks;

    const movedTask = {
      ...activeTask,
      ...getTaskUpdatesForColumn(targetColumn),
    };
    const targetGroup = getTaskGroupValue(movedTask);
    const remainingTasks = tasks.filter((task) => task.id !== taskId);
    const targetTasks = remainingTasks.filter(
      (task) => getTaskGroupValue(task) === targetGroup,
    );
    const nextIndex = Math.max(
      0,
      Math.min(requestedIndex, targetTasks.length),
    );
    targetTasks.splice(nextIndex, 0, movedTask);

    const firstTargetPosition = remainingTasks.findIndex(
      (task) => getTaskGroupValue(task) === targetGroup,
    );
    const otherTasks = remainingTasks.filter(
      (task) => getTaskGroupValue(task) !== targetGroup,
    );
    const insertionIndex =
      firstTargetPosition < 0
        ? otherTasks.length
        : remainingTasks
            .slice(0, firstTargetPosition)
            .filter((task) => getTaskGroupValue(task) !== targetGroup).length;

    return [
      ...otherTasks.slice(0, insertionIndex),
      ...targetTasks,
      ...otherTasks.slice(insertionIndex),
    ];
  };

  const handleDragStart = (event: DragStartEvent) => {
    updateDropPreview(null);
    if (event.active.data.current?.type === "Column") {
      setActiveColumn(event.active.data.current.column);
      setActiveId(null);
      return;
    }
    dragStartTasksRef.current = tasks;
    setActiveId(
      typeof event.active.data.current?.taskId === "string"
        ? event.active.data.current.taskId
        : String(event.active.id),
    );
    setActiveColumn(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "Task" || groupBy === "tag") {
      updateDropPreview(null);
      return;
    }

    const activeTaskId =
      typeof active.data.current?.taskId === "string"
        ? active.data.current.taskId
        : String(active.id);
    const overTaskId =
      typeof over.data.current?.taskId === "string"
        ? over.data.current.taskId
        : over.data.current?.type === "Task"
          ? String(over.id)
          : null;
    const overTask = overTaskId
      ? tasks.find((task) => task.id === overTaskId)
      : undefined;
    const dropColumnId = over.data.current?.columnId;
    const targetColumn =
      columns.find(
        (column) =>
          column.id ===
          (typeof dropColumnId === "string" ? dropColumnId : String(over.id)),
      ) || (overTask ? getColumnForTask(overTask) : undefined);
    if (!targetColumn) {
      updateDropPreview(null);
      return;
    }

    const activeTask = tasks.find((task) => task.id === activeTaskId);
    if (!activeTask) return;
    const targetTasks = tasks.filter(
      (task) =>
        task.id !== activeTaskId && taskBelongsToColumn(task, targetColumn.id),
    );
    let targetIndex = targetTasks.length;

    if (overTask) {
      const overIndex = targetTasks.findIndex((task) => task.id === overTask.id);
      const activeRect = active.rect.current.translated;
      const isBelowOverTask = Boolean(
        activeRect &&
          activeRect.top + activeRect.height / 2 >
            over.rect.top + over.rect.height / 2,
      );
      targetIndex = Math.max(0, overIndex + (isBelowOverTask ? 1 : 0));
    }

    updateDropPreview({ columnId: targetColumn.id, index: targetIndex });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const finalDropPreview = dropPreviewRef.current;
    updateDropPreview(null);
    setActiveColumn(null);
    setActiveId(null);

    if (!over) {
      resetTasks?.();
      return;
    }

    if (active.data.current?.type === "Column") {
      const dropColumnId = over.data.current?.columnId;
      const overColumnId =
        typeof dropColumnId === "string" ? dropColumnId : String(over.id);
      if (String(active.id) !== overColumnId) {
        const oldIndex = columns.findIndex((column) => column.id === active.id);
        const newIndex = columns.findIndex(
          (column) => column.id === overColumnId,
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          if (groupBy === "status") {
            if (activeViewId) {
              moveColumnInView(activeViewId, oldIndex, newIndex);
            }
          } else {
            const newOrderIds = arrayMove(
              columns.map((column) => column.id),
              oldIndex,
              newIndex,
            );
            if (projectId && activeViewId) {
              updateView(projectId, activeViewId, {
                columnOrder: newOrderIds,
              });
            }
          }
        }
      }
      return;
    }

    const activeTaskId =
      typeof active.data.current?.taskId === "string"
        ? active.data.current.taskId
        : String(active.id);
    const activeTask = tasks.find((task) => task.id === activeTaskId);
    if (!activeTask) {
      resetTasks?.();
      return;
    }

    const overTaskId =
      typeof over.data.current?.taskId === "string"
        ? over.data.current.taskId
        : over.data.current?.type === "Task"
          ? String(over.id)
          : null;
    const overTask = overTaskId
      ? tasks.find((task) => task.id === overTaskId)
      : undefined;
    const dropColumnId = over.data.current?.columnId;
    const targetColumn = finalDropPreview
      ? columns.find((column) => column.id === finalDropPreview.columnId)
      : columns.find(
            (column) =>
              column.id ===
              (typeof dropColumnId === "string"
                ? dropColumnId
                : String(over.id)),
          ) || (overTask ? getColumnForTask(overTask) : undefined);

    if (!targetColumn) {
      resetTasks?.();
      return;
    }

    if (groupBy === "assignee") {
      const sourceColumnId =
        typeof active.data.current?.columnId === "string"
          ? active.data.current.columnId
          : null;
      if (sourceColumnId === targetColumn.id) {
        resetTasks?.();
        return;
      }

      const nextAssigneeIds = moveTaskAssigneeIds(
        getTaskAssigneeIds(activeTask),
        sourceColumnId,
        targetColumn.id,
      );
      const existingAssignees = getTaskAssignees(activeTask);
      const nextAssignees = nextAssigneeIds.map(
        (id) => existingAssignees.find((assignee) => assignee.id === id) || { id },
      );
      const primary = nextAssignees[0] ?? null;
      const nextTasks = tasks.map((task) =>
        task.id === activeTaskId
          ? {
              ...task,
              assigneeIds: nextAssigneeIds,
              assignees: nextAssignees,
              assigneeId: primary?.id ?? null,
              assignee: primary?.name ?? null,
              assigneeProfile: primary,
            }
          : task,
      );
      setTasks?.(nextTasks);

      try {
        await updateTask(activeTaskId, { assigneeIds: nextAssigneeIds });
      } catch {
        if (setTasks && dragStartTasksRef.current.length > 0) {
          setTasks(dragStartTasksRef.current);
        } else {
          resetTasks?.();
        }
      }
      return;
    }

    const movedTask = {
      ...activeTask,
      ...getTaskUpdatesForColumn(targetColumn),
    };
    const targetGroup = getTaskGroupValue(movedTask);
    const targetTasks = tasks.filter(
      (task) =>
        task.id !== activeTaskId && getTaskGroupValue(task) === targetGroup,
    );
    const overIndex = overTask
      ? targetTasks.findIndex((task) => task.id === overTask.id)
      : targetTasks.length;
    const newIndex = finalDropPreview
      ? finalDropPreview.index
      : overIndex < 0
        ? targetTasks.length
        : overIndex;
    const nextTasks = buildTaskMoveSnapshot(
      activeTaskId,
      targetColumn,
      newIndex,
    );

    setTasks?.(nextTasks);

    try {
      if (groupBy === "status" && targetGroup) {
        await reorderTask(activeTaskId, targetGroup, newIndex, nextTasks);
      } else if (groupBy === "priority") {
        await updateTask(activeTaskId, {
          priorityId: targetGroup === "no-priority" ? undefined : targetGroup,
        });
      }
    } catch {
      if (setTasks && dragStartTasksRef.current.length > 0) {
        setTasks(dragStartTasksRef.current);
      } else {
        resetTasks?.();
      }
    }
  };

  const handleDragCancel = () => {
    updateDropPreview(null);
    setActiveColumn(null);
    setActiveId(null);
    resetTasks?.();
  };

  return {
    activeId,
    activeColumn,
    dropPreview,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragCancel,
  };
}
