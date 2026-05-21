"use client";

/**
 * Brutalist Tech — 흑+노랑(#facc15) 강한 대비, 굵은 mono 폰트(Space Mono).
 * 강한 박스·굵은 라인·기하학적 그리드. 개발자/엔지니어 강렬 디자인.
 *
 * 색: 흑 #000000 텍스트 + 흰 #fafaf9 배경 + 노랑 #facc15 강조
 * 폰트: Space Mono / IBM Plex Mono (mono, bold)
 * 정렬: 좌측, 그리드 명시
 * 강조: 굵은 border, 컬러 블록 (특히 노란 배경), 강한 대비
 */

import { useEffect, useMemo } from "react";
import type { PortfolioSitePage } from "@/lib/career-portfolios";
import {
  blockText,
  calloutBlocks,
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

const BG = "#fafaf9";
const TEXT = "#000000";
const MUTED = "#525252";
const ACCENT = "#facc15";
const ACCENT_TEXT = "#000000";
const BORDER = "#000000";
const MONO = "'Space Mono', 'IBM Plex Mono', monospace";

export function BrutalistTechRenderer({
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = "dibut-brutalist-font";
    if (window.document.getElementById(id)) return;
    const link = window.document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap";
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
        className="relative w-full border-[5px] shadow-[8px_8px_0_0_#000000]"
        style={{
          maxWidth: "min(1120px, calc(177.78vh - 220px))",
          borderColor: BORDER,
          backgroundColor: BG,
          color: TEXT,
          fontFamily: MONO,
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
    <article className="relative h-full w-full overflow-hidden" style={{ backgroundColor: BG }}>
      {/* 큰 노란 코너 블록 — Brutalist 시그니처 */}
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rotate-12"
        style={{ backgroundColor: ACCENT, border: `4px solid ${BORDER}` }}
      />
      <div className="absolute left-12 top-6 flex items-center gap-2">
        <span className="block h-[3px] w-6" style={{ backgroundColor: BORDER }} />
        <span data-edit-field="eyebrow" className="text-[10px] font-bold uppercase tracking-[0.24em]">
          [{page.eyebrow || "PORTFOLIO"}]
        </span>
      </div>
      <div className="relative h-full w-full overflow-hidden px-12 pb-6 pt-14">{children}</div>
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

function CoverSlide({ page }: { page: PortfolioSitePage }) {
  const metric = metricBlocks(page)[0];
  return (
    <div className="grid h-full grid-cols-[1.2fr_1fr] gap-8 overflow-hidden">
      <div className="flex flex-col justify-center overflow-hidden">
        <p className="inline-block w-fit border-[3px] px-2 py-1 text-[10px] font-bold uppercase" style={{ borderColor: BORDER, backgroundColor: ACCENT }}>
          {plainText(page.intent || "PORTFOLIO 2026", 60)}
        </p>
        <h1 className="mt-5 break-keep text-[56px] font-bold leading-[0.95] uppercase tracking-tight">
          {plainText(page.title, 80)}
        </h1>
        {page.subtitle ? (
          <p data-edit-field="subtitle" className="mt-5 max-w-[520px] break-keep text-[14px] font-bold leading-6" style={{ color: MUTED }}>
            {plainText(page.subtitle, 140)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col justify-center overflow-hidden">
        {metric ? (
          <div className="border-[5px] p-6" style={{ borderColor: BORDER, backgroundColor: ACCENT, color: ACCENT_TEXT }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]">
              {plainText(metric.label, 30)}
            </p>
            <p className="mt-2 break-keep text-[64px] font-bold leading-none">
              {plainText(metric.value, 18)}
            </p>
            {metric.caption ? (
              <p className="mt-3 text-[12px] font-bold leading-5">
                {plainText(metric.caption, 80)}
              </p>
            ) : null}
          </div>
        ) : (
          <p data-edit-field="narrative" className="border-l-[5px] pl-5 text-[14px] font-bold leading-7" style={{ borderColor: BORDER }}>
            {pageNarrative(page, 180)}
          </p>
        )}
      </div>
    </div>
  );
}

function ProfileSlide({ page }: { page: PortfolioSitePage }) {
  const emphasis = pageEmphasis(page).slice(0, 4);
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-8 overflow-hidden">
      <div className="flex flex-col justify-center overflow-hidden">
        <h2 className="break-keep text-[44px] font-bold uppercase leading-tight">
          {plainText(page.title, 60)}
        </h2>
        <div className="my-4 h-[4px] w-12" style={{ backgroundColor: BORDER }} />
        <p data-edit-field="narrative" className="whitespace-pre-line break-keep text-[13px] font-bold leading-6">
          {pageNarrative(page, 240)}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-3 overflow-hidden">
        {emphasis.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex items-center gap-3 border-[3px] px-4 py-3"
            style={{
              borderColor: BORDER,
              backgroundColor: i === 0 ? ACCENT : BG,
            }}
          >
            <span className="text-[14px] font-bold tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[14px] font-bold uppercase">
              {plainText(item, 60)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsSlide({ page }: { page: PortfolioSitePage }) {
  const items = matrixItems(page).slice(0, 12);
  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <h2 className="break-keep text-[40px] font-bold uppercase leading-tight">
        {plainText(page.title, 60)}
      </h2>
      <div className="grid flex-1 grid-cols-4 gap-2 overflow-hidden">
        {items.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex items-center justify-center border-[3px] p-3 text-center"
            style={{
              borderColor: BORDER,
              backgroundColor: i % 5 === 0 ? ACCENT : BG,
            }}
          >
            <span className="break-keep text-[12px] font-bold uppercase">
              {plainText(item, 30)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndexSlide({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page).slice(0, 6);
  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <h2 className="break-keep text-[40px] font-bold uppercase leading-tight">
        [{plainText(page.title, 60)}]
      </h2>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        {items.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-4 border-b-[3px] pb-2"
            style={{ borderColor: BORDER }}
          >
            <span
              className="inline-block w-fit border-[3px] px-2 py-1 text-[11px] font-bold tabular-nums"
              style={{
                borderColor: BORDER,
                backgroundColor: i === 0 ? ACCENT : BG,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="break-keep text-[16px] font-bold uppercase">
              {plainText(item, 80)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseSlide({ page }: { page: PortfolioSitePage }) {
  const flow = flowItems(page).slice(0, 4);
  const callout = calloutBlocks(page)[0];
  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <div className="flex items-baseline justify-between gap-6">
        <div className="overflow-hidden">
          <p data-edit-field="eyebrow" className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: MUTED }}>
            [{page.eyebrow || "CASE STUDY"}]
          </p>
          <h2 className="mt-2 break-keep text-[32px] font-bold uppercase leading-tight">
            {plainText(page.title, 70)}
          </h2>
        </div>
        {page.subtitle ? (
          <p data-edit-field="subtitle" className="shrink-0 border-[3px] px-3 py-1.5 text-[10px] font-bold uppercase" style={{ borderColor: BORDER, backgroundColor: ACCENT }}>
            {plainText(page.subtitle, 50)}
          </p>
        ) : null}
      </div>
      <div className="grid flex-1 grid-cols-4 gap-3 overflow-hidden">
        {flow.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex flex-col border-[3px] p-3"
            style={{
              borderColor: BORDER,
              backgroundColor: i === flow.length - 1 ? ACCENT : BG,
            }}
          >
            <span className="text-[24px] font-bold tabular-nums leading-none">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
              {i === 0 ? "PROBLEM" : i === 1 ? "ROLE" : i === 2 ? "SOLUTION" : "RESULT"}
            </span>
            <p className="mt-3 break-keep text-[12px] font-bold leading-5">
              {plainText(item, 100)}
            </p>
          </div>
        ))}
      </div>
      {callout ? (
        <div className="border-[3px] border-l-[8px] px-4 py-2" style={{ borderColor: BORDER }}>
          <p className="text-[10px] font-bold uppercase tracking-wider">
            {`> ${callout.label || "KEY POINT"}`}
          </p>
          <p className="mt-1 whitespace-pre-line break-keep text-[12px] font-bold leading-6">
            {multilineText(callout.content, 180)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function DetailSlide({ page }: { page: PortfolioSitePage }) {
  const blocks = textBlocks(page).slice(0, 3);
  const metric = metricBlocks(page)[0];
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-6 overflow-hidden">
      <div className="flex flex-col justify-center overflow-hidden">
        <p data-edit-field="eyebrow" className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: MUTED }}>
          [{page.eyebrow || "DETAIL"}]
        </p>
        <h2 className="mt-2 break-keep text-[32px] font-bold uppercase leading-tight">
          {plainText(page.title, 70)}
        </h2>
        <p data-edit-field="narrative" className="mt-4 whitespace-pre-line break-keep text-[13px] font-bold leading-6">
          {pageNarrative(page, 200)}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-3 overflow-hidden">
        {metric ? (
          <div className="border-[5px] p-4" style={{ borderColor: BORDER, backgroundColor: ACCENT }}>
            <p className="text-[10px] font-bold uppercase tracking-wider">{plainText(metric.label, 30)}</p>
            <p className="mt-1 text-[48px] font-bold leading-none tabular-nums">{plainText(metric.value, 16)}</p>
            {metric.caption ? (
              <p className="mt-2 text-[11px] font-bold leading-5">{plainText(metric.caption, 80)}</p>
            ) : null}
          </div>
        ) : null}
        {blocks.map((block, i) => (
          <div key={block.id} data-edit-block-id={block.id} className="border-[3px] px-3 py-2" style={{ borderColor: BORDER }}>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
              {`> ${getBlockLabel(block, `POINT ${i + 1}`)}`}
            </p>
            <p className="mt-1 whitespace-pre-line break-keep text-[11px] font-bold leading-5">
              {blockText(block, 140)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RetrospectiveSlide({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page).slice(0, 4);
  return (
    <div className="grid h-full grid-cols-[0.7fr_1.3fr] gap-6 overflow-hidden">
      <div className="flex flex-col justify-center overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: MUTED }}>
          [GROWTH]
        </p>
        <h2 className="mt-2 break-keep text-[32px] font-bold uppercase leading-tight">
          {plainText(page.title, 60)}
        </h2>
        <p data-edit-field="narrative" className="mt-4 whitespace-pre-line break-keep text-[12px] font-bold leading-6" style={{ color: MUTED }}>
          {pageNarrative(page, 200)}
        </p>
      </div>
      <div className="grid grid-cols-2 grid-rows-2 gap-3 overflow-hidden">
        {items.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex flex-col border-[3px] p-3"
            style={{ borderColor: BORDER, backgroundColor: i % 3 === 0 ? ACCENT : BG }}
          >
            <span className="text-[28px] font-bold tabular-nums leading-none">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="mt-2 break-keep text-[12px] font-bold leading-5">
              {plainText(item, 90)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactSlide({ page }: { page: PortfolioSitePage }) {
  return (
    <div className="flex h-full items-center overflow-hidden">
      <div className="w-full">
        <p
          className="inline-block w-fit border-[3px] px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ borderColor: BORDER, backgroundColor: ACCENT }}
        >
          [END]
        </p>
        <h1 className="mt-5 break-keep text-[68px] font-bold uppercase leading-[0.95]">
          {plainText(page.title, 60)}
        </h1>
        <div className="my-6 h-[5px] w-32" style={{ backgroundColor: BORDER }} />
        <p data-edit-field="narrative" className="max-w-[640px] whitespace-pre-line break-keep text-[14px] font-bold leading-7">
          {pageNarrative(page, 280)}
        </p>
      </div>
    </div>
  );
}
