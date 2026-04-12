"use client";

import { Button } from "@/components/ui/button";

interface ExperienceTimelineEmptyStateProps {
  onAddNew: () => void;
}

export function ExperienceTimelineEmptyState({
  onAddNew,
}: ExperienceTimelineEmptyStateProps) {
  return (
    <div className="relative z-10 mx-auto flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 py-20 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="mb-4 font-medium text-slate-500">아직 등록된 경험이 없습니다.</p>
      <Button onClick={onAddNew} variant="outline" className="rounded-full">
        새 경험 추가하기
      </Button>
    </div>
  );
}
