"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  FolderClosed,
  FolderKanban,
  Layers,
  Loader2,
  Palette,
  PenLine,
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
  ColorPreset,
  JobPostingRecord,
  JobPostingStatus,
  ScheduleRecord,
} from "@/lib/job-postings/types";
import {
  COLOR_PRESET_BAR,
  COLOR_PRESET_DOT,
  COLOR_PRESET_LABEL,
  COLOR_PRESET_LIST,
  KIND_LABEL,
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

function nextSchedule(schedules: ScheduleRecord[] | undefined) {
  if (!schedules?.length) return null;
  const now = Date.now();
  return (
    schedules
      .filter((s) => new Date(s.startAt).getTime() >= now)
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0] ?? null
  );
}

function dDayInfo(iso: string): { label: string; days: number } {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days === 0) return { label: "D-Day", days: 0 };
  if (days > 0) return { label: `D-${days}`, days };
  return { label: `D+${Math.abs(days)}`, days };
}

interface JobPostingCardProps {
  posting: JobPostingRecord;
  onToggleFavorite?: (id: string, next: boolean) => void;
  onChangeStatus?: (id: string, next: JobPostingStatus) => void;
  onPatch?: (
    id: string,
    body: { folderId?: string | null; color?: ColorPreset | null },
  ) => void | Promise<void>;
}

// 카드 단위로 폴더 옵션을 가볍게 캐시 (페이지 내 여러 카드가 같이 사용)
type FolderOption = { id: string; name: string; color: ColorPreset | null };
let folderCache: FolderOption[] | null = null;
const folderListeners = new Set<(opts: FolderOption[]) => void>();
async function loadFolderOptions(): Promise<FolderOption[]> {
  if (folderCache) return folderCache;
  const res = await fetch("/api/my/job-postings/folders", { cache: "no-store" });
  const json = await res.json();
  if (json.success) {
    folderCache = (json.data?.items ?? []).map((f: any) => ({
      id: f.id,
      name: f.name,
      color: f.color,
    }));
    folderListeners.forEach((l) => l(folderCache!));
  }
  return folderCache ?? [];
}

export function JobPostingCard({
  posting,
  onToggleFavorite,
  onChangeStatus,
  onPatch,
}: JobPostingCardProps) {
  const next = nextSchedule(posting.schedules);
  const fav = posting.isFavorite;
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const attachCounts = countAttachments(posting.attachments);
  // 4종 중 0개인 항목 수 — 0이면 "준비 완료", 1+ 면 "미연결" 경고 점
  const missingCount = (Object.keys(attachCounts) as Array<
    keyof typeof attachCounts
  >).filter((k) => attachCounts[k] === 0).length;

  const dInfo = next ? dDayInfo(next.startAt) : null;
  const isUrgent = dInfo && dInfo.days >= 0 && dInfo.days <= 3;

  // 좌측 액센트 바: 사용자 색 > 즐겨찾기 amber > 상태색
  const barClass = fav
    ? "w-[5px] bg-amber-400"
    : posting.color
      ? cn("w-[4px]", COLOR_PRESET_BAR[posting.color])
      : cn("w-[3px]", STATUS_BAR[posting.status]);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border border-border/60 transition-all duration-200",
        "bg-gradient-to-br from-white to-slate-50/70 dark:from-slate-900 dark:to-slate-950/60",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_10px_-4px_rgba(15,23,42,0.06)]",
        "hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_10px_20px_-6px_rgba(15,23,42,0.10)]",
      )}
    >
      {/* 좌측 액센트 바 */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 transition-all",
          barClass,
        )}
      />

      {/* 헤더 */}
      <header className="flex items-start gap-2 border-b border-dashed border-border/70 pl-5 pr-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {posting.companyName}
          </p>
          <h3
            className={cn(
              "mt-0.5 truncate text-sm font-semibold leading-snug text-foreground",
              fav &&
                "underline decoration-amber-400 decoration-2 underline-offset-4",
            )}
          >
            {posting.roleTitle}
          </h3>
        </div>

        {/* D-day 강조 (≤ D-3) */}
        {dInfo && isUrgent && (
          <span
            className="inline-flex h-5 items-center rounded-sm bg-red-50 px-1.5 text-[10.5px] font-bold tabular-nums text-red-700 ring-1 ring-inset ring-red-200/70"
            title={`다음 일정 ${dInfo.label}`}
          >
            {dInfo.label}
          </span>
        )}

        {/* 색 피커 */}
        {onPatch && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="카드 색 지정"
                className="rounded-sm p-1 text-muted-foreground/70 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                {posting.color ? (
                  <span
                    aria-hidden
                    className={cn(
                      "block h-3 w-3 rounded-full",
                      COLOR_PRESET_DOT[posting.color],
                    )}
                  />
                ) : (
                  <Palette className="h-3.5 w-3.5" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-44 p-2"
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                카드 색
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                <ColorSwatch
                  color={null}
                  selected={posting.color === null}
                  onClick={() => void onPatch(posting.id, { color: null })}
                />
                {COLOR_PRESET_LIST.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    selected={posting.color === c}
                    onClick={() => void onPatch(posting.id, { color: c })}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* 즐겨찾기 */}
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

      {/* 메타 표 */}
      <dl className="divide-y divide-dashed divide-border/70 text-xs">
        <div className="grid grid-cols-[3.5rem_1fr] pl-2">
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
                            {selected && <Check className="h-3 w-3" aria-hidden />}
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
        <div className="grid grid-cols-[3.5rem_1fr] pl-2">
          <dt className="bg-muted/30 px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            일정
          </dt>
          <dd className="flex items-center gap-1.5 px-3 py-1.5">
            <CalendarIcon className="h-3 w-3 text-muted-foreground" aria-hidden />
            {dInfo && next ? (
              <>
                <span className="text-foreground/80">
                  {KIND_LABEL[next.kind] ?? "일정"}
                </span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    isUrgent ? "text-red-600" : "text-foreground",
                  )}
                >
                  {dInfo.label}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/70">예정 없음</span>
            )}
          </dd>
        </div>
        {posting.techStack.length > 0 && (
          <div className="grid grid-cols-[3.5rem_1fr] pl-2">
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

      {/* 연결 자료 인디케이터 */}
      <div className="flex items-center gap-1.5 border-t border-dashed border-border/70 pl-5 pr-3 py-1.5 text-[10.5px] text-muted-foreground">
        <span className="text-[10px] font-medium uppercase tracking-wider">
          연결
        </span>
        <AttachIndicator
          icon={<FileText className="h-3 w-3" aria-hidden />}
          label="이력서"
          count={attachCounts.resume}
        />
        <AttachIndicator
          icon={<PenLine className="h-3 w-3" aria-hidden />}
          label="자소서"
          count={attachCounts.cover_letter}
        />
        <AttachIndicator
          icon={<Layers className="h-3 w-3" aria-hidden />}
          label="포트폴리오"
          count={attachCounts.portfolio}
        />
        <AttachIndicator
          icon={<FolderKanban className="h-3 w-3" aria-hidden />}
          label="프로젝트"
          count={attachCounts.project}
        />
        <span className="ml-auto inline-flex items-center gap-1">
          {missingCount === 0 ? (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
              title="이력서·자소서·포트폴리오·프로젝트 모두 연결됨"
            >
              <Check className="h-2.5 w-2.5" />
              준비
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
              title={`자료 ${missingCount}종 미연결`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
              {missingCount}종 비움
            </span>
          )}
        </span>
      </div>

      {/* 폴더 행 */}
      {onPatch && (
        <FolderRow
          currentFolderId={posting.folderId}
          onMove={(folderId) => void onPatch(posting.id, { folderId })}
        />
      )}

      {/* 액션 푸터 */}
      <footer className="mt-auto flex items-center justify-between gap-1.5 border-t bg-muted/20 pl-5 pr-3 py-2">
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
              <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
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

function FolderRow({
  currentFolderId,
  onMove,
}: {
  currentFolderId: string | null;
  onMove: (folderId: string | null) => void;
}) {
  const [folders, setFolders] = useState<FolderOption[]>(folderCache ?? []);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void loadFolderOptions().then(setFolders);
    const listener = (opts: FolderOption[]) => setFolders(opts);
    folderListeners.add(listener);
    return () => {
      folderListeners.delete(listener);
    };
  }, []);

  const current = folders.find((f) => f.id === currentFolderId);

  return (
    <div className="flex items-center gap-1.5 border-t border-dashed border-border/70 pl-5 pr-3 py-1.5 text-[10.5px]">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        폴더
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10.5px] font-medium text-foreground/80 transition-colors hover:bg-muted/40"
            onClick={(e) => {
              e.stopPropagation();
              // load 트리거 (이미 캐시면 즉시)
              void loadFolderOptions().then(setFolders);
            }}
          >
            {current ? (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    current.color
                      ? COLOR_PRESET_DOT[current.color]
                      : "bg-muted-foreground/40",
                  )}
                />
                {current.name}
              </>
            ) : (
              <>
                <FolderClosed className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">미분류</span>
              </>
            )}
            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-44 p-1"
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="space-y-0.5 text-xs">
            <li>
              <button
                type="button"
                onClick={() => {
                  onMove(null);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 transition-colors hover:bg-muted",
                  currentFolderId === null && "bg-muted/60 font-medium",
                )}
              >
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <FolderClosed className="h-3 w-3" />
                  미분류
                </span>
                {currentFolderId === null && <Check className="h-3 w-3" />}
              </button>
            </li>
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => {
                    onMove(f.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2 py-1.5 transition-colors hover:bg-muted",
                    currentFolderId === f.id && "bg-muted/60 font-medium",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        f.color
                          ? COLOR_PRESET_DOT[f.color]
                          : "bg-muted-foreground/40",
                      )}
                    />
                    {f.name}
                  </span>
                  {currentFolderId === f.id && <Check className="h-3 w-3" />}
                </button>
              </li>
            ))}
            {folders.length === 0 && (
              <li className="px-2 py-2 text-[11px] text-muted-foreground">
                좌측 사이드바에서 폴더를 먼저 만들어 주세요.
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: ColorPreset | null;
  selected: boolean;
  onClick: () => void;
}) {
  const dot = color ? COLOR_PRESET_DOT[color] : "bg-transparent";
  const label = color ? COLOR_PRESET_LABEL[color] : "색 없음";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md border transition",
        selected ? "border-foreground" : "border-transparent hover:border-foreground/30",
      )}
    >
      {color ? (
        <span aria-hidden className={cn("h-4 w-4 rounded-full", dot)} />
      ) : (
        <span
          aria-hidden
          className="h-4 w-4 rounded-full border border-dashed border-muted-foreground/60"
        />
      )}
    </button>
  );
}

function countAttachments(
  attachments: JobPostingRecord["attachments"],
): { resume: number; cover_letter: number; portfolio: number; project: number } {
  const acc = { resume: 0, cover_letter: 0, portfolio: 0, project: 0 };
  (attachments ?? []).forEach((a) => {
    if (a.attachmentType in acc) {
      acc[a.attachmentType as keyof typeof acc] += 1;
    }
  });
  return acc;
}

function AttachIndicator({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  const has = count > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 transition-colors",
        has ? "bg-muted text-foreground/90" : "text-muted-foreground/40",
      )}
      title={has ? `${label} ${count}` : `${label} 없음`}
    >
      {icon}
      {has && count > 1 && (
        <span className="font-semibold tabular-nums">{count}</span>
      )}
    </span>
  );
}

/** 외부에서 폴더 목록 캐시 무효화 (예: sidebar 에서 폴더 추가 후) */
export function invalidateFolderCache() {
  folderCache = null;
  folderListeners.forEach((l) => l([]));
}
