"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  JobPostingInput,
  JobPostingStatus,
  ScheduleKind,
} from "@/lib/job-postings/types";
import {
  ImportFromMyDataPanel,
  type JobPostingDraft,
} from "@/components/features/job-postings/import-from-my-data-panel";
import { TechStackCombobox } from "@/components/features/job-postings/tech-stack-combobox";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ value: JobPostingStatus; label: string }> = [
  { value: "active", label: "관심" },
  { value: "applied", label: "지원완료" },
  { value: "interviewing", label: "면접중" },
  { value: "closed", label: "마감" },
  { value: "archived", label: "보관" },
];

const KIND_OPTIONS: Array<{ value: ScheduleKind; label: string }> = [
  { value: "deadline", label: "마감일" },
  { value: "document_due", label: "서류 마감" },
  { value: "interview", label: "면접일" },
  { value: "other", label: "기타" },
];

type ScheduleDraft = {
  kind: ScheduleKind;
  title: string;
  startAt: string;
  endAt: string;
  memo: string;
};

type AttachmentKind = "resume" | "cover_letter" | "portfolio" | "project";
type PendingAttachment = { type: AttachmentKind; id: string; label?: string };

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

export function JobPostingFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<JobPostingInput>;
  onSubmit?: (payload: JobPostingInput) => Promise<void>;
  onCreated?: () => Promise<void> | void;
}) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [roleTitle, setRoleTitle] = useState(initial?.roleTitle ?? "");
  const [postingUrl, setPostingUrl] = useState(initial?.postingUrl ?? "");
  const [techStack, setTechStack] = useState<string[]>(initial?.techStack ?? []);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [status, setStatus] = useState<JobPostingStatus>(
    (initial?.status as JobPostingStatus) ?? "active",
  );
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [responsibilitiesText, setResponsibilitiesText] = useState(
    (initial?.responsibilities ?? []).join("\n"),
  );
  const [requirementsText, setRequirementsText] = useState(
    (initial?.requirements ?? []).join("\n"),
  );
  const [preferredText, setPreferredText] = useState(
    (initial?.preferred ?? []).join("\n"),
  );
  const [companyDescriptionText, setCompanyDescriptionText] = useState(
    initial?.companyDescription ?? "",
  );
  const [teamCultureText, setTeamCultureText] = useState(
    (initial?.teamCulture ?? []).join("\n"),
  );

  // URL 자동 파싱 상태
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseFilled, setParseFilled] = useState<string[] | null>(null);
  const lastParsedUrl = useRef<string>("");

  // 상세 입력 토글 (URL만 보이는 게 기본, 자동 파싱 성공 시 자동 펼침)
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(
      initial?.companyName ||
        initial?.roleTitle ||
        initial?.responsibilities?.length ||
        initial?.requirements?.length,
    ),
  );

  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  const addPendingAttachment = (att: PendingAttachment) => {
    setPendingAttachments((prev) => {
      if (prev.some((p) => p.type === att.type && p.id === att.id)) return prev;
      return [...prev, att];
    });
  };

  const removePendingAttachment = (type: AttachmentKind, id: string) => {
    setPendingAttachments((prev) => prev.filter((p) => !(p.type === type && p.id === id)));
  };

  const handleApplyDraft = (
    draft: JobPostingDraft,
    attach?: { type: AttachmentKind; id: string; label?: string },
  ) => {
    if (!companyName.trim() && draft.companyName) setCompanyName(draft.companyName);
    if (!roleTitle.trim() && draft.roleTitle) setRoleTitle(draft.roleTitle);
    if (techStack.length === 0 && (draft.techStack ?? []).length > 0) {
      setTechStack(draft.techStack ?? []);
    }
    if (!memo.trim() && draft.memo) setMemo(draft.memo);
    if (attach) addPendingAttachment(attach);
    setDetailsOpen(true);
  };

  const parseFromUrl = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || !URL_PATTERN.test(trimmed)) return;
    if (trimmed === lastParsedUrl.current) return;
    lastParsedUrl.current = trimmed;

    setParseError(null);
    setParseFilled(null);
    setParsing(true);
    try {
      const res = await fetch("/api/interview/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || json.success === false) {
        throw new Error(json?.error ?? "URL에서 정보를 가져오지 못했습니다.");
      }
      const data = json.data ?? {};

      const asString = (v: unknown): string =>
        typeof v === "string" ? v : "";
      const asStringArray = (v: unknown): string[] =>
        Array.isArray(v)
          ? v.filter(
              (x): x is string => typeof x === "string" && x.trim() !== "",
            )
          : [];

      const filled: string[] = [];

      if (!companyName.trim() && asString(data.company)) {
        setCompanyName(asString(data.company));
        filled.push("회사명");
      }
      if (!roleTitle.trim() && asString(data.title)) {
        setRoleTitle(asString(data.title));
        filled.push("직무명");
      }
      if (techStack.length === 0) {
        const arr = asStringArray(data.techStack);
        if (arr.length > 0) {
          setTechStack(arr);
          filled.push(`기술 ${arr.length}개`);
        }
      }
      if (!companyDescriptionText.trim() && asString(data.description)) {
        setCompanyDescriptionText(asString(data.description));
        filled.push("회사 소개");
      }
      if (!responsibilitiesText.trim()) {
        const arr = asStringArray(data.responsibilities);
        if (arr.length > 0) {
          setResponsibilitiesText(arr.join("\n"));
          filled.push("주요 업무");
        }
      }
      if (!requirementsText.trim()) {
        const arr = asStringArray(data.requirements);
        if (arr.length > 0) {
          setRequirementsText(arr.join("\n"));
          filled.push("자격 요건");
        }
      }
      if (!preferredText.trim()) {
        const arr = asStringArray(data.preferred);
        if (arr.length > 0) {
          setPreferredText(arr.join("\n"));
          filled.push("우대 사항");
        }
      }
      if (!teamCultureText.trim()) {
        const arr = asStringArray(data.culture);
        if (arr.length > 0) {
          setTeamCultureText(arr.join("\n"));
          filled.push("팀 문화");
        }
      }
      setParseFilled(filled);
      // 성공 시 상세 입력 펼치기
      setDetailsOpen(true);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "URL에서 정보를 가져오지 못했습니다.";
      setParseError(message);
      // 실패 시에도 사용자가 직접 채울 수 있도록 펼치기
      setDetailsOpen(true);
    } finally {
      setParsing(false);
    }
  };

  // URL 변경 시 디바운스로 자동 파싱
  useEffect(() => {
    if (!postingUrl.trim() || !URL_PATTERN.test(postingUrl.trim())) return;
    if (postingUrl.trim() === lastParsedUrl.current) return;
    const id = setTimeout(() => {
      void parseFromUrl(postingUrl);
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postingUrl]);

  const submit = async () => {
    setError(null);
    if (!companyName.trim() || !roleTitle.trim()) {
      setError("회사명과 직무명은 필수입니다. 직접 입력하거나 URL에서 다시 가져와 주세요.");
      setDetailsOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const splitLines = (text: string): string[] =>
        text
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean);

      const payload: JobPostingInput = {
        companyName: companyName.trim(),
        roleTitle: roleTitle.trim(),
        postingUrl: postingUrl.trim() || null,
        techStack: techStack.map((s) => s.trim()).filter(Boolean),
        responsibilities: splitLines(responsibilitiesText),
        requirements: splitLines(requirementsText),
        preferred: splitLines(preferredText),
        companyDescription: companyDescriptionText.trim() || null,
        teamCulture: splitLines(teamCultureText),
        memo: memo.trim() || null,
        status,
        schedules: schedules
          .filter((s) => s.startAt)
          .map((s) => ({
            kind: s.kind,
            title: s.title || null,
            startAt: new Date(s.startAt).toISOString(),
            endAt: s.endAt ? new Date(s.endAt).toISOString() : null,
            memo: s.memo || null,
          })),
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const res = await fetch("/api/my/job-postings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!json || !json.success) {
          throw new Error(json?.error ?? "저장에 실패했습니다.");
        }
        const createdId: string | undefined = json?.data?.id;
        if (createdId && pendingAttachments.length > 0) {
          for (const att of pendingAttachments) {
            const attachBody: Record<string, unknown> = {
              attachmentType: att.type,
            };
            if (att.type === "resume") attachBody.resumeId = att.id;
            else if (att.type === "cover_letter") attachBody.coverLetterId = att.id;
            else if (att.type === "portfolio") attachBody.portfolioId = att.id;
            else if (att.type === "project") {
              attachBody.projectId = att.id;
              attachBody.projectLabel = att.label ?? "";
            }
            try {
              await fetch(
                `/api/my/job-postings/${createdId}/attachments`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(attachBody),
                },
              );
            } catch {
              // ignore
            }
          }
        }
        if (onCreated) await onCreated();
      }
      setPendingAttachments([]);
      onOpenChange(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "저장에 실패했습니다.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-base font-semibold">채용공고 등록</DialogTitle>
          <p className="text-xs text-muted-foreground">
            URL을 붙여넣으면 회사·직무·요건이 자동으로 채워집니다. 필요한 부분만
            직접 다듬어 저장하세요.
          </p>
        </DialogHeader>

        {/* URL 우선 영역 */}
        <div className="space-y-3 border-b bg-muted/20 px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="posting-url" className="text-xs font-semibold">
              채용공고 URL
            </Label>
            <div className="relative">
              <Input
                id="posting-url"
                value={postingUrl}
                onChange={(e) => {
                  setPostingUrl(e.target.value);
                  setParseError(null);
                  setParseFilled(null);
                }}
                placeholder="https://career.example.com/jobs/12345"
                className="h-11 pr-28 font-medium"
                inputMode="url"
                autoFocus
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs">
                {parsing ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    가져오는 중
                  </span>
                ) : parseFilled ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    완료
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              사람인·잡코리아·원티드·자사 채용 페이지 등 일반 공개된 URL을
              지원합니다. URL이 없다면 아래 <b>직접 입력</b>으로 바로
              작성하세요.
            </p>
          </div>

          {parseError && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {parseError}{" "}
              <span className="text-red-600/80">
                — 아래에서 직접 입력해 주세요.
              </span>
            </div>
          )}
          {parseFilled && parseFilled.length > 0 && (
            <div className="rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <span className="font-semibold">자동 추출 완료</span> ·{" "}
              {parseFilled.join(" · ")} 가 채워졌어요.
            </div>
          )}
          {parseFilled && parseFilled.length === 0 && (
            <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              URL에서 추가로 추출할 정보가 없었어요. 아래에서 직접 입력해
              주세요.
            </div>
          )}
        </div>

        {/* 직접 입력 토글 */}
        <button
          type="button"
          onClick={() => setDetailsOpen((p) => !p)}
          className={cn(
            "flex w-full items-center justify-between border-b px-6 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/30",
            detailsOpen ? "bg-muted/20" : "bg-background",
          )}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            직접 입력 / 수정하기
            {(companyName || roleTitle) && (
              <span className="text-[11px] font-normal text-muted-foreground">
                · {companyName || "회사 미입력"} {companyName && roleTitle && "/"} {roleTitle}
              </span>
            )}
          </span>
          {detailsOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {detailsOpen && (
          <div className="divide-y">
            <FormRow label="회사명" required>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="예: 카카오"
                className="h-9"
              />
            </FormRow>
            <FormRow label="직무명" required>
              <Input
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="예: 백엔드 개발자"
                className="h-9"
              />
            </FormRow>
            <FormRow label="요구 기술">
              <TechStackCombobox
                value={techStack}
                onChange={setTechStack}
                placeholder="React, Next.js 등 검색하거나 직접 입력 후 Enter"
              />
            </FormRow>
            <FormRow label="회사 소개">
              <Textarea
                rows={2}
                value={companyDescriptionText}
                onChange={(e) => setCompanyDescriptionText(e.target.value)}
                placeholder="회사 소개 또는 공고 본문 요약"
              />
            </FormRow>
            <FormRow label="주요 업무" hint="한 줄에 하나">
              <Textarea
                rows={3}
                value={responsibilitiesText}
                onChange={(e) => setResponsibilitiesText(e.target.value)}
                placeholder="예: 백엔드 API 설계 및 개발"
              />
            </FormRow>
            <FormRow label="자격 요건" hint="한 줄에 하나">
              <Textarea
                rows={3}
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                placeholder="예: 컴퓨터공학 학사 또는 동등 수준"
              />
            </FormRow>
            <FormRow label="우대 사항" hint="한 줄에 하나">
              <Textarea
                rows={3}
                value={preferredText}
                onChange={(e) => setPreferredText(e.target.value)}
                placeholder="예: 대규모 트래픽 처리 경험"
              />
            </FormRow>
            <FormRow label="팀 문화" hint="한 줄에 하나">
              <Textarea
                rows={2}
                value={teamCultureText}
                onChange={(e) => setTeamCultureText(e.target.value)}
                placeholder="예: 자율과 책임"
              />
            </FormRow>
            <FormRow label="상태">
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as JobPostingStatus)}
              >
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="메모">
              <Textarea
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="개인 메모. 면접 컨텍스트로는 사용되지 않습니다."
              />
            </FormRow>
            <FormRow
              label="일정"
              hint="마감일·면접일 등을 추가하면 캘린더에 표시됩니다."
            >
              <div className="space-y-2">
                {schedules.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <Select
                      value={s.kind}
                      onValueChange={(v) =>
                        setSchedules((arr) =>
                          arr.map((it, i) =>
                            i === idx ? { ...it, kind: v as ScheduleKind } : it,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="col-span-3 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KIND_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-4 h-9"
                      type="datetime-local"
                      value={s.startAt}
                      onChange={(e) =>
                        setSchedules((arr) =>
                          arr.map((it, i) =>
                            i === idx ? { ...it, startAt: e.target.value } : it,
                          ),
                        )
                      }
                    />
                    <Input
                      className="col-span-4 h-9"
                      placeholder="제목 (선택)"
                      value={s.title}
                      onChange={(e) =>
                        setSchedules((arr) =>
                          arr.map((it, i) =>
                            i === idx ? { ...it, title: e.target.value } : it,
                          ),
                        )
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="col-span-1 h-9 w-9"
                      onClick={() =>
                        setSchedules((arr) => arr.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() =>
                    setSchedules((arr) => [
                      ...arr,
                      {
                        kind: "deadline",
                        title: "",
                        startAt: "",
                        endAt: "",
                        memo: "",
                      },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  일정 추가
                </Button>
              </div>
            </FormRow>

            {/* 내 데이터에서 가져오기 (보조 도구) */}
            <div className="bg-muted/10 px-6 py-4">
              <ImportFromMyDataPanel onApply={handleApplyDraft} />
            </div>
          </div>
        )}

        {pendingAttachments.length > 0 && (
          <div className="border-t bg-primary/5 px-6 py-3 text-xs text-muted-foreground">
            <span>등록 시 자동 연결: </span>
            {pendingAttachments.map((att) => (
              <span key={`${att.type}-${att.id}`} className="mr-2 inline-flex items-center gap-1">
                {att.type === "resume" ? "이력서" : att.type === "cover_letter" ? "자소서" : att.type === "portfolio" ? "포트폴리오" : "프로젝트"}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => removePendingAttachment(att.type, att.id)}
                >
                  해제
                </button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <div className="border-t bg-red-50 px-6 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <DialogFooter className="border-t bg-muted/30 px-6 py-3 sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            저장 후 상세 페이지에서 이력서·포트폴리오·프로젝트를 연결할 수
            있어요.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button size="sm" onClick={submit} disabled={submitting}>
              {submitting ? "저장 중…" : "저장"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormRow({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[7.5rem_1fr]">
      <div className="flex flex-col gap-0.5 border-b bg-muted/20 px-6 py-3 sm:border-b-0 sm:border-r">
        <span className="text-xs font-semibold text-foreground">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        {hint && (
          <span className="text-[11px] leading-snug text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      <div className="px-6 py-3">{children}</div>
    </div>
  );
}
