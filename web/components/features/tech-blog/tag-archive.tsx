"use client";

import { useState } from "react";
import { type TagCount, useTagCounts } from "@/hooks/use-tag-counts";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface TagArchiveProps {
  category: string;
  tagCounts?: TagCount[];
  loading?: boolean;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

export function TagArchive({
  category,
  tagCounts: providedTagCounts,
  loading: providedLoading,
  selectedTags,
  onToggleTag,
  onClearTags,
}: TagArchiveProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { tagCounts: internalTagCounts, loading: internalLoading } = useTagCounts(category);
  const tagCounts = providedTagCounts ?? internalTagCounts;
  const loading = providedLoading ?? internalLoading;

  if (loading) {
    return (
      <div className="w-full py-6 animate-pulse space-y-2">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (tagCounts.length === 0) {
    return null;
  }

  const archiveLabel = category === "all" ? "전체" : category;

  return (
    <div className="w-full rounded-xl border border-border/50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">
          {archiveLabel} 태그 아카이브
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            (Top {tagCounts.length})
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {selectedTags.length > 0 && !collapsed && (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={onClearTags}
            >
              선택 해제
            </button>
          )}
          <button
            type="button"
            aria-label={collapsed ? "태그 아카이브 펼치기" : "태그 아카이브 접기"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {!collapsed && (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            태그를 여러 개 선택해 조합 필터링할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {tagCounts.map(({ tag, count }) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm transition-all duration-200 border flex items-center gap-1.5",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                  )}
                >
                  <span>{tag}</span>
                  <span
                    className={cn(
                      "text-xs opacity-70",
                      isSelected ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
