"use client";

/**
 * 모든 렌더러가 공유하는 chrome shell.
 * - 바깥 배경: 중립 (#f5f5f5) — 렌더러 바뀌어도 동일
 * - 헤더 / 썸네일: 중립 (회색 텍스트 + 회색 라인)
 * - 슬라이드 캔버스 영역만 children 으로 받음 (이 안은 각 렌더러가 자유롭게 디자인)
 *
 * 키보드 ← → 페이지 네비게이션 포함.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioDocument, PortfolioSitePage } from "@/lib/career-portfolios";
import type { RendererProps } from "./shared";

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
  /** 헤더 chrome 숨김 (편집기에서 자체 헤더 쓸 때) */
  hideHeader?: boolean;
  /** 하단 썸네일 숨김 (편집기에서 사이드바로 페이지 네비 할 때) */
  hideThumbnails?: boolean;
  /** 키보드 ← → 네비 비활성화 (편집기 input 포커스 등과 충돌 방지) */
  disableKeyboardNav?: boolean;
};

export function RendererShell({
  document,
  pages,
  index,
  setIndex,
  className,
  children,
  hideHeader,
  hideThumbnails,
  disableKeyboardNav,
}: RendererShellProps) {
  // 키보드 네비
  useEffect(() => {
    if (disableKeyboardNav) return;
    const onKey = (event: KeyboardEvent) => {
      // input/textarea 포커스 상태면 무시
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (event.key === "ArrowRight") setIndex((i) => Math.min(pages.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length, setIndex, disableKeyboardNav]);

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
        {!hideHeader ? (
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
        ) : null}

        {/* 슬라이드 캔버스 영역 — 각 렌더러가 채움 */}
        <div className="flex min-h-0 flex-1 items-center justify-center py-6">
          {children}
        </div>

        {/* 썸네일 */}
        {!hideThumbnails ? (
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
        ) : null}
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

/**
 * 페이지 인덱스를 외부 제어(activeIndex/onActiveIndexChange)와 내부 state 사이에서
 * 일관되게 다루는 helper. 각 렌더러에서 boilerplate 줄이려고 추출.
 */
export function useRendererPageIndex(
  props: Pick<RendererProps, "activeIndex" | "onActiveIndexChange">,
  total: number,
) {
  const [internalIndex, setInternalIndex] = useState(0);
  const externalIndex = props.activeIndex;
  const index = (externalIndex !== undefined ? externalIndex : internalIndex);
  const onChange = props.onActiveIndexChange;
  const setIndex = useCallback(
    (next: number | ((prev: number) => number)) => {
      const resolved = typeof next === "function" ? (next as (n: number) => number)(index) : next;
      const clamped = Math.max(0, Math.min(Math.max(total - 1, 0), resolved));
      if (onChange) onChange(clamped);
      else setInternalIndex(clamped);
    },
    [index, total, onChange],
  );
  return [index, setIndex] as const;
}
