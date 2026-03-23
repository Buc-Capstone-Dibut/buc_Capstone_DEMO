"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { BlogCover } from "@/components/features/tech-blog/blog-cover";
import { Building2, Calendar, Eye } from "lucide-react";
import Image from "next/image";
import { incrementViews, type Blog } from "@/lib/supabase";
import { getLogoUrl } from "@/lib/logos";

interface BlogListItemProps {
  blog: Blog;
  onLoginClick: () => void;
  onBookmarkRemoved?: () => void;
}

const SUMMARY_PREVIEW_STYLE = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

export function BlogListItem({
  blog,
  onLoginClick,
  onBookmarkRemoved,
}: BlogListItemProps) {
  const handleLinkClick = async () => {
    // 조회수 증가 (백그라운드에서 실행)
    try {
      incrementViews(blog.id);
    } catch (error) {
      console.error("조회수 증가 실패:", error);
    }
    // 링크의 기본 동작을 허용 (새 탭에서 열기)
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  const logoUrl = getLogoUrl(blog.author);

  return (
    <div className="relative group">
      <a
        href={blog.external_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleLinkClick}
        className="block"
      >
        <Card className="cursor-pointer card-hover border border-border/20 shadow-sm hover:shadow-md bg-card dark:bg-card/80 backdrop-blur-sm dark:backdrop-blur-none rounded-lg overflow-hidden">
          <CardContent className="p-6">
            <div className="flex gap-6 overflow-hidden">
              {/* 썸네일 영역: 모바일에서는 숨김 */}
              <BlogCover
                title={blog.title}
                author={blog.author}
                category={blog.category}
                thumbnailUrl={blog.thumbnail_url}
                variant="list"
                className="hidden h-32 w-48 flex-shrink-0 rounded-lg sm:block"
                imageClassName="group-hover:scale-105"
              />

              {/* 콘텐츠 영역 */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-semibold text-xl mb-3 group-hover:text-primary transition-colors duration-200 line-clamp-2 break-all overflow-wrap-anywhere hyphens-auto">
                  {blog.title}
                </h3>

                <p
                  className="mb-4 h-[4.75rem] break-all text-base leading-relaxed text-muted-foreground overflow-wrap-anywhere hyphens-auto"
                  style={SUMMARY_PREVIEW_STYLE}
                >
                  {blog.summary || "요약이 없습니다."}
                </p>

                {/* 메타 정보 */}
                <div className="flex items-center justify-between overflow-hidden">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-wrap">
                    {/* 작성자 정보 */}
                    {blog.author && (
                      <div className="flex items-center gap-1 sm:gap-2 text-sm min-w-0 text-muted-foreground">
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt="logo"
                            width={16}
                            height={16}
                            className="rounded flex-shrink-0"
                          />
                        ) : (
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="truncate min-w-0 max-w-20 sm:max-w-none">
                          {blog.author}
                        </span>
                      </div>
                    )}

                    {/* 날짜 */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        {formatDate(blog.published_at)}
                      </span>
                    </div>

                    {/* 조회수 */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                      <Eye className="h-4 w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        {formatViews(blog.views)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </a>

      {/* 북마크 버튼 */}
      <div className="absolute top-3 right-3 z-10 rounded-full border border-border/50 bg-background/90 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <BookmarkButton
          blogId={blog.id}
          onLoginClick={onLoginClick}
          onBookmarkRemoved={onBookmarkRemoved}
        />
      </div>
    </div>
  );
}
