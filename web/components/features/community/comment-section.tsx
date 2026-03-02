"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, CornerDownRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type Comment = Omit<
  Database["public"]["Tables"]["comments"]["Row"],
  "post_id" | "author" | "is_accepted" | "created_at" | "updated_at"
> & {
  author: {
    nickname: string | null;
    avatar_url: string | null;
    handle?: string | null;
    tier?: string | null;
  } | null;
  post_id: string | null;
  is_accepted: boolean | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  postCategory: string | null | undefined;
  hasAcceptedAnswer: boolean;
  isPostAuthor: boolean;
}

const isQnaCategory = (category: string | null | undefined) => {
  if (!category) return false;
  const normalized = category.toLowerCase();
  return (
    normalized === "qna" ||
    normalized === "질문게시판" ||
    normalized === "질문/답변"
  );
};

const sortComments = (items: Comment[]) => {
  return [...items].sort((a, b) => {
    const aAccepted = Boolean(a.is_accepted);
    const bAccepted = Boolean(b.is_accepted);
    if (aAccepted !== bAccepted) {
      return aAccepted ? -1 : 1;
    }

    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return aTime - bTime;
  });
};

const AUTHOR_TIER_STYLE: Record<string, string> = {
  Bronze: "border-amber-400/70 text-amber-700 bg-amber-50",
  Silver: "border-slate-400/70 text-slate-700 bg-slate-50",
  Gold: "border-yellow-400/70 text-yellow-700 bg-yellow-50",
  Platinum: "border-cyan-400/70 text-cyan-700 bg-cyan-50",
  Diamond: "border-violet-400/70 text-violet-700 bg-violet-50",
};

export function CommentSection({
  postId,
  comments,
  postCategory,
  hasAcceptedAnswer,
  isPostAuthor,
}: CommentSectionProps) {
  const [content, setContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptingCommentId, setAcceptingCommentId] = useState<string | null>(
    null,
  );
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [pendingAcceptCommentId, setPendingAcceptCommentId] = useState<
    string | null
  >(null);

  const { user } = useAuth({ loadProfile: false });
  const currentUserId = user?.id;
  const acceptedExists =
    hasAcceptedAnswer ||
    comments.some((comment) => Boolean(comment.is_accepted));
  const canAcceptAnswer =
    isPostAuthor && isQnaCategory(postCategory) && !acceptedExists;

  const rootComments = useMemo(
    () => sortComments(comments.filter((c) => !c.parent_id)),
    [comments],
  );
  const getReplies = (parentId: string) =>
    sortComments(comments.filter((c) => c.parent_id === parentId));

  const handleSubmit = async (parentId: string | null = null, text: string) => {
    if (!text.trim()) return;

    if (!user?.id) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          content: text,
          user_id: user.id,
          parent_id: parentId,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error || "댓글 작성 중 오류가 발생했습니다.");
      } else {
        setContent("");
        setReplyContent("");
        setReplyingTo(null);
        toast.success("댓글이 등록되었습니다.");
        window.location.reload();
      }
    } catch {
      toast.error("전송 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "삭제 실패");
      }

      toast.success("댓글이 삭제되었습니다.");
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.",
      );
    }
  };

  const openAcceptDialog = (commentId: string) => {
    setPendingAcceptCommentId(commentId);
    setAcceptDialogOpen(true);
  };

  const handleAccept = async () => {
    if (!pendingAcceptCommentId) return;
    const commentId = pendingAcceptCommentId;

    setAcceptDialogOpen(false);
    setAcceptingCommentId(commentId);
    try {
      const response = await fetch(`/api/comments/${commentId}/accept`, {
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "채택 처리에 실패했습니다.");
      }

      toast.success("댓글이 채택되었습니다.");
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "채택 처리 중 오류가 발생했습니다.",
      );
    } finally {
      setAcceptingCommentId(null);
      setPendingAcceptCommentId(null);
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
            placeholder="댓글을 남겨보세요..."
            className="resize-none min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => handleSubmit(null, content)}
              disabled={loading || !content.trim()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              댓글 등록
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {rootComments.map((comment) => (
          <div
            key={comment.id}
            className={cn(
              "group",
              comment.is_accepted &&
                "rounded-lg border border-emerald-300/60 bg-emerald-50/40 p-4",
            )}
          >
            <div className="flex gap-4">
              {comment.author?.handle ? (
                <Link href={`/my/${encodeURIComponent(comment.author.handle)}`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={comment.author?.avatar_url || ""} />
                    <AvatarFallback>
                      {comment.author?.nickname?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.author?.avatar_url || ""} />
                  <AvatarFallback>
                    {comment.author?.nickname?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {comment.author?.handle ? (
                      <Link
                        href={`/my/${encodeURIComponent(comment.author.handle)}`}
                        className="font-semibold text-sm hover:underline"
                      >
                        {comment.author?.nickname || "익명"}
                      </Link>
                    ) : (
                      <span className="font-semibold text-sm">
                        {comment.author?.nickname || "익명"}
                      </span>
                    )}
                    {comment.author?.tier ? (
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0 text-[10px] font-medium",
                          AUTHOR_TIER_STYLE[comment.author.tier] ??
                            "border-muted text-muted-foreground",
                        )}
                      >
                        {comment.author.tier}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(
                        new Date(comment.created_at || new Date()),
                        {
                          addSuffix: true,
                          locale: ko,
                        },
                      )}
                    </span>
                    {comment.is_accepted && (
                      <Badge className="h-5 gap-1 bg-emerald-600/90 hover:bg-emerald-600 text-white">
                        <CheckCircle2 className="h-3 w-3" />
                        채택됨
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canAcceptAnswer && !comment.is_accepted && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => openAcceptDialog(comment.id)}
                        disabled={acceptingCommentId !== null}
                      >
                        {acceptingCommentId === comment.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        답변 채택
                      </Button>
                    )}
                    {currentUserId === comment.author_id && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        삭제
                      </button>
                    )}
                  </div>
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
                    <CornerDownRight className="w-3 h-3" /> 답글달기
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
                          onClick={() => handleSubmit(comment.id, replyContent)}
                        >
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
                  <div
                    key={reply.id}
                    className={cn(
                      "flex gap-3 group/reply rounded-md",
                      reply.is_accepted &&
                        "border border-emerald-300/60 bg-emerald-50/40 p-3",
                    )}
                  >
                    {reply.author?.handle ? (
                      <Link
                        href={`/my/${encodeURIComponent(reply.author.handle)}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={reply.author?.avatar_url || ""} />
                          <AvatarFallback>
                            {reply.author?.nickname?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    ) : (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={reply.author?.avatar_url || ""} />
                        <AvatarFallback>
                          {reply.author?.nickname?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {reply.author?.handle ? (
                            <Link
                              href={`/my/${encodeURIComponent(reply.author.handle)}`}
                              className="font-semibold text-sm hover:underline"
                            >
                              {reply.author?.nickname || "익명"}
                            </Link>
                          ) : (
                            <span className="font-semibold text-sm">
                              {reply.author?.nickname || "익명"}
                            </span>
                          )}
                          {reply.author?.tier ? (
                            <span
                              className={cn(
                                "rounded border px-1.5 py-0 text-[10px] font-medium",
                                AUTHOR_TIER_STYLE[reply.author.tier] ??
                                  "border-muted text-muted-foreground",
                              )}
                            >
                              {reply.author.tier}
                            </span>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(reply.created_at || new Date()),
                              { addSuffix: true, locale: ko },
                            )}
                          </span>
                          {reply.is_accepted && (
                            <Badge className="h-5 gap-1 bg-emerald-600/90 hover:bg-emerald-600 text-white">
                              <CheckCircle2 className="h-3 w-3" />
                              채택됨
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {canAcceptAnswer && !reply.is_accepted && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => openAcceptDialog(reply.id)}
                              disabled={acceptingCommentId !== null}
                            >
                              {acceptingCommentId === reply.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              답변 채택
                            </Button>
                          )}
                          {currentUserId === reply.author_id && (
                            <button
                              onClick={() => handleDelete(reply.id)}
                              className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm dark:text-gray-300">
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

      <AlertDialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>답변을 채택할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              한 번 채택하면 변경하거나 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept}>채택</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
