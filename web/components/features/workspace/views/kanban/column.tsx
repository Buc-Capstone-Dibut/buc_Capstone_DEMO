/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Pencil,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableTaskCard } from "../../modules/task/draggable-card";
import { Task, CustomFieldConfig } from "../../store/mock-data";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";

// Predefined colors
const COLUMN_COLORS = [
  { name: "Gray", value: "bg-slate-100", border: "border-slate-200" },
  { name: "Red", value: "bg-red-50", border: "border-red-200" },
  { name: "Orange", value: "bg-orange-50", border: "border-orange-200" },
  { name: "Amber", value: "bg-amber-50", border: "border-amber-200" },
  { name: "Green", value: "bg-green-50", border: "border-green-200" },
  { name: "Blue", value: "bg-blue-50", border: "border-blue-200" },
  { name: "Indigo", value: "bg-indigo-50", border: "border-indigo-200" },
  { name: "Violet", value: "bg-violet-50", border: "border-violet-200" },
  { name: "Pink", value: "bg-pink-50", border: "border-pink-200" },
];

interface KanbanColumnProps {
  id: string;
  column: any; // Full column object for advanced usage
  title?: string;
  tasks: Task[];
  customFields?: CustomFieldConfig[];
  isOverlay?: boolean;
  icon?: React.ReactNode | string;
  color?: string; // e.g. "red", "blue" - maps to predefined colors
  onTaskClick: (taskId: string) => void;
  onCreateTask: () => void;
  onRename?: (newTitle: string) => void;
  onUpdate?: (updates: any) => void;
  onDelete?: () => void;
  viewSettings: {
    showTags: boolean;
    showAssignee: boolean;
    showDueDate: boolean;
    showPriority: boolean;
    cardProperties?: string[];
  };
  groupBy?: string;
  category?: "todo" | "in-progress" | "done";
  onDeleteTask?: (taskId: string) => void;
  className?: string;
  disableTaskDrag?: boolean;
  allowColumnActions?: boolean;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  customFields,
  icon,
  color,
  onTaskClick,
  onCreateTask,
  onRename,
  onUpdate,
  onDelete,
  viewSettings,
  groupBy = "status",
  category,
  onDeleteTask,
  className,
  disableTaskDrag = false,
  allowColumnActions = true,
}: KanbanColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: id,
    data: {
      type: "Column",
      column: { id, title },
    },
    disabled: groupBy !== "status", // Disable column DnD if not grouping by status
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title ?? "");

  // Determine styles from color prop
  const colorConfig =
    COLUMN_COLORS.find(
      (c) =>
        c.name.toLowerCase() === color?.toLowerCase() ||
        c.value.includes(color || ""),
    ) || COLUMN_COLORS[0];

  const handleTitleSubmit = () => {
    setIsEditing(false);
    if (editedTitle.trim() !== (title ?? "") && onRename) {
      onRename(editedTitle.trim());
    } else {
      setEditedTitle(title ?? "");
    }
  };

  const showColumnActions =
    allowColumnActions && (!!onRename || !!onUpdate || !!onDelete);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "h-full w-80 flex-shrink-0 rounded-xl bg-slate-100/50 border-2 border-dashed border-primary/20 opacity-50",
        )}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "h-full w-80 flex-shrink-0 flex flex-col group/column rounded-xl border shadow-sm transition-all",
        colorConfig.value,
        colorConfig.border,
        className,
      )}
      {...(groupBy === "status" ? attributes : {})}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-3 hover:bg-black/5 transition-colors",
          groupBy === "status" && "cursor-grab active:cursor-grabbing",
        )}
        {...(groupBy === "status" ? listeners : {})}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={cn(
              "px-2 py-0.5 rounded text-xs font-semibold capitalize flex items-center gap-1.5 border",
              // Use the column's color config for the header badge background
              // We make it slightly more opaque/bold than the column background if needed,
              // or just match the column's theme.
              // Here uses the same background logic but adds a border for definition.
              colorConfig?.value
                ? `${colorConfig.value} ${colorConfig.border} text-slate-700`
                : "bg-slate-100 border-slate-200 text-slate-700",
            )}
          >
            {/* If column has explicit category or color config */}
            {category && (
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
            )}
            {typeof icon === "string" ? <span>{icon}</span> : icon}
            {!isEditing ? (
              <span className="truncate">{title}</span>
            ) : (
              <Input
                className="h-6 w-full text-xs px-1 py-0 bg-white border-primary focus-visible:ring-1"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  e.stopPropagation(); // Prevent DnD or other listeners from catching Space/Enter
                }}
                autoFocus
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking input
              />
            )}
            <span className="ml-1 text-muted-foreground font-normal opacity-70">
              {tasks.length}
            </span>
          </div>
        </div>

        <div className="flex items-center opacity-0 group-hover/column:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-slate-200"
            onClick={onCreateTask}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {showColumnActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:bg-slate-200"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onRename && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    이름 변경
                  </DropdownMenuItem>
                )}

                {onUpdate && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Palette className="h-4 w-4 mr-2" />
                      섹션 색상
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-40">
                      {COLUMN_COLORS.map((c) => (
                        <DropdownMenuItem
                          key={c.name}
                          onClick={() => onUpdate({ color: c.name })}
                          className="flex items-center gap-2"
                        >
                          <div
                            className={`w-4 h-4 rounded-full ${c.value} border ${c.border}`}
                          />
                          {c.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}

                {groupBy === "status" && onUpdate && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onUpdate({ category: "todo" })}
                    >
                      할 일 (Todo)로 설정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onUpdate({ category: "in-progress" })}
                    >
                      진행 중 (In Progress)으로 설정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onUpdate({ category: "done" })}
                    >
                      완료 (Done)로 설정
                    </DropdownMenuItem>
                  </>
                )}

                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      onClick={onDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      섹션 삭제
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 p-2 overflow-y-auto min-h-0 bg-transparent flex flex-col gap-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              customFields={customFields ?? []}
              showTags={viewSettings?.showTags ?? true}
              showAssignee={viewSettings?.showAssignee ?? true}
              showDueDate={viewSettings?.showDueDate ?? true}
              showPriority={viewSettings?.showPriority ?? true}
              cardProperties={viewSettings?.cardProperties || []}
              onClick={() => onTaskClick(task.id)}
              onDelete={onDeleteTask ? () => onDeleteTask(task.id) : undefined}
              disableDrag={disableTaskDrag}
            />
          ))}
        </SortableContext>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground/50 hover:text-muted-foreground h-8 text-sm"
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag interaction or other bubbling
            onCreateTask();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Plus className="h-3.5 w-3.5 mr-2" /> 새 태스크
        </Button>
      </div>
    </div>
  );
}
