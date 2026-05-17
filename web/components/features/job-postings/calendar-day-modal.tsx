"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  ExternalLink,
  Sparkles,
  Star,
  FileText,
  Calendar as CalendarIcon,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "./job-posting-calendar";
import type {
  AttachmentRecord,
  JobPostingRecord,
  ScheduleRecord,
} from "@/lib/job-postings/types";
import {
  KIND_COLOR,
  KIND_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/job-postings/visual-tokens";

interface CalendarDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: CalendarEvent[];
  initialPostingId?: string | null;
  onCreate?: () => void;
}

const TIME_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarDayModal({
  open,
  onOpenChange,
  date,
  events,
  initialPostingId,
  onCreate,
}: CalendarDayModalProps) {
  const sameDayEvents = useMemo(() => {
    if (!date) return [];
    return events
      .filter((e) => isSameDay(new Date(e.start), date))
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  }, [date, events]);

  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  const [posting, setPosting] = useState<JobPostingRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fallback = initialPostingId ?? sameDayEvents[0]?.jobPostingId ?? null;
    setSelectedPostingId(fallback);
  }, [open, initialPostingId, sameDayEvents]);

  const fetchPosting = useCallback(async (id: string, signal: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my/job-postings/${id}`, {
        cache: "no-store",
        signal,
      });
      const json = await res.json();
      if (json?.success) setPosting(json.data);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setPosting(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !selectedPostingId) {
      setPosting(null);
      return;
    }
    const controller = new AbortController();
    fetchPosting(selectedPostingId, controller.signal);
    return () => controller.abort();
  }, [open, selectedPostingId, fetchPosting]);

  if (!date) return null;

  const hasEvents = sameDayEvents.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pb-4 pt-5">
          <DialogTitle className="text-base font-semibold leading-tight">
            {DATE_FORMATTER.format(date)}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            {hasEvents ? `${sameDayEvents.length}건의 일정` : "등록된 일정 없음"}
          </DialogDescription>
        </DialogHeader>

        {hasEvents ? (
          <div className="grid max-h-[calc(88vh-5rem)] grid-cols-1 overflow-hidden md:grid-cols-[260px_1fr]">
            <aside className="overflow-y-auto border-b md:border-b-0 md:border-r">
              <ul className="divide-y">
                {sameDayEvents.map((event) => {
                  const active = event.jobPostingId === selectedPostingId;
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPostingId(event.jobPostingId)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                          active
                            ? "bg-accent/60"
                            : "hover:bg-muted/60",
                        )}
                        aria-current={active}
                      >
                        <span
                          aria-hidden
                          className="mt-1 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: KIND_COLOR[event.kind] }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" aria-hidden />
                              {TIME_FORMATTER.format(new Date(event.start))}
                            </span>
                            <span className="font-medium" style={{ color: KIND_COLOR[event.kind] }}>
                              {KIND_LABEL[event.kind]}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-sm font-medium text-foreground">
                            {event.company}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {event.role}
                          </div>
                        </div>
                        {active && (
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
            <PostingDetailPane posting={posting} loading={loading} />
          </div>
        ) : (
          <EmptyDayState onCreate={onCreate} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PostingDetailPane({
  posting,
  loading,
}: {
  posting: JobPostingRecord | null;
  loading: boolean;
}) {
  if (loading && !posting) {
    return (
      <div className="flex h-[420px] items-center justify-center p-6 text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  }

  if (!posting) {
    return (
      <div className="flex h-[420px] items-center justify-center p-6 text-sm text-muted-foreground">
        일정을 선택하면 채용공고 상세가 표시됩니다.
      </div>
    );
  }

  const upcomingSchedules = (posting.schedules ?? []).slice(0, 4);
  const attachments = posting.attachments ?? [];

  return (
    <section className="flex max-h-[calc(88vh-5rem)] flex-col overflow-y-auto">
      <header className="space-y-2 px-6 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {posting.companyName}
            </p>
            <h3 className="mt-0.5 truncate text-lg font-semibold text-foreground">
              {posting.roleTitle}
            </h3>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
              STATUS_TONE[posting.status],
            )}
          >
            {posting.isFavorite && (
              <Star className="h-3 w-3 fill-current" aria-hidden />
            )}
            {STATUS_LABEL[posting.status]}
          </span>
        </div>
      </header>

      <div className="space-y-5 px-6 py-5">
        {posting.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {posting.techStack.map((t) => (
              <span
                key={t}
                className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground/80"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {posting.memo && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              메모
            </h4>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {posting.memo}
            </p>
          </div>
        )}

        <ScheduleSection schedules={upcomingSchedules} />

        <AttachmentSection attachments={attachments} />
      </div>

      <Separator />

      <footer className="flex flex-wrap items-center justify-end gap-2 px-6 py-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/my/job-postings/${posting.id}`}>
            <FileText className="mr-1 h-3.5 w-3.5" aria-hidden />공고 상세 보기
          </Link>
        </Button>
        {posting.postingUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={posting.postingUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />원본 채용 페이지
            </a>
          </Button>
        )}
        <Button asChild size="sm">
          <Link
            href={`/interview/posting/setup?import=job_posting&postingId=${posting.id}`}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />이 공고로 모의면접
          </Link>
        </Button>
      </footer>
    </section>
  );
}

function ScheduleSection({ schedules }: { schedules: ScheduleRecord[] }) {
  if (!schedules.length) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        다가오는 일정
      </h4>
      <ul className="space-y-1.5">
        {schedules.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span style={{ color: KIND_COLOR[s.kind] }} className="font-medium">
              {KIND_LABEL[s.kind]}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground">
              {new Date(s.startAt).toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {s.title && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="truncate text-muted-foreground">{s.title}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AttachmentSection({ attachments }: { attachments: AttachmentRecord[] }) {
  if (!attachments.length) return null;
  const labelOf = (a: AttachmentRecord) => {
    if (a.attachmentType === "resume") return "이력서";
    if (a.attachmentType === "cover_letter") return a.coverLetterLabel ?? "자기소개서";
    return "포트폴리오";
  };
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        연결된 자료
      </h4>
      <ul className="space-y-1.5">
        {attachments.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm text-foreground/90">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span>{labelOf(a)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyDayState({
  onCreate,
  onClose,
}: {
  onCreate?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        이 날짜에 등록된 일정이 없습니다.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          닫기
        </Button>
        {onCreate && (
          <Button
            size="sm"
            onClick={() => {
              onClose();
              onCreate();
            }}
          >
            새 공고 등록
          </Button>
        )}
      </div>
    </div>
  );
}
