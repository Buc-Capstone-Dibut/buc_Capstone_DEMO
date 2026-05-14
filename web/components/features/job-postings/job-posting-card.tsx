"use client";

import Link from "next/link";
import { Calendar, ExternalLink, Sparkles, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JobPostingRecord, ScheduleRecord } from "@/lib/job-postings/types";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/job-postings/visual-tokens";

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
  return (
    <Card
      className={cn(
        // 부드러운 hover: 살짝 떠오르는 느낌 + 그림자 강화
        "group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        // 카드 상단의 1px gradient accent (before pseudo)
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[2px]",
        "before:bg-gradient-to-r before:from-amber-300 before:via-orange-400 before:to-amber-300",
        "before:opacity-0 before:transition-opacity before:duration-200 group-hover:before:opacity-100",
        // 즐겨찾기는 좌측 4px border + 부드러운 amber ring으로 강조
        posting.isFavorite &&
          "border-l-4 border-l-amber-400 ring-1 ring-amber-200/40 before:opacity-100",
      )}
    >
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{posting.companyName}</div>
            <div className="truncate text-sm text-muted-foreground">{posting.roleTitle}</div>
          </div>
          <div className="flex items-center gap-1.5">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(posting.id, !posting.isFavorite);
                }}
                aria-label={posting.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                aria-pressed={posting.isFavorite}
                className="rounded-md p-1 transition-colors hover:bg-muted"
              >
                <Star
                  className={cn(
                    "h-4 w-4 transition-all",
                    posting.isFavorite
                      ? "fill-amber-400 text-amber-500 drop-shadow-[0_2px_4px_rgba(245,158,11,0.4)]"
                      : "text-muted-foreground hover:text-amber-400",
                  )}
                />
              </button>
            )}
            <Badge className={cn("ring-1", STATUS_TONE[posting.status])}>
              {STATUS_LABEL[posting.status]}
            </Badge>
          </div>
        </div>

        {next && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {next.title || (next.kind === "interview" ? "면접" : next.kind === "deadline" ? "마감" : "일정")}
            </span>
            <span className="font-medium">{dDay(next.startAt)}</span>
          </div>
        )}

        {posting.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {posting.techStack.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {t}
              </span>
            ))}
            {posting.techStack.length > 4 && (
              <span className="text-xs text-muted-foreground">+{posting.techStack.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/my/job-postings/${posting.id}`}>상세</Link>
            </Button>
            {posting.postingUrl && (
              <Button asChild size="sm" variant="ghost">
                <a href={posting.postingUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />원문
                </a>
              </Button>
            )}
          </div>
          <Button asChild size="sm">
            <Link href={`/interview/posting/setup?import=job_posting&postingId=${posting.id}`}>
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              모의면접
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
