import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { getPosts } from "@/lib/server/community";
import { PostListItem } from "@/components/features/community/post-list-item";
import { PenSquare } from "lucide-react";
import { PaginationControl } from "@/components/ui/pagination-control";

interface BoardPageProps {
  searchParams: Promise<{ category?: string; page?: string }>;
}

export default async function BoardPage({ searchParams }: BoardPageProps) {
  const resolvedSearchParams = await searchParams;
  const category = resolvedSearchParams.category || "all";
  const page =
    typeof resolvedSearchParams.page === "string"
      ? parseInt(resolvedSearchParams.page)
      : 1;

  const { posts, totalPages } = await getPosts(category, page, 10);

  const categories = [
    { id: "all", label: "전체" },
    { id: "qna", label: "Q&A" },
    { id: "tech", label: "Tech 토론" },
    { id: "codereview", label: "코드 리뷰" },
    { id: "showcase", label: "프로젝트 자랑" },
    { id: "daily", label: "잡담" },
  ];

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/community/board?category=${cat.id}`}
              scroll={false}
            >
              <Button
                variant={category === cat.id ? "default" : "outline"}
                size="sm"
                className="rounded-full"
              >
                {cat.label}
              </Button>
            </Link>
          ))}
        </div>

        <Link href="/community/board/write">
          <Button className="gap-2">
            <PenSquare className="w-4 h-4" />
            글쓰기
          </Button>
        </Link>
      </div>

      {/* Post List */}
      <div className="flex flex-col divide-y border-t border-b">
        {posts.length > 0 ? (
          <>
            {posts.map((post) => (
              <PostListItem
                key={post.id}
                post={post as ComponentProps<typeof PostListItem>["post"]}
                href={`/community/board/${post.id}`}
              />
            ))}
            {totalPages > 1 && (
              <div className="py-8">
                <PaginationControl
                  currentPage={page}
                  totalPages={totalPages || 0}
                />
              </div>
            )}
          </>
        ) : (
          <div className="py-20 text-center text-muted-foreground bg-muted/30">
            <div className="flex flex-col items-center gap-2">
              <p className="font-medium">등록된 게시글이 없습니다.</p>
              <p className="text-sm">첫 번째 게시글의 주인공이 되어보세요!</p>
              <Link href="/community/board/write" className="mt-4">
                <Button variant="outline">글 작성하기</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
