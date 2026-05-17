"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2 } from "lucide-react";

type Option = { id: string; title: string };
type ProjectOption = { id: string; title: string; period: string };
type Kind = "resume" | "cover_letter" | "portfolio" | "project";

/** 이미 첨부된 자료의 id 모음 — 옵션에서 제외용 */
export interface AttachedIds {
  resume: Set<string>;
  cover_letter: Set<string>;
  portfolio: Set<string>;
  project: Set<string>;
}

/**
 * 채용공고 상세 페이지의 "연결된 자료" 섹션에서 사용.
 * 4가지 자료 타입을 한 줄씩 inline select로 보여주고,
 * 선택 즉시 자동으로 attach API 호출 (별도 "연결" 버튼 불필요).
 * 이미 연결된 자료는 옵션에서 제외되어 중복 연결 방지.
 */
export function AttachmentPicker({
  postingId,
  attachedIds,
  onAdded,
}: {
  postingId: string;
  attachedIds?: AttachedIds;
  onAdded: () => void;
}) {
  const [resumes, setResumes] = useState<Option[]>([]);
  const [coverLetters, setCoverLetters] = useState<Option[]>([]);
  const [portfolios, setPortfolios] = useState<Option[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const [busy, setBusy] = useState<Kind | null>(null);
  const [recent, setRecent] = useState<Kind | null>(null);

  const loadOptions = async () => {
    const [rRes, clRes, pRes, prjRes] = await Promise.all([
      fetch("/api/my/resume", { cache: "no-store" }),
      fetch("/api/my/cover-letters", { cache: "no-store" }),
      fetch("/api/career/portfolios", { cache: "no-store" }),
      fetch("/api/my/projects", { cache: "no-store" }),
    ]);
    const [rj, clj, pj, prjj] = await Promise.all([
      rRes.json().catch(() => ({})),
      clRes.json().catch(() => ({})),
      pRes.json().catch(() => ({})),
      prjRes.json().catch(() => ({})),
    ]);
    setResumes(
      (rj?.data?.items ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? "이력서",
      })),
    );
    setCoverLetters(
      (clj?.data?.items ?? []).map((c: any) => ({
        id: c.id,
        title: c.title ?? "자기소개서",
      })),
    );
    setPortfolios(
      (pj?.items ?? []).map((x: any) => ({
        id: x.id,
        title: x.title ?? "포트폴리오",
      })),
    );
    setProjects(
      (prjj?.data?.items ?? []).map((x: any) => ({
        id: x.id,
        title: x.title ?? "프로젝트",
        period: x.period ?? "",
      })),
    );
  };

  useEffect(() => {
    void loadOptions();
  }, []);

  const attach = async (kind: Kind, payload: Record<string, unknown>) => {
    setBusy(kind);
    try {
      const res = await fetch(
        `/api/my/job-postings/${postingId}/attachments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if ((await res.json()).success) {
        setRecent(kind);
        onAdded();
        // 짧은 success 표시 후 reset
        setTimeout(() => setRecent((curr) => (curr === kind ? null : curr)), 1500);
      }
    } finally {
      setBusy(null);
    }
  };

  // 이미 첨부된 자료는 옵션에서 제외
  const filteredResumes = useMemo(
    () => resumes.filter((o) => !attachedIds?.resume.has(o.id)),
    [resumes, attachedIds],
  );
  const filteredCoverLetters = useMemo(
    () => coverLetters.filter((o) => !attachedIds?.cover_letter.has(o.id)),
    [coverLetters, attachedIds],
  );
  const filteredPortfolios = useMemo(
    () => portfolios.filter((o) => !attachedIds?.portfolio.has(o.id)),
    [portfolios, attachedIds],
  );
  const filteredProjects = useMemo(
    () => projects.filter((o) => !attachedIds?.project.has(o.id)),
    [projects, attachedIds],
  );

  return (
    <div className="grid gap-2">
      <PickerRow
        label="이력서"
        options={filteredResumes}
        emptyText={
          resumes.length === 0
            ? "등록된 이력서가 없습니다"
            : "모두 연결됨"
        }
        disabled={busy !== null}
        loading={busy === "resume"}
        success={recent === "resume"}
        onPick={(id) =>
          attach("resume", { attachmentType: "resume", resumeId: id })
        }
      />
      <PickerRow
        label="자기소개서"
        options={filteredCoverLetters}
        emptyText={
          coverLetters.length === 0
            ? "등록된 자기소개서가 없습니다"
            : "모두 연결됨"
        }
        disabled={busy !== null}
        loading={busy === "cover_letter"}
        success={recent === "cover_letter"}
        onPick={(id) =>
          attach("cover_letter", {
            attachmentType: "cover_letter",
            coverLetterId: id,
          })
        }
      />
      <PickerRow
        label="포트폴리오"
        options={filteredPortfolios}
        emptyText={
          portfolios.length === 0
            ? "등록된 포트폴리오가 없습니다"
            : "모두 연결됨"
        }
        disabled={busy !== null}
        loading={busy === "portfolio"}
        success={recent === "portfolio"}
        onPick={(id) =>
          attach("portfolio", { attachmentType: "portfolio", portfolioId: id })
        }
      />
      <PickerRow
        label="프로젝트"
        options={filteredProjects.map((p) => ({
          id: p.id,
          title: p.period ? `${p.title} · ${p.period}` : p.title,
        }))}
        emptyText={
          projects.length === 0
            ? "이력서에 등록된 프로젝트가 없습니다"
            : "모두 연결됨"
        }
        disabled={busy !== null}
        loading={busy === "project"}
        success={recent === "project"}
        onPick={(id) => {
          const target = projects.find((p) => p.id === id);
          void attach("project", {
            attachmentType: "project",
            projectId: id,
            projectLabel: target
              ? target.period
                ? `${target.title} · ${target.period}`
                : target.title
              : null,
          });
        }}
      />
    </div>
  );
}

function PickerRow({
  label,
  options,
  emptyText,
  disabled,
  loading,
  success,
  onPick,
}: {
  label: string;
  options: Option[];
  emptyText: string;
  disabled: boolean;
  loading: boolean;
  success: boolean;
  onPick: (id: string) => void;
}) {
  const isEmpty = options.length === 0;
  return (
    <div className="grid grid-cols-[6rem_1fr_auto] items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select
        value=""
        onValueChange={(v) => {
          if (v) onPick(v);
        }}
        disabled={disabled || isEmpty}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue
            placeholder={isEmpty ? emptyText : `${label} 선택 후 자동 연결`}
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="flex h-8 w-16 items-center justify-center text-[11px] text-muted-foreground">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : success ? (
          <span className="inline-flex items-center gap-0.5 text-emerald-600">
            <Check className="h-3 w-3" aria-hidden />
            연결됨
          </span>
        ) : null}
      </span>
    </div>
  );
}
