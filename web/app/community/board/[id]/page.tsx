import { getPost } from "@/lib/server/community";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { notFound } from "next/navigation";
import PostViewer from "@/components/features/community/post-viewer";
import { CommentSection } from "@/components/features/community/comment-section";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart } from "lucide-react";

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { PostActions } from "@/components/features/community/post-actions";

const isQnaCategory = (category: string | null | undefined) => {
  if (!category) return false;
  const normalized = category.toLowerCase();
  return (
    normalized === "qna" ||
    normalized === "질문게시판" ||
    normalized === "질문/답변"
  );
};

const AUTHOR_TIER_STYLE: Record<string, string> = {
  씨앗: "border-zinc-300/70 text-zinc-700 bg-zinc-50",
  새싹: "border-lime-400/70 text-lime-700 bg-lime-50",
  묘목: "border-emerald-400/70 text-emerald-700 bg-emerald-50",
  나무: "border-green-500/70 text-green-700 bg-green-50",
  숲: "border-teal-500/70 text-teal-700 bg-teal-50",
  거목: "border-cyan-500/70 text-cyan-700 bg-cyan-50",

  // Backward compatibility for rows not migrated yet
  Bronze: "border-lime-400/70 text-lime-700 bg-lime-50",
  Silver: "border-emerald-400/70 text-emerald-700 bg-emerald-50",
  Gold: "border-green-500/70 text-green-700 bg-green-50",
  Platinum: "border-teal-500/70 text-teal-700 bg-teal-50",
  Diamond: "border-cyan-500/70 text-cyan-700 bg-cyan-50",
};

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;
  const post = await getPost(id);

  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const isAuthor = session?.user?.id === post?.author_id;

  if (!post) {
    notFound();
  }

  const authorHref = post.author?.handle
    ? `/my/${encodeURIComponent(post.author.handle)}`
    : null;
  const isQna = isQnaCategory(post.category);

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Meta */}
      <div className="mb-8 border-b pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-primary border-primary/20 bg-primary/5"
            >
              {post.category?.toUpperCase()}
            </Badge>
            {isQna && post.has_accepted_answer && (
              <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                채택 완료
              </Badge>
            )}
            {post.tags?.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-muted-foreground"
              >
                #{tag}
              </Badge>
            ))}
          </div>
          {/* Actions (Delete) */}
          <PostActions postId={post.id} isAuthor={isAuthor} />
        </div>

        <h1 className="text-3xl font-bold mb-6 leading-tight">{post.title}</h1>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {authorHref ? (
              <Link href={authorHref} className="flex items-center gap-3 group">
                <Avatar>
                  <AvatarImage src={post.author?.avatar_url || ""} />
                  <AvatarFallback>
                    {post.author?.nickname?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm group-hover:underline">
                      {post.author?.nickname || "익명"}
                    </div>
                    {post.author?.tier ? (
                      <span
                        className={`rounded border px-1.5 py-0 text-[10px] font-medium ${AUTHOR_TIER_STYLE[post.author.tier] ?? "border-muted text-muted-foreground"}`}
                      >
                        {post.author.tier}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(
                      new Date(post.created_at || new Date()),
                      {
                        addSuffix: true,
                        locale: ko,
                      },
                    )}
                  </div>
                </div>
              </Link>
            ) : (
              <>
                <Avatar>
                  <AvatarImage src={post.author?.avatar_url || ""} />
                  <AvatarFallback>
                    {post.author?.nickname?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">
                      {post.author?.nickname || "익명"}
                    </div>
                    {post.author?.tier ? (
                      <span
                        className={`rounded border px-1.5 py-0 text-[10px] font-medium ${AUTHOR_TIER_STYLE[post.author.tier] ?? "border-muted text-muted-foreground"}`}
                      >
                        {post.author.tier}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(
                      new Date(post.created_at || new Date()),
                      {
                        addSuffix: true,
                        locale: ko,
                      },
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" /> {post.views}
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" /> {post.likes}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[300px]">
        {/* Client Component handling SSR-safe rendering */}
        <PostViewer content={post.content} />
      </div>

      {/* Comments */}
      <CommentSection
        postId={post.id}
        comments={post.comments || []}
        postCategory={post.category}
        hasAcceptedAnswer={Boolean(post.has_accepted_answer)}
        isPostAuthor={isAuthor}
      />
    </div>
  );
}
