"use client";

/**
 * 모든 렌더러가 공유하는 chrome shell.
 * - 바깥 배경: 중립 (#f5f5f5) — 렌더러 바뀌어도 동일
 * - 헤더 / 썸네일: 중립 (회색 텍스트 + 회색 라인)
 * - 슬라이드 캔버스 영역만 children 으로 받음 (이 안은 각 렌더러가 자유롭게 디자인)
 *
 * 키보드 ← → 페이지 네비게이션 포함.
 */

import { useEffect, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioDocument, PortfolioSitePage } from "@/lib/career-portfolios";

const SHELL_BG = "#f5f5f5";
const SHELL_CARD = "#ffffff";
const SHELL_HEADING = "#1f2937";
const SHELL_MUTED = "#6b7280";
const SHELL_BORDER = "#e5e7eb";

type RendererShellProps = {
  document: PortfolioDocument;
  pages: PortfolioSitePage[];
  index: number;
  setIndex: (next: number | ((prev: number) => number)) => void;
  className?: string;
  /** 슬라이드 영역 (각 렌더러의 캔버스). 부모가 가운데에 배치함. */
  children: ReactNode;
};

export function RendererShell({
  document,
  pages,
  index,
  setIndex,
  className,
  children,
}: RendererShellProps) {
  // 키보드 네비
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (event.key === "ArrowRight") setIndex((i) => Math.min(pages.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length, setIndex]);

  const currentPage = pages[Math.min(index, Math.max(0, pages.length - 1))];

  return (
    <section
      className={cn("min-h-screen", className)}
      style={{
        backgroundColor: SHELL_BG,
        color: SHELL_HEADING,
        fontFamily: "Pretendard, Inter, system-ui, sans-serif",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6">
        {/* 헤더 */}
        <header
          className="flex h-12 items-center justify-between rounded-lg px-4"
          style={{ backgroundColor: SHELL_CARD, border: `1px solid ${SHELL_BORDER}` }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: SHELL_HEADING, color: SHELL_CARD }}
            >
              <Layers3 className="h-3.5 w-3.5" />
            </span>
            <p
              className="truncate text-[13px] font-semibold"
              style={{ color: SHELL_HEADING }}
            >
              {document.sections[0]?.title || currentPage?.title || "포트폴리오"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p
              className="text-[11px] font-semibold tabular-nums"
              style={{ color: SHELL_MUTED }}
            >
              {index + 1} / {pages.length}
            </p>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="flex h-7 w-7 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-30"
              style={{ border: `1px solid ${SHELL_BORDER}`, color: SHELL_HEADING, backgroundColor: SHELL_CARD }}
              aria-label="이전"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
              disabled={index >= pages.length - 1}
              className="flex h-7 w-7 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-30"
              style={{ border: `1px solid ${SHELL_BORDER}`, color: SHELL_HEADING, backgroundColor: SHELL_CARD }}
              aria-label="다음"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* 슬라이드 캔버스 영역 — 각 렌더러가 채움 */}
        <div className="flex min-h-0 flex-1 items-center justify-center py-6">
          {children}
        </div>

        {/* 썸네일 */}
        <div className="flex h-12 items-center gap-1.5 overflow-x-auto">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              className="flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-[11px] font-medium transition"
              style={{
                border: `1px solid ${i === index ? SHELL_HEADING : SHELL_BORDER}`,
                backgroundColor: i === index ? SHELL_HEADING : SHELL_CARD,
                color: i === index ? SHELL_CARD : SHELL_MUTED,
              }}
            >
              <span className="tabular-nums opacity-70">{String(i + 1).padStart(2, "0")}</span>
              <span className="max-w-[140px] truncate">{p.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RendererEmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex min-h-screen items-center justify-center", className)}
      style={{ backgroundColor: SHELL_BG, color: SHELL_MUTED }}
    >
      슬라이드가 없습니다.
    </div>
  );
}

export const SHELL_CONSTANTS = {
  BG: SHELL_BG,
  CARD: SHELL_CARD,
  HEADING: SHELL_HEADING,
  MUTED: SHELL_MUTED,
  BORDER: SHELL_BORDER,
} as const;
