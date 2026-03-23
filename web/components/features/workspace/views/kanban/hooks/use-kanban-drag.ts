import { useState } from "react";
import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { ViewColumn, Task } from "../../../store/mock-data";

interface UseKanbanDragProps {
  columns: any[]; // Supports ViewColumn or Member-based columns
  groupBy: "status" | "assignee" | "priority" | "dueDate" | "tag";
  activeViewId: string;
  reorderTask: (taskId: string, newStatus: string, newIndex: number) => void;
  tasks: Task[];
  updateTaskStatus: (taskId: string, statusId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  moveColumnInView: (
    viewId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  priorities: any[];
  tags: any[];
  reorderPriorities: (newOrder: any[]) => void;
  reorderTags: (newOrder: any[]) => void;
  updateView: (projectId: string, viewId: string, updates: any) => void;
  projectId: string;
}

export function useKanbanDrag({
  columns,
  groupBy,
  activeViewId,
  updateTaskStatus,
  updateTask,
  moveColumnInView,
  reorderTask,
  priorities,
  tags,
  reorderPriorities,
  reorderTags,
  tasks,
  updateView,
  projectId,
}: UseKanbanDragProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<ViewColumn | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "Column") {
      setActiveColumn(event.active.data.current.column);
      setActiveId(null);
      return;
    }
    setActiveId(event.active.id as string);
    setActiveColumn(null);
  };

  // Calculate Group Value from a Column ID
  const getGroupValueFromColumnId = (colId: string) => {
    const col = columns.find((c) => c.id === colId);
    if (!col) return colId; // Fallback

    if (groupBy === "status")
      return "statusId" in col ? (col as any).statusId : col.id;
    if (groupBy === "priority")
      return "statusId" in col ? (col as any).statusId : col.id; // priorityId stored in statusId for dynamic cols
    if (groupBy === "tag")
      return "statusId" in col ? (col as any).statusId : col.id; // tagId stored in statusId
    if (groupBy === "assignee")
      return col.id === "unassigned" ? "unassigned" : col.id;
    return colId;
  };

  const getTaskGroupValue = (task: Task) => {
    if (groupBy === "status") return task.status;
    if (groupBy === "assignee") return task.assigneeId || "unassigned";
    if (groupBy === "priority") return task.priorityId; // Can be undefined
    if (groupBy === "tag") return task.tags?.[0]; // Can be undefined
    return undefined;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    // Only handle Task dragging in DragOver for live preview
    if (active.data.current?.type !== "Task") return;
    if (groupBy === "tag") return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overTask = tasks.find((t) => t.id === overId);
    const overColumn = columns.find((c) => c.id === overId);

    // 1. Moving Over Another Task
    if (overTask) {
      const activeGroup = getTaskGroupValue(activeTask);
      const overGroup = getTaskGroupValue(overTask);

      // If sorting items in DIFFERENT lists
      if (activeGroup !== overGroup) {
        const newGroupValue = overGroup;

        // Find relative index in target group
        const tasksInTarget = tasks.filter(
          (t) => getTaskGroupValue(t) === newGroupValue,
        );
        const overIndex = tasksInTarget.findIndex((t) => t.id === overId);

        if (overIndex >= 0) {
          if (groupBy === "status") {
            reorderTask(activeId, newGroupValue as string, overIndex);
          } else if (groupBy === "priority") {
            // Check if newGroupValue is 'no-priority' (undefined or special ID?)
            // Usually overTask.priorityId is the value.
            updateTask(activeId, { priorityId: newGroupValue as string });
          } else if (groupBy === "assignee") {
            const newAssigneeId =
              newGroupValue === "unassigned"
                ? undefined
                : (newGroupValue as string);
            updateTask(activeId, { assigneeId: newAssigneeId });
          }
        }
      }
    }

    // 2. Moving Over an Empty Column (Container)
    if (overColumn) {
      const targetGroupVal = getGroupValueFromColumnId(overColumn.id);
      const currentGroupVal = getTaskGroupValue(activeTask);

      if (currentGroupVal !== targetGroupVal) {
        if (groupBy === "status") {
          const tasksInCol = tasks.filter(
            (t) => t.status === targetGroupVal,
          ).length;
          reorderTask(activeId, targetGroupVal as string, tasksInCol);
        } else if (groupBy === "priority") {
          // Handle 'no-priority' column logic if needed
          // If targetGroupVal corresponds to 'no-priority' column ID?
          // In generating columns: 'no-priority' col has statusId/id?
          // Usually we mapped it.
          // If targetGroupVal is literally the ID we want to set.
          // If targetGroupVal is 'no-priority', we set undefined?
          const newPriorityId =
            targetGroupVal === "no-priority" || !targetGroupVal
              ? undefined
              : (targetGroupVal as string);
          updateTask(activeId, { priorityId: newPriorityId });
        } else if (groupBy === "assignee") {
          const newAssigneeId =
            targetGroupVal === "unassigned" || !targetGroupVal
              ? undefined
              : (targetGroupVal as string);
          updateTask(activeId, { assigneeId: newAssigneeId });
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveColumn(null);
    setActiveId(null);

    if (!over) return;

    // Handling Column Reordering
    if (active.data.current?.type === "Column") {
      if (active.id !== over.id) {
        const oldIndex = columns.findIndex((c) => c.id === active.id);
        const newIndex = columns.findIndex((c) => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          if (groupBy === "status") {
            if (activeViewId)
              moveColumnInView(activeViewId, oldIndex, newIndex);
          } else if (
            groupBy === "priority" ||
            groupBy === "tag" ||
            groupBy === "assignee"
          ) {
            // Allow reordering of ANY column (including 'no-priority', 'no-tag', 'unassigned')
            // We persist the visual order in the View settings via columnOrder.
            const allColumnIds = columns.map((c) => c.id);
            const newOrderIds = arrayMove(allColumnIds, oldIndex, newIndex);

            if (projectId && activeViewId) {
              updateView(projectId, activeViewId, { columnOrder: newOrderIds });
            }
          }
        }
      }
    }
    // Remove the premature return here to allow task reordering logic to run
    // return;

    // Handling Task Dragging (Final Sort)
    // Cross-column moves usually handled in DragOver now.
    // We just handle reordering within current list here to persist final index accurately.
    const activeTaskId = active.id as string;
    const overId = over!.id as string;

    if (activeTaskId !== overId) {
      const activeTask = tasks.find((t) => t.id === activeTaskId);
      const overTask = tasks.find((t) => t.id === overId); // Might be same item if moved in DragOver?

      if (activeTask && overTask) {
        // Both are tasks
        const activeGroup = getTaskGroupValue(activeTask!);
        const overGroup = getTaskGroupValue(overTask!);

        // Same group sorting
        if (activeGroup === overGroup) {
          const tasksInGroup = tasks.filter(
            (t) => getTaskGroupValue(t) === activeGroup,
          );
          const oldIndex = tasksInGroup.findIndex((t) => t.id === activeTaskId);
          const newIndex = tasksInGroup.findIndex((t) => t.id === overId);

          if (oldIndex !== newIndex) {
            if (groupBy === "status") {
              // Only status view supports custom ordering persistence currently
              reorderTask(activeTaskId, activeGroup as string, newIndex);
            }
          }
        }
      }
    }
  };

  return {
    activeId,
    setActiveId,
    activeColumn,
    setActiveColumn,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragOver, // Exported
  };
}
