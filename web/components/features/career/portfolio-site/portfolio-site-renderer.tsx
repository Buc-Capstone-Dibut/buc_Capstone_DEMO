"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Layers3 } from "lucide-react";
import {
  type PortfolioDocument,
  type PortfolioSection,
  type PortfolioSiteBlock,
  type PortfolioSitePage,
  type PortfolioSitePageType,
} from "@/lib/career-portfolios";
import { cn } from "@/lib/utils";

type PortfolioSiteRendererProps = {
  document: PortfolioDocument;
  readonly?: boolean;
  className?: string;
};

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
  const direction = `${page.visualDirection || ""} ${page.layout || ""}`.toLowerCase();
  if (direction.includes("matrix") || direction.includes("cluster") || direction.includes("radar")) {
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
    title: section.title || "웹 슬라이드",
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

function plainText(value?: string, max = 150) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}...`;
}

function blockText(block: PortfolioSiteBlock, max = 140) {
  return plainText(block.content || block.caption || block.value, max);
}

function pageNarrative(page: PortfolioSitePage, max = 150) {
  return plainText(
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
  children,
}: {
  page: PortfolioSitePage;
  index: number;
  total: number;
  children: ReactNode;
}) {
  const visualMode = slideVisualMode(page);

  return (
    <article className="relative h-full w-full overflow-hidden bg-[#fbfcf8] text-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8faf6_54%,#eef6e8_100%)]" />
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(85,120,63,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(85,120,63,0.075)_1px,transparent_1px)] [background-size:46px_46px]" />
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
      {visualMode === "matrix" ? (
        <div className="absolute bottom-16 right-16 h-[240px] w-[240px] border-[18px] border-[rgba(31,122,77,0.08)]" />
      ) : null}
      {visualMode === "journey" ? (
        <div className="absolute bottom-24 left-14 h-[3px] w-[46%] bg-[rgba(31,122,77,0.2)]" />
      ) : null}
      <div className="absolute left-9 top-7 flex items-center gap-3">
        <span className="h-[2px] w-14 bg-[var(--portfolio-primary)]" />
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--portfolio-primary)]">
          {page.eyebrow || PAGE_LABEL[page.type]}
        </span>
      </div>
      <div className="absolute bottom-6 left-9 right-9 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        <span>Dibut Portfolio</span>
        <span>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <div className="relative h-full w-full">{children}</div>
    </article>
  );
}

function BigNumber({ value }: { value: string }) {
  return (
    <span className="select-none text-[118px] font-black leading-none text-[var(--portfolio-primary)] opacity-[0.11]">
      {value}
    </span>
  );
}

function TextList({ blocks, max = 4 }: { blocks: PortfolioSiteBlock[]; max?: number }) {
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
              {getBlockLabel(block, `Point ${index + 1}`)}
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-700">
              {blockText(block, 115)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricLine({ page }: { page: PortfolioSitePage }) {
  const metrics = metricBlocks(page);
  if (!metrics.length) return null;

  return (
    <div className="flex gap-7">
      {metrics.slice(0, 4).map((metric) => (
        <div key={metric.id} className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
            {metric.label || "Metric"}
          </p>
          <p className="mt-1 text-3xl font-black leading-none text-[var(--portfolio-primary)]">
            {metric.value || "-"}
          </p>
          {metric.caption ? (
            <p className="mt-1 max-w-[130px] text-[11px] font-semibold leading-4 text-slate-500">
              {plainText(metric.caption, 44)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function FlowRibbon({ page }: { page: PortfolioSitePage }) {
  const items = flowItems(page);
  return (
    <div className="relative">
      <div className="absolute left-4 right-4 top-[35px] h-[2px] bg-[#b9cdae]" />
      <div className="relative grid grid-cols-4 gap-4">
        {items.slice(0, 4).map((item, index) => (
          <div key={`${item}-${index}`} className="min-w-0">
            <div
              className="flex h-16 w-16 items-center justify-center text-xl font-black text-white"
              style={{ backgroundColor: ACCENT_COLORS[index % ACCENT_COLORS.length] }}
            >
              {index + 1}
            </div>
            <p className="mt-3 text-[13px] font-black leading-5 text-slate-800">
              {plainText(item, 42)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function KeywordCloud({ page }: { page: PortfolioSitePage }) {
  const items = matrixItems(page);
  if (!items.length) return null;
  return (
    <div className="relative h-[250px]">
      <div className="absolute left-1/2 top-0 h-full w-px bg-[#c8dabc]" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-[#c8dabc]" />
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
            key={`${item}-${index}`}
            className={cn(
              "absolute max-w-[150px] px-2 py-1 text-sm font-black leading-5",
              positions[index % positions.length],
            )}
            style={{
              color: ACCENT_COLORS[index % ACCENT_COLORS.length],
              borderBottom: `3px solid ${ACCENT_COLORS[index % ACCENT_COLORS.length]}`,
            }}
          >
            {plainText(item, 30)}
          </span>
        );
      })}
    </div>
  );
}

function RoleBars({ page }: { page: PortfolioSitePage }) {
  const items = contributionBlocks(page);
  if (!items.length) return null;
  return (
    <div className="space-y-4">
      {items.slice(0, 4).map((item, index) => {
        const percent = contributionPercent(item.value);
        return (
          <div key={item.id}>
            <div className="flex items-end justify-between gap-4">
              <p className="text-[13px] font-black text-slate-800">{item.label || "기여"}</p>
              <p className="text-[12px] font-black text-slate-500">{item.value || `${percent}%`}</p>
            </div>
            <div className="mt-2 h-[5px] bg-[#dfeada]">
              <div
                className="h-full"
                style={{
                  width: `${percent}%`,
                  backgroundColor: ACCENT_COLORS[index % ACCENT_COLORS.length],
                }}
              />
            </div>
            {item.caption ? (
              <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                {plainText(item.caption, 54)}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TimelineLine({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page);
  return (
    <div className="space-y-3">
      {items.slice(0, 5).map((item, index) => (
        <div key={`${item}-${index}`} className="grid grid-cols-[42px_minmax(0,1fr)] items-start gap-4">
          <span className="text-3xl font-black leading-none text-[var(--portfolio-primary)] opacity-80">
            {String(index + 1).padStart(2, "0")}
          </span>
          <p className="border-l-2 border-[#c8dabc] pl-4 text-[13px] font-bold leading-5 text-slate-700">
            {plainText(item, 76)}
          </p>
        </div>
      ))}
    </div>
  );
}

function CalloutLine({ page }: { page: PortfolioSitePage }) {
  const callout = calloutBlocks(page)[0];
  if (!callout) return null;
  return (
    <div className="border-l-[6px] border-[#f6d46b] pl-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--portfolio-primary)]">
        {callout.label || "Key Point"}
      </p>
      <p className="mt-2 text-[15px] font-black leading-6 text-slate-800">
        {plainText(callout.content, 120)}
      </p>
    </div>
  );
}

function TitleBlock({ page }: { page: PortfolioSitePage }) {
  return (
    <div>
      {page.intent ? (
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          {plainText(page.intent, 48)}
        </p>
      ) : null}
      <h1 className="mt-3 text-[48px] font-black leading-[0.98] tracking-normal text-slate-950">
        {plainText(page.title, 68)}
      </h1>
      {page.subtitle ? (
        <p className="mt-5 max-w-[520px] text-[17px] font-bold leading-7 text-slate-600">
          {plainText(page.subtitle, 112)}
        </p>
      ) : null}
    </div>
  );
}

function CoverSlide({ page }: { page: PortfolioSitePage }) {
  return (
    <div className="grid h-full grid-cols-[1fr_340px] gap-10 px-16 pb-16 pt-20">
      <div className="flex min-w-0 flex-col justify-center border-l-[10px] border-[var(--portfolio-primary)] pl-9">
        <TitleBlock page={page} />
        <p className="mt-8 max-w-[620px] text-[18px] font-bold leading-8 text-slate-700">
          {pageNarrative(page, 170)}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          {pageEmphasis(page).slice(0, 4).map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="text-[13px] font-black uppercase tracking-[0.12em]"
              style={{ color: ACCENT_COLORS[index % ACCENT_COLORS.length] }}
            >
              {item}
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
  return (
    <div className="grid h-full grid-cols-[0.92fr_1.08fr] gap-10 px-16 pb-16 pt-20">
      <div className="flex min-w-0 flex-col justify-center">
        <TitleBlock page={page} />
        <p className="mt-8 text-[17px] font-bold leading-8 text-slate-700">
          {pageNarrative(page, 180)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-10">
        <RoleBars page={page} />
        <TimelineLine page={page} />
      </div>
    </div>
  );
}

function SkillsSlide({ page }: { page: PortfolioSitePage }) {
  return (
    <div className="grid h-full grid-cols-[0.78fr_1.22fr] gap-10 px-16 pb-16 pt-20">
      <div className="flex min-w-0 flex-col justify-center">
        <TitleBlock page={page} />
        <p className="mt-7 text-[16px] font-bold leading-7 text-slate-700">
          {pageNarrative(page, 160)}
        </p>
        <div className="mt-8">
          <MetricLine page={page} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <KeywordCloud page={page} />
        <CalloutLine page={page} />
      </div>
    </div>
  );
}

function IndexSlide({ page }: { page: PortfolioSitePage }) {
  const items = timelineItems(page);
  return (
    <div className="px-16 pb-16 pt-20">
      <TitleBlock page={page} />
      <div className="relative mt-16">
        <div className="absolute left-0 right-0 top-[39px] h-[3px] bg-[#b9cdae]" />
        <div className="relative grid grid-cols-5 gap-5">
          {items.slice(0, 5).map((item, index) => (
            <div key={`${item}-${index}`} className="min-w-0">
              <div
                className="flex h-20 w-20 items-center justify-center text-2xl font-black text-white"
                style={{ backgroundColor: ACCENT_COLORS[index % ACCENT_COLORS.length] }}
              >
                {index + 1}
              </div>
              <p className="mt-5 text-[15px] font-black leading-6 text-slate-800">
                {plainText(item, 54)}
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
  const blocks = textBlocks(page);
  return (
    <div className="grid h-full grid-cols-[0.76fr_1.24fr] gap-8 px-14 pb-14 pt-20">
      <div className="flex min-w-0 flex-col justify-center">
        <TitleBlock page={page} />
        <p className="mt-6 text-[15px] font-bold leading-7 text-slate-700">
          {pageNarrative(page, 140)}
        </p>
        <div className="mt-8">
          <RoleBars page={page} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-8">
        <FlowRibbon page={page} />
        <TextList blocks={blocks} max={4} />
        <CalloutLine page={page} />
      </div>
    </div>
  );
}

function DetailSlide({ page }: { page: PortfolioSitePage }) {
  return (
    <div className="grid h-full grid-cols-[0.86fr_1.14fr] gap-10 px-16 pb-16 pt-20">
      <div className="flex min-w-0 flex-col justify-center">
        <TitleBlock page={page} />
        <div className="mt-8">
          <MetricLine page={page} />
        </div>
        <div className="mt-8">
          <CalloutLine page={page} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-8">
        <TimelineLine page={page} />
        <KeywordCloud page={page} />
      </div>
    </div>
  );
}

function ClosingSlide({ page }: { page: PortfolioSitePage }) {
  return (
    <div className="flex h-full flex-col justify-center px-20 pb-16 pt-20">
      <div className="max-w-[760px] border-l-[10px] border-[var(--portfolio-primary)] pl-9">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--portfolio-primary)]">
          {page.eyebrow || "Contact"}
        </p>
        <h1 className="mt-6 text-[56px] font-black leading-none text-slate-950">
          {plainText(page.title, 62)}
        </h1>
        <p className="mt-8 whitespace-pre-line text-[20px] font-bold leading-9 text-slate-700">
          {pageNarrative(page, 160)}
        </p>
        <div className="mt-10">
          <CalloutLine page={page} />
        </div>
      </div>
    </div>
  );
}

function renderSlide(page: PortfolioSitePage) {
  if (page.type === "cover") return <CoverSlide page={page} />;
  if (page.type === "profile") return <ProfileSlide page={page} />;
  if (page.type === "skills") return <SkillsSlide page={page} />;
  if (page.type === "project-index") return <IndexSlide page={page} />;
  if (page.type === "project-detail") return <DetailSlide page={page} />;
  if (page.type === "contact") return <ClosingSlide page={page} />;
  return <CaseSlide page={page} />;
}

export function PortfolioSiteRenderer({ document, className }: PortfolioSiteRendererProps) {
  const pages = useMemo(
    () =>
      (document.pages?.length ? document.pages : document.sections.map(sectionToSitePage)).filter(
        (page) => page.visible !== false,
      ),
    [document.pages, document.sections],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const page = pages[Math.min(currentIndex, Math.max(0, pages.length - 1))];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < pages.length - 1;

  useEffect(() => {
    if (currentIndex <= pages.length - 1) return;
    setCurrentIndex(Math.max(0, pages.length - 1));
  }, [currentIndex, pages.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setCurrentIndex((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight") {
        setCurrentIndex((current) => Math.min(pages.length - 1, current + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pages.length]);

  const themeStyle = {
    "--portfolio-primary": document.theme.primary,
    "--portfolio-accent": document.theme.accent,
  } as CSSProperties;

  if (!page) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center bg-[#f5f8f1] text-slate-700", className)}>
        웹 슬라이드 페이지가 없습니다.
      </div>
    );
  }

  return (
    <section className={cn("min-h-screen bg-[#f5f8f1] text-slate-900", className)} style={themeStyle}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6">
        <div className="flex min-h-12 items-center justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--portfolio-primary)] text-white shadow-sm">
              <Layers3 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800">{document.sections[0]?.title || page.title}</p>
              <p className="text-xs font-semibold text-slate-500">
                {currentIndex + 1} / {pages.length}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
              disabled={!canGoPrev}
              className="flex h-9 w-9 items-center justify-center border border-[#d8e4d0] bg-white text-slate-700 shadow-sm transition hover:bg-[#eef6e8] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex((current) => Math.min(pages.length - 1, current + 1))}
              disabled={!canGoNext}
              className="flex h-9 w-9 items-center justify-center border border-[#d8e4d0] bg-white text-slate-700 shadow-sm transition hover:bg-[#eef6e8] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="다음 페이지"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className="relative w-full overflow-hidden border border-[#d8e4d0] bg-white shadow-[0_24px_70px_rgba(85,120,63,0.16)]"
            style={{ maxWidth: "min(1120px, calc(177.78vh - 300px))" }}
          >
            <div className="aspect-[16/9] w-full">
              <DeckShell page={page} index={currentIndex} total={pages.length}>
                {renderSlide(page)}
              </DeckShell>
            </div>
          </div>
        </div>

        <div className="flex min-h-14 items-center gap-2 overflow-x-auto pt-4">
          {pages.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 border px-3 text-xs font-bold transition",
                index === currentIndex
                  ? "border-[var(--portfolio-primary)] bg-white text-[var(--portfolio-primary)] shadow-sm"
                  : "border-[#d8e4d0] bg-white/75 text-slate-600 hover:bg-white hover:text-slate-900",
              )}
            >
              <span className="text-[10px] opacity-65">{String(index + 1).padStart(2, "0")}</span>
              <span className="max-w-[160px] truncate">{item.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
