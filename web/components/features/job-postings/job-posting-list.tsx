"use client";

import { JobPostingCard } from "./job-posting-card";
import type { JobPostingRecord } from "@/lib/job-postings/types";

interface JobPostingListProps {
  postings: JobPostingRecord[];
  onToggleFavorite?: (id: string, next: boolean) => void;
  emptyMessage?: React.ReactNode;
}

export function JobPostingList({
  postings,
  onToggleFavorite,
  emptyMessage,
}: JobPostingListProps) {
  if (!postings.length) {
    return (
      <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
        {emptyMessage ?? (
          <>
            등록된 채용공고가 없습니다. 우측 상단 <b>+ 새 공고</b> 버튼으로 첫 공고를 추가해 보세요.
          </>
        )}
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {postings.map((p) => (
        <JobPostingCard key={p.id} posting={p} onToggleFavorite={onToggleFavorite} />
      ))}
    </div>
  );
}
