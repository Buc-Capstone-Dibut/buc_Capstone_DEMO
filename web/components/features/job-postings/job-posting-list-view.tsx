"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  FolderKanban,
  Layers,
  MoreHorizontal,
  PenLine,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type {
  JobPostingRecord,
  JobPostingStatus,
  ScheduleRecord,
} from "@/lib/job-postings/types";
import {
  STATUS_BAR,
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

function nextSchedule(schedules: ScheduleRecord[] | undefined): ScheduleRecord | null {
  if (!schedules?.length) return null;
  const now = Date.now();
  return (
    schedules
      .filter((s) => new Date(s.startAt).getTime() >= now)
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0] ?? null
  );
}

function dDay(iso: string): string {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function scheduleLabel(s: ScheduleRecord): string {
  if (s.title) return s.title;
  if (s.kind === "interview") return "면접";
  if (s.kind === "deadline") return "마감";
  if (s.kind === "document_due") return "서류 마감";
  return "일정";
}

interface JobPostingListViewProps {
  postings: JobPostingRecord[];
  onToggleFavorite: (id: string, next: boolean) => void;
  onChangeStatus?: (id: string, next: JobPostingStatus) => void;
  onDelete: (id: string) => void;
}

export function JobPostingListView({
  postings,
  onToggleFavorite,
  onChangeStatus,
  onDelete,
}: JobPostingListViewProps) {
  const router = useRouter();
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);

  if (postings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1.5 p-0"></TableHead>
            <TableHead className="w-10 px-2"></TableHead>
            <TableHead>회사</TableHead>
            <TableHead>직무</TableHead>
            <TableHead className="w-24">상태</TableHead>
            <TableHead className="w-32">다음 일정</TableHead>
            <TableHead>기술스택</TableHead>
            <TableHead className="w-32">연결</TableHead>
            <TableHead className="w-40 text-right">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {postings.map((posting) => {
            const next = nextSchedule(posting.schedules);
            const detailHref = `/my/job-postings/${posting.id}`;
            return (
              <TableRow
                key={posting.id}
                className="group cursor-pointer"
                onClick={() => router.push(detailHref)}
              >
                {/* 좌측 상태 액센트 바 */}
                <TableCell className="p-0">
                  <span
                    aria-hidden
                    className={cn(
                      "block h-full",
                      posting.isFavorite
                        ? "w-[5px] bg-amber-400"
                        : cn("w-[3px]", STATUS_BAR[posting.status]),
                    )}
                  />
                </TableCell>
                <TableCell className="px-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(posting.id, !posting.isFavorite);
                    }}
                    aria-label={posting.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                    className="rounded-md p-1 hover:bg-muted"
                  >
                    <Star
                      className={cn(
                        "h-4 w-4 transition-colors",
                        posting.isFavorite
                          ? "fill-amber-400 text-amber-500"
                          : "text-muted-foreground/60 hover:text-amber-400",
                      )}
                    />
                  </button>
                </TableCell>
                <TableCell className="font-semibold">
                  <div className="max-w-[200px] truncate">{posting.companyName}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div
                    className={cn(
                      "max-w-[220px] truncate",
                      posting.isFavorite &&
                        "text-foreground underline decoration-amber-400 decoration-2 underline-offset-4",
                    )}
                  >
                    {posting.roleTitle}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {onChangeStatus ? (
                    <Popover
                      open={openStatusId === posting.id}
                      onOpenChange={(o) =>
                        setOpenStatusId(o ? posting.id : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors hover:bg-muted/40",
                            STATUS_TONE[posting.status],
                          )}
                          aria-label="상태 변경"
                        >
                          {STATUS_LABEL[posting.status]}
                          <ChevronDown
                            className="h-3 w-3 opacity-70"
                            aria-hidden
                          />
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
                                    setOpenStatusId(null);
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
                        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                        STATUS_TONE[posting.status],
                      )}
                    >
                      {STATUS_LABEL[posting.status]}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {next ? (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        {scheduleLabel(next)}
                      </span>
                      <span className="text-sm font-medium">{dDay(next.startAt)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {posting.techStack.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-foreground/70"
                      >
                        {t}
                      </span>
                    ))}
                    {posting.techStack.length > 3 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{posting.techStack.length - 3}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <AttachmentChips attachments={posting.attachments} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button asChild size="sm" variant="ghost" className="h-8">
                      <Link href={`/interview/posting/setup?import=job_posting&postingId=${posting.id}`}>
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        모의면접
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="더보기"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => router.push(detailHref)}>
                          상세 보기
                        </DropdownMenuItem>
                        {posting.postingUrl && (
                          <DropdownMenuItem
                            onSelect={() => window.open(posting.postingUrl!, "_blank")}
                          >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                            원문 열기
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => onDelete(posting.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function AttachmentChips({
  attachments,
}: {
  attachments: JobPostingRecord["attachments"];
}) {
  const counts = { resume: 0, cover_letter: 0, portfolio: 0, project: 0 };
  (attachments ?? []).forEach((a) => {
    if (a.attachmentType in counts) {
      counts[a.attachmentType as keyof typeof counts] += 1;
    }
  });
  const items = [
    { key: "resume" as const, label: "이력서", icon: <FileText className="h-3 w-3" /> },
    { key: "cover_letter" as const, label: "자소서", icon: <PenLine className="h-3 w-3" /> },
    { key: "portfolio" as const, label: "포트폴리오", icon: <Layers className="h-3 w-3" /> },
    { key: "project" as const, label: "프로젝트", icon: <FolderKanban className="h-3 w-3" /> },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 text-[10.5px]">
      {items.map(({ key, label, icon }) => {
        const c = counts[key];
        const has = c > 0;
        return (
          <span
            key={key}
            title={has ? `${label} ${c}` : `${label} 없음`}
            className={cn(
              "inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5",
              has ? "bg-muted text-foreground/90" : "text-muted-foreground/40",
            )}
          >
            {icon}
            {has && c > 1 && (
              <span className="font-semibold tabular-nums">{c}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
