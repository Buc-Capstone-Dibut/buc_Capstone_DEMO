"use client";

import { useState } from "react";
import { createComment } from "@/lib/actions/community"; // I will add this function next
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Loader2, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/lib/database.types";

type Comment = Omit<
  Database["public"]["Tables"]["comments"]["Row"],
  "post_id" | "author" | "is_accepted" | "created_at" | "updated_at"
> & {
  author: {
    nickname: string | null;
    avatar_url: string | null;
  } | null;
  post_id: string | null;
  is_accepted: boolean | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  currentUser?: any; // For checking ownership if needed
}

import { useAuth } from "@/hooks/use-auth";

// ... existing imports

export function CommentSection({
  postId,
  comments,
  currentUser,
}: CommentSectionProps) {
  const [content, setContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth({ loadProfile: false });
  const currentUserId = user?.id; // Use authenticated user ID

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
          parent_id: parentId, // Send parentId if replying
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
    } catch (e) {
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

      if (!response.ok) {
        throw new Error("삭제 실패");
      }
      toast.success("댓글이 삭제되었습니다.");
      window.location.reload();
    } catch (e) {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  // Organize comments into hierarchy (simple 1-level for now or full tree)
  // For simplicity given the flat structure, we filter root vs children
  const rootComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="mt-10 pt-10 border-t">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        댓글 <span className="text-primary">{comments.length}</span>
      </h3>

      {/* Main Input */}
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

      {/* List */}
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
                        {
                          addSuffix: true,
                          locale: ko,
                        },
                      )}
                    </span>
                  </div>
                  {currentUserId === comment.author_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      삭제
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
                    <CornerDownRight className="w-3 h-3" /> 답글달기
                  </button>
                </div>

                {/* Reply Input */}
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

            {/* Nested Replies */}
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
                          <span className="font-semibold text-sm">
                            {reply.author?.nickname || "익명"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(reply.created_at || new Date()),
                              { addSuffix: true, locale: ko },
                            )}
                          </span>
                        </div>
                        {currentUserId === reply.author_id && (
                          <button
                            onClick={() => handleDelete(reply.id)}
                            className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                          >
                            삭제
                          </button>
                        )}
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
    </div>
  );
}
