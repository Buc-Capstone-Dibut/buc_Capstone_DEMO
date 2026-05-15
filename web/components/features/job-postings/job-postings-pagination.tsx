"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JobPostingsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

const SHORT_LIMIT = 7;

function buildPages(current: number, totalPages: number): Array<number | "ellipsis-left" | "ellipsis-right"> {
  if (totalPages <= SHORT_LIMIT) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis-left" | "ellipsis-right"> = [];
  pages.push(1);

  const leftBound = Math.max(2, current - 2);
  const rightBound = Math.min(totalPages - 1, current + 2);

  if (leftBound > 2) pages.push("ellipsis-left");
  for (let i = leftBound; i <= rightBound; i++) pages.push(i);
  if (rightBound < totalPages - 1) pages.push("ellipsis-right");

  pages.push(totalPages);
  return pages;
}

export function JobPostingsPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: JobPostingsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, page), totalPages);
  const pages = buildPages(safePage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="페이지네이션"
      className="mt-6 flex flex-wrap items-center justify-center gap-1"
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
        aria-label="이전 페이지"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">이전</span>
      </Button>

      {pages.map((p, idx) => {
        if (p === "ellipsis-left" || p === "ellipsis-right") {
          return (
            <span
              key={`${p}-${idx}`}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground"
              aria-hidden="true"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          );
        }
        const isActive = p === safePage;
        return (
          <Button
            key={p}
            type="button"
            size="icon"
            variant={isActive ? "default" : "ghost"}
            onClick={() => onPageChange(p)}
            aria-current={isActive ? "page" : undefined}
            aria-label={`페이지 ${p}`}
            className={cn("h-9 w-9 text-sm")}
          >
            {p}
          </Button>
        );
      })}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
        aria-label="다음 페이지"
      >
        <span className="mr-1 hidden sm:inline">다음</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
