"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Sparkles, Wand2 } from "lucide-react";

interface JobPostingDraft {
  companyName?: string;
  roleTitle?: string;
  techStack?: string[];
  responsibilities?: string[];
  requirements?: string[];
  memo?: string;
}

type SourceKind = "resume" | "cover_letter";

type ItemOption = { id: string; title: string; isActive?: boolean; updatedAt?: string };

export interface ImportFromMyDataPanelProps {
  onApply: (
    draft: JobPostingDraft,
    attach?: { type: SourceKind; id: string },
  ) => void;
}

export function ImportFromMyDataPanel({ onApply }: ImportFromMyDataPanelProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<SourceKind>("resume");
  const [resumes, setResumes] = useState<ItemOption[]>([]);
  const [coverLetters, setCoverLetters] = useState<ItemOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<JobPostingDraft | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [suggestedAttachment, setSuggestedAttachment] = useState<{
    type: SourceKind;
    id: string;
  } | null>(null);
  const [autoAttach, setAutoAttach] = useState(true);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 마운트 시 자료 목록 페치
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [rRes, clRes] = await Promise.all([
          fetch("/api/my/resume", { cache: "no-store" }),
          fetch("/api/my/cover-letters", { cache: "no-store" }),
        ]);
        const rj = await rRes.json().catch(() => null);
        const clj = await clRes.json().catch(() => null);
        if (cancelled) return;
        const rawResumes = Array.isArray(rj?.data?.items)
          ? (rj.data.items as Array<Record<string, unknown>>)
          : [];
        const rawCovers = Array.isArray(clj?.data?.items)
          ? (clj.data.items as Array<Record<string, unknown>>)
          : [];
        const rItems: ItemOption[] = rawResumes.map((r) => ({
          id: String(r.id ?? ""),
          title:
            (typeof r.title === "string" && r.title) ||
            (typeof r.source_file_name === "string" && r.source_file_name) ||
            "이력서",
          isActive: Boolean(r.is_active),
          updatedAt:
            typeof r.updated_at === "string"
              ? r.updated_at
              : typeof r.updatedAt === "string"
                ? r.updatedAt
                : undefined,
        }));
        const clItems: ItemOption[] = rawCovers.map((c) => ({
          id: String(c.id ?? ""),
          title: (typeof c.title === "string" && c.title) || "자기소개서",
          isActive: Boolean(c.isActive ?? c.is_active),
          updatedAt:
            typeof c.updatedAt === "string"
              ? c.updatedAt
              : typeof c.updated_at === "string"
                ? c.updated_at
                : undefined,
        }));
        setResumes(rItems);
        setCoverLetters(clItems);
      } catch {
        // ignore — 사용자가 다시 시도 가능
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // source 변경 시 selectedId를 해당 소스의 첫 항목으로 초기화
  useEffect(() => {
    const list = source === "resume" ? resumes : coverLetters;
    if (list.length === 0) {
      setSelectedId("");
      return;
    }
    // 이미 유효한 id면 유지
    if (selectedId && list.some((it) => it.id === selectedId)) return;
    const active = list.find((it) => it.isActive);
    setSelectedId(active?.id ?? list[0]?.id ?? "");
  }, [source, resumes, coverLetters, selectedId]);

  // 미리보기 초기화: 소스 변경 시 이전 결과 클리어
  useEffect(() => {
    setDraft(null);
    setSourceLabel("");
    setSuggestedAttachment(null);
    setError(null);
  }, [source]);

  const currentList = source === "resume" ? resumes : coverLetters;

  const pickActive = () => {
    if (source === "resume") {
      const active = resumes.find((r) => r.isActive);
      if (active) {
        setSelectedId(active.id);
        return;
      }
      // fallback: 가장 최근
      if (resumes[0]) setSelectedId(resumes[0].id);
      return;
    }
    // cover_letter: is_active 우선, 없으면 첫 항목(API가 updated_at desc로 줌)
    const active = coverLetters.find((c) => c.isActive);
    if (active) {
      setSelectedId(active.id);
      return;
    }
    if (coverLetters[0]) setSelectedId(coverLetters[0].id);
  };

  const extract = async () => {
    setError(null);
    setExtracting(true);
    try {
      const params = new URLSearchParams({ source });
      if (selectedId) params.set("id", selectedId);
      const res = await fetch(
        `/api/my/job-postings/import-suggestions?${params.toString()}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => null);
      if (!json || !json.success) {
        throw new Error(json?.error ?? "추출에 실패했습니다.");
      }
      const data = json.data as {
        draft: JobPostingDraft;
        sourceLabel: string;
        suggestedAttachment: { type: SourceKind; id: string } | null;
      };
      setDraft(data.draft ?? null);
      setSourceLabel(data.sourceLabel ?? "");
      setSuggestedAttachment(data.suggestedAttachment ?? null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "추출에 실패했습니다.";
      setError(message);
    } finally {
      setExtracting(false);
    }
  };

  const apply = () => {
    if (!draft) return;
    const attach =
      autoAttach && suggestedAttachment
        ? { type: suggestedAttachment.type, id: suggestedAttachment.id }
        : undefined;
    onApply(draft, attach);
    setOpen(false);
  };

  const previewRows: Array<{ key: string; label: string; value?: string }> = [
    { key: "companyName", label: "회사명", value: draft?.companyName },
    { key: "roleTitle", label: "직무명", value: draft?.roleTitle },
    {
      key: "techStack",
      label: "기술 스택",
      value: (draft?.techStack ?? []).join(", "),
    },
    {
      key: "responsibilities",
      label: "주요 업무",
      value: (draft?.responsibilities ?? []).join(" · "),
    },
    {
      key: "requirements",
      label: "자격 요건",
      value: (draft?.requirements ?? []).join(" · "),
    },
    { key: "memo", label: "메모", value: draft?.memo },
  ];

  const hasDraftValues = previewRows.some((r) => r.value && r.value.trim().length > 0);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border bg-muted/30"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-muted/50"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            내 자료에서 가져오기
            <span className="text-xs font-normal text-muted-foreground">
              이력서·자기소개서에서 회사/직무/기술 스택을 자동으로 채워요
            </span>
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t bg-background px-3 py-3">
        {/* 1. Source 선택 */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">자료 종류</Label>
          <RadioGroup
            value={source}
            onValueChange={(v) => setSource(v as SourceKind)}
            className="flex gap-4"
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="resume" id="import-source-resume" />
              <span>이력서</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="cover_letter" id="import-source-cover-letter" />
              <span>자기소개서</span>
            </label>
          </RadioGroup>
        </div>

        {/* 2. 항목 선택 + 활성 선택 빠른 버튼 */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">항목</Label>
          <div className="flex gap-2">
            <Select
              value={selectedId}
              onValueChange={setSelectedId}
              disabled={loading || currentList.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue
                  placeholder={
                    loading
                      ? "불러오는 중…"
                      : currentList.length === 0
                        ? source === "resume"
                          ? "등록된 이력서가 없습니다"
                          : "등록된 자기소개서가 없습니다"
                        : "항목 선택"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {currentList.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.title}
                    {it.isActive ? " · 활성" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={pickActive}
              disabled={currentList.length === 0}
              title="활성 항목 자동 선택"
            >
              활성 선택
            </Button>
          </div>
        </div>

        {/* 3. 추출 버튼 */}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            onClick={extract}
            disabled={extracting || (!selectedId && currentList.length > 0)}
          >
            <Wand2 className="mr-1 h-3.5 w-3.5" />
            {extracting ? "추출 중…" : "추출하기"}
          </Button>
          {sourceLabel && (
            <span className="text-xs text-muted-foreground">{sourceLabel}</span>
          )}
        </div>

        {/* 4. 결과 미리보기 */}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {draft && (
          <div className="space-y-2 rounded-md border bg-card/60 p-3">
            <div className="text-xs font-semibold text-muted-foreground">
              추출 결과 미리보기
            </div>
            <div className="grid gap-1.5 text-sm">
              {previewRows.map((row) => (
                <div key={row.key} className="grid grid-cols-[6rem,1fr] gap-2">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span
                    className={
                      row.value && row.value.trim().length > 0
                        ? "text-foreground"
                        : "text-muted-foreground/60"
                    }
                  >
                    {row.value && row.value.trim().length > 0
                      ? row.value
                      : "(없음)"}
                  </span>
                </div>
              ))}
            </div>
            {!hasDraftValues && (
              <div className="text-xs text-muted-foreground">
                추출된 정보가 없습니다. 다른 자료를 선택해 보세요.
              </div>
            )}
          </div>
        )}

        {/* 5. 자동 첨부 + 적용 */}
        {draft && (
          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={autoAttach}
                onCheckedChange={(v) => setAutoAttach(Boolean(v))}
                disabled={!suggestedAttachment}
              />
              <span>
                이 자료를 채용공고에 자동 연결
                {!suggestedAttachment && " (연결 가능한 자료 없음)"}
              </span>
            </label>
            <Button type="button" size="sm" onClick={apply}>
              폼에 적용
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export type { JobPostingDraft };
