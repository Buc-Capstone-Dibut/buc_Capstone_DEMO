"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { Badge } from "@/components/ui/badge";
import { BlogCover } from "@/components/features/tech-blog/blog-cover";

import { Building2, Calendar, Eye, Plus, Check } from "lucide-react";
import Image from "next/image";
import { incrementViews, type Blog } from "@/lib/supabase";
import { getLogoUrl } from "@/lib/logos";
import { useState } from "react";

interface BlogCardProps {
  blog: Blog;
  onLoginClick: () => void;
  onBookmarkRemoved?: () => void;
  selectedSubTags?: string[];
  onTagClick?: (tag: string) => void;
}

const SUMMARY_PREVIEW_STYLE = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

export function BlogCard({
  blog,
  onLoginClick,
  onBookmarkRemoved,
  selectedSubTags = [],
  onTagClick,
}: BlogCardProps) {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

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
    <div className="relative group h-full">
      <a
        href={blog.external_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleLinkClick}
        className="block h-full"
      >
        <Card className="h-full flex flex-col cursor-pointer card-hover border border-border/20 shadow-lg hover:shadow-xl bg-card dark:bg-card/80 backdrop-blur-sm dark:backdrop-blur-none rounded-xl overflow-hidden">
          <CardHeader className="p-0">
            <BlogCover
              title={blog.title}
              author={blog.author}
              category={blog.category}
              thumbnailUrl={blog.thumbnail_url}
              variant="card"
              className="aspect-video rounded-t-xl"
              imageClassName="group-hover:scale-105"
            />
          </CardHeader>

          <CardContent className="p-6 flex-1 flex flex-col">
            <h3 className="font-semibold text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-200">
              {blog.title}
            </h3>

            {/* 작성자 정보 */}
            {blog.author && (
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="logo"
                    width={20}
                    height={20}
                    className="rounded"
                  />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="truncate">{blog.author}</span>
              </div>
            )}

            <p
              className="mb-4 h-[4rem] text-sm leading-relaxed text-muted-foreground"
              style={SUMMARY_PREVIEW_STYLE}
            >
              {blog.summary || "요약이 없습니다."}
            </p>

            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {blog.tags.slice(0, 6).map((tag) => {
                  const isHighlighted =
                    selectedSubTags.length > 0 && selectedSubTags.includes(tag);
                  const isHovered = hoveredTag === tag;
                  return (
                    <Badge
                      key={tag}
                      variant={isHighlighted ? "default" : "outline"}
                      className={`rounded-full cursor-pointer transition-all duration-200 flex items-center gap-1 ${
                        isHighlighted
                          ? "hover:opacity-80"
                          : "border-slate-300 dark:border-white/25 text-foreground hover:border-primary hover:text-primary"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onTagClick) {
                          onTagClick(tag);
                        }
                      }}
                      onMouseEnter={() => setHoveredTag(tag)}
                      onMouseLeave={() => setHoveredTag(null)}
                    >
                      {tag}
                      {isHovered && !isHighlighted && (
                        <Plus className="h-3 w-3 ml-0.5" />
                      )}
                      {isHighlighted && isHovered && (
                        <Check className="h-3 w-3 ml-0.5" />
                      )}
                    </Badge>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30 dark:border-border/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(blog.published_at)}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatViews(blog.views)}
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
