"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import useSWR, { useSWRConfig } from "swr";
import {
  useWorkspaceStore,
  Task,
  BoardView,
  Project,
  ProjectMember,
} from "../store/mock-data";
import { useState, useMemo, useEffect } from "react";
import {
  KanbanSquare,
  Plus,
  Settings2,
  Pen,
  AlertTriangle,
  Users,
  Layout,
  Table as TableIcon,
  Tag as TagIcon,
  Loader2,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { ViewManagerModal } from "../modules/view-settings/view-manager-modal";
import { TagManagerModal } from "../modules/tag/tag-manager-modal";
import { PriorityManagerModal } from "../modules/priority/priority-manager-modal";
import { StatusManagerModal } from "../modules/status-manager-modal";
import { NotebookTab } from "../modules/notebook-tab";
import { AdvancedTaskModal } from "./board/advanced-task-modal";

import { KanbanView } from "../views/kanban/kanban-view";
import { TableView } from "../views/table/table-view";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DraggablePropertySettings } from "../modules/view-settings/property-settings";
import { Eye } from "lucide-react";
import { toast } from "sonner";

type BoardColumnResponse = {
  id: string;
  title: string;
  statusId?: string;
  category?: string;
  color?: string;
};

type BoardMemberResponse = {
  id: string;
  name?: string | null;
  avatar?: string | null;
  role?: string | null;
};

const DEFAULT_CARD_PROPERTIES = [
  "title",
  "priority",
  "tags",
  "assignee",
  "dueDate",
] as const;

const DEFAULT_CARD_PROPERTY_SET = new Set(DEFAULT_CARD_PROPERTIES);

function slugifyBoardValue(value?: string | null) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeCardProperties(properties?: string[] | null) {
  const source = Array.isArray(properties) ? properties : DEFAULT_CARD_PROPERTIES;
  const visible = source.filter(
    (property): property is (typeof DEFAULT_CARD_PROPERTIES)[number] =>
      typeof property === "string" &&
      property !== "title" &&
      DEFAULT_CARD_PROPERTY_SET.has(property as (typeof DEFAULT_CARD_PROPERTIES)[number]),
  );

  return ["title", ...Array.from(new Set(visible))];
}

function normalizeColumnCategory(value?: string) {
  if (value === "done" || value === "in-progress") return value;
  return "todo";
}

function buildFallbackViews(
  projectId: string,
  columns: BoardColumnResponse[] = [],
): BoardView[] {
  return [
    {
      id: "view-main-board",
      projectId,
      name: "Main Board",
      type: "kanban" as const,
      groupBy: "status" as const,
      columns: columns.map(
        (column): BoardView["columns"][number] => ({
          id: column.id,
          title: column.title,
          statusId: column.statusId || column.id,
          category: normalizeColumnCategory(column.category),
          ...(column.color ? { color: column.color } : {}),
        }),
      ),
      isSystem: true,
      color: "green",
      cardProperties: [...DEFAULT_CARD_PROPERTIES],
      showEmptyGroups: true,
      columnOrder: columns.map((column) => column.id),
    },
    {
      id: "view-team-board",
      projectId,
      name: "Team View",
      type: "kanban" as const,
      groupBy: "assignee" as const,
      columns: [],
      isSystem: true,
      color: "blue",
      cardProperties: [...DEFAULT_CARD_PROPERTIES],
      showEmptyGroups: true,
      columnOrder: [],
    },
    {
      id: "view-priority-board",
      projectId,
      name: "Priority View",
      type: "kanban" as const,
      groupBy: "priority" as const,
      columns: [],
      isSystem: true,
      color: "orange",
      cardProperties: [...DEFAULT_CARD_PROPERTIES],
      showEmptyGroups: true,
      columnOrder: [],
    },
    {
      id: "view-tag-board",
      projectId,
      name: "Tag View",
      type: "kanban" as const,
      groupBy: "tag" as const,
      columns: [],
      isSystem: true,
      color: "gray",
      cardProperties: [...DEFAULT_CARD_PROPERTIES],
      showEmptyGroups: true,
      columnOrder: [],
    },
  ];
}

function getViewIcon(view: BoardView) {
  if (view.icon) {
    return <span className="text-sm leading-none">{view.icon}</span>;
  }

  switch (view.groupBy) {
    case "status":
      return <KanbanSquare className="h-4 w-4" />;
    case "assignee":
      return <Users className="h-4 w-4" />;
    case "priority":
      return <Layout className="h-4 w-4" />;
    case "tag":
      return <TagIcon className="h-4 w-4" />;
    default:
      return <Layout className="h-4 w-4" />;
  }
}

function getNotebookTabColor(view: BoardView) {
  if (view.color === "green") return "bg-green-500";
  if (view.color === "orange") return "bg-orange-500";
  if (view.color === "gray") return "bg-gray-500";
  if (view.color === "violet") return "bg-violet-500";
  if (view.color === "blue") return "bg-blue-500";

  switch (view.groupBy) {
    case "status":
      return "bg-green-500";
    case "assignee":
      return "bg-blue-500";
    case "priority":
      return "bg-orange-500";
    case "tag":
      return "bg-gray-500";
    default:
      return "bg-blue-500";
  }
}

interface KanbanBoardProps {
  projectId: string;
  onNavigateToDoc?: (docId: string) => void;
}

type PendingBoardAction = {
  title: string;
  description: string;
  actionLabel?: string;
  onConfirm: () => Promise<void> | void;
};

export function KanbanBoard({ projectId, onNavigateToDoc }: KanbanBoardProps) {
  const {
    tags,
    priorities,
    reorderPriorities,
    reorderTags,
    activeTaskId,
    setActiveTaskId,
    projects,
    tasks: storeTasks,
    syncProjectData,
  } = useWorkspaceStore();

  const { data: boardData, error, isLoading } = useSWR<{
    columns?: BoardColumnResponse[];
    tasks?: Task[];
    members?: BoardMemberResponse[];
      views?: BoardView[];
      tags?: any[];
      workspace?: {
        readOnly?: boolean;
        name?: string;
    };
  }>(
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
  const isReadOnly = Boolean(boardData?.workspace?.readOnly);

  // --- Sync Logic ---
  useEffect(() => {
    if (boardData) {
      const incomingViews =
        Array.isArray(boardData.views) && boardData.views.length > 0
          ? boardData.views
          : buildFallbackViews(projectId, boardData.columns || []);
      syncProjectData(projectId, {
        columns: boardData.columns,
        tasks: boardData.tasks,
        members: boardData.members,
        views: incomingViews,
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
  const fallbackProject = useMemo<Project | null>(() => {
    if (project || !boardData) return null;

    return {
      id: projectId,
      title: boardData.workspace?.name || "워크스페이스 보드",
      description: "",
      type: "side-project" as const,
      status: boardData.workspace?.readOnly ? ("completed" as const) : ("live" as const),
      lastActive: "방금 전",
      members: (boardData.members || []).map((member): ProjectMember => ({
        id: member.id,
        name: member.name || "Unknown",
        avatar: member.avatar || "U",
        role: member.role === "owner" ? "leader" : "member",
        online: false,
      })),
      customFields: [],
      views: buildFallbackViews(projectId, boardData.columns || []),
    };
  }, [project, boardData, projectId]);
  const resolvedProject = project || fallbackProject;
  const tasks = useMemo(
    () => {
      const synced = storeTasks.filter((t) => t.projectId === projectId);
      if (synced.length > 0) return synced;
      return boardData?.tasks || [];
    },
    [storeTasks, projectId, boardData?.tasks],
  );
  const resolvedViews = useMemo<BoardView[]>(() => {
    const serverViews =
      Array.isArray(boardData?.views) && boardData.views.length > 0
        ? boardData.views
        : [];
    if (serverViews.length > 0) return serverViews;
    if (!resolvedProject) return [];
    if (resolvedProject.views.length > 0) return resolvedProject.views;
    return buildFallbackViews(projectId, boardData?.columns || []);
  }, [boardData?.views, resolvedProject, projectId, boardData?.columns]);

  // --- View State ---
  const [activeViewId, setActiveViewId] = useState<string>("default");
  const [viewType, setViewType] = useState<"kanban" | "table">("kanban");
  const [viewToEdit, setViewToEdit] = useState<any>(null);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isPriorityManagerOpen, setIsPriorityManagerOpen] = useState(false);
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingBoardAction | null>(
    null,
  );

  const availableTagColors = useMemo(
    () => Array.from(new Set(tags.map((tag) => tag.color))).filter(Boolean),
    [tags],
  );

  const handleUpdateView = async (
    viewId: string,
    updates: Partial<BoardView>,
  ) => {
    try {
      const response = await fetch(`/api/workspaces/${projectId}/board/views/${viewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      await mutate(`/api/workspaces/${projectId}/board`);
    } catch (error) {
      console.error("Failed to update view", error);
      toast.error("뷰 저장에 실패했습니다.");
    }
  };

  const handleDeleteView = async (viewId: string) => {
    try {
      const response = await fetch(`/api/workspaces/${projectId}/board/views/${viewId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      if (activeViewId === viewId) {
        setActiveViewId("default");
      }
      setViewToEdit(null);
      await mutate(`/api/workspaces/${projectId}/board`);
      toast.success("뷰를 삭제했습니다.");
      return true;
    } catch (error) {
      console.error("Failed to delete view", error);
      toast.error("뷰 삭제에 실패했습니다.");
      return false;
    }
  };

  // Determine Active View
  const activeView = useMemo(() => {
    if (!resolvedViews.length) return null;
    if (activeViewId === "default") return resolvedViews[0];
    return resolvedViews.find((v) => v.id === activeViewId) || resolvedViews[0];
  }, [resolvedViews, activeViewId]);

  const activeCardProperties = useMemo(
    () => normalizeCardProperties(activeView?.cardProperties),
    [activeView],
  );
  const isMainBoardView = Boolean(
    activeView?.groupBy === "status" && activeView?.isSystem,
  );

  const settingsCardProperties = useMemo(() => {
    const orderedProperties = ["title", ...activeCardProperties, ...DEFAULT_CARD_PROPERTIES];
    return orderedProperties.filter(
      (property, index) => orderedProperties.indexOf(property) === index,
    );
  }, [activeCardProperties]);

  const propertyVisibility = useMemo(
    () => ({
      tags: activeCardProperties.includes("tags"),
      assignee: activeCardProperties.includes("assignee"),
      dueDate: activeCardProperties.includes("dueDate"),
      priority: activeCardProperties.includes("priority"),
    }),
    [activeCardProperties],
  );

  useEffect(() => {
    if (!resolvedViews.length) return;
    if (
      activeViewId === "default" ||
      !resolvedViews.some((view) => view.id === activeViewId)
    ) {
      setActiveViewId(resolvedViews[0].id);
    }
  }, [resolvedViews, activeViewId]);

  // Determine Columns (Shared Logic)
  const groupBy = activeView?.groupBy || "status";

  const columns = useMemo(() => {
    if (!resolvedProject) return [];
    if (groupBy === "assignee") {
      const memberColumns = resolvedProject.members.map((m) => ({
        id: m.id,
        title: m.name,
        statusId: m.id,
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
      const priorityColumns = [...priorities]
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
  }, [resolvedProject, groupBy, activeView, priorities, tags]);

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
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
    try {
      const response = await fetch(`/api/workspaces/${projectId}/board/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Status ${response.status}`);
      }
      toast.success("세부 단계를 추가했습니다.");
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e: any) {
      console.error("Failed to create column", e);
      toast.error(e.message || "세부 단계 추가에 실패했습니다.");
    }
  };

  const handleUpdateColumn = async (columnId: string, updates: any) => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
    try {
      const response = await fetch(
        `/api/workspaces/${projectId}/board/columns/${columnId}`,
        {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Status ${response.status}`);
      }
      mutate(`/api/workspaces/${projectId}/board`);
    } catch (e: any) {
      console.error("Failed to update column", e);
      toast.error(e.message || "세부 단계 수정에 실패했습니다.");
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
    setPendingAction({
      title: "섹션을 삭제할까요?",
      description:
        "비어 있는 세부 단계만 삭제할 수 있습니다. 태스크가 남아 있으면 먼저 다른 단계로 옮겨주세요.",
      actionLabel: "섹션 삭제",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/workspaces/${projectId}/board/columns/${columnId}`,
            { method: "DELETE" },
          );
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(payload.error || `Status ${res.status}`);
          }
          await mutate(`/api/workspaces/${projectId}/board`);
          toast.success("세부 단계를 삭제했습니다.");
        } catch (e: any) {
          console.error("Failed to delete column", e);
          toast.error(`섹션 삭제 실패: ${e.message}`);
        }
      },
    });
  };

  const handleCreateTask = async (taskProps: any) => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
    try {
      const boardColumns = boardData?.columns || [];
      const requestedTargets = [
        taskProps.columnId,
        taskProps.status,
        taskProps.statusId,
        taskProps.columnCategory,
      ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

      let targetColumnId = requestedTargets
        .map((value) =>
          boardColumns.find(
            (column) =>
              column.id === value ||
              column.statusId === value ||
              slugifyBoardValue(column.title) === slugifyBoardValue(value) ||
              column.category === value,
          )?.id,
        )
        .find(Boolean);

      if (!targetColumnId) {
        targetColumnId =
          boardColumns.find((column) => column.category === "todo")?.id ||
          boardColumns[0]?.id;
      }

      const payload: Record<string, unknown> = {
        title: taskProps.title || "새 태스크",
        columnId: targetColumnId,
      };

      if ("assigneeId" in taskProps) {
        payload.assigneeId = taskProps.assigneeId ?? null;
      }

      if ("priorityId" in taskProps) {
        payload.priority = taskProps.priorityId ?? null;
      }

      if (Array.isArray(taskProps.tags)) {
        payload.tags = taskProps.tags;
      }

      if (!payload.columnId) {
        toast.error("태스크를 생성할 섹션(컬럼)을 찾을 수 없습니다.");
        return;
      }
      const res = await fetch(`/api/workspaces/${projectId}/board/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const createdTask = await res.json();
      await mutate(`/api/workspaces/${projectId}/board`);
      if (typeof createdTask?.id === "string") {
        setActiveTaskId(createdTask.id);
      }
    } catch (e: any) {
      console.error("Failed to create task", e);
      toast.error(`태스크 생성 실패: ${e.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
    setPendingAction({
      title: "태스크를 삭제할까요?",
      description: "삭제한 태스크는 복구되지 않습니다.",
      actionLabel: "태스크 삭제",
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/workspaces/${projectId}/board/tasks/${taskId}`,
            { method: "DELETE" },
          );
          if (!res.ok) throw new Error(`Status ${res.status}`);
          await mutate(`/api/workspaces/${projectId}/board`);
        } catch (e: any) {
          console.error("Failed to delete task", e);
          toast.error(`태스크 삭제 실패: ${e.message}`);
        }
      },
    });
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
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
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
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
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
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

  if (isLoading && !boardData && !resolvedProject) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          보드를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if (error && !boardData && !resolvedProject) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border bg-background p-6">
        <div className="max-w-md text-center">
          <div className="text-base font-semibold text-foreground">
            보드를 불러오지 못했습니다
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            잠시 후 다시 시도하거나 새로고침해 주세요.
          </p>
        </div>
      </div>
    );
  }

  if (!resolvedProject) return <div>Project not found</div>;

  const showEmptyStatusState =
    groupBy === "status" && displayColumns.length === 0 && !isLoading;

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      <div className="relative z-10 flex h-full flex-1 flex-col overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b bg-muted/10 px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <KanbanSquare className="h-4 w-4 text-muted-foreground" />
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                {activeView?.name || "메인 보드"}
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-[10px] font-normal"
                >
                  {tasks.length}
                </Badge>
              </h2>
            </div>
            {tasks.length >= 450 && (
              <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                <span>Limit: {tasks.length}/500</span>
              </div>
            )}
          </div>

          <div className="ml-auto mr-4 flex items-center gap-1 rounded-lg bg-muted/50 p-1">
            <Button
              variant={viewType === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setViewType("kanban")}
            >
              <KanbanSquare className="h-3.5 w-3.5" />
              보드
            </Button>
            <Button
              variant={viewType === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setViewType("table")}
            >
              <TableIcon className="h-3.5 w-3.5" />
              표
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  보기 설정
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[280px] p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      속성 표시
                    </div>
                    <DraggablePropertySettings
                      properties={settingsCardProperties}
                      visibility={{
                        tags: propertyVisibility.tags,
                        assignee: propertyVisibility.assignee,
                        dueDate: propertyVisibility.dueDate,
                        priority: propertyVisibility.priority,
                      }}
                      onToggle={(prop) => {
                        if (!activeView) return;
                        if (prop === "title") return;
                        const nextProperties = activeCardProperties.includes(prop)
                          ? activeCardProperties.filter((item) => item !== prop)
                          : [...activeCardProperties, prop];
                        void handleUpdateView(activeView.id, {
                          cardProperties: normalizeCardProperties(nextProperties),
                        });
                      }}
                      onReorder={(newOrder) => {
                        if (activeView) {
                          const visiblePropertySet = new Set(activeCardProperties);
                          void handleUpdateView(activeView.id, {
                            cardProperties: normalizeCardProperties(
                              newOrder.filter(
                                (property) =>
                                  property === "title" ||
                                  visiblePropertySet.has(property),
                              ),
                            ),
                          });
                        }
                      }}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-full justify-start px-2 text-muted-foreground"
                      onClick={() => setViewToEdit(activeView)}
                    >
                      <Pen className="mr-2 h-3 w-3" />
                      뷰 이름 변경
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-full justify-start px-2 text-muted-foreground"
                      onClick={() => setIsTagManagerOpen(true)}
                    >
                      <TagIcon className="mr-2 h-4 w-4" />
                      태그 관리
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {isMainBoardView && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsStatusManagerOpen(true)}
              >
                <Layout className="h-3.5 w-3.5" />
                섹션 관리
              </Button>
            )}
          </div>
        </div>

        {isReadOnly && (
          <div className="border-b bg-muted/20 px-6 py-2 text-xs text-muted-foreground">
            이 팀 공간은 종료되어 보드가 읽기 전용입니다.
          </div>
        )}

        <div className="relative flex-1 overflow-hidden">
          {showEmptyStatusState ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-md rounded-3xl border border-dashed bg-muted/20 px-6 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
                  <Inbox className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-base font-semibold text-foreground">
                  아직 섹션이 없습니다
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  첫 섹션을 만들면 보드가 활성화됩니다. 기본적으로 `Todo`, `In
                  Progress`, `Done` 같은 흐름으로 시작하는 것이 좋습니다.
                </p>
                {!isReadOnly && (
                  <Button
                    className="mt-4"
                    onClick={() => handleCreateColumn("Todo", "todo")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    첫 섹션 만들기
                  </Button>
                )}
              </div>
            </div>
          ) : viewType === "table" ? (
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
              onUpdateView={(_projectId, viewId, updates) => {
                void handleUpdateView(viewId, updates);
              }}
              reorderPriorities={reorderPriorities}
              reorderTags={reorderTags}
              onDeleteColumn={handleDeleteColumn}
              onTaskClick={setActiveTaskId}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
              onUpdateColumn={handleUpdateColumn}
              viewSettings={{
                showTags: propertyVisibility.tags,
                showAssignee: propertyVisibility.assignee,
                showDueDate: propertyVisibility.dueDate,
                showPriority: propertyVisibility.priority,
                cardProperties: activeCardProperties,
              }}
            />
          )}
        </div>
      </div>

      <div className="-ml-px flex w-12 flex-col gap-4 pt-10">
        {resolvedViews.map((view) => (
          <NotebookTab
            key={view.id}
            label={view.name}
            active={activeViewId === view.id}
            onClick={() => setActiveViewId(view.id)}
            color={getNotebookTabColor(view)}
            icon={getViewIcon(view)}
          />
        ))}
      </div>

      {/* Modals */}
      <ViewManagerModal
        projectId={projectId}
        isOpen={!!viewToEdit}
        onClose={() => setViewToEdit(null)}
        view={viewToEdit}
        availableColors={availableTagColors}
        onUpdateView={async (viewId, updates) => {
          await handleUpdateView(viewId, updates);
          setViewToEdit(null);
        }}
        onDeleteView={handleDeleteView}
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

      {isMainBoardView && (
        <StatusManagerModal
          isOpen={isStatusManagerOpen}
          onClose={() => setIsStatusManagerOpen(false)}
          activeView={activeView}
          projectId={projectId}
          tasks={tasks}
          onCreateColumn={handleCreateColumn}
          onUpdateColumn={handleUpdateColumn}
          onDeleteColumn={handleDeleteColumn}
        />
      )}

      {activeTaskId && (
        <AdvancedTaskModal
          taskId={activeTaskId}
          projectId={projectId}
          onNavigateToDoc={onNavigateToDoc}
          open={!!activeTaskId}
          onOpenChange={(open) => {
            if (!open) setActiveTaskId(null);
          }}
        />
      )}

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingAction) return;
                await pendingAction.onConfirm();
                setPendingAction(null);
              }}
            >
              {pendingAction?.actionLabel || "확인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
