"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, CornerDownRight } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface SquadComment {
  id: string;
  squad_id: string;
  author_id: string | null;
  content: string;
  parent_id: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
  author: {
    nickname: string | null;
    avatar_url: string | null;
  } | null;
}

interface SquadCommentSectionProps {
  squadId: string;
  initialComments: SquadComment[];
}

function removeCommentWithReplies(items: SquadComment[], rootId: string) {
  const deletedIds = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const item of items) {
      if (
        item.parent_id &&
        deletedIds.has(item.parent_id) &&
        !deletedIds.has(item.id)
      ) {
        deletedIds.add(item.id);
        changed = true;
      }
    }
  }

  return items.filter((item) => !deletedIds.has(item.id));
}

export function SquadCommentSection({
  squadId,
  initialComments,
}: SquadCommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<SquadComment[]>(initialComments);
  const [content, setContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rootComments = comments.filter((item) => !item.parent_id);
  const getReplies = (parentId: string) =>
    comments.filter((item) => item.parent_id === parentId);

  const handleSubmit = async (
    parentId: string | null = null,
    rawText: string,
  ) => {
    const text = rawText.trim();
    if (!text) return;

    if (!user?.id) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/squads/${squadId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          parent_id: parentId,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error || "댓글 작성 중 오류가 발생했습니다.");
        return;
      }

      if (result?.data) {
        setComments((prev) => [...prev, result.data as SquadComment]);
      }

      setContent("");
      setReplyContent("");
      setReplyingTo(null);
      toast.success("댓글이 등록되었습니다.");
    } catch (error) {
      toast.error("전송 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    setDeletingId(commentId);

    try {
      const response = await fetch(`/api/squads/comments/${commentId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error || "삭제 중 오류가 발생했습니다.");
        return;
      }

      setComments((prev) => removeCommentWithReplies(prev, commentId));
      toast.success("댓글이 삭제되었습니다.");
    } catch (error) {
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-10 pt-10 border-t">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        댓글 <span className="text-primary">{comments.length}</span>
      </h3>

      <div className="flex gap-4 mb-10">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
          <AvatarFallback>
            {user?.user_metadata?.full_name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              user?.id
                ? "모집글에 궁금한 점을 남겨보세요..."
                : "로그인 후 댓글을 작성할 수 있습니다."
            }
            className="resize-none min-h-[100px]"
            disabled={!user?.id}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => handleSubmit(null, content)}
              disabled={submitting || !content.trim() || !user?.id}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              댓글 등록
            </Button>
          </div>
        </div>
      </div>

      {rootComments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          아직 댓글이 없습니다. 첫 질문을 남겨보세요.
        </div>
      ) : (
        <div className="space-y-8">
          {rootComments.map((comment) => (
            <div key={comment.id} className="group">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.author?.avatar_url || ""} />
                  <AvatarFallback>
                    {comment.author?.nickname?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {comment.author?.nickname || "익명"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(comment.created_at || new Date()),
                          { addSuffix: true, locale: ko },
                        )}
                      </span>
                    </div>

                    {user?.id === comment.author_id && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        {deletingId === comment.id ? "삭제 중..." : "삭제"}
                      </button>
                    )}
                  </div>

                  <p className="text-sm whitespace-pre-wrap leading-relaxed dark:text-gray-300">
                    {comment.content}
                  </p>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() =>
                        setReplyingTo(
                          replyingTo === comment.id ? null : comment.id,
                        )
                      }
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <CornerDownRight className="w-3 h-3" />
                      답글달기
                    </button>
                  </div>

                  {replyingTo === comment.id && (
                    <div className="mt-4 flex gap-3 ml-4">
                      <CornerDownRight className="w-4 h-4 text-muted-foreground mt-2" />
                      <div className="flex-1 space-y-2">
                        <Textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="답글을 입력하세요..."
                          className="min-h-[80px]"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingTo(null)}
                          >
                            취소
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleSubmit(comment.id, replyContent)
                            }
                            disabled={submitting || !replyContent.trim()}
                          >
                            {submitting && (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            )}
                            등록
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {getReplies(comment.id).length > 0 && (
                <div className="ml-14 mt-4 space-y-4 border-l-2 pl-4">
                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} className="flex gap-3 group/reply">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={reply.author?.avatar_url || ""} />
                        <AvatarFallback>
                          {reply.author?.nickname?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs">
                              {reply.author?.nickname || "익명"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(reply.created_at || new Date()),
                                { addSuffix: true, locale: ko },
                              )}
                            </span>
                          </div>

                          {user?.id === reply.author_id && (
                            <button
                              onClick={() => handleDelete(reply.id)}
                              disabled={deletingId === reply.id}
                              className="text-[10px] text-red-500 hover:text-red-700 opacity-0 group-hover/reply:opacity-100 transition-opacity disabled:opacity-50"
                            >
                              {deletingId === reply.id ? "삭제 중..." : "삭제"}
                            </button>
                          )}
                        </div>

                        <p className="text-xs whitespace-pre-wrap leading-relaxed dark:text-gray-300">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
