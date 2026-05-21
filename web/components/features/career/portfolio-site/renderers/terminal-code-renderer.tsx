"use client";

/**
 * Terminal / Code — 다크 배경 + 그린 액센트, mono 폰트, ASCII 박스.
 * 개발자 너드 톤.
 *
 * 색: 다크 #0a0a0a 배경 + 그린 #00ff88 강조 + 흐린 그린 #2a4a3a
 * 폰트: JetBrains Mono / Fira Code (mono)
 * 정렬: 좌측
 * 강조: `$` `>` 프롬프트, ASCII 박스(═──), comment 색
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

const BG = "#0a0a0a";
const SURFACE = "#111111";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const ACCENT = "#00ff88";
const COMMENT = "#6a9955";
const STRING = "#ce9178";
const KEYWORD = "#569cd6";
const BORDER = "#1f1f1f";
const MONO = "'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', monospace";

export function TerminalCodeRenderer({
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
    const id = "dibut-terminal-font";
    if (window.document.getElementById(id)) return;
    const link = window.document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap";
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
        className="relative w-full border"
        style={{
          maxWidth: "min(1120px, calc(177.78vh - 220px))",
          borderColor: ACCENT,
          backgroundColor: BG,
          color: TEXT,
          fontFamily: MONO,
          boxShadow: `0 0 40px rgba(0,255,136,0.15)`,
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
      {/* 격자 배경 */}
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(0,255,136,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,136,0.4)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="absolute left-10 top-5 flex items-center gap-2">
        <span style={{ color: ACCENT }} className="text-[11px] font-bold">$</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: MUTED }}>
          ./{(page.eyebrow || "slide").toString().toLowerCase().replace(/\s+/g, "-")}
        </span>
      </div>
      <div className="relative h-full w-full overflow-hidden px-10 pb-6 pt-12">{children}</div>
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

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-bold" style={{ color: ACCENT }}>
      ${" "}
      <span style={{ color: TEXT }}>{children}</span>
    </span>
  );
}

function Comment({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: COMMENT }}>
      {"// "}
      {children}
    </span>
  );
}

function CoverSlide({ page }: { page: PortfolioSitePage }) {
  const metric = metricBlocks(page)[0];
  return (
    <div className="grid h-full grid-cols-[1.2fr_1fr] gap-8 overflow-hidden">
      <div className="flex flex-col justify-center overflow-hidden">
        <p className="text-[11px] font-medium" style={{ color: COMMENT }}>
          {`/* ${plainText(page.intent || "portfolio", 60)} */`}
        </p>
        <h1 className="mt-4 break-keep text-[48px] font-bold leading-[1.05]" style={{ color: ACCENT }}>
          {plainText(page.title, 80)}
        </h1>
        {page.subtitle ? (
          <p className="mt-4 max-w-[520px] break-keep text-[13px] font-medium leading-6">
            <span data-edit-field="subtitle">
              <Comment>{plainText(page.subtitle, 140)}</Comment>
            </span>
          </p>
        ) : null}
        <p className="mt-6 text-[12px]">
          <Prompt>./run portfolio.tsx</Prompt>
        </p>
      </div>
      <div className="flex flex-col justify-center overflow-hidden">
        {metric ? (
          <div className="border p-5" style={{ borderColor: ACCENT, backgroundColor: SURFACE }}>
            <p className="text-[10px]" style={{ color: COMMENT }}>
              {"// "}
              {plainText(metric.label, 30)}
            </p>
            <p className="mt-2 break-keep text-[56px] font-bold leading-none" style={{ color: ACCENT }}>
              {plainText(metric.value, 16)}
            </p>
            {metric.caption ? (
              <p className="mt-3 text-[12px] font-medium" style={{ color: TEXT }}>
                {">"} {plainText(metric.caption, 80)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="border p-5" style={{ borderColor: BORDER, backgroundColor: SURFACE }}>
            <p data-edit-field="narrative" className="whitespace-pre-line break-keep text-[13px] font-medium leading-7">
              {pageNarrative(page, 200)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSlide({ page }: { page: PortfolioSitePage }) {
  const emphasis = pageEmphasis(page).slice(0, 5);
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-8 overflow-hidden">
      <div className="flex flex-col justify-center overflow-hidden">
        <h2 className="break-keep text-[36px] font-bold leading-tight" style={{ color: ACCENT }}>
          {plainText(page.title, 60)}
        </h2>
        <p className="mt-3 text-[10px]" style={{ color: COMMENT }}>
          {"// readme.md"}
        </p>
        <p data-edit-field="narrative" className="mt-4 whitespace-pre-line break-keep text-[13px] font-medium leading-7">
          {pageNarrative(page, 240)}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-2 overflow-hidden">
        <p className="text-[11px]" style={{ color: COMMENT }}>
          {"// strengths.json"}
        </p>
        <div className="border p-4" style={{ borderColor: BORDER, backgroundColor: SURFACE }}>
          <p className="text-[12px]" style={{ color: KEYWORD }}>
            {"["}
          </p>
          {emphasis.map((item, i) => (
            <p key={`${item}-${i}`} className="ml-4 text-[12px] font-medium">
              <span style={{ color: STRING }}>&quot;{plainText(item, 60)}&quot;</span>
              {i < emphasis.length - 1 ? <span style={{ color: MUTED }}>,</span> : null}
            </p>
          ))}
          <p className="text-[12px]" style={{ color: KEYWORD }}>
            {"]"}
          </p>
        </div>
      </div>
    </div>
  );
}

function SkillsSlide({ page }: { page: PortfolioSitePage }) {
  const items = matrixItems(page).slice(0, 12);
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <h2 className="break-keep text-[32px] font-bold leading-tight" style={{ color: ACCENT }}>
        {plainText(page.title, 60)}
      </h2>
      <p className="text-[11px]" style={{ color: COMMENT }}>
        {"// $ npm list --depth=0"}
      </p>
      <div className="grid flex-1 grid-cols-3 gap-2 overflow-hidden">
        {items.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex items-center gap-2 border px-3 py-2"
            style={{ borderColor: BORDER, backgroundColor: SURFACE }}
          >
            <span style={{ color: ACCENT }} className="text-[11px] font-bold">
              ✓
            </span>
            <span className="break-keep text-[12px] font-medium">{plainText(item, 30)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndexSlide({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page).slice(0, 6);
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <h2 className="break-keep text-[32px] font-bold leading-tight" style={{ color: ACCENT }}>
        {plainText(page.title, 60)}
      </h2>
      <p className="text-[11px]" style={{ color: COMMENT }}>
        {"// ls -la projects/"}
      </p>
      <div className="flex flex-1 flex-col gap-1 overflow-hidden border p-4" style={{ borderColor: BORDER, backgroundColor: SURFACE }}>
        {items.map((item, i) => (
          <div key={`${item}-${i}`} className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 text-[12px] font-medium">
            <span className="tabular-nums" style={{ color: MUTED }}>
              [{String(i + 1).padStart(2, "0")}]
            </span>
            <span className="break-keep">
              <span style={{ color: ACCENT }}>{">"} </span>
              {plainText(item, 90)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseSlide({ page }: { page: PortfolioSitePage }) {
  const flow = flowItems(page).slice(0, 4);
  const callout = calloutBlocks(page)[0];
  const LABELS = ["problem", "role", "solution", "result"];
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div>
        <p data-edit-field="eyebrow" className="text-[11px]" style={{ color: COMMENT }}>
          {`// ${page.eyebrow || "case study"}`}
        </p>
        <h2 className="mt-1 break-keep text-[28px] font-bold leading-tight" style={{ color: ACCENT }}>
          {plainText(page.title, 70)}
        </h2>
        {page.subtitle ? (
          <p data-edit-field="subtitle" className="mt-1 text-[11px]" style={{ color: MUTED }}>
            {">"} {plainText(page.subtitle, 80)}
          </p>
        ) : null}
      </div>
      <div className="grid flex-1 grid-cols-4 gap-2 overflow-hidden">
        {flow.map((item, i) => (
          <div key={`${item}-${i}`} className="flex flex-col border p-3" style={{ borderColor: i === flow.length - 1 ? ACCENT : BORDER, backgroundColor: SURFACE }}>
            <p className="text-[10px]" style={{ color: COMMENT }}>
              {`// ${LABELS[i]}`}
            </p>
            <p className="mt-1 text-[16px] font-bold tabular-nums" style={{ color: i === flow.length - 1 ? ACCENT : TEXT }}>
              0{i + 1}.
            </p>
            <p className="mt-2 break-keep text-[12px] font-medium leading-5">{plainText(item, 100)}</p>
          </div>
        ))}
      </div>
      {callout ? (
        <div className="border-l-[4px] py-2 pl-4" style={{ borderColor: ACCENT, backgroundColor: SURFACE }}>
          <p className="text-[10px]" style={{ color: ACCENT }}>
            {">>> "}
            {callout.label || "key point"}
          </p>
          <p className="mt-1 whitespace-pre-line break-keep text-[12px] font-medium leading-6">
            {multilineText(callout.content, 180)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function DetailSlide({ page }: { page: PortfolioSitePage }) {
  const blocks = textBlocks(page).slice(0, 3);
  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-6 overflow-hidden">
      <div className="flex flex-col justify-center overflow-hidden">
        <p data-edit-field="eyebrow" className="text-[11px]" style={{ color: COMMENT }}>
          {`// ${page.eyebrow || "detail"}`}
        </p>
        <h2 className="mt-1 break-keep text-[28px] font-bold leading-tight" style={{ color: ACCENT }}>
          {plainText(page.title, 70)}
        </h2>
        <p data-edit-field="narrative" className="mt-4 whitespace-pre-line break-keep text-[13px] font-medium leading-7">
          {pageNarrative(page, 220)}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-2 overflow-hidden">
        {blocks.map((block, i) => (
          <div key={block.id} data-edit-block-id={block.id} className="border p-3" style={{ borderColor: BORDER, backgroundColor: SURFACE }}>
            <p className="text-[10px]" style={{ color: ACCENT }}>
              {`> ${getBlockLabel(block, `note ${i + 1}`)}`}
            </p>
            <p className="mt-1 whitespace-pre-line break-keep text-[12px] font-medium leading-6">
              {blockText(block, 160)}
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
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div>
        <p className="text-[11px]" style={{ color: COMMENT }}>
          {"// git log --oneline --reverse"}
        </p>
        <h2 className="mt-1 break-keep text-[30px] font-bold leading-tight" style={{ color: ACCENT }}>
          {plainText(page.title, 60)}
        </h2>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        {items.map((item, i) => (
          <div key={`${item}-${i}`} className="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-3 text-[12px]">
            <span className="font-mono tabular-nums" style={{ color: MUTED }}>
              {`${(i + 1).toString().padStart(7, "0")}`.slice(0, 7)}
            </span>
            <span className="break-keep">
              <span style={{ color: ACCENT }} className="font-bold">
                feat:{" "}
              </span>
              {plainText(item, 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactSlide({ page }: { page: PortfolioSitePage }) {
  return (
    <div className="flex h-full items-center overflow-hidden">
      <div>
        <p className="text-[11px]" style={{ color: COMMENT }}>
          {"// exit 0"}
        </p>
        <h1 className="mt-3 break-keep text-[56px] font-bold leading-[1.05]" style={{ color: ACCENT }}>
          {plainText(page.title, 60)}
        </h1>
        <p className="mt-2 text-[12px]" style={{ color: COMMENT }}>
          {">>> "}
          process complete
        </p>
        <p data-edit-field="narrative" className="mt-6 max-w-[600px] whitespace-pre-line break-keep text-[14px] font-medium leading-8">
          {pageNarrative(page, 260)}
        </p>
        <p className="mt-6 text-[13px]">
          <Prompt>echo &quot;thank you for reading&quot;</Prompt>
        </p>
      </div>
    </div>
  );
}
