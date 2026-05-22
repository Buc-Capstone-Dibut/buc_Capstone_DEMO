"use client";

/**
 * Notion Document — 깔끔한 회색배경 + 흰 카드, 미니멀 sans.
 * 일반 비즈니스 톤. Notion 문서 느낌.
 *
 * 색: 흰 #ffffff 카드 + 회색 #f9fafb 배경 + sky #0ea5e9 강조
 * 폰트: Pretendard / Inter (sans, 회사 문서 톤)
 * 정렬: 좌측 (문서 형식)
 * 강조: 작은 강조색, 회색 caption, callout 박스, bullet list, table
 */

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
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

const BG = "#f9fafb";
const CARD = "#ffffff";
const TEXT = "#1f2937";
const MUTED = "#6b7280";
const HEADING = "#111827";
const ACCENT = "#0ea5e9";
const ACCENT_BG = "#e0f2fe";
const HAIRLINE = "#e5e7eb";

export function NotionDocumentRenderer({
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
        className="relative w-full overflow-hidden rounded-lg border bg-white shadow-md"
        style={{
          maxWidth: "min(1120px, calc(177.78vh - 220px))",
          borderColor: HAIRLINE,
          backgroundColor: CARD,
          color: TEXT,
          fontFamily: "Pretendard, Inter, system-ui, sans-serif",
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
  const patch = usePatchActivePage();
  return (
    <article className="relative h-full w-full overflow-hidden" style={{ backgroundColor: CARD }}>
      <div className="absolute left-12 top-5 flex items-center gap-2 text-[11px] font-medium" style={{ color: MUTED }}>
        <span className="rounded bg-gray-100 px-2 py-0.5"><EditableText value={page.eyebrow} onChange={(v) => patch(["eyebrow"], v)} maxLength={60} placeholder="Page" fieldKey="eyebrow" /></span>
        <span>·</span>
        <span>최종 수정: 방금</span>
      </div>
      <div className="relative h-full w-full overflow-hidden px-12 pb-6 pt-12">{children}</div>
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

function PageTitle({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div>
      <div className="flex items-baseline gap-2 text-[11px] font-medium" style={{ color: MUTED }}>
        <span>📄</span>
        <span><EditableText value={page.intent || page.eyebrow} onChange={(v) => patch(["intent"], v)} maxLength={60} placeholder="Page" fieldKey="intent" /></span>
      </div>
      <h1 className="mt-3 break-keep text-[36px] font-bold leading-tight" style={{ color: HEADING }}>
        <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={80} placeholder="제목" fieldKey="title" />
      </h1>
      {page.subtitle ? (
        <p className="mt-2 break-keep text-[13px] font-medium" style={{ color: MUTED }}>
          <EditableText value={page.subtitle} onChange={(v) => patch(["subtitle"], v)} maxLength={120} placeholder="부제 (선택)" fieldKey="subtitle" />
        </p>
      ) : null}
    </div>
  );
}

function CoverSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const metric = metricBlocks(page)[0];
  return (
    <div className="grid h-full grid-cols-[1.4fr_1fr] gap-8 overflow-hidden">
      <div className="flex flex-col justify-center overflow-hidden">
        <PageTitle page={page} />
        <p className="mt-5 whitespace-pre-line break-keep text-[14px] font-medium leading-7" style={{ color: TEXT }}>
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={220} multiline placeholder="본문" fieldKey="narrative" />
        </p>
      </div>
      <div className="flex flex-col justify-center overflow-hidden">
        {metric ? (
          <div className="rounded-lg border p-5" style={{ borderColor: HAIRLINE, backgroundColor: BG }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
              <EditableText value={metric.label} onChange={(v) => patch(["blocks", metric.id, "label"], v)} maxLength={30} placeholder="라벨" fieldKey={`block-${metric.id}-label`} />
            </p>
            <p className="mt-2 break-keep text-[48px] font-bold leading-none" style={{ color: ACCENT }}>
              <EditableText value={metric.value} onChange={(v) => patch(["blocks", metric.id, "value"], v)} maxLength={16} placeholder="값" fieldKey={`block-${metric.id}-value`} />
            </p>
            {metric.caption ? (
              <p className="mt-3 text-[12px] font-medium leading-6" style={{ color: TEXT }}>
                <EditableText value={metric.caption} onChange={(v) => patch(["blocks", metric.id, "caption"], v)} maxLength={80} placeholder="설명 (선택)" fieldKey={`block-${metric.id}-caption`} />
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProfileSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const contributions = contributionBlocks(page).slice(0, 3);
  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <PageTitle page={page} />
      <div className="grid grid-cols-[1.3fr_1fr] gap-6 overflow-hidden">
        <div className="overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
            ABOUT
          </p>
          <p className="mt-2 whitespace-pre-line break-keep text-[13px] font-medium leading-7" style={{ color: TEXT }}>
            <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={240} multiline placeholder="본문" fieldKey="narrative" />
          </p>
        </div>
        {contributions.length ? (
          <div className="overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
              STRENGTHS
            </p>
            <table className="mt-2 w-full border-collapse text-[12px]">
              <tbody>
                {contributions.map((c) => (
                  <tr key={c.id} className="border-b" style={{ borderColor: HAIRLINE }}>
                    <td className="py-2 pr-3 font-bold" style={{ color: HEADING }}>
                      <EditableText value={c.label} onChange={(v) => patch(["blocks", c.id, "label"], v)} maxLength={30} placeholder="라벨" fieldKey={`block-${c.id}-label`} />
                    </td>
                    <td className="py-2 text-right font-bold tabular-nums" style={{ color: ACCENT }}>
                      <EditableText value={c.value} onChange={(v) => patch(["blocks", c.id, "value"], v)} maxLength={20} placeholder="값" fieldKey={`block-${c.id}-value`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SkillsSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const items = useItemsSourceOrFallback(page, "matrix", () => matrixItems(page)).slice(0, 12);
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageTitle page={page} />
      <div className="overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
          TECH STACK
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="rounded-md border px-2.5 py-1 text-[12px] font-medium"
              style={{
                borderColor: HAIRLINE,
                backgroundColor: i % 3 === 0 ? ACCENT_BG : BG,
                color: i % 3 === 0 ? ACCENT : TEXT,
              }}
            >
              <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={30} fieldKey={`item-${i}`} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function IndexSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const items = useItemsSourceOrFallback(page, "timeline", () => timelineItems(page)).slice(0, 6);
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageTitle page={page} />
      <div className="overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
          CONTENTS
        </p>
        <ul className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="flex items-start gap-3 text-[13px]">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold tabular-nums" style={{ backgroundColor: ACCENT_BG, color: ACCENT }}>
                {i + 1}
              </span>
              <span className="break-keep font-medium" style={{ color: TEXT }}>
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={100} fieldKey={`item-${i}`} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CaseSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const flow = useItemsSourceOrFallback(page, "flow", () => flowItems(page)).slice(0, 4);
  const callout = calloutBlocks(page)[0];
  const LABELS = ["문제", "역할", "해결", "결과"];
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageTitle page={page} />
      <div className="overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
          OVERVIEW
        </p>
        <table className="mt-2 w-full border-collapse text-[12px]">
          <tbody>
            {flow.map((item, i) => (
              <tr key={`${item}-${i}`} className="border-b" style={{ borderColor: HAIRLINE }}>
                <td className="w-20 py-2 pr-3 align-top text-[11px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                  {LABELS[i] || `STEP ${i + 1}`}
                </td>
                <td className="py-2 align-top">
                  <p className="break-keep font-medium leading-6" style={{ color: TEXT }}>
                    <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={120} fieldKey={`item-${i}`} />
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {callout ? (
        <div className="rounded-md border-l-4 p-3" style={{ borderColor: ACCENT, backgroundColor: ACCENT_BG }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
            💡 {callout.label || "Key Point"}
          </p>
          <p className="mt-1 whitespace-pre-line break-keep text-[12px] font-medium leading-6" style={{ color: HEADING }}>
            <EditableText value={callout.content} onChange={(v) => patch(["blocks", callout.id, "content"], v)} maxLength={180} multiline placeholder="본문" fieldKey={`block-${callout.id}-content`} />
          </p>
        </div>
      ) : null}
    </div>
  );
}

function DetailSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const blocks = textBlocks(page).slice(0, 3);
  const metric = metricBlocks(page)[0];
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageTitle page={page} />
      <div className="grid grid-cols-[1.3fr_1fr] gap-5 overflow-hidden">
        <div className="overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
            DETAIL
          </p>
          <p className="mt-2 whitespace-pre-line break-keep text-[13px] font-medium leading-7" style={{ color: TEXT }}>
            <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={240} multiline placeholder="본문" fieldKey="narrative" />
          </p>
          {blocks.length ? (
            <ul className="mt-3 space-y-1.5">
              {blocks.map((block) => (
                <li key={block.id} className="flex items-start gap-2 text-[12px]">
                  <span style={{ color: ACCENT }}>•</span>
                  <span className="break-keep font-medium" style={{ color: TEXT }}>
                    <strong style={{ color: HEADING }}><EditableText value={block.label} onChange={(v) => patch(["blocks", block.id, "label"], v)} maxLength={40} placeholder="Note" fieldKey={`block-${block.id}-label`} />:</strong>{" "}
                    <EditableText value={block.content} onChange={(v) => patch(["blocks", block.id, "content"], v)} maxLength={140} multiline placeholder="본문" fieldKey={`block-${block.id}-content`} />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {metric ? (
          <div className="overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
              METRIC
            </p>
            <div className="mt-2 rounded-lg border p-4" style={{ borderColor: HAIRLINE, backgroundColor: BG }}>
              <p className="text-[11px] font-medium" style={{ color: MUTED }}>
                <EditableText value={metric.label} onChange={(v) => patch(["blocks", metric.id, "label"], v)} maxLength={30} placeholder="라벨" fieldKey={`block-${metric.id}-label`} />
              </p>
              <p className="mt-1 text-[40px] font-bold leading-none tabular-nums" style={{ color: ACCENT }}>
                <EditableText value={metric.value} onChange={(v) => patch(["blocks", metric.id, "value"], v)} maxLength={16} placeholder="값" fieldKey={`block-${metric.id}-value`} />
              </p>
              {metric.caption ? (
                <p className="mt-2 text-[11px] font-medium" style={{ color: TEXT }}>
                  <EditableText value={metric.caption} onChange={(v) => patch(["blocks", metric.id, "caption"], v)} maxLength={80} placeholder="설명 (선택)" fieldKey={`block-${metric.id}-caption`} />
                </p>
              ) : null}
            </div>
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
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <PageTitle page={page} />
      <div className="overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
          GROWTH TIMELINE
        </p>
        <ol className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="flex items-start gap-3 rounded-md border p-2.5" style={{ borderColor: HAIRLINE }}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ backgroundColor: ACCENT_BG, color: ACCENT }}>
                {i + 1}
              </span>
              <p className="break-keep text-[13px] font-medium leading-6" style={{ color: TEXT }}>
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={130} fieldKey={`item-${i}`} />
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ContactSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div className="flex h-full items-center overflow-hidden">
      <div className="mx-auto max-w-[680px]">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>
          📬 CONTACT
        </p>
        <h1 className="mt-3 break-keep text-[44px] font-bold leading-tight" style={{ color: HEADING }}>
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={60} placeholder="제목" fieldKey="title" />
        </h1>
        <div className="my-5 h-px w-full" style={{ backgroundColor: HAIRLINE }} />
        <p className="whitespace-pre-line break-keep text-[14px] font-medium leading-8" style={{ color: TEXT }}>
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={280} multiline placeholder="본문" fieldKey="narrative" />
        </p>
        <div className="mt-5 flex items-center gap-2 text-[12px]" style={{ color: ACCENT }}>
          <ArrowRight className="h-4 w-4" />
          <span className="font-bold">감사합니다</span>
        </div>
      </div>
    </div>
  );
}
