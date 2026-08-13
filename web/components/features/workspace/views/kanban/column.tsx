/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Pencil,
  Palette,
  EyeOff,
  ChevronDown,
  ChevronUp,
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
import type { KanbanDropPreview } from "./hooks/use-kanban-drag";

// Predefined colors
const COLUMN_COLORS = [
  // Column colors are intentionally kept neutral. Color is reserved for task
  // accents so the board stays visually close to a clean, card-first layout.
  { name: "Gray", value: "bg-transparent", border: "border-transparent" },
  { name: "Red", value: "bg-transparent", border: "border-transparent" },
  { name: "Orange", value: "bg-transparent", border: "border-transparent" },
  { name: "Amber", value: "bg-transparent", border: "border-transparent" },
  { name: "Green", value: "bg-transparent", border: "border-transparent" },
  { name: "Blue", value: "bg-transparent", border: "border-transparent" },
  { name: "Indigo", value: "bg-transparent", border: "border-transparent" },
  { name: "Violet", value: "bg-transparent", border: "border-transparent" },
  { name: "Pink", value: "bg-transparent", border: "border-transparent" },
];

interface KanbanColumnProps {
  id: string;
  column: any; // Full column object for advanced usage
  title?: string;
  tasks: Task[];
  customFields?: CustomFieldConfig[];
  icon?: React.ReactNode | string;
  color?: string; // e.g. "red", "blue" - maps to predefined colors
  onTaskClick: (taskId: string) => void;
  onCreateTask: () => void;
  onRename?: (newTitle: string) => void;
  onUpdate?: (updates: any) => void;
  onDelete?: () => void;
  onHide?: () => void;
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
  dropPreview?: KanbanDropPreview | null;
  activeTaskId?: string | null;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  customFields,
  icon,
  onTaskClick,
  onCreateTask,
  onRename,
  onUpdate,
  onDelete,
  onHide,
  viewSettings,
  groupBy = "status",
  category,
  onDeleteTask,
  className,
  disableTaskDrag = false,
  allowColumnActions = true,
  dropPreview,
  activeTaskId,
}: KanbanColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: id,
    data: {
      type: "Column",
      column: { id, title },
    },
    // status 외 그룹핑에서는 "컬럼 재정렬"만 막고, 컬럼을 드롭 대상으로는 유지한다.
    // (이전엔 disabled:true가 droppable까지 꺼서 우선순위·담당자·태그 뷰의 빈 컬럼에
    //  task를 떨어뜨릴 수 없었음 — 빈 컬럼 이동 버그의 근본 원인)
    disabled: { draggable: groupBy !== "status", droppable: false },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title ?? "");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const wipLimit = category === "in-progress" ? 5 : null;
  const isAtWipLimit = wipLimit !== null && tasks.length >= wipLimit;
  const previewTasks = tasks.filter((task) => task.id !== activeTaskId);
  const indicatorBeforeTaskId = dropPreview
    ? previewTasks[dropPreview.index]?.id
    : undefined;
  const showEndDropIndicator = Boolean(
    dropPreview && !indicatorBeforeTaskId,
  );
  const getSortableTaskId = (taskId: string) =>
    groupBy === "assignee" ? `${taskId}::assignee::${id}` : taskId;
  const {
    setNodeRef: setTaskAreaRef,
    isOver: isTaskAreaOver,
  } = useDroppable({
    id: `column-drop-${id}`,
    data: {
      type: "ColumnDropZone",
      columnId: id,
    },
    disabled: disableTaskDrag,
  });

  const handleTitleSubmit = () => {
    setIsEditing(false);
    if (editedTitle.trim() !== (title ?? "") && onRename) {
      onRename(editedTitle.trim());
    } else {
      setEditedTitle(title ?? "");
    }
  };

  const showColumnActions =
    allowColumnActions && (!!onRename || !!onUpdate || !!onDelete || !!onHide);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "h-full w-80 flex-shrink-0 rounded-md border-2 border-dashed border-slate-300 bg-transparent opacity-50",
        )}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "h-full w-[calc(100vw-2rem)] max-w-80 snap-start flex-shrink-0 flex flex-col group/column rounded-md border border-transparent bg-transparent transition-all sm:w-80",
        // 드래그 중인 task가 이 컬럼 위에 올라오면 드롭 대상임을 시각적으로 표시
        isOver && "ring-2 ring-primary/50 ring-offset-1",
        isCollapsed && "h-auto self-start",
        className,
      )}
      {...(groupBy === "status" ? attributes : {})}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between border-b border-border/70 px-1.5 py-1 transition-colors",
          groupBy === "status" && "cursor-grab active:cursor-grabbing",
        )}
        {...(groupBy === "status" ? listeners : {})}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-none border-0 px-0 py-0.5 text-xs font-semibold capitalize text-slate-700",
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
            <span
              className={cn(
                "ml-1 font-normal text-muted-foreground opacity-70",
                isAtWipLimit && "font-semibold text-amber-600 opacity-100",
              )}
              title={
                wipLimit === null
                  ? undefined
                  : `권장 진행 작업 수 ${wipLimit}개`
              }
            >
              {wipLimit === null ? tasks.length : `${tasks.length}/${wipLimit}`}
            </span>
          </div>
        </div>

        <div className="flex items-center transition-opacity sm:opacity-0 sm:group-hover/column:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-muted"
            aria-label={isCollapsed ? "컬럼 펼치기" : "컬럼 접기"}
            title={isCollapsed ? "컬럼 펼치기" : "컬럼 접기"}
            onClick={() => setIsCollapsed((current) => !current)}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-muted"
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
                  className="h-7 w-7 text-muted-foreground hover:bg-muted"
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

                {onHide && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onHide}>
                      <EyeOff className="h-4 w-4 mr-2" />
                      이 섹션 보기 끄기
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Task List */}
      {!isCollapsed && (
        <div
          className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto bg-transparent px-0 py-1"
        >
          <SortableContext
            items={tasks.map((task) => getSortableTaskId(task.id))}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <DraggableTaskCard
                key={getSortableTaskId(task.id)}
                task={task}
                sortableId={getSortableTaskId(task.id)}
                sourceColumnId={id}
                customFields={customFields ?? []}
                showTags={viewSettings?.showTags ?? true}
                showAssignee={viewSettings?.showAssignee ?? true}
                showDueDate={viewSettings?.showDueDate ?? true}
                showPriority={viewSettings?.showPriority ?? true}
                cardProperties={viewSettings?.cardProperties || []}
                onClick={() => onTaskClick(task.id)}
                onDelete={
                  onDeleteTask ? () => onDeleteTask(task.id) : undefined
                }
                disableDrag={disableTaskDrag}
                dropIndicator={
                  indicatorBeforeTaskId === task.id ? "before" : undefined
                }
              />
            ))}
          </SortableContext>
          <div
            ref={setTaskAreaRef}
            className={cn(
              "relative shrink-0 rounded-sm transition-colors",
              tasks.length === 0 && "min-h-[120px]",
              isTaskAreaOver && "bg-primary/[0.03]",
            )}
          >
            {showEndDropIndicator ? (
              <div
                className="pointer-events-none absolute inset-x-1 top-0 z-30 h-0.5 rounded-full bg-primary"
                aria-hidden="true"
              />
            ) : null}
            <Button
              variant="ghost"
              className="h-8 w-full justify-start text-sm text-muted-foreground/50 hover:text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onCreateTask();
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Plus className="h-3.5 w-3.5 mr-2" /> 새 태스크
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
