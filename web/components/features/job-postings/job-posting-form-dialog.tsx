"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wand2, Loader2 } from "lucide-react";
import type { JobPostingInput, JobPostingStatus, ScheduleKind } from "@/lib/job-postings/types";
import {
  ImportFromMyDataPanel,
  type JobPostingDraft,
} from "@/components/features/job-postings/import-from-my-data-panel";
import { TechStackCombobox } from "@/components/features/job-postings/tech-stack-combobox";

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

type PendingAttachment = { type: "resume" | "cover_letter"; id: string };

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
  /**
   * Legacy 콜백. 부모가 직접 POST 책임을 진다.
   * 제공되면 다이얼로그는 onSubmit만 호출하고 직접 fetch 하지 않는다.
   */
  onSubmit?: (payload: JobPostingInput) => Promise<void>;
  /**
   * 신규 경로. 다이얼로그가 직접 POST /api/my/job-postings를 호출하고,
   * (필요 시) 자동 첨부까지 처리한 뒤 부모에게 갱신 신호를 준다.
   */
  onCreated?: () => Promise<void> | void;
}) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [roleTitle, setRoleTitle] = useState(initial?.roleTitle ?? "");
  const [postingUrl, setPostingUrl] = useState(initial?.postingUrl ?? "");
  const [techStack, setTechStack] = useState<string[]>(initial?.techStack ?? []);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [status, setStatus] = useState<JobPostingStatus>((initial?.status as JobPostingStatus) ?? "active");
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 상세 정보 (URL 파싱 또는 직접 입력)
  const [responsibilitiesText, setResponsibilitiesText] = useState((initial?.responsibilities ?? []).join("\n"));
  const [requirementsText, setRequirementsText] = useState((initial?.requirements ?? []).join("\n"));
  const [preferredText, setPreferredText] = useState((initial?.preferred ?? []).join("\n"));
  const [companyDescriptionText, setCompanyDescriptionText] = useState(initial?.companyDescription ?? "");
  const [teamCultureText, setTeamCultureText] = useState((initial?.teamCulture ?? []).join("\n"));

  // URL 자동 파싱 상태
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState(false);

  // import 패널에서 받은 자동 첨부 후보 (등록 후 attachments POST에 사용)
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

  const handleApplyDraft = (
    draft: JobPostingDraft,
    attach?: { type: "resume" | "cover_letter"; id: string },
  ) => {
    // 빈 필드만 채움 (사용자가 이미 입력한 값은 덮어쓰지 않음)
    if (!companyName.trim() && draft.companyName) {
      setCompanyName(draft.companyName);
    }
    if (!roleTitle.trim() && draft.roleTitle) {
      setRoleTitle(draft.roleTitle);
    }
    if (techStack.length === 0 && (draft.techStack ?? []).length > 0) {
      setTechStack(draft.techStack ?? []);
    }
    if (!memo.trim() && draft.memo) {
      setMemo(draft.memo);
    }
    if (attach) {
      setPendingAttachment(attach);
    }
  };

  const parseFromUrl = async () => {
    const trimmed = postingUrl.trim();
    if (!trimmed) return;
    setParseError(null);
    setParseSuccess(false);
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

      const asString = (v: unknown): string => (typeof v === "string" ? v : "");
      const asStringArray = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

      // 빈 필드만 채움 (사용자가 이미 입력한 값은 절대 덮어쓰지 않음)
      if (!companyName.trim() && asString(data.company)) {
        setCompanyName(asString(data.company));
      }
      if (!roleTitle.trim() && asString(data.title)) {
        setRoleTitle(asString(data.title));
      }
      if (techStack.length === 0) {
        const arr = asStringArray(data.techStack);
        if (arr.length > 0) {
          setTechStack(arr);
        }
      }
      if (!companyDescriptionText.trim() && asString(data.description)) {
        setCompanyDescriptionText(asString(data.description));
      }
      if (!responsibilitiesText.trim()) {
        const arr = asStringArray(data.responsibilities);
        if (arr.length > 0) setResponsibilitiesText(arr.join("\n"));
      }
      if (!requirementsText.trim()) {
        const arr = asStringArray(data.requirements);
        if (arr.length > 0) setRequirementsText(arr.join("\n"));
      }
      if (!preferredText.trim()) {
        const arr = asStringArray(data.preferred);
        if (arr.length > 0) setPreferredText(arr.join("\n"));
      }
      if (!teamCultureText.trim()) {
        const arr = asStringArray(data.culture);
        if (arr.length > 0) setTeamCultureText(arr.join("\n"));
      }
      setParseSuccess(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "URL에서 정보를 가져오지 못했습니다.";
      setParseError(message);
    } finally {
      setParsing(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!companyName.trim() || !roleTitle.trim()) {
      setError("회사명과 직무명을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const splitLines = (text: string): string[] =>
        text.split(/\n+/).map((s) => s.trim()).filter(Boolean);

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
        // legacy 경로: 부모가 직접 처리. 자동 첨부도 부모 책임.
        await onSubmit(payload);
      } else {
        // 신규 경로: dialog가 직접 fetch
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
        if (createdId && pendingAttachment) {
          const attachBody: Record<string, unknown> = {
            attachmentType: pendingAttachment.type,
          };
          if (pendingAttachment.type === "resume") {
            attachBody.resumeId = pendingAttachment.id;
          } else {
            attachBody.coverLetterId = pendingAttachment.id;
          }
          // 첨부 실패는 등록 자체를 막지 않는다.
          try {
            await fetch(`/api/my/job-postings/${createdId}/attachments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(attachBody),
            });
          } catch {
            // ignore — 사용자가 다이얼로그 닫은 뒤 수동 첨부 가능
          }
        }
        if (onCreated) {
          await onCreated();
        }
      }
      // 성공 시 패널 상태 초기화 후 닫기
      setPendingAttachment(null);
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>채용공고 등록</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <ImportFromMyDataPanel onApply={handleApplyDraft} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>회사명 *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="예: 카카오" />
            </div>
            <div className="space-y-1">
              <Label>직무명 *</Label>
              <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="예: 백엔드 개발자" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>공고 URL</Label>
            <div className="flex gap-2">
              <Input
                value={postingUrl}
                onChange={(e) => {
                  setPostingUrl(e.target.value);
                  setParseError(null);
                  setParseSuccess(false);
                }}
                placeholder="https://..."
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={parseFromUrl}
                disabled={!postingUrl.trim() || parsing}
              >
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                <span className="ml-1">URL에서 가져오기</span>
              </Button>
            </div>
            {parseError && <p className="text-xs text-red-600">{parseError}</p>}
            {parseSuccess && (
              <p className="text-xs text-emerald-600">자동 추출 완료. 비어있는 필드만 채워졌습니다.</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>요구 기술</Label>
            <TechStackCombobox
              value={techStack}
              onChange={setTechStack}
              placeholder="기술을 검색하거나 입력 후 Enter (예: React)"
            />
          </div>

          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">상세 정보 (선택)</summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label>주요 업무 (한 줄에 하나)</Label>
                <Textarea
                  rows={3}
                  value={responsibilitiesText}
                  onChange={(e) => setResponsibilitiesText(e.target.value)}
                  placeholder="예: 백엔드 API 설계 및 개발"
                />
              </div>
              <div className="space-y-1">
                <Label>자격 요건 (한 줄에 하나)</Label>
                <Textarea
                  rows={3}
                  value={requirementsText}
                  onChange={(e) => setRequirementsText(e.target.value)}
                  placeholder="예: 컴퓨터공학 학사 또는 동등 수준"
                />
              </div>
              <div className="space-y-1">
                <Label>우대 사항 (한 줄에 하나)</Label>
                <Textarea
                  rows={3}
                  value={preferredText}
                  onChange={(e) => setPreferredText(e.target.value)}
                  placeholder="예: 대규모 트래픽 처리 경험"
                />
              </div>
              <div className="space-y-1">
                <Label>회사 설명</Label>
                <Textarea
                  rows={2}
                  value={companyDescriptionText}
                  onChange={(e) => setCompanyDescriptionText(e.target.value)}
                  placeholder="회사 소개 또는 공고 본문 요약"
                />
              </div>
              <div className="space-y-1">
                <Label>팀 문화 (한 줄에 하나)</Label>
                <Textarea
                  rows={2}
                  value={teamCultureText}
                  onChange={(e) => setTeamCultureText(e.target.value)}
                  placeholder="예: 자율과 책임"
                />
              </div>
            </div>
          </details>

          <div className="space-y-1">
            <Label>상태</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as JobPostingStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>메모</Label>
            <Textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">일정</div>
              <Button type="button" size="sm" variant="outline" onClick={() =>
                setSchedules((arr) => [...arr, { kind: "deadline", title: "", startAt: "", endAt: "", memo: "" }])
              }>
                <Plus className="mr-1 h-3.5 w-3.5" /> 추가
              </Button>
            </div>
            <div className="space-y-2">
              {schedules.map((s, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <Select value={s.kind} onValueChange={(v) =>
                    setSchedules((arr) => arr.map((it, i) => i === idx ? { ...it, kind: v as ScheduleKind } : it))
                  }>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="col-span-4" type="datetime-local" value={s.startAt}
                    onChange={(e) => setSchedules((arr) => arr.map((it, i) => i === idx ? { ...it, startAt: e.target.value } : it))} />
                  <Input className="col-span-4" placeholder="제목 (선택)" value={s.title}
                    onChange={(e) => setSchedules((arr) => arr.map((it, i) => i === idx ? { ...it, title: e.target.value } : it))} />
                  <Button type="button" size="icon" variant="ghost" className="col-span-1"
                    onClick={() => setSchedules((arr) => arr.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {pendingAttachment && (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              등록 시 {pendingAttachment.type === "resume" ? "이력서" : "자기소개서"}가 자동으로 연결됩니다.
              <button
                type="button"
                className="ml-2 text-primary underline"
                onClick={() => setPendingAttachment(null)}
              >
                해제
              </button>
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>취소</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "저장 중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
