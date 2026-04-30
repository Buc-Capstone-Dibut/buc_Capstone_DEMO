"use client";

import { Check, FileImage, GitCommitVertical, LayoutGrid, MousePointerClick, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectArchiveViewMode } from "./project-archive.types";

interface ProjectArchiveHeaderProps {
  selectionMode: boolean;
  portfolioMode: boolean;
  viewMode: ProjectArchiveViewMode;
  projectCount: number;
  onViewModeChange: (viewMode: ProjectArchiveViewMode) => void;
  onToggleSelectionMode: () => void;
  onTogglePortfolioMode: () => void;
  onAddNew: () => void;
}

export function ProjectArchiveHeader({
  selectionMode,
  portfolioMode,
  viewMode,
  projectCount,
  onViewModeChange,
  onToggleSelectionMode,
  onTogglePortfolioMode,
  onAddNew,
}: ProjectArchiveHeaderProps) {
  return (
    <div className="mb-10 flex min-w-0 flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div className="min-w-0">
        <div className="mb-3 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {projectCount}개 프로젝트
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          프로젝트 보관함
        </h1>
        <p className="max-w-2xl text-[14px] leading-6 text-slate-500">
          프로젝트를 카드로 모아 관리하고, 필요할 때 타임라인 뷰로 흐름을 확인하세요.
        </p>
      </div>

      <div className="-mx-1 flex min-w-0 gap-3 overflow-x-auto px-1 pb-1 lg:shrink-0 lg:flex-wrap lg:overflow-visible">
        <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => onViewModeChange("cards")}
            className={cn(
              "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold transition-colors",
              viewMode === "cards"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            카드
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("timeline")}
            className={cn(
              "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold transition-colors",
              viewMode === "timeline"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
            )}
          >
            <GitCommitVertical className="h-4 w-4" />
            타임라인
          </button>
        </div>

        <Button
          onClick={onToggleSelectionMode}
          variant={selectionMode ? "default" : "outline"}
          className={cn(
            "h-12 shrink-0 gap-2 rounded-full px-6 font-bold shadow-sm transition-all duration-300",
            selectionMode
              ? "bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
          )}
        >
          {selectionMode ? <Check className="h-4 w-4" /> : <MousePointerClick className="h-4 w-4" />}
          {selectionMode ? "작성 모드 취소" : "자소서 작성 모드"}
        </Button>

        <Button
          onClick={onTogglePortfolioMode}
          variant={portfolioMode ? "default" : "outline"}
          className={cn(
            "h-12 shrink-0 gap-2 rounded-full px-6 font-bold shadow-sm transition-all duration-300",
            portfolioMode
              ? "bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
          )}
        >
          {portfolioMode ? <Check className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}
          {portfolioMode ? "포트폴리오 모드 취소" : "포트폴리오 작성 모드"}
        </Button>

        <Button
          size="lg"
          onClick={onAddNew}
          className="h-12 shrink-0 rounded-full bg-primary/10 px-6 font-bold text-primary shadow-sm transition-all hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
        >
          <Plus className="mr-2 h-5 w-5" />
          새 프로젝트
        </Button>
      </div>
    </div>
  );
}
