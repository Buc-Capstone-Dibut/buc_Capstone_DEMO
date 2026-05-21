"use client";

/**
 * Minimal Mono — 흑백 + 한 가지 강조색(emerald), 큰 sans, 넓은 여백, 좌측 정렬.
 * 절제된 디자인. 백엔드/시스템 엔지니어 인상.
 *
 * 색: 흑(#0a0a0a 텍스트) + 흰(#fafafa 배경) + emerald(#10b981 강조)
 * 폰트: Pretendard / Inter
 * 정렬: 좌측
 * 강조 도구: 좌측 막대(border-l-[4px]), 큰 숫자, 점선 디바이더
 */

import { useMemo } from "react";
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

const ACCENT = "#10b981";
const TEXT = "#0a0a0a";
const MUTED = "#737373";
const BG = "#fafafa";
const HAIRLINE = "#e5e5e5";

export function MinimalMonoRenderer({
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
        className="relative w-full border bg-white"
        style={{
          maxWidth: "min(1120px, calc(177.78vh - 220px))",
          borderColor: HAIRLINE,
          backgroundColor: BG,
          color: TEXT,
          fontFamily: "Inter, Pretendard, system-ui, sans-serif",
        }}
      >
        <div className="aspect-[16/9] w-full">
          <SlideShell page={page}>{renderSlide(page)}</SlideShell>
        </div>
      </div>
    </RendererShell>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Slide shell — 외곽 + eyebrow + 페이지 번호 (아주 단순)
// ──────────────────────────────────────────────────────────────────────────────

function SlideShell({ page, children }: { page: PortfolioSitePage; children: React.ReactNode }) {
  return (
    <article className="relative h-full w-full overflow-hidden bg-white px-14 py-12">
      <div className="absolute left-14 top-6 flex items-center gap-2">
        <span className="h-[1px] w-8" style={{ backgroundColor: TEXT }} />
        <span data-edit-field="eyebrow" className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: TEXT }}>
          {page.eyebrow || "PORTFOLIO"}
        </span>
      </div>
      <div className="relative h-full w-full pt-10">{children}</div>
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
  if (page.type === "experience") return <ExperienceSlide page={page} />;
  if (page.type === "retrospective") return <RetrospectiveSlide page={page} />;
  if (page.type === "contact") return <ContactSlide page={page} />;
  return <CaseSlide page={page} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// 슬라이드 컴포넌트
// ──────────────────────────────────────────────────────────────────────────────

function CoverSlide({ page }: { page: PortfolioSitePage }) {
  const emphasis = pageEmphasis(page).slice(0, 4);
  const metric = metricBlocks(page)[0];
  return (
    <div className="grid h-full grid-cols-[1.2fr_1fr] gap-12">
      <div className="flex flex-col justify-center">
        {page.intent ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: MUTED }}>
            {plainText(page.intent, 80)}
          </p>
        ) : null}
        <h1 className="mt-4 break-keep text-[52px] font-black leading-[1.02] tracking-tight">
          {plainText(page.title, 80)}
        </h1>
        {page.subtitle ? (
          <p data-edit-field="subtitle" className="mt-5 max-w-[520px] break-keep text-[16px] font-medium leading-7" style={{ color: MUTED }}>
            {plainText(page.subtitle, 140)}
          </p>
        ) : null}
        {emphasis.length ? (
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
            {emphasis.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: TEXT }}
              >
                {plainText(item, 30)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div
        className="flex flex-col justify-center border-l-[4px] pl-10"
        style={{ borderColor: ACCENT }}
      >
        {metric ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: MUTED }}>
              {plainText(metric.label, 30)}
            </p>
            <p className="mt-2 break-keep text-[88px] font-black leading-none tracking-tight" style={{ color: ACCENT }}>
              {plainText(metric.value, 16)}
            </p>
            {metric.caption ? (
              <p className="mt-4 max-w-[260px] text-[13px] font-medium leading-6" style={{ color: MUTED }}>
                {plainText(metric.caption, 100)}
              </p>
            ) : null}
          </>
        ) : (
          <p data-edit-field="narrative" className="whitespace-pre-line text-[15px] font-medium leading-7" style={{ color: MUTED }}>
            {pageNarrative(page, 200)}
          </p>
        )}
      </div>
    </div>
  );
}

function ProfileSlide({ page }: { page: PortfolioSitePage }) {
  const contributions = contributionBlocks(page).slice(0, 4);
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-12">
      <div className="flex flex-col justify-center">
        <h2 className="break-keep text-[44px] font-black leading-tight tracking-tight">
          {plainText(page.title, 80)}
        </h2>
        <p data-edit-field="narrative" className="mt-5 whitespace-pre-line break-keep text-[15px] font-medium leading-7" style={{ color: TEXT }}>
          {pageNarrative(page, 320)}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-5">
        {contributions.length ? (
          contributions.map((c) => (
            <div key={c.id} className="border-t pt-3" style={{ borderColor: HAIRLINE }}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[13px] font-bold">{plainText(c.label, 40) || "기여"}</p>
                <p className="text-[20px] font-black tabular-nums" style={{ color: ACCENT }}>
                  {plainText(c.value, 30) || "—"}
                </p>
              </div>
              {c.caption ? (
                <p className="mt-1 text-[11px] font-medium" style={{ color: MUTED }}>
                  {plainText(c.caption, 100)}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <TextBlockList page={page} max={4} />
        )}
      </div>
    </div>
  );
}

function SkillsSlide({ page }: { page: PortfolioSitePage }) {
  const items = matrixItems(page);
  return (
    <div className="grid h-full grid-cols-[1fr_1.4fr] gap-12">
      <div className="flex flex-col justify-center">
        <h2 className="break-keep text-[40px] font-black leading-tight tracking-tight">
          {plainText(page.title, 80)}
        </h2>
        <p data-edit-field="narrative" className="mt-5 whitespace-pre-line break-keep text-[14px] font-medium leading-7" style={{ color: MUTED }}>
          {pageNarrative(page, 240)}
        </p>
      </div>
      <div className="flex flex-col justify-center">
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 border-t pt-4" style={{ borderColor: HAIRLINE }}>
          {items.slice(0, 12).map((item, i) => (
            <div key={`${item}-${i}`} className="border-l-2 pl-3" style={{ borderColor: ACCENT }}>
              <p className="text-[14px] font-bold leading-tight">{plainText(item, 30)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IndexSlide({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page).slice(0, 6);
  return (
    <div className="flex h-full flex-col gap-8">
      <h2 className="break-keep text-[40px] font-black leading-tight tracking-tight">
        {plainText(page.title, 80)}
      </h2>
      <div className="grid flex-1 grid-cols-3 gap-6">
        {items.map((item, i) => (
          <div key={`${item}-${i}`} className="flex flex-col gap-2 border-t-2 pt-4" style={{ borderColor: i === 0 ? ACCENT : HAIRLINE }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] tabular-nums" style={{ color: MUTED }}>
              {String(i + 1).padStart(2, "0")}
            </p>
            <p className="break-keep text-[16px] font-bold leading-tight">{plainText(item, 60)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseSlide({ page }: { page: PortfolioSitePage }) {
  const blocks = textBlocks(page).slice(0, 4);
  const flow = flowItems(page).slice(0, 4);
  return (
    <div className="grid h-full grid-cols-[1fr_1.3fr] gap-12">
      <div className="flex flex-col justify-center">
        <p data-edit-field="eyebrow" className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: ACCENT }}>
          {page.eyebrow || "CASE STUDY"}
        </p>
        <h2 className="mt-3 break-keep text-[36px] font-black leading-tight tracking-tight">
          {plainText(page.title, 80)}
        </h2>
        {page.subtitle ? (
          <p data-edit-field="subtitle" className="mt-3 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>
            {plainText(page.subtitle, 80)}
          </p>
        ) : null}
        <p data-edit-field="narrative" className="mt-6 whitespace-pre-line break-keep text-[13px] font-medium leading-7" style={{ color: TEXT }}>
          {pageNarrative(page, 240)}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-5">
        {flow.length ? (
          <div className="space-y-3">
            {flow.map((item, i) => (
              <div key={`${item}-${i}`} className="grid grid-cols-[40px_minmax(0,1fr)] items-baseline gap-3">
                <span className="text-[14px] font-black tabular-nums" style={{ color: ACCENT }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="break-keep text-[13px] font-medium leading-6">{plainText(item, 100)}</p>
              </div>
            ))}
          </div>
        ) : null}
        {blocks.length ? <div className="mt-2"><TextBlockList page={page} max={3} /></div> : null}
      </div>
    </div>
  );
}

function DetailSlide({ page }: { page: PortfolioSitePage }) {
  const callout = calloutBlocks(page)[0];
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-12">
      <div className="flex flex-col justify-center">
        <p data-edit-field="eyebrow" className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: MUTED }}>
          {page.eyebrow || "DETAIL"}
        </p>
        <h2 className="mt-3 break-keep text-[36px] font-black leading-tight tracking-tight">
          {plainText(page.title, 80)}
        </h2>
        <p data-edit-field="narrative" className="mt-6 whitespace-pre-line break-keep text-[13px] font-medium leading-7" style={{ color: TEXT }}>
          {pageNarrative(page, 260)}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-6">
        <TextBlockList page={page} max={3} />
        {callout ? (
          <div className="border-l-[4px] pl-5" style={{ borderColor: ACCENT }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ACCENT }}>
              {callout.label || "Key Point"}
            </p>
            <p className="mt-2 whitespace-pre-line break-keep text-[14px] font-medium leading-7" style={{ color: TEXT }}>
              {multilineText(callout.content, 240)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExperienceSlide({ page }: { page: PortfolioSitePage }) {
  return <CaseSlide page={page} />;
}

function RetrospectiveSlide({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page).slice(0, 4);
  return (
    <div className="grid h-full grid-cols-[0.8fr_1.2fr] gap-12">
      <div className="flex flex-col justify-center">
        <p data-edit-field="eyebrow" className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: MUTED }}>
          {page.eyebrow || "GROWTH"}
        </p>
        <h2 className="mt-3 break-keep text-[36px] font-black leading-tight tracking-tight">
          {plainText(page.title, 80)}
        </h2>
        <p data-edit-field="narrative" className="mt-6 whitespace-pre-line break-keep text-[13px] font-medium leading-7" style={{ color: MUTED }}>
          {pageNarrative(page, 240)}
        </p>
      </div>
      <div className="flex flex-col justify-center space-y-4">
        {items.map((item, i) => (
          <div key={`${item}-${i}`} className="grid grid-cols-[36px_minmax(0,1fr)] gap-4 border-t pt-3" style={{ borderColor: HAIRLINE }}>
            <span className="text-[14px] font-black tabular-nums" style={{ color: ACCENT }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="break-keep text-[14px] font-medium leading-6">{plainText(item, 120)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactSlide({ page }: { page: PortfolioSitePage }) {
  return (
    <div className="flex h-full items-center">
      <div className="max-w-[760px] border-l-[6px] pl-10" style={{ borderColor: ACCENT }}>
        <p data-edit-field="eyebrow" className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: ACCENT }}>
          {page.eyebrow || "CONTACT"}
        </p>
        <h1 className="mt-5 break-keep text-[48px] font-black leading-[1.05] tracking-tight">
          {plainText(page.title, 80)}
        </h1>
        <p data-edit-field="narrative" className="mt-7 whitespace-pre-line break-keep text-[16px] font-medium leading-8" style={{ color: TEXT }}>
          {pageNarrative(page, 280)}
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 공통 — 텍스트 블록 리스트
// ──────────────────────────────────────────────────────────────────────────────

function TextBlockList({ page, max = 4 }: { page: PortfolioSitePage; max?: number }) {
  const blocks = textBlocks(page).slice(0, max);
  if (!blocks.length) return null;
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={block.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-t pt-3" style={{ borderColor: HAIRLINE }}>
          <span className="text-[12px] font-black tabular-nums" style={{ color: ACCENT }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: MUTED }}>
              {getBlockLabel(block, `Point ${i + 1}`)}
            </p>
            <p className="mt-1 whitespace-pre-line break-keep text-[13px] font-medium leading-6">
              {blockText(block, 200)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
