"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Database } from "@/lib/database.types";
import { Eye, Heart, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Post = Omit<
  Database["public"]["Tables"]["posts"]["Row"],
  | "category"
  | "views"
  | "likes"
  | "has_accepted_answer"
  | "created_at"
  | "updated_at"
  | "author"
> & {
  author: {
    nickname: string | null;
    avatar_url: string | null;
    handle?: string | null;
  } | null;
  comments_count?: number;
  category: string;
  views: number | null;
  likes: number | null;
  has_accepted_answer: boolean | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

interface PostListItemProps {
  post: Post;
  href: string;
  className?: string;
}

export function PostListItem({ post, href, className }: PostListItemProps) {
  const router = useRouter();
  // Extract first image from markdown content
  // Matches ![alt](url) or HTML <img> but specifically markdown for now as per editor
  // Also Tiptap might save generic markdown.
  const imageMatch = post.content?.match(/!\[.*?\]\((.*?)\)/);
  const thumbnailUrl = imageMatch ? imageMatch[1] : null;
  const authorHref = post.author?.handle
    ? `/my/${encodeURIComponent(post.author.handle)}`
    : null;

  const handleNavigatePost = () => {
    router.push(href);
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleNavigatePost}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavigatePost();
        }
      }}
      className={cn(
        "group py-4 px-2 hover:bg-muted/30 transition-colors cursor-pointer",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-primary/80">
                {post.category === "qna"
                  ? "질문/답변"
                  : post.category === "tech"
                    ? "기술토론"
                    : post.category.toUpperCase()}
              </span>
              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
              {authorHref ? (
                <Link
                  href={authorHref}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.author?.nickname || "익명"}
                </Link>
              ) : (
                <span>{post.author?.nickname || "익명"}</span>
              )}
            <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
            <span>
              {formatDistanceToNow(new Date(post.created_at || new Date()), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <Link
              href={href}
              className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {post.title}
            </Link>
            {post.comments_count! > 0 && (
              <div className="flex items-center gap-0.5 text-xs text-primary font-medium bg-primary/5 px-1.5 py-0.5 rounded shrink-0">
                <MessageSquare className="w-3 h-3" />
                {post.comments_count}
              </div>
            )}
          </div>

          {/* Preview Text (Optional, 1 line) */}
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {post.content
              ?.replace(/!\[.*?\]\((.*?)\)/g, "")
              .replace(/[#*`]/g, "")}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-1">
                {post.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 ml-auto sm:ml-0">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{post.views}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                <span>{post.likes}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail on the Right */}
        {thumbnailUrl && (
          <div className="shrink-0 w-20 h-20 rounded-md overflow-hidden bg-muted border ml-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt="Thumbnail"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
      </div>
    </article>
  );
}
