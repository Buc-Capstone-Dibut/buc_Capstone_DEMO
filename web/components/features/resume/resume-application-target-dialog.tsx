"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Inbox,
  Loader2,
  Unlink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ResumeApplicationTargetMeta {
  company: string;
  division: string;
  role: string;
  deadline: string;
  jobDescription: string;
}

export interface ResumeApplicationTargetPosting {
  id: string;
  companyName: string;
  roleTitle: string;
  status?: string;
}

export interface ResumeApplicationTargetValue {
  jobPostingId: string | null;
  meta: ResumeApplicationTargetMeta | null;
  posting: ResumeApplicationTargetPosting | null;
}

interface JobPostingOption extends ResumeApplicationTargetPosting {
  techStack?: string[];
  responsibilities?: string[];
  requirements?: string[];
  schedules?: Array<{ kind: string; startAt: string }>;
}

interface ResumeApplicationTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ResumeApplicationTargetValue | null;
  onApply: (value: ResumeApplicationTargetValue) => void | Promise<void>;
}

const EMPTY_META: ResumeApplicationTargetMeta = {
  company: "",
  division: "",
  role: "",
  deadline: "",
  jobDescription: "",
};

function getPostingDeadline(posting: JobPostingOption) {
  const event = (posting.schedules ?? []).find(
    (schedule) =>
      schedule.kind === "deadline" || schedule.kind === "document_due",
  );
  if (!event?.startAt) return "";

  const date = new Date(event.startAt);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function getPostingDescription(posting: JobPostingOption) {
  const lines: string[] = [];

  if ((posting.requirements ?? []).length > 0) {
    lines.push("[자격 요건]");
    for (const requirement of posting.requirements ?? []) {
      lines.push(`- ${requirement}`);
    }
  }
  if ((posting.responsibilities ?? []).length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("[주요 업무]");
    for (const responsibility of posting.responsibilities ?? []) {
      lines.push(`- ${responsibility}`);
    }
  }
  if ((posting.techStack ?? []).length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(`[기술 스택] ${(posting.techStack ?? []).join(", ")}`);
  }

  return lines.join("\n");
}

export function ResumeApplicationTargetDialog({
  open,
  onOpenChange,
  value,
  onApply,
}: ResumeApplicationTargetDialogProps) {
  const [postings, setPostings] = useState<JobPostingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);
  const [meta, setMeta] = useState<ResumeApplicationTargetMeta>(EMPTY_META);

  useEffect(() => {
    if (!open) return;

    const posting = value?.posting;
    const currentMeta = value?.meta;
    setSelectedPostingId(value?.jobPostingId ?? posting?.id ?? null);
    setMeta({
      company: currentMeta?.company || posting?.companyName || "",
      division: currentMeta?.division || "",
      role: currentMeta?.role || posting?.roleTitle || "",
      deadline: currentMeta?.deadline || "",
      jobDescription: currentMeta?.jobDescription || "",
    });
  }, [open, value]);

  useEffect(() => {
    if (!open || loaded) return;

    const controller = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch(
          "/api/my/job-postings?pageSize=50&sort=newest",
          { cache: "no-store", signal: controller.signal },
        );
        const json = await response.json();
        if (json?.success) {
          setPostings((json.data?.items ?? []) as JobPostingOption[]);
        }
        setLoaded(true);
      } catch (error: unknown) {
        if ((error as Error).name !== "AbortError") setLoaded(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [loaded, open]);

  const selectPosting = (posting: JobPostingOption) => {
    setSelectedPostingId(posting.id);
    setMeta((current) => ({
      company: posting.companyName ?? "",
      division: current.division,
      role: posting.roleTitle ?? "",
      deadline: getPostingDeadline(posting),
      jobDescription: getPostingDescription(posting),
    }));
  };

  const apply = async () => {
    const posting = selectedPostingId
      ? postings.find((item) => item.id === selectedPostingId) ??
        (value?.posting?.id === selectedPostingId ? value.posting : null)
      : null;

    setSubmitting(true);
    try {
      await onApply({
        jobPostingId: selectedPostingId,
        posting: posting
          ? {
              id: posting.id,
              companyName: posting.companyName,
              roleTitle: posting.roleTitle,
              status: posting.status,
            }
          : null,
        meta: {
          company: meta.company.trim(),
          division: meta.division.trim(),
          role: meta.role.trim(),
          deadline: meta.deadline,
          jobDescription: meta.jobDescription.trim(),
        },
      });
      onOpenChange(false);
    } catch {
      // onApply 주체가 오류 안내를 표시한다. 다이얼로그는 그대로 유지한다.
    } finally {
      setSubmitting(false);
    }
  };

  const clear = async () => {
    setSubmitting(true);
    try {
      await onApply({ jobPostingId: null, meta: null, posting: null });
      onOpenChange(false);
    } catch {
      // onApply 주체가 오류 안내를 표시한다. 다이얼로그는 그대로 유지한다.
    } finally {
      setSubmitting(false);
    }
  };

  const hasCurrentTarget = Boolean(value?.meta || value?.posting);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[88vh] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>지원 대상 설정</DialogTitle>
          <p className="text-xs text-muted-foreground">
            이 이력서를 어느 회사와 직무에 사용할지 설정하세요. PDF 본문에는 표시되지 않습니다.
          </p>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_320px] md:overflow-hidden">
          <div className="space-y-5 px-6 py-5 md:overflow-y-auto">
            {selectedPostingId && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-primary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">내 채용공고와 연결됨</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPostingId(null)}
                  className="shrink-0 text-[11px] font-semibold text-muted-foreground hover:text-primary"
                >
                  직접 입력으로 전환
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label>기업*</Label>
                <Input
                  className="mt-2 h-11"
                  value={meta.company}
                  disabled={Boolean(selectedPostingId)}
                  onChange={(event) =>
                    setMeta((current) => ({
                      ...current,
                      company: event.target.value,
                    }))
                  }
                  placeholder="예: 카카오페이"
                />
              </div>
              <div>
                <Label>사업부 또는 팀 (선택)</Label>
                <Input
                  className="mt-2 h-11"
                  value={meta.division}
                  onChange={(event) =>
                    setMeta((current) => ({
                      ...current,
                      division: event.target.value,
                    }))
                  }
                  placeholder="예: 결제플랫폼팀"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>직무*</Label>
                  <Input
                    className="mt-2 h-11"
                    value={meta.role}
                    disabled={Boolean(selectedPostingId)}
                    onChange={(event) =>
                      setMeta((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                    placeholder="예: 백엔드 개발자"
                  />
                </div>
                <div>
                  <Label>마감일정 (선택)</Label>
                  <Input
                    className="mt-2 h-11"
                    type="date"
                    value={meta.deadline}
                    onChange={(event) =>
                      setMeta((current) => ({
                        ...current,
                        deadline: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label>채용공고 핵심 요구사항 (선택)</Label>
                <Textarea
                  className="mt-2 min-h-28 resize-none"
                  value={meta.jobDescription}
                  onChange={(event) =>
                    setMeta((current) => ({
                      ...current,
                      jobDescription: event.target.value,
                    }))
                  }
                  placeholder="주요 업무, 기술 스택, 자격 요건을 입력하면 AI 다듬기에 활용합니다."
                />
              </div>
            </div>
          </div>

          <aside className="flex min-h-64 flex-col border-t bg-muted/25 md:min-h-0 md:border-l md:border-t-0">
            <div className="flex items-center gap-2 border-b bg-background px-4 py-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold">내 채용공고에서 선택</span>
              {postings.length > 0 && (
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {postings.length}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex h-32 items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  불러오는 중…
                </div>
              ) : postings.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-muted-foreground">
                  <Inbox className="h-7 w-7 text-muted-foreground/40" />
                  등록된 채용공고가 없습니다.
                </div>
              ) : (
                <div className="divide-y">
                  {postings.map((posting) => {
                    const selected = posting.id === selectedPostingId;
                    return (
                      <button
                        key={posting.id}
                        type="button"
                        onClick={() => selectPosting(posting)}
                        className={cn(
                          "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors",
                          selected ? "bg-primary/10" : "hover:bg-background",
                        )}
                      >
                        <span className="flex w-full items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                          <span className="min-w-0 flex-1 truncate">
                            {posting.companyName}
                          </span>
                          {selected && (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          )}
                        </span>
                        <span className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
                          {posting.roleTitle}
                        </span>
                        {getPostingDeadline(posting) && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            {getPostingDeadline(posting)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>

        <DialogFooter className="border-t bg-background px-6 py-4">
          {hasCurrentTarget && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void clear()}
              disabled={submitting}
              className="text-muted-foreground hover:bg-destructive/5 hover:text-destructive sm:mr-auto"
            >
              <Unlink className="mr-2 h-4 w-4" />
              지원 대상 해제
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={() => void apply()}
            disabled={
              submitting || !meta.company.trim() || !meta.role.trim()
            }
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
