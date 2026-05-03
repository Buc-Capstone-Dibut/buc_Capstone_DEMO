"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectArchiveSelectionBarProps {
  selectedCount: number;
  onGenerate: () => void;
  actionLabel?: string;
  disabled?: boolean;
}

export function ProjectArchiveSelectionBar({
  selectedCount,
  onGenerate,
  actionLabel = "선택한 프로젝트로 자소서 생성",
  disabled = false,
}: ProjectArchiveSelectionBarProps) {
  return (
    <div className="fixed bottom-10 left-1/2 z-[40] flex -translate-x-1/2 items-center gap-6 rounded-full border border-primary/20 bg-white/95 px-2 py-2 pl-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] backdrop-blur-xl dark:bg-slate-900/95">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
          {selectedCount}
        </div>
        <span className="whitespace-nowrap pr-2 text-[15px] font-extrabold text-slate-800 dark:text-slate-200">
          개의 프로젝트 선택됨
        </span>
      </div>

      <Button
        onClick={onGenerate}
        disabled={disabled}
        className="h-12 rounded-full bg-primary px-6 font-bold text-primary-foreground shadow-md transition-transform hover:bg-primary/90 active:scale-95"
      >
        <Sparkles className="h-5 w-5" />
        <span className="ml-2">{actionLabel}</span>
      </Button>
    </div>
  );
}
