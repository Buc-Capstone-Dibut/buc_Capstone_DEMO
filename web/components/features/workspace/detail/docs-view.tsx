"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
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
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
}

type WorkspaceDocSummary = {
  id: string;
  title: string;
  emoji?: string | null;
  parent_id: string | null;
  updated_at?: string;
};

type ActiveWorkspaceDoc = {
  id: string;
  title: string;
  emoji?: string | null;
  updatedAt?: string;
  content?: unknown;
};

type EmojiSelection = {
  native?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DocsView({ projectId }: DocsViewProps) {
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

  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});

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
      setEmoji(activeDoc.emoji);
      setLastSaved(new Date(activeDoc.updatedAt || Date.now()));
    } else {
      // Reset when no doc active
      setTitle("");
      setEmoji(null);
      setLastSaved(null);
    }
  }, [activeDoc]);

  const toggleDoc = (docId: string) => {
    setExpandedDocs((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const handleCreateRootDoc = async () => {
    if (isReadOnly) {
      toast.error("종료된 팀 공간은 읽기 전용입니다.");
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${projectId}/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "제목 없음", parentId: null }),
      });
      if (!res.ok) throw new Error("Failed");
      const newDoc = await res.json();
      mutateDocs();
      setActiveDocId(newDoc.id);
      toast.success("새 문서가 생성되었습니다.");
    } catch {
      toast.error("문서 생성 실패");
    }
  };

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
          <span className="font-semibold text-sm">Documents</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCreateRootDoc}
            disabled={isReadOnly}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 py-2">
          <div className="px-2 mb-1 text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between group">
            All Pages
          </div>
          <div className="px-2 space-y-0.5">
            {isLoading ? (
              <div className="text-xs text-muted-foreground p-2">
                Loading docs...
              </div>
            ) : docs && docs.length > 0 ? (
              <DocumentList
                workspaceId={projectId}
                docs={docs}
                readOnly={isReadOnly}
                onExpand={toggleDoc}
                expanded={expandedDocs}
                onSelect={setActiveDocId}
                activeDocId={activeDocId}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                <FileText className="h-8 w-8 opacity-20" />
                <span className="text-xs">No documents yet.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateRootDoc}
                  disabled={isReadOnly}
                >
                  Create First
                </Button>
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
                      <span className="hidden sm:inline">Saved</span>
                    </>
                  ) : (
                    <span>Saving...</span>
                  )}
                </div>
              </div>
            </header>

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
                {/* Helper Group: Icon */}
                <div className="group flex items-center gap-2 mb-4 opacity-0 hover:opacity-100 transition-opacity -ml-12 pl-12 h-6">
                  {!emoji && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground h-6 px-1.5 text-xs"
                          disabled={isReadOnly}
                        >
                          <Smile className="w-3.5 h-3.5 mr-1" /> Add Icon
                        </Button>
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
                  )}
                </div>

                {/* Emoji - Large */}
                {emoji && (
                  <div className="group relative w-fit mb-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <div
                          className={`text-[72px] leading-none rounded-md px-1 transition-colors ${isReadOnly ? "cursor-not-allowed opacity-60 pointer-events-none" : "cursor-pointer hover:bg-muted"}`}
                        >
                          {emoji}
                        </div>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-6 opacity-0 group-hover:opacity-100 h-6 w-6 rounded-full"
                      onClick={handleRemoveEmoji}
                      disabled={isReadOnly}
                    >
                      <span className="sr-only">Remove</span>×
                    </Button>
                  </div>
                )}

                {/* Title Input */}
                <Input
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Untitled"
                  disabled={isReadOnly}
                  className="text-4xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-muted-foreground/50"
                  autoFocus
                />

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
