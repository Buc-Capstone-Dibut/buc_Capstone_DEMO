"use client";

import { CalendarDays, Check, ChevronRight, Trash2 } from "lucide-react";
import type { ProjectInput } from "@/app/career/projects/types";
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
  const representativeImage = project.representativeImage;

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
      {representativeImage?.url ? (
        <div className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={representativeImage.url}
            alt={representativeImage.alt || `${title} 대표 이미지`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm">
            대표 이미지
          </span>
        </div>
      ) : null}

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
