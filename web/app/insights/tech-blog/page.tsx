"use client";

import { useState, useEffect } from "react";
import { SearchBar } from "@/components/features/tech-blog/search-bar";
import { ViewToggle } from "@/components/features/tech-blog/view-toggle";
import { TagFilterBar } from "@/components/features/tech-blog/tag-filter-bar";
import { TAG_FILTER_OPTIONS, type TagCategory } from "@/lib/tag-filters";
import { Sidebar } from "@/components/layout/sidebar";
import { TechBlogListLayout } from "@/components/layout/tech-blog-list-layout";
import { WeeklyPopular } from "@/components/features/tech-blog/weekly-popular";
import { TagArchive } from "@/components/features/tech-blog/tag-archive";
import { CompanyLogoFilter } from "@/components/features/tech-blog/company-logo-filter";
import { useBlogData } from "@/hooks/use-blog-data";
import { useTagCounts } from "@/hooks/use-tag-counts";
import { AuthModal } from "@/components/auth/auth-modal";
import { fetchWeeklyPopularBlogs, type Blog } from "@/lib/supabase";

export default function TechBlogPage() {
    const [viewMode, setViewMode] = useState<"gallery" | "list">("gallery");
    const [searchQuery, setSearchQuery] = useState("");
    const [tagCategory, setTagCategory] = useState<TagCategory>("all");
    const [selectedSubTags, setSelectedSubTags] = useState<string[]>([]);
    const [selectedBlog, setSelectedBlog] = useState("all");
    const [page, setPage] = useState(1);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [popularBlogs, setPopularBlogs] = useState<Blog[]>([]);
    const [recommendedTags, setRecommendedTags] = useState<string[]>([]);
    const [showRecBanner, setShowRecBanner] = useState(false);
    const { tagCounts, loading: tagCountsLoading } = useTagCounts(tagCategory, selectedBlog);

    // 분석 페이지 '더 보기'로 진입 시 추천 태그 조합을 URL에서 읽어 필터 적용
    useEffect(() => {
        if (typeof window === "undefined") return;
        const sp = new URLSearchParams(window.location.search);
        const tagsParam = sp.get("tags");
        if (!tagsParam) return;
        const tags = tagsParam.split(",").map((t) => t.trim()).filter(Boolean);
        if (tags.length === 0) return;
        setRecommendedTags(tags);
        if (sp.get("from") === "analysis") setShowRecBanner(true);
    }, []);

    useEffect(() => {
        const loadPopular = async () => {
            const data = await fetchWeeklyPopularBlogs(
                10,
                selectedBlog === "all" ? undefined : selectedBlog,
            );
            setPopularBlogs(data);
        };
        loadPopular();
    }, [selectedBlog]);

    const { blogs, loading, totalCount, totalPages, currentPage } = useBlogData({
        selectedBlog,
        searchQuery,
        tagCategory,
        selectedSubTags,
        recommendedTags,
        page,
    });

    const toggleArchiveTag = (tag: string) => {
        setSelectedSubTags((prev) =>
            prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
        );
        setPage(1);
    };

    return (
        <div className="w-full min-h-screen bg-background text-foreground">
            {/* Header Section */}
            <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 max-w-7xl py-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter mb-2">기술 블로그</h1>
                            <p className="text-muted-foreground text-lg">
                                국내외 주요 기술 기업들의 엔지니어링 블로그를 한곳에서 확인하세요.
                                <span className="ml-2 text-[12px] bg-muted px-2 py-1 rounded-full font-bold tracking-wider uppercase">
                                    Total {totalCount}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 max-w-7xl py-8">
                {/* 분석 페이지 추천 태그 진입 안내 배너 */}
                {showRecBanner && recommendedTags.length > 0 && (
                    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">디벗이 추천한 태그로 필터링했어요</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                최근 면접 성향을 기반으로 한 추천 태그가 하나라도 포함된 글만 모았습니다.
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {recommendedTags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full border border-primary/20 bg-background px-2 py-0.5 text-[11px] font-semibold text-primary"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setRecommendedTags([]);
                                setShowRecBanner(false);
                                setPage(1);
                            }}
                            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted"
                        >
                            필터 해제 · 전체 보기
                        </button>
                    </div>
                )}

                {/* Filter, Search, and ViewToggle Row */}
                <div className="mb-8 space-y-4">
                    <CompanyLogoFilter
                        value={selectedBlog}
                        onChange={(value) => {
                            setSelectedBlog(value);
                            setPage(1);
                        }}
                    />

                    <div className="flex flex-col md:flex-row items-center justify-end gap-3">
                        <div className="w-full md:w-[320px]">
                            <SearchBar
                                value={searchQuery}
                                onChange={(query) => {
                                    setSearchQuery(query);
                                    setPage(1);
                                }}
                                placeholder="제목, 기업명 검색..."
                            />
                        </div>
                        <ViewToggle
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />
                    </div>
                </div>

                <div className="mb-8 space-y-4 lg:hidden">
                    <div className="rounded-xl border border-border/50 p-4">
                        <div className="mb-3">
                            <h2 className="text-sm font-semibold text-foreground">카테고리 필터</h2>
                            <p className="text-xs text-muted-foreground">
                                태그 묶음 기준으로 글 범위를 빠르게 좁힐 수 있습니다.
                            </p>
                        </div>
                        <TagFilterBar
                            value={tagCategory}
                            options={TAG_FILTER_OPTIONS}
                            selectedSubTags={selectedSubTags}
                            availableTags={tagCounts}
                            showSubTags={false}
                            onChange={(val) => {
                                setTagCategory(val as TagCategory);
                                setSelectedSubTags([]);
                                setPage(1);
                            }}
                            onSubTagChange={(tags) => {
                                setSelectedSubTags(tags);
                                setPage(1);
                            }}
                        />
                    </div>
                    <TagArchive
                        category={tagCategory}
                        tagCounts={tagCounts}
                        loading={tagCountsLoading}
                        selectedTags={selectedSubTags}
                        onToggleTag={toggleArchiveTag}
                        onClearTags={() => {
                            setSelectedSubTags([]);
                            setPage(1);
                        }}
                    />
                </div>

                {/* Content Layout with Sidebar */}
                <div className="grid grid-cols-12 gap-8">
                    {/* Main Content (9 Cols) */}
                    <div className="col-span-12 lg:col-span-9">
                        <TechBlogListLayout
                            blogs={blogs}
                            loading={loading}
                            totalCount={totalCount}
                            totalPages={totalPages}
                            currentPage={currentPage}
                            viewMode={viewMode}
                            searchQuery={searchQuery}
                            tagCategory={tagCategory}
                            selectedSubTags={selectedSubTags}
                            isWeeklyExpanded={true}
                            onPageChange={setPage}
                            onViewModeChange={setViewMode}
                            onSearchChange={setSearchQuery}
                            onTagCategoryChange={setTagCategory}
                            onSubTagChange={setSelectedSubTags}
                            onWeeklyToggle={() => { }}
                            onLoginClick={() => setIsAuthModalOpen(true)}
                        />
                    </div>

                    {/* Sidebar (3 Cols) */}
                    <aside className="col-span-12 lg:col-span-3">
                        <Sidebar className="top-[130px] sticky">
                            <div className="rounded-xl border border-border/50 p-4">
                                <div className="mb-3">
                                    <h2 className="text-sm font-semibold text-foreground">카테고리 필터</h2>
                                    <p className="text-xs text-muted-foreground">
                                        태그 묶음 기준으로 글 범위를 빠르게 좁힐 수 있습니다.
                                    </p>
                                </div>
                                <TagFilterBar
                                    value={tagCategory}
                                    options={TAG_FILTER_OPTIONS}
                                    selectedSubTags={selectedSubTags}
                                    availableTags={tagCounts}
                                    showSubTags={false}
                                    onChange={(val) => {
                                        setTagCategory(val as TagCategory);
                                        setSelectedSubTags([]);
                                        setPage(1);
                                    }}
                                    onSubTagChange={(tags) => {
                                        setSelectedSubTags(tags);
                                        setPage(1);
                                    }}
                                />
                            </div>
                            <TagArchive
                                category={tagCategory}
                                tagCounts={tagCounts}
                                loading={tagCountsLoading}
                                selectedTags={selectedSubTags}
                                onToggleTag={toggleArchiveTag}
                                onClearTags={() => {
                                    setSelectedSubTags([]);
                                    setPage(1);
                                }}
                            />
                            <WeeklyPopular blogs={popularBlogs} />
                        </Sidebar>
                    </aside>
                </div>
            </div>

            <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
        </div>
    );
}
