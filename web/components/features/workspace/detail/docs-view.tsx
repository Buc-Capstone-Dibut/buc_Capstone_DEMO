"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { DocCollaborationPanel } from "@/components/features/workspace/docs/doc-collaboration-panel";
import { DocumentList } from "@/components/features/workspace/docs/document-list";
import {
  NormalDocumentEditor,
  type NormalDocumentEditorHandle,
} from "@/components/features/workspace/docs/normal-editor";
import { AdvancedTaskModal } from "@/components/features/workspace/detail/board/advanced-task-modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  LayoutTemplate,
  CopyPlus,
  PencilLine,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { registerDocsBeforeLeaveHandler } from "@/lib/docs-before-leave";

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

type WorkspaceSettingsResponse = {
  success?: boolean;
  data?: {
    publicSummary?: unknown;
    settingsPayload?: Record<string, unknown> | null;
  };
};

type LinkedTaskRelation = {
  id: string;
  relation_type: string;
  is_primary: boolean;
  task: {
    id: string;
    title: string;
    priority: string | null;
    start_date: string | null;
    end_date: string | null;
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
  emoji: string | null;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  sourceDocId?: string | null;
};

type EmojiSelection = {
  native?: string;
};

type EditorHandle = NormalDocumentEditorHandle;

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `문서 데이터를 불러오지 못했습니다. (${response.status})`;
    throw new Error(message);
  }

  return payload;
};

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
  if (!value) return "저장 대기";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "저장 대기";
  return `${new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)} 저장됨`;
};

const DOCS_SIDEBAR_COLLAPSED_WIDTH = 52;
const DOCS_SIDEBAR_COLLAPSE_THRESHOLD = 132;
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

function readCachedSwrData<T>(cacheValue: unknown): T | null {
  if (cacheValue == null) {
    return null;
  }

  if (
    typeof cacheValue === "object" &&
    cacheValue !== null &&
    "data" in cacheValue
  ) {
    return ((cacheValue as { data?: T | null }).data ?? null) as T | null;
  }

  return cacheValue as T;
}

function safeStorageGet(storage: "local" | "session", key: string) {
  if (typeof window === "undefined") return null;

  try {
    const target =
      storage === "local" ? window.localStorage : window.sessionStorage;
    return target.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(
  storage: "local" | "session",
  key: string,
  value: string,
) {
  if (typeof window === "undefined") return false;

  try {
    const target =
      storage === "local" ? window.localStorage : window.sessionStorage;
    target.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function DocsView({
  projectId,
  initialDocId,
  onNavigateToTask,
}: DocsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mutate: mutateCache, cache } = useSWRConfig();
  const { user, profile } = useAuth();
  const docsCacheKey = `/api/workspaces/${projectId}/docs`;
  const archivedDocsCacheKey = `/api/workspaces/${projectId}/docs?archived=true`;
  const expandedDocsStorageKey = `workspace-docs-expanded:${projectId}`;
  const docsBootstrapStorageKey = `workspace-docs-bootstrap:${projectId}`;
  const swrOptions = {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  } as const;
  const docsSWRConfig = {
    ...swrOptions,
    // Doc list changes rarely; 30s eventual consistency is plenty and avoids
    // re-rendering this 3.4k-line editor shell every 5s while the user types.
    refreshInterval: 30_000,
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
  } = useSWR<WorkspaceDocSummary[]>(docsCacheKey, fetcher, docsSWRConfig);
  const { data: archivedDocs, mutate: mutateArchivedDocs } = useSWR<
    WorkspaceDocSummary[]
  >(archivedDocsCacheKey, fetcher, docsSWRConfig);
  const { data: templates, mutate: mutateTemplates } = useSWR<DocTemplate[]>(
    `/api/workspaces/${projectId}/doc-templates`,
    fetcher,
    swrOptions,
  );

  const editorRef = useRef<EditorHandle | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [sidebarMode, setSidebarMode] = useState<"active" | "archived">(
    "active",
  );
  const [sidebarWidth, setSidebarWidth] = useState(DOCS_SIDEBAR_MIN_WIDTH);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isOrganizeMode, setIsOrganizeMode] = useState(false);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [isSwitchingDoc, setIsSwitchingDoc] = useState(false);
  const [isDocsBootstrapping, setIsDocsBootstrapping] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [selectedArchivedDocIds, setSelectedArchivedDocIds] = useState<
    string[]
  >([]);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] =
    useState(false);
  const [isEditTemplateDialogOpen, setIsEditTemplateDialogOpen] =
    useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isUpdatingTemplateDetails, setIsUpdatingTemplateDetails] =
    useState(false);
  const [templateActionId, setTemplateActionId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateEmoji, setTemplateEmoji] = useState<string | null>("📄");
  const [templateDocTitle, setTemplateDocTitle] = useState("");
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
  const activeDocDirtyRef = useRef(false);
  const activeDocIdRef = useRef<string | null>(null);
  const initialDocIdRef = useRef<string | null | undefined>(undefined);
  const expandedDocsHydratedRef = useRef(false);
  const headerReadyRef = useRef(false);
  const workspaceSettingsPayloadRef = useRef<Record<string, unknown>>({});
  const workspacePublicSummaryRef = useRef<unknown>({});
  const switchingDocRef = useRef(false);
  const queuedDocSwitchRef = useRef<{
    docId: string | null;
    options?: { syncQuery?: boolean };
  } | null>(null);
  const headerDraftRef = useRef<{
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
  const saveChainRef = useRef<Promise<boolean>>(Promise.resolve(true));

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
      // Avoid re-rendering the editor shell while the user is typing. Normal
      // saves explicitly refresh the active document after persistence.
      refreshInterval: activeDocId ? 30_000 : 0,
    },
  );

  const activeDocCacheKey = activeDocId
    ? `/api/workspaces/${projectId}/docs/${activeDocId}`
    : null;

  const resolvedActiveDoc = useMemo(() => {
    if (activeDoc && activeDocId && activeDoc.id === activeDocId) {
      return activeDoc;
    }

    if (!activeDocCacheKey || !activeDocId) {
      return null;
    }

    const cachedDoc = readCachedSwrData<ActiveWorkspaceDoc | null>(
      cache.get(activeDocCacheKey),
    );

    return cachedDoc && cachedDoc.id === activeDocId ? cachedDoc : null;
  }, [activeDoc, activeDocCacheKey, activeDocId, cache]);

  const { data: linkedTasks, mutate: mutateLinkedTasks } = useSWR<
    LinkedTaskRelation[]
  >(
    activeDocId
      ? `/api/workspaces/${projectId}/docs/${activeDocId}/tasks`
      : null,
    fetcher,
    swrOptions,
  );

  const { data: boardData } = useSWR<BoardTaskCollection>(
    projectId ? `/api/workspaces/${projectId}/board` : null,
    fetcher,
    swrOptions,
  );

  const [taskSearch, setTaskSearch] = useState("");

  // Local state for header inputs (to be synced)
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleOpenTaskLocally = useCallback(
    (taskId: string) => {
      onNavigateToTask?.(taskId);
      setSelectedTaskId(taskId);
    },
    [onNavigateToTask],
  );
  const [docWorkerId, setDocWorkerId] = useState("");

  const docMap = useMemo(() => {
    const entries = (docs || []).map((doc) => [doc.id, doc] as const);
    return new Map(entries);
  }, [docs]);

  useEffect(() => {
    headerDraftRef.current = {
      docId: activeDocId,
      title,
      emoji: emoji ?? null,
      docWorkerId,
    };
  }, [activeDocId, docWorkerId, emoji, title]);

  const loadWorkspaceViewSettings = useCallback(async () => {
    const handle = profile?.handle?.trim();
    if (!handle) {
      return null;
    }

    const response = await fetch(
      `/api/my/workspace-settings/${encodeURIComponent(handle)}`,
    );
    const payload = (await response
      .json()
      .catch(() => null)) as WorkspaceSettingsResponse | null;

    if (!response.ok || !payload?.success) {
      throw new Error("문서 보기 설정을 불러오지 못했습니다.");
    }

    workspaceSettingsPayloadRef.current =
      payload.data?.settingsPayload &&
      typeof payload.data.settingsPayload === "object"
        ? payload.data.settingsPayload
        : {};
    workspacePublicSummaryRef.current = payload.data?.publicSummary ?? {};

    return payload.data ?? null;
  }, [profile?.handle]);

  const persistWorkspaceViewSettings = useDebouncedCallback(
    async (nextExpandedDocs: Record<string, boolean>) => {
      const handle = profile?.handle?.trim();
      if (!handle) return;

      try {
        const currentPayload =
          workspaceSettingsPayloadRef.current &&
          typeof workspaceSettingsPayloadRef.current === "object"
            ? workspaceSettingsPayloadRef.current
            : {};
        const docsViewSettings =
          currentPayload.docsView && typeof currentPayload.docsView === "object"
            ? (currentPayload.docsView as Record<string, unknown>)
            : {};

        const nextSettingsPayload = {
          ...currentPayload,
          docsView: {
            ...docsViewSettings,
            [projectId]: {
              expandedDocs: nextExpandedDocs,
            },
          },
        };

        const response = await fetch("/api/my/workspace-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicSummary: workspacePublicSummaryRef.current ?? {},
            settingsPayload: nextSettingsPayload,
          }),
        });
        const payload = (await response
          .json()
          .catch(() => null)) as WorkspaceSettingsResponse | null;

        if (!response.ok || !payload?.success) {
          throw new Error("문서 보기 설정 저장에 실패했습니다.");
        }

        workspaceSettingsPayloadRef.current =
          payload.data?.settingsPayload &&
          typeof payload.data.settingsPayload === "object"
            ? payload.data.settingsPayload
            : nextSettingsPayload;
        workspacePublicSummaryRef.current = payload.data?.publicSummary ?? {};
      } catch (error) {
        console.error("Failed to persist docs view settings", error);
      }
    },
    800,
  );

  const activePageDoc = useMemo(() => {
    if (!activeDocId) return null;

    if (resolvedActiveDoc?.kind === "page") {
      return {
        id: resolvedActiveDoc.id,
        title: resolvedActiveDoc.title,
        emoji: resolvedActiveDoc.emoji ?? null,
      };
    }

    const summary = docMap.get(activeDocId);
    if (summary?.kind !== "page") return null;

    return {
      id: summary.id,
      title: summary.title,
      emoji: summary.emoji ?? null,
    };
  }, [activeDocId, docMap, resolvedActiveDoc]);

  const applyHeaderBaseline = useCallback(
    (
      docId: string | null,
      nextTitle: string,
      nextEmoji: string | null,
      nextWorkerId: string,
      currentHeader = {
        docId,
        title: nextTitle,
        emoji: nextEmoji,
        docWorkerId: nextWorkerId,
      },
    ) => {
      headerBaselineRef.current = {
        docId,
        title: nextTitle,
        emoji: nextEmoji,
        docWorkerId: nextWorkerId,
      };
      setIsHeaderDirty(
        currentHeader.docId !== docId ||
          currentHeader.title !== nextTitle ||
          currentHeader.emoji !== nextEmoji ||
          currentHeader.docWorkerId !== nextWorkerId,
      );
    },
    [],
  );

  const syncHeaderFromResolvedDoc = useCallback(
    (
      nextDoc: Pick<
        ActiveWorkspaceDoc,
        "id" | "title" | "emoji" | "author" | "author_id"
      > | null,
    ) => {
      const nextTitle = nextDoc?.title ?? "";
      const nextEmoji = nextDoc?.emoji ?? null;
      const nextWorkerId = nextDoc?.author?.id ?? nextDoc?.author_id ?? "";
      setTitle(nextTitle);
      setEmoji(nextEmoji);
      setDocWorkerId(nextWorkerId);
      applyHeaderBaseline(
        nextDoc?.id ?? null,
        nextTitle,
        nextEmoji,
        nextWorkerId,
      );
      headerReadyRef.current = true;
    },
    [applyHeaderBaseline],
  );

  const syncHeaderFromSummary = useCallback(
    (nextDoc: Pick<WorkspaceDocSummary, "id" | "title" | "emoji"> | null) => {
      const nextTitle = nextDoc?.title ?? "";
      const nextEmoji = nextDoc?.emoji ?? null;
      setTitle(nextTitle);
      setEmoji(nextEmoji);
      setDocWorkerId("");
      applyHeaderBaseline(nextDoc?.id ?? null, nextTitle, nextEmoji, "");
      headerReadyRef.current = nextDoc === null;
    },
    [applyHeaderBaseline],
  );
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
      archivedDocs?.every((doc) => selectedArchivedDocIdSet.has(doc.id)) ===
        true,
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

  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((current) => !current);
  }, []);
  // Sync state with fetching data
  useEffect(() => {
    if (resolvedActiveDoc) {
      const isDocChanged =
        headerBaselineRef.current.docId !== resolvedActiveDoc.id;
      if (isDocChanged || !isHeaderDirty || !headerReadyRef.current) {
        syncHeaderFromResolvedDoc(resolvedActiveDoc);
      }
      return;
    }

    if (activeDocId) {
      const pendingDoc = docMap.get(activeDocId);
      if (
        headerBaselineRef.current.docId !== activeDocId ||
        headerReadyRef.current
      ) {
        syncHeaderFromSummary(
          pendingDoc
            ? {
                id: pendingDoc.id,
                title: pendingDoc.title,
                emoji: pendingDoc.emoji ?? null,
              }
            : null,
        );
      }
      return;
    }

    syncHeaderFromResolvedDoc(null);
  }, [
    activeDocId,
    docMap,
    isHeaderDirty,
    resolvedActiveDoc,
    syncHeaderFromResolvedDoc,
    syncHeaderFromSummary,
  ]);

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
    (isHeaderDirty ||
      normalBodyDirty ||
      editorRef.current?.hasUnsavedChanges());

  useEffect(() => {
    activeDocDirtyRef.current = Boolean(normalDocDirty);
  }, [normalDocDirty]);

  useEffect(() => {
    activeDocIdRef.current = activeDocId;
  }, [activeDocId]);

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
    let cancelled = false;

    const hydrateExpandedDocs = async () => {
      const storedValue = safeStorageGet("local", expandedDocsStorageKey);
      if (storedValue) {
        try {
          const parsed = JSON.parse(storedValue) as Record<string, boolean>;
          if (parsed && typeof parsed === "object" && !cancelled) {
            setExpandedDocs(parsed);
          }
        } catch (error) {
          console.error("Failed to restore expanded docs state", error);
        } finally {
          expandedDocsHydratedRef.current = true;
        }
        return;
      }

      try {
        const settings = await loadWorkspaceViewSettings();
        const settingsPayload =
          settings?.settingsPayload &&
          typeof settings.settingsPayload === "object"
            ? settings.settingsPayload
            : {};
        const docsViewSettings =
          settingsPayload.docsView &&
          typeof settingsPayload.docsView === "object"
            ? (settingsPayload.docsView as Record<string, unknown>)
            : {};
        const projectSettings =
          docsViewSettings[projectId] &&
          typeof docsViewSettings[projectId] === "object"
            ? (docsViewSettings[projectId] as Record<string, unknown>)
            : {};
        const serverExpandedDocs =
          projectSettings.expandedDocs &&
          typeof projectSettings.expandedDocs === "object"
            ? (projectSettings.expandedDocs as Record<string, boolean>)
            : null;

        if (serverExpandedDocs && !cancelled) {
          setExpandedDocs(serverExpandedDocs);
        }
      } catch (error) {
        console.error("Failed to load docs view settings", error);
      } finally {
        expandedDocsHydratedRef.current = true;
      }
    };

    void hydrateExpandedDocs();

    return () => {
      cancelled = true;
    };
  }, [expandedDocsStorageKey, loadWorkspaceViewSettings, projectId]);

  useEffect(() => {
    if (!expandedDocsHydratedRef.current) return;
    const serialized = JSON.stringify(expandedDocs);
    const savedToLocal = safeStorageSet(
      "local",
      expandedDocsStorageKey,
      serialized,
    );

    if (!savedToLocal) {
      persistWorkspaceViewSettings(expandedDocs);
      return;
    }

    persistWorkspaceViewSettings(expandedDocs);
  }, [expandedDocs, expandedDocsStorageKey, persistWorkspaceViewSettings]);

  useEffect(() => {
    if (!docs?.length) return;

    const validFolderIds = new Set(
      docs.filter((doc) => doc.kind === "folder").map((doc) => doc.id),
    );

    setExpandedDocs((prev) => {
      const nextEntries = Object.entries(prev).filter(
        ([docId, isExpanded]) => isExpanded && validFolderIds.has(docId),
      );

      if (nextEntries.length === Object.keys(prev).length) {
        return prev;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [docs]);

  useEffect(() => {
    if (!activeDocId) return;

    const ancestorIds: string[] = [];
    let currentParentId = docMap.get(activeDocId)?.parent_id ?? null;

    while (currentParentId) {
      ancestorIds.push(currentParentId);
      currentParentId = docMap.get(currentParentId)?.parent_id ?? null;
    }

    if (ancestorIds.length === 0) return;

    setExpandedDocs((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const ancestorId of ancestorIds) {
        if (!next[ancestorId]) {
          next[ancestorId] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [activeDocId, docMap]);

  useEffect(() => {
    if (safeStorageGet("session", docsBootstrapStorageKey) === "done") {
      return;
    }

    let cancelled = false;

    const bootstrapDocs = async () => {
      setIsDocsBootstrapping(true);

      try {
        const prefetchedDocs = (await mutateCache(
          docsCacheKey,
          fetcher(docsCacheKey),
          {
            populateCache: true,
            revalidate: false,
          },
        )) as WorkspaceDocSummary[] | undefined;

        await mutateCache(archivedDocsCacheKey, fetcher(archivedDocsCacheKey), {
          populateCache: true,
          revalidate: false,
        });

        const prioritizedDocIds = Array.isArray(prefetchedDocs)
          ? [
              ...(initialDocId ? [initialDocId] : []),
              ...prefetchedDocs
                .filter((doc) => doc.kind === "page")
                .map((doc) => doc.id),
            ]
              .filter((docId, index, array) => array.indexOf(docId) === index)
              .slice(0, 8)
          : initialDocId
            ? [initialDocId]
            : [];

        const runPrefetch = async () => {
          await Promise.allSettled(
            prioritizedDocIds.map((docId) =>
              mutateCache(
                `/api/workspaces/${projectId}/docs/${docId}`,
                fetcher(`/api/workspaces/${projectId}/docs/${docId}`),
                {
                  populateCache: true,
                  revalidate: false,
                },
              ),
            ),
          );
        };

        const windowWithIdle = window as Window & {
          requestIdleCallback?: (callback: () => void) => number;
        };

        if (
          typeof window !== "undefined" &&
          windowWithIdle.requestIdleCallback
        ) {
          await new Promise<void>((resolve) => {
            windowWithIdle.requestIdleCallback?.(() => {
              void runPrefetch().then(resolve);
            });
          });
        } else {
          await runPrefetch();
        }

        if (!cancelled) {
          safeStorageSet("session", docsBootstrapStorageKey, "done");
        }
      } catch (error) {
        console.error("Docs bootstrap sync failed", error);
      } finally {
        if (!cancelled) {
          setIsDocsBootstrapping(false);
        }
      }
    };

    void bootstrapDocs();

    return () => {
      cancelled = true;
    };
  }, [
    archivedDocsCacheKey,
    docsBootstrapStorageKey,
    docsCacheKey,
    initialDocId,
    mutateCache,
    projectId,
  ]);

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
      const res = await fetch(
        `/api/workspaces/${projectId}/board/tasks/${taskId}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docId: activeDocId,
            relationType: "reference",
            isPrimary: false,
          }),
        },
      );
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

  const permanentlyDeleteDoc = useCallback(
    async (docId: string) => {
      const res = await fetch(
        `/api/workspaces/${projectId}/docs/${docId}?permanent=true`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        throw new Error(
          payload?.error ||
            payload?.message ||
            "문서 영구 삭제에 실패했습니다.",
        );
      }
    },
    [projectId],
  );

  const handleToggleArchivedDoc = useCallback(
    (docId: string, checked: boolean) => {
      setSelectedArchivedDocIds((prev) => {
        if (checked) {
          if (prev.includes(docId)) return prev;
          return [...prev, docId];
        }

        return prev.filter((selectedId) => selectedId !== docId);
      });
    },
    [],
  );

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
    const deletedCount =
      effectiveArchivedDeleteIds.length - failedDocIds.length;

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
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
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
    const restoredCount =
      effectiveArchivedDeleteIds.length - failedDocIds.length;

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
      const startWidth = isSidebarCollapsed
        ? DOCS_SIDEBAR_COLLAPSED_WIDTH
        : sidebarWidth;
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      setIsResizingSidebar(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const rawWidth = startWidth + moveEvent.clientX - startX;
        if (rawWidth <= DOCS_SIDEBAR_COLLAPSE_THRESHOLD) {
          setIsSidebarCollapsed(true);
          return;
        }

        const nextWidth = clampSidebarWidthToContainer(rawWidth);
        setSidebarWidth(nextWidth);
        setIsSidebarCollapsed(false);
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
    [clampSidebarWidthToContainer, isSidebarCollapsed, sidebarWidth],
  );

  const handleSidebarResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (
          isSidebarCollapsed ||
          sidebarWidth - 16 <= DOCS_SIDEBAR_COLLAPSE_THRESHOLD
        ) {
          setIsSidebarCollapsed(true);
          return;
        }
        setSidebarWidth((currentWidth) =>
          clampSidebarWidthToContainer(currentWidth - 16),
        );
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (isSidebarCollapsed) {
          setIsSidebarCollapsed(false);
          return;
        }
        setSidebarWidth((currentWidth) =>
          clampSidebarWidthToContainer(currentWidth + 16),
        );
      }

      if (event.key === "Home") {
        event.preventDefault();
        setIsSidebarCollapsed(true);
      }

      if (event.key === "End") {
        event.preventDefault();
        setSidebarWidth(DOCS_SIDEBAR_MIN_WIDTH);
        setIsSidebarCollapsed(false);
      }
    },
    [clampSidebarWidthToContainer, isSidebarCollapsed, sidebarWidth],
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

  const handleSaveCurrentDoc = useCallback(
    (options?: { silent?: boolean }) => {
      if (isReadOnly || !activeDocId) {
        return Promise.resolve(true);
      }

      const run = async () => {
        const savingDocId = activeDocId;
        const savingTitle = title;
        const savingEmoji = emoji ?? null;
        const savingWorkerId = docWorkerId;

        setIsSavingDocument(true);
        try {
          const contentSaved = editorRef.current
            ? await editorRef.current.saveNow({ silent: true })
            : true;

          if (!contentSaved) {
            throw new Error("문서 본문 저장에 실패했습니다.");
          }

          const savedAt = new Date().toISOString();
          if (activeDocIdRef.current === savingDocId) {
            setLastSavedAt(savedAt);
            applyHeaderBaseline(
              savingDocId,
              savingTitle,
              savingEmoji,
              savingWorkerId,
              headerDraftRef.current,
            );
            setNormalBodyDirty(editorRef.current?.hasUnsavedChanges() ?? false);
          }
          void mutateDocs();
          if (activeDocIdRef.current === savingDocId) {
            void mutateActiveDoc();
          }

          if (!options?.silent) {
            toast.success("문서를 저장했습니다.");
          }

          return true;
        } catch (error) {
          if (!options?.silent) {
            toast.error(
              error instanceof Error
                ? error.message
                : "문서 저장에 실패했습니다.",
            );
          }
          return false;
        } finally {
          setIsSavingDocument(false);
        }
      };

      const next = saveChainRef.current.then(run, run);
      saveChainRef.current = next.catch(() => true);
      return next;
    },
    [
      activeDocId,
      applyHeaderBaseline,
      docWorkerId,
      emoji,
      isReadOnly,
      mutateActiveDoc,
      mutateDocs,
      title,
    ],
  );

  const openSaveTemplateDialog = useCallback(() => {
    if (!activePageDoc) {
      toast.error("페이지 문서를 먼저 열어주세요.");
      return;
    }

    setTemplateName(activePageDoc.title || "새 템플릿");
    setTemplateDescription("");
    setTemplateEmoji(activePageDoc.emoji ?? "📄");
    setTemplateDocTitle(activePageDoc.title || "제목 없음");
    setEditingTemplateId(null);
    setIsSaveTemplateDialogOpen(true);
  }, [activePageDoc]);

  const openEditTemplateDialog = useCallback((template: DocTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    setTemplateEmoji(template.emoji ?? "📄");
    setTemplateDocTitle(template.title || "제목 없음");
    setIsEditTemplateDialogOpen(true);
  }, []);

  const prepareCurrentDocForTemplate = useCallback(async () => {
    if (!activePageDoc) {
      toast.error("페이지 문서에서만 템플릿을 만들 수 있습니다.");
      return false;
    }

    const saved = await handleSaveCurrentDoc({ silent: true });
    if (!saved) {
      toast.error("현재 문서를 저장하지 못해 템플릿으로 만들 수 없습니다.");
      return false;
    }

    return true;
  }, [
    activePageDoc,
    handleSaveCurrentDoc,
  ]);

  const handleCreateTemplate = useCallback(async () => {
    if (!activePageDoc) {
      toast.error("템플릿으로 저장할 문서를 찾을 수 없습니다.");
      return;
    }

    if (!templateName.trim()) {
      toast.error("템플릿 이름을 입력해 주세요.");
      return;
    }

    setIsSavingTemplate(true);

    try {
      const ready = await prepareCurrentDocForTemplate();
      if (!ready) {
        return;
      }

      const response = await fetch(
        `/api/workspaces/${projectId}/doc-templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName,
            description: templateDescription,
            emoji: templateEmoji,
            title: templateDocTitle.trim() || activePageDoc.title,
            sourceDocId: activePageDoc.id,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "템플릿 저장에 실패했습니다.");
      }

      await mutateTemplates();
      setIsSaveTemplateDialogOpen(false);
      toast.success("현재 문서를 템플릿으로 저장했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "템플릿 저장에 실패했습니다.",
      );
    } finally {
      setIsSavingTemplate(false);
    }
  }, [
    activePageDoc,
    mutateTemplates,
    prepareCurrentDocForTemplate,
    projectId,
    templateDescription,
    templateDocTitle,
    templateEmoji,
    templateName,
  ]);

  const handleRefreshTemplateFromCurrentDoc = useCallback(
    async (templateId: string) => {
      if (!activePageDoc) {
        toast.error("현재 열어둔 페이지 문서가 없습니다.");
        return;
      }

      setTemplateActionId(templateId);
      try {
        const ready = await prepareCurrentDocForTemplate();
        if (!ready) {
          return;
        }

        const response = await fetch(
          `/api/workspaces/${projectId}/doc-templates/${templateId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceDocId: activePageDoc.id,
            }),
          },
        );

        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.error || "템플릿 갱신에 실패했습니다.");
        }

        await mutateTemplates();
        toast.success("현재 문서 내용으로 템플릿을 갱신했습니다.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "템플릿 갱신에 실패했습니다.",
        );
      } finally {
        setTemplateActionId(null);
      }
    },
    [activePageDoc, mutateTemplates, prepareCurrentDocForTemplate, projectId],
  );

  const handleUpdateTemplateDetails = useCallback(async () => {
    if (!editingTemplateId) {
      return;
    }

    if (!templateName.trim()) {
      toast.error("템플릿 이름을 입력해 주세요.");
      return;
    }

    if (!templateDocTitle.trim()) {
      toast.error("새 문서 기본 제목을 입력해 주세요.");
      return;
    }

    setIsUpdatingTemplateDetails(true);
    setTemplateActionId(editingTemplateId);

    try {
      const response = await fetch(
        `/api/workspaces/${projectId}/doc-templates/${editingTemplateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName,
            description: templateDescription,
            emoji: templateEmoji,
            title: templateDocTitle,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "템플릿 수정에 실패했습니다.");
      }

      await mutateTemplates();
      setIsEditTemplateDialogOpen(false);
      toast.success("템플릿 정보를 수정했습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "템플릿 수정에 실패했습니다.",
      );
    } finally {
      setIsUpdatingTemplateDetails(false);
      setTemplateActionId(null);
    }
  }, [
    editingTemplateId,
    mutateTemplates,
    projectId,
    templateDescription,
    templateDocTitle,
    templateEmoji,
    templateName,
  ]);

  const handleDeleteTemplate = useCallback(
    async (template: DocTemplate) => {
      const confirmed = window.confirm(
        `템플릿 "${template.name}"을 삭제할까요?`,
      );
      if (!confirmed) return;

      setTemplateActionId(template.id);
      try {
        const response = await fetch(
          `/api/workspaces/${projectId}/doc-templates/${template.id}`,
          {
            method: "DELETE",
          },
        );

        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          throw new Error(payload?.error || "템플릿 삭제에 실패했습니다.");
        }

        await mutateTemplates();
        toast.success("템플릿을 삭제했습니다.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "템플릿 삭제에 실패했습니다.",
        );
      } finally {
        setTemplateActionId(null);
      }
    },
    [mutateTemplates, projectId],
  );

  const switchActiveDoc = useCallback(
    async (docId: string | null, options?: { syncQuery?: boolean }) => {
      if (switchingDocRef.current) {
        queuedDocSwitchRef.current = { docId, options };
        return;
      }

      if (docId === activeDocIdRef.current) return;

      switchingDocRef.current = true;
      setIsSwitchingDoc(true);
      try {
        try {
          const previousDocId = activeDocIdRef.current;

          if (
            previousDocId &&
            !isReadOnly &&
            (normalDocDirty || isSavingDocument)
          ) {
            const saved = await handleSaveCurrentDoc({ silent: true });
            if (!saved) {
              toast.error("현재 문서를 저장하지 못해 이동을 취소했습니다.");
              return;
            }
          }

          setLastSavedAt(null);
          setNormalBodyDirty(false);
          activeDocIdRef.current = docId;
          if (docId) {
            const nextDocSummary = docMap.get(docId);
            syncHeaderFromSummary(
              nextDocSummary
                ? {
                    id: nextDocSummary.id,
                    title: nextDocSummary.title,
                    emoji: nextDocSummary.emoji ?? null,
                  }
                : null,
            );
          } else {
            syncHeaderFromResolvedDoc(null);
          }
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
        setIsSwitchingDoc(false);

        const queuedSwitch = queuedDocSwitchRef.current;
        queuedDocSwitchRef.current = null;

        if (queuedSwitch && queuedSwitch.docId !== docId) {
          void Promise.resolve().then(() =>
            switchActiveDoc(queuedSwitch.docId, queuedSwitch.options),
          );
        }
      }
    },
    [
      docMap,
      handleSaveCurrentDoc,
      isReadOnly,
      isSavingDocument,
      normalDocDirty,
      syncHeaderFromResolvedDoc,
      syncHeaderFromSummary,
      syncDocQuery,
    ],
  );

  const handleCreateRootDoc = useCallback(
    async (kind: "page" | "folder" = "page", templateId?: string) => {
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
        void mutateDocs();
        if (kind === "page") {
          void switchActiveDoc(newDoc.id);
        }
        toast.success(
          kind === "folder"
            ? "새 폴더가 생성되었습니다."
            : "새 문서가 생성되었습니다.",
        );
      } catch {
        toast.error(kind === "folder" ? "폴더 생성 실패" : "문서 생성 실패");
      }
    },
    [isReadOnly, mutateDocs, projectId, switchActiveDoc],
  );

  const handleUseTemplate = useCallback(
    async (templateId: string) => {
      await handleCreateRootDoc("page", templateId);
      setIsTemplateManagerOpen(false);
    },
    [handleCreateRootDoc],
  );

  useEffect(() => {
    if (typeof initialDocId === "undefined") return;

    const nextInitialDocId = initialDocId ?? null;
    const previousInitialDocId = initialDocIdRef.current;
    initialDocIdRef.current = nextInitialDocId;

    if (previousInitialDocId === nextInitialDocId) {
      return;
    }

    if (nextInitialDocId === activeDocIdRef.current) {
      return;
    }

    void switchActiveDoc(nextInitialDocId, { syncQuery: false });
  }, [initialDocId, switchActiveDoc]);

  const handleSelectDoc = useCallback(
    (docId: string) => {
      void switchActiveDoc(docId);
    },
    [switchActiveDoc],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isReadOnly) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "s") return;

      event.preventDefault();
      void handleSaveCurrentDoc();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSaveCurrentDoc, isReadOnly]);

  useEffect(
    () => () => persistWorkspaceViewSettings.cancel(),
    [persistWorkspaceViewSettings],
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const reflectActiveDocEmojiInTree = useCallback(
    (nextEmoji: string | null) => {
      const targetDocId = activeDocIdRef.current;
      if (!targetDocId) return;

      void mutateDocs(
        (currentDocs) =>
          currentDocs?.map((doc) =>
            doc.id === targetDocId ? { ...doc, emoji: nextEmoji } : doc,
          ),
        { revalidate: false },
      );
    },
    [mutateDocs],
  );

  const handleEmojiSelect = (emojiData: EmojiSelection) => {
    const nextEmoji = emojiData.native ?? null;
    setEmoji(nextEmoji);
    reflectActiveDocEmojiInTree(nextEmoji);
    setIsEmojiPickerOpen(false);
  };

  const handleRemoveEmoji = () => {
    setEmoji(null);
    reflectActiveDocEmojiInTree(null);
  };

  const handleDocWorkerChange = (value: string) => {
    setDocWorkerId(value);
  };

  const handleBeforeLeaveDocs = useCallback(async () => {
    const currentDocId = activeDocIdRef.current;
    if (!currentDocId) {
      return true;
    }

    if (activeDocDirtyRef.current || isSavingDocument) {
      const saved = await handleSaveCurrentDoc({ silent: true });
      if (!saved) {
        toast.error("현재 문서를 저장하지 못해 화면을 이동하지 않았습니다.");
        return false;
      }
    }

    return true;
  }, [handleSaveCurrentDoc, isSavingDocument]);

  useEffect(
    () => registerDocsBeforeLeaveHandler(handleBeforeLeaveDocs),
    [handleBeforeLeaveDocs],
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!activeDocDirtyRef.current && !isSavingDocument) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSavingDocument]);

  const docWorkerName =
    workspaceMeta?.members?.find((member) => member.id === docWorkerId)?.name ||
    resolvedActiveDoc?.author?.nickname ||
    "미지정";
  const hasResolvedActiveDoc = Boolean(
    activeDocId && resolvedActiveDoc && resolvedActiveDoc.id === activeDocId,
  );
  const isDocLoadingOverlayVisible =
    (isSwitchingDoc && isSavingDocument) ||
    (!hasResolvedActiveDoc &&
      (isSwitchingDoc ||
        isLoadingActiveDoc ||
        Boolean(activeDocId && activeDoc && activeDoc.id !== activeDocId)));
  const docLoadingOverlayText = isSwitchingDoc
    ? isSavingDocument
      ? "이동 전 저장 중..."
      : "문서를 전환하는 중..."
    : "문서를 불러오는 중...";
  const normalStatusText = isSavingDocument
    ? "저장 중..."
    : normalDocDirty
      ? "미저장 변경 있음"
      : formatSavedTime(lastSavedAt);

  return (
    <div ref={containerRef} className="relative flex h-full min-w-0 bg-white">
      {isDocsBootstrapping && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm text-muted-foreground shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            문서를 동기화하고 캐시하는 중...
          </div>
        </div>
      )}
      {/* Docs Sidebar (Inner) */}
      <div
        className="flex h-full flex-none flex-col overflow-hidden border-r bg-white"
        style={{
          width: isSidebarCollapsed
            ? DOCS_SIDEBAR_COLLAPSED_WIDTH
            : sidebarWidth,
          minWidth: isSidebarCollapsed
            ? DOCS_SIDEBAR_COLLAPSED_WIDTH
            : DOCS_SIDEBAR_MIN_WIDTH,
        }}
      >
        {/* ... Sidebar Content ... */}
        <div
          className={`flex h-14 items-center border-b ${
            isSidebarCollapsed ? "justify-center px-1" : "justify-between p-4"
          }`}
        >
          {isSidebarCollapsed ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={toggleSidebarCollapsed}
              title="문서 패널 펼치기"
              aria-label="문서 패널 펼치기"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          ) : (
            <>
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
                    <DropdownMenuItem
                      onClick={() => handleCreateRootDoc("page")}
                    >
                      <FileText className="h-4 w-4" />새 문서
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleCreateRootDoc("folder")}
                    >
                      <FolderPlus className="h-4 w-4" />새 폴더
                    </DropdownMenuItem>
                    {templates && templates.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <LayoutTemplate className="h-4 w-4" />
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
                                <span className="text-base">
                                  {template.emoji || "📄"}
                                </span>
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
                    <DropdownMenuSeparator />
                    {activePageDoc && (
                      <DropdownMenuItem onClick={openSaveTemplateDialog}>
                        <CopyPlus className="h-4 w-4" />
                        현재 문서를 템플릿으로 저장
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => setIsTemplateManagerOpen(true)}
                    >
                      <LayoutTemplate className="h-4 w-4" />
                      템플릿 관리
                    </DropdownMenuItem>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={toggleSidebarCollapsed}
                  title="문서 패널 접기"
                  aria-label="문서 패널 접기"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
        <ScrollArea className="min-w-0 flex-1 py-2">
          {!isSidebarCollapsed ? (
            <div className="px-2 mb-1 text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between group">
              <span>{sidebarMode === "active" ? "전체 문서" : "휴지통"}</span>
              {sidebarMode === "active" && isOrganizeMode && (
                <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-foreground">
                  정리 모드
                </span>
              )}
            </div>
          ) : null}
          <div
            className={
              isSidebarCollapsed ? "space-y-0.5 px-1" : "px-2 space-y-0.5"
            }
          >
            {sidebarMode === "active" && isLoading ? (
              isSidebarCollapsed ? (
                <Loader2 className="mx-auto mt-2 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-xs text-muted-foreground p-2">
                  문서를 불러오는 중...
                </div>
              )
            ) : sidebarMode === "active" && docs && docs.length > 0 ? (
              <DocumentList
                workspaceId={projectId}
                docs={docs}
                collapsed={isSidebarCollapsed}
                readOnly={isReadOnly}
                organizeMode={isOrganizeMode}
                onExpand={toggleDoc}
                expanded={expandedDocs}
                onSelect={handleSelectDoc}
                activeDocId={activeDocId}
                onMutate={refreshDocs}
                onDocArchived={handleDocArchived}
              />
            ) : sidebarMode === "archived" &&
              archivedDocs &&
              archivedDocs.length > 0 ? (
              <div className="space-y-1">
                {!isSidebarCollapsed ? (
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
                ) : null}
                {archivedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center rounded-md text-sm text-muted-foreground hover:bg-muted/40 ${
                      isSidebarCollapsed
                        ? "mx-auto h-9 w-9 justify-center p-0"
                        : "gap-2 px-2 py-2"
                    }`}
                    title={isSidebarCollapsed ? doc.title : undefined}
                  >
                    {!isSidebarCollapsed ? (
                      <Checkbox
                        checked={selectedArchivedDocIdSet.has(doc.id)}
                        onCheckedChange={(checked) =>
                          handleToggleArchivedDoc(doc.id, checked === true)
                        }
                        aria-label={`${doc.title} 선택`}
                      />
                    ) : null}
                    <div
                      className={`min-w-0 flex items-center ${
                        isSidebarCollapsed ? "justify-center" : "flex-1 gap-2"
                      }`}
                    >
                      {doc.kind === "folder" ? (
                        <Archive className="h-4 w-4 shrink-0" />
                      ) : doc.emoji ? (
                        <span className="text-base leading-none">
                          {doc.emoji}
                        </span>
                      ) : (
                        <FileText className="h-4 w-4 shrink-0" />
                      )}
                      {!isSidebarCollapsed ? (
                        <span className="truncate">{doc.title}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                <FileText className="h-8 w-8 opacity-20" />
                {!isSidebarCollapsed ? (
                  <span className="text-xs">
                    {sidebarMode === "active"
                      ? "아직 문서가 없습니다."
                      : "휴지통이 비어 있습니다."}
                  </span>
                ) : null}
                {sidebarMode === "active" && !isSidebarCollapsed && (
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
        onDoubleClick={toggleSidebarCollapsed}
        className={`group relative hidden w-1 flex-none cursor-col-resize bg-transparent transition-colors lg:block ${
          isResizingSidebar ? "bg-border/80" : "hover:bg-border/60"
        }`}
      >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
      </div>

      {/* Editor Area */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white">
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
                {isReadOnly && (
                  <span className="text-[11px] text-muted-foreground rounded-md border bg-muted/30 px-2 py-1 mr-2">
                    읽기 전용
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {isSavingDocument ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  )}
                  <span className="hidden sm:inline">{normalStatusText}</span>
                </div>
                {!isReadOnly ? (
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
                ) : null}
              </div>
            </header>

            <div className="flex flex-1 min-h-0">
              {/* Scrollable Document Content */}
              <div className="flex-1 overflow-y-auto relative w-full">
                {isDocLoadingOverlayVisible && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85">
                    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {docLoadingOverlayText}
                    </div>
                  </div>
                )}

                <div className="max-w-4xl mx-auto w-full pt-12 px-12 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="group relative shrink-0">
                      <Popover
                        open={isEmojiPickerOpen}
                        onOpenChange={setIsEmojiPickerOpen}
                      >
                        <PopoverTrigger asChild>
                          {emoji ? (
                            <button
                              type="button"
                              disabled={isReadOnly}
                              title="아이콘 변경"
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
                              size="icon"
                              title="아이콘"
                              aria-label="아이콘 선택"
                              className="h-16 w-16 rounded-2xl border border-dashed border-border/70 bg-background/70 text-muted-foreground hover:bg-muted/60"
                              disabled={isReadOnly}
                            >
                              <Smile className="h-5 w-5" />
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
                          resolvedActiveDoc?.createdAt ||
                            resolvedActiveDoc?.created_at,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>
                        {formatMetaDate(
                          resolvedActiveDoc?.updatedAt ||
                            resolvedActiveDoc?.updated_at,
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
                                  onClick={() =>
                                    handleOpenTaskLocally(relation.task.id)
                                  }
                                >
                                  <span className="truncate">
                                    {relation.task.title}
                                  </span>
                                </button>
                              ))}
                              {linkedTasks.length > 4 && (
                                <span className="text-xs font-medium text-muted-foreground px-1">
                                  +{linkedTasks.length - 4}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/70">
                              연결 없음
                            </span>
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
                              <PopoverContent
                                align="start"
                                className="z-[60] w-72 p-2"
                              >
                                <Input
                                  value={taskSearch}
                                  onChange={(e) =>
                                    setTaskSearch(e.target.value)
                                  }
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

                <NormalDocumentEditor
                  ref={editorRef}
                  key={`normal-${activeDocId}`}
                  docId={activeDocId}
                  workspaceId={projectId}
                  initialContent={resolvedActiveDoc?.content}
                  readOnly={isReadOnly}
                  saveMetadata={{
                    title,
                    emoji: emoji ?? null,
                    ...(docWorkerId ? { authorId: docWorkerId } : {}),
                  }}
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

      <Dialog
        open={isSaveTemplateDialogOpen}
        onOpenChange={(open) => {
          if (!isSavingTemplate) {
            setIsSaveTemplateDialogOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>현재 문서를 템플릿으로 저장</DialogTitle>
            <DialogDescription>
              제목, 설명, 기본 아이콘을 정해 재사용 가능한 문서 템플릿으로
              저장합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-template-name">템플릿 이름</Label>
              <Input
                id="doc-template-name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="예: 회의록 템플릿"
                disabled={isSavingTemplate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-template-emoji">템플릿 아이콘</Label>
              <Input
                id="doc-template-emoji"
                value={templateEmoji ?? ""}
                onChange={(event) =>
                  setTemplateEmoji(event.target.value || null)
                }
                placeholder="📄"
                disabled={isSavingTemplate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-template-title">새 문서 기본 제목</Label>
              <Input
                id="doc-template-title"
                value={templateDocTitle}
                onChange={(event) => setTemplateDocTitle(event.target.value)}
                placeholder="예: 주간 회의록"
                disabled={isSavingTemplate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-template-description">설명</Label>
              <Textarea
                id="doc-template-description"
                value={templateDescription}
                onChange={(event) => setTemplateDescription(event.target.value)}
                placeholder="이 템플릿을 언제 쓰는지 짧게 적어주세요."
                rows={3}
                disabled={isSavingTemplate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSaveTemplateDialogOpen(false)}
              disabled={isSavingTemplate}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateTemplate()}
              disabled={isSavingTemplate || !templateName.trim()}
            >
              {isSavingTemplate ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LayoutTemplate className="mr-2 h-4 w-4" />
              )}
              템플릿 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditTemplateDialogOpen}
        onOpenChange={(open) => {
          if (!isUpdatingTemplateDetails) {
            setIsEditTemplateDialogOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>템플릿 편집</DialogTitle>
            <DialogDescription>
              템플릿 이름, 아이콘, 설명과 새 문서 기본 제목을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-doc-template-name">템플릿 이름</Label>
              <Input
                id="edit-doc-template-name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="예: 패치노트 템플릿"
                disabled={isUpdatingTemplateDetails}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-doc-template-emoji">템플릿 아이콘</Label>
              <Input
                id="edit-doc-template-emoji"
                value={templateEmoji ?? ""}
                onChange={(event) =>
                  setTemplateEmoji(event.target.value || null)
                }
                placeholder="📄"
                disabled={isUpdatingTemplateDetails}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-doc-template-title">새 문서 기본 제목</Label>
              <Input
                id="edit-doc-template-title"
                value={templateDocTitle}
                onChange={(event) => setTemplateDocTitle(event.target.value)}
                placeholder="예: 이번 주 패치노트"
                disabled={isUpdatingTemplateDetails}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-doc-template-description">설명</Label>
              <Textarea
                id="edit-doc-template-description"
                value={templateDescription}
                onChange={(event) => setTemplateDescription(event.target.value)}
                placeholder="이 템플릿을 언제 쓰는지 짧게 적어주세요."
                rows={3}
                disabled={isUpdatingTemplateDetails}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditTemplateDialogOpen(false)}
              disabled={isUpdatingTemplateDetails}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={() => void handleUpdateTemplateDetails()}
              disabled={
                isUpdatingTemplateDetails ||
                !templateName.trim() ||
                !templateDocTitle.trim()
              }
            >
              {isUpdatingTemplateDetails ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PencilLine className="mr-2 h-4 w-4" />
              )}
              템플릿 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTemplateManagerOpen}
        onOpenChange={setIsTemplateManagerOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>템플릿 관리</DialogTitle>
            <DialogDescription>
              워크스페이스에서 직접 만든 문서 템플릿을 사용하거나 정리할 수
              있습니다.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-3">
              {templates && templates.length > 0 ? (
                templates.map((template) => {
                  const isBusy = templateActionId === template.id;
                  return (
                    <div
                      key={template.id}
                      className="rounded-xl border bg-background/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {template.emoji || "📄"}
                            </span>
                            <span className="truncate font-medium">
                              {template.name}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {template.description || "설명이 없습니다."}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            생성 문서 제목: {template.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            마지막 수정: {formatMetaDate(template.updatedAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleUseTemplate(template.id)}
                            disabled={isBusy}
                          >
                            사용
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditTemplateDialog(template)}
                            disabled={isBusy}
                          >
                            <PencilLine className="mr-2 h-4 w-4" />
                            편집
                          </Button>
                          {activePageDoc && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void handleRefreshTemplateFromCurrentDoc(
                                  template.id,
                                )
                              }
                              disabled={isBusy}
                            >
                              {isBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "현재 문서로 갱신"
                              )}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => void handleDeleteTemplate(template)}
                            disabled={isBusy}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  아직 저장된 템플릿이 없습니다. 문서를 하나 만든 뒤 템플릿으로
                  저장해보세요.
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            {activePageDoc && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTemplateManagerOpen(false);
                  openSaveTemplateDialog();
                }}
              >
                <CopyPlus className="mr-2 h-4 w-4" />
                현재 문서를 템플릿으로 저장
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
