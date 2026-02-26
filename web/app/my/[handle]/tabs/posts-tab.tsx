"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Loader2, ThumbsUp, Trash2 } from "lucide-react";
import type { ProfilePostItem } from "../profile-types";
import { formatDate } from "../profile-utils";
import { ProfileEmptyState } from "./empty-state";

interface PostsTabProps {
  loading?: boolean;
  error?: string;
  posts: ProfilePostItem[];
  isOwner: boolean;
  onOpenPost: (postId: string) => void;
  onRemovePost: (postId: string) => void;
}

export function PostsTab({
  loading,
  error,
  posts,
  isOwner,
  onOpenPost,
  onRemovePost,
}: PostsTabProps) {
  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          글 목록을 불러오는 중...
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 py-10 text-center">{error}</p>
      ) : posts.length === 0 ? (
        <ProfileEmptyState icon={FileText} message="작성한 글이 없습니다." />
      ) : (
        posts.map((post) => (
          <div
            key={post.id}
            className="group flex items-start justify-between gap-3 rounded-xl border bg-card px-5 py-4 hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer"
            onClick={() => onOpenPost(post.id)}
          >
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="font-semibold text-sm leading-snug truncate group-hover:text-primary transition-colors">
                {post.title}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                {post.category && (
                  <span className="px-1.5 py-0.5 rounded bg-muted">{post.category}</span>
                )}
                <span className="flex items-center gap-0.5">
                  <ThumbsUp className="w-3 h-3" /> {post.likes ?? 0}
                </span>
                <span>조회 {post.views ?? 0}</span>
                {post.createdAt && <span>{formatDate(post.createdAt)}</span>}
                {(post.tags || []).slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded-full bg-primary/8 text-primary text-[10px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition" />
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemovePost(post.id);
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
