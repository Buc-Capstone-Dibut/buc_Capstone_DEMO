"use client";

import { useState } from "react";
import { Download, GraduationCap, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  EDUCATION_STATUS_LABELS,
  educationListSchema,
  formatEducationPeriod,
  normalizeEducation,
  type EducationStatus,
  type ResumeEducation,
} from "@/lib/resume/education";

function emptyEducation(): ResumeEducation {
  return { id: crypto.randomUUID(), school: "", major: "", startDate: "", endDate: "", status: "enrolled", included: true };
}

export function ResumeEducationSection({ value, onChange }: {
  value: ResumeEducation[];
  onChange: (education: ResumeEducation[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ResumeEducation[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const openEditor = () => {
    setDraft(value.length ? value.map((item) => ({ ...item })) : [emptyEducation()]);
    setError(null);
    setOpen(true);
  };

  const updateDraft = (id: string, patch: Partial<ResumeEducation>) => {
    setError(null);
    setDraft((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const loadSavedEducation = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/my/resume/education", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || "저장된 학력을 불러오지 못했습니다.");
      const education = normalizeEducation(json.data?.education);
      if (!education.length) {
        toast({ title: "저장된 학력이 없습니다.", description: "학력을 추가하면 다음 이력서에서도 사용할 수 있습니다." });
        return;
      }
      onChange(education);
      toast({ title: "저장된 학력을 불러왔습니다.", description: "이력서 저장을 누르면 현재 이력서에도 반영됩니다." });
    } catch (loadError) {
      toast({ title: "학력 불러오기 실패", description: loadError instanceof Error ? loadError.message : "잠시 후 다시 시도해 주세요.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveEducation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const parsed = educationListSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "학력 정보를 확인해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/my/resume/education", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ education: parsed.data }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || "학력을 저장하지 못했습니다.");
      onChange(parsed.data);
      setOpen(false);
      toast({ title: "학력을 저장했습니다.", description: "새 이력서에 자동으로 채워집니다. 현재 이력서는 이력서 저장을 눌러 반영해 주세요." });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "학력을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <GraduationCap className="h-4 w-4 text-primary" aria-hidden />
          학력
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={loadSavedEducation} disabled={loading} className="h-7 gap-1 px-2 text-[11px] text-muted-foreground">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            저장된 학력 불러오기
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openEditor} disabled={loading} className="h-7 gap-1 px-2 text-xs">
            {value.length ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {value.length ? "학력 수정" : "학력 추가"}
          </Button>
        </div>
      </div>

      {value.length ? (
        <div className="divide-y rounded-lg border bg-muted/10 px-3">
          {value.map((item) => (
            <div key={item.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{[item.school, item.major].filter(Boolean).join(" · ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{[formatEducationPeriod(item), EDUCATION_STATUS_LABELS[item.status]].filter(Boolean).join(" · ")}</p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                <Checkbox checked={item.included} onCheckedChange={(checked) => onChange(value.map((entry) => entry.id === item.id ? { ...entry, included: checked === true } : entry))} aria-label={`${item.school} 이력서에 표시`} />
                이력서에 표시
              </label>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground">학교와 재학 기간을 등록하세요. 저장한 학력은 다음 이력서에서도 사용할 수 있습니다.</p>
      )}

      <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
        <DialogContent className="max-w-xl overflow-hidden p-0">
          <form onSubmit={saveEducation} className="flex max-h-[85vh] flex-col">
            <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-5 text-left">
              <DialogTitle>학력 추가·수정</DialogTitle>
              <DialogDescription>저장한 학력은 새 이력서에도 자동으로 채워집니다.</DialogDescription>
            </DialogHeader>
            <fieldset disabled={saving} className="min-w-0 space-y-4 overflow-y-auto px-5 py-4">
              {draft.map((item, index) => (
                <div key={item.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">학력 {index + 1}</p>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDraft((items) => items.filter((entry) => entry.id !== item.id))} className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label={`학력 ${index + 1} 삭제`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`school-${item.id}`} className="text-xs">학교명 <span className="text-destructive">*</span></Label>
                      <Input id={`school-${item.id}`} value={item.school} onChange={(event) => updateDraft(item.id, { school: event.target.value })} placeholder="예: ○○대학교" required maxLength={100} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`major-${item.id}`} className="text-xs">전공·학과 <span className="text-muted-foreground">(선택)</span></Label>
                      <Input id={`major-${item.id}`} value={item.major} onChange={(event) => updateDraft(item.id, { major: event.target.value })} placeholder="예: 컴퓨터공학과" maxLength={100} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`status-${item.id}`} className="text-xs">재학 상태</Label>
                    <Select value={item.status} onValueChange={(status: EducationStatus) => updateDraft(item.id, { status, ...(status === "enrolled" || status === "leave" ? { endDate: "", period: undefined } : {}) })}>
                      <SelectTrigger id={`status-${item.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(EDUCATION_STATUS_LABELS).map(([status, label]) => <SelectItem key={status} value={status}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`start-${item.id}`} className="text-xs">입학 연월</Label>
                      <Input id={`start-${item.id}`} type="month" value={item.startDate} onChange={(event) => updateDraft(item.id, { startDate: event.target.value, period: undefined })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`end-${item.id}`} className="text-xs">{item.status === "expected" ? "졸업 예정 연월" : item.status === "graduated" ? "졸업 연월" : "종료 연월"}</Label>
                      {item.status === "enrolled" || item.status === "leave" ? <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">현재</div> : <Input id={`end-${item.id}`} type="month" value={item.endDate} onChange={(event) => updateDraft(item.id, { endDate: event.target.value, period: undefined })} min={item.startDate || undefined} />}
                    </div>
                  </div>
                  {item.period && !item.startDate && !item.endDate ? <p className="text-xs text-muted-foreground">기존 재학 기간: {item.period}</p> : null}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setDraft((items) => [...items, emptyEducation()])} disabled={draft.length >= 20} className="w-full gap-1.5 border-dashed">
                <Plus className="h-4 w-4" />학력 추가
              </Button>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            </fieldset>
            <DialogFooter className="shrink-0 border-t px-5 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>취소</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                학력 저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
