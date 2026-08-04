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
    if (groupBy === "assignee") return task.assigneeId || "unassigned";
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
        (column) => column.id === (task.assigneeId || "unassigned"),
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
    if (groupBy === "assignee") {
      return {
        assigneeId: column.id === "unassigned" ? undefined : column.id,
      };
    }
    return {};
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
    setActiveId(event.active.id as string);
    setActiveColumn(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "Task" || groupBy === "tag") {
      updateDropPreview(null);
      return;
    }

    const activeTaskId = active.id as string;
    const overId = over.id as string;
    const overTask = tasks.find((task) => task.id === overId);
    const dropColumnId = over.data.current?.columnId;
    const targetColumn = overTask
      ? getColumnForTask(overTask)
      : columns.find(
          (column) =>
            column.id ===
            (typeof dropColumnId === "string" ? dropColumnId : overId),
        );
    if (!targetColumn) {
      updateDropPreview(null);
      return;
    }

    const activeTask = tasks.find((task) => task.id === activeTaskId);
    if (!activeTask) return;
    const movedTask = {
      ...activeTask,
      ...getTaskUpdatesForColumn(targetColumn),
    };
    const targetGroup = getTaskGroupValue(movedTask);
    const targetTasks = tasks.filter(
      (task) =>
        task.id !== activeTaskId && getTaskGroupValue(task) === targetGroup,
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

    const activeTaskId = active.id as string;
    const activeTask = tasks.find((task) => task.id === activeTaskId);
    if (!activeTask) {
      resetTasks?.();
      return;
    }

    const overTask = tasks.find((task) => task.id === over.id);
    const dropColumnId = over.data.current?.columnId;
    const targetColumn = finalDropPreview
      ? columns.find((column) => column.id === finalDropPreview.columnId)
      : overTask
        ? getColumnForTask(overTask)
        : columns.find(
            (column) =>
              column.id ===
              (typeof dropColumnId === "string"
                ? dropColumnId
                : String(over.id)),
          );

    if (!targetColumn) {
      resetTasks?.();
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
      } else if (groupBy === "assignee") {
        await updateTask(activeTaskId, {
          assigneeId: targetGroup === "unassigned" ? undefined : targetGroup,
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
