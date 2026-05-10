"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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

const TEXT_ROLE_LABEL: Record<string, string> = {
  headline: "핵심 메시지",
  summary: "요약",
  problem: "문제",
  role: "역할",
  solution: "해결",
  result: "결과",
  lesson: "배운 점",
  body: "본문",
};

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
    layout:
      type === "cover"
        ? "cover-focus"
        : type === "profile"
          ? "profile-summary"
          : type === "skills"
            ? "skills-grid"
            : type === "project-index"
              ? "project-index"
              : type === "contact"
                ? "closing"
                : type === "experience" || type === "retrospective"
                  ? "timeline"
                  : "case-study",
    image: section.image,
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

function metricBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "metric");
}

function tagBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "tags" && block.items?.length);
}

function timelineBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "timeline" && block.items?.length);
}

function firstText(page: PortfolioSitePage) {
  return textBlocks(page)[0]?.content || page.subtitle || "";
}

function Tags({ block }: { block: PortfolioSiteBlock }) {
  const items = block.items || [];
  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 12).map((item) => (
        <span
          key={item}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Metric({ block }: { block: PortfolioSiteBlock }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {block.label || "Metric"}
      </p>
      <strong className="mt-2 block truncate text-2xl font-black text-[var(--portfolio-primary)]">
        {block.value || "-"}
      </strong>
      {block.caption ? (
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
          {block.caption}
        </p>
      ) : null}
    </div>
  );
}

function Timeline({ block }: { block: PortfolioSiteBlock }) {
  const items = block.items || [];
  if (!items.length) return null;

  return (
    <ol className="space-y-2">
      {items.slice(0, 6).map((item, index) => (
        <li key={`${item}-${index}`} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--portfolio-primary)] text-xs font-black text-white">
            {index + 1}
          </span>
          <p className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
            {item}
          </p>
        </li>
      ))}
    </ol>
  );
}

function TextBlock({ block, prominent = false }: { block: PortfolioSiteBlock; prominent?: boolean }) {
  if (!block.content?.trim()) return null;
  const label = block.label || (block.role ? TEXT_ROLE_LABEL[block.role] : "");

  return (
    <div className="min-w-0">
      {label ? (
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--portfolio-primary)]">
          {label}
        </p>
      ) : null}
      <p
        className={cn(
          "whitespace-pre-line font-semibold leading-7 text-slate-700",
          prominent ? "text-lg leading-8 text-slate-900" : "text-sm",
        )}
      >
        {block.content}
      </p>
    </div>
  );
}

function CoverPage({ page }: { page: PortfolioSitePage }) {
  const tags = tagBlocks(page)[0];
  const metrics = metricBlocks(page);
  const text = textBlocks(page);
  const timeline = timelineBlocks(page)[0];

  return (
    <div className="grid h-full min-h-0 gap-8 p-8 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)] md:p-12">
      <div className="flex min-w-0 flex-col justify-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--portfolio-primary)]">
          {page.eyebrow || "Portfolio"}
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-slate-950 md:text-5xl">
          {page.title}
        </h1>
        {page.subtitle ? (
          <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-slate-600">
            {page.subtitle}
          </p>
        ) : null}
        <div className="mt-7 space-y-4">
          {text.slice(0, 2).map((block, index) => (
            <TextBlock key={block.id} block={block} prominent={index === 0} />
          ))}
        </div>
        {tags ? <div className="mt-8"><Tags block={tags} /></div> : null}
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-4">
        {metrics.length ? (
          <div className="grid grid-cols-2 gap-3">
            {metrics.slice(0, 2).map((block) => (
              <Metric key={block.id} block={block} />
            ))}
          </div>
        ) : null}
        {timeline ? (
          <div className="rounded-lg border border-[#d8e4d0] bg-white/90 p-5 shadow-sm">
            <Timeline block={timeline} />
          </div>
        ) : (
          <div className="rounded-lg border border-[#d8e4d0] bg-white/90 p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--portfolio-primary)]">
              Portfolio Structure
            </p>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
              프로젝트마다 배경, 담당 역할, 해결 방식, 결과를 분리해 읽히도록 구성했습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SkillsPage({ page }: { page: PortfolioSitePage }) {
  const tags = tagBlocks(page)[0];
  const metrics = metricBlocks(page);

  return (
    <div className="grid h-full gap-8 p-8 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:p-12">
      <div className="flex min-w-0 flex-col justify-center">
        <PageHeading page={page} />
        <div className="mt-8 space-y-5">
          {textBlocks(page).slice(0, 2).map((block, index) => (
            <TextBlock key={block.id} block={block} prominent={index === 0} />
          ))}
        </div>
        {metrics.length ? (
          <div className="mt-8 grid grid-cols-2 gap-3">
            {metrics.slice(0, 2).map((block) => (
              <Metric key={block.id} block={block} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex min-h-0 items-center">
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
          {(tags?.items || []).slice(0, 12).map((item) => (
            <div
              key={item}
              className="flex min-h-[74px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-center text-sm font-black text-slate-800 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectIndexPage({ page }: { page: PortfolioSitePage }) {
  const timeline = timelineBlocks(page)[0];
  const tags = tagBlocks(page)[0];

  return (
    <div className="grid h-full gap-8 p-8 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:p-12">
      <div className="flex min-w-0 flex-col justify-center">
        <PageHeading page={page} />
        {tags ? <div className="mt-8"><Tags block={tags} /></div> : null}
      </div>
      <div className="flex min-h-0 items-center">
        {timeline ? <Timeline block={timeline} /> : null}
      </div>
    </div>
  );
}

function CaseStudyPage({ page }: { page: PortfolioSitePage }) {
  const text = textBlocks(page);
  const tags = tagBlocks(page)[0];
  const metrics = metricBlocks(page);

  return (
    <div className="grid h-full gap-7 p-8 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] md:p-12">
      <div className="flex min-w-0 flex-col justify-center">
        <PageHeading page={page} />
        {tags ? <div className="mt-5"><Tags block={tags} /></div> : null}
        {metrics.length ? (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {metrics.slice(0, 2).map((block) => (
              <Metric key={block.id} block={block} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="grid min-h-0 content-center gap-4">
        {text.slice(0, 5).map((block, index) => (
          <div key={block.id} className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <TextBlock block={block} prominent={index === 0 && text.length <= 2} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailPage({ page }: { page: PortfolioSitePage }) {
  const timeline = timelineBlocks(page)[0];
  const metrics = metricBlocks(page);
  const text = textBlocks(page);

  return (
    <div className="grid h-full gap-8 p-8 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:p-12">
      <div className="flex min-w-0 flex-col justify-center">
        <PageHeading page={page} />
        {metrics.length ? (
          <div className="mt-8 grid grid-cols-2 gap-3">
            {metrics.slice(0, 2).map((block) => (
              <Metric key={block.id} block={block} />
            ))}
          </div>
        ) : null}
        <div className="mt-7 space-y-4">
          {text.slice(0, 2).map((block) => (
            <TextBlock key={block.id} block={block} />
          ))}
        </div>
      </div>
      <div className="flex min-h-0 items-center">
        {timeline ? <Timeline block={timeline} /> : null}
      </div>
    </div>
  );
}

function ProfilePage({ page }: { page: PortfolioSitePage }) {
  const timeline = timelineBlocks(page)[0];

  return (
    <div className="grid h-full gap-8 p-8 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:p-12">
      <div className="flex min-w-0 flex-col justify-center">
        <PageHeading page={page} />
        <div className="mt-7 space-y-5">
          {textBlocks(page).slice(0, 2).map((block, index) => (
            <TextBlock key={block.id} block={block} prominent={index === 0} />
          ))}
        </div>
      </div>
      <div className="flex min-h-0 items-center">
        {timeline ? (
          <div className="w-full rounded-lg border border-[#d8e4d0] bg-white/90 p-5 shadow-sm">
            <Timeline block={timeline} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ClosingPage({ page }: { page: PortfolioSitePage }) {
  const tags = tagBlocks(page)[0];

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center md:p-12">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--portfolio-primary)]">
        {page.eyebrow || "Contact"}
      </p>
      <h2 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-slate-950 md:text-5xl">
        {page.title}
      </h2>
      <p className="mt-6 whitespace-pre-line text-lg font-bold leading-9 text-slate-600">
        {firstText(page)}
      </p>
      {tags ? <div className="mt-8"><Tags block={tags} /></div> : null}
    </div>
  );
}

function PageHeading({ page }: { page: PortfolioSitePage }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--portfolio-primary)]">
        {page.eyebrow || PAGE_LABEL[page.type]}
      </p>
      <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 md:text-4xl">
        {page.title}
      </h2>
      {page.subtitle ? (
        <p className="mt-3 text-base font-bold leading-7 text-slate-500">{page.subtitle}</p>
      ) : null}
    </div>
  );
}

function renderPage(page: PortfolioSitePage) {
  if (page.type === "cover") return <CoverPage page={page} />;
  if (page.type === "profile") return <ProfilePage page={page} />;
  if (page.type === "skills") return <SkillsPage page={page} />;
  if (page.type === "project-index") return <ProjectIndexPage page={page} />;
  if (page.type === "project-detail" || page.type === "experience" || page.type === "retrospective") {
    return <DetailPage page={page} />;
  }
  if (page.type === "contact") return <ClosingPage page={page} />;
  return <CaseStudyPage page={page} />;
}

export function PortfolioSiteRenderer({
  document,
  className,
}: PortfolioSiteRendererProps) {
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
    "--portfolio-surface": document.theme.surface,
  } as CSSProperties;

  if (!page) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center bg-[#f5f8f1] text-slate-700", className)}>
        웹 슬라이드 페이지가 없습니다.
      </div>
    );
  }

  return (
    <section
      className={cn("min-h-screen bg-[#f5f8f1] text-slate-900", className)}
      style={themeStyle}
    >
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6">
        <div className="flex min-h-12 items-center justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--portfolio-primary)] text-white shadow-sm">
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
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e4d0] bg-white text-slate-700 shadow-sm transition hover:bg-[#eef6e8] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex((current) => Math.min(pages.length - 1, current + 1))}
              disabled={!canGoNext}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e4d0] bg-white text-slate-700 shadow-sm transition hover:bg-[#eef6e8] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="다음 페이지"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <article className="relative w-full overflow-hidden rounded-lg border border-[#d8e4d0] bg-white text-slate-950 shadow-[0_24px_70px_rgba(85,120,63,0.16)] md:aspect-[16/9]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8faf6_48%,#eef6e8_100%)]" />
            <div className="absolute left-0 top-0 h-1.5 w-full bg-[linear-gradient(90deg,var(--portfolio-primary),var(--portfolio-accent),#d7e8c2)]" />
            <div className="relative min-h-[640px] md:h-full md:min-h-0">
              {renderPage(page)}
            </div>
          </article>
        </div>

        <div className="flex min-h-14 items-center gap-2 overflow-x-auto pt-4">
          {pages.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition",
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
