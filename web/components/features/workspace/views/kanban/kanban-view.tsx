"use client";

import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./column";
import { TaskCard } from "../../modules/task/card";
import { useKanbanDrag } from "./hooks/use-kanban-drag";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Task } from "../../store/mock-data";

interface KanbanViewProps {
  projectId: string;
  tasks: Task[];
  activeView: any;
  priorities: any[];
  tags: any[];
  groupBy: string;
  displayColumns: any[];
  // Actions
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
  onCreateColumn: (title: string, category: string) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onTaskClick: (taskId: string) => void;
  onCreateTask: (taskProps: any) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onUpdateColumn: (columnId: string, updates: any) => Promise<void>;
  viewSettings: {
    showTags: boolean;
    showAssignee: boolean;
    showDueDate: boolean;
    showPriority: boolean;
    cardProperties?: string[];
  };
}

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
  onCreateColumn,
  onDeleteColumn,
  onTaskClick,
  onCreateTask,
  onDeleteTask,
  onUpdateColumn,
  viewSettings = {
    showTags: true,
    showAssignee: true,
    showDueDate: true,
    showPriority: true,
    cardProperties: [],
  },
}: KanbanViewProps) {
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnCategory, setNewColumnCategory] = useState<
    "todo" | "in-progress" | "done"
  >("todo");
  const [isAddingColumn, setIsAddingColumn] = useState(false);

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

  const handleCreateColumnTrigger = async () => {
    if (!newColumnTitle.trim()) {
      setIsAddingColumn(false);
      return;
    }
    await onCreateColumn(newColumnTitle, newColumnCategory);
    setNewColumnTitle("");
    setIsAddingColumn(false);
    setNewColumnCategory("todo");
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <div className="flex-1 h-full overflow-x-auto overflow-y-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
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
                tasks={tasks.filter((t) => {
                  if (groupBy === "status") {
                    return (
                      t.status === col.statusId ||
                      t.columnId === col.id ||
                      (t.status === "todo" && col.category === "todo")
                    );
                  } else if (groupBy === "assignee") {
                    return col.id === "unassigned"
                      ? !t.assignee
                      : t.assignee === col.id;
                  } else if (groupBy === "priority") {
                    return col.id === "no-priority"
                      ? !t.priorityId
                      : t.priorityId === col.id;
                  } else if (groupBy === "tag") {
                    return col.id === "no-tag"
                      ? !t.tags || t.tags.length === 0
                      : t.tags?.includes(col.id);
                  }
                  return false;
                })}
                onCreateTask={() => onCreateTask({ columnId: col.id })}
                color={col.color}
                viewSettings={viewSettings}
                onTaskClick={onTaskClick}
                onDeleteTask={onDeleteTask}
                onRename={(newTitle) =>
                  onUpdateColumn(col.id, { title: newTitle })
                }
                onDelete={() => onDeleteColumn(col.id)}
              />
            ))}
          </SortableContext>

          {/* Add Column Button Removed as per user request */}
        </div>

        <DragOverlay>
          {activeColumn ? (
            <KanbanColumn
              id={activeColumn.id}
              column={activeColumn}
              tasks={tasks.filter((t) => t.columnId === activeColumn.id)}
              onTaskClick={() => {}}
              onCreateTask={() => {}}
              viewSettings={{ showTags: true, showAssignee: true, showDueDate: true, showPriority: true }}
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
