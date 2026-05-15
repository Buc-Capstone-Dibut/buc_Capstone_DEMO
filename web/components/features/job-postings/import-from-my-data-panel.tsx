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
import { ChevronDown, ChevronUp, Plus, Sparkles, Wand2 } from "lucide-react";

interface JobPostingDraft {
  companyName?: string;
  roleTitle?: string;
  techStack?: string[];
  responsibilities?: string[];
  requirements?: string[];
  memo?: string;
}

type SourceKind = "resume" | "cover_letter" | "portfolio" | "project";

type ItemOption = { id: string; title: string; isActive?: boolean; updatedAt?: string };

export interface ImportFromMyDataPanelProps {
  onApply: (
    draft: JobPostingDraft,
    attach?: { type: SourceKind; id: string; label?: string },
  ) => void;
}

export function ImportFromMyDataPanel({ onApply }: ImportFromMyDataPanelProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<SourceKind>("resume");
  const [resumes, setResumes] = useState<ItemOption[]>([]);
  const [coverLetters, setCoverLetters] = useState<ItemOption[]>([]);
  const [portfolios, setPortfolios] = useState<ItemOption[]>([]);
  const [projects, setProjects] = useState<ItemOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<JobPostingDraft | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [suggestedAttachment, setSuggestedAttachment] = useState<{
    type: SourceKind;
    id: string;
    label?: string;
  } | null>(null);
  const [autoAttach, setAutoAttach] = useState(true);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [rRes, clRes, pfRes, pjRes] = await Promise.all([
          fetch("/api/my/resume", { cache: "no-store" }),
          fetch("/api/my/cover-letters", { cache: "no-store" }),
          fetch("/api/career/portfolios", { cache: "no-store" }).catch(() => null),
          fetch("/api/my/projects", { cache: "no-store" }).catch(() => null),
        ]);
        const rj = await rRes.json().catch(() => null);
        const clj = await clRes.json().catch(() => null);
        const pfj = pfRes ? await pfRes.json().catch(() => null) : null;
        const pjj = pjRes ? await pjRes.json().catch(() => null) : null;
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

        const rawPortfolios = Array.isArray(pfj?.items ?? pfj?.data?.items ?? pfj?.data)
          ? ((pfj?.items ?? pfj?.data?.items ?? pfj?.data) as Array<Record<string, unknown>>)
          : [];
        const pfItems: ItemOption[] = rawPortfolios.map((p) => ({
          id: String(p.id ?? ""),
          title: (typeof p.title === "string" && p.title) || "포트폴리오",
        }));

        const rawProjects = Array.isArray(pjj?.data?.items ?? pjj?.data)
          ? ((pjj?.data?.items ?? pjj?.data) as Array<Record<string, unknown>>)
          : [];
        const pjItems: ItemOption[] = rawProjects.map((p) => ({
          id: String(p.id ?? ""),
          title: (typeof p.title === "string" && p.title) || "프로젝트",
        }));

        setResumes(rItems);
        setCoverLetters(clItems);
        setPortfolios(pfItems);
        setProjects(pjItems);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const list = source === "resume" ? resumes : source === "cover_letter" ? coverLetters : source === "portfolio" ? portfolios : projects;
    if (list.length === 0) {
      setSelectedId("");
      return;
    }
    if (selectedId && list.some((it) => it.id === selectedId)) return;
    const active = list.find((it) => it.isActive);
    setSelectedId(active?.id ?? list[0]?.id ?? "");
  }, [source, resumes, coverLetters, portfolios, projects, selectedId]);

  // 미리보기 초기화: 소스 변경 시 이전 결과 클리어
  useEffect(() => {
    setDraft(null);
    setSourceLabel("");
    setSuggestedAttachment(null);
    setError(null);
  }, [source]);

  const currentList = source === "resume" ? resumes : source === "cover_letter" ? coverLetters : source === "portfolio" ? portfolios : projects;

  const pickActive = () => {
    const list = currentList;
    const active = list.find((it) => it.isActive);
    if (active) {
      setSelectedId(active.id);
      return;
    }
    if (list[0]) setSelectedId(list[0].id);
  };

  const isDirectAttach = source === "portfolio" || source === "project";

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

  const directAttach = () => {
    if (!selectedId) return;
    const item = currentList.find((it) => it.id === selectedId);
    const label = item?.title ?? "";
    onApply({}, { type: source, id: selectedId, label });
    setOpen(false);
  };

  const apply = () => {
    if (!draft) return;
    const attach =
      autoAttach && suggestedAttachment
        ? { type: suggestedAttachment.type, id: suggestedAttachment.id, label: suggestedAttachment.label }
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
              이력서·자소서·포트폴리오·프로젝트를 연결해요
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
            className="flex flex-wrap gap-4"
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="resume" id="import-source-resume" />
              <span>이력서</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="cover_letter" id="import-source-cover-letter" />
              <span>자기소개서</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="portfolio" id="import-source-portfolio" />
              <span>포트폴리오</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="project" id="import-source-project" />
              <span>프로젝트</span>
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
                        ? `등록된 ${source === "resume" ? "이력서" : source === "cover_letter" ? "자기소개서" : source === "portfolio" ? "포트폴리오" : "프로젝트"}가 없습니다`
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

        {/* 3. 추출 또는 직접 연결 버튼 */}
        <div className="flex items-center justify-between gap-2">
          {isDirectAttach ? (
            <Button
              type="button"
              size="sm"
              onClick={directAttach}
              disabled={!selectedId}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              공고에 연결
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={extract}
              disabled={extracting || (!selectedId && currentList.length > 0)}
            >
              <Wand2 className="mr-1 h-3.5 w-3.5" />
              {extracting ? "추출 중…" : "추출하기"}
            </Button>
          )}
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
