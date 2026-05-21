"use client";

/**
 * Editorial Magazine — 크림 종이 배경, serif 헤딩, 매거진 식 중앙 정렬, italic.
 * PM/디자이너/기획 인상.
 *
 * 색: 크림 #fdf6e3 배경 + burnt amber #b45309 강조 + dark brown #7c2d12 헤딩
 * 폰트: 헤딩 serif(Playfair Display), 본문 sans(Pretendard)
 * 정렬: 중앙
 * 강조 도구: 큰 따옴표(") · 점선 디바이더 · drop cap · italic
 */

import { useEffect, useMemo } from "react";
import type { PortfolioSitePage } from "@/lib/career-portfolios";
import {
  blockText,
  calloutBlocks,
  contributionBlocks,
  flowItems,
  getBlockLabel,
  matrixItems,
  metricBlocks,
  multilineText,
  pageEmphasis,
  pageNarrative,
  plainText,
  textBlocks,
  timelineItems,
  type RendererProps,
} from "./shared";
import { RendererEmptyState, RendererShell, useRendererPageIndex } from "./renderer-shell";

const BG = "#fdf6e3";
const HEADING = "#7c2d12";
const TEXT = "#1c1917";
const ACCENT = "#b45309";
const MUTED = "#78716c";
const HAIRLINE = "#d6cfb8";
const SERIF = "'Playfair Display', Georgia, serif";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

export function EditorialMagazineRenderer({
  document,
  className,
  activeIndex,
  onActiveIndexChange,
  hideHeader,
  hideThumbnails,
  disableKeyboardNav,
  includeHiddenPages,
}: RendererProps) {
  const pages = useMemo(
    () => (document.pages || []).filter((p) => includeHiddenPages || p.visible !== false),
    [document.pages, includeHiddenPages],
  );
  const [index, setIndex] = useRendererPageIndex({ activeIndex, onActiveIndexChange }, pages.length);
  const page = pages[Math.min(index, Math.max(0, pages.length - 1))];

  // Playfair Display 폰트 동적 로드
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = "dibut-editorial-magazine-font";
    if (window.document.getElementById(id)) return;
    const link = window.document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;0,800;1,500;1,700&display=swap";
    window.document.head.appendChild(link);
  }, []);

  if (!page) {
    return <RendererEmptyState className={className} />;
  }

  return (
    <RendererShell
      document={document}
      pages={pages}
      index={index}
      setIndex={setIndex}
      className={className}
      hideHeader={hideHeader}
      hideThumbnails={hideThumbnails}
      disableKeyboardNav={disableKeyboardNav}
    >
      <div
        className="relative w-full border-[3px] shadow-[0_24px_70px_rgba(124,45,18,0.18)]"
        style={{
          maxWidth: "min(1120px, calc(177.78vh - 220px))",
          borderColor: HEADING,
          backgroundColor: BG,
          color: TEXT,
          fontFamily: "Pretendard, system-ui, sans-serif",
        }}
      >
        <div className="aspect-[16/9] w-full">
          <SlideShell page={page}>{renderSlide(page)}</SlideShell>
        </div>
      </div>
    </RendererShell>
  );
}

function SlideShell({ page, children }: { page: PortfolioSitePage; children: React.ReactNode }) {
  return (
    <article
      className="relative h-full w-full overflow-hidden px-16 py-10"
      style={{
        backgroundColor: BG,
        backgroundImage:
          "radial-gradient(circle at 10% 10%, rgba(180,83,9,0.04) 0, transparent 30%), radial-gradient(circle at 90% 90%, rgba(124,45,18,0.04) 0, transparent 30%)",
      }}
    >
      <div className="absolute left-16 top-6 flex items-center gap-3">
        <span data-edit-field="eyebrow" className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: ACCENT, fontFamily: SERIF, fontStyle: "italic" }}>
          — {page.eyebrow || "Editorial"} —
        </span>
      </div>
      <div className="relative h-full w-full pt-8">{children}</div>
    </article>
  );
}

function renderSlide(page: PortfolioSitePage) {
  if (page.type === "cover") return <CoverSlide page={page} />;
  if (page.type === "profile") return <ProfileSlide page={page} />;
  if (page.type === "skills") return <SkillsSlide page={page} />;
  if (page.type === "project-index") return <IndexSlide page={page} />;
  if (page.type === "case-study") return <CaseSlide page={page} />;
  if (page.type === "project-detail") return <DetailSlide page={page} />;
  if (page.type === "experience") return <CaseSlide page={page} />;
  if (page.type === "retrospective") return <RetrospectiveSlide page={page} />;
  if (page.type === "contact") return <ContactSlide page={page} />;
  return <CaseSlide page={page} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// 슬라이드들
// ──────────────────────────────────────────────────────────────────────────────

function CoverSlide({ page }: { page: PortfolioSitePage }) {
  const emphasis = pageEmphasis(page).slice(0, 4);
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-[12px] font-medium italic tracking-[0.32em]" style={{ color: ACCENT, fontFamily: SERIF }}>
        — {plainText(page.intent || "Portfolio Issue", 80)} —
      </p>
      <h1
        className="mt-6 max-w-[820px] break-keep text-[64px] font-bold leading-[1.05]"
        style={{ fontFamily: SERIF, color: HEADING }}
      >
        {plainText(page.title, 80)}
      </h1>
      <span className="my-7 inline-block h-[2px] w-20" style={{ backgroundColor: HEADING }} />
      {page.subtitle ? (
        <p data-edit-field="subtitle"
          className="max-w-[640px] break-keep text-[18px] font-medium italic leading-8"
          style={{ fontFamily: SERIF, color: TEXT }}
        >
          {plainText(page.subtitle, 200)}
        </p>
      ) : null}
      {emphasis.length ? (
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {emphasis.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="text-[12px] font-medium italic tracking-[0.2em]"
              style={{ color: ACCENT, fontFamily: SERIF }}
            >
              {plainText(item, 30)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfileSlide({ page }: { page: PortfolioSitePage }) {
  const narrative = pageNarrative(page, 400);
  const firstChar = narrative.trim().charAt(0);
  const restText = narrative.trim().slice(1);
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-12">
      <div className="flex flex-col justify-center">
        <h2
          className="break-keep text-[44px] font-bold italic leading-[1.1]"
          style={{ fontFamily: SERIF, color: HEADING }}
        >
          {plainText(page.title, 80)}
        </h2>
        <span className="mt-5 inline-block h-[2px] w-12" style={{ backgroundColor: ACCENT }} />
        <p className="mt-6 whitespace-pre-line break-keep text-[15px] font-medium leading-[1.85]" style={{ color: TEXT }}>
          {/* Drop cap */}
          <span
            className="float-left mr-2 text-[64px] font-bold italic leading-[0.85]"
            style={{ fontFamily: SERIF, color: ACCENT }}
          >
            {firstChar}
          </span>
          {restText}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-6">
        <Pullquote data-edit-field="emphasis" items={pageEmphasis(page).slice(0, 4)} />
      </div>
    </div>
  );
}

function SkillsSlide({ page }: { page: PortfolioSitePage }) {
  const items = matrixItems(page).slice(0, 12);
  return (
    <div className="flex h-full flex-col gap-8">
      <div className="text-center">
        <h2 className="break-keep text-[40px] font-bold italic" style={{ fontFamily: SERIF, color: HEADING }}>
          {plainText(page.title, 80)}
        </h2>
        <span className="mx-auto mt-4 block h-[2px] w-16" style={{ backgroundColor: ACCENT }} />
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-center gap-x-7 gap-y-4 border-y border-dashed py-6" style={{ borderColor: ACCENT + "60" }}>
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="break-keep text-[18px] font-medium italic"
            style={{
              fontFamily: SERIF,
              color: i % 2 === 0 ? HEADING : TEXT,
            }}
          >
            {plainText(item, 36)}
            {i < items.length - 1 ? <span className="ml-7 select-none" style={{ color: ACCENT, opacity: 0.4 }}>·</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function IndexSlide({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page).slice(0, 6);
  return (
    <div className="flex h-full flex-col gap-8">
      <div className="text-center">
        <p className="text-[11px] font-medium uppercase italic tracking-[0.3em]" style={{ color: ACCENT, fontFamily: SERIF }}>
          Contents
        </p>
        <h2 className="mt-3 text-[44px] font-bold italic" style={{ fontFamily: SERIF, color: HEADING }}>
          {plainText(page.title, 80)}
        </h2>
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-[760px] space-y-3">
          {items.map((item, i) => (
            <div key={`${item}-${i}`} className="grid grid-cols-[60px_minmax(0,1fr)_70px] items-baseline gap-4 border-b border-dashed pb-3" style={{ borderColor: ACCENT + "60" }}>
              <span className="text-[20px] font-bold italic" style={{ fontFamily: SERIF, color: ACCENT }}>
                {ROMAN[i] || i + 1}.
              </span>
              <p className="break-keep text-[15px] font-medium leading-7" style={{ color: TEXT }}>
                {plainText(item, 100)}
              </p>
              <span className="text-right text-[11px] font-medium uppercase tracking-[0.18em] tabular-nums" style={{ color: MUTED }}>
                page {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CaseSlide({ page }: { page: PortfolioSitePage }) {
  const callout = calloutBlocks(page)[0];
  const blocks = textBlocks(page).slice(0, 3);
  return (
    <div className="grid h-full grid-cols-[1fr_1.4fr] gap-10">
      <div className="flex flex-col justify-center border-r-[2px] pr-10" style={{ borderColor: HEADING }}>
        <p data-edit-field="eyebrow" className="text-[11px] font-medium italic uppercase tracking-[0.28em]" style={{ color: ACCENT, fontFamily: SERIF }}>
          {page.eyebrow || "Case Study"}
        </p>
        <h2 className="mt-3 break-keep text-[36px] font-bold italic leading-[1.1]" style={{ fontFamily: SERIF, color: HEADING }}>
          {plainText(page.title, 80)}
        </h2>
        {page.subtitle ? (
          <p data-edit-field="subtitle" className="mt-3 text-[12px] font-medium italic" style={{ color: MUTED, fontFamily: SERIF }}>
            {plainText(page.subtitle, 100)}
          </p>
        ) : null}
        <p data-edit-field="narrative" className="mt-6 whitespace-pre-line break-keep text-[13px] font-medium leading-[1.85]" style={{ color: TEXT }}>
          {pageNarrative(page, 260)}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-6">
        {/* Magazine columns — 본문 블록들 */}
        <div className="columns-1 gap-6 [column-fill:_balance] md:columns-2">
          {blocks.map((block, i) => (
            <div key={block.id} className="mb-4 break-inside-avoid">
              <p className="text-[10px] font-medium italic uppercase tracking-[0.22em]" style={{ color: ACCENT, fontFamily: SERIF }}>
                — {ROMAN[i]} {getBlockLabel(block, "Note")} —
              </p>
              <p className="mt-1 whitespace-pre-line break-keep text-[12.5px] font-medium leading-[1.85]" style={{ color: TEXT }}>
                {blockText(block, 180)}
              </p>
            </div>
          ))}
        </div>
        {callout ? (
          <div className="border-t border-dashed pt-4" style={{ borderColor: ACCENT + "60" }}>
            <p className="relative pl-7 text-[15px] font-medium italic leading-8" style={{ fontFamily: SERIF, color: HEADING }}>
              <span className="absolute -left-1 -top-3 text-[48px] font-bold leading-none" style={{ color: ACCENT, opacity: 0.5 }}>
                “
              </span>
              {multilineText(callout.content, 180)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailSlide({ page }: { page: PortfolioSitePage }) {
  const metric = metricBlocks(page)[0];
  const flow = flowItems(page).slice(0, 4);
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-12">
      <div className="flex flex-col justify-center">
        <p data-edit-field="eyebrow" className="text-[11px] font-medium italic uppercase tracking-[0.28em]" style={{ color: ACCENT, fontFamily: SERIF }}>
          {page.eyebrow || "Notes"}
        </p>
        <h2 className="mt-3 break-keep text-[36px] font-bold italic leading-[1.1]" style={{ fontFamily: SERIF, color: HEADING }}>
          {plainText(page.title, 80)}
        </h2>
        <p data-edit-field="narrative" className="mt-6 whitespace-pre-line break-keep text-[13.5px] font-medium leading-[1.85]" style={{ color: TEXT }}>
          {pageNarrative(page, 280)}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-7">
        {metric ? (
          <div className="text-center">
            <p className="text-[44px] font-bold italic leading-none" style={{ fontFamily: SERIF, color: ACCENT }}>
              {plainText(metric.value, 24)}
            </p>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: HEADING }}>
              {plainText(metric.label, 30)}
            </p>
            {metric.caption ? (
              <p className="mx-auto mt-3 max-w-[220px] text-[12px] font-medium italic leading-6" style={{ color: MUTED, fontFamily: SERIF }}>
                {plainText(metric.caption, 90)}
              </p>
            ) : null}
          </div>
        ) : null}
        {flow.length ? (
          <div className="border-t border-dashed pt-4" style={{ borderColor: ACCENT + "60" }}>
            {flow.map((item, i) => (
              <div key={`${item}-${i}`} className="mb-2 grid grid-cols-[40px_minmax(0,1fr)] items-baseline gap-3">
                <span className="text-[14px] font-bold italic" style={{ fontFamily: SERIF, color: ACCENT }}>
                  {ROMAN[i]}.
                </span>
                <p className="break-keep text-[13px] font-medium leading-7" style={{ color: TEXT }}>
                  {plainText(item, 120)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RetrospectiveSlide({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page).slice(0, 4);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <p className="text-[11px] font-medium italic uppercase tracking-[0.32em]" style={{ color: ACCENT, fontFamily: SERIF }}>
        — Growth Notes —
      </p>
      <h2 className="max-w-[780px] break-keep text-[40px] font-bold italic leading-[1.1]" style={{ fontFamily: SERIF, color: HEADING }}>
        {plainText(page.title, 80)}
      </h2>
      <p data-edit-field="narrative" className="max-w-[640px] whitespace-pre-line break-keep text-[14px] font-medium italic leading-8" style={{ color: TEXT, fontFamily: SERIF }}>
        {pageNarrative(page, 240)}
      </p>
      {items.length ? (
        <div className="mt-4 grid w-full max-w-[820px] grid-cols-4 gap-4 border-t border-dashed pt-5" style={{ borderColor: ACCENT + "60" }}>
          {items.map((item, i) => (
            <div key={`${item}-${i}`} className="text-left">
              <p className="text-[20px] font-bold italic" style={{ fontFamily: SERIF, color: ACCENT }}>
                {ROMAN[i]}.
              </p>
              <p className="mt-1 break-keep text-[12px] font-medium leading-6" style={{ color: TEXT }}>
                {plainText(item, 70)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContactSlide({ page }: { page: PortfolioSitePage }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-[11px] font-medium italic uppercase tracking-[0.32em]" style={{ color: ACCENT, fontFamily: SERIF }}>
        — Fin. —
      </p>
      <h1 className="mt-6 max-w-[700px] break-keep text-[60px] font-bold italic leading-[1.05]" style={{ fontFamily: SERIF, color: HEADING }}>
        {plainText(page.title, 80)}
      </h1>
      <span className="my-7 inline-block h-[2px] w-20" style={{ backgroundColor: HEADING }} />
      <p data-edit-field="narrative" className="max-w-[600px] whitespace-pre-line break-keep text-[16px] font-medium italic leading-9" style={{ color: TEXT, fontFamily: SERIF }}>
        {pageNarrative(page, 280)}
      </p>
    </div>
  );
}

function Pullquote({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="relative pl-8">
      <span className="absolute -left-2 -top-4 text-[80px] font-bold italic leading-none" style={{ color: ACCENT, opacity: 0.4, fontFamily: SERIF }}>
        “
      </span>
      <div className="space-y-3">
        {items.map((item, i) => (
          <p
            key={`${item}-${i}`}
            className="break-keep text-[20px] font-medium italic leading-[1.55]"
            style={{ fontFamily: SERIF, color: i === 0 ? HEADING : TEXT }}
          >
            {plainText(item, 80)}
          </p>
        ))}
      </div>
    </div>
  );
}

function _silenced(_a: unknown, _b: unknown) {
  // contributionBlocks 미사용 회피 (필요 시 활용)
  return contributionBlocks;
}
void _silenced;
