"use client";

import Link from "next/link";
import { Calendar, ExternalLink, Sparkles, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { JobPostingRecord, ScheduleRecord } from "@/lib/job-postings/types";

const STATUS_LABEL: Record<JobPostingRecord["status"], string> = {
  active: "관심",
  applied: "지원완료",
  interviewing: "면접중",
  closed: "마감",
  archived: "보관",
};

const STATUS_TONE: Record<JobPostingRecord["status"], string> = {
  active: "bg-emerald-100 text-emerald-700",
  applied: "bg-blue-100 text-blue-700",
  interviewing: "bg-orange-100 text-orange-700",
  closed: "bg-slate-200 text-slate-700",
  archived: "bg-slate-100 text-slate-500",
};

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
        "transition hover:shadow-md",
        posting.isFavorite && "border-primary/40 ring-1 ring-primary/10",
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
                className="rounded-md p-1 hover:bg-muted"
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    posting.isFavorite
                      ? "fill-yellow-400 text-yellow-500"
                      : "text-muted-foreground",
                  )}
                />
              </button>
            )}
            <Badge className={STATUS_TONE[posting.status]}>{STATUS_LABEL[posting.status]}</Badge>
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
