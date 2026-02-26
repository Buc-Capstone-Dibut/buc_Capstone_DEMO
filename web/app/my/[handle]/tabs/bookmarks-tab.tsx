"use client";

import Image from "next/image";
import { Bookmark, ExternalLink, LayoutGrid, List, Loader2 } from "lucide-react";
import type { BookmarkView, ProfileBookmarkItem } from "../profile-types";
import { formatDate } from "../profile-utils";
import { ProfileEmptyState } from "./empty-state";

interface BookmarksTabProps {
  loading?: boolean;
  error?: string;
  bookmarks: ProfileBookmarkItem[];
  bookmarkView: BookmarkView;
  onChangeBookmarkView: (view: BookmarkView) => void;
  totalCount: number;
}

export function BookmarksTab({
  loading,
  error,
  bookmarks,
  bookmarkView,
  onChangeBookmarkView,
  totalCount,
}: BookmarksTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalCount > 0 ? `북마크 ${totalCount}개` : ""}
        </p>
        {totalCount > 0 && (
          <div className="flex items-center rounded-md border overflow-hidden">
            {(["card", "list"] as const).map((view) => (
              <button
                key={view}
                onClick={() => onChangeBookmarkView(view)}
                title={view === "card" ? "카드 보기" : "리스트 보기"}
                className={[
                  "px-2.5 py-1.5 transition-colors",
                  bookmarkView === view
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                {view === "card" ? (
                  <LayoutGrid className="w-3 h-3" />
                ) : (
                  <List className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          북마크를 불러오는 중...
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 py-10 text-center">{error}</p>
      ) : bookmarks.length === 0 ? (
        <ProfileEmptyState icon={Bookmark} message="북마크한 글이 없습니다." />
      ) : bookmarkView === "card" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {bookmarks.map((row) => (
            <div
              key={row.id}
              className="group rounded-lg border bg-card overflow-hidden hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col"
              onClick={() =>
                row.blog?.externalUrl &&
                window.open(row.blog.externalUrl, "_blank", "noopener,noreferrer")
              }
            >
              <div className="h-20 bg-muted overflow-hidden relative shrink-0">
                {row.blog?.thumbnailUrl ? (
                  <Image
                    src={row.blog.thumbnailUrl}
                    alt={row.blog.title ?? "북마크 이미지"}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                    <span className="text-2xl font-bold text-primary/20 select-none uppercase">
                      {(row.blog?.title || "B").charAt(0)}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition bg-background/90 rounded-full p-1.5 shadow">
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-2 flex flex-col gap-1 flex-1 min-w-0">
                <p className="text-[11px] font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {row.blog?.title}
                </p>
                <div className="flex items-center gap-1 mt-auto text-[10px] text-muted-foreground truncate">
                  {row.blog?.author && (
                    <span className="truncate font-medium">{row.blog.author}</span>
                  )}
                  {row.blog?.publishedAt && (
                    <>
                      <span className="shrink-0">·</span>
                      <span className="shrink-0">{formatDate(row.blog.publishedAt)}</span>
                    </>
                  )}
                </div>
                {(row.blog?.tags || []).length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {row.blog?.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/8 text-primary/70 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y overflow-hidden">
          {bookmarks.map((row) => (
            <div
              key={row.id}
              className="group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() =>
                row.blog?.externalUrl &&
                window.open(row.blog.externalUrl, "_blank", "noopener,noreferrer")
              }
            >
              <div className="relative w-9 h-9 rounded-md bg-muted overflow-hidden shrink-0">
                {row.blog?.thumbnailUrl ? (
                  <Image
                    src={row.blog.thumbnailUrl}
                    alt={row.blog.title ?? "북마크 이미지"}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                    <span className="text-xs font-bold text-primary/30 uppercase">
                      {(row.blog?.title || "B").charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-none truncate group-hover:text-primary transition-colors">
                  {row.blog?.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                  {row.blog?.author && (
                    <span className="truncate max-w-[80px] font-medium">{row.blog.author}</span>
                  )}
                  {(row.blog?.tags || []).slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="shrink-0 px-1.5 py-0.5 rounded-full bg-primary/8 text-primary/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {row.blog?.publishedAt && (
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {formatDate(row.blog.publishedAt)}
                  </span>
                )}
                <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
