"use client";

import { Button } from "@/components/ui/button";

interface ProjectArchiveEmptyStateProps {
  onAddNew: () => void;
}

export function ProjectArchiveEmptyState({
  onAddNew,
}: ProjectArchiveEmptyStateProps) {
  return (
    <div className="relative z-10 mx-auto flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60 py-20 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="mb-4 font-medium text-slate-500">아직 등록된 프로젝트가 없습니다.</p>
      <Button onClick={onAddNew} variant="outline" className="rounded-lg">
        새 프로젝트 추가하기
      </Button>
    </div>
  );
}
