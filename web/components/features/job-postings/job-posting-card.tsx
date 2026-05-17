"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Boxes,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  FolderClosed,
  Palette,
  PenLine,
  Sparkles,
  Star,
} from "lucide-react";
import { InterviewLaunchOverlay } from "./interview-launch-overlay";
import { AttachmentPreviewDialog } from "./attachment-preview-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AttachmentRecord,
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
  const [launchOpen, setLaunchOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] =
    useState<AttachmentRecord | null>(null);

  const attachmentsByType = useMemo(() => {
    const all = posting.attachments ?? [];
    return {
      resume: all.filter((a) => a.attachmentType === "resume"),
      cover_letter: all.filter((a) => a.attachmentType === "cover_letter"),
      portfolio: all.filter((a) => a.attachmentType === "portfolio"),
      project: all.filter((a) => a.attachmentType === "project"),
    };
  }, [posting.attachments]);
  const attachCounts = {
    resume: attachmentsByType.resume.length,
    cover_letter: attachmentsByType.cover_letter.length,
    portfolio: attachmentsByType.portfolio.length,
    project: attachmentsByType.project.length,
  };
  // 4종 중 0개인 항목 수 — 0이면 "준비 완료", 1+ 면 "미연결" 경고 점
  const missingCount = (Object.keys(attachCounts) as Array<
    keyof typeof attachCounts
  >).filter((k) => attachCounts[k] === 0).length;

  const dInfo = next ? dDayInfo(next.startAt) : null;
  const isUrgent = dInfo && dInfo.days >= 0 && dInfo.days <= 3;

  // 좌측 액센트 바: 사용자 색 > 상태색 (즐겨찾기는 우측 별 아이콘으로만 표시)
  const barClass = posting.color
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
          <h3 className="mt-0.5 truncate text-sm font-semibold leading-snug text-foreground">
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

      {/* 단일 메타 행: 상태 chip + 일정 + 기술 */}
      <div className="flex flex-wrap items-center gap-1.5 pl-5 pr-3 py-2 text-[11px]">
        {/* 상태 — 호버 전에는 읽기 전용 chip, 호버 시 ChevronDown 노출 → 클릭 변경 */}
        {onChangeStatus ? (
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[10.5px] font-medium ring-1 ring-inset transition-colors hover:bg-muted/40",
                  STATUS_TONE[posting.status],
                )}
                aria-label="상태 변경"
              >
                {STATUS_LABEL[posting.status]}
                <ChevronDown
                  className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-70"
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
              "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10.5px] font-medium ring-1 ring-inset",
              STATUS_TONE[posting.status],
            )}
          >
            {STATUS_LABEL[posting.status]}
          </span>
        )}

        {/* 일정 한 줄 — 다음 일정 있을 때만 */}
        {dInfo && next && (
          <span
            className="inline-flex items-center gap-1 text-muted-foreground"
            title={`${KIND_LABEL[next.kind] ?? "일정"} ${dInfo.label}`}
          >
            <CalendarIcon className="h-3 w-3" aria-hidden />
            <span className="text-foreground/70">
              {KIND_LABEL[next.kind] ?? "일정"}
            </span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                isUrgent ? "text-red-600" : "text-foreground/80",
              )}
            >
              {dInfo.label}
            </span>
          </span>
        )}

        {/* 기술 칩 — 최대 3개 */}
        {posting.techStack.length > 0 && (
          <span className="inline-flex flex-wrap items-center gap-1">
            {posting.techStack.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-foreground/70"
              >
                {t}
              </span>
            ))}
            {posting.techStack.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{posting.techStack.length - 3}
              </span>
            )}
          </span>
        )}

        {/* 준비 상태 — 작은 dot 우측 정렬, 호버 시 풀 indicator */}
        <span className="ml-auto inline-flex items-center gap-1">
          {/* 평소: 1개 dot/배지로 압축 */}
          {missingCount === 0 ? (
            <span
              className="inline-flex h-4 items-center gap-0.5 rounded-sm bg-emerald-50 px-1 text-[9.5px] font-bold text-emerald-700"
              title="이력서·자소서·포트폴리오·프로젝트 모두 연결됨"
            >
              <Check className="h-2.5 w-2.5" />
              준비
            </span>
          ) : (
            <span
              className="inline-flex h-4 items-center gap-0.5 rounded-sm bg-amber-50 px-1 text-[9.5px] font-semibold text-amber-700"
              title={`첨부 ${missingCount}종 미연결`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
              {missingCount}
            </span>
          )}
        </span>
      </div>

      {/* 첨부 상세 + 폴더 — 항상 표시, 첨부 아이콘 클릭 시 미리보기 */}
      <div className="flex items-center gap-1 border-t border-dashed border-border/70 pl-5 pr-3 py-1 text-[10px] text-muted-foreground">
        <span className="text-[9.5px] font-medium uppercase tracking-wider">
          첨부
        </span>
        <AttachIndicatorButton
          icon={<FileText className="h-3 w-3" aria-hidden />}
          label="이력서"
          items={attachmentsByType.resume}
          onPreview={setPreviewAttachment}
        />
        <AttachIndicatorButton
          icon={<PenLine className="h-3 w-3" aria-hidden />}
          label="자기소개서"
          items={attachmentsByType.cover_letter}
          onPreview={setPreviewAttachment}
        />
        <AttachIndicatorButton
          icon={<Briefcase className="h-3 w-3" aria-hidden />}
          label="포트폴리오"
          items={attachmentsByType.portfolio}
          onPreview={setPreviewAttachment}
        />
        <AttachIndicatorButton
          icon={<Boxes className="h-3 w-3" aria-hidden />}
          label="프로젝트"
          items={attachmentsByType.project}
          onPreview={setPreviewAttachment}
        />
      </div>
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

          {/* 역방향 파생 자료: 이 공고로 작성된 이력서/자소서 */}
          <DerivedChip
            kind="resume"
            count={posting.derivedResumeCount ?? 0}
            first={posting.derivedResumes?.[0]}
          />
          <DerivedChip
            kind="cover_letter"
            count={posting.derivedCoverLetterCount ?? 0}
            first={posting.derivedCoverLetters?.[0]}
          />
        </div>
        <Button
          size="sm"
          className="h-7 rounded-sm px-2.5 text-[11px]"
          onClick={() => setLaunchOpen(true)}
        >
          <Sparkles className="mr-1 h-3 w-3" aria-hidden />
          모의면접
        </Button>
      </footer>

      <InterviewLaunchOverlay
        postingId={posting.id}
        companyName={posting.companyName}
        roleTitle={posting.roleTitle}
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
      />

      <AttachmentPreviewDialog
        attachment={previewAttachment}
        open={previewAttachment !== null}
        onClose={() => setPreviewAttachment(null)}
      />
    </article>
  );
}

function attachmentTitle(a: AttachmentRecord): string {
  const snap = a.snapshotPayload as { title?: string; name?: string } | null;
  if (a.attachmentType === "cover_letter")
    return a.coverLetterLabel || snap?.title || "자기소개서";
  if (a.attachmentType === "project")
    return a.projectLabel || snap?.name || "프로젝트";
  if (a.attachmentType === "portfolio") return snap?.title || "포트폴리오";
  return snap?.title || "이력서";
}

function AttachIndicatorButton({
  icon,
  label,
  items,
  onPreview,
}: {
  icon: React.ReactNode;
  label: string;
  items: AttachmentRecord[];
  onPreview: (att: AttachmentRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = items.length;

  if (count === 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 text-muted-foreground/40"
        title={`${label} 없음`}
      >
        {icon}
      </span>
    );
  }

  if (count === 1) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPreview(items[0]);
        }}
        className="inline-flex items-center gap-0.5 rounded-sm bg-muted px-1 py-0.5 text-foreground/90 transition-colors hover:bg-muted-foreground/15"
        title={`${label}: ${attachmentTitle(items[0])} (클릭 미리보기)`}
        aria-label={`${label} 미리보기`}
      >
        {icon}
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-0.5 rounded-sm bg-muted px-1 py-0.5 text-foreground/90 transition-colors hover:bg-muted-foreground/15"
          title={`${label} ${count}개 — 미리볼 항목 선택`}
          aria-label={`${label} ${count}개 미리보기 선택`}
        >
          {icon}
          <span className="font-semibold tabular-nums">{count}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-1"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <ul className="space-y-0.5">
          {items.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => {
                  onPreview(a);
                  setOpen(false);
                }}
                className="block w-full truncate rounded-sm px-2 py-1.5 text-left text-xs text-foreground/90 transition-colors hover:bg-muted"
              >
                {attachmentTitle(a)}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
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

/**
 * 역방향 파생 자료 chip — 이 공고를 target 으로 한 이력서/자소서.
 * count 0 이면 표시 안 함. 1 이면 해당 항목 단건으로(`#id`) 점프, 2+ 이면 리스트 페이지로.
 */
function DerivedChip({
  kind,
  count,
  first,
}: {
  kind: "resume" | "cover_letter";
  count: number;
  first: { id: string; title: string } | undefined;
}) {
  if (!count) return null;
  const isResume = kind === "resume";
  const label = isResume ? "이력서" : "자소서";
  const Icon = isResume ? FileText : PenLine;
  // 1 건이면 단건 hash 점프, 2+ 면 리스트 페이지로 (career 페이지에 단건 라우트 없음)
  const basePath = isResume ? "/career/resumes" : "/career/cover-letters";
  const href = count === 1 && first ? `${basePath}#${first.id}` : basePath;
  const tooltip =
    count === 1 && first ? `${label}: ${first.title || "(제목 없음)"}` : `${label} ${count}건`;
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      title={tooltip}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-sm px-1.5 text-[10.5px] font-medium",
        "text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground",
      )}
      aria-label={tooltip}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span className="tabular-nums">{count}</span>
    </Link>
  );
}

/** 외부에서 폴더 목록 캐시 무효화 (예: sidebar 에서 폴더 추가 후) */
export function invalidateFolderCache() {
  folderCache = null;
  folderListeners.forEach((l) => l([]));
}
