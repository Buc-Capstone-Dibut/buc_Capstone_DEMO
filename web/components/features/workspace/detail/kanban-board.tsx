"use client";

import useSWR, { useSWRConfig } from "swr";
import { useWorkspaceStore, Task } from "../store/mock-data";
import { useState, useMemo, useEffect } from "react";
import {
  KanbanSquare,
  Plus,
  Settings2,
  Trash,
  Pen,
  Calendar as CalendarIcon,
  AlertTriangle,
  Users,
  Layout,
  Table as TableIcon,
  Tag as TagIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { ViewCreationWizard } from "../modules/view-settings/view-creation-wizard";
import { ViewManagerModal } from "../modules/view-settings/view-manager-modal";
import { TagManagerModal } from "../modules/tag/tag-manager-modal";
import { PriorityManagerModal } from "../modules/priority/priority-manager-modal";
import { StatusManagerModal } from "../modules/status-manager-modal";
import { NotebookTab } from "../modules/notebook-tab";

import { KanbanView } from "../views/kanban/kanban-view";
import { TableView } from "../views/table/table-view";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DraggablePropertySettings } from "../modules/view-settings/property-settings";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";

interface KanbanBoardProps {
  projectId: string;
  onNavigateToDoc?: (docId: string) => void;
}

export function KanbanBoard({ projectId, onNavigateToDoc }: KanbanBoardProps) {
  const {
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
    setActiveTaskId,
    projects,
    tasks: storeTasks,
    syncProjectData,
  } = useWorkspaceStore();

  const { data: boardData, isLoading } = useSWR(
    `/api/workspaces/${projectId}/board`,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch board data");
      return res.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  );

  const { mutate } = useSWRConfig();

  // --- Sync Logic ---
  useEffect(() => {
    if (boardData) {
      syncProjectData(projectId, {
        columns: boardData.columns,
        tasks: boardData.tasks,
        members: boardData.members,
        views: boardData.views,
        tags: boardData.tags,
      });
    }
  }, [boardData, projectId, syncProjectData]);

  useEffect(() => {
    if (boardData?.tags) {
      reorderTags(boardData.tags);
    }
  }, [boardData?.tags, reorderTags]);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) || null,
    [projects, projectId],
  );
  const tasks = useMemo(
    () => storeTasks.filter((t) => t.projectId === projectId),
    [storeTasks, projectId],
  );

  // --- View State ---
  const [activeViewId, setActiveViewId] = useState<string>("default");
  const [viewType, setViewType] = useState<"kanban" | "table">("kanban");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState<any>(null);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isPriorityManagerOpen, setIsPriorityManagerOpen] = useState(false);
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);

  // View Settings State
  const [showTags, setShowTags] = useState(true);
  const [showAssignee, setShowAssignee] = useState(true);
  const [showDueDate, setShowDueDate] = useState(true);
  const [showPriority, setShowPriority] = useState(true);

  // Determine Active View
  const activeView = useMemo(() => {
    if (!project) return null;
    if (activeViewId === "default" && project.views.length > 0)
      return project.views[0];
    return project.views.find((v) => v.id === activeViewId) || project.views[0];
  }, [project, activeViewId]);

  // Determine Columns (Shared Logic)
  const groupBy = activeView?.groupBy || "status";

  const columns = useMemo(() => {
    if (!project) return [];
    if (groupBy === "assignee") {
      const memberColumns = project.members.map((m) => ({
        id: m.id,
        title: m.name,
        statusId: m.name,
        icon: m.avatar || "U",
        color: m.role === "leader" ? "violet" : "blue",
      }));
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
          title: p.name,
          statusId: p.id,
          color: p.color.split(" ")[0].replace(/^bg-|-100$|-500$/g, ""),
          category: "todo" as const,
        }));
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
        color: t.color.replace(/^bg-|-100$|-500$/g, ""),
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
      return (activeView?.columns || []).map((col: any, index: number) => {
        // Assign default colors if missing
        let color = col.color;
        if (!color) {
          if (col.category === "done") color = "Green";
          else if (col.category === "in-progress") color = "Blue";
          else if (
            col.title.toLowerCase().includes("todo") ||
            col.category === "todo"
          )
            color = "Gray";
          else {
            const colors = [
              "Gray",
              "Blue",
              "Green",
              "Orange",
              "Red",
              "Violet",
              "Pink",
              "Indigo",
            ];
            color = colors[index % colors.length];
          }
        }

        return {
          ...col,
          color,
          category: col.category || "todo", // Ensure category exists
        };
      });
    }
  }, [project, groupBy, activeView, priorities, tags]);

  const displayColumns = useMemo(() => {
    let result = [...columns];
    if (activeView?.showEmptyGroups === false) {
      result = result.filter(
        (c) => !["no-priority", "no-tag", "unassigned"].includes(c.id),
      );
    }
    if (activeView?.columnOrder && activeView.columnOrder.length > 0) {
      const orderMap = new Map(
        activeView.columnOrder.map((id: string, index: number) => [id, index]),
      );
      result.sort((a, b) => {
        const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
        const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
        return indexA - indexB;
      });
    }
    return result;
  }, [columns, activeView?.showEmptyGroups, activeView?.columnOrder]);

  // --- Handlers ---

  const handleCreateColumn = async (title: string, category: string) => {
    try {
      await fetch(`/api/workspaces/${projectId}/board/columns`, {
        method: "POST",
        body: JSON.stringify({ title, category }),
      });
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e) {
      console.error("Failed to create column", e);
    }
  };

  const handleUpdateColumn = async (columnId: string, updates: any) => {
    try {
      await fetch(`/api/workspaces/${projectId}/board/columns/${columnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e) {
      console.error("Failed to update column", e);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (
      !confirm(
        "이 섹션을 삭제하시겠습니까? 포함된 모든 태스크가 함께 삭제됩니다.",
      )
    )
      return;
    try {
      const res = await fetch(
        `/api/workspaces/${projectId}/board/columns/${columnId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e: any) {
      console.error("Failed to delete column", e);
      alert(`섹션 삭제 실패: ${e.message}`);
    }
  };

  const handleCreateTask = async (taskProps: any) => {
    try {
      let targetColumnId =
        taskProps.columnId || taskProps.status || taskProps.statusId;
      const isUUID = (str: string) => /^[0-9a-f]{8}-/.test(str);
      if (!targetColumnId || !isUUID(targetColumnId)) {
        const fallbackCol = boardData?.columns?.find(
          (c: any) =>
            (c.category && c.category === targetColumnId) ||
            c.title.toLowerCase().replace(/\s+/g, "-") === targetColumnId ||
            c.category === "todo",
        );
        if (fallbackCol) targetColumnId = fallbackCol.id;
      }
      const payload = {
        title: taskProps.title || "New Task",
        columnId: targetColumnId,
        assigneeId: taskProps.assigneeId,
        priority: taskProps.priorityId,
        tags: taskProps.tags,
      };
      if (!payload.columnId) {
        alert("태스크를 생성할 섹션(컬럼)을 찾을 수 없습니다.");
        return;
      }
      const res = await fetch(`/api/workspaces/${projectId}/board/tasks`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e: any) {
      console.error("Failed to create task", e);
      alert(`태스크 생성 실패: ${e.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("이 태스크를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(
        `/api/workspaces/${projectId}/board/tasks/${taskId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e: any) {
      console.error("Failed to delete task", e);
      alert(`태스크 삭제 실패: ${e.message}`);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await fetch(`/api/workspaces/${projectId}/board/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e) {
      console.error("Failed to update task", e);
    }
  };

  const handleMoveColumn = async (
    viewId: string,
    fromIndex: number,
    toIndex: number,
  ) => {
    const reordered = [...displayColumns];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const items = reordered.map((col, index) => ({ id: col.id, order: index }));
    try {
      await fetch(`/api/workspaces/${projectId}/board/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "column", items }),
      });
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e) {
      console.error("Failed to move column", e);
    }
  };

  const handleReorderTask = async (
    taskId: string,
    newStatus: string,
    newIndex: number,
  ) => {
    const targetColumn = displayColumns.find(
      (col) =>
        (groupBy === "status" &&
          (col.id === newStatus ||
            ("statusId" in col && col.statusId === newStatus) ||
            col.title.toLowerCase().replace(/\s+/g, "-") === newStatus)) ||
        col.id === newStatus,
    );
    const targetColumnId = targetColumn?.id || newStatus;
    // Logic specific to reordering is complex to duplicate fully without projectTasks context
    // But since we are at container level, we can use projectTasks!
    const projectTasks = tasks; // Alias
    const otherTasks = projectTasks.filter((t) => {
      // Simplified Logic: Assuming Status Grouping for drag/drop
      const isInTarget =
        t.columnId === targetColumnId || t.status === newStatus;
      return isInTarget && t.id !== taskId;
    });
    otherTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    otherTasks.splice(newIndex, 0, {
      id: taskId,
      columnId: targetColumnId,
    } as any);
    const items = otherTasks.map((t, index) => ({
      id: t.id,
      order: index,
      columnId: targetColumnId,
    }));

    try {
      await fetch(`/api/workspaces/${projectId}/board/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "task", items }),
      });
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e) {
      console.error("Failed to reorder task", e);
    }
  };

  if (!project) return <div>Project not found</div>;

  return (
    <div className="h-full flex gap-4 overflow-hidden pr-2">
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background rounded-2xl border shadow-sm relative z-10">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <KanbanSquare className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold flex items-center gap-2">
                {activeView?.name || "메인 보드"}
                <Badge
                  variant="secondary"
                  className="font-normal text-[10px] h-5 px-1.5"
                >
                  {tasks.length}
                </Badge>
              </h2>
            </div>
            {tasks.length >= 450 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse text-[10px]">
                <AlertTriangle className="h-3 w-3" />
                <span>Limit: {tasks.length}/500</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg mr-4 ml-auto">
            <Button
              variant={viewType === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5"
              onClick={() => setViewType("kanban")}
            >
              <KanbanSquare className="h-3.5 w-3.5" />
              보드
            </Button>
            <Button
              variant={viewType === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5 gap-1.5"
              onClick={() => setViewType("table")}
            >
              <TableIcon className="h-3.5 w-3.5" />표
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Settings Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  보기 설정
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[280px] p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Eye className="h-3 w-3" /> 속성 표시
                    </div>
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
                  <Separator />
                  <div className="space-y-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start h-8 px-2 text-muted-foreground"
                      onClick={() => setViewToEdit(activeView)}
                    >
                      <Pen className="mr-2 h-3 w-3" /> 이름 수정
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start h-8 px-2 text-muted-foreground"
                      onClick={() => setIsTagManagerOpen(true)}
                    >
                      <TagIcon className="mr-2 h-4 w-4" /> 태그 관리
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setIsStatusManagerOpen(true)}
            >
              <Layout className="h-3.5 w-3.5" />
              섹션 관리
            </Button>
          </div>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden relative">
          {viewType === "table" ? (
            <TableView
              tasks={tasks}
              columns={displayColumns}
              priorities={priorities}
              tags={tags}
              onTaskClick={setActiveTaskId}
              onUpdateTask={handleUpdateTask}
            />
          ) : (
            <KanbanView
              projectId={projectId}
              tasks={tasks}
              activeView={activeView}
              groupBy={groupBy}
              displayColumns={displayColumns}
              priorities={priorities}
              tags={tags}
              onUpdateTask={handleUpdateTask}
              onMoveColumn={handleMoveColumn}
              onReorderTask={handleReorderTask}
              onUpdateView={updateView}
              reorderPriorities={reorderPriorities}
              reorderTags={reorderTags}
              onCreateColumn={handleCreateColumn}
              onDeleteColumn={handleDeleteColumn}
              onTaskClick={setActiveTaskId}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
              onUpdateColumn={handleUpdateColumn}
              viewSettings={{
                showTags,
                showAssignee,
                showDueDate,
                showPriority,
                cardProperties: activeView?.cardProperties,
              }}
            />
          )}
        </div>
      </div>

      {/* Right-Side Notebook Tabs (Navigation) */}
      <div className="w-14 flex flex-col gap-4 pt-10">
        {project?.views.map((view) => (
          <NotebookTab
            key={view.id}
            label={view.name}
            active={activeViewId === view.id}
            onClick={() => setActiveViewId(view.id)}
            color={
              view.color
                ? `bg-${view.color}-500`
                : view.groupBy === "status"
                  ? "bg-green-500"
                  : view.groupBy === "assignee"
                    ? "bg-blue-500"
                    : "bg-gray-500"
            }
            icon={
              view.groupBy === "status" ? (
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
        ))}
        {/* Simple Add View Button */}
        <div
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 ml-2"
          onClick={() => setIsWizardOpen(true)}
        >
          <Plus className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* Modals */}
      <ViewCreationWizard
        projectId={projectId}
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={(viewId) => setActiveViewId(viewId)}
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
        workspaceId={projectId}
        tags={tags}
        onTagsUpdate={() => mutate(`/api/workspaces/${projectId}/board`)}
      />

      <PriorityManagerModal
        isOpen={isPriorityManagerOpen}
        onClose={() => setIsPriorityManagerOpen(false)}
      />

      <StatusManagerModal
        isOpen={isStatusManagerOpen}
        onClose={() => setIsStatusManagerOpen(false)}
        activeView={activeView}
        projectId={projectId}
        onCreateColumn={handleCreateColumn}
        onUpdateColumn={handleUpdateColumn}
        onDeleteColumn={handleDeleteColumn}
      />
    </div>
  );
}
