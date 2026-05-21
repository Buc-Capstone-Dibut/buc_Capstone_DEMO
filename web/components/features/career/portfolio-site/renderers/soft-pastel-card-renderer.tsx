"use client";

/**
 * Soft Pastel Card — 파스텔 그라데이션 배경, 둥근 카드 위주.
 * sans 부드러운 색감. 신입·주니어 친근 톤.
 *
 * 색: 라일락 #f5f3ff 배경 + 핑크 #f472b6 강조 + 보라 #7c3aed primary
 * 폰트: Pretendard / Inter (sans, 부드러운 weight)
 * 정렬: 좌측+중앙 혼합
 * 강조: 둥근 모서리 카드, 큰 보더 반경, soft shadow, 그라데이션 배경
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
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

const BG_GRADIENT = "linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 50%, #ecfeff 100%)";
const CARD_BG = "rgba(255,255,255,0.7)";
const TEXT = "#1e1b4b";
const MUTED = "#6b7280";
const PRIMARY = "#7c3aed";
const ACCENT = "#f472b6";
const HAIRLINE = "#e9d5ff";
const SOFT_SHADOW = "0 8px 32px rgba(124,58,237,0.08)";
const SOFT_SHADOW_HOVER = "0 12px 40px rgba(124,58,237,0.12)";
const ROUNDED = "rounded-3xl";

export function SoftPastelCardRenderer({
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
        className={cn("relative w-full overflow-hidden", ROUNDED)}
        style={{
          maxWidth: "min(1120px, calc(177.78vh - 220px))",
          background: BG_GRADIENT,
          color: TEXT,
          fontFamily: "Pretendard, Inter, system-ui, sans-serif",
          boxShadow: SOFT_SHADOW_HOVER,
          border: `1px solid ${HAIRLINE}`,
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
    <article className="relative h-full w-full overflow-hidden" style={{ background: BG_GRADIENT }}>
      {/* 부드러운 원 장식 */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30" style={{ backgroundColor: ACCENT }} />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-25" style={{ backgroundColor: PRIMARY }} />
      <div className="absolute left-10 top-6 flex items-center gap-2">
        <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: PRIMARY }}>
          {page.eyebrow || "Portfolio"}
        </span>
      </div>
      <div className="relative h-full w-full overflow-hidden px-10 pb-6 pt-14">{children}</div>
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

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(`${ROUNDED} overflow-hidden p-5`, className)}
      style={{ backgroundColor: CARD_BG, backdropFilter: "blur(8px)", boxShadow: SOFT_SHADOW }}
    >
      {children}
    </div>
  );
}

function CoverSlide({ page }: { page: PortfolioSitePage }) {
  const metric = metricBlocks(page)[0];
  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] gap-8 overflow-hidden">
      <div className="flex flex-col justify-center overflow-hidden">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: ACCENT }}>
          ✦ {plainText(page.intent || "Portfolio", 60)}
        </p>
        <h1 className="mt-4 break-keep text-[52px] font-black leading-[1.05] tracking-tight" style={{ color: TEXT }}>
          {plainText(page.title, 80)}
        </h1>
        {page.subtitle ? (
          <p className="mt-4 max-w-[500px] break-keep text-[15px] font-semibold leading-7" style={{ color: MUTED }}>
            {plainText(page.subtitle, 140)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col justify-center overflow-hidden">
        {metric ? (
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: PRIMARY }}>
              {plainText(metric.label, 30)}
            </p>
            <p className="mt-2 break-keep text-[64px] font-black leading-none" style={{ color: PRIMARY }}>
              {plainText(metric.value, 16)}
            </p>
            {metric.caption ? (
              <p className="mt-3 text-[12px] font-semibold leading-6" style={{ color: MUTED }}>
                {plainText(metric.caption, 80)}
              </p>
            ) : null}
          </Card>
        ) : (
          <Card>
            <p className="whitespace-pre-line break-keep text-[14px] font-semibold leading-7" style={{ color: TEXT }}>
              {pageNarrative(page, 200)}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProfileSlide({ page }: { page: PortfolioSitePage }) {
  const contributions = contributionBlocks(page).slice(0, 3);
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-8 overflow-hidden">
      <Card className="flex flex-col justify-center">
        <h2 className="break-keep text-[36px] font-black leading-tight" style={{ color: TEXT }}>
          {plainText(page.title, 60)}
        </h2>
        <p className="mt-4 whitespace-pre-line break-keep text-[13px] font-semibold leading-7" style={{ color: TEXT }}>
          {pageNarrative(page, 240)}
        </p>
      </Card>
      <div className="flex flex-col justify-center gap-3 overflow-hidden">
        {contributions.map((c, i) => (
          <Card key={c.id}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-bold" style={{ color: TEXT }}>
                {plainText(c.label, 30) || "강점"}
              </p>
              <p
                className="text-[22px] font-black tabular-nums"
                style={{ color: i % 2 === 0 ? PRIMARY : ACCENT }}
              >
                {plainText(c.value, 20)}
              </p>
            </div>
            {c.caption ? (
              <p className="mt-1 text-[11px] font-semibold" style={{ color: MUTED }}>
                {plainText(c.caption, 100)}
              </p>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

function SkillsSlide({ page }: { page: PortfolioSitePage }) {
  const items = matrixItems(page).slice(0, 12);
  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <div className="flex items-baseline justify-between">
        <h2 className="break-keep text-[36px] font-black leading-tight" style={{ color: TEXT }}>
          {plainText(page.title, 60)}
        </h2>
        <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: PRIMARY }}>
          {items.length} skills
        </p>
      </div>
      <Card className="flex-1">
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="rounded-full px-4 py-2 text-[13px] font-bold"
              style={{
                backgroundColor: i % 3 === 0 ? PRIMARY : i % 3 === 1 ? ACCENT : HAIRLINE,
                color: i % 3 === 2 ? PRIMARY : "white",
              }}
            >
              {plainText(item, 30)}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

function IndexSlide({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page).slice(0, 6);
  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <h2 className="break-keep text-[36px] font-black leading-tight" style={{ color: TEXT }}>
        {plainText(page.title, 60)}
      </h2>
      <div className="grid flex-1 grid-cols-3 gap-3 overflow-hidden">
        {items.map((item, i) => (
          <Card key={`${item}-${i}`} className="flex flex-col items-start">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-black"
              style={{
                backgroundColor: i % 2 === 0 ? PRIMARY : ACCENT,
                color: "white",
              }}
            >
              {i + 1}
            </span>
            <p className="mt-3 break-keep text-[13px] font-bold leading-6" style={{ color: TEXT }}>
              {plainText(item, 80)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CaseSlide({ page }: { page: PortfolioSitePage }) {
  const flow = flowItems(page).slice(0, 4);
  const callout = calloutBlocks(page)[0];
  return (
    <div className="grid h-full grid-cols-[1fr_1.3fr] gap-6 overflow-hidden">
      <Card className="flex flex-col justify-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ACCENT }}>
          ✦ {page.eyebrow || "Case Study"}
        </p>
        <h2 className="mt-3 break-keep text-[28px] font-black leading-tight" style={{ color: TEXT }}>
          {plainText(page.title, 70)}
        </h2>
        {page.subtitle ? (
          <p className="mt-2 text-[11px] font-bold" style={{ color: MUTED }}>
            {plainText(page.subtitle, 80)}
          </p>
        ) : null}
        <p className="mt-4 whitespace-pre-line break-keep text-[12.5px] font-semibold leading-6" style={{ color: TEXT }}>
          {pageNarrative(page, 200)}
        </p>
      </Card>
      <div className="flex flex-col justify-center gap-3 overflow-hidden">
        <Card>
          <div className="space-y-3">
            {flow.map((item, i) => (
              <div key={`${item}-${i}`} className="grid grid-cols-[32px_minmax(0,1fr)] items-baseline gap-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black"
                  style={{
                    backgroundColor: i === flow.length - 1 ? PRIMARY : HAIRLINE,
                    color: i === flow.length - 1 ? "white" : PRIMARY,
                  }}
                >
                  {i + 1}
                </span>
                <p className="break-keep text-[12px] font-semibold leading-6" style={{ color: TEXT }}>
                  {plainText(item, 100)}
                </p>
              </div>
            ))}
          </div>
        </Card>
        {callout ? (
          <div
            className={`${ROUNDED} p-4`}
            style={{ backgroundColor: `${ACCENT}1f`, border: `2px solid ${ACCENT}` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
              ✦ {callout.label || "Key Point"}
            </p>
            <p className="mt-1 whitespace-pre-line break-keep text-[12px] font-bold leading-6" style={{ color: TEXT }}>
              {multilineText(callout.content, 180)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailSlide({ page }: { page: PortfolioSitePage }) {
  const blocks = textBlocks(page).slice(0, 3);
  const metric = metricBlocks(page)[0];
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-6 overflow-hidden">
      <div className="flex flex-col justify-center gap-4 overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ACCENT }}>
          ✦ {page.eyebrow || "Detail"}
        </p>
        <h2 className="break-keep text-[32px] font-black leading-tight" style={{ color: TEXT }}>
          {plainText(page.title, 70)}
        </h2>
        <p className="whitespace-pre-line break-keep text-[13px] font-semibold leading-7" style={{ color: TEXT }}>
          {pageNarrative(page, 240)}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-3 overflow-hidden">
        {metric ? (
          <Card className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: PRIMARY }}>
              {plainText(metric.label, 30)}
            </p>
            <p className="mt-2 text-[56px] font-black leading-none" style={{ color: PRIMARY }}>
              {plainText(metric.value, 18)}
            </p>
            {metric.caption ? (
              <p className="mt-2 text-[12px] font-semibold" style={{ color: MUTED }}>
                {plainText(metric.caption, 80)}
              </p>
            ) : null}
          </Card>
        ) : null}
        {blocks.map((block, i) => (
          <Card key={block.id}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: i % 2 === 0 ? PRIMARY : ACCENT }}>
              ✦ {getBlockLabel(block, `Point ${i + 1}`)}
            </p>
            <p className="mt-1 whitespace-pre-line break-keep text-[12px] font-semibold leading-6" style={{ color: TEXT }}>
              {blockText(block, 160)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RetrospectiveSlide({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page).slice(0, 4);
  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: PRIMARY }}>
          ✦ Growth Notes
        </p>
        <h2 className="mt-2 break-keep text-[32px] font-black leading-tight" style={{ color: TEXT }}>
          {plainText(page.title, 60)}
        </h2>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 overflow-hidden">
        {items.map((item, i) => (
          <Card key={`${item}-${i}`}>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-black"
              style={{
                backgroundColor: i % 2 === 0 ? PRIMARY : ACCENT,
                color: "white",
              }}
            >
              {i + 1}
            </span>
            <p className="mt-3 break-keep text-[13px] font-bold leading-6" style={{ color: TEXT }}>
              {plainText(item, 100)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ContactSlide({ page }: { page: PortfolioSitePage }) {
  return (
    <div className="flex h-full items-center justify-center overflow-hidden">
      <Card className="max-w-[680px] text-center">
        <p className="text-[12px] font-bold uppercase tracking-[0.28em]" style={{ color: ACCENT }}>
          ✦ Thank You ✦
        </p>
        <h1 className="mt-5 break-keep text-[52px] font-black leading-[1.05]" style={{ color: TEXT }}>
          {plainText(page.title, 60)}
        </h1>
        <div className="my-5 flex justify-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIMARY }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: HAIRLINE }} />
        </div>
        <p className="whitespace-pre-line break-keep text-[14px] font-semibold leading-8" style={{ color: TEXT }}>
          {pageNarrative(page, 240)}
        </p>
      </Card>
    </div>
  );
}
