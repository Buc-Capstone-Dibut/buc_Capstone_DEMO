"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CheckCheck,
  CornerDownRight,
  Loader2,
  MessageSquare,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  buildWorkspaceDocCommentTree,
  type WorkspaceDocComment,
  type WorkspaceDocCommentNode,
} from "@/lib/workspace-doc-comments";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CommentFilter = "open" | "all" | "resolved";

interface DocCommentsPanelProps {
  workspaceId: string;
  docId: string;
  readOnly?: boolean;
  currentUserId?: string | null;
  className?: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch comments");
  }
  return response.json();
};

function formatCommentDate(value: string) {
  try {
    return format(new Date(value), "M월 d일 HH:mm", { locale: ko });
  } catch {
    return "";
  }
}

function filterCommentTree(
  items: WorkspaceDocCommentNode[],
  filter: CommentFilter,
): WorkspaceDocCommentNode[] {
  if (filter === "all") return items;

  return items.filter((item) =>
    filter === "resolved" ? Boolean(item.resolved_at) : !item.resolved_at,
  );
}

function countComments(items: WorkspaceDocCommentNode[]): number {
  return items.reduce((total, item) => total + 1 + countComments(item.replies), 0);
}

export function DocCommentsPanel({
  workspaceId,
  docId,
  readOnly = false,
  currentUserId,
  className,
}: DocCommentsPanelProps) {
  const commentsKey = `/api/workspaces/${workspaceId}/docs/${docId}/comments`;
  const [filter, setFilter] = useState<CommentFilter>("open");
  const [newComment, setNewComment] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const {
    data: comments,
    mutate,
    isLoading,
  } = useSWR<WorkspaceDocComment[]>(commentsKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });

  const commentTree = useMemo(
    () => buildWorkspaceDocCommentTree(comments ?? []),
    [comments],
  );
  const visibleTree = useMemo(
    () => filterCommentTree(commentTree, filter),
    [commentTree, filter],
  );
  const openCount = useMemo(
    () => countComments(filterCommentTree(commentTree, "open")),
    [commentTree],
  );
  const resolvedCount = useMemo(
    () => countComments(filterCommentTree(commentTree, "resolved")),
    [commentTree],
  );

  const resetComposerState = () => {
    setReplyToId(null);
    setReplyContent("");
    setEditingId(null);
    setEditingContent("");
  };

  const handleCreateComment = async (parentId?: string) => {
    const content = (parentId ? replyContent : newComment).trim();
    if (!content) return;

    try {
      setPendingActionId(parentId ?? "new");
      const response = await fetch(commentsKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          ...(parentId ? { parentId } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create comment");
      }

      if (parentId) {
        setReplyToId(null);
        setReplyContent("");
      } else {
        setNewComment("");
      }

      await mutate();
    } catch (error) {
      console.error(error);
      toast.error("댓글 작성에 실패했습니다.");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleUpdateComment = async (
    commentId: string,
    payload: { content?: string; resolved?: boolean },
  ) => {
    try {
      setPendingActionId(commentId);
      const response = await fetch(`${commentsKey}/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update comment");
      }

      setEditingId(null);
      setEditingContent("");
      await mutate();
    } catch (error) {
      console.error(error);
      toast.error("댓글 수정에 실패했습니다.");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      setPendingActionId(commentId);
      const response = await fetch(`${commentsKey}/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      await mutate();
    } catch (error) {
      console.error(error);
      toast.error("댓글 삭제에 실패했습니다.");
    } finally {
      setPendingActionId(null);
    }
  };

  const renderComment = (comment: WorkspaceDocCommentNode, depth = 0) => {
    const isAuthor = currentUserId === comment.author_id;
    const isEditing = editingId === comment.id;
    const isReplying = replyToId === comment.id;
    const isPending = pendingActionId === comment.id;

    return (
      <div
        key={comment.id}
        className={cn(
          "space-y-3 rounded-xl border bg-background p-3",
          depth > 0 && "bg-muted/20",
        )}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author.avatar_url || ""} />
            <AvatarFallback>
              {comment.author.nickname?.[0] || comment.author.handle?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {comment.author.nickname || comment.author.handle || "익명"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatCommentDate(comment.created_at)}
              </span>
              {comment.resolved_at ? (
                <Badge variant="secondary" className="text-[10px]">
                  해결됨
                </Badge>
              ) : null}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editingContent}
                  onChange={(event) => setEditingContent(event.target.value)}
                  className="min-h-[84px] bg-background"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setEditingContent("");
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      handleUpdateComment(comment.id, {
                        content: editingContent.trim(),
                      })
                    }
                    disabled={!editingContent.trim() || isPending}
                  >
                    {isPending ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {comment.content}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {!readOnly ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      setReplyToId((prev) => (prev === comment.id ? null : comment.id))
                    }
                  >
                    <CornerDownRight className="mr-1 h-3.5 w-3.5" />
                    답글
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      handleUpdateComment(comment.id, {
                        resolved: !comment.resolved_at,
                      })
                    }
                    disabled={isPending}
                  >
                    {comment.resolved_at ? (
                      <>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        다시 열기
                      </>
                    ) : (
                      <>
                        <CheckCheck className="mr-1 h-3.5 w-3.5" />
                        해결 처리
                      </>
                    )}
                  </Button>
                </>
              ) : null}

              {isAuthor && !readOnly ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditingContent(comment.content);
                      setReplyToId(null);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    수정
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive"
                    onClick={() => handleDeleteComment(comment.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    삭제
                  </Button>
                </>
              ) : null}
            </div>

            {isReplying && !readOnly ? (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-2">
                <Textarea
                  value={replyContent}
                  onChange={(event) => setReplyContent(event.target.value)}
                  placeholder="답글을 입력하세요."
                  className="min-h-[84px] bg-background"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyToId(null);
                      setReplyContent("");
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCreateComment(comment.id)}
                    disabled={!replyContent.trim() || isPending}
                  >
                    {isPending ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    답글 등록
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {comment.replies.length > 0 ? (
          <div className="space-y-2 pl-11">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between border-b bg-muted/10 px-4 py-2">
        <div className="flex items-center gap-1.5 opacity-70">
          <MessageSquare className="h-3.5 w-3.5" />
          <h3 className="text-xs font-medium">댓글</h3>
          <span className="text-[10px] text-muted-foreground ml-1">
            {openCount} {resolvedCount > 0 && `/ ${comments?.length}`}
          </span>
        </div>

        <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5">
          {([
            ["open", "활성"],
            ["resolved", "해결"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={cn(
                "rounded-sm px-2 py-0.5 text-[10px] font-medium transition-all",
                filter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        {isLoading ? (
          <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            댓글을 불러오는 중입니다.
          </div>
        ) : visibleTree.length > 0 ? (
          <div className="space-y-4">{visibleTree.map((comment) => renderComment(comment))}</div>
        ) : (
          <div className="rounded-xl border border-dashed bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
            {filter === "resolved"
              ? "해결된 댓글이 없습니다."
              : "아직 댓글이 없습니다."}
          </div>
        )}
      </ScrollArea>

      <div className="border-t bg-muted/10 p-3">
        <Textarea
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          placeholder={
            readOnly ? "읽기 전용 문서입니다." : "댓글 남기기..."
          }
          disabled={readOnly}
          className={cn("min-h-[64px] resize-none text-xs bg-background focus-visible:ring-1", readOnly && "opacity-70")}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground">
            {!readOnly && (replyToId || editingId) && (
              <button type="button" className="hover:underline" onClick={resetComposerState}>
                취소
              </button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => handleCreateComment()}
            disabled={readOnly || !newComment.trim() || pendingActionId === "new"}
          >
            {pendingActionId === "new" ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : null}
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}
