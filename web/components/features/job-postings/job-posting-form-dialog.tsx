"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { JobPostingInput, JobPostingStatus, ScheduleKind } from "@/lib/job-postings/types";
import {
  ImportFromMyDataPanel,
  type JobPostingDraft,
} from "@/components/features/job-postings/import-from-my-data-panel";

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
  const [techStackText, setTechStackText] = useState((initial?.techStack ?? []).join(", "));
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [status, setStatus] = useState<JobPostingStatus>((initial?.status as JobPostingStatus) ?? "active");
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!techStackText.trim() && (draft.techStack ?? []).length > 0) {
      setTechStackText((draft.techStack ?? []).join(", "));
    }
    if (!memo.trim() && draft.memo) {
      setMemo(draft.memo);
    }
    if (attach) {
      setPendingAttachment(attach);
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
      const payload: JobPostingInput = {
        companyName: companyName.trim(),
        roleTitle: roleTitle.trim(),
        postingUrl: postingUrl.trim() || null,
        techStack: techStackText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
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
            <Input value={postingUrl} onChange={(e) => setPostingUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1">
            <Label>요구 기술 (쉼표로 구분)</Label>
            <Input value={techStackText} onChange={(e) => setTechStackText(e.target.value)} placeholder="React, TypeScript, Node.js" />
          </div>

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
