import { BlogCard } from "@/components/features/tech-blog/blog-card";
import { BlogListItem } from "@/components/features/tech-blog/blog-list-item";

import { ViewToggle } from "@/components/features/tech-blog/view-toggle";
import { Button } from "@/components/ui/button";
import { TagFilterBar } from "@/components/features/tech-blog/tag-filter-bar";
import { TAG_FILTER_OPTIONS, type TagCategory } from "@/lib/tag-filters";
import type { Blog } from "@/lib/supabase";
import { ChevronLeft } from "lucide-react";

import { BlogPagination } from "@/components/features/tech-blog/blog-pagination";

interface TechBlogListLayoutProps {
  blogs: Blog[];
  loading: boolean;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  viewMode: "gallery" | "list";
  searchQuery: string;
  tagCategory: TagCategory;
  selectedSubTags: string[];
  isWeeklyExpanded: boolean;
  onPageChange: (page: number) => void;
  onViewModeChange: (mode: "gallery" | "list") => void;
  onSearchChange: (query: string) => void;
  onTagCategoryChange: (category: TagCategory) => void;
  onSubTagChange: (subTags: string[]) => void;
  onWeeklyToggle: () => void;
  onLoginClick: () => void;
}

export function TechBlogListLayout({
  blogs,
  loading,
  totalCount,
  totalPages,
  currentPage,
  viewMode,
  searchQuery,
  tagCategory,
  selectedSubTags,
  isWeeklyExpanded,
  onPageChange,
  onViewModeChange,
  onSearchChange,
  onTagCategoryChange,
  onSubTagChange,
  onWeeklyToggle,
  onLoginClick,
}: TechBlogListLayoutProps) {
  // 태그 클릭 시 필터에 추가
  const handleTagClick = (tag: string) => {
    // 클릭한 태그가 속한 카테고리 찾기
    const matchedCategory = TAG_FILTER_OPTIONS.find((option) =>
      option.tags.includes(tag)
    );

    // 이미 선택된 태그면 제거
    if (selectedSubTags.includes(tag)) {
      onSubTagChange(selectedSubTags.filter((t) => t !== tag));
    } else {
      // 태그 추가하고, 해당 카테고리로 전환
      if (matchedCategory && tagCategory !== matchedCategory.id) {
        onTagCategoryChange(matchedCategory.id as TagCategory);
      }
      onSubTagChange([...selectedSubTags, tag]);
    }

    // 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="flex-1 min-w-0">
      {/* 검색 결과 개수 표시 (검색 시에만) */}
      {!loading && searchQuery && blogs.length > 0 && (
        <div className="mb-6 text-sm text-muted-foreground animate-fade-in">
          &apos;<span className="font-bold text-foreground">{searchQuery}</span>&apos; 검색 결과{" "}
          <span className="font-bold text-primary">{totalCount}개</span>의 블로그를 찾았습니다.
        </div>
      )}

      {loading ? (
        <>
          {/* 로딩 스켈레톤 */}
          {viewMode === "gallery" ? (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isWeeklyExpanded ? "xl:grid-cols-3" : "xl:grid-cols-4"
                } gap-6`}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl h-80"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-lg h-32"></div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : blogs.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-8xl mb-6">🔍</div>
          <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">
            검색 결과가 없습니다
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            다른 키워드로 검색해보세요.
          </p>
        </div>
      ) : (
        <>
          {/* 검색 결과 개수 표시 */}
          {searchQuery && (
            <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              '
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {searchQuery}
              </span>
              ' 검색 결과{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {totalCount}개
              </span>
            </div>
          )}
          {/* 블로그 목록 */}
          {viewMode === "gallery" ? (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isWeeklyExpanded ? "xl:grid-cols-3" : "xl:grid-cols-4"
                } gap-6`}
            >
              {blogs.map((blog) => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  onLoginClick={onLoginClick}
                  selectedSubTags={selectedSubTags}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {blogs.map((blog) => (
                <BlogListItem
                  key={blog.id}
                  blog={blog}
                  onLoginClick={onLoginClick}
                />
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {!loading && blogs.length > 0 && (
            <BlogPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          )}

          {/* 푸터가 표시될 때 여백 추가 */}
          {!loading && blogs.length > 0 && <div className="pb-16"></div>}
        </>
      )}
    </main>
  );
}
