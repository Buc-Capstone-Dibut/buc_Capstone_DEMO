"use client";

import { useState, useEffect, useCallback } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import useSWR from "swr";
import { DocCollaborationPanel } from "@/components/features/workspace/docs/doc-collaboration-panel";
import { DocumentList } from "@/components/features/workspace/docs/document-list";
import { DocumentEditor } from "@/components/features/workspace/docs/editor";
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
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
  updatedAt?: string;
  updated_at?: string;
  content?: unknown;
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

  const { data: workspaceMeta } = useSWR(
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
    isLoading: isLoadingActiveDoc,
  } = useSWR<ActiveWorkspaceDoc | null>(
    activeDocId ? `/api/workspaces/${projectId}/docs/${activeDocId}` : null,
    fetcher,
  );

  // Local state for header inputs (to be synced)
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Sync state with fetching data
  useEffect(() => {
    if (activeDoc) {
      setTitle(activeDoc.title);
      setEmoji(activeDoc.emoji ?? null);
      setLastSaved(
        new Date(activeDoc.updatedAt || activeDoc.updated_at || Date.now()),
      );
    } else {
      // Reset when no doc active
      setTitle("");
      setEmoji(null);
      setLastSaved(null);
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
      setLastSaved(new Date());
    } catch (e) {
      console.error("Auto-save failed", e);
      toast.error("저장에 실패했습니다.");
    }
  }, 1000,
  ); // 1s debounce

  const handleContentSave = useCallback(
    (content: unknown) => {
      debouncedUpdate({ content });
    },
    [debouncedUpdate],
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedUpdate({ title: newTitle });
  };

  const handleEmojiSelect = (emojiData: EmojiSelection) => {
    const nextEmoji = emojiData.native ?? null;
    setEmoji(nextEmoji);
    debouncedUpdate({ emoji: nextEmoji });
  };

  const handleRemoveEmoji = () => {
    setEmoji(null);
    debouncedUpdate({ emoji: null });
  };

  return (
    <div className="flex h-full">
      {/* Docs Sidebar (Inner) */}
      <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
        {/* ... Sidebar Content ... */}
        <div className="p-4 border-b flex items-center justify-between h-14">
          <span className="font-semibold text-sm">문서</span>
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
        </div>
        <div className="px-3 pt-3">
          <div className="grid grid-cols-2 rounded-lg bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setSidebarMode("active")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                sidebarMode === "active"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              문서
            </button>
            <button
              type="button"
              onClick={() => setSidebarMode("archived")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                sidebarMode === "archived"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              휴지통
            </button>
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
                  {lastSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      <span className="hidden sm:inline">저장됨</span>
                    </>
                  ) : (
                    <span>저장 중...</span>
                  )}
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
                    <Popover>
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

                <div className="h-px bg-border my-6" />
              </div>

              {/* Real-time Editor with Auto-Save */}
              <DocumentEditor
                key={activeDocId}
                docId={activeDocId}
                initialContent={activeDoc?.content}
                onSave={handleContentSave}
                readOnly={isReadOnly}
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
                onOpenTask={onNavigateToTask}
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
    </div>
  );
}
