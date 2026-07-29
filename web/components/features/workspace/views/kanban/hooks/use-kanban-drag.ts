import { type Dispatch, type SetStateAction, useState } from "react";
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

interface UseKanbanDragProps {
  columns: KanbanDragColumn[];
  groupBy: "status" | "assignee" | "priority" | "dueDate" | "tag";
  activeViewId: string;
  reorderTask: (
    taskId: string,
    newStatus: string,
    newIndex: number,
    taskSnapshot?: Task[],
  ) => void;
  tasks: Task[];
  setTasks?: Dispatch<SetStateAction<Task[]>>;
  resetTasks?: () => void;
  updateTaskStatus?: (taskId: string, statusId: TaskStatus) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
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

  const previewTaskMove = (
    taskId: string,
    targetColumn: KanbanDragColumn,
    overTaskId?: string,
  ) => {
    if (!setTasks) return;
    setTasks((currentTasks) => {
      const activeTask = currentTasks.find((task) => task.id === taskId);
      if (!activeTask) return currentTasks;

      const movedTask = {
        ...activeTask,
        ...getTaskUpdatesForColumn(targetColumn),
      };
      const targetGroup = getTaskGroupValue(movedTask);
      const remainingTasks = currentTasks.filter((task) => task.id !== taskId);
      const targetTasks = remainingTasks.filter(
        (task) => getTaskGroupValue(task) === targetGroup,
      );
      const requestedIndex = overTaskId
        ? targetTasks.findIndex((task) => task.id === overTaskId)
        : targetTasks.length;
      const nextIndex =
        requestedIndex < 0
          ? targetTasks.length
          : Math.min(requestedIndex, targetTasks.length);
      const currentGroupTasks = currentTasks.filter(
        (task) => getTaskGroupValue(task) === targetGroup,
      );
      const currentIndex = currentGroupTasks.findIndex(
        (task) => task.id === taskId,
      );

      if (
        getTaskGroupValue(activeTask) === targetGroup &&
        currentIndex === nextIndex
      ) {
        return currentTasks;
      }

      targetTasks.splice(nextIndex, 0, movedTask);
      const otherTasks = remainingTasks.filter(
        (task) => getTaskGroupValue(task) !== targetGroup,
      );

      return [...otherTasks, ...targetTasks];
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "Column") {
      setActiveColumn(event.active.data.current.column);
      setActiveId(null);
      return;
    }
    setActiveId(event.active.id as string);
    setActiveColumn(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "Task" || groupBy === "tag") {
      return;
    }

    const activeTaskId = active.id as string;
    const overId = over.id as string;
    if (activeTaskId === overId) return;

    const overTask = tasks.find((task) => task.id === overId);
    if (overTask) {
      const targetColumn = getColumnForTask(overTask);
      if (targetColumn) previewTaskMove(activeTaskId, targetColumn, overId);
      return;
    }

    const overColumn = columns.find((column) => column.id === overId);
    if (overColumn) previewTaskMove(activeTaskId, overColumn);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveColumn(null);
    setActiveId(null);

    if (!over) {
      resetTasks?.();
      return;
    }

    if (active.data.current?.type === "Column") {
      if (active.id !== over.id) {
        const oldIndex = columns.findIndex((column) => column.id === active.id);
        const newIndex = columns.findIndex((column) => column.id === over.id);

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

    const activeGroup = getTaskGroupValue(activeTask);
    const tasksInGroup = tasks.filter(
      (task) => getTaskGroupValue(task) === activeGroup,
    );
    const newIndex = tasksInGroup.findIndex((task) => task.id === activeTaskId);

    if (groupBy === "status" && activeGroup) {
      reorderTask(activeTaskId, activeGroup, newIndex, tasks);
    } else if (groupBy === "priority") {
      updateTask(activeTaskId, {
        priorityId: activeGroup === "no-priority" ? undefined : activeGroup,
      });
    } else if (groupBy === "assignee") {
      updateTask(activeTaskId, {
        assigneeId: activeGroup === "unassigned" ? undefined : activeGroup,
      });
    }
  };

  const handleDragCancel = () => {
    setActiveColumn(null);
    setActiveId(null);
    resetTasks?.();
  };

  return {
    activeId,
    activeColumn,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragCancel,
  };
}
