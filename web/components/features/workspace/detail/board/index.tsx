"use client";

import {
  useWorkspaceStore,
  Task,
  TaskStatus,
  CustomFieldConfig,
  ViewColumn,
} from "../../store/mock-data";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanColumn } from "../../views/kanban/column";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { TaskCard } from "../../modules/task/card";
import { TaskDetailModal } from "../../modules/task/detail-modal";
import { DraggablePropertySettings } from "../../modules/view-settings/property-settings";
import { ViewCreationWizard } from "../../modules/view-settings/view-creation-wizard";
import { ViewManagerModal } from "../../modules/view-settings/view-manager-modal";
import { useKanbanDrag } from "../../views/kanban/hooks/use-kanban-drag";
import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
// AdvancedTaskModal import removed
import { SmartTagPicker } from "../../modules/tag/picker";
import { TagManagerModal } from "../../modules/tag/tag-manager-modal";
import { PriorityManagerModal } from "../../modules/priority/priority-manager-modal"; // Import New Modal
import {
  Plus,
  MessageSquare,
  CheckSquare,
  MoreHorizontal,
  Pen,
  Trash,
  Users,
  KanbanSquare,
  Settings2,
  Layout,
  PlusCircle,
  List,
  Calendar as CalendarIcon,
  Tag as TagIcon,
  GripVertical,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SlidersHorizontal, Eye, Filter } from "lucide-react";

interface KanbanBoardProps {
  projectId: string;
  onNavigateToDoc?: (docId: string) => void;
}

export function KanbanBoard({ projectId, onNavigateToDoc }: KanbanBoardProps) {
  const {
    tasks,
    projects,
    createTask,
    updateTaskStatus,
    updateTask,
    addColumnToView,
    renameColumnInView,
    deleteColumnFromView,
    updateColumnInView,
    moveColumnInView,
    tags,
    priorities,
    reorderPriorities,
    reorderTags,
    updateViewCardProperties,
    updateView,
    deleteView,
    activeTaskId,
    setActiveTaskId,
  } = useWorkspaceStore();
  const project = projects.find((p) => p.id === projectId);

  // View Settings State
  const [showTags, setShowTags] = useState(true);
  const [showAssignee, setShowAssignee] = useState(true);
  const [showDueDate, setShowDueDate] = useState(true);
  const [showPriority, setShowPriority] = useState(true);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState<any>(null); // Should be BoardView type
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isPriorityManagerOpen, setIsPriorityManagerOpen] = useState(false);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnCategory, setNewColumnCategory] = useState<
    "todo" | "in-progress" | "done"
  >("todo");

  // Initialize activeViewId with the first view's ID
  const [activeViewId, setActiveViewId] = useState<string>(
    project?.views[0]?.id || "",
  );

  // Active View Logic
  const activeView = useMemo(() => {
    if (!project) return null;
    return project.views.find((v) => v.id === activeViewId) || project.views[0];
  }, [project, activeViewId]);

  const groupBy = activeView?.groupBy || "status";

  // Helper Functions for Tab Visualization
  const getViewColor = (type: string) => {
    switch (type) {
      case "kanban":
        return "bg-blue-500";
      case "list":
        return "bg-green-500";
      case "calendar":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getViewIcon = (type: string) => {
    switch (type) {
      case "kanban":
        return <KanbanSquare className="h-5 w-5 text-white" />;
      case "list":
        return <List className="h-5 w-5 text-white" />;
      case "calendar":
        return <CalendarIcon className="h-5 w-5 text-white" />;
      default:
        return <Layout className="h-5 w-5 text-white" />;
    }
  };

  // Derive Columns based on GroupBy state
  const columns = useMemo(() => {
    if (!project) return [];
    if (groupBy === "assignee") {
      // 1. Generate columns for each member
      const memberColumns = project.members.map((m) => ({
        id: m.id,
        title: m.name,
        statusId: m.name,
        icon: m.avatar || "U",
        color: m.role === "leader" ? "violet" : "blue",
      }));

      // 2. Add 'Unassigned' column
      const unassignedColumn = {
        id: "unassigned",
        title: "Unassigned",
        statusId: "unassigned",
        icon: "❓",
        color: "slate",
      };
      return [unassignedColumn, ...memberColumns];
    } else if (groupBy === "priority") {
      const priorityColumns = priorities
        .sort((a, b) => a.order - b.order)
        .map((p) => ({
          id: p.id,
          title: p.name, // Use priority name as title
          statusId: p.id, // We use priority ID as the key for filtering
          color: p.color.split(" ")[0].replace("bg-", "").replace("-100", ""), // Extract basic color name for column header
          category: "todo" as const, // Dummy category for now
        }));

      // Add 'No Priority' column
      const noPriorityColumn = {
        id: "no-priority",
        title: "No Priority",
        statusId: "no-priority",
        color: "slate",
        category: "todo" as const,
      };

      return [noPriorityColumn, ...priorityColumns];
    } else if (groupBy === "tag") {
      const tagColumns = tags.map((t) => ({
        id: t.id,
        title: t.name,
        statusId: t.id,
        color: t.color
          .replace("bg-", "")
          .replace("-100", "")
          .replace("-500", ""),
        category: "todo" as const,
      }));

      const noTagColumn = {
        id: "no-tag",
        title: "No Tag",
        statusId: "no-tag",
        color: "slate",
        category: "todo" as const,
      };

      return [noTagColumn, ...tagColumns];
    } else {
      // For status -> Use columns from the Active View (pre-populated by addView)
      return activeView?.columns || [];
    }
  }, [project, groupBy, activeView, priorities, tags]);

  // Apply Filter and Sort based on view settings
  const filteredAndSortedColumns = useMemo(() => {
    let result = [...columns];

    // Filter Empty Columns
    if (activeView?.showEmptyGroups === false) {
      result = result.filter(
        (c) => !["no-priority", "no-tag", "unassigned"].includes(c.id),
      );
    }

    // Sort Columns
    if (activeView?.columnOrder && activeView.columnOrder.length > 0) {
      const orderMap = new Map(
        activeView.columnOrder.map((id, index) => [id, index]),
      );
      result.sort((a, b) => {
        const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
        const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
        return indexA - indexB;
      });
    }

    return result;
  }, [columns, activeView?.showEmptyGroups, activeView?.columnOrder]);

  const displayColumns = filteredAndSortedColumns;

  // Update columnIds to use displayColumns
  const columnIds = useMemo(
    () => displayColumns.map((c) => c.id),
    [displayColumns],
  );

  // Filter Tasks
  const projectTasks = tasks.filter((t) => {
    if (t.projectId !== projectId) return false;
    // Apply Tag Filter
    if (filterTagIds.length > 0) {
      if (!t.tags || t.tags.length === 0) return false;
      // Match ANY selected tag (OR logic) - or change to AND if preferred
      const hasTag = t.tags.some((tagId) => filterTagIds.includes(tagId));
      if (!hasTag) return false;
    }
    return true;
  });

  const {
    activeId,
    activeColumn,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
  } = useKanbanDrag({
    columns: displayColumns,
    groupBy,
    activeViewId: activeView?.id || "",
    projectId,
    updateTaskStatus,
    updateTask,
    moveColumnInView,
    reorderTask: useWorkspaceStore((state) => state.reorderTask), // Select it directly if possible or destructure above
    priorities,
    tags,
    reorderPriorities,
    reorderTags,
    tasks,
    updateView,
  });

  const handleAddColumn = () => {
    if (!newColumnTitle.trim() || !activeView) {
      setIsAddingColumn(false);
      return;
    }
    // Default: Status ID = Title converted to slug.
    // In a real app, we might check for status existence or create a new Status entity separately.
    addColumnToView(
      projectId,
      activeView.id,
      newColumnTitle,
      newColumnCategory,
    );
    setNewColumnTitle("");
    setIsAddingColumn(false);
    // Reset category to todo for next time
    setNewColumnCategory("todo");
  };

  if (!project) return <div>Project not found</div>;

  return (
    <div className={`flex gap-4 h-full overflow-hidden pr-2`}>
      {/* Main Board Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background rounded-2xl border shadow-sm relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {activeView?.name ||
                (groupBy === "status"
                  ? "진행 상태 칸반보드"
                  : groupBy === "priority"
                    ? "우선순위별 칸반보드"
                    : groupBy === "tag"
                      ? "태그별 칸반보드"
                      : "담당자별 칸반보드")}
            </h2>

            <div className="flex items-center">
              {(groupBy === "assignee" ||
                groupBy === "priority" ||
                groupBy === "tag") && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  (Auto-generated)
                </span>
              )}
              <Badge
                variant="secondary"
                className="font-normal text-muted-foreground ml-2"
              >
                {projectTasks.length}개
              </Badge>
            </div>
            {projectTasks.length >= 450 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 animate-pulse">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  태스크 생성 제한(500개)에 근접했습니다 ({projectTasks.length}
                  /500)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* ... (Dropdowns) ... */}
            {/* View Options Menu (Notion-style) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                {/* ... (Popover content) ... */}
                <div className="space-y-4">
                  {/* Properties Section */}
                  <div className="space-y-2">
                    {/* ... */}
                    <DraggablePropertySettings
                      properties={
                        activeView?.cardProperties || [
                          "priority",
                          "tags",
                          "title",
                          "assignee",
                          "dueDate",
                        ]
                      }
                      visibility={{
                        tags: showTags,
                        assignee: showAssignee,
                        dueDate: showDueDate,
                        priority: showPriority,
                      }}
                      onToggle={(prop) => {
                        if (prop === "tags") setShowTags(!showTags);
                        if (prop === "assignee") setShowAssignee(!showAssignee);
                        if (prop === "dueDate") setShowDueDate(!showDueDate);
                        if (prop === "priority") setShowPriority(!showPriority);
                      }}
                      onReorder={(newOrder) => {
                        if (activeView) {
                          updateViewCardProperties(activeView.id, newOrder);
                        }
                      }}
                    />
                  </div>
                  {/* ... */}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DndContext
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCorners}
          sensors={sensors}
        >
          <div className="flex gap-4 h-full overflow-x-auto pb-4 items-start px-6 pt-6">
            {/* ... (SortableContext and Columns) ... */}
            <SortableContext
              items={displayColumns.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {(displayColumns as any[]).map((col) => {
                const colTasks = projectTasks.filter((t) => {
                  // ... (Filtering logic same as before)
                  if (groupBy === "status") {
                    if ("statusId" in col) {
                      return t.status === col.statusId;
                    }
                    return t.status === col.id;
                  }
                  if (groupBy === "assignee") {
                    if (col.id === "unassigned") return !t.assignee;
                    return t.assignee === col.title;
                  }

                  if (groupBy === "priority") {
                    if (col.id === "no-priority") return !t.priorityId;
                    return (
                      t.priorityId ===
                      ("statusId" in col ? col.statusId : col.id)
                    );
                  }

                  if (groupBy === "tag") {
                    if (col.id === "no-tag")
                      return !t.tags || t.tags.length === 0;
                    return (
                      t.tags &&
                      t.tags[0] === ("statusId" in col ? col.statusId : col.id)
                    );
                  }

                  return false;
                });

                return (
                  <KanbanColumn
                    key={col.id}
                    id={col.id}
                    column={col} // Pass full column object for overlay
                    title={col.title}
                    color={"color" in col ? col.color : undefined}
                    tasks={colTasks}
                    customFields={project.customFields || []}
                    groupBy={groupBy}
                    icon={"avatar" in col ? (col.avatar as string) : undefined}
                    onTaskClick={setActiveTaskId}
                    onCreateTask={() => {
                      // ... (Create Task Logic same as before)
                      const defaultProps: any = {
                        projectId,
                        title: "New Task",
                        customFieldValues: [],
                      };
                      if (groupBy === "status") {
                        defaultProps.status =
                          "statusId" in col ? col.statusId : col.id;
                      } else if (groupBy === "assignee") {
                        defaultProps.status = "todo";
                        if (col.id !== "unassigned")
                          defaultProps.assignee = col.title;
                      } else if (groupBy === "priority") {
                        defaultProps.status = "todo";
                        if (col.id !== "no-priority")
                          defaultProps.priorityId =
                            "statusId" in col ? col.statusId : col.id;
                      } else if (groupBy === "tag") {
                        defaultProps.status = "todo";
                        if (col.id !== "no-tag")
                          defaultProps.tags = [
                            "statusId" in col ? col.statusId : col.id,
                          ];
                      }
                      const newTaskId = createTask(defaultProps);
                      if (newTaskId) {
                        setActiveTaskId(newTaskId);
                      }
                    }}
                    onRename={(newTitle: string) =>
                      activeView
                        ? renameColumnInView(activeView.id, col.id, newTitle)
                        : null
                    }
                    onUpdate={(updates: any) =>
                      activeView
                        ? updateColumnInView(activeView.id, col.id, updates)
                        : null
                    }
                    onDelete={() =>
                      activeView
                        ? deleteColumnFromView(activeView.id, col.id)
                        : null
                    }
                    viewSettings={{
                      showTags,
                      showAssignee,
                      showDueDate,
                      showPriority,
                      cardProperties: activeView?.cardProperties,
                    }}
                    category={
                      "category" in col ? (col as any).category : undefined
                    }
                  />
                );
              })}
            </SortableContext>
          </div>

          <DragOverlay>
            {/* ... (DragOverlay content same as before) ... */}
            {activeId ? (
              <TaskCard
                task={tasks.find((t) => t.id === activeId)!}
                customFields={project.customFields || []}
                isOverlay
                showTags={showTags}
                showAssignee={showAssignee}
                showDueDate={showDueDate}
                showPriority={showPriority}
              />
            ) : activeColumn ? (
              <KanbanColumn
                id={(activeColumn as any).id}
                column={activeColumn as any}
                title={(activeColumn as any).title}
                color={
                  "color" in activeColumn
                    ? (activeColumn as any).color
                    : undefined
                }
                tasks={projectTasks.filter((t) => {
                  // ... (Filter logic for overlay)
                  const col = activeColumn as any;
                  if (groupBy === "status") {
                    if ("statusId" in col) return t.status === col.statusId;
                    return t.status === col.id;
                  }
                  if (groupBy === "assignee") {
                    if (col.id === "unassigned")
                      return !t.assignee || t.assignee === "unassigned";
                    return t.assignee === col.title;
                  }

                  if (groupBy === "priority") {
                    if (col.id === "no-priority") return !t.priorityId;
                    return (
                      t.priorityId ===
                      ("statusId" in col ? col.statusId : col.id)
                    );
                  }

                  if (groupBy === "tag") {
                    if (col.id === "no-tag")
                      return !t.tags || t.tags.length === 0;
                    return (
                      t.tags &&
                      t.tags[0] === ("statusId" in col ? col.statusId : col.id)
                    );
                  }

                  return false;
                })}
                customFields={project.customFields || []}
                groupBy={groupBy}
                icon={
                  "avatar" in activeColumn
                    ? ((activeColumn as any).avatar as string)
                    : undefined
                }
                onTaskClick={() => {}}
                onCreateTask={() => {}}
                onRename={() => {}}
                onUpdate={() => {}}
                onDelete={() => {}}
                category={
                  "category" in activeColumn
                    ? (activeColumn as any).category
                    : undefined
                }
                viewSettings={{
                  showTags,
                  showAssignee,
                  showDueDate,
                  showPriority,
                  cardProperties: activeView?.cardProperties,
                }}
                isOverlay
                className="rotate-2 scale-105 shadow-2xl opacity-90 ring-1 ring-primary/20"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Right-Side Notebook Tabs - HIDDEN IN EMBEDDED MODE */}

      <div className="w-14 flex flex-col gap-4 pt-10">
        {project?.views.map((view) => (
          <div key={view.id} className="relative group">
            <NotebookTab
              label={view.name}
              active={activeViewId === view.id}
              onClick={() => setActiveViewId(view.id)}
              color={
                view.color
                  ? `bg-${view.color}-500`
                  : view.groupBy === "status"
                    ? "bg-green-500"
                    : "bg-blue-500"
              }
              icon={
                view.icon ? (
                  <span className="text-xl leading-none">{view.icon}</span>
                ) : view.groupBy === "status" ? (
                  <KanbanSquare className="h-5 w-5 text-white" />
                ) : view.groupBy === "assignee" ? (
                  <Users className="h-5 w-5 text-white" />
                ) : view.groupBy === "tag" ? (
                  <TagIcon className="h-5 w-5 text-white" />
                ) : (
                  <Layout className="h-5 w-5 text-white" />
                )
              }
            />
          </div>
        ))}

        {activeView && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <NotebookTab
                  label="뷰 관리"
                  active={false}
                  onClick={() => {}}
                  color="bg-muted-foreground/10"
                  icon={<Settings2 className="h-5 w-5 text-muted-foreground" />}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="right"
              className="w-48 ml-2"
            >
              {/* ... (Menu items same as before) ... */}
              <DropdownMenuLabel>
                현재 뷰: <span className="text-primary">{activeView.name}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setViewToEdit(activeView)}>
                <Pen className="mr-2 h-4 w-4" />
                이름 및 색상 수정
              </DropdownMenuItem>
              {!activeView.isSystem && (
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => {
                    if (confirm("정말 이 뷰를 삭제하시겠습니까?")) {
                      deleteView(projectId, activeView.id);
                      const firstView = project.views.find(
                        (v) => v.id !== activeView.id,
                      );
                      if (firstView) setActiveViewId(firstView.id);
                    }
                  }}
                >
                  <Trash className="mr-2 h-4 w-4" />뷰 삭제하기
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ... (Modals remain same) ... */}
      {/* Modal for Task Details */}
      {activeTaskId && (
        <TaskDetailModal
          taskId={activeTaskId}
          task={tasks.find((t) => t.id === activeTaskId)}
          members={project.members}
          availableTags={tags}
          detailedTags={tags}
          onClose={() => setActiveTaskId(null)}
          onUpdate={(id, updates) => updateTask(id, updates)}
          onDelete={(id) => {
            // Implement delete logic if needed, or pass store action
            // For now just close
            setActiveTaskId(null);
          }}
        />
      )}

      <ViewCreationWizard
        projectId={projectId}
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={(viewId) => {
          setActiveViewId(viewId);
        }}
      />

      <ViewManagerModal
        projectId={projectId}
        isOpen={!!viewToEdit}
        onClose={() => setViewToEdit(null)}
        view={viewToEdit}
      />

      <TagManagerModal
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        workspaceId=""
      />
      <PriorityManagerModal
        isOpen={isPriorityManagerOpen}
        onClose={() => setIsPriorityManagerOpen(false)}
      />
    </div>
  );
}

function NotebookTab({
  label,
  active,
  onClick,
  color,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "w-14 h-12 rounded-r-xl shadow-md flex items-center justify-center cursor-pointer transition-all relative group hover:w-16",
        color,
        active
          ? "w-16 translate-x-[-10px] z-20 shadow-lg"
          : "opacity-80 hover:opacity-100 z-0",
      )}
      title={label}
    >
      {icon}
      {/* Connector to simulate paper tab */}
      {active && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-4 -ml-2 rounded-l-md",
            color,
          )}
        />
      )}
    </div>
  );
}
