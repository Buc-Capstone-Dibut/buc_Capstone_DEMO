"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, ExternalLink, Loader2, Search, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/job-postings/visual-tokens";
import type {
  AttachmentRecord,
  JobPostingRecord,
  JobPostingStatus,
} from "@/lib/job-postings/types";

/**
 * 면접 셋업의 target 단계에서 띄우는 "내 채용공고에서 선택" 다이얼로그.
 *
 * 좌측 리스트(사용자 등록 공고) + 우측 미리보기 + 하단 CTA로 구성된다.
 * "이 공고로 진행"을 누르면 부모에게 선택된 공고 정보를 전달한다.
 * 실제 store update + 다음 단계 진입은 부모(target step)에서 처리한다.
 */
export interface MyPostingPickerResult {
  postingId: string;
  posting: JobPostingRecord;
}

interface MyPostingPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: MyPostingPickerResult) => Promise<void> | void;
}

const STATUS_PRIORITY: JobPostingStatus[] = [
  "active",
  "applied",
  "interviewing",
  "closed",
  "archived",
];

export function MyPostingPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: MyPostingPickerDialogProps) {
  const [items, setItems] = useState<JobPostingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          "/api/my/job-postings?pageSize=100&favorites=top",
          { cache: "no-store" },
        );
        const json = await res.json();
        if (cancelled) return;
        if (!json?.success) {
          throw new Error(json?.error || "공고 목록을 불러오지 못했습니다.");
        }
        const fetched: JobPostingRecord[] = json.data?.items ?? [];
        setItems(fetched);
        // 즐겨찾기 → 활성 → 가장 최근 순으로 첫 항목 자동 선택
        const next =
          fetched.find((p) => p.isFavorite) ??
          fetched.find((p) => p.status === "active") ??
          fetched[0];
        setSelectedId(next?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "공고 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? items.filter(
          (p) =>
            p.companyName.toLowerCase().includes(q) ||
            p.roleTitle.toLowerCase().includes(q),
        )
      : items;
    // 즐겨찾기 우선, 그 다음 상태 우선순위, 그 다음 최신순
    return [...base].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      const pa = STATUS_PRIORITY.indexOf(a.status);
      const pb = STATUS_PRIORITY.indexOf(b.status);
      if (pa !== pb) return pa - pb;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }, [items, query]);

  const selected = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await onSelect({ postingId: selected.id, posting: selected });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pb-4 pt-5">
          <DialogTitle className="text-base font-semibold">
            내 채용공고에서 선택
          </DialogTitle>
          <DialogDescription className="text-xs">
            마이페이지에 등록한 공고를 선택하면 회사·직무·기술스택·연결된 이력서까지 셋업에 자동으로 채워집니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            불러오는 중…
          </div>
        ) : error ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              닫기
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3 px-6 text-center">
            <Briefcase className="h-8 w-8 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-sm font-semibold">등록된 채용공고가 없어요</p>
              <p className="mt-1 text-xs text-muted-foreground">
                마이페이지에서 채용공고를 먼저 등록해 보세요.
              </p>
            </div>
            <Button asChild size="sm">
              <a href="/my/job-postings" target="_blank" rel="noreferrer">
                내 채용공고 관리 열기
                <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          </div>
        ) : (
          <div className="grid max-h-[calc(88vh-5rem)] grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]">
            <aside className="overflow-hidden border-b md:border-b-0 md:border-r">
              <div className="border-b px-3 py-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="회사·직무 검색"
                    className="h-8 rounded-sm pl-7 text-xs"
                  />
                </div>
              </div>
              <ul className="max-h-[420px] divide-y overflow-y-auto">
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                    조건에 맞는 공고가 없습니다.
                  </li>
                ) : (
                  filtered.map((p) => {
                    const active = p.id === selectedId;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(p.id)}
                          className={cn(
                            "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors",
                            active
                              ? "bg-accent/60"
                              : "hover:bg-muted/60",
                          )}
                          aria-current={active}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                {p.companyName}
                              </span>
                              {p.isFavorite && (
                                <Star
                                  className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500"
                                  aria-hidden
                                />
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                              {p.roleTitle}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                              STATUS_TONE[p.status],
                            )}
                          >
                            {STATUS_LABEL[p.status]}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </aside>

            <section className="flex min-w-0 flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {selected ? (
                  <PostingPreview posting={selected} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    좌측에서 공고를 선택하세요.
                  </div>
                )}
              </div>
              <footer className="flex items-center justify-between border-t bg-muted/30 px-6 py-3">
                <p className="text-[11px] text-muted-foreground">
                  연결된 이력서·자기소개서·포트폴리오도 함께 셋업에 반영됩니다.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-sm"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-sm"
                    onClick={handleConfirm}
                    disabled={!selected || submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          className="mr-1 h-3.5 w-3.5 animate-spin"
                          aria-hidden
                        />
                        가져오는 중…
                      </>
                    ) : (
                      "이 공고로 진행"
                    )}
                  </Button>
                </div>
              </footer>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PostingPreview({ posting }: { posting: JobPostingRecord }) {
  const attachmentSummary = summarizeAttachments(posting.attachments);
  return (
    <article className="space-y-4">
      <header>
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {posting.companyName}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
              STATUS_TONE[posting.status],
            )}
          >
            {STATUS_LABEL[posting.status]}
          </span>
        </div>
        <h3 className="mt-0.5 truncate text-base font-semibold">
          {posting.roleTitle}
        </h3>
      </header>

      {posting.techStack.length > 0 && (
        <Field label="기술">
          <div className="flex flex-wrap gap-1">
            {posting.techStack.map((t) => (
              <span
                key={t}
                className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-foreground/80"
              >
                {t}
              </span>
            ))}
          </div>
        </Field>
      )}

      {posting.postingUrl && (
        <Field label="원문 URL">
          <a
            href={posting.postingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all text-xs text-primary underline-offset-2 hover:underline"
          >
            {posting.postingUrl}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </Field>
      )}

      <Field label="연결 자료">
        {posting.attachments && posting.attachments.length > 0 ? (
          <ul className="space-y-1 text-xs">
            {attachmentSummary.map((line, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-1 w-1 rounded-full bg-muted-foreground"
                />
                <span className="text-foreground/80">{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            연결된 자료가 없습니다. 셋업 다음 단계에서 직접 선택할 수 있어요.
          </p>
        )}
      </Field>

      {posting.memo && (
        <Field label="메모">
          <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">
            {posting.memo}
          </p>
        </Field>
      )}
    </article>
  );
}

function summarizeAttachments(
  attachments: AttachmentRecord[] | undefined,
): string[] {
  if (!attachments) return [];
  const lines: string[] = [];
  for (const a of attachments) {
    if (a.attachmentType === "resume") lines.push("이력서");
    else if (a.attachmentType === "cover_letter")
      lines.push(`자기소개서${a.coverLetterLabel ? ` · ${a.coverLetterLabel}` : ""}`);
    else lines.push("포트폴리오");
  }
  return lines;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
