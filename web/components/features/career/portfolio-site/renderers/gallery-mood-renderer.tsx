"use client";

/**
 * Gallery Mood — 모노톤 베이지 + 큰 serif + 시적인 여백.
 * 미술관 도록 / 전시 카탈로그 톤. 여백 자체가 강조.
 *
 * 색: 베이지 #f5f5f4 배경 + stone-700 #44403c 헤딩 + stone-400 #a8a29e accent
 * 폰트: 헤딩 serif (DM Serif Display), 본문 sans (Pretendard)
 * 정렬: 비대칭 좌/우 정렬, 여백을 디자인 요소로
 * 강조: 큰 숫자, 가는 라인, 작은 caption, italic
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
import { EditableText, useItemsSource, useItemsSourceOrFallback, usePatchActivePage } from "./editable-text";

const BG = "#f5f5f4";
const HEADING = "#292524";
const TEXT = "#44403c";
const MUTED = "#a8a29e";
const ACCENT = "#78716c";
const HAIRLINE = "#e7e5e4";
const SERIF = "'DM Serif Display', 'Cormorant Garamond', Georgia, serif";

export function GalleryMoodRenderer({
  document,
  className,
  activeIndex,
  onActiveIndexChange,
  hideHeader,
  hideThumbnails,
  disableKeyboardNav,
  includeHiddenPages,
  onPrintRequest,
}: RendererProps) {
  const pages = useMemo(
    () => (document.pages || []).filter((p) => includeHiddenPages || p.visible !== false),
    [document.pages, includeHiddenPages],
  );
  const [index, setIndex] = useRendererPageIndex({ activeIndex, onActiveIndexChange }, pages.length);
  const page = pages[Math.min(index, Math.max(0, pages.length - 1))];

  // DM Serif Display 폰트 동적 로드
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = "dibut-gallery-mood-font";
    if (window.document.getElementById(id)) return;
    const link = window.document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Cormorant+Garamond:ital,wght@0,300;0,500;1,300&display=swap";
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
      onPrintRequest={onPrintRequest}
    >
      <div
        className="relative w-full"
        style={{
          maxWidth: "min(1120px, calc(177.78vh - 220px))",
          backgroundColor: BG,
          color: TEXT,
          fontFamily: "Pretendard, system-ui, sans-serif",
          boxShadow: "0 30px 80px rgba(41, 37, 36, 0.08)",
          border: `1px solid ${HAIRLINE}`,
        }}
      >
        <div className="aspect-[16/9] w-full">
          <SlideShell page={page} index={index}>{renderSlide(page)}</SlideShell>
        </div>
      </div>
    </RendererShell>
  );
}

function SlideShell({ page, index, children }: { page: PortfolioSitePage; index: number; children: React.ReactNode }) {
  const patch = usePatchActivePage();
  return (
    <article
      className="relative h-full w-full overflow-hidden px-16 py-12"
      style={{ backgroundColor: BG }}
    >
      {/* 좌측 상단 라벨 */}
      <div className="absolute left-8 top-8 flex flex-col gap-1">
        <p className="text-[9px] font-medium uppercase tracking-[0.4em]" style={{ color: MUTED }}>
          Plate {String(index + 1).padStart(2, "0")}
        </p>
        {page.eyebrow ? (
          <p className="text-[10px] font-medium italic" style={{ color: ACCENT, fontFamily: SERIF }}>
            — <EditableText value={page.eyebrow} onChange={(v) => patch(["eyebrow"], v)} maxLength={30} placeholder="(선택)" fieldKey="eyebrow" />
          </p>
        ) : null}
      </div>
      {/* 우측 하단 시그니처 라인 */}
      <div className="absolute bottom-8 right-8 flex items-center gap-2">
        <span className="block h-px w-8" style={{ backgroundColor: MUTED }} />
        <p className="text-[9px] font-medium uppercase tracking-[0.4em]" style={{ color: MUTED }}>
          {page.type}
        </p>
      </div>
      <div className="relative h-full w-full pt-2">{children}</div>
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
  const patch = usePatchActivePage();
  const emphasis = useItemsSourceOrFallback(page, null, () => pageEmphasis(page)).slice(0, 3);
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.5em]" style={{ color: MUTED }}>
        <EditableText value={page.intent} onChange={(v) => patch(["intent"], v)} maxLength={60} placeholder="A Curated Portfolio" fieldKey="intent" />
      </p>
      <h1
        className="mt-10 max-w-[820px] break-keep text-[76px] font-normal leading-[1.02]"
        style={{ fontFamily: SERIF, color: HEADING }}
      >
        <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={60} placeholder="제목" fieldKey="title" />
      </h1>
      <span className="my-10 block h-px w-12" style={{ backgroundColor: HEADING }} />
      {page.subtitle ? (
        <p
          className="max-w-[540px] break-keep text-[15px] font-light italic leading-9"
          style={{ fontFamily: SERIF, color: TEXT }}
        >
          <EditableText value={page.subtitle} onChange={(v) => patch(["subtitle"], v)} maxLength={160} placeholder="부제 (선택)" fieldKey="subtitle" />
        </p>
      ) : null}
      {emphasis.length ? (
        <div className="mt-12 flex items-center gap-6">
          {emphasis.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="text-[10px] font-medium uppercase tracking-[0.32em]"
              style={{ color: ACCENT }}
            >
              <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={24} fieldKey={`item-${i}`} />
              {i < emphasis.length - 1 ? <span className="ml-6 select-none opacity-50">·</span> : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfileSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const narrative = pageNarrative(page, 360);
  const emphasis = useItemsSourceOrFallback(page, null, () => pageEmphasis(page)).slice(0, 4);
  return (
    <div className="grid h-full grid-cols-[1fr_1.2fr] gap-16">
      <div className="flex flex-col justify-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.4em]" style={{ color: ACCENT }}>
          Artist Statement
        </p>
        <h2
          className="mt-4 break-keep text-[52px] font-normal leading-[1.05]"
          style={{ fontFamily: SERIF, color: HEADING }}
        >
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={60} placeholder="제목" fieldKey="title" />
        </h2>
        <span className="mt-8 block h-px w-10" style={{ backgroundColor: ACCENT }} />
      </div>
      <div className="flex flex-col justify-center pl-2">
        <p
          className="whitespace-pre-line break-keep text-[14px] font-light leading-[2]"
          style={{ color: TEXT }}
        >
          {narrative}
        </p>
        {emphasis.length ? (
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5" style={{ borderColor: HAIRLINE }}>
            {emphasis.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="text-[12px] italic"
                style={{ fontFamily: SERIF, color: ACCENT }}
              >
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={36} fieldKey={`item-${i}`} />
                {i < emphasis.length - 1 ? <span className="ml-5 select-none opacity-40">/</span> : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SkillsSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const items = useItemsSourceOrFallback(page, "matrix", () => matrixItems(page)).slice(0, 10);
  return (
    <div className="flex h-full flex-col gap-10">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.4em]" style={{ color: ACCENT }}>
          Medium & Craft
        </p>
        <h2 className="mt-3 break-keep text-[44px] font-normal" style={{ fontFamily: SERIF, color: HEADING }}>
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={60} placeholder="제목" fieldKey="title" />
        </h2>
      </div>
      <div className="flex flex-1 items-center">
        <div className="grid w-full grid-cols-2 gap-x-12 gap-y-3">
          {items.map((item, i) => (
            <div
              key={`${item}-${i}`}
              className="flex items-baseline gap-4 border-b pb-3"
              style={{ borderColor: HAIRLINE }}
            >
              <span
                className="text-[14px] font-normal italic tabular-nums"
                style={{ fontFamily: SERIF, color: ACCENT }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="flex-1 break-keep text-[16px] font-light" style={{ fontFamily: SERIF, color: HEADING }}>
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={50} fieldKey={`item-${i}`} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IndexSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const items = useItemsSourceOrFallback(page, "timeline", () => timelineItems(page)).slice(0, 5);
  return (
    <div className="grid h-full grid-cols-[0.7fr_1.3fr] gap-16">
      <div className="flex flex-col justify-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.4em]" style={{ color: ACCENT }}>
          Catalogue
        </p>
        <h2 className="mt-3 break-keep text-[48px] font-normal leading-[1.05]" style={{ fontFamily: SERIF, color: HEADING }}>
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={50} placeholder="제목" fieldKey="title" />
        </h2>
        <span className="mt-8 block h-px w-10" style={{ backgroundColor: ACCENT }} />
      </div>
      <div className="flex flex-col justify-center">
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={`${item}-${i}`} className="grid grid-cols-[60px_minmax(0,1fr)_90px] items-baseline gap-5 border-b pb-3" style={{ borderColor: HAIRLINE }}>
              <span className="text-[28px] font-normal italic tabular-nums" style={{ fontFamily: SERIF, color: ACCENT }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="break-keep text-[16px] font-light leading-7" style={{ fontFamily: SERIF, color: HEADING }}>
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={100} fieldKey={`item-${i}`} />
              </p>
              <span className="text-right text-[9px] font-medium uppercase tracking-[0.32em] tabular-nums" style={{ color: MUTED }}>
                pl. {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CaseSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const callout = calloutBlocks(page)[0];
  const blocks = textBlocks(page).slice(0, 2);
  return (
    <div className="grid h-full grid-cols-[1fr_1.3fr] gap-16">
      <div className="flex flex-col justify-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.4em]" style={{ color: ACCENT }}>
          <EditableText value={page.eyebrow} onChange={(v) => patch(["eyebrow"], v)} maxLength={60} placeholder="Work" fieldKey="eyebrow" />
        </p>
        <h2 className="mt-3 break-keep text-[40px] font-normal leading-[1.08]" style={{ fontFamily: SERIF, color: HEADING }}>
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={70} placeholder="제목" fieldKey="title" />
        </h2>
        {page.subtitle ? (
          <p className="mt-5 break-keep text-[13px] font-light italic" style={{ color: MUTED, fontFamily: SERIF }}>
            <EditableText value={page.subtitle} onChange={(v) => patch(["subtitle"], v)} maxLength={90} placeholder="부제 (선택)" fieldKey="subtitle" />
          </p>
        ) : null}
        <span className="mt-7 block h-px w-10" style={{ backgroundColor: ACCENT }} />
        <p className="mt-7 whitespace-pre-line break-keep text-[13px] font-light leading-[1.95]" style={{ color: TEXT }}>
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={240} multiline placeholder="본문" fieldKey="narrative" />
        </p>
      </div>
      <div className="flex flex-col justify-center gap-6">
        {blocks.map((block, i) => (
          <div key={block.id} className="border-l pl-5" style={{ borderColor: HAIRLINE }}>
            <p className="text-[9px] font-medium uppercase tracking-[0.4em]" style={{ color: ACCENT }}>
              No. {String(i + 1).padStart(2, "0")} — <EditableText value={block.label} onChange={(v) => patch(["blocks", block.id, "label"], v)} maxLength={40} placeholder="Note" fieldKey={`block-${block.id}-label`} />
            </p>
            <p className="mt-3 whitespace-pre-line break-keep text-[13px] font-light leading-[1.95]" style={{ color: TEXT }}>
              <EditableText value={block.content} onChange={(v) => patch(["blocks", block.id, "content"], v)} maxLength={200} multiline placeholder="본문" fieldKey={`block-${block.id}-content`} />
            </p>
          </div>
        ))}
        {callout ? (
          <div className="border-l pl-5" style={{ borderColor: ACCENT }}>
            <p className="text-[9px] font-medium uppercase tracking-[0.4em]" style={{ color: ACCENT }}>
              In quotation
            </p>
            <p className="mt-2 break-keep text-[16px] font-light italic leading-9" style={{ fontFamily: SERIF, color: HEADING }}>
              <EditableText value={callout.content} onChange={(v) => patch(["blocks", callout.id, "content"], v)} maxLength={160} multiline placeholder="본문" fieldKey={`block-${callout.id}-content`} />
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const metric = metricBlocks(page)[0];
  const flow = useItemsSourceOrFallback(page, "flow", () => flowItems(page)).slice(0, 4);
  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] gap-14">
      <div className="flex flex-col justify-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.4em]" style={{ color: ACCENT }}>
          <EditableText value={page.eyebrow} onChange={(v) => patch(["eyebrow"], v)} maxLength={60} placeholder="Detail" fieldKey="eyebrow" />
        </p>
        <h2 className="mt-3 break-keep text-[38px] font-normal leading-[1.08]" style={{ fontFamily: SERIF, color: HEADING }}>
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={70} placeholder="제목" fieldKey="title" />
        </h2>
        <span className="mt-6 block h-px w-10" style={{ backgroundColor: ACCENT }} />
        <p className="mt-6 whitespace-pre-line break-keep text-[13.5px] font-light leading-[2]" style={{ color: TEXT }}>
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={280} multiline placeholder="본문" fieldKey="narrative" />
        </p>
      </div>
      <div className="flex flex-col justify-center gap-9">
        {metric ? (
          <div className="text-left">
            <p
              className="text-[88px] font-normal leading-none"
              style={{ fontFamily: SERIF, color: HEADING }}
            >
              <EditableText value={metric.value} onChange={(v) => patch(["blocks", metric.id, "value"], v)} maxLength={16} placeholder="값" fieldKey={`block-${metric.id}-value`} />
            </p>
            <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.4em]" style={{ color: ACCENT }}>
              <EditableText value={metric.label} onChange={(v) => patch(["blocks", metric.id, "label"], v)} maxLength={28} placeholder="라벨" fieldKey={`block-${metric.id}-label`} />
            </p>
            {metric.caption ? (
              <p className="mt-3 max-w-[280px] break-keep text-[12px] font-light italic leading-7" style={{ color: MUTED, fontFamily: SERIF }}>
                <EditableText value={metric.caption} onChange={(v) => patch(["blocks", metric.id, "caption"], v)} maxLength={110} placeholder="설명 (선택)" fieldKey={`block-${metric.id}-caption`} />
              </p>
            ) : null}
          </div>
        ) : null}
        {flow.length ? (
          <div className="border-t pt-5" style={{ borderColor: HAIRLINE }}>
            {flow.map((item, i) => (
              <div key={`${item}-${i}`} className="mb-2 grid grid-cols-[40px_minmax(0,1fr)] items-baseline gap-3">
                <span className="text-[12px] font-normal italic tabular-nums" style={{ fontFamily: SERIF, color: ACCENT }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="break-keep text-[13px] font-light leading-7" style={{ color: TEXT }}>
                  <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={110} fieldKey={`item-${i}`} />
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
  const patch = usePatchActivePage();
  const items = useItemsSourceOrFallback(page, "timeline", () => timelineItems(page)).slice(0, 4);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.5em]" style={{ color: ACCENT }}>
        — Notes on Growth —
      </p>
      <h2 className="max-w-[780px] break-keep text-[46px] font-normal leading-[1.08]" style={{ fontFamily: SERIF, color: HEADING }}>
        <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={60} placeholder="제목" fieldKey="title" />
      </h2>
      <p className="max-w-[580px] whitespace-pre-line break-keep text-[15px] font-light italic leading-9" style={{ color: TEXT, fontFamily: SERIF }}>
        <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={220} multiline placeholder="본문" fieldKey="narrative" />
      </p>
      {items.length ? (
        <div className="mt-2 grid w-full max-w-[820px] grid-cols-4 gap-6 border-t pt-6" style={{ borderColor: HAIRLINE }}>
          {items.map((item, i) => (
            <div key={`${item}-${i}`} className="text-left">
              <p className="text-[26px] font-normal italic tabular-nums" style={{ fontFamily: SERIF, color: ACCENT }}>
                {String(i + 1).padStart(2, "0")}
              </p>
              <p className="mt-2 break-keep text-[12px] font-light leading-6" style={{ color: TEXT }}>
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={70} fieldKey={`item-${i}`} />
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContactSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.5em]" style={{ color: ACCENT }}>
        — End of Catalogue —
      </p>
      <h1 className="mt-10 max-w-[760px] break-keep text-[64px] font-normal leading-[1.05]" style={{ fontFamily: SERIF, color: HEADING }}>
        <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={60} placeholder="제목" fieldKey="title" />
      </h1>
      <span className="my-10 block h-px w-16" style={{ backgroundColor: HEADING }} />
      <p className="max-w-[560px] whitespace-pre-line break-keep text-[15px] font-light italic leading-9" style={{ color: TEXT, fontFamily: SERIF }}>
        <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={240} multiline placeholder="본문" fieldKey="narrative" />
      </p>
    </div>
  );
}

function _silenced(_a: unknown, _b: unknown) {
  // contributionBlocks 미사용 회피 (필요 시 활용)
  return contributionBlocks;
}
void _silenced;
