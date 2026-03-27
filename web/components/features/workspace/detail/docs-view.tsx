"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";
import { DocCollaborationPanel } from "@/components/features/workspace/docs/doc-collaboration-panel";
import { DocumentList } from "@/components/features/workspace/docs/document-list";
import {
  DocumentEditor,
  type DocumentEditorHandle,
} from "@/components/features/workspace/docs/editor";
import {
  NormalDocumentEditor,
  type NormalDocumentEditorHandle,
} from "@/components/features/workspace/docs/normal-editor";
import { AdvancedTaskModal } from "@/components/features/workspace/detail/board/advanced-task-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  FileText,
  Smile,
  Slash,
  CheckCircle2,
  ArrowUpDown,
  Save,
  Loader2,
  FolderPlus,
  Archive,
  CalendarDays,
  Clock3,
  Link2,
  Trash2,
  UserRound,
  Users,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useDebouncedCallback } from "use-debounce";
import { useAuth } from "@/hooks/use-auth";

// Stable color generator
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 50%)`;
};

interface DocsViewProps {
  projectId: string;
  initialDocId?: string | null;
  onNavigateToTask?: (taskId: string) => void;
}

type WorkspaceDocSummary = {
  id: string;
  kind: "page" | "folder";
  title: string;
  emoji?: string | null;
  parent_id: string | null;
  sort_order?: number;
  updated_at?: string;
  collab?: WorkspaceDocCollabState;
};

type WorkspaceDocCollabParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  mode: string;
  isDirty: boolean;
  lastSeenAt: string;
};

type WorkspaceDocCollabState = {
  isActive: boolean;
  participantCount: number;
  startedAt: string | null;
  lastActivityAt: string | null;
  startedBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  participants: WorkspaceDocCollabParticipant[];
  currentUserParticipating: boolean;
};

type ActiveWorkspaceDoc = {
  id: string;
  kind: "page" | "folder";
  title: string;
  emoji?: string | null;
  author_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  content?: unknown;
  author?: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
  collab?: WorkspaceDocCollabState;
};

type WorkspaceMeta = {
  read_only?: boolean;
  lifecycle_status?: string;
  members?: Array<{
    id: string;
    name: string;
    nickname?: string;
    avatar?: string | null;
    role?: string;
  }>;
};

type LinkedTaskRelation = {
  id: string;
  relation_type: string;
  is_primary: boolean;
  task: {
    id: string;
    title: string;
    priority: string | null;
    due_date: string | null;
    column: {
      id: string;
      title: string;
      category: string | null;
    };
  };
};

type BoardTaskSummary = {
  id: string;
  title: string;
};

type BoardTaskCollection = {
  tasks?: BoardTaskSummary[];
};

type DocTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  title: string;
};

type EmojiSelection = {
  native?: string;
};

type EditorHandle = DocumentEditorHandle | NormalDocumentEditorHandle;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatMetaDate = (value?: string | Date | null) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatSavedTime = (value?: string | null) => {
  if (!value) return "실시간 동기화";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "실시간 동기화";
  return `${new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)} 저장됨`;
};

const DOCS_SIDEBAR_MIN_WIDTH = 256;
const DOCS_SIDEBAR_MAX_WIDTH = 560;

const getDocsSidebarMaxWidth = (containerWidth?: number) => {
  if (!containerWidth || Number.isNaN(containerWidth)) {
    return DOCS_SIDEBAR_MAX_WIDTH;
  }

  return Math.max(
    DOCS_SIDEBAR_MIN_WIDTH,
    Math.min(DOCS_SIDEBAR_MAX_WIDTH, containerWidth - 360),
  );
};

const clampDocsSidebarWidth = (width: number, containerWidth?: number) =>
  Math.min(
    Math.max(width, DOCS_SIDEBAR_MIN_WIDTH),
    getDocsSidebarMaxWidth(containerWidth),
  );

export function DocsView({
  projectId,
  initialDocId,
  onNavigateToTask,
}: DocsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const swrOptions = {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  } as const;
  const docsSWRConfig = {
    ...swrOptions,
    refreshInterval: 5_000,
  } as const;

  const { data: workspaceMeta } = useSWR<WorkspaceMeta>(
    `/api/workspaces/${projectId}`,
    fetcher,
    swrOptions,
  );
  const isReadOnly = Boolean(
    workspaceMeta?.read_only || workspaceMeta?.lifecycle_status === "COMPLETED",
  );

  // Fetch Docs
  const {
    data: docs,
    mutate: mutateDocs,
    isLoading,
  } = useSWR<WorkspaceDocSummary[]>(
    `/api/workspaces/${projectId}/docs`,
    fetcher,
    docsSWRConfig,
  );
  const { data: archivedDocs, mutate: mutateArchivedDocs } = useSWR<
    WorkspaceDocSummary[]
  >(`/api/workspaces/${projectId}/docs?archived=true`, fetcher, docsSWRConfig);
  const { data: templates } = useSWR<DocTemplate[]>(
    `/api/workspaces/${projectId}/doc-templates`,
    fetcher,
    swrOptions,
  );

  const editorRef = useRef<EditorHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [sidebarMode, setSidebarMode] = useState<"active" | "archived">("active");
  const [sidebarWidth, setSidebarWidth] = useState(DOCS_SIDEBAR_MIN_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isOrganizeMode, setIsOrganizeMode] = useState(false);
  const [editorMode, setEditorMode] = useState<"normal" | "collab">("normal");
  const [collabToken, setCollabToken] = useState<string | null>(null);
  const [collabStatus, setCollabStatus] = useState<
    "connecting" | "saving" | "synced" | "unstable"
  >("synced");
  const [collabParticipants, setCollabParticipants] = useState<
    WorkspaceDocCollabParticipant[]
  >([]);
  const [isStartingCollab, setIsStartingCollab] = useState(false);
  const [isLeavingCollab, setIsLeavingCollab] = useState(false);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [selectedArchivedDocIds, setSelectedArchivedDocIds] = useState<string[]>([]);
  const [normalBodyDirty, setNormalBodyDirty] = useState(false);
  const [isHeaderDirty, setIsHeaderDirty] = useState(false);
  const headerBaselineRef = useRef<{
    docId: string | null;
    title: string;
    emoji: string | null;
    docWorkerId: string;
  }>({
    docId: null,
    title: "",
    emoji: null,
    docWorkerId: "",
  });
  const activeDocModeRef = useRef<"NORMAL" | "COLLAB">("NORMAL");
  const activeDocDirtyRef = useRef(false);
  const switchingDocRef = useRef(false);

  // Active Doc Data (If Selected)
  const {
    data: activeDoc,
    mutate: mutateActiveDoc,
    isLoading: isLoadingActiveDoc,
  } = useSWR<ActiveWorkspaceDoc | null>(
    activeDocId ? `/api/workspaces/${projectId}/docs/${activeDocId}` : null,
    fetcher,
    {
      ...swrOptions,
      dedupingInterval: 1_500,
      refreshInterval: activeDocId ? 2_000 : 0,
    },
  );

  const resolvedActiveDoc = useMemo(
    () =>
      activeDoc && activeDocId && activeDoc.id === activeDocId ? activeDoc : null,
    [activeDoc, activeDocId],
  );

  const { data: linkedTasks, mutate: mutateLinkedTasks } = useSWR<LinkedTaskRelation[]>(
    activeDocId ? `/api/workspaces/${projectId}/docs/${activeDocId}/tasks` : null,
    fetcher,
    swrOptions
  );

  const { data: boardData } = useSWR<BoardTaskCollection>(
    projectId ? `/api/workspaces/${projectId}/board` : null,
    fetcher,
    swrOptions
  );

  const [taskSearch, setTaskSearch] = useState("");

  // Local state for header inputs (to be synced)
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleOpenTaskLocally = useCallback((taskId: string) => {
    onNavigateToTask?.(taskId);
    setSelectedTaskId(taskId);
  }, [onNavigateToTask]);
  const [docWorkerId, setDocWorkerId] = useState("");

  const docMap = useMemo(() => {
    const entries = (docs || []).map((doc) => [doc.id, doc] as const);
    return new Map(entries);
  }, [docs]);

  const archivedDocMap = useMemo(() => {
    const entries = (archivedDocs || []).map((doc) => [doc.id, doc] as const);
    return new Map(entries);
  }, [archivedDocs]);

  const selectedArchivedDocIdSet = useMemo(
    () => new Set(selectedArchivedDocIds),
    [selectedArchivedDocIds],
  );

  const allArchivedSelected = useMemo(
    () =>
      Boolean(archivedDocs?.length) &&
      archivedDocs?.every((doc) => selectedArchivedDocIdSet.has(doc.id)) === true,
    [archivedDocs, selectedArchivedDocIdSet],
  );

  const effectiveArchivedDeleteIds = useMemo(() => {
    if (!archivedDocs?.length || selectedArchivedDocIds.length === 0) {
      return [] as string[];
    }

    return archivedDocs
      .filter((doc) => selectedArchivedDocIdSet.has(doc.id))
      .filter((doc) => {
        let currentParentId = doc.parent_id;

        while (currentParentId) {
          if (selectedArchivedDocIdSet.has(currentParentId)) {
            return false;
          }
          currentParentId =
            archivedDocMap.get(currentParentId)?.parent_id ?? null;
        }

        return true;
      })
      .map((doc) => doc.id);
  }, [
    archivedDocMap,
    archivedDocs,
    selectedArchivedDocIds.length,
    selectedArchivedDocIdSet,
  ]);

  const clampSidebarWidthToContainer = useCallback((nextWidth: number) => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width;
    return clampDocsSidebarWidth(nextWidth, containerWidth);
  }, []);
  const applyHeaderBaseline = useCallback(
    (docId: string | null, nextTitle: string, nextEmoji: string | null, nextWorkerId: string) => {
      headerBaselineRef.current = {
        docId,
        title: nextTitle,
        emoji: nextEmoji,
        docWorkerId: nextWorkerId,
      };
      setIsHeaderDirty(false);
    },
    [],
  );

  const syncHeaderFromDoc = useCallback(
    (
      nextDoc:
        | Pick<ActiveWorkspaceDoc, "id" | "title" | "emoji" | "author" | "author_id">
        | null,
    ) => {
      const nextTitle = nextDoc?.title ?? "";
      const nextEmoji = nextDoc?.emoji ?? null;
      const nextWorkerId = nextDoc?.author?.id ?? nextDoc?.author_id ?? "";
      setTitle(nextTitle);
      setEmoji(nextEmoji);
      setDocWorkerId(nextWorkerId);
      applyHeaderBaseline(nextDoc?.id ?? null, nextTitle, nextEmoji, nextWorkerId);
    },
    [applyHeaderBaseline],
  );
  // Sync state with fetching data
  useEffect(() => {
    if (resolvedActiveDoc) {
      const isDocChanged = headerBaselineRef.current.docId !== resolvedActiveDoc.id;
      if (isDocChanged || !isHeaderDirty) {
        syncHeaderFromDoc(resolvedActiveDoc);
      }
      return;
    }

    if (activeDocId) {
      const pendingDoc = docMap.get(activeDocId);
      if (headerBaselineRef.current.docId !== activeDocId) {
        syncHeaderFromDoc(
          pendingDoc
            ? {
                id: pendingDoc.id,
                title: pendingDoc.title,
                emoji: pendingDoc.emoji ?? null,
                author: null,
                author_id: "",
              }
            : null,
        );
      }
      return;
    }

    syncHeaderFromDoc(null);
  }, [activeDocId, docMap, isHeaderDirty, resolvedActiveDoc, syncHeaderFromDoc]);

  useEffect(() => {
    if (!activeDocId || headerBaselineRef.current.docId !== activeDocId) {
      setIsHeaderDirty(false);
      return;
    }

    setIsHeaderDirty(
      headerBaselineRef.current.title !== title ||
        headerBaselineRef.current.emoji !== (emoji ?? null) ||
        headerBaselineRef.current.docWorkerId !== docWorkerId,
    );
  }, [activeDocId, docWorkerId, emoji, title]);

  const normalDocDirty =
    !isReadOnly &&
    editorMode === "normal" &&
    (isHeaderDirty || normalBodyDirty || editorRef.current?.hasUnsavedChanges());

  useEffect(() => {
    activeDocModeRef.current = editorMode === "collab" ? "COLLAB" : "NORMAL";
    activeDocDirtyRef.current = Boolean(normalDocDirty);
  }, [editorMode, normalDocDirty]);

  useEffect(() => {
    if (editorMode !== "collab") {
      setCollabToken(null);
      setCollabStatus("synced");
      setCollabParticipants([]);
    }
  }, [editorMode]);

  useEffect(() => {
    if (!resolvedActiveDoc?.collab?.isActive) {
      setCollabParticipants([]);
      return;
    }

    setCollabParticipants(resolvedActiveDoc.collab.participants);
  }, [resolvedActiveDoc?.collab]);

  useEffect(() => {
    if (sidebarMode === "archived" && isOrganizeMode) {
      setIsOrganizeMode(false);
    }
  }, [isOrganizeMode, sidebarMode]);

  useEffect(() => {
    if (!archivedDocs) return;

    const validDocIds = new Set(archivedDocs.map((doc) => doc.id));
    setSelectedArchivedDocIds((prev) =>
      prev.filter((docId) => validDocIds.has(docId)),
    );
  }, [archivedDocs]);

  useEffect(() => {
    const handleResize = () => {
      setSidebarWidth((currentWidth) =>
        clampSidebarWidthToContainer(currentWidth),
      );
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [clampSidebarWidthToContainer]);

  const syncDocQuery = useCallback(
    (docId: string | null) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("tab", "docs");
      if (docId) {
        nextParams.set("doc", docId);
      } else {
        nextParams.delete("doc");
      }

      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const toggleDoc = (docId: string) => {
    setExpandedDocs((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const activeDocBreadcrumbs = useMemo(() => {
    if (!activeDocId) return [] as WorkspaceDocSummary[];

    const chain: WorkspaceDocSummary[] = [];
    const visited = new Set<string>();
    let currentParentId = docMap.get(activeDocId)?.parent_id ?? null;

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parentDoc = docMap.get(currentParentId);
      if (!parentDoc) break;
      chain.unshift(parentDoc);
      currentParentId = parentDoc.parent_id ?? null;
    }

    return chain;
  }, [activeDocId, docMap]);

  const handleCreateRootDoc = async (
    kind: "page" | "folder" = "page",
    templateId?: string,
  ) => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${projectId}/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(templateId
            ? {}
            : { title: kind === "folder" ? "새 폴더" : "제목 없음" }),
          parentId: null,
          kind,
          ...(templateId ? { templateId } : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const newDoc = await res.json();
      mutateDocs();
      if (kind === "page") {
        void switchActiveDoc(newDoc.id);
      }
      toast.success(kind === "folder" ? "새 폴더가 생성되었습니다." : "새 문서가 생성되었습니다.");
    } catch {
      toast.error(kind === "folder" ? "폴더 생성 실패" : "문서 생성 실패");
    }
  };

  const availableTasks = useMemo(() => {
    if (!boardData?.tasks) return [];
    const linkedTaskIds = new Set(
      (linkedTasks || []).map((relation) => relation.task.id),
    );
    const keyword = taskSearch.trim().toLowerCase();
    return boardData.tasks.filter((task) => {
      if (linkedTaskIds.has(task.id)) return false;
      if (!keyword) return true;
      return task.title.toLowerCase().includes(keyword);
    });
  }, [boardData?.tasks, linkedTasks, taskSearch]);

  const handleLinkTask = async (taskId: string) => {
    if (!activeDocId) return;
    try {
      const res = await fetch(`/api/workspaces/${projectId}/board/tasks/${taskId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: activeDocId,
          relationType: "reference",
          isPrimary: false,
        }),
      });
      if (!res.ok) throw new Error("Failed");

      setTaskSearch("");
      mutateLinkedTasks();
      toast.success("태스크를 연결했습니다.");
    } catch {
      toast.error("태스크 연결에 실패했습니다.");
    }
  };

  const refreshDocs = useCallback(() => {
    void mutateDocs();
    void mutateArchivedDocs();
  }, [mutateArchivedDocs, mutateDocs]);

  const syncDocPresence = useCallback(
    async (
      docId: string,
      body: {
        mode: "NORMAL" | "COLLAB";
        isDirty: boolean;
        active?: boolean;
      },
    ) => {
      try {
        await fetch(`/api/workspaces/${projectId}/docs/${docId}/collab/presence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          keepalive: body.active === false,
        });
      } catch (error) {
        console.error("Doc presence sync failed", error);
      }
    },
    [projectId],
  );

  const permanentlyDeleteDoc = useCallback(
    async (docId: string) => {
      const res = await fetch(
        `/api/workspaces/${projectId}/docs/${docId}?permanent=true`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        throw new Error(
          payload?.error || payload?.message || "문서 영구 삭제에 실패했습니다.",
        );
      }
    },
    [projectId],
  );

  const handleToggleArchivedDoc = useCallback((docId: string, checked: boolean) => {
    setSelectedArchivedDocIds((prev) => {
      if (checked) {
        if (prev.includes(docId)) return prev;
        return [...prev, docId];
      }

      return prev.filter((selectedId) => selectedId !== docId);
    });
  }, []);

  const handleToggleAllArchivedDocs = useCallback(() => {
    if (!archivedDocs?.length) return;

    setSelectedArchivedDocIds(() =>
      allArchivedSelected ? [] : archivedDocs.map((doc) => doc.id),
    );
  }, [allArchivedSelected, archivedDocs]);

  const handleBulkPermanentDelete = useCallback(async () => {
    if (effectiveArchivedDeleteIds.length === 0) return;

    const confirmed = window.confirm(
      `선택한 ${effectiveArchivedDeleteIds.length}개 항목을 영구 삭제할까요?\n하위 문서도 함께 삭제되며 복구할 수 없습니다.`,
    );

    if (!confirmed) return;

    const results = await Promise.allSettled(
      effectiveArchivedDeleteIds.map((docId) => permanentlyDeleteDoc(docId)),
    );

    const failedDocIds = effectiveArchivedDeleteIds.filter(
      (_, index) => results[index]?.status === "rejected",
    );
    const deletedCount = effectiveArchivedDeleteIds.length - failedDocIds.length;

    refreshDocs();
    setSelectedArchivedDocIds(failedDocIds);

    if (failedDocIds.length === 0) {
      toast.success(`${deletedCount}개 문서를 영구 삭제했습니다.`);
      return;
    }

    if (deletedCount > 0) {
      toast.success(`${deletedCount}개 문서를 삭제했습니다.`);
    }
    toast.error(`${failedDocIds.length}개 문서는 삭제하지 못했습니다.`);
  }, [effectiveArchivedDeleteIds, permanentlyDeleteDoc, refreshDocs]);

  const restoreArchivedDoc = useCallback(
    async (docId: string) => {
      const res = await fetch(`/api/workspaces/${projectId}/docs/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        throw new Error(
          payload?.error || payload?.message || "문서 복원에 실패했습니다.",
        );
      }
    },
    [projectId],
  );

  const handleBulkRestore = useCallback(async () => {
    if (effectiveArchivedDeleteIds.length === 0) return;

    const results = await Promise.allSettled(
      effectiveArchivedDeleteIds.map((docId) => restoreArchivedDoc(docId)),
    );

    const failedDocIds = effectiveArchivedDeleteIds.filter(
      (_, index) => results[index]?.status === "rejected",
    );
    const restoredCount = effectiveArchivedDeleteIds.length - failedDocIds.length;

    refreshDocs();
    setSelectedArchivedDocIds(failedDocIds);

    if (failedDocIds.length === 0) {
      toast.success(`${restoredCount}개 문서를 복원했습니다.`);
      return;
    }

    if (restoredCount > 0) {
      toast.success(`${restoredCount}개 문서를 복원했습니다.`);
    }
    toast.error(`${failedDocIds.length}개 문서는 복원하지 못했습니다.`);
  }, [effectiveArchivedDeleteIds, refreshDocs, restoreArchivedDoc]);

  const handleSidebarResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();

      const startX = event.clientX;
      const startWidth = sidebarWidth;
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      setIsResizingSidebar(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextWidth = clampSidebarWidthToContainer(
          startWidth + moveEvent.clientX - startX,
        );
        setSidebarWidth(nextWidth);
      };

      const handlePointerUp = () => {
        setIsResizingSidebar(false);
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    [clampSidebarWidthToContainer, sidebarWidth],
  );

  const handleSidebarResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSidebarWidth((currentWidth) =>
          clampSidebarWidthToContainer(currentWidth - 16),
        );
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSidebarWidth((currentWidth) =>
          clampSidebarWidthToContainer(currentWidth + 16),
        );
      }

      if (event.key === "Home") {
        event.preventDefault();
        setSidebarWidth(DOCS_SIDEBAR_MIN_WIDTH);
      }
    },
    [clampSidebarWidthToContainer],
  );

  const handleDocArchived = useCallback(
    (docId: string) => {
      if (activeDocId) {
        let currentId: string | null = activeDocId;
        while (currentId) {
          if (currentId === docId) {
            setActiveDocId(null);
            syncDocQuery(null);
            break;
          }
          currentId =
            docs?.find((doc) => doc.id === currentId)?.parent_id ?? null;
        }
      }
      refreshDocs();
    },
    [activeDocId, docs, refreshDocs, syncDocQuery],
  );

  const persistDocHeader = useCallback(
    async (
      updates: Record<string, unknown>,
      options?: { silent?: boolean },
    ) => {
      if (isReadOnly || !activeDocId) {
        return true;
      }

      try {
        const response = await fetch(
          `/api/workspaces/${projectId}/docs/${activeDocId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error || payload?.message || "저장에 실패했습니다.",
          );
        }

        void mutateDocs();
        void mutateActiveDoc();
        return true;
      } catch (error) {
        console.error("Doc metadata save failed", error);
        if (!options?.silent) {
          toast.error(
            error instanceof Error ? error.message : "저장에 실패했습니다.",
          );
        }
        return false;
      }
    },
    [activeDocId, isReadOnly, mutateActiveDoc, mutateDocs, projectId],
  );

  const buildHeaderPayload = useCallback(
    (
      nextTitle = title,
      nextEmoji = emoji,
      nextWorkerId = docWorkerId,
    ): Record<string, unknown> => ({
      title: nextTitle,
      emoji: nextEmoji,
      ...(nextWorkerId ? { authorId: nextWorkerId } : {}),
    }),
    [docWorkerId, emoji, title],
  );

  const debouncedUpdate = useDebouncedCallback(
    async (updates: Record<string, unknown>) => {
      const saved = await persistDocHeader(updates, { silent: true });
      if (!saved) return;

      applyHeaderBaseline(activeDocId, title, emoji ?? null, docWorkerId);
      void mutateDocs();
      void mutateActiveDoc();
    },
    1000,
  );

  const handleSaveCurrentDoc = useCallback(
    async (options?: { silent?: boolean }) => {
      if (isReadOnly || !activeDocId || editorMode !== "normal") {
        return true;
      }

      setIsSavingDocument(true);
      debouncedUpdate.cancel();

      try {
        const headerSaved = await persistDocHeader(
          buildHeaderPayload(),
          { silent: true },
        );

        if (!headerSaved) {
          throw new Error("문서 정보 저장에 실패했습니다.");
        }

        const contentSaved = editorRef.current
          ? await editorRef.current.saveNow({ silent: true })
          : true;

        if (!contentSaved) {
          throw new Error("문서 본문 저장에 실패했습니다.");
        }

        const savedAt = new Date().toISOString();
        setLastSavedAt(savedAt);
        applyHeaderBaseline(activeDocId, title, emoji ?? null, docWorkerId);
        setNormalBodyDirty(false);
        void mutateDocs();
        void mutateActiveDoc();

        if (!options?.silent) {
          toast.success("문서를 저장했습니다.");
        }

        return true;
      } catch (error) {
        if (!options?.silent) {
          toast.error(
            error instanceof Error ? error.message : "문서 저장에 실패했습니다.",
          );
        }
        return false;
      } finally {
        setIsSavingDocument(false);
      }
    },
    [
      activeDocId,
      applyHeaderBaseline,
      debouncedUpdate,
      docWorkerId,
      editorMode,
      emoji,
      buildHeaderPayload,
      isReadOnly,
      mutateActiveDoc,
      mutateDocs,
      persistDocHeader,
      title,
    ],
  );

  const leaveDocCollab = useCallback(
    async (docId: string, options?: { silent?: boolean }) => {
      const response = await fetch(
        `/api/workspaces/${projectId}/docs/${docId}/collab/leave`,
        {
          method: "POST",
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            ended?: boolean;
            collab?: WorkspaceDocCollabState;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "협업 나가기에 실패했습니다.");
      }

      setEditorMode("normal");
      setCollabToken(null);
      setCollabStatus("synced");
      setCollabParticipants(payload?.collab?.participants ?? []);
      void mutateDocs();
      void mutateActiveDoc();

      if (!options?.silent) {
        toast.success(
          payload?.ended
            ? "협업을 종료하고 일반 편집으로 전환했습니다."
            : "협업에서 나갔습니다.",
        );
      }

      return {
        ended: Boolean(payload?.ended),
        collab: payload?.collab ?? null,
      };
    },
    [mutateActiveDoc, mutateDocs, projectId],
  );

  const switchActiveDoc = useCallback(
    async (docId: string | null, options?: { syncQuery?: boolean }) => {
      if (switchingDocRef.current || docId === activeDocId) return;

      switchingDocRef.current = true;
      try {
        try {
          if (activeDocId) {
            if (editorMode === "collab") {
              await leaveDocCollab(activeDocId, { silent: true });
            } else if (!isReadOnly) {
              await handleSaveCurrentDoc({ silent: true });
            }
          }

          setLastSavedAt(null);
          setNormalBodyDirty(false);
          setActiveDocId(docId);

          if (options?.syncQuery !== false) {
            syncDocQuery(docId);
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "문서 전환 중 문제가 발생했습니다.",
          );
        }
      } finally {
        switchingDocRef.current = false;
      }
    },
    [
      activeDocId,
      editorMode,
      handleSaveCurrentDoc,
      isReadOnly,
      leaveDocCollab,
      syncDocQuery,
    ],
  );

  useEffect(() => {
    if (typeof initialDocId === "undefined") return;
    if ((initialDocId ?? null) === activeDocId) return;

    void switchActiveDoc(initialDocId ?? null, { syncQuery: false });
  }, [activeDocId, initialDocId, switchActiveDoc]);

  const handleSelectDoc = useCallback(
    (docId: string) => {
      void switchActiveDoc(docId);
    },
    [switchActiveDoc],
  );

  useEffect(() => {
    if (!activeDocId || isReadOnly) return;

    void syncDocPresence(activeDocId, {
      mode: activeDocModeRef.current,
      isDirty: activeDocDirtyRef.current,
      active: true,
    });

    const intervalId = window.setInterval(() => {
      void syncDocPresence(activeDocId, {
        mode: activeDocModeRef.current,
        isDirty: activeDocDirtyRef.current,
        active: true,
      });
    }, 10_000);

    return () => {
      window.clearInterval(intervalId);
      void syncDocPresence(activeDocId, {
        mode: activeDocModeRef.current,
        isDirty: false,
        active: false,
      });
    };
  }, [activeDocId, isReadOnly, syncDocPresence]);

  useEffect(() => {
    if (!activeDocId || isReadOnly) return;

    void syncDocPresence(activeDocId, {
      mode: activeDocModeRef.current,
      isDirty: activeDocDirtyRef.current,
      active: true,
    });
  }, [activeDocId, editorMode, isReadOnly, normalDocDirty, syncDocPresence]);

  useEffect(() => {
    if (!activeDocId || !resolvedActiveDoc || isReadOnly) return;

    if (!resolvedActiveDoc.collab?.isActive) {
      if (editorMode === "collab") {
        setEditorMode("normal");
        setCollabToken(null);
        setCollabStatus("synced");
      }
      return;
    }

    if (editorMode === "collab") {
      return;
    }

    let isCancelled = false;

    const joinActiveCollab = async () => {
      try {
        const response = await fetch(
          `/api/workspaces/${projectId}/docs/${activeDocId}/collab/token`,
        );
        const payload = (await response.json().catch(() => null)) as
          | {
              error?: string;
              token?: string;
              collab?: WorkspaceDocCollabState;
            }
          | null;

        if (!response.ok) {
          if (response.status !== 409) {
            throw new Error(payload?.error || "협업 문서에 연결할 수 없습니다.");
          }
          return;
        }

        if (isCancelled || !payload?.token) return;

        await syncDocPresence(activeDocId, {
          mode: "COLLAB",
          isDirty: false,
          active: true,
        });
        setCollabToken(payload.token);
        setCollabParticipants(payload.collab?.participants ?? []);
        setCollabStatus("connecting");
        setEditorMode("collab");
      } catch (error) {
        if (!isCancelled) {
          console.error("Doc collab join failed", error);
          toast.error(
            error instanceof Error
              ? error.message
              : "협업 문서 연결에 실패했습니다.",
          );
        }
      }
    };

    void joinActiveCollab();

    return () => {
      isCancelled = true;
    };
  }, [
    activeDocId,
    editorMode,
    isReadOnly,
    projectId,
    resolvedActiveDoc,
    syncDocPresence,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (editorMode !== "normal" || isReadOnly) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "s") return;

      event.preventDefault();
      void handleSaveCurrentDoc();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editorMode, handleSaveCurrentDoc, isReadOnly]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (editorMode === "collab") {
      debouncedUpdate(buildHeaderPayload(newTitle, emoji, docWorkerId));
    }
  };

  const handleEmojiSelect = (emojiData: EmojiSelection) => {
    const nextEmoji = emojiData.native ?? null;
    setEmoji(nextEmoji);
    if (editorMode === "collab") {
      debouncedUpdate(buildHeaderPayload(title, nextEmoji, docWorkerId));
    }
    setIsEmojiPickerOpen(false);
  };

  const handleRemoveEmoji = () => {
    setEmoji(null);
    if (editorMode === "collab") {
      debouncedUpdate(buildHeaderPayload(title, null, docWorkerId));
    }
  };

  const handleDocWorkerChange = (value: string) => {
    setDocWorkerId(value);
    if (editorMode === "collab") {
      debouncedUpdate(buildHeaderPayload(title, emoji, value));
    }
  };

  const handleStartCollab = useCallback(async () => {
    if (isReadOnly || !activeDocId || editorMode === "collab") return;

    setIsStartingCollab(true);
    try {
      const saved = await handleSaveCurrentDoc({ silent: true });
      if (!saved) {
        throw new Error("협업 시작 전에 문서를 저장하지 못했습니다.");
      }

      await syncDocPresence(activeDocId, {
        mode: "NORMAL",
        isDirty: false,
        active: true,
      });

      const response = await fetch(
        `/api/workspaces/${projectId}/docs/${activeDocId}/collab/start`,
        {
          method: "POST",
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            token?: string;
            blockers?: Array<{ userId: string; name: string }>;
            collab?: WorkspaceDocCollabState;
          }
        | null;

      if (!response.ok) {
        const blockerNames = payload?.blockers?.map((blocker) => blocker.name) ?? [];
        const suffix =
          blockerNames.length > 0 ? ` (${blockerNames.join(", ")})` : "";
        throw new Error(
          `${payload?.error || "협업 시작에 실패했습니다."}${suffix}`,
        );
      }

      if (!payload?.token) {
        throw new Error("협업 토큰을 받지 못했습니다.");
      }

      await syncDocPresence(activeDocId, {
        mode: "COLLAB",
        isDirty: false,
        active: true,
      });

      setCollabToken(payload.token);
      setCollabParticipants(payload.collab?.participants ?? []);
      setCollabStatus("connecting");
      setEditorMode("collab");
      void mutateDocs();
      void mutateActiveDoc();
      toast.success("협업을 시작했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "협업 시작에 실패했습니다.",
      );
    } finally {
      setIsStartingCollab(false);
    }
  }, [
    activeDocId,
    editorMode,
    handleSaveCurrentDoc,
    isReadOnly,
    mutateActiveDoc,
    mutateDocs,
    projectId,
    syncDocPresence,
  ]);

  const handleLeaveCollab = useCallback(async () => {
    if (!activeDocId || editorMode !== "collab") return;

    setIsLeavingCollab(true);
    try {
      const result = await leaveDocCollab(activeDocId, { silent: true });
      if (result.ended) {
        await mutateActiveDoc();
        toast.success("협업을 종료하고 일반 편집으로 돌아왔습니다.");
        return;
      }

      setActiveDocId(null);
      syncDocQuery(null);
      toast.success(
        "협업에서 나갔습니다. 다른 팀원이 계속 편집 중이어서 문서를 닫았습니다.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "협업 나가기에 실패했습니다.",
      );
    } finally {
      setIsLeavingCollab(false);
    }
  }, [activeDocId, editorMode, leaveDocCollab, mutateActiveDoc, syncDocQuery]);

  const docWorkerName =
    workspaceMeta?.members?.find((member) => member.id === docWorkerId)?.name ||
    resolvedActiveDoc?.author?.nickname ||
    "미지정";
  const isDocLoadingOverlayVisible =
    isLoadingActiveDoc || Boolean(activeDoc && activeDoc.id !== activeDocId);
  const collabBadgeVisible =
    editorMode === "collab" || Boolean(resolvedActiveDoc?.collab?.isActive);
  const collabParticipantList = collabParticipants.slice(0, 4);
  const collabStatusText =
    collabStatus === "connecting"
      ? "연결 중"
      : collabStatus === "saving"
        ? "실시간 저장 중"
        : collabStatus === "unstable"
          ? "연결 불안정"
          : "동기화 완료";
  const normalStatusText = isSavingDocument
    ? "저장 중..."
    : normalDocDirty
      ? "미저장 변경 있음"
      : formatSavedTime(lastSavedAt);

  return (
    <div ref={containerRef} className="flex h-full min-w-0">
      {/* Docs Sidebar (Inner) */}
      <div
        className="flex h-full flex-none flex-col overflow-hidden border-r bg-muted/10"
        style={{ width: sidebarWidth, minWidth: DOCS_SIDEBAR_MIN_WIDTH }}
      >
        {/* ... Sidebar Content ... */}
        <div className="p-4 border-b flex items-center justify-between h-14">
          <span className="font-semibold text-sm">
            {sidebarMode === "archived" ? "휴지통" : "문서"}
          </span>
          <div className="flex items-center gap-1">
            {sidebarMode === "active" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${
                  isOrganizeMode
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                }`}
                onClick={() => setIsOrganizeMode((prev) => !prev)}
                disabled={isReadOnly}
                title="문서 정리 모드"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={isReadOnly}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => handleCreateRootDoc("page")}>
                  <FileText className="h-4 w-4" />
                  새 문서
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateRootDoc("folder")}>
                  <FolderPlus className="h-4 w-4" />
                  새 폴더
                </DropdownMenuItem>
                {templates && templates.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FileText className="h-4 w-4" />
                        템플릿에서 시작
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-64">
                        {templates.map((template) => (
                          <DropdownMenuItem
                            key={template.id}
                            onClick={() =>
                              handleCreateRootDoc("page", template.id)
                            }
                            className="items-start"
                          >
                            <span className="text-base">{template.emoji}</span>
                            <div className="min-w-0">
                              <p className="font-medium">{template.name}</p>
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {template.description}
                              </p>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${
                sidebarMode === "archived"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              }`}
              onClick={() =>
                setSidebarMode((prev) =>
                  prev === "archived" ? "active" : "archived",
                )
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="min-w-0 flex-1 py-2">
          <div className="px-2 mb-1 text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between group">
            <span>{sidebarMode === "active" ? "전체 문서" : "휴지통"}</span>
            {sidebarMode === "active" && isOrganizeMode && (
              <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-foreground">
                정리 모드
              </span>
            )}
          </div>
          <div className="px-2 space-y-0.5">
            {sidebarMode === "active" && isLoading ? (
              <div className="text-xs text-muted-foreground p-2">
                문서를 불러오는 중...
              </div>
            ) : sidebarMode === "active" && docs && docs.length > 0 ? (
              <DocumentList
                workspaceId={projectId}
                docs={docs}
                readOnly={isReadOnly}
                organizeMode={isOrganizeMode}
                onExpand={toggleDoc}
                expanded={expandedDocs}
                onSelect={handleSelectDoc}
                activeDocId={activeDocId}
                onMutate={refreshDocs}
                onDocArchived={handleDocArchived}
              />
            ) : sidebarMode === "archived" && archivedDocs && archivedDocs.length > 0 ? (
              <div className="space-y-1">
                <div className="mb-2 flex items-center gap-2 rounded-md border bg-background/70 px-2 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={handleToggleAllArchivedDocs}
                  >
                    {allArchivedSelected ? "전체 해제" : "전체 선택"}
                  </Button>
                  <div className="ml-auto flex min-w-0 items-center gap-1">
                    {selectedArchivedDocIds.length > 0 && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-[11px]"
                          onClick={() => void handleBulkRestore()}
                        >
                          복원
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-muted-foreground"
                          onClick={() => void handleBulkPermanentDelete()}
                          disabled={effectiveArchivedDeleteIds.length === 0}
                        >
                          삭제
                        </Button>
                      </>
                    )}
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {selectedArchivedDocIds.length}개 선택
                    </span>
                  </div>
                </div>
                {archivedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selectedArchivedDocIdSet.has(doc.id)}
                      onCheckedChange={(checked) =>
                        handleToggleArchivedDoc(doc.id, checked === true)
                      }
                      aria-label={`${doc.title} 선택`}
                    />
                    <div className="min-w-0 flex flex-1 items-center gap-2">
                      {doc.kind === "folder" ? (
                        <Archive className="h-4 w-4 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">{doc.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                <FileText className="h-8 w-8 opacity-20" />
                <span className="text-xs">
                  {sidebarMode === "active"
                    ? "아직 문서가 없습니다."
                    : "휴지통이 비어 있습니다."}
                </span>
                {sidebarMode === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateRootDoc("page")}
                    disabled={isReadOnly}
                  >
                    첫 문서 만들기
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div
        role="separator"
        aria-label="문서 사이드바 너비 조절"
        aria-orientation="vertical"
        tabIndex={0}
        onPointerDown={handleSidebarResizeStart}
        onKeyDown={handleSidebarResizeKeyDown}
        onDoubleClick={() => setSidebarWidth(DOCS_SIDEBAR_MIN_WIDTH)}
        className={`group relative hidden w-1 flex-none cursor-col-resize bg-transparent transition-colors lg:block ${
          isResizingSidebar ? "bg-border/80" : "hover:bg-border/60"
        }`}
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
      </div>

      {/* Editor Area */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {activeDocId ? (
          <div className="flex flex-col h-full w-full">
            {/* Top Navigation Bar */}
            <header className="h-12 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur shrink-0 z-10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="truncate hover:text-foreground cursor-pointer transition-colors">
                    Documents
                  </span>
                  {activeDocBreadcrumbs.map((breadcrumb) => (
                    <div
                      key={breadcrumb.id}
                      className="flex items-center gap-1 min-w-0"
                    >
                      <Slash className="w-4 h-4 opacity-30 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {breadcrumb.emoji ? `${breadcrumb.emoji} ` : ""}
                        {breadcrumb.title}
                      </span>
                    </div>
                  ))}
                  <Slash className="w-4 h-4 opacity-30 flex-shrink-0" />
                  <span className="truncate font-medium text-foreground flex items-center gap-2">
                    {emoji && <span>{emoji}</span>}
                    {title || "Untitled"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {collabBadgeVisible && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    협업 중
                  </span>
                )}
                {collabParticipantList.length > 0 && (
                  <div className="hidden items-center -space-x-2 sm:flex">
                    {collabParticipantList.map((participant) => (
                      <WorkspaceUserAvatar
                        key={participant.userId}
                        name={participant.name}
                        avatarUrl={participant.avatarUrl}
                        className="h-7 w-7 border-2 border-background shadow-sm"
                        fallbackClassName="bg-emerald-100 text-[10px] font-semibold text-emerald-700"
                      />
                    ))}
                    {collabParticipants.length > collabParticipantList.length && (
                      <span className="ml-2 inline-flex h-7 items-center rounded-full border bg-background px-2 text-[11px] font-medium text-muted-foreground">
                        +{collabParticipants.length - collabParticipantList.length}
                      </span>
                    )}
                  </div>
                )}
                {isReadOnly && (
                  <span className="text-[11px] text-muted-foreground rounded-md border bg-muted/30 px-2 py-1 mr-2">
                    읽기 전용
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {editorMode === "collab" ? (
                    collabStatus === "unstable" ? (
                      <WifiOff className="h-3.5 w-3.5 text-amber-500" />
                    ) : collabStatus === "connecting" || collabStatus === "saving" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    )
                  ) : (
                    isSavingDocument ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    )
                  )}
                  <span className="hidden sm:inline">
                    {editorMode === "collab" ? collabStatusText : normalStatusText}
                  </span>
                </div>
                {!isReadOnly && editorMode === "collab" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => void handleLeaveCollab()}
                    disabled={isLeavingCollab}
                  >
                    {isLeavingCollab ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Users className="h-3.5 w-3.5" />
                    )}
                    협업 나가기
                  </Button>
                ) : !isReadOnly ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => void handleStartCollab()}
                      disabled={isStartingCollab || !resolvedActiveDoc}
                    >
                      {isStartingCollab ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Users className="h-3.5 w-3.5" />
                      )}
                      협업 시작
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => void handleSaveCurrentDoc()}
                      disabled={isSavingDocument || !resolvedActiveDoc}
                    >
                      {isSavingDocument ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      저장
                    </Button>
                  </>
                ) : null}
              </div>
            </header>

            <div className="flex flex-1 min-h-0">
              {/* Scrollable Document Content */}
              <div className="flex-1 overflow-y-auto relative w-full">
              {isDocLoadingOverlayVisible && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50 pointer-events-none">
                  <div className="text-muted-foreground text-sm">
                    문서를 불러오는 중...
                  </div>
                </div>
              )}

              <div className="max-w-4xl mx-auto w-full pt-12 px-12 pb-4">
                <div className="flex items-start gap-4">
                  <div className="group relative shrink-0">
                    <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                      <PopoverTrigger asChild>
                        {emoji ? (
                          <button
                            type="button"
                            disabled={isReadOnly}
                            className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
                              isReadOnly
                                ? "cursor-not-allowed opacity-60"
                                : "cursor-pointer hover:bg-muted/70"
                            }`}
                          >
                            <span className="text-[52px] leading-none">
                              {emoji}
                            </span>
                          </button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-16 min-w-16 rounded-2xl border border-dashed border-border/70 bg-background/70 px-3 text-muted-foreground hover:bg-muted/60"
                            disabled={isReadOnly}
                          >
                            <Smile className="mr-2 h-4 w-4" />
                            아이콘
                          </Button>
                        )}
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 border-none"
                        align="start"
                      >
                        <Picker
                          data={data}
                          onEmojiSelect={handleEmojiSelect}
                          theme="light"
                        />
                      </PopoverContent>
                    </Popover>

                    {emoji && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                        onClick={handleRemoveEmoji}
                        disabled={isReadOnly}
                      >
                        <span className="sr-only">Remove</span>×
                      </Button>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pt-1">
                    <Input
                      value={title}
                      onChange={handleTitleChange}
                      placeholder="Untitled"
                      disabled={isReadOnly}
                      className="h-auto border-none p-0 text-[2.2rem] font-extrabold tracking-tight shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 md:text-[2.7rem]"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                      {formatMetaDate(
                        resolvedActiveDoc?.createdAt || resolvedActiveDoc?.created_at,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>
                      {formatMetaDate(
                        resolvedActiveDoc?.updatedAt || resolvedActiveDoc?.updated_at,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5" />
                    {isReadOnly ? (
                      <span className="font-medium">{docWorkerName}</span>
                    ) : (
                      <Select
                        value={docWorkerId || undefined}
                        onValueChange={handleDocWorkerChange}
                      >
                        <SelectTrigger className="h-7 min-w-[120px] border-0 bg-transparent px-0 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0">
                          <SelectValue placeholder="작업자 선택" />
                        </SelectTrigger>
                        <SelectContent align="start">
                          {(workspaceMeta?.members || []).map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {activeDocId && linkedTasks !== undefined && (
                    <div className="flex items-center gap-1.5 text-sm max-w-full min-w-0">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        {linkedTasks.length > 0 ? (
                          <>
                            {linkedTasks.slice(0, 4).map((relation) => (
                              <button
                                key={relation.id}
                                type="button"
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/70 max-w-[150px]"
                                onClick={() => handleOpenTaskLocally(relation.task.id)}
                              >
                                <span className="truncate">{relation.task.title}</span>
                              </button>
                            ))}
                            {linkedTasks.length > 4 && (
                              <span className="text-xs font-medium text-muted-foreground px-1">
                                +{linkedTasks.length - 4}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/70">연결 없음</span>
                        )}
                        
                        {!isReadOnly && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground shrink-0"
                                title="태스크 연결하기"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                          <PopoverContent align="start" className="z-[60] w-72 p-2">
                            <Input
                              value={taskSearch}
                              onChange={(e) => setTaskSearch(e.target.value)}
                              placeholder="태스크 검색..."
                              className="h-8 text-xs"
                            />
                            <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                              {availableTasks.length > 0 ? (
                                availableTasks.map((task) => (
                                  <button
                                    key={task.id}
                                    type="button"
                                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
                                    onClick={() => handleLinkTask(task.id)}
                                  >
                                    <div className="min-w-0 pr-2">
                                      <div className="truncate font-medium text-foreground">
                                        {task.title}
                                      </div>
                                    </div>
                                    <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  </button>
                                ))
                              ) : (
                                <div className="px-2 py-2 text-xs text-muted-foreground">
                                  연결 가능한 태스크가 없습니다.
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                )}
                </div>

                <div className="h-px bg-border my-6" />
              </div>

              {editorMode === "collab" && collabToken ? (
                <DocumentEditor
                  ref={editorRef}
                  key={`collab-${activeDocId}`}
                  docId={activeDocId}
                  workspaceId={projectId}
                  readOnly={isReadOnly}
                  collabToken={collabToken}
                  onStatusChange={setCollabStatus}
                  onTaskLinked={() => {
                    void mutateLinkedTasks();
                  }}
                  onOpenTask={handleOpenTaskLocally}
                  user={
                    user
                      ? {
                          name:
                            profile?.nickname ||
                            user.email?.split("@")[0] ||
                            "User",
                          color: stringToColor(user.id),
                        }
                      : undefined
                  }
                />
              ) : (
                <NormalDocumentEditor
                  ref={editorRef}
                  key={`normal-${activeDocId}`}
                  docId={activeDocId}
                  workspaceId={projectId}
                  initialContent={resolvedActiveDoc?.content}
                  readOnly={isReadOnly}
                  onDirtyChange={setNormalBodyDirty}
                  onTaskLinked={() => {
                    void mutateLinkedTasks();
                  }}
                  onOpenTask={handleOpenTaskLocally}
                  user={
                    user
                      ? {
                          name:
                            profile?.nickname ||
                            user.email?.split("@")[0] ||
                            "User",
                          color: stringToColor(user.id),
                        }
                      : undefined
                  }
                />
              )}
              </div>

              <DocCollaborationPanel
                workspaceId={projectId}
                docId={activeDocId}
                readOnly={isReadOnly}
                currentUserId={user?.id}
                onOpenTask={handleOpenTaskLocally}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <FileText className="h-12 w-12 opacity-20" />
            <p className="font-medium">
              왼쪽 사이드바에서 문서를 선택하거나 생성하세요.
            </p>
          </div>
        )}
      </div>

      <AdvancedTaskModal
        taskId={selectedTaskId || ""}
        projectId={projectId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </div>
  );
}
