"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Calendar as CalendarIcon,
  User,
  Flag,
  Tag,
  Plus,
  CheckCircle2,
  Trash2,
  FileText,
  Link2,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";

// --- Types ---
interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  columnId: string;
  projectId: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string | null;
  assignee?: { id: string; name: string; avatar?: string };
  tags?: unknown[];
  [key: string]: unknown;
}

interface TagOption {
  id: string;
  name: string;
  color?: string;
}

interface BoardColumn {
  id: string;
  title: string;
  statusId?: string;
}

interface BoardMember {
  id: string;
  name: string | null;
  avatar?: string | null;
}

interface BoardData {
  tasks: Task[];
  columns: BoardColumn[];
  members: BoardMember[];
  tags: TagOption[];
}

interface WorkspaceDocSummary {
  id: string;
  kind: "page" | "folder";
  title: string;
  emoji?: string | null;
  parent_id: string | null;
  is_archived?: boolean;
}

interface TaskDocumentRelation {
  id: string;
  relationType: string;
  isPrimary: boolean;
  doc: {
    id: string;
    title: string;
    emoji?: string | null;
    kind: "page" | "folder";
    isArchived?: boolean;
  };
}

interface AdvancedTaskModalProps {
  taskId: string | null;
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToDoc?: (docId: string) => void;
}

const RELATION_TYPE_LABEL: Record<string, string> = {
  reference: "참고",
  spec: "요구사항",
  meeting_note: "회의록",
  qa: "QA",
  result: "결과",
  design: "디자인",
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PRIORITY_LABEL: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  urgent: "긴급",
};

const TAG_BADGE_CLASS: Record<string, string> = {
  gray: "bg-slate-100 text-slate-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  pink: "bg-pink-100 text-pink-700",
};

const TAG_DOT_CLASS: Record<string, string> = {
  gray: "bg-slate-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  yellow: "bg-yellow-400",
  green: "bg-green-400",
  blue: "bg-blue-400",
  purple: "bg-purple-400",
  pink: "bg-pink-400",
};

const normalizeTagColor = (color?: string) => {
  if (!color) return "gray";
  const firstToken = color.toLowerCase().split(" ")[0];
  return firstToken.replace(/^bg-/, "").replace(/-(100|500)$/, "");
};

const normalizeTagIds = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => {
      if (typeof tag === "string") return tag;
      if (tag && typeof tag === "object" && "id" in tag) {
        return String((tag as { id: unknown }).id);
      }
      return null;
    })
    .filter((tagId): tagId is string => !!tagId);
};

const getTagColorClass = (color?: string) => {
  const normalized = normalizeTagColor(color);
  return TAG_BADGE_CLASS[normalized] || TAG_BADGE_CLASS.gray;
};

const getTagDotClass = (color?: string) => {
  const normalized = normalizeTagColor(color);
  return TAG_DOT_CLASS[normalized] || TAG_DOT_CLASS.gray;
};

export function AdvancedTaskModal({
  taskId,
  projectId,
  open,
  onOpenChange,
  onNavigateToDoc,
}: AdvancedTaskModalProps) {
  const { mutate } = useSWRConfig();
  const boardEndpoint = projectId ? `/api/workspaces/${projectId}/board` : "";

  // --- Data Fetching ---
  const swrOptions = {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  } as const;
  const { data: boardData } = useSWR<BoardData>(
    projectId && open ? `/api/workspaces/${projectId}/board` : null,
    fetcher,
    swrOptions,
  );
  const { data: docs = [] } = useSWR<WorkspaceDocSummary[]>(
    projectId && open ? `/api/workspaces/${projectId}/docs` : null,
    fetcher,
    swrOptions,
  );
  const relationEndpoint =
    projectId && taskId
      ? `/api/workspaces/${projectId}/board/tasks/${taskId}/documents`
      : null;
  const { data: linkedDocs = [] } = useSWR<TaskDocumentRelation[]>(
    relationEndpoint,
    fetcher,
    swrOptions,
  );

  const tasks: Task[] = boardData?.tasks || [];
  const columns: BoardColumn[] = boardData?.columns || [];
  const members: BoardMember[] = boardData?.members || [];
  const tagOptions = useMemo(() => boardData?.tags || [], [boardData?.tags]);

  const task = tasks.find((t) => t.id === taskId);

  // --- Local State ---
  // We use a local state to drive the UI immediately (Optimistic UI)
  const [localTask, setLocalTask] = useState<Partial<Task>>({});
  const [newTag, setNewTag] = useState("");
  const [docSearch, setDocSearch] = useState("");

  useEffect(() => {
    if (task) {
      setLocalTask({
        title: task.title,
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        assigneeId: task.assigneeId || "unassigned",
        dueDate: task.dueDate,
        tags: normalizeTagIds(task.tags),
      });
      setNewTag("");
      setDocSearch("");
    }
  }, [task]);

  const selectedTagIds = useMemo(
    () => normalizeTagIds(localTask.tags),
    [localTask.tags],
  );

  const filteredTagOptions = useMemo(() => {
    const keyword = newTag.trim().toLowerCase();
    return tagOptions.filter((tag) => {
      if (selectedTagIds.includes(tag.id)) return false;
      if (!keyword) return true;
      return tag.name.toLowerCase().includes(keyword);
    });
  }, [newTag, selectedTagIds, tagOptions]);

  const availableDocs = useMemo(() => {
    const linkedDocIds = new Set(linkedDocs.map((relation) => relation.doc.id));
    const keyword = docSearch.trim().toLowerCase();

    return docs.filter((doc) => {
      if (doc.kind === "folder" || doc.is_archived) return false;
      if (linkedDocIds.has(doc.id)) return false;
      if (!keyword) return true;
      return doc.title.toLowerCase().includes(keyword);
    });
  }, [docSearch, docs, linkedDocs]);

  // --- Handlers ---

  const handleUpdate = async (updates: Partial<Task>) => {
    if (!task || !projectId || !boardEndpoint) return;

    // 1. Optimistic Update Local State
    setLocalTask((prev) => ({ ...prev, ...updates }));

    // 2. Optimistic Update SWR Cache
    await mutate(
      boardEndpoint,
      (current: BoardData | undefined) => {
        if (!current) return current;
        const newTasks = current.tasks.map((t: Task) =>
          t.id === task.id ? { ...t, ...updates } : t,
        );
        return { ...current, tasks: newTasks };
      },
      false,
    );

    // 3. API Call
    try {
      const res = await fetch(
        `/api/workspaces/${projectId}/board/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );

      if (!res.ok) throw new Error("Failed to update");

      // Success: Revalidate to ensure consistency
      mutate(boardEndpoint);
    } catch (error) {
      console.error(error);
      toast.error("변경 사항 저장에 실패했습니다.");
      mutate(boardEndpoint); // Revert on error by re-fetching
    }
  };

  const handleStatusChange = (newStatus: string) => {
    // Helper to find column ID from status string
    const col = columns.find(
      (c) =>
        c.statusId === newStatus ||
        c.id === newStatus ||
        c.title.toLowerCase() === newStatus,
    );
    if (col) {
      handleUpdate({ status: newStatus, columnId: col.id });
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 태스크를 삭제할까요?")) return;
    try {
      await fetch(`/api/workspaces/${projectId}/board/tasks/${taskId}`, {
        method: "DELETE",
      });
      toast.success("태스크를 삭제했습니다.");
      onOpenChange(false);
      if (boardEndpoint) mutate(boardEndpoint);
    } catch {
      toast.error("태스크 삭제에 실패했습니다.");
    }
  };

  const handleAddTag = async (tagId: string) => {
    if (selectedTagIds.includes(tagId)) return;
    await handleUpdate({ tags: [...selectedTagIds, tagId] });
  };

  const handleRemoveTag = async (tagId: string) => {
    await handleUpdate({
      tags: selectedTagIds.filter((selectedId) => selectedId !== tagId),
    });
  };

  const handleCreateTag = async () => {
    if (!projectId) return;
    const tagName = newTag.trim();
    if (!tagName) return;

    const existingTag = tagOptions.find(
      (tag) => tag.name.toLowerCase() === tagName.toLowerCase(),
    );
    if (existingTag) {
      await handleAddTag(existingTag.id);
      setNewTag("");
      return;
    }

    try {
      const res = await fetch(`/api/workspaces/${projectId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagName, color: "gray" }),
      });

      if (res.status === 409) {
        toast.error("이미 존재하는 태그입니다. 목록에서 선택해주세요.");
        if (boardEndpoint) mutate(boardEndpoint);
        return;
      }
      if (!res.ok) throw new Error("Failed to create tag");

      const createdTag: TagOption = await res.json();
      await handleUpdate({ tags: [...selectedTagIds, createdTag.id] });
      setNewTag("");
      if (boardEndpoint) mutate(boardEndpoint);
    } catch (error) {
      console.error(error);
      toast.error("태그 생성에 실패했습니다.");
    }
  };

  const refreshLinkedDocs = async () => {
    if (!relationEndpoint || !boardEndpoint) return;
    await Promise.all([mutate(relationEndpoint), mutate(boardEndpoint)]);
  };

  const handleLinkDoc = async (
    docId: string,
    relationType = "reference",
    isPrimary = linkedDocs.length === 0,
  ) => {
    if (!relationEndpoint) return;

    try {
      const res = await fetch(relationEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId,
          relationType,
          isPrimary,
        }),
      });

      if (!res.ok) throw new Error("Failed to link document");
      setDocSearch("");
      await refreshLinkedDocs();
      toast.success("문서를 연결했습니다.");
    } catch (error) {
      console.error(error);
      toast.error("문서 연결에 실패했습니다.");
    }
  };

  const handleUpdateRelation = async (
    relationId: string,
    updates: { relationType?: string; isPrimary?: boolean },
  ) => {
    if (!relationEndpoint) return;

    try {
      const res = await fetch(`${relationEndpoint}/${relationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update document relation");
      await refreshLinkedDocs();
    } catch (error) {
      console.error(error);
      toast.error("연결 문서 업데이트에 실패했습니다.");
    }
  };

  const handleUnlinkDoc = async (relationId: string) => {
    if (!relationEndpoint) return;

    try {
      const res = await fetch(`${relationEndpoint}/${relationId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to unlink document");
      await refreshLinkedDocs();
      toast.success("문서 연결을 해제했습니다.");
    } catch (error) {
      console.error(error);
      toast.error("문서 연결 해제에 실패했습니다.");
    }
  };

  // --- Helpers ---
  const currentMember = members.find((m) => m.id === localTask.assigneeId);
  const selectedDate = localTask.dueDate
    ? new Date(localTask.dueDate)
    : undefined;

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col gap-0 bg-background overflow-hidden outline-none sm:rounded-lg">
        <DialogTitle className="sr-only">태스크 상세</DialogTitle>

        {/* Header Section */}
        <div className="flex-shrink-0 border-b p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs font-mono uppercase text-muted-foreground"
              >
                {task.id.slice(-6)}
              </Badge>
              {/* Status Select */}
              <Select
                value={localTask.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="h-7 w-[130px] text-xs border-dashed">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        localTask.status === "done"
                          ? "bg-green-500"
                          : localTask.status === "in-progress"
                            ? "bg-blue-500"
                            : "bg-gray-400",
                      )}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.statusId || col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 
              Removed manual Close button as DialogContent provides one automatically.
              If you want spacing, we can keep an empty div or nothing.
              Justify-between will push the left content to the left.
            */}
          </div>

          <Input
            value={localTask.title || ""}
            onChange={(e) =>
              setLocalTask((prev) => ({ ...prev, title: e.target.value }))
            }
            onBlur={(e) => {
              if (e.target.value !== task.title)
                handleUpdate({ title: e.target.value });
            }}
            className="text-2xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
            placeholder="태스크 제목"
          />
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col md:flex-row h-full">
            {/* Main Content (Left) */}
            <div className="flex-1 p-6 space-y-8 border-r">
              {/* Description */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  설명
                </div>
                <Textarea
                  value={localTask.description || ""}
                  onChange={(e) =>
                    setLocalTask((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  onBlur={(e) => {
                    if (e.target.value !== task.description)
                      handleUpdate({ description: e.target.value });
                  }}
                  placeholder="작업 설명을 더 자세히 적어보세요."
                  className="min-h-[200px] resize-none border-none bg-muted/30 focus-visible:ring-0 p-4"
                />
              </div>
            </div>

            {/* Sidebar (Right) */}
            <div className="w-full md:w-[300px] bg-muted/10 p-6 space-y-6">
              {/* Assignee */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  담당자
                </span>
                <Select
                  value={localTask.assigneeId || "unassigned"}
                  onValueChange={(val) =>
                    handleUpdate({
                      assigneeId: val === "unassigned" ? null : val,
                    })
                  }
                >
                  <SelectTrigger className="w-full justify-start bg-transparent border-muted-foreground/20 hover:bg-muted/50">
                    <div className="flex items-center gap-2 text-sm">
                      {localTask.assigneeId &&
                      localTask.assigneeId !== "unassigned" ? (
                        <>
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={currentMember?.avatar ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                              {currentMember?.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{currentMember?.name}</span>
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            담당자 없음
                          </span>
                        </>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="unassigned">담당자 없음</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={m.avatar ?? undefined} />
                            <AvatarFallback>{m.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span>{m.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  우선순위
                </span>
                <Select
                  value={localTask.priority || "medium"}
                  onValueChange={(val) => handleUpdate({ priority: val })}
                >
                  <SelectTrigger className="w-full justify-start bg-transparent border-muted-foreground/20 hover:bg-muted/50">
                    <div className="flex items-center gap-2 text-sm capitalize">
                      <Flag
                        className={cn(
                          "h-4 w-4",
                          localTask.priority === "urgent"
                            ? "text-red-500 fill-red-500"
                            : localTask.priority === "high"
                              ? "text-orange-500"
                              : localTask.priority === "low"
                                ? "text-gray-400"
                                : "text-blue-500",
                        )}
                      />
                      {PRIORITY_LABEL[localTask.priority || "medium"] || "보통"}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="low">낮음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="urgent">긴급</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  태그
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedTagIds.map((tagId) => {
                    const tagInfo = tagOptions.find((tag) => tag.id === tagId);
                    return (
                      <Badge
                        key={tagId}
                        variant="secondary"
                        className={cn(
                          "px-2 py-0.5 text-xs font-normal",
                          getTagColorClass(tagInfo?.color),
                        )}
                      >
                        {tagInfo?.name || tagId}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tagId)}
                          className="ml-1 inline-flex items-center rounded-sm opacity-60 hover:opacity-100"
                          aria-label="태그 제거"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 border-dashed text-xs"
                      >
                        <Tag className="h-3 w-3 mr-1" />+ 추가
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCreateTag();
                        }}
                      >
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="태그 검색 또는 새 태그 만들기"
                          className="h-8 text-xs"
                        />
                        <Button type="submit" size="icon" className="h-8 w-8">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </form>

                      <div className="mt-2 max-h-44 overflow-y-auto space-y-1">
                        {filteredTagOptions.length > 0 ? (
                          filteredTagOptions.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted flex items-center justify-between"
                              onClick={() => handleAddTag(tag.id)}
                            >
                              <span>{tag.name}</span>
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  getTagDotClass(tag.color),
                                )}
                              />
                            </button>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            선택 가능한 태그가 없습니다.
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  연결 문서
                </span>

                {linkedDocs.length > 0 ? (
                  <div className="space-y-2">
                    {linkedDocs.map((relation) => (
                      <div
                        key={relation.id}
                        className="rounded-lg border bg-background/80 p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            className="min-w-0 text-left"
                            onClick={() =>
                              onNavigateToDoc?.(relation.doc.id)
                            }
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate text-sm font-medium">
                                {relation.doc.emoji ? `${relation.doc.emoji} ` : ""}
                                {relation.doc.title}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                {RELATION_TYPE_LABEL[relation.relationType] ||
                                  relation.relationType}
                              </Badge>
                              {relation.isPrimary && (
                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                                  대표 문서
                                </span>
                              )}
                            </div>
                          </button>

                          <div className="flex items-center gap-1">
                            {!relation.isPrimary && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleUpdateRelation(relation.id, {
                                    isPrimary: true,
                                  })
                                }
                              >
                                <Star className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleUnlinkDoc(relation.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3">
                          <Select
                            value={relation.relationType}
                            onValueChange={(value) =>
                              handleUpdateRelation(relation.id, {
                                relationType: value,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(RELATION_TYPE_LABEL).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-background/60 px-3 py-3 text-xs text-muted-foreground">
                    아직 연결된 문서가 없습니다.
                  </div>
                )}

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-dashed text-xs"
                    >
                      <Link2 className="mr-2 h-3.5 w-3.5" />
                      문서 연결하기
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-2">
                    <Input
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      placeholder="문서 검색"
                      className="h-8 text-xs"
                    />
                    <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                      {availableDocs.length > 0 ? (
                        availableDocs.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs hover:bg-muted"
                            onClick={() => handleLinkDoc(doc.id)}
                          >
                            <span className="truncate">
                              {doc.emoji ? `${doc.emoji} ` : ""}
                              {doc.title}
                            </span>
                            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        ))
                      ) : (
                        <div className="px-2 py-2 text-xs text-muted-foreground">
                          연결 가능한 문서가 없습니다.
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  마감일
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-transparent border-muted-foreground/20 hover:bg-muted/50",
                        !selectedDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "PPP")
                        : "날짜 선택"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) =>
                        handleUpdate({ dueDate: date?.toISOString() })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Delete */}
              <div className="pt-6 border-t mt-4">
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  태스크 삭제
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
