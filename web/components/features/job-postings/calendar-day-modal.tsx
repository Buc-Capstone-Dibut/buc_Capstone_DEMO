"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ExternalLink } from "lucide-react";
import type { CalendarEvent } from "./job-posting-calendar";

export function CalendarDayModal({
  open,
  onOpenChange,
  date,
  events,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: CalendarEvent[];
  onCreate?: () => void;
}) {
  if (!date) return null;
  const dateLabel = date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const sameDay = events.filter((e) => {
    const d = new Date(e.start);
    return (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {dateLabel}
          </DialogTitle>
        </DialogHeader>
        {sameDay.length > 0 ? (
          <div className="space-y-2">
            {sameDay.map((e) => (
              <div key={e.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {e.company} · {e.role}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(e.start).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <Badge variant="secondary" className="ml-1">
                        {labelKind(e.kind)}
                      </Badge>
                    </div>
                    {e.title && <div className="mt-1 text-xs">{e.title}</div>}
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/my/job-postings/${e.jobPostingId}`}>
                      <ExternalLink className="h-3.5 w-3.5" /> 상세
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              이 날짜에 등록된 일정이 없습니다.
            </p>
            {onCreate && (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onCreate();
                }}
                size="sm"
                className="mt-3"
              >
                새 공고 등록하기
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function labelKind(k: string) {
  return k === "deadline"
    ? "마감"
    : k === "document_due"
      ? "서류"
      : k === "interview"
        ? "면접"
        : "기타";
}
