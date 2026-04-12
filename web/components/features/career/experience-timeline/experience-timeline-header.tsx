"use client";

import { Check, MousePointerClick, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExperienceTimelineHeaderProps {
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onAddNew: () => void;
}

export function ExperienceTimelineHeader({
  selectionMode,
  onToggleSelectionMode,
  onAddNew,
}: ExperienceTimelineHeaderProps) {
  return (
    <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          나의 경험 타임라인
        </h1>
        <p className="max-w-2xl text-[14px] text-slate-500">
          활동을 기록하고 세부 사항을 작성하세요. 자소서 뼈대로 활용할 수 있습니다.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Button
          onClick={onToggleSelectionMode}
          variant={selectionMode ? "default" : "outline"}
          className={cn(
            "h-12 gap-2 rounded-full px-6 font-bold shadow-sm transition-all duration-300",
            selectionMode
              ? "bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
          )}
        >
          {selectionMode ? <Check className="h-4 w-4" /> : <MousePointerClick className="h-4 w-4" />}
          {selectionMode ? "작성 모드 취소" : "자소서 작성 모드"}
        </Button>

        <Button
          size="lg"
          onClick={onAddNew}
          className="h-12 shrink-0 rounded-full bg-primary/10 px-6 font-bold text-primary shadow-sm transition-all hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
        >
          <Plus className="mr-2 h-5 w-5" />
          새 경험 추가
        </Button>
      </div>
    </div>
  );
}
