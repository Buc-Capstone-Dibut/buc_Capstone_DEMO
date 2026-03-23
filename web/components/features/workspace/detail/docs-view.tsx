"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import useSWR from "swr";
import { DocCollaborationPanel } from "@/components/features/workspace/docs/doc-collaboration-panel";
import { DocumentList } from "@/components/features/workspace/docs/document-list";
import { DocumentEditor } from "@/components/features/workspace/docs/editor";
import { AdvancedTaskModal } from "@/components/features/workspace/detail/board/advanced-task-modal";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  FileText,
  Smile,
  Slash,
  CheckCircle2,
  FolderPlus,
  RotateCcw,
  Archive,
  CalendarDays,
  Clock3,
  Link2,
  Trash2,
  UserRound,
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
    swrOptions,
  );
  const { data: archivedDocs, mutate: mutateArchivedDocs } = useSWR<
    WorkspaceDocSummary[]
  >(`/api/workspaces/${projectId}/docs?archived=true`, fetcher, swrOptions);
  const { data: templates } = useSWR<DocTemplate[]>(
    `/api/workspaces/${projectId}/doc-templates`,
    fetcher,
    swrOptions,
  );

  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [sidebarMode, setSidebarMode] = useState<"active" | "archived">("active");

  // Active Doc Data (If Selected)
  const {
    data: activeDoc,
    mutate: mutateActiveDoc,
    isLoading: isLoadingActiveDoc,
  } = useSWR<ActiveWorkspaceDoc | null>(
    activeDocId ? `/api/workspaces/${projectId}/docs/${activeDocId}` : null,
    fetcher,
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

  // Sync state with fetching data
  useEffect(() => {
    if (activeDoc) {
      setTitle(activeDoc.title);
      setEmoji(activeDoc.emoji ?? null);
      setDocWorkerId(activeDoc.author?.id ?? activeDoc.author_id ?? "");
    } else {
      // Reset when no doc active
      setTitle("");
      setEmoji(null);
      setDocWorkerId("");
    }
  }, [activeDoc]);

  useEffect(() => {
    if (initialDocId) {
      setActiveDocId(initialDocId);
    }
  }, [initialDocId]);

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

  const handleSelectDoc = useCallback(
    (docId: string) => {
      setActiveDocId(docId);
      syncDocQuery(docId);
    },
    [syncDocQuery],
  );

  const toggleDoc = (docId: string) => {
    setExpandedDocs((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

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
        setActiveDocId(newDoc.id);
        syncDocQuery(newDoc.id);
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

  const handleRestoreDoc = useCallback(
    async (docId: string) => {
      try {
        const res = await fetch(`/api/workspaces/${projectId}/docs/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: false }),
        });
        if (!res.ok) throw new Error("Failed");
        refreshDocs();
        toast.success("문서를 복원했습니다.");
      } catch {
        toast.error("문서 복원 실패");
      }
    },
    [projectId, refreshDocs],
  );

  const handlePermanentDeleteDoc = useCallback(
    async (docId: string, title: string) => {
      const confirmed = window.confirm(
        `"${title}" 문서를 영구 삭제할까요?\n휴지통에서도 사라지며 복구할 수 없습니다.`,
      );

      if (!confirmed) return;

      try {
        const res = await fetch(
          `/api/workspaces/${projectId}/docs/${docId}?permanent=true`,
          {
            method: "DELETE",
          },
        );
        if (!res.ok) throw new Error("Failed");
        refreshDocs();
        toast.success("문서를 영구 삭제했습니다.");
      } catch {
        toast.error("문서 영구 삭제 실패");
      }
    },
    [projectId, refreshDocs],
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

  // --- Header Update Logic (Shared with Page) ---
  const debouncedUpdate = useDebouncedCallback(
    async (updates: Record<string, unknown>) => {
    if (isReadOnly) return;
    if (!activeDocId) return;
    try {
      await fetch(`/api/workspaces/${projectId}/docs/${activeDocId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      mutateDocs(); // Refresh sidebar title
      void mutateActiveDoc();
    } catch (e) {
      console.error("Auto-save failed", e);
      toast.error("저장에 실패했습니다.");
    }
  }, 1000,
  ); // 1s debounce

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedUpdate({ title: newTitle });
  };

  const handleEmojiSelect = (emojiData: EmojiSelection) => {
    const nextEmoji = emojiData.native ?? null;
    setEmoji(nextEmoji);
    debouncedUpdate({ emoji: nextEmoji });
    setIsEmojiPickerOpen(false);
  };

  const handleRemoveEmoji = () => {
    setEmoji(null);
    debouncedUpdate({ emoji: null });
  };

  const handleDocWorkerChange = (value: string) => {
    setDocWorkerId(value);
    debouncedUpdate({ authorId: value });
  };

  const docWorkerName =
    workspaceMeta?.members?.find((member) => member.id === docWorkerId)?.name ||
    activeDoc?.author?.nickname ||
    "미지정";

  return (
    <div className="flex h-full">
      {/* Docs Sidebar (Inner) */}
      <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
        {/* ... Sidebar Content ... */}
        <div className="p-4 border-b flex items-center justify-between h-14">
          <span className="font-semibold text-sm">
            {sidebarMode === "archived" ? "휴지통" : "문서"}
          </span>
          <div className="flex items-center gap-1">
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
        <ScrollArea className="flex-1 py-2">
          <div className="px-2 mb-1 text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between group">
            {sidebarMode === "active" ? "전체 문서" : "휴지통"}
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
                onExpand={toggleDoc}
                expanded={expandedDocs}
                onSelect={handleSelectDoc}
                activeDocId={activeDocId}
                onMutate={refreshDocs}
                onDocArchived={handleDocArchived}
              />
            ) : sidebarMode === "archived" && archivedDocs && archivedDocs.length > 0 ? (
              <div className="space-y-1">
                {archivedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      {doc.kind === "folder" ? (
                        <Archive className="h-4 w-4 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">{doc.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleRestoreDoc(doc.id)}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      복원
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handlePermanentDeleteDoc(doc.id, doc.title)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      삭제
                    </Button>
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

      {/* Editor Area */}
      <div className="flex-1 bg-background flex flex-col h-full overflow-hidden relative">
        {activeDocId ? (
          <div className="flex flex-col h-full w-full">
            {/* Top Navigation Bar */}
            <header className="h-12 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur shrink-0 z-10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="truncate hover:text-foreground cursor-pointer transition-colors">
                    Documents
                  </span>
                  <Slash className="w-4 h-4 opacity-30 flex-shrink-0" />
                  <span className="truncate font-medium text-foreground flex items-center gap-2">
                    {emoji && <span>{emoji}</span>}
                    {title || "Untitled"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isReadOnly && (
                  <span className="text-[11px] text-muted-foreground rounded-md border bg-muted/30 px-2 py-1 mr-2">
                    읽기 전용
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="hidden sm:inline">실시간 동기화</span>
                </div>
              </div>
            </header>

            <div className="flex flex-1 min-h-0">
              {/* Scrollable Document Content */}
              <div className="flex-1 overflow-y-auto relative w-full">
              {/* Loading Overlay - only if initial load and no data yet */}
              {isLoadingActiveDoc && !activeDoc && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50 pointer-events-none">
                  <div className="text-muted-foreground text-sm">
                    Loading document...
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
                      {formatMetaDate(activeDoc?.createdAt || activeDoc?.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>
                      {formatMetaDate(activeDoc?.updatedAt || activeDoc?.updated_at)}
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

              {/* Real-time Editor with Auto-Save */}
              <DocumentEditor
                key={activeDocId}
                docId={activeDocId}
                workspaceId={projectId}
                initialContent={activeDoc?.content}
                readOnly={isReadOnly}
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
    </div>
  );
}
