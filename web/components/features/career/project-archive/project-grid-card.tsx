"use client";

import { CalendarDays, Check, ChevronRight, Trash2 } from "lucide-react";
import type { ProjectInput } from "@/app/career/projects/types";
import type { ProjectAttachment } from "@/app/my/[handle]/profile-types";
import { createTechLogoImageSlot } from "@/lib/career-portfolios";
import { cn } from "@/lib/utils";

interface ProjectGridCardProps {
  project: ProjectInput;
  isActive: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  portfolioMode: boolean;
  onOpen: (project: ProjectInput) => void;
  onDelete: (id: string) => Promise<void>;
}

/**
 * 카드 표지 이미지 선택 우선순위:
 *   1) representativeImage.url
 *   2) attachments 중 isPrimary=true 이고 image
 *   3) attachments 중 첫 image
 *   4) 없으면 fallback placeholder (gradient + 이니셜)
 */
function pickCoverImage(
  representative: ProjectInput["representativeImage"],
  attachments: ProjectAttachment[] | undefined,
): { url: string; alt?: string } | null {
  if (representative?.url) {
    return { url: representative.url, alt: representative.alt };
  }
  if (!attachments?.length) return null;
  const primary = attachments.find((a) => a.isPrimary && a.kind === "image");
  if (primary) return { url: primary.url, alt: primary.alt };
  const firstImage = attachments.find((a) => a.kind === "image");
  if (firstImage) return { url: firstImage.url, alt: firstImage.alt };
  return null;
}

const COVER_GRADIENTS = [
  "from-amber-50 to-orange-100",
  "from-sky-50 to-indigo-100",
  "from-emerald-50 to-teal-100",
  "from-rose-50 to-pink-100",
  "from-violet-50 to-purple-100",
  "from-lime-50 to-green-100",
];

const COVER_ACCENT_COLORS = [
  "text-amber-700",
  "text-indigo-700",
  "text-emerald-700",
  "text-rose-700",
  "text-violet-700",
  "text-lime-700",
];

/** 안정적인 hash 로 한 카드에는 항상 같은 그라데이션이 매핑되게 한다. */
function hashIndex(seed: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % modulo;
}

export function ProjectGridCard({
  project,
  isActive,
  isSelected,
  selectionMode,
  portfolioMode,
  onOpen,
  onDelete,
}: ProjectGridCardProps) {
  const title = project.company || "(프로젝트명 없음)";
  const summary = project.description || project.result || "요약이 아직 작성되지 않았습니다.";
  const role = project.position || project.role;
  const tags = project.tags || [];
  const techStack = project.techStack || [];
  const cover = pickCoverImage(project.representativeImage, project.attachments);
  const coverSummary =
    project.description?.trim() ||
    project.result?.trim() ||
    project.role?.trim() ||
    "아직 요약이 작성되지 않았어요.";
  const seed = project.id || project.company || title;
  const gradientClass = COVER_GRADIENTS[hashIndex(seed, COVER_GRADIENTS.length)];
  const accentClass =
    COVER_ACCENT_COLORS[hashIndex(seed, COVER_ACCENT_COLORS.length)];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen(project);
      }}
      className={cn(
        "group relative flex min-h-[244px] flex-col overflow-hidden rounded-lg border bg-white text-left shadow-sm transition-all duration-200 dark:bg-slate-900/70",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30",
        isActive && !selectionMode && !portfolioMode && "border-primary/40 ring-2 ring-primary/10",
        portfolioMode && "border-primary/30 hover:border-primary hover:ring-2 hover:ring-primary/15",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/15 dark:bg-primary/10"
          : "border-slate-200 dark:border-slate-800",
      )}
    >
      {/* 카드 표지: 항상 동일한 높이를 차지해 카드 간 정렬을 통일한다. */}
      <div className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover.url}
              alt={cover.alt || `${title} 대표 이미지`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm">
              대표 이미지
            </span>
          </>
        ) : (
          <div
            className={cn(
              "relative flex h-full w-full flex-col justify-start bg-gradient-to-br px-4 py-3",
              gradientClass,
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_85%,rgba(255,255,255,0.55),transparent_60%)]"
            />
            <div className="relative">
              <p
                className={cn(
                  "line-clamp-2 text-[15px] font-black leading-tight tracking-tight",
                  accentClass,
                )}
              >
                {title}
              </p>
              <p className="mt-1 line-clamp-2 text-[11.5px] font-medium leading-snug text-slate-600/90">
                {coverSummary}
              </p>
            </div>
            <span
              className="pointer-events-none absolute bottom-2 right-3 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-white/60 backdrop-blur-sm"
              aria-hidden
            >
              <span className="inline-block h-1 w-1 rounded-full bg-slate-400" />
              임시 썸네일 · 보관 파일 추가 시 대표 이미지로 표시돼요
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="truncate">{project.period || "기간 미입력"}</span>
          </div>
          <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-snug text-slate-900 dark:text-slate-50">
            {title}
          </h3>
        </div>

        {selectionMode ? (
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-slate-300 text-transparent dark:border-slate-600",
            )}
          >
            <Check className="h-4 w-4 stroke-[3]" />
          </span>
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors group-hover:bg-slate-100 group-hover:text-primary dark:group-hover:bg-slate-800">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>

      <p className="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {summary}
      </p>

      {role ? (
        <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          역할: {role}
        </div>
      ) : null}

      {techStack.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {techStack.slice(0, 6).map((tech) => {
            const logo = createTechLogoImageSlot(tech);
            return (
              <span
                key={tech}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {logo?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo.url} alt={logo.alt || `${tech} 로고`} className="h-4 w-4 object-contain" />
                ) : null}
                {tech}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {tags.length > 0 ? (
          tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="rounded-md border border-dashed border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-400 dark:border-slate-700">
            태그 없음
          </span>
        )}
      </div>

      {!selectionMode && project.id ? (
        <span
          role="button"
          tabIndex={0}
          aria-label={`${title} 삭제`}
          onClick={(event) => {
            event.stopPropagation();
            void onDelete(project.id!);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            void onDelete(project.id!);
          }}
          className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </span>
      ) : null}
      </div>
    </div>
  );
}
