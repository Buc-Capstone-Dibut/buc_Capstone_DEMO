"use client";

import { memo } from "react";
import {
  useWorkspaceStore,
  Task,
  CustomFieldConfig,
} from "../../store/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Calendar as CalendarIcon,
  Pen,
  User,
  Trash,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";
import {
  formatTaskDateRange,
  getTodayDateKey,
} from "@/lib/workspace/task-dates";

interface TaskCardProps {
  task: Task;
  customFields?: CustomFieldConfig[];
  isOverlay?: boolean;
  showTags?: boolean;
  showAssignee?: boolean; // Added missing prop
  showDueDate?: boolean;
  showPriority?: boolean;
  cardProperties?: string[];
  onEdit?: () => void;
  onDelete?: () => void;
}

const TASK_ACCENT_CLASSES: Record<string, string> = {
  slate: "bg-slate-500",
  gray: "bg-gray-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
};

function getTaskAccentClass(color?: string | null) {
  if (!color) return "bg-primary/20";

  const classColor = color.match(/(?:bg|text)-([a-z]+)-/)?.[1];
  const plainColor = color.trim().toLowerCase();
  return (
    TASK_ACCENT_CLASSES[classColor || plainColor] || "bg-primary/20"
  );
}

function TaskCardImpl({
  task,
  isOverlay,
  showTags = true,
  showAssignee = true,
  showDueDate = true,
  showPriority = true,
  cardProperties,
  onEdit,
  onDelete,
}: TaskCardProps) {
  // Slice selectors instead of subscribing to the whole store, so a card does
  // NOT re-render when unrelated store slices change (e.g. activeTaskId on click).
  const tags = useWorkspaceStore((s) => s.tags);
  const priorities = useWorkspaceStore((s) => s.priorities);
  const taskWithDocuments = task as Task & {
    primaryDocument?: {
      id: string;
      title: string;
      emoji?: string | null;
    } | null;
    documentCount?: number;
  };
  const primaryDocument = taskWithDocuments.primaryDocument || null;
  const documentCount =
    typeof taskWithDocuments.documentCount === "number"
      ? taskWithDocuments.documentCount
      : primaryDocument
        ? 1
        : 0;

  // Default order if not provided or empty
  const propertyOrder =
    cardProperties && cardProperties.length > 0
      ? cardProperties
      : ["title", "priority", "tags", "assignee", "dueDate"];

  const visibleProperties = new Set(propertyOrder);
  const priority = priorities.find(
    (item) => item.id.toLowerCase() === task.priorityId?.toLowerCase(),
  );
  const visibleTags = (task.tags || []).map((tagIdentifier, index) => {
    const tag =
      tags.find((item) => item.id === tagIdentifier) ||
      tags.find((item) => item.name === tagIdentifier) || {
        id: `temp-${index}`,
        name: tagIdentifier,
        color: "gray",
      };
    const colorClass =
      tag.color.includes("bg-") || tag.color.includes("text-")
        ? tag.color
        : `bg-${tag.color}-100 text-${tag.color}-700`;

    return { ...tag, colorClass };
  });

  const completedSubtasks =
    task.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  // Keep one fixed-width, non-interactive accent across every Kanban card.
  const firstTagId = task.tags?.[0];
  const firstTag = firstTagId
    ? tags.find((t) => t.id === firstTagId || t.name === firstTagId)
    : undefined;

  const currentAccent = priority
    ? getTaskAccentClass(priority.color)
    : firstTag
      ? getTaskAccentClass(firstTag.color)
      : "bg-primary/20 hover:bg-primary/40";

  return (
    <Card
      className={`relative cursor-pointer overflow-hidden rounded-md border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_10px_rgba(15,23,42,0.10)] ${isOverlay ? "cursor-grabbing scale-[1.02] shadow-xl" : ""}`}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1",
          currentAccent,
        )}
        aria-hidden="true"
      />

      <CardContent className="p-3">

        {/* Task Settings Button - DropdownMenu */}
        <div className="absolute right-2 top-2 z-30">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-sm text-muted-foreground hover:bg-muted pointer-events-auto ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
              className="w-48"
            >
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (onEdit) onEdit();
                }}
              >
                <Pen className="mr-2 h-4 w-4" /> Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  console.log("Assignee clicked");
                }}
              >
                <User className="mr-2 h-4 w-4" /> Change Assignee
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDelete) onDelete();
                }}
              >
                <Trash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {(visibleProperties.has("priority") && showPriority && priority) ||
        (visibleProperties.has("tags") && showTags && visibleTags.length > 0) ? (
          <div className="mb-1.5 flex min-h-4 items-center gap-1 pr-6">
            {visibleProperties.has("priority") && showPriority && priority && (
              <Badge
                variant="outline"
                className={cn(
                  "h-4 rounded-sm px-1.5 py-0 text-[9px] font-semibold leading-none",
                  priority.color,
                )}
              >
                {priority.name}
              </Badge>
            )}
            {visibleProperties.has("tags") &&
              showTags &&
              visibleTags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className={cn(
                    "h-4 rounded-sm border-0 px-1.5 py-0 text-[9px] font-medium leading-none",
                    tag.colorClass,
                  )}
                >
                  {tag.name}
                </Badge>
              ))}
          </div>
        ) : null}

        <div className="line-clamp-2 pr-6 text-[13px] font-semibold leading-[1.35] text-slate-800">
          {task.title}
        </div>

        {documentCount > 0 && (
          <div className="mt-1 flex items-center gap-1 pr-5 text-[10px] text-muted-foreground">
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {primaryDocument?.emoji ? `${primaryDocument.emoji} ` : ""}
              {primaryDocument?.title || "연결 문서"}
            </span>
            {documentCount > 1 && <span>+{documentCount - 1}</span>}
          </div>
        )}

        {(visibleProperties.has("dueDate") &&
          showDueDate &&
          (task.startDate || task.endDate)) ||
        (visibleProperties.has("assignee") && showAssignee && task.assignee) ||
        totalSubtasks > 0 ? (
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-muted-foreground">
            <div
              className={cn(
                "flex min-w-0 items-center gap-1",
                task.endDate && task.endDate < getTodayDateKey()
                  ? "font-medium text-orange-500"
                  : "",
              )}
            >
              {visibleProperties.has("dueDate") &&
                showDueDate &&
                (task.startDate || task.endDate) && (
                  <>
                    <CalendarIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {formatTaskDateRange(task.startDate, task.endDate)}
                    </span>
                  </>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {totalSubtasks > 0 && (
                <span>
                  {completedSubtasks}/{totalSubtasks}
                </span>
              )}
              {visibleProperties.has("assignee") &&
                showAssignee &&
                task.assignee && (
                  <WorkspaceUserAvatar
                    name={task.assignee}
                    avatarUrl={task.assigneeProfile?.avatar}
                    className="h-4 w-4"
                    fallbackClassName="text-[8px]"
                  />
                )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Memoized so a parent re-render (e.g. the board re-rendering) with unchanged
// props doesn't re-render every card. Combined with the slice selectors above,
// a card only re-renders when its own task/props or tags/priorities change.
export const TaskCard = memo(TaskCardImpl);
