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
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  KanbanSquare,
  ArrowUpDown,
  Plus,
  Settings2,
  AlertTriangle,
  Layout,
  Table as TableIcon,
  Tag as TagIcon,
  Loader2,
  Inbox,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  X,
  ChartGantt,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

import { TagManagerModal } from "../modules/tag/tag-manager-modal";
import { PriorityManagerModal } from "../modules/priority/priority-manager-modal";
import { StatusManagerModal } from "../modules/status-manager-modal";
import { CreateTaskDialog, CreateTaskInput } from "./board/create-task-dialog";

import { KanbanView } from "../views/kanban/kanban-view";
import { TableView } from "../views/table/table-view";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DraggablePropertySettings } from "../modules/view-settings/property-settings";
import { Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const TimelineView = dynamic(
  () =>
    import("../views/timeline/timeline-view").then(
      (module) => module.TimelineView,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        타임라인을 준비하고 있습니다.
      </div>
    ),
  },
);

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

const STATUS_SECTION_OPTIONS = [
  { id: "todo", label: "할 일" },
  { id: "in-progress", label: "진행 중" },
  { id: "done", label: "완료" },
] as const;

type StatusCategory = (typeof STATUS_SECTION_OPTIONS)[number]["id"];

function normalizeStatusCategoryOrder(
  value?: string[] | null,
): StatusCategory[] {
  const validCategories = new Set<StatusCategory>([
    "todo",
    "in-progress",
    "done",
  ]);
  const normalized = (value || []).filter(
    (category, index): category is StatusCategory =>
      validCategories.has(category as StatusCategory) &&
      value?.indexOf(category) === index,
  );
  const saved = new Set(normalized);

  return [
    ...normalized,
    ...STATUS_SECTION_OPTIONS.map((option) => option.id).filter(
      (category) => !saved.has(category),
    ),
  ];
}

const TASK_SORT_OPTIONS = [
  { value: "manual", label: "기본 순서" },
  { value: "title-asc", label: "제목 가나다순" },
  { value: "priority", label: "우선순위 높은 순" },
  { value: "assignee", label: "담당자 가나다순" },
  { value: "start-date", label: "시작일 빠른 순" },
  { value: "end-date", label: "종료일 빠른 순" },
] as const;

const DEFAULT_CARD_PROPERTY_SET = new Set(DEFAULT_CARD_PROPERTIES);

function slugifyBoardValue(value?: string | null) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeCardProperties(properties?: string[] | null) {
  const source = Array.isArray(properties)
    ? properties
    : DEFAULT_CARD_PROPERTIES;
  const visible = source.filter(
    (property): property is (typeof DEFAULT_CARD_PROPERTIES)[number] =>
      typeof property === "string" &&
      property !== "title" &&
      DEFAULT_CARD_PROPERTY_SET.has(
        property as (typeof DEFAULT_CARD_PROPERTIES)[number],
      ),
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
      columns: columns.map((column): BoardView["columns"][number] => ({
        id: column.id,
        title: column.title,
        statusId: column.statusId || column.id,
        category: normalizeColumnCategory(column.category),
        ...(column.color ? { color: column.color } : {}),
      })),
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

interface KanbanBoardProps {
  projectId: string;
}

type PendingBoardAction = {
  title: string;
  description: string;
  actionLabel?: string;
  onConfirm: () => Promise<void> | void;
};

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const tags = useWorkspaceStore((s) => s.tags);
  const priorities = useWorkspaceStore((s) => s.priorities);
  const reorderPriorities = useWorkspaceStore((s) => s.reorderPriorities);
  const reorderTags = useWorkspaceStore((s) => s.reorderTags);
  const setActiveTaskId = useWorkspaceStore((s) => s.setActiveTaskId);
  const projects = useWorkspaceStore((s) => s.projects);
  const storeTasks = useWorkspaceStore((s) => s.tasks);
  const syncProjectData = useWorkspaceStore((s) => s.syncProjectData);

  const boardKey = `/api/workspaces/${projectId}/board`;
  const {
    data: boardData,
    error,
    isLoading,
  } = useSWR<{
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
    boardKey,
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
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const queuedMutationCountRef = useRef(0);

  const enqueueBoardMutation = useCallback(
    (operation: () => Promise<void>, failureMessage: string) => {
      queuedMutationCountRef.current += 1;
      const queued = mutationQueueRef.current.then(operation);
      mutationQueueRef.current = queued.catch(() => undefined);

      void queued
        .catch((error) => {
          console.error(failureMessage, error);
          toast.error(failureMessage);
        })
        .finally(() => {
          queuedMutationCountRef.current -= 1;
          if (queuedMutationCountRef.current === 0) {
            void mutate(boardKey);
          }
        });

      return queued;
    },
    [boardKey, mutate],
  );

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
      status: boardData.workspace?.readOnly
        ? ("completed" as const)
        : ("live" as const),
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
  const tasks = useMemo(() => {
    const synced = storeTasks.filter((t) => t.projectId === projectId);
    if (synced.length > 0) return synced;
    return boardData?.tasks || [];
  }, [storeTasks, projectId, boardData?.tasks]);
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
  const [viewType, setViewType] = useState<"kanban" | "table" | "timeline">(
    "table",
  );
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isPriorityManagerOpen, setIsPriorityManagerOpen] = useState(false);
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskDefaults, setCreateTaskDefaults] = useState<
    Partial<CreateTaskInput>
  >({});
  const [isViewVisibilityOpen, setIsViewVisibilityOpen] = useState(true);
  const [isHiddenSectionsOpen, setIsHiddenSectionsOpen] = useState(false);
  const [isViewActionsOpen, setIsViewActionsOpen] = useState(true);
  const [taskQuery, setTaskQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [taskSort, setTaskSort] = useState<
    "manual" | "title-asc" | "priority" | "assignee" | "start-date" | "end-date"
  >("manual");
  const [pendingAction, setPendingAction] = useState<PendingBoardAction | null>(
    null,
  );

  const handleUpdateView = useCallback(
    async (viewId: string, updates: Partial<BoardView>) => {
      if (boardData?.views) {
        await mutate(
          boardKey,
          {
            ...boardData,
            views: boardData.views.map((view) =>
              view.id === viewId ? { ...view, ...updates } : view,
            ),
          },
          { revalidate: false },
        );
      }

      return enqueueBoardMutation(async () => {
        const response = await fetch(
          `/api/workspaces/${projectId}/board/views/${viewId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          },
        );
        if (!response.ok) throw new Error(`Status ${response.status}`);
      }, "뷰 저장에 실패했습니다.");
    },
    [boardData, boardKey, enqueueBoardMutation, mutate, projectId],
  );

  // Determine Active View
  const activeView = useMemo(() => {
    if (!resolvedViews.length) return null;
    if (activeViewId === "default") return resolvedViews[0];
    return resolvedViews.find((v) => v.id === activeViewId) || resolvedViews[0];
  }, [resolvedViews, activeViewId]);
  const statusCategoryOrder = useMemo(
    () =>
      normalizeStatusCategoryOrder(
        activeView?.groupBy === "status"
          ? activeView.filter?.statusCategoryOrder
          : undefined,
      ),
    [activeView],
  );
  const statusManagerView = useMemo<BoardView | null>(() => {
    const statusView =
      resolvedViews.find(
        (view) => view.groupBy === "status" && view.isSystem,
      ) ||
      resolvedViews.find((view) => view.groupBy === "status") ||
      null;
    if (!statusView) return null;

    return {
      ...statusView,
      columns:
        (boardData?.columns as BoardView["columns"] | undefined) ||
        statusView.columns ||
        [],
    };
  }, [boardData?.columns, resolvedViews]);

  const activeCardProperties = useMemo(
    () => normalizeCardProperties(activeView?.cardProperties),
    [activeView],
  );
  const isMainBoardView = Boolean(
    activeView?.groupBy === "status" && activeView?.isSystem,
  );

  const settingsCardProperties = useMemo(() => {
    const orderedProperties = [
      "title",
      ...activeCardProperties,
      ...DEFAULT_CARD_PROPERTIES,
    ];
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

  const hiddenColumnIds = useMemo(
    () => new Set(activeView?.filter?.hiddenColumns || []),
    [activeView?.filter],
  );

  const hiddenStatusCategories = useMemo(
    () => new Set(activeView?.filter?.hiddenStatusCategories || []),
    [activeView?.filter],
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
  const groupBy: "status" | "assignee" | "priority" | "tag" =
    activeView?.groupBy === "assignee" ||
    activeView?.groupBy === "priority" ||
    activeView?.groupBy === "tag"
      ? activeView.groupBy
      : "status";

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
        title: "담당자 없음",
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
        title: "우선순위 없음",
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
        title: "태그 없음",
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

    if (groupBy === "status" && hiddenColumnIds.size > 0) {
      result = result.filter((column) => !hiddenColumnIds.has(column.id));
    }

    return result;
  }, [
    columns,
    activeView?.showEmptyGroups,
    activeView?.columnOrder,
    groupBy,
    hiddenColumnIds,
  ]);

  const tableStatusColumns = useMemo(() => {
    const statusView = resolvedViews.find((view) => view.groupBy === "status");
    const statusColumns = [...(statusView?.columns || [])];
    const categoryOrder = normalizeStatusCategoryOrder(
      statusView?.filter?.statusCategoryOrder,
    );
    const categoryOrderMap = new Map(
      categoryOrder.map((category, index) => [category, index]),
    );
    const orderMap = new Map(
      (statusView?.columnOrder || []).map((id, index) => [id, index]),
    );

    return statusColumns.sort(
      (left, right) =>
        (categoryOrderMap.get(left.category || "todo") ??
          Number.MAX_SAFE_INTEGER) -
          (categoryOrderMap.get(right.category || "todo") ??
            Number.MAX_SAFE_INTEGER) ||
        (orderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [resolvedViews]);

  const visibleTasks = useMemo(() => {
    const query = taskQuery.trim().toLocaleLowerCase();
    return tasks.filter((task) => {
      const taskCategory = (boardData?.columns || []).find(
        (column) => column.id === task.columnId,
      )?.category;
      const taskTagNames = (task.tags || []).map(
        (tagId) => tags.find((tag) => tag.id === tagId)?.name || "",
      );
      const searchable = [
        task.title,
        task.description,
        task.assignee,
        ...taskTagNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      if (query && !searchable.includes(query)) return false;
      if (statusFilter !== "all" && taskCategory !== statusFilter) {
        return false;
      }
      if (
        priorityFilter !== "all" &&
        (task.priorityId || "none") !== priorityFilter
      ) {
        return false;
      }
      if (
        assigneeFilter !== "all" &&
        (task.assigneeId || "unassigned") !== assigneeFilter
      ) {
        return false;
      }
      if (tagFilter !== "all" && !(task.tags || []).includes(tagFilter)) {
        return false;
      }
      return true;
    });
  }, [
    assigneeFilter,
    boardData?.columns,
    priorityFilter,
    statusFilter,
    tagFilter,
    tags,
    taskQuery,
    tasks,
  ]);

  const sortedVisibleTasks = useMemo(() => {
    if (taskSort === "manual") return visibleTasks;

    const priorityOrder = new Map(
      priorities.map((priority) => [priority.id, priority.order] as const),
    );

    return visibleTasks
      .map((task, index) => ({ task, index }))
      .sort((left, right) => {
        let comparison = 0;

        if (taskSort === "title-asc") {
          comparison = left.task.title.localeCompare(right.task.title, "ko");
        } else if (taskSort === "priority") {
          comparison =
            (priorityOrder.get(left.task.priorityId || "") ?? 999) -
            (priorityOrder.get(right.task.priorityId || "") ?? 999);
        } else if (taskSort === "assignee") {
          const leftAssignee = left.task.assignee || "\uffff";
          const rightAssignee = right.task.assignee || "\uffff";
          comparison = leftAssignee.localeCompare(rightAssignee, "ko");
        } else if (taskSort === "start-date") {
          comparison = (left.task.startDate || "9999-12-31").localeCompare(
            right.task.startDate || "9999-12-31",
          );
        } else if (taskSort === "end-date") {
          comparison = (left.task.endDate || "9999-12-31").localeCompare(
            right.task.endDate || "9999-12-31",
          );
        }

        return comparison || left.index - right.index;
      })
      .map(({ task }) => task);
  }, [priorities, taskSort, visibleTasks]);

  const hasSharedFilters =
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    assigneeFilter !== "all" ||
    tagFilter !== "all";
  const activeSharedFilterCount = [
    statusFilter,
    priorityFilter,
    assigneeFilter,
    tagFilter,
  ].filter((value) => value !== "all").length;

  const statusColumns = useMemo(
    () =>
      groupBy === "status"
        ? columns.filter((column) =>
            STATUS_SECTION_OPTIONS.some(
              (section) => section.id === (column.category || "todo"),
            ),
          )
        : [],
    [columns, groupBy],
  );

  const updateViewFilter = useCallback(
    async (partialFilter: Record<string, unknown>) => {
      if (!activeView) return;

      const currentFilter =
        activeView.filter && typeof activeView.filter === "object"
          ? activeView.filter
          : {};

      await handleUpdateView(activeView.id, {
        filter: {
          ...currentFilter,
          ...partialFilter,
        },
      });
    },
    [activeView, handleUpdateView],
  );

  const toggleStatusCategoryVisibility = useCallback(
    async (category: (typeof STATUS_SECTION_OPTIONS)[number]["id"]) => {
      const nextHidden = new Set(hiddenStatusCategories);
      if (nextHidden.has(category)) {
        nextHidden.delete(category);
      } else {
        nextHidden.add(category);
      }

      await updateViewFilter({
        hiddenStatusCategories: Array.from(nextHidden),
      });
    },
    [hiddenStatusCategories, updateViewFilter],
  );

  const toggleColumnVisibility = useCallback(
    async (columnId: string) => {
      const nextHidden = new Set(hiddenColumnIds);
      if (nextHidden.has(columnId)) {
        nextHidden.delete(columnId);
      } else {
        nextHidden.add(columnId);
      }

      await updateViewFilter({
        hiddenColumns: Array.from(nextHidden),
      });
    },
    [hiddenColumnIds, updateViewFilter],
  );

  // --- Handlers ---

  const handleCreateColumn = async (title: string, category: string) => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return false;
    }
    try {
      const response = await fetch(
        `/api/workspaces/${projectId}/board/columns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, category }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Status ${response.status}`);
      }
      toast.success("세부 단계를 추가했습니다.");
      await mutate(boardKey);
      return true;
    } catch (e: any) {
      console.error("Failed to create column", e);
      toast.error(e.message || "세부 단계 추가에 실패했습니다.");
      return false;
    }
  };

  const handleCreateTagFromDialog = useCallback(
    async (name: string) => {
      if (isReadOnly) {
        toast.error("종료된 팀 공간은 읽기 전용입니다.");
        return null;
      }

      try {
        const response = await fetch(`/api/workspaces/${projectId}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color: "gray" }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 409) {
            toast.error("이미 존재하는 태그입니다.");
            await mutate(boardKey);
            return null;
          }
          throw new Error(payload.error || `Status ${response.status}`);
        }

        await mutate(boardKey);
        toast.success("태그를 만들고 작업에 선택했습니다.");
        return payload as { id: string; name: string; color?: string };
      } catch (error) {
        console.error("Failed to create tag", error);
        toast.error("태그 생성에 실패했습니다.");
        return null;
      }
    },
    [boardKey, isReadOnly, mutate, projectId],
  );

  const handleUpdateColumn = async (columnId: string, updates: any) => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return false;
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
      await mutate(boardKey);
      return true;
    } catch (e: any) {
      console.error("Failed to update column", e);
      toast.error(e.message || "세부 단계 수정에 실패했습니다.");
      return false;
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
    setPendingAction({
      title: "상태를 삭제할까요?",
      description:
        "비어 있는 상태만 삭제할 수 있습니다. 작업이 남아 있으면 먼저 다른 상태로 옮겨주세요.",
      actionLabel: "상태 삭제",
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
          await mutate(boardKey);
          toast.success("상태를 삭제했습니다.");
        } catch (e: any) {
          console.error("Failed to delete column", e);
          toast.error(`상태 삭제 실패: ${e.message}`);
        }
      },
    });
  };

  const openCreateTaskDialog = (defaults: Partial<CreateTaskInput> = {}) => {
    setCreateTaskDefaults(defaults);
    setIsCreateTaskOpen(true);
  };

  const handleCreateTask = async (taskProps: CreateTaskInput) => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return false;
    }
    try {
      const boardColumns = boardData?.columns || [];
      const requestedTargets = [
        taskProps.columnId,
        taskProps.status,
        taskProps.statusId,
        taskProps.columnCategory,
      ].filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      );

      let targetColumnId = requestedTargets
        .map(
          (value) =>
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
        description: taskProps.description || "",
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
      if ("startDate" in taskProps) {
        payload.startDate = taskProps.startDate ?? null;
      }
      if ("endDate" in taskProps) {
        payload.endDate = taskProps.endDate ?? null;
      }

      if (!payload.columnId) {
        toast.error("태스크를 생성할 섹션(컬럼)을 찾을 수 없습니다.");
        return false;
      }
      const res = await fetch(`/api/workspaces/${projectId}/board/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      await res.json();
      await mutate(boardKey);
      toast.success("작업을 만들었습니다.");
      return true;
    } catch (e: any) {
      console.error("Failed to create task", e);
      toast.error(`태스크 생성 실패: ${e.message}`);
      return false;
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
          await mutate(boardKey);
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
    syncProjectData(projectId, {
      tasks: tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task,
      ),
    });

    return enqueueBoardMutation(async () => {
      const response = await fetch(
        `/api/workspaces/${projectId}/board/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "작업을 수정하지 못했습니다.");
      }
    }, "작업을 수정하지 못했습니다.");
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
    try {
      await handleUpdateView(viewId, {
        columnOrder: reordered.map((column) => column.id),
      });
    } catch (e) {
      console.error("Failed to move column", e);
    }
  };

  const handleReorderTask = async (
    taskId: string,
    newStatus: string,
    newIndex: number,
    taskSnapshot: Task[] = tasks,
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
    const projectTasks = taskSnapshot;
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

    const snapshotById = new Map(taskSnapshot.map((task) => [task.id, task]));
    const orderById = new Map(items.map((item) => [item.id, item.order]));
    syncProjectData(projectId, {
      tasks: tasks.map((task) => {
        const previewTask = snapshotById.get(task.id) || task;
        const nextOrder = orderById.get(task.id);
        return nextOrder === undefined
          ? previewTask
          : {
              ...previewTask,
              columnId: targetColumnId,
              status: targetColumn?.statusId || previewTask.status,
              order: nextOrder,
            };
      }),
    });

    return enqueueBoardMutation(async () => {
      await fetch(`/api/workspaces/${projectId}/board/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "task", items }),
      }).then((response) => {
        if (!response.ok) throw new Error(`Status ${response.status}`);
      });
    }, "작업 순서를 저장하지 못했습니다.");
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
    <div className="flex h-full overflow-hidden">
      <div className="relative z-10 flex h-full flex-1 flex-col overflow-hidden bg-background">
        <div className="flex items-center gap-2 overflow-x-auto border-b bg-background px-3 py-2">
          <div className="flex shrink-0 items-center gap-2">
            <KanbanSquare className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">보드</h2>
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] font-normal"
            >
              {tasks.length}
            </Badge>
          </div>

          {tasks.length >= 450 && (
            <div className="flex animate-pulse items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Limit: {tasks.length}/500</span>
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1 rounded-lg bg-muted/50 p-1">
            <Button
              variant={viewType === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setViewType("table")}
              aria-pressed={viewType === "table"}
            >
              <TableIcon className="h-3.5 w-3.5" />
              목록
            </Button>
            <Button
              variant={viewType === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setViewType("kanban")}
              aria-pressed={viewType === "kanban"}
            >
              <KanbanSquare className="h-3.5 w-3.5" />
              칸반
            </Button>
            <Button
              variant={viewType === "timeline" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setViewType("timeline")}
              aria-pressed={viewType === "timeline"}
            >
              <ChartGantt className="h-3.5 w-3.5" />
              타임라인
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {viewType !== "timeline" ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                  >
                    {groupBy === "status"
                      ? "상태별"
                      : groupBy === "assignee"
                        ? "담당자별"
                        : groupBy === "priority"
                          ? "우선순위별"
                          : "태그별"}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40 p-1">
                  {[
                    ["status", "상태"],
                    ["assignee", "담당자"],
                    ["priority", "우선순위"],
                    ["tag", "태그"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      variant={groupBy === value ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        const matchingView = resolvedViews.find(
                          (view) => view.groupBy === value,
                        );
                        if (matchingView) setActiveViewId(matchingView.id);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
            ) : null}
            {viewType === "kanban" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="보기 설정"
                    title="보기 설정"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-[280px] overflow-hidden p-0"
                >
                  <div className="max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain p-4">
                    <div className="space-y-4">
                      <Collapsible
                        open={isViewVisibilityOpen}
                        onOpenChange={setIsViewVisibilityOpen}
                      >
                        <div className="space-y-2">
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-md text-left hover:text-foreground"
                            >
                              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <Eye className="h-3 w-3" />
                                속성 표시
                              </div>
                              {isViewVisibilityOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
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
                                const nextProperties =
                                  activeCardProperties.includes(prop)
                                    ? activeCardProperties.filter(
                                        (item) => item !== prop,
                                      )
                                    : [...activeCardProperties, prop];
                                void handleUpdateView(activeView.id, {
                                  cardProperties:
                                    normalizeCardProperties(nextProperties),
                                });
                              }}
                              onReorder={(newOrder) => {
                                if (activeView) {
                                  const visiblePropertySet = new Set(
                                    activeCardProperties,
                                  );
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
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                      {isMainBoardView && (
                        <>
                          <Separator />
                          <Collapsible
                            open={isHiddenSectionsOpen}
                            onOpenChange={setIsHiddenSectionsOpen}
                          >
                            <div className="space-y-3">
                              <CollapsibleTrigger asChild>
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between rounded-md text-left hover:text-foreground"
                                >
                                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <EyeOff className="h-3 w-3" />
                                    섹션 숨기기
                                  </div>
                                  {isHiddenSectionsOpen ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-3">
                                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                                  <div className="text-[11px] font-medium text-muted-foreground">
                                    상위 3축 보기
                                  </div>
                                  <div className="space-y-2">
                                    {STATUS_SECTION_OPTIONS.map((section) => {
                                      const checked =
                                        !hiddenStatusCategories.has(section.id);
                                      return (
                                        <label
                                          key={section.id}
                                          className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-background/80"
                                        >
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => {
                                              void toggleStatusCategoryVisibility(
                                                section.id,
                                              );
                                            }}
                                          />
                                          <span>{section.label}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                                  <div className="text-[11px] font-medium text-muted-foreground">
                                    세부 단계 보기
                                  </div>
                                  <div className="space-y-2">
                                    {statusColumns.map((column) => {
                                      const checked = !hiddenColumnIds.has(
                                        column.id,
                                      );
                                      const categoryLabel =
                                        STATUS_SECTION_OPTIONS.find(
                                          (section) =>
                                            section.id ===
                                            (column.category || "todo"),
                                        )?.label || "할 일";

                                      return (
                                        <label
                                          key={column.id}
                                          className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-background/80"
                                        >
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => {
                                              void toggleColumnVisibility(
                                                column.id,
                                              );
                                            }}
                                          />
                                          <div className="min-w-0">
                                            <div className="truncate">
                                              {column.title}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                              {categoryLabel}
                                            </div>
                                          </div>
                                        </label>
                                      );
                                    })}
                                    {statusColumns.length === 0 && (
                                      <div className="text-xs text-muted-foreground">
                                        관리할 세부 단계가 없습니다.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        </>
                      )}
                      <Separator />
                      <Collapsible
                        open={isViewActionsOpen}
                        onOpenChange={setIsViewActionsOpen}
                      >
                        <div className="space-y-1">
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="mb-1 flex w-full items-center justify-between rounded-md text-left hover:text-foreground"
                            >
                              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                관리
                              </div>
                              {isViewActionsOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-full justify-start px-2 text-muted-foreground"
                              onClick={() => setIsTagManagerOpen(true)}
                            >
                              <TagIcon className="mr-2 h-4 w-4" />
                              태그 관리
                            </Button>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {isMainBoardView && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsStatusManagerOpen(true)}
                aria-label="상태 관리"
                title="상태 관리"
              >
                <Layout className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="relative ml-auto min-w-40 max-w-64 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={taskQuery}
              onChange={(event) => setTaskQuery(event.target.value)}
              placeholder="작업 검색"
              className="h-8 pl-8 text-xs"
            />
          </div>
          {viewType === "table" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={taskSort === "manual" ? "outline" : "secondary"}
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 text-xs"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  정렬
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1">
                {TASK_SORT_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={taskSort === option.value ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 w-full justify-start text-xs"
                    onClick={() => setTaskSort(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={activeSharedFilterCount > 0 ? "secondary" : "outline"}
                size="sm"
                className="h-8 shrink-0 gap-1.5 text-xs"
              >
                <Filter className="h-3.5 w-3.5" />
                필터
                {activeSharedFilterCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                    {activeSharedFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">빠른 필터</span>
                {hasSharedFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-muted-foreground"
                    onClick={() => {
                      setStatusFilter("all");
                      setPriorityFilter("all");
                      setAssigneeFilter("all");
                      setTagFilter("all");
                    }}
                  >
                    <X className="mr-1 h-3 w-3" />
                    초기화
                  </Button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  variant={
                    statusFilter === "in-progress" ? "secondary" : "outline"
                  }
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() =>
                    setStatusFilter((current) =>
                      current === "in-progress" ? "all" : "in-progress",
                    )
                  }
                >
                  진행 중
                </Button>
                <Button
                  variant={
                    assigneeFilter === "unassigned" ? "secondary" : "outline"
                  }
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() =>
                    setAssigneeFilter((current) =>
                      current === "unassigned" ? "all" : "unassigned",
                    )
                  }
                >
                  미할당
                </Button>
                <Button
                  variant={
                    priorityFilter === "urgent" ? "secondary" : "outline"
                  }
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() =>
                    setPriorityFilter((current) =>
                      current === "urgent" ? "all" : "urgent",
                    )
                  }
                >
                  긴급
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    상태
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                    aria-label="상태 필터"
                  >
                    <option value="all">모든 상태</option>
                    <option value="todo">할 일</option>
                    <option value="in-progress">진행 중</option>
                    <option value="done">완료</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    우선순위
                  </span>
                  <select
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value)}
                    className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                    aria-label="우선순위 필터"
                  >
                    <option value="all">모든 우선순위</option>
                    <option value="none">미지정</option>
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    담당자
                  </span>
                  <select
                    value={assigneeFilter}
                    onChange={(event) => setAssigneeFilter(event.target.value)}
                    className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                    aria-label="담당자 필터"
                  >
                    <option value="all">모든 담당자</option>
                    <option value="unassigned">미할당</option>
                    {resolvedProject.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    태그
                  </span>
                  <select
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                    className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                    aria-label="태그 필터"
                  >
                    <option value="all">모든 태그</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </PopoverContent>
          </Popover>
          {!isReadOnly && (
            <Button
              size="sm"
              className="h-8 shrink-0"
              onClick={() => openCreateTaskDialog()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              작업
            </Button>
          )}
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
                    <Plus className="mr-2 h-4 w-4" />첫 섹션 만들기
                  </Button>
                )}
              </div>
            </div>
          ) : viewType === "table" ? (
            <TableView
              tasks={sortedVisibleTasks}
              columns={tableStatusColumns}
              priorities={priorities}
              tags={tags}
              members={resolvedProject.members}
              groupBy={groupBy}
              showToolbar={false}
              compact
              readOnly={isReadOnly}
              onTaskClick={setActiveTaskId}
              onUpdateTask={handleUpdateTask}
              onCreateTask={(defaults) => openCreateTaskDialog(defaults)}
            />
          ) : viewType === "kanban" ? (
            <KanbanView
              projectId={projectId}
              tasks={visibleTasks}
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
              onCreateTask={async (defaults) => {
                openCreateTaskDialog(defaults);
              }}
              onDeleteTask={handleDeleteTask}
              onUpdateColumn={async (columnId, updates) => {
                await handleUpdateColumn(columnId, updates);
              }}
              onHideColumn={(columnId) => {
                void toggleColumnVisibility(columnId);
              }}
              onHideStatusCategory={(category) => {
                void toggleStatusCategoryVisibility(category);
              }}
              viewSettings={{
                showTags: propertyVisibility.tags,
                showAssignee: propertyVisibility.assignee,
                showDueDate: propertyVisibility.dueDate,
                showPriority: propertyVisibility.priority,
                cardProperties: activeCardProperties,
                hiddenStatusCategories: Array.from(hiddenStatusCategories),
                statusCategoryOrder,
              }}
            />
          ) : (
            <TimelineView
              tasks={sortedVisibleTasks}
              columns={boardData?.columns || []}
              onTaskClick={setActiveTaskId}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        columns={boardData?.columns || []}
        members={resolvedProject.members}
        priorities={priorities}
        tags={tags}
        defaults={createTaskDefaults}
        onCreate={handleCreateTask}
        onCreateTag={handleCreateTagFromDialog}
        onManageStatuses={() => setIsStatusManagerOpen(true)}
        onManagePriorities={() => setIsPriorityManagerOpen(true)}
      />

      <TagManagerModal
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        workspaceId={projectId}
        tags={tags}
        onTagsUpdate={() => mutate(boardKey)}
      />

      <PriorityManagerModal
        isOpen={isPriorityManagerOpen}
        onClose={() => setIsPriorityManagerOpen(false)}
      />

      {statusManagerView && (
        <StatusManagerModal
          isOpen={isStatusManagerOpen}
          onClose={() => setIsStatusManagerOpen(false)}
          activeView={statusManagerView}
          tasks={tasks}
          onCreateColumn={handleCreateColumn}
          onUpdateColumn={handleUpdateColumn}
          onDeleteColumn={handleDeleteColumn}
          onReorderColumns={async (columnIds) => {
            await handleUpdateView(statusManagerView.id, {
              columnOrder: columnIds,
            });
          }}
          categoryOrder={normalizeStatusCategoryOrder(
            statusManagerView.filter?.statusCategoryOrder,
          )}
          onReorderCategories={async (categories) => {
            const currentFilter = statusManagerView.filter || {};
            await handleUpdateView(statusManagerView.id, {
              filter: {
                ...currentFilter,
                statusCategoryOrder: categories,
              },
            });
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
