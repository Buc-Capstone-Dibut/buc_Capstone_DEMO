"use client";

import { JobPostingCard } from "./job-posting-card";
import type {
  ColorPreset,
  JobPostingRecord,
  JobPostingStatus,
} from "@/lib/job-postings/types";

interface JobPostingListProps {
  postings: JobPostingRecord[];
  onToggleFavorite?: (id: string, next: boolean) => void;
  onChangeStatus?: (id: string, next: JobPostingStatus) => void;
  onPatch?: (
    id: string,
    body: { folderId?: string | null; color?: ColorPreset | null },
  ) => void | Promise<void>;
  emptyMessage?: React.ReactNode;
  /** 캘린더와 나란히 표시될 때처럼 컬럼 너비가 좁은 컨테이너에서는 1열로 강제한다. */
  compact?: boolean;
}

export function JobPostingList({
  postings,
  onToggleFavorite,
  onChangeStatus,
  onPatch,
  emptyMessage,
  compact = false,
}: JobPostingListProps) {
  if (!postings.length) {
    return (
      <div className="rounded-sm border border-dashed bg-muted/20 p-10 text-center text-sm text-muted-foreground">
        {emptyMessage ?? (
          <>
            등록된 채용공고가 없습니다. 우측 상단 <b>+ 새 공고</b> 버튼으로 첫 공고를 추가해 보세요.
          </>
        )}
      </div>
    );
  }
  return (
    <div
      className={
        compact
          ? "grid gap-2 max-w-[460px]"
          : "grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
      }
    >
      {postings.map((p) => (
        <JobPostingCard
          key={p.id}
          posting={p}
          onToggleFavorite={onToggleFavorite}
          onChangeStatus={onChangeStatus}
          onPatch={onPatch}
        />
      ))}
    </div>
  );
}
