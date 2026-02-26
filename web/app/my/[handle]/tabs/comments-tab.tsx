"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, MessageSquare, Trash2 } from "lucide-react";
import type { ProfileCommentItem } from "../profile-types";
import { formatDate } from "../profile-utils";
import { ProfileEmptyState } from "./empty-state";

interface CommentsTabProps {
  loading?: boolean;
  error?: string;
  comments: ProfileCommentItem[];
  isOwner: boolean;
  onOpenCommentPost: (postId: string | null) => void;
  onRemoveComment: (commentId: string) => void;
}

export function CommentsTab({
  loading,
  error,
  comments,
  isOwner,
  onOpenCommentPost,
  onRemoveComment,
}: CommentsTabProps) {
  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          댓글 목록을 불러오는 중...
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 py-10 text-center">{error}</p>
      ) : comments.length === 0 ? (
        <ProfileEmptyState icon={MessageSquare} message="작성한 댓글이 없습니다." />
      ) : (
        comments.map((comment) => (
          <div
            key={comment.id}
            className="group flex items-start justify-between gap-3 rounded-xl border bg-card px-5 py-4 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer"
            onClick={() => onOpenCommentPost(comment.postId)}
          >
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-sm leading-relaxed line-clamp-2">{comment.content}</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <MessageSquare className="w-3 h-3 shrink-0" />
                <span className="truncate font-medium group-hover:text-primary transition-colors">
                  {comment.postTitle || "원문 없음"}
                </span>
                {comment.createdAt && (
                  <span className="shrink-0">{formatDate(comment.createdAt)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {comment.postId && (
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition" />
              )}
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveComment(comment.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
