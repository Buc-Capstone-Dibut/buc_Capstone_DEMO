"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  JobPostingRecord,
  JobPostingStatus,
  ScheduleRecord,
} from "@/lib/job-postings/types";
import {
  KIND_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/job-postings/visual-tokens";

const STATUS_OPTIONS: JobPostingStatus[] = [
  "active",
  "applied",
  "interviewing",
  "closed",
  "archived",
];

function nextSchedule(schedules: ScheduleRecord[] | undefined) {
  if (!schedules?.length) return null;
  const now = Date.now();
  return (
    schedules
      .filter((s) => new Date(s.startAt).getTime() >= now)
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0] ?? null
  );
}

function dDay(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

interface JobPostingCardProps {
  posting: JobPostingRecord;
  onToggleFavorite?: (id: string, next: boolean) => void;
  onChangeStatus?: (id: string, next: JobPostingStatus) => void;
}

export function JobPostingCard({
  posting,
  onToggleFavorite,
  onChangeStatus,
}: JobPostingCardProps) {
  const next = nextSchedule(posting.schedules);
  const fav = posting.isFavorite;
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-sm border bg-background transition-colors",
        "hover:border-foreground/20",
        fav && "border-amber-300/80",
      )}
    >
      {/* 헤더: 회사 · 직무 · 즐겨찾기 */}
      <header className="flex items-start gap-2 border-b border-dashed border-border/70 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {posting.companyName}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-semibold leading-snug text-foreground">
            {posting.roleTitle}
          </h3>
        </div>
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(posting.id, !fav);
            }}
            aria-label={fav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            aria-pressed={fav}
            className="-mr-1 -mt-1 rounded-sm p-1.5 transition-colors hover:bg-muted"
          >
            <Star
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                fav
                  ? "fill-amber-400 text-amber-500"
                  : "text-muted-foreground/60 hover:text-amber-400",
              )}
              aria-hidden
            />
          </button>
        )}
      </header>

      {/* 메타 표: 상태 · 다음 일정 */}
      <dl className="divide-y divide-dashed divide-border/70 text-xs">
        <div className="grid grid-cols-[3.5rem_1fr]">
          <dt className="bg-muted/30 px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            상태
          </dt>
          <dd className="flex items-center px-3 py-1.5">
            {onChangeStatus ? (
              <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset transition-colors hover:bg-muted/40",
                      STATUS_TONE[posting.status],
                    )}
                    aria-label="상태 변경"
                  >
                    {STATUS_LABEL[posting.status]}
                    <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-36 rounded-sm p-1"
                  align="start"
                  sideOffset={4}
                >
                  <ul className="text-sm">
                    {STATUS_OPTIONS.map((opt) => {
                      const selected = posting.status === opt;
                      return (
                        <li key={opt}>
                          <button
                            type="button"
                            onClick={() => {
                              onChangeStatus(posting.id, opt);
                              setStatusOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                              selected && "bg-muted/60 font-medium",
                            )}
                          >
                            {STATUS_LABEL[opt]}
                            {selected && (
                              <Check className="h-3 w-3" aria-hidden />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </PopoverContent>
              </Popover>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                  STATUS_TONE[posting.status],
                )}
              >
                {STATUS_LABEL[posting.status]}
              </span>
            )}
          </dd>
        </div>
        <div className="grid grid-cols-[3.5rem_1fr]">
          <dt className="bg-muted/30 px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            일정
          </dt>
          <dd className="flex items-center gap-1.5 px-3 py-1.5">
            <CalendarIcon
              className="h-3 w-3 text-muted-foreground"
              aria-hidden
            />
            {next ? (
              <>
                <span className="text-foreground/80">
                  {KIND_LABEL[next.kind] ?? "일정"}
                </span>
                <span className="font-semibold text-foreground tabular-nums">
                  {dDay(next.startAt)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/70">예정 없음</span>
            )}
          </dd>
        </div>
        {posting.techStack.length > 0 && (
          <div className="grid grid-cols-[3.5rem_1fr]">
            <dt className="bg-muted/30 px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
              기술
            </dt>
            <dd className="flex flex-wrap items-center gap-1 px-3 py-1.5">
              {posting.techStack.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="rounded-sm bg-muted px-1.5 py-0.5 text-[10.5px] text-foreground/80"
                >
                  {t}
                </span>
              ))}
              {posting.techStack.length > 4 && (
                <span className="text-[10.5px] text-muted-foreground">
                  +{posting.techStack.length - 4}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {/* 액션 푸터 */}
      <footer className="mt-auto flex items-center justify-between gap-1.5 border-t bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-7 rounded-sm px-2 text-[11px] text-foreground/80"
          >
            <Link href={`/my/job-postings/${posting.id}`}>상세</Link>
          </Button>
          {posting.postingUrl && (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-7 w-7 rounded-sm p-0 text-muted-foreground"
            >
              <a
                href={posting.postingUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="원문 공고 열기"
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </Button>
          )}
        </div>
        <Button
          asChild
          size="sm"
          className="h-7 rounded-sm px-2.5 text-[11px]"
          disabled={interviewLoading}
          onClick={() => setInterviewLoading(true)}
        >
          <Link
            href={`/interview/posting/setup?import=job_posting&postingId=${posting.id}`}
            aria-label="이 공고로 모의면접 시작"
          >
            {interviewLoading ? (
              <Loader2
                className="mr-1 h-3 w-3 animate-spin"
                aria-hidden
              />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" aria-hidden />
            )}
            모의면접
          </Link>
        </Button>
      </footer>
    </article>
  );
}
