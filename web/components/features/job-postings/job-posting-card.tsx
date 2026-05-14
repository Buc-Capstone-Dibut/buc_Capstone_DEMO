"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Calendar as CalendarIcon,
  ExternalLink,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JobPostingRecord, ScheduleRecord } from "@/lib/job-postings/types";
import {
  KIND_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/job-postings/visual-tokens";

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
}

export function JobPostingCard({ posting, onToggleFavorite }: JobPostingCardProps) {
  const next = nextSchedule(posting.schedules);
  const fav = posting.isFavorite;
  const [interviewLoading, setInterviewLoading] = useState(false);

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col transition-shadow duration-150 hover:shadow-md",
        fav && "ring-1 ring-amber-200",
      )}
    >
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold leading-tight text-foreground">
              {posting.companyName}
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {posting.roleTitle}
            </p>
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
              className="-mr-1 -mt-1 rounded-md p-1.5 transition-colors hover:bg-muted"
            >
              <Star
                className={cn(
                  "h-4 w-4 transition-colors",
                  fav
                    ? "fill-amber-400 text-amber-500"
                    : "text-muted-foreground/60 hover:text-amber-400",
                )}
              />
            </button>
          )}
        </header>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
              STATUS_TONE[posting.status],
            )}
          >
            {STATUS_LABEL[posting.status]}
          </span>
          {next && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3" aria-hidden />
              <span>{KIND_LABEL[next.kind] ?? "일정"}</span>
              <span className="font-semibold text-foreground tabular-nums">
                {dDay(next.startAt)}
              </span>
            </span>
          )}
        </div>

        {posting.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {posting.techStack.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-foreground/70"
              >
                {t}
              </span>
            ))}
            {posting.techStack.length > 4 && (
              <span className="text-[11px] text-muted-foreground">
                +{posting.techStack.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-1">
            <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
              <Link href={`/my/job-postings/${posting.id}`}>상세</Link>
            </Button>
            {posting.postingUrl && (
              <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                <a
                  href={posting.postingUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="원문 공고 열기"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </Button>
            )}
          </div>
          <Button
            asChild
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={interviewLoading}
            onClick={() => setInterviewLoading(true)}
          >
            <Link
              href={`/interview/posting/setup?import=job_posting&postingId=${posting.id}`}
              aria-label="이 공고로 모의면접 시작"
            >
              {interviewLoading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />
              )}
              모의면접
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
