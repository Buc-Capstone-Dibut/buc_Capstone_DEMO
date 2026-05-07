"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface ProjectArchiveEmptyStateProps {
  onAddNew: () => void;
  onLoadSampleData: () => void;
  isLoadingSample?: boolean;
}

export function ProjectArchiveEmptyState({
  onAddNew,
  onLoadSampleData,
  isLoadingSample = false,
}: ProjectArchiveEmptyStateProps) {
  return (
    <div className="relative z-10 mx-auto flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/60 py-20 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="mb-4 font-medium text-slate-500">아직 등록된 프로젝트가 없습니다.</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onAddNew} variant="outline" className="rounded-lg">
          새 프로젝트 추가하기
        </Button>
        <Button
          onClick={onLoadSampleData}
          disabled={isLoadingSample}
          className="gap-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
        >
          <Sparkles className="h-4 w-4" />
          {isLoadingSample ? "추가 중" : "샘플 데이터 불러오기"}
        </Button>
      </div>
    </div>
  );
}
