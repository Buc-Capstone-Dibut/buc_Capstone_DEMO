"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  getPortfolioTemplate,
  type PortfolioDocument,
  type PortfolioSection,
  type PortfolioSiteBlock,
  type PortfolioSitePage,
  type PortfolioSitePageType,
  type PortfolioTemplateId,
  type PortfolioTemplateVisualStyle,
} from "@/lib/career-portfolios";
import { cn } from "@/lib/utils";
import { MinimalMonoRenderer } from "./renderers/minimal-mono-renderer";
import { EditorialMagazineRenderer } from "./renderers/editorial-magazine-renderer";
import { BrutalistTechRenderer } from "./renderers/brutalist-tech-renderer";
import { SoftPastelCardRenderer } from "./renderers/soft-pastel-card-renderer";
import { TerminalCodeRenderer } from "./renderers/terminal-code-renderer";
import { NotionDocumentRenderer } from "./renderers/notion-document-renderer";
import { GalleryMoodRenderer } from "./renderers/gallery-mood-renderer";
import { RendererEmptyState, RendererShell, useRendererPageIndex } from "./renderers/renderer-shell";
import { fluidTitleSize, fluidNarrativeSize, fluidLeading } from "./renderers/shared";
import { EditableProvider, EditableText, useItemsSourceOrFallback, usePatchActivePage } from "./renderers/editable-text";

// ──────────────────────────────────────────────────────────────────────────────
// 템플릿 컨텍스트 — 시각 헬퍼들이 templateId 별 다른 디자인을 분기 적용할 때 사용
// ──────────────────────────────────────────────────────────────────────────────

type RendererContextValue = { templateId: PortfolioTemplateId };
const RendererContext = createContext<RendererContextValue>({ templateId: "developer-minimal" });

function useTemplateId(): PortfolioTemplateId {
  return useContext(RendererContext).templateId;
}

/** templateId 식별 헬퍼들. 컴포넌트 안에서 짧게 사용. */
function isMinimal(id: PortfolioTemplateId) {
  return id === "developer-minimal";
}
function isEditorial(id: PortfolioTemplateId) {
  return id === "case-study";
}
function isBold(id: PortfolioTemplateId) {
  return id === "visual-showcase";
}

type PortfolioSiteRendererProps = {
  document: PortfolioDocument;
  readonly?: boolean;
  className?: string;
  /** 편집기에서 활성 페이지 제어 */
  activeIndex?: number;
  onActiveIndexChange?: (next: number) => void;
  hideHeader?: boolean;
  hideThumbnails?: boolean;
  disableKeyboardNav?: boolean;
  includeHiddenPages?: boolean;
  /** 인라인 편집 활성 (편집기) */
  editingEnabled?: boolean;
  /** 활성 페이지의 특정 path 를 업데이트 — 편집기에서 제공 */
  onPatchActivePage?: (path: (string | number)[], value: unknown) => void;
  /** 마운트 직후 자동으로 print 트리거 — /print 페이지에서 사용 */
  autoPrint?: boolean;
};

type RenderPattern = NonNullable<PortfolioSitePage["composition"]>["pattern"];

const PAGE_LABEL: Record<PortfolioSitePageType, string> = {
  cover: "표지",
  profile: "프로필",
  skills: "기술",
  "project-index": "목차",
  "case-study": "케이스",
  "project-detail": "상세",
  experience: "경력",
  retrospective: "성장",
  contact: "연락처",
};

const ROLE_LABEL: Record<string, string> = {
  headline: "핵심",
  summary: "요약",
  problem: "문제",
  role: "역할",
  solution: "해결",
  result: "결과",
  lesson: "배운 점",
  impact: "임팩트",
  decision: "판단",
  evidence: "근거",
  next: "다음",
  body: "본문",
};

const ACCENT_COLORS = ["#1f7a4d", "#0f766e", "#b7791f", "#dc6b4a", "#4f46e5"];

function slideVisualMode(page: PortfolioSitePage) {
  const direction =
    `${page.composition?.pattern || ""} ${page.composition?.accentShape || ""} ${page.visualDirection || ""} ${page.layout || ""}`.toLowerCase();
  if (direction.includes("matrix") || direction.includes("cluster") || direction.includes("radar")) {
    return "matrix";
  }
  if (direction.includes("ring") || direction.includes("radial")) {
    return "matrix";
  }
  if (direction.includes("journey") || direction.includes("timeline") || direction.includes("ribbon")) {
    return "journey";
  }
  if (direction.includes("diagonal") || direction.includes("flow") || direction.includes("problem")) {
    return "diagonal";
  }
  if (direction.includes("minimal") || direction.includes("closing")) {
    return "minimal";
  }
  return "editorial";
}

function getRenderPattern(page: PortfolioSitePage): RenderPattern {
  if (page.composition?.pattern) return page.composition.pattern;
  if (page.type === "cover") return "hero-statement";
  if (page.type === "profile") return "split-proof";
  if (page.type === "skills") return "radial-map";
  if (page.type === "project-index") return "timeline-track";
  if (page.type === "project-detail") return "evidence-wall";
  if (page.type === "experience" || page.type === "retrospective") return "metric-spotlight";
  if (page.type === "contact") return "closing-signal";
  return "diagonal-flow";
}

function sectionToSitePage(section: PortfolioSection): PortfolioSitePage {
  const type: PortfolioSitePageType =
    section.type === "hero"
      ? "cover"
      : section.type === "about"
        ? "profile"
        : section.type === "skills"
          ? "skills"
          : section.type === "index"
            ? "project-index"
            : section.type === "experience"
              ? "experience"
              : section.type === "retrospective"
                ? "retrospective"
                : section.type === "contact"
                  ? "contact"
                  : "case-study";

  return {
    id: section.id,
    type,
    title: section.title || "슬라이드형",
    subtitle: section.subtitle,
    eyebrow: PAGE_LABEL[type],
    intent: section.type === "project" ? "대표 프로젝트 설득" : "핵심 메시지 전달",
    visualDirection:
      section.type === "hero"
        ? "large-title-with-vertical-rule"
        : section.type === "project"
          ? "diagonal-problem-to-result-flow"
          : "editorial-typography-and-lines",
    narrative: section.body || section.subtitle || section.title,
    emphasis: section.tags?.slice(0, 4) || [],
    layout:
      type === "cover"
        ? "editorial-cover"
        : type === "profile"
          ? "profile-map"
          : type === "skills"
            ? "tech-radar"
            : type === "project-index"
              ? "project-index"
              : type === "contact"
                ? "closing-impact"
                : type === "project-detail"
                  ? "project-dashboard"
                  : "case-study-flow",
    blocks: [
      {
        id: `${section.id}-summary`,
        type: "text",
        role: "summary",
        content: section.body || section.subtitle || section.title,
      },
      ...(section.tags?.length
        ? [{ id: `${section.id}-tags`, type: "tags" as const, items: section.tags }]
        : []),
    ],
    sourceId: section.sourceId,
    sourceKind: section.sourceKind,
    visible: section.visible,
  };
}

function textBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "text" && block.content?.trim());
}

function tagBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "tags" && block.items?.length);
}

function metricBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "metric");
}

function timelineBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "timeline" && block.items?.length);
}

function flowBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "flow" && block.items?.length);
}

function matrixBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "matrix" && block.items?.length);
}

function contributionBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "contribution");
}

function calloutBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "callout" && block.content?.trim());
}

function getBlockLabel(block: PortfolioSiteBlock, fallback = "") {
  return block.label || (block.role ? ROLE_LABEL[block.role] : "") || fallback;
}

function plainText(value?: string, max = 280) {
  const normalized = (value || "").replace(/[ \t]+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}...`;
}

function multilineText(value?: string, max = 360) {
  const normalized = (value || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}...`;
}

function blockText(block: PortfolioSiteBlock, max = 240) {
  return multilineText(block.content || block.caption || block.value, max);
}


function pageNarrative(page: PortfolioSitePage, max = 260) {
  return multilineText(
    page.narrative ||
      textBlocks(page)[0]?.content ||
      page.subtitle ||
      page.intent ||
      page.title,
    max,
  );
}

function pageEmphasis(page: PortfolioSitePage) {
  const explicit = page.emphasis?.filter(Boolean) || [];
  if (explicit.length) return explicit.slice(0, 6);
  return tagBlocks(page)[0]?.items?.slice(0, 6) || [];
}

function flowItems(page: PortfolioSitePage) {
  const blockItems = flowBlocks(page)[0]?.items?.filter(Boolean) || [];
  if (blockItems.length >= 3) return blockItems.slice(0, 5);
  const roles = textBlocks(page)
    .map((block) => getBlockLabel(block))
    .filter(Boolean)
    .slice(0, 5);
  if (roles.length >= 3) return roles;
  const tags = pageEmphasis(page);
  return tags.length >= 3 ? tags.slice(0, 5) : ["문제", "역할", "해결", "결과"];
}

function matrixItems(page: PortfolioSitePage) {
  const blockItems = matrixBlocks(page)[0]?.items?.filter(Boolean) || [];
  if (blockItems.length) return blockItems.slice(0, 10);
  return pageEmphasis(page).slice(0, 10);
}

function timelineItems(page: PortfolioSitePage) {
  const blockItems = timelineBlocks(page)[0]?.items?.filter(Boolean) || [];
  if (blockItems.length) return blockItems.slice(0, 6);
  return flowItems(page).slice(0, 6);
}

function contributionPercent(value?: string) {
  if (!value) return 72;
  const percentMatch = value.match(/(\d{1,3})\s*%/);
  if (percentMatch) return Math.max(18, Math.min(100, Number(percentMatch[1])));
  const numberMatch = value.match(/\d+/);
  if (numberMatch) return Math.max(28, Math.min(92, 46 + Number(numberMatch[0]) * 8));
  return Math.max(36, Math.min(88, value.length * 7));
}

function DeckShell({
  page,
  index,
  total,
  templateId,
  children,
}: {
  page: PortfolioSitePage;
  index: number;
  total: number;
  templateId: string;
  children: ReactNode;
}) {
  const patch = usePatchActivePage();
  const visualMode = slideVisualMode(page);
  const isDark = templateId === "visual-showcase";
  const isEditorial = templateId === "case-study";
  const isMinimal = templateId === "developer-minimal";

  return (
    <article
      className={cn(
        "relative h-full w-full overflow-hidden",
        isDark ? "bg-[#0f172a] text-slate-100" : "bg-[var(--portfolio-background,#fbfcf8)] text-[var(--portfolio-text,#0f172a)]",
      )}
    >
      {isMinimal ? (
        <div className="absolute inset-0 bg-white" />
      ) : isEditorial ? (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#fdf6e3_0%,#fdfaee_100%)]" />
      ) : isDark ? (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_60%,#0f172a_100%)]" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8faf6_54%,#eef6e8_100%)]" />
      )}
      {!isEditorial ? (
        <div
          className={cn(
            "absolute inset-0",
            isDark
              ? "opacity-25 [background-image:linear-gradient(rgba(248,250,252,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.06)_1px,transparent_1px)] [background-size:60px_60px]"
              : "opacity-45 [background-image:linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:46px_46px]",
          )}
        />
      ) : null}
      {isDark ? (
        <div className="absolute -right-24 -top-24 h-[60%] w-[40%] rotate-12 bg-[var(--portfolio-accent)] opacity-30" />
      ) : null}
      {!isDark && !isEditorial ? (
        <div
          className={cn(
            "absolute top-0 h-full bg-[linear-gradient(180deg,rgba(31,122,77,0.12),rgba(246,212,107,0.16))]",
            visualMode === "diagonal" && "-right-16 w-[38%] skew-x-[-13deg]",
            visualMode === "matrix" && "right-0 w-[27%]",
            visualMode === "journey" && "-right-24 w-[44%] skew-x-[-18deg]",
            visualMode === "minimal" && "-right-20 w-[26%] skew-x-[-10deg] opacity-65",
            visualMode === "editorial" && "-right-16 w-[33%] skew-x-[-13deg]",
          )}
        />
      ) : null}
      <div className="absolute left-9 top-7 flex items-center gap-3">
        <span className="h-[2px] w-14 bg-[var(--portfolio-primary)]" />
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--portfolio-primary)]">
          <EditableText value={page.eyebrow} onChange={(v) => patch(["eyebrow"], v)} maxLength={60} placeholder={PAGE_LABEL[page.type]} fieldKey="eyebrow" />
        </span>
      </div>
      <div
        className={cn(
          "absolute bottom-6 left-9 right-9 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em]",
          isDark ? "text-slate-500" : "text-slate-400",
        )}
      >
        <span>Debut Portfolio</span>
        <span>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      {/* 푸터(bottom-6) 와 콘텐츠가 겹치지 않게 하단 pb-12 안전 영역. overflow-hidden 으로 콘텐츠가 16:9 컨테이너 밖으로 새지 않도록. */}
      <div className="relative h-full w-full overflow-hidden pb-12">{children}</div>
    </article>
  );
}

function BigNumber({ value }: { value: string }) {
  const templateId = useTemplateId();
  if (isBold(templateId)) {
    return (
      <span
        className="select-none text-[148px] font-black leading-none text-[var(--portfolio-accent)] opacity-90"
        style={{ textShadow: "0 0 60px rgba(255,255,255,0.15)" }}
      >
        {value}
      </span>
    );
  }
  if (isEditorial(templateId)) {
    return (
      <span className="select-none font-serif text-[140px] font-black italic leading-none text-[var(--portfolio-primary)] opacity-25">
        {value}
      </span>
    );
  }
  // Minimal Tech
  return (
    <span className="select-none text-[118px] font-black leading-none text-slate-200">
      {value}
    </span>
  );
}

function TextList({ blocks, max = 6 }: { blocks: PortfolioSiteBlock[]; max?: number }) {
  const patch = usePatchActivePage();
  return (
    <div className="space-y-3">
      {blocks.slice(0, max).map((block, index) => (
        <div key={block.id} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3">
          <span
            className="mt-1 h-7 w-7 text-center text-sm font-black leading-7 text-white"
            style={{ backgroundColor: ACCENT_COLORS[index % ACCENT_COLORS.length] }}
          >
            {index + 1}
          </span>
          <div className="min-w-0 border-t border-[#c8dabc] pt-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--portfolio-primary)]">
              <EditableText value={block.label} onChange={(v) => patch(["blocks", block.id, "label"], v)} maxLength={40} placeholder={`Point ${index + 1}`} fieldKey={`block-${block.id}-label`} />
            </p>
            <p className="mt-1 whitespace-pre-line text-[13px] font-semibold leading-6 text-slate-700">
              <EditableText value={block.content} onChange={(v) => patch(["blocks", block.id, "content"], v)} maxLength={220} multiline placeholder="본문" fieldKey={`block-${block.id}-content`} />
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricLine({ page }: { page: PortfolioSitePage }) {
  const templateId = useTemplateId();
  const patch = usePatchActivePage();
  const metrics = metricBlocks(page);
  if (!metrics.length) return null;

  if (isBold(templateId)) {
    // Bold Showcase — 거대한 컬러 블록, text-7xl 숫자, 어두운 배경 위 흰 글씨
    return (
      <div className="flex flex-wrap gap-4">
        {metrics.slice(0, 3).map((metric) => (
          <div
            key={metric.id}
            className="min-w-0 rounded-2xl border-2 border-[var(--portfolio-accent)] bg-slate-800/50 px-6 py-5 backdrop-blur-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--portfolio-accent)]">
              <EditableText value={metric.label} onChange={(v) => patch(["blocks", metric.id, "label"], v)} maxLength={30} placeholder="Metric" fieldKey={`block-${metric.id}-label`} />
            </p>
            <p
              className="mt-2 break-keep font-black leading-none tracking-tighter text-white"
              style={{ fontSize: `${fluidTitleSize(metric.value, 64, 48, 36, 28)}px` }}
            >
              <EditableText value={metric.value} onChange={(v) => patch(["blocks", metric.id, "value"], v)} maxLength={24} placeholder="-" fieldKey={`block-${metric.id}-value`} />
            </p>
            <p className="mt-2 max-w-[180px] break-keep text-[12px] font-bold leading-5 text-slate-300">
              <EditableText value={metric.caption} onChange={(v) => patch(["blocks", metric.id, "caption"], v)} maxLength={90} placeholder="설명 (선택)" fieldKey={`block-${metric.id}-caption`} />
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (isEditorial(templateId)) {
    // Editorial Magazine — serif 큰 숫자, 점선 구분
    return (
      <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4 border-t border-dashed border-[var(--portfolio-primary)]/40 pt-5">
        {metrics.slice(0, 4).map((metric) => (
          <div key={metric.id} className="min-w-0">
            <p className="font-serif text-[11px] font-medium italic tracking-[0.18em] text-slate-500">
              <EditableText value={metric.label} onChange={(v) => patch(["blocks", metric.id, "label"], v)} maxLength={30} placeholder="Metric" fieldKey={`block-${metric.id}-label`} />
            </p>
            <p
              className="mt-1 break-keep font-serif font-bold leading-tight text-[var(--portfolio-primary)]"
              style={{ fontSize: `${fluidTitleSize(metric.value, 44, 34, 26, 22)}px` }}
            >
              <EditableText value={metric.value} onChange={(v) => patch(["blocks", metric.id, "value"], v)} maxLength={24} placeholder="-" fieldKey={`block-${metric.id}-value`} />
            </p>
            <p className="mt-1 max-w-[200px] break-keep font-serif text-[12px] font-medium italic leading-5 text-slate-600">
              <EditableText value={metric.caption} onChange={(v) => patch(["blocks", metric.id, "caption"], v)} maxLength={90} placeholder="설명 (선택)" fieldKey={`block-${metric.id}-caption`} />
            </p>
          </div>
        ))}
      </div>
    );
  }

  // Minimal Tech — 깔끔한 sans 큰 숫자
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-4">
      {metrics.slice(0, 4).map((metric) => (
        <div key={metric.id} className="min-w-0 border-l-2 border-[var(--portfolio-primary)] pl-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            <EditableText value={metric.label} onChange={(v) => patch(["blocks", metric.id, "label"], v)} maxLength={30} placeholder="Metric" fieldKey={`block-${metric.id}-label`} />
          </p>
          <p
            className="mt-1 break-keep font-black leading-tight tracking-tight text-[var(--portfolio-primary)]"
            style={{ fontSize: `${fluidTitleSize(metric.value, 40, 32, 26, 22)}px` }}
          >
            <EditableText value={metric.value} onChange={(v) => patch(["blocks", metric.id, "value"], v)} maxLength={24} placeholder="-" fieldKey={`block-${metric.id}-value`} />
          </p>
          <p className="mt-1 max-w-[170px] break-keep text-[11px] font-semibold leading-5 text-slate-500">
            <EditableText value={metric.caption} onChange={(v) => patch(["blocks", metric.id, "caption"], v)} maxLength={90} placeholder="설명 (선택)" fieldKey={`block-${metric.id}-caption`} />
          </p>
        </div>
      ))}
    </div>
  );
}

function FlowRibbon({ page }: { page: PortfolioSitePage }) {
  const templateId = useTemplateId();
  const items = useItemsSourceOrFallback(page, "flow", () => flowItems(page));
  const ROMAN = ["I", "II", "III", "IV", "V"];

  if (isEditorial(templateId)) {
    // Editorial — 로마 숫자(I,II,III,IV), serif, 빈 박스, 점선 라인
    return (
      <div className="relative">
        <div className="absolute left-4 right-4 top-[28px] h-0 border-t border-dashed border-[var(--portfolio-primary)]/50" />
        <div className="relative grid grid-cols-4 gap-5">
          {items.slice(0, 4).map((item, index) => (
            <div key={`${item.value}-${index}`} className="min-w-0">
              <div className="flex h-14 w-14 items-center justify-center border-2 border-[var(--portfolio-primary)] bg-[var(--portfolio-background)] font-serif text-xl font-bold text-[var(--portfolio-primary)]">
                {ROMAN[index]}
              </div>
              <p className="mt-3 break-keep font-serif text-[13px] font-medium italic leading-6 text-slate-800">
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={90} fieldKey={`item-${index}`} />
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isBold(templateId)) {
    // Bold — 거대 숫자 카드, 컬러 블록 강조, 굵은 화살표
    return (
      <div className="relative">
        <div className="relative grid grid-cols-4 gap-2">
          {items.slice(0, 4).map((item, index) => (
            <div
              key={`${item.value}-${index}`}
              className="relative min-w-0 rounded-lg border-2 border-[var(--portfolio-accent)] bg-slate-800 p-4"
            >
              {index < 3 ? (
                <div className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 text-2xl font-black text-[var(--portfolio-accent)]">
                  →
                </div>
              ) : null}
              <p className="text-[32px] font-black leading-none text-[var(--portfolio-accent)]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-3 break-keep text-[13px] font-black leading-5 text-white">
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={90} fieldKey={`item-${index}`} />
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Minimal Tech — 단순 박스 + 얇은 라인
  return (
    <div className="relative">
      <div className="absolute left-4 right-4 top-[35px] h-[2px] bg-slate-200" />
      <div className="relative grid grid-cols-4 gap-4">
        {items.slice(0, 4).map((item, index) => (
          <div key={`${item.value}-${index}`} className="min-w-0">
            <div
              className="flex h-16 w-16 items-center justify-center text-xl font-black text-white"
              style={{ backgroundColor: ACCENT_COLORS[index % ACCENT_COLORS.length] }}
            >
              {index + 1}
            </div>
            <p className="mt-3 break-keep text-[13px] font-black leading-5 text-slate-800">
              <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={90} fieldKey={`item-${index}`} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeywordCloud({ page }: { page: PortfolioSitePage }) {
  const templateId = useTemplateId();
  const items = useItemsSourceOrFallback(page, "matrix", () => matrixItems(page));
  if (!items.length) return null;

  if (isEditorial(templateId)) {
    // Editorial — serif 큰 따옴표 매거진 식 + 인용 키워드 가운데 배치
    return (
      <div className="relative flex h-[250px] flex-col items-center justify-center px-4">
        <span className="font-serif text-[120px] font-bold leading-none text-[var(--portfolio-primary)]/20">
          “
        </span>
        <div className="-mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 px-8">
          {items.slice(0, 8).map((item, index) => (
            <span
              key={`${item.value}-${index}`}
              className="break-keep font-serif text-base font-medium italic text-slate-800"
              style={{
                borderBottom: index % 2 === 0 ? `2px solid ${ACCENT_COLORS[index % ACCENT_COLORS.length]}` : undefined,
              }}
            >
              <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={50} fieldKey={`item-${index}`} />
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (isBold(templateId)) {
    // Bold — 컬러 칩, 크기 다양, 강한 대비
    return (
      <div className="flex h-[250px] flex-wrap content-center items-center justify-center gap-3 p-4">
        {items.slice(0, 10).map((item, index) => {
          const color = ACCENT_COLORS[index % ACCENT_COLORS.length];
          const size = index % 4 === 0 ? "text-xl px-5 py-3" : index % 3 === 0 ? "text-lg px-4 py-2.5" : "text-sm px-3 py-2";
          return (
            <span
              key={`${item.value}-${index}`}
              className={cn("break-keep rounded-full border-2 font-black", size)}
              style={{
                borderColor: color,
                backgroundColor: `${color}22`,
                color: color,
              }}
            >
              <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={50} fieldKey={`item-${index}`} />
            </span>
          );
        })}
      </div>
    );
  }

  // Minimal Tech — 격자 라인 위 키워드 배치 (기본)
  return (
    <div className="relative h-[250px]">
      <div className="absolute left-1/2 top-0 h-full w-px bg-slate-200" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-slate-200" />
      {items.slice(0, 9).map((item, index) => {
        const positions = [
          "left-[7%] top-[8%]",
          "left-[42%] top-[2%]",
          "right-[4%] top-[18%]",
          "left-[16%] top-[42%]",
          "left-[52%] top-[38%]",
          "right-[12%] bottom-[12%]",
          "left-[4%] bottom-[10%]",
          "left-[36%] bottom-[2%]",
          "right-[34%] top-[66%]",
        ];
        return (
          <span
            key={`${item.value}-${index}`}
            className={cn(
              "absolute max-w-[180px] break-keep px-2 py-1 text-sm font-black leading-5",
              positions[index % positions.length],
            )}
            style={{
              color: ACCENT_COLORS[index % ACCENT_COLORS.length],
              borderBottom: `3px solid ${ACCENT_COLORS[index % ACCENT_COLORS.length]}`,
            }}
          >
            <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={50} fieldKey={`item-${index}`} />
          </span>
        );
      })}
    </div>
  );
}

function RoleBars({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const items = contributionBlocks(page);
  if (!items.length) return null;
  return (
    <div className="space-y-4">
      {items.slice(0, 4).map((item, index) => {
        const percent = contributionPercent(item.value);
        return (
          <div key={item.id}>
            <div className="flex items-end justify-between gap-4">
              <p className="break-keep text-[13px] font-black text-slate-800">
                <EditableText value={item.label} onChange={(v) => patch(["blocks", item.id, "label"], v)} maxLength={40} placeholder="기여" fieldKey={`block-${item.id}-label`} />
              </p>
              <p className="shrink-0 text-[12px] font-black text-slate-500">
                <EditableText value={item.value} onChange={(v) => patch(["blocks", item.id, "value"], v)} maxLength={60} placeholder={`${percent}%`} fieldKey={`block-${item.id}-value`} />
              </p>
            </div>
            <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-[#dfeada]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${percent}%`,
                  backgroundColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
                }}
              />
            </div>
            <p className="mt-1 break-keep text-[11px] font-semibold leading-5 text-slate-500">
              <EditableText value={item.caption} onChange={(v) => patch(["blocks", item.id, "caption"], v)} maxLength={110} placeholder="설명 (선택)" fieldKey={`block-${item.id}-caption`} />
            </p>
          </div>
        );
      })}
    </div>
  );
}

function TimelineLine({ page }: { page: PortfolioSitePage }) {
  const items = useItemsSourceOrFallback(page, "timeline", () => timelineItems(page));
  return (
    <div className="space-y-3">
      {items.slice(0, 5).map((item, index) => (
        <div key={`${item.value}-${index}`} className="grid grid-cols-[42px_minmax(0,1fr)] items-start gap-4">
          <span className="text-3xl font-black leading-none text-[var(--portfolio-primary)] opacity-80">
            {String(index + 1).padStart(2, "0")}
          </span>
          <p className="break-keep border-l-2 border-[#c8dabc] pl-4 text-[13px] font-bold leading-6 text-slate-700">
            <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={140} fieldKey={`item-${index}`} />
          </p>
        </div>
      ))}
    </div>
  );
}

function CalloutLine({ page }: { page: PortfolioSitePage }) {
  const templateId = useTemplateId();
  const patch = usePatchActivePage();
  const callout = calloutBlocks(page)[0];
  if (!callout) return null;

  if (isEditorial(templateId)) {
    // Editorial — 매거진 식 큰 인용 부호 + serif italic
    return (
      <div className="relative pl-6">
        <span className="absolute -left-2 top-[-12px] font-serif text-[68px] font-bold leading-none text-[var(--portfolio-primary)]/40">
          “
        </span>
        <p className="font-serif text-[11px] font-medium italic tracking-[0.2em] text-[var(--portfolio-primary)]">
          {callout.label || "Key Point"}
        </p>
        <p className="mt-2 whitespace-pre-line break-keep font-serif text-[15px] font-medium italic leading-[1.7] text-slate-800">
          <EditableText value={callout.content} onChange={(v) => patch(["blocks", callout.id, "content"], v)} maxLength={240} multiline placeholder="본문" fieldKey={`block-${callout.id}-content`} />
        </p>
      </div>
    );
  }

  if (isBold(templateId)) {
    // Bold — 컬러 블록 배경, 강한 대비, 흰 글씨
    return (
      <div
        className="rounded-2xl border-2 border-[var(--portfolio-accent)] bg-slate-800/60 p-5 backdrop-blur-sm"
        style={{ boxShadow: "0 0 30px rgba(255,255,255,0.05)" }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--portfolio-accent)]">
          {callout.label || "Key Point"}
        </p>
        <p className="mt-2 whitespace-pre-line break-keep text-[15px] font-bold leading-7 text-white">
          <EditableText value={callout.content} onChange={(v) => patch(["blocks", callout.id, "content"], v)} maxLength={240} multiline placeholder="본문" fieldKey={`block-${callout.id}-content`} />
        </p>
      </div>
    );
  }

  // Minimal Tech — 단순 좌측 막대
  return (
    <div className="border-l-[6px] border-[var(--portfolio-primary)] pl-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--portfolio-primary)]">
        {callout.label || "Key Point"}
      </p>
      <p className="mt-2 whitespace-pre-line break-keep text-[14px] font-bold leading-7 text-slate-800">
        <EditableText value={callout.content} onChange={(v) => patch(["blocks", callout.id, "content"], v)} maxLength={240} multiline placeholder="본문" fieldKey={`block-${callout.id}-content`} />
      </p>
    </div>
  );
}

function TitleBlock({ page }: { page: PortfolioSitePage }) {
  const templateId = useTemplateId();
  const patch = usePatchActivePage();

  if (isEditorial(templateId)) {
    // Editorial Magazine — 매거진 식 중앙 정렬, serif 큰 헤딩, 큰 부제, 가는 라인 강조
    return (
      <div className="flex flex-col items-center text-center">
        {page.intent ? (
          <p className="break-keep font-serif text-[12px] font-medium italic tracking-[0.3em] text-[var(--portfolio-primary)]">
            — <EditableText value={page.intent} onChange={(v) => patch(["intent"], v)} maxLength={88} placeholder="(선택)" fieldKey="intent" /> —
          </p>
        ) : null}
        <h1
          className="mt-4 break-keep font-serif font-bold tracking-tight text-slate-950"
          style={{
            fontSize: `${fluidTitleSize(page.title, 44, 36, 30, 26)}px`,
            lineHeight: fluidLeading(page.title, 1.1, 1.2),
          }}
        >
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={90} placeholder="제목" fieldKey="title" />
        </h1>
        <span className="mt-4 inline-block h-[2px] w-16 bg-[var(--portfolio-primary)]" />
        {page.subtitle ? (
          <p className="mt-4 max-w-[560px] break-keep font-serif text-[16px] font-medium italic leading-7 text-slate-600">
            <EditableText value={page.subtitle} onChange={(v) => patch(["subtitle"], v)} maxLength={140} placeholder="부제 (선택)" fieldKey="subtitle" />
          </p>
        ) : null}
      </div>
    );
  }

  if (isBold(templateId)) {
    // Bold Showcase — 거대 sans, 강한 트래킹, 어두운 배경에 흰 글씨
    return (
      <div>
        {page.intent ? (
          <p className="text-[12px] font-black uppercase tracking-[0.32em] text-[var(--portfolio-accent)]">
            <EditableText value={page.intent} onChange={(v) => patch(["intent"], v)} maxLength={88} placeholder="(선택)" fieldKey="intent" />
          </p>
        ) : null}
        <h1
          className="mt-4 break-keep font-black tracking-tighter text-white"
          style={{
            fontSize: `${fluidTitleSize(page.title, 52, 42, 34, 28)}px`,
            lineHeight: fluidLeading(page.title, 0.95, 1.1),
          }}
        >
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={90} placeholder="제목" fieldKey="title" />
        </h1>
        {page.subtitle ? (
          <p className="mt-5 max-w-[560px] break-keep text-[16px] font-bold leading-7 text-slate-300">
            <EditableText value={page.subtitle} onChange={(v) => patch(["subtitle"], v)} maxLength={140} placeholder="부제 (선택)" fieldKey="subtitle" />
          </p>
        ) : null}
      </div>
    );
  }

  // Minimal Tech — 큰 sans, 좌측 정렬, 미니멀
  return (
    <div>
      {page.intent ? (
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          <EditableText value={page.intent} onChange={(v) => patch(["intent"], v)} maxLength={88} placeholder="(선택)" fieldKey="intent" />
        </p>
      ) : null}
      <h1
        className="mt-3 break-keep font-black tracking-tight text-slate-950"
        style={{
          fontSize: `${fluidTitleSize(page.title, 40, 34, 28, 24)}px`,
          lineHeight: fluidLeading(page.title, 1.06, 1.18),
        }}
      >
        <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={90} placeholder="제목" fieldKey="title" />
      </h1>
      {page.subtitle ? (
        <p className="mt-4 max-w-[560px] break-keep text-[15px] font-bold leading-7 text-slate-600">
          <EditableText value={page.subtitle} onChange={(v) => patch(["subtitle"], v)} maxLength={140} placeholder="부제 (선택)" fieldKey="subtitle" />
        </p>
      ) : null}
    </div>
  );
}

function CompositionNote({ page }: { page: PortfolioSitePage }) {
  const templateId = useTemplateId();
  const patch = usePatchActivePage();
  // 우선순위: composition.visualMetaphor → visualDirection
  // 편집 시엔 visualDirection 으로 patch (더 자유로운 텍스트)
  const metaphor = page.composition?.visualMetaphor || page.visualDirection;
  if (!metaphor) return null;
  const editable = (
    <EditableText
      value={metaphor}
      onChange={(v) => patch(["visualDirection"], v)}
      maxLength={54}
      placeholder="시각 방향"
      fieldKey="composition-note"
    />
  );

  if (isEditorial(templateId)) {
    return (
      <p className="font-serif text-[11px] font-medium italic tracking-[0.22em] text-[var(--portfolio-primary)]">
        {editable}
      </p>
    );
  }
  if (isBold(templateId)) {
    return (
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--portfolio-accent)]">
        {editable}
      </p>
    );
  }
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
      {editable}
    </p>
  );
}

function EmphasisRail({ page, max = 5 }: { page: PortfolioSitePage; max?: number }) {
  const patch = usePatchActivePage();
  const allEmphasis = page.emphasis || [];
  const items = useItemsSourceOrFallback(page, null, () => pageEmphasis(page)).slice(0, max);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#c8dabc] pt-4">
      {items.map((item, index) => (
        <span
          key={`${item.value}-${index}`}
          className="text-[12px] font-black uppercase tracking-[0.12em]"
          style={{ color: ACCENT_COLORS[index % ACCENT_COLORS.length] }}
        >
          <EditableText
            value={item.value}
            onChange={item.onChange || (() => {})}
            maxLength={24}
            placeholder="키워드"
            fieldKey={`emphasis-${index}`}
          />
        </span>
      ))}
    </div>
  );
}

function HeroStatementCompositionSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div className="grid h-full grid-cols-[1.12fr_0.88fr] gap-12 overflow-hidden px-14 pb-6 pt-14">
      <div className="flex min-w-0 flex-col justify-center">
        <CompositionNote page={page} />
        <h1
          className="mt-5 break-keep font-black text-slate-950"
          style={{
            fontSize: `${fluidTitleSize(page.title, 52, 42, 34, 28)}px`,
            lineHeight: fluidLeading(page.title, 1.04, 1.18),
          }}
        >
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={86} placeholder="제목" fieldKey="title" />
        </h1>
        <p
          className="mt-7 max-w-[620px] whitespace-pre-line break-keep font-bold leading-8 text-slate-700"
          style={{ fontSize: `${fluidNarrativeSize(page.narrative, 17, 15, 14, 13)}px` }}
        >
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={320} multiline placeholder="본문" fieldKey="narrative" />
        </p>
        <div className="mt-10">
          <EmphasisRail page={page} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center border-l-[10px] border-[var(--portfolio-primary)] pl-8">
        <BigNumber value="01" />
        <MetricLine page={page} />
        <div className="mt-10">
          <CalloutLine page={page} />
        </div>
      </div>
    </div>
  );
}

function SplitProofCompositionSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const blocks = textBlocks(page);
  return (
    <div className="grid h-full grid-cols-[0.82fr_1.18fr] gap-10 overflow-hidden px-14 pb-6 pt-14">
      <div className="flex min-w-0 flex-col justify-center overflow-hidden">
        <CompositionNote page={page} />
        <TitleBlock page={page} />
        <p className="mt-5 whitespace-pre-line break-keep text-[14px] font-bold leading-6 text-slate-700">
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={200} multiline placeholder="본문" fieldKey="narrative" />
        </p>
        <div className="mt-6">
          <RoleBars page={page} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-6 overflow-hidden">
        <TextList blocks={blocks.length ? blocks : page.blocks} max={3} />
        <EmphasisRail page={page} max={5} />
      </div>
    </div>
  );
}

function DiagonalFlowCompositionSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const items = useItemsSourceOrFallback(page, "flow", () => flowItems(page)).slice(0, 4);
  return (
    <div className="flex h-full flex-col overflow-hidden px-12 pb-6 pt-14">
      <div className="grid grid-cols-[1fr_300px] gap-8">
        <div className="min-w-0">
          <CompositionNote page={page} />
          <TitleBlock page={page} />
          <p className="mt-5 max-w-[540px] whitespace-pre-line break-keep text-[14px] font-bold leading-6 text-slate-700">
            <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={240} multiline placeholder="본문" fieldKey="narrative" />
          </p>
        </div>
        <div className="pt-6">
          <CalloutLine page={page} />
        </div>
      </div>
      <div className="relative mt-9 flex-1">
        <div className="absolute left-0 right-0 top-[58px] h-[3px] rotate-[-5deg] bg-[rgba(31,122,77,0.22)]" />
        <div className="relative grid grid-cols-4 gap-5">
          {items.map((item, index) => (
            <div
              key={`${item.value}-${index}`}
              className="min-w-0 border-t-[6px] bg-[#fbfcf8]/85 pt-4"
              style={{
                borderColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
                transform: `translateY(${index % 2 === 0 ? 0 : 28}px)`,
              }}
            >
              <p className="text-[34px] font-black leading-none text-[var(--portfolio-primary)] opacity-80">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-3 text-[13px] font-black leading-5 text-slate-800">
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={46} fieldKey={`item-${index}`} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricSpotlightCompositionSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const metric = metricBlocks(page)[0] || contributionBlocks(page)[0];
  const fallbackValue = String(pageEmphasis(page).length || textBlocks(page).length || 1);
  return (
    <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-12 overflow-hidden px-14 pb-6 pt-14">
      <div className="flex min-w-0 flex-col justify-center">
        <CompositionNote page={page} />
        {(() => {
          // 거대 폰트 슬롯 — metric value (보통 "32%" 같이 짧음) 는 106px,
          // intent fallback (긴 설명문) 은 공격적으로 축소.
          const slotText = (metric ? metric.value : page.intent) || "";
          const len = slotText.length;
          const slotSize =
            len <= 8 ? 106 : len <= 16 ? 64 : len <= 28 ? 40 : len <= 50 ? 28 : 22;
          return (
            <p
              className="font-black leading-tight text-[var(--portfolio-primary)]"
              style={{ fontSize: `${slotSize}px` }}
            >
              {metric ? (
                <EditableText value={metric.value} onChange={(v) => patch(["blocks", metric.id, "value"], v)} maxLength={14} placeholder={fallbackValue} fieldKey={`block-${metric.id}-value`} />
              ) : (
                <EditableText value={page.intent} onChange={(v) => patch(["intent"], v)} maxLength={14} placeholder={fallbackValue} fieldKey="intent" />
              )}
            </p>
          );
        })()}
        <p className="mt-3 text-[14px] font-black uppercase tracking-[0.16em] text-slate-500">
          {metric ? (
            <EditableText value={metric.label} onChange={(v) => patch(["blocks", metric.id, "label"], v)} maxLength={48} placeholder="라벨" fieldKey={`block-${metric.id}-label`} />
          ) : (
            <EditableText value={page.intent} onChange={(v) => patch(["intent"], v)} maxLength={48} placeholder="핵심 근거" fieldKey="intent" />
          )}
        </p>
        <p className="mt-7 whitespace-pre-line break-keep text-[16px] font-bold leading-8 text-slate-700">
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={260} multiline placeholder="본문" fieldKey="narrative" />
        </p>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-8">
        <TitleBlock page={page} />
        <TimelineLine page={page} />
        <CalloutLine page={page} />
      </div>
    </div>
  );
}

function RadialMapCompositionSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div className="grid h-full grid-cols-[0.72fr_1.28fr] gap-10 overflow-hidden px-14 pb-6 pt-14">
      <div className="flex min-w-0 flex-col justify-center">
        <CompositionNote page={page} />
        <TitleBlock page={page} />
        <p className="mt-6 whitespace-pre-line break-keep text-[14px] font-bold leading-6 text-slate-700">
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={240} multiline placeholder="본문" fieldKey="narrative" />
        </p>
        <div className="mt-8">
          <MetricLine page={page} />
        </div>
      </div>
      <div className="relative flex min-w-0 flex-col justify-center">
        <div className="absolute left-1/2 top-[18%] h-[64%] w-px bg-[#c8dabc]" />
        <div className="absolute left-[8%] right-[8%] top-1/2 h-px bg-[#c8dabc]" />
        <KeywordCloud page={page} />
        <div className="mt-4">
          <EmphasisRail page={page} />
        </div>
      </div>
    </div>
  );
}

function TimelineTrackCompositionSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const items = useItemsSourceOrFallback(page, "timeline", () => timelineItems(page)).slice(0, 6);
  return (
    <div className="flex h-full flex-col overflow-hidden px-14 pb-6 pt-14">
      <div className="max-w-[760px]">
        <CompositionNote page={page} />
        <TitleBlock page={page} />
      </div>
      <div className="relative mt-16 flex-1">
        <div className="absolute left-0 right-0 top-[92px] h-[3px] bg-[#b9cdae]" />
        <div className="relative grid grid-cols-6 gap-3">
          {items.map((item, index) => (
            <div key={`${item.value}-${index}`} className="min-w-0">
              <p
                className="flex h-[72px] w-[72px] items-center justify-center text-2xl font-black text-white"
                style={{ backgroundColor: ACCENT_COLORS[index % ACCENT_COLORS.length] }}
              >
                {index + 1}
              </p>
              <p className="mt-4 text-[12px] font-black leading-5 text-slate-800">
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={40} fieldKey={`item-${index}`} />
              </p>
            </div>
          ))}
        </div>
      </div>
      <EmphasisRail page={page} />
    </div>
  );
}

function EvidenceWallCompositionSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const blocks = textBlocks(page).slice(0, 4);
  return (
    <div className="grid h-full grid-cols-[0.76fr_1.24fr] gap-8 overflow-hidden px-12 pb-6 pt-14">
      <div className="flex min-w-0 flex-col justify-center">
        <CompositionNote page={page} />
        <TitleBlock page={page} />
        <div className="mt-8">
          <CalloutLine page={page} />
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-2 content-center gap-x-7 gap-y-5">
        {blocks.map((block, index) => (
          <div key={block.id} className="min-w-0 border-t-[5px] pt-3" style={{ borderColor: ACCENT_COLORS[index % ACCENT_COLORS.length] }}>
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[var(--portfolio-primary)]">
              <EditableText value={block.label} onChange={(v) => patch(["blocks", block.id, "label"], v)} maxLength={40} placeholder={`Evidence ${index + 1}`} fieldKey={`block-${block.id}-label`} />
            </p>
            <p className="mt-2 whitespace-pre-line break-keep text-[12px] font-bold leading-6 text-slate-700">
              <EditableText value={block.content} onChange={(v) => patch(["blocks", block.id, "content"], v)} maxLength={180} multiline placeholder="본문" fieldKey={`block-${block.id}-content`} />
            </p>
          </div>
        ))}
        <div className="col-span-2 border-t border-[#c8dabc] pt-5">
          <FlowRibbon page={page} />
        </div>
      </div>
    </div>
  );
}

function ClosingSignalCompositionSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div className="flex h-full flex-col justify-center overflow-hidden px-16 pb-6 pt-14">
      <div className="max-w-[820px]">
        <CompositionNote page={page} />
        <h1
          className="mt-6 break-keep font-black text-slate-950"
          style={{
            fontSize: `${fluidTitleSize(page.title, 52, 42, 34, 28)}px`,
            lineHeight: fluidLeading(page.title, 1.04, 1.18),
          }}
        >
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={90} placeholder="제목" fieldKey="title" />
        </h1>
        <p className="mt-7 whitespace-pre-line break-keep border-l-[10px] border-[var(--portfolio-primary)] pl-8 text-[18px] font-bold leading-8 text-slate-700">
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={280} multiline placeholder="본문" fieldKey="narrative" />
        </p>
        <div className="mt-10">
          <EmphasisRail page={page} />
        </div>
      </div>
    </div>
  );
}

function CoverSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div className="grid h-full grid-cols-[1fr_340px] gap-10 overflow-hidden px-14 pb-6 pt-14">
      <div className="flex min-w-0 flex-col justify-center border-l-[10px] border-[var(--portfolio-primary)] pl-9">
        <TitleBlock page={page} />
        <p className="mt-8 max-w-[620px] whitespace-pre-line break-keep text-[18px] font-bold leading-8 text-slate-700">
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={320} multiline placeholder="본문" fieldKey="narrative" />
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          {useItemsSourceOrFallback(page, null, () => pageEmphasis(page)).slice(0, 4).map((item, index) => (
            <span
              key={`${item.value}-${index}`}
              className="text-[13px] font-black uppercase tracking-[0.12em]"
              style={{ color: ACCENT_COLORS[index % ACCENT_COLORS.length] }}
            >
              <EditableText
                value={item.value}
                onChange={item.onChange || (() => {})}
                maxLength={24}
                placeholder="키워드"
                fieldKey={`emphasis-${index}`}
              />
            </span>
          ))}
        </div>
      </div>
      <div className="relative flex flex-col justify-center">
        <BigNumber value="01" />
        <div className="mt-4">
          <MetricLine page={page} />
        </div>
        <div className="mt-10">
          <CalloutLine page={page} />
        </div>
      </div>
    </div>
  );
}

function ProfileSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div className="grid h-full grid-cols-[0.92fr_1.08fr] gap-10 overflow-hidden px-14 pb-6 pt-14">
      <div className="flex min-w-0 flex-col justify-center overflow-hidden">
        <TitleBlock page={page} />
        <p className="mt-6 whitespace-pre-line break-keep text-[14px] font-bold leading-7 text-slate-700">
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={220} multiline placeholder="본문" fieldKey="narrative" />
        </p>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-7 overflow-hidden">
        <RoleBars page={page} />
        <TimelineLine page={page} />
      </div>
    </div>
  );
}

function SkillsSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div className="grid h-full grid-cols-[0.78fr_1.22fr] gap-10 overflow-hidden px-14 pb-6 pt-14">
      <div className="flex min-w-0 flex-col justify-center overflow-hidden">
        <TitleBlock page={page} />
        <p className="mt-5 whitespace-pre-line break-keep text-[14px] font-bold leading-6 text-slate-700">
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={200} multiline placeholder="본문" fieldKey="narrative" />
        </p>
        <div className="mt-6">
          <MetricLine page={page} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-4 overflow-hidden">
        <KeywordCloud page={page} />
        <CalloutLine page={page} />
      </div>
    </div>
  );
}

function IndexSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const items = useItemsSourceOrFallback(page, "timeline", () => timelineItems(page));
  return (
    <div className="flex h-full flex-col overflow-hidden px-14 pb-6 pt-14">
      <TitleBlock page={page} />
      <div className="relative mt-16">
        <div className="absolute left-0 right-0 top-[39px] h-[3px] bg-[#b9cdae]" />
        <div className="relative grid grid-cols-5 gap-5">
          {items.slice(0, 5).map((item, index) => (
            <div key={`${item.value}-${index}`} className="min-w-0">
              <div
                className="flex h-20 w-20 items-center justify-center text-2xl font-black text-white"
                style={{ backgroundColor: ACCENT_COLORS[index % ACCENT_COLORS.length] }}
              >
                {index + 1}
              </div>
              <p className="mt-5 text-[15px] font-black leading-6 text-slate-800">
                <EditableText value={item.value} onChange={item.onChange || (() => {})} maxLength={54} fieldKey={`item-${index}`} />
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-14">
        <FlowRibbon page={page} />
      </div>
    </div>
  );
}

function CaseSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  const blocks = textBlocks(page);
  return (
    <div className="grid h-full grid-cols-[0.76fr_1.24fr] gap-8 overflow-hidden px-14 pb-6 pt-14">
      <div className="flex min-w-0 flex-col justify-center overflow-hidden">
        <TitleBlock page={page} />
        <p className="mt-5 whitespace-pre-line break-keep text-[13px] font-bold leading-6 text-slate-700">
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={200} multiline placeholder="본문" fieldKey="narrative" />
        </p>
        <div className="mt-6">
          <RoleBars page={page} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-6 overflow-hidden">
        <FlowRibbon page={page} />
        <TextList blocks={blocks} max={3} />
        <CalloutLine page={page} />
      </div>
    </div>
  );
}

function DetailSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div className="grid h-full grid-cols-[0.86fr_1.14fr] gap-10 overflow-hidden px-14 pb-6 pt-14">
      <div className="flex min-w-0 flex-col justify-center overflow-hidden">
        <TitleBlock page={page} />
        <div className="mt-6">
          <MetricLine page={page} />
        </div>
        <div className="mt-6">
          <CalloutLine page={page} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-6 overflow-hidden">
        <TimelineLine page={page} />
        <KeywordCloud page={page} />
      </div>
    </div>
  );
}

function ClosingSlide({ page }: { page: PortfolioSitePage }) {
  const patch = usePatchActivePage();
  return (
    <div className="flex h-full flex-col justify-center overflow-hidden px-16 pb-6 pt-14">
      <div className="max-w-[760px] border-l-[10px] border-[var(--portfolio-primary)] pl-9">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--portfolio-primary)]">
          <EditableText value={page.eyebrow} onChange={(v) => patch(["eyebrow"], v)} maxLength={60} placeholder="Contact" fieldKey="eyebrow" />
        </p>
        <h1
          className="mt-6 break-keep font-black text-slate-950"
          style={{
            fontSize: `${fluidTitleSize(page.title, 48, 40, 32, 26)}px`,
            lineHeight: fluidLeading(page.title, 1.04, 1.18),
          }}
        >
          <EditableText value={page.title} onChange={(v) => patch(["title"], v)} maxLength={90} placeholder="제목" fieldKey="title" />
        </h1>
        <p
          className="mt-8 whitespace-pre-line break-keep font-bold leading-9 text-slate-700"
          style={{ fontSize: `${fluidNarrativeSize(page.narrative, 18, 16, 14, 13)}px` }}
        >
          <EditableText value={page.narrative} onChange={(v) => patch(["narrative"], v)} maxLength={300} multiline placeholder="본문" fieldKey="narrative" />
        </p>
        <div className="mt-10">
          <CalloutLine page={page} />
        </div>
      </div>
    </div>
  );
}

function renderSlide(page: PortfolioSitePage) {
  const pattern = getRenderPattern(page);
  if (pattern === "hero-statement") return <HeroStatementCompositionSlide page={page} />;
  if (pattern === "split-proof") return <SplitProofCompositionSlide page={page} />;
  if (pattern === "diagonal-flow") return <DiagonalFlowCompositionSlide page={page} />;
  if (pattern === "metric-spotlight") return <MetricSpotlightCompositionSlide page={page} />;
  if (pattern === "radial-map") return <RadialMapCompositionSlide page={page} />;
  if (pattern === "timeline-track") return <TimelineTrackCompositionSlide page={page} />;
  if (pattern === "evidence-wall") return <EvidenceWallCompositionSlide page={page} />;
  if (pattern === "closing-signal") return <ClosingSignalCompositionSlide page={page} />;
  if (page.type === "cover") return <CoverSlide page={page} />;
  if (page.type === "profile") return <ProfileSlide page={page} />;
  if (page.type === "skills") return <SkillsSlide page={page} />;
  if (page.type === "project-index") return <IndexSlide page={page} />;
  if (page.type === "project-detail") return <DetailSlide page={page} />;
  if (page.type === "contact") return <ClosingSlide page={page} />;
  return <CaseSlide page={page} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// 새 디자인 렌더러 dispatch — rendererId 가 지정되어 있으면 그에 맞는
// 별도 렌더러 컴포넌트를 사용. 없으면 기존 inner 렌더러 사용.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Dispatch — rendererId 에 맞는 디자인 렌더러를 골라 렌더.
 * onPrintRequest 가 주어지면 각 렌더러의 RendererShell 헤더 PDF 버튼에 노출됨.
 */
function PortfolioSiteRendererDispatch(
  props: PortfolioSiteRendererProps & { onPrintRequest?: () => void },
) {
  const rendererId = props.document.rendererId;
  const shared = {
    document: props.document,
    className: props.className,
    activeIndex: props.activeIndex,
    onActiveIndexChange: props.onActiveIndexChange,
    hideHeader: props.hideHeader,
    hideThumbnails: props.hideThumbnails,
    disableKeyboardNav: props.disableKeyboardNav,
    includeHiddenPages: props.includeHiddenPages,
    onPrintRequest: props.onPrintRequest,
  };

  if (rendererId === "minimal-mono") return <MinimalMonoRenderer {...shared} />;
  if (rendererId === "editorial-magazine") return <EditorialMagazineRenderer {...shared} />;
  if (rendererId === "brutalist-tech") return <BrutalistTechRenderer {...shared} />;
  if (rendererId === "soft-pastel-card") return <SoftPastelCardRenderer {...shared} />;
  if (rendererId === "terminal-code") return <TerminalCodeRenderer {...shared} />;
  if (rendererId === "notion-document") return <NotionDocumentRenderer {...shared} />;
  if (rendererId === "gallery-mood") return <GalleryMoodRenderer {...shared} />;
  return (
    <RendererContext.Provider value={{ templateId: props.document.templateId }}>
      <PortfolioSiteRendererInner {...props} onPrintRequest={props.onPrintRequest} />
    </RendererContext.Provider>
  );
}

export function PortfolioSiteRenderer(props: PortfolioSiteRendererProps) {
  // ─── PDF 출력 ───
  // 클릭 → printing=true → 모든 페이지 stack 렌더 → window.print()
  // afterprint 이벤트로 다시 false. CSS 가 print 시 chrome 숨기고 페이지 break 처리.
  const [printing, setPrinting] = useState(false);
  const pagesForPrint = useMemo(() => {
    const all = props.document.pages || [];
    return all.filter((p) => p.visible !== false);
  }, [props.document.pages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAfter = () => setPrinting(false);
    window.addEventListener("afterprint", onAfter);
    return () => window.removeEventListener("afterprint", onAfter);
  }, []);

  const triggerPrint = useCallback(async () => {
    if (typeof window === "undefined") return;
    setPrinting(true);
    // 두 번 RAF — 모든 print-deck 자식 mount + style 적용 보장
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    // 폰트 로딩 완료 대기 — 안 그러면 PDF 에 폰트 깨질 수 있음
    try {
      await (window.document as Document & { fonts?: { ready?: Promise<void> } }).fonts
        ?.ready;
    } catch {
      /* fonts API 없을 수도 — 무시 */
    }
    try {
      window.print();
    } catch (e) {
      console.error("print failed", e);
      setPrinting(false);
    }
  }, []);

  // autoPrint — 마운트 직후 자동 트리거
  useEffect(() => {
    if (!props.autoPrint) return;
    // 디자인/폰트 안정화 시간 — 약간 대기 후 print
    const t = window.setTimeout(() => {
      void triggerPrint();
    }, 500);
    return () => window.clearTimeout(t);
  }, [props.autoPrint, triggerPrint]);

  return (
    <EditableProvider
      enabled={Boolean(props.editingEnabled)}
      patch={props.onPatchActivePage}
    >
      {/* 화면용 — 평소엔 보임, 인쇄 시 CSS 로 숨김. */}
      <PortfolioSiteRendererDispatch {...props} />

      {/* 인쇄용 — body 직계로 portal. 그래야 print CSS 가 다른 body 자식을
          display:none 으로 완전히 layout 공간까지 제거 가능 (visibility:hidden 만
          하면 공간이 남아서 빈 페이지가 잔뜩 생김). */}
      {printing && typeof window !== "undefined"
        ? createPortal(
            <div className="portfolio-renderer-print-deck" aria-hidden>
              {pagesForPrint.map((p, i) => (
                <div key={p.id} className="portfolio-renderer-print-page">
                  <PortfolioSiteRendererDispatch
                    document={props.document}
                    activeIndex={i}
                    hideHeader
                    hideThumbnails
                    disableKeyboardNav
                  />
                </div>
              ))}
            </div>,
            window.document.body,
          )
        : null}
    </EditableProvider>
  );
}

function PortfolioSiteRendererInner({
  document,
  className,
  activeIndex,
  onActiveIndexChange,
  hideHeader,
  hideThumbnails,
  disableKeyboardNav,
  includeHiddenPages,
  onPrintRequest,
}: PortfolioSiteRendererProps & { onPrintRequest?: () => void }) {
  const pages = useMemo(
    () =>
      (document.pages?.length ? document.pages : document.sections.map(sectionToSitePage)).filter(
        (page) => includeHiddenPages || page.visible !== false,
      ),
    [document.pages, document.sections, includeHiddenPages],
  );
  const [currentIndex, setCurrentIndex] = useRendererPageIndex(
    { activeIndex, onActiveIndexChange },
    pages.length,
  );
  const page = pages[Math.min(currentIndex, Math.max(0, pages.length - 1))];

  const template = getPortfolioTemplate(document.templateId);
  const visualStyle: PortfolioTemplateVisualStyle = template.blueprint.visualStyle || {
    headingFamily: "Pretendard, system-ui, sans-serif",
    bodyFamily: "Pretendard, system-ui, sans-serif",
    headingWeight: 900,
    headingTracking: "normal",
    align: "left",
    density: "balanced",
    emphasis: "bar",
  };

  useEffect(() => {
    if (!visualStyle.googleFontsHref || typeof window === "undefined") return;
    const id = `dibut-template-font-${document.templateId}`;
    if (window.document.getElementById(id)) return;
    const link = window.document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = visualStyle.googleFontsHref;
    window.document.head.appendChild(link);
  }, [visualStyle.googleFontsHref, document.templateId]);

  const themeStyle = {
    "--portfolio-primary": document.theme.primary,
    "--portfolio-accent": document.theme.accent,
    "--portfolio-background": document.theme.background,
    "--portfolio-surface": document.theme.surface,
    "--portfolio-text": document.theme.text,
    "--portfolio-muted": document.theme.muted,
    "--portfolio-font-heading": visualStyle.headingFamily,
    "--portfolio-font-body": visualStyle.bodyFamily,
    fontFamily: visualStyle.bodyFamily,
    color: document.theme.text,
  } as CSSProperties;

  // Bold Showcase 처럼 어두운 배경 템플릿은 슬라이드 캔버스만 다크
  const isDarkTemplate = ["visual-showcase"].includes(document.templateId);

  if (!page) {
    return <RendererEmptyState className={className} />;
  }

  return (
    <RendererShell
      document={document}
      pages={pages}
      index={currentIndex}
      setIndex={setCurrentIndex}
      className={className}
      hideHeader={hideHeader}
      hideThumbnails={hideThumbnails}
      disableKeyboardNav={disableKeyboardNav}
      onPrintRequest={onPrintRequest}
    >
      <div
        className={cn(
          "portfolio-site-deck relative w-full overflow-hidden rounded-lg border shadow-[0_24px_70px_rgba(15,23,42,0.16)]",
          isDarkTemplate ? "border-slate-700 bg-slate-900" : "border-[#d8e4d0] bg-white",
        )}
        style={{ ...themeStyle, maxWidth: "min(1120px, calc(177.78vh - 220px))" }}
      >
        <style jsx global>{`
          .portfolio-site-deck h1,
          .portfolio-site-deck h2,
          .portfolio-site-deck h3 {
            font-family: var(--portfolio-font-heading);
          }
        `}</style>
        <div className="aspect-[16/9] w-full">
          <DeckShell page={page} index={currentIndex} total={pages.length} templateId={document.templateId}>
            {renderSlide(page)}
          </DeckShell>
        </div>
      </div>
    </RendererShell>
  );
}
