"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

type Option = { id: string; title: string };
type ProjectOption = { id: string; title: string; period: string };

/**
 * 채용공고 상세 페이지의 "연결된 자료" 섹션에서 사용.
 * 4가지 자료 타입(이력서·자기소개서·포트폴리오·프로젝트)을 한 줄씩 inline 폼으로
 * 보여주고, 카드 중첩 없이 detail 표 안에 자연스럽게 녹아든다.
 */
export function AttachmentPicker({
  postingId,
  onAdded,
}: {
  postingId: string;
  onAdded: () => void;
}) {
  const [resumes, setResumes] = useState<Option[]>([]);
  const [coverLetters, setCoverLetters] = useState<Option[]>([]);
  const [portfolios, setPortfolios] = useState<Option[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const [resumeId, setResumeId] = useState("");
  const [coverLetterId, setCoverLetterId] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [projectId, setProjectId] = useState("");

  const [busy, setBusy] = useState<
    "resume" | "cover_letter" | "portfolio" | "project" | null
  >(null);

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

  const post = async (
    kind: "resume" | "cover_letter" | "portfolio" | "project",
    payload: Record<string, unknown>,
  ) => {
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
        onAdded();
        if (kind === "resume") setResumeId("");
        if (kind === "cover_letter") setCoverLetterId("");
        if (kind === "portfolio") setPortfolioId("");
        if (kind === "project") setProjectId("");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-2">
      <PickerRow
        label="이력서"
        value={resumeId}
        onValueChange={setResumeId}
        options={resumes}
        emptyText="등록된 이력서가 없습니다"
        disabled={busy !== null}
        loading={busy === "resume"}
        onSubmit={() =>
          resumeId &&
          post("resume", { attachmentType: "resume", resumeId })
        }
      />
      <PickerRow
        label="자기소개서"
        value={coverLetterId}
        onValueChange={setCoverLetterId}
        options={coverLetters}
        emptyText="등록된 자기소개서가 없습니다"
        disabled={busy !== null}
        loading={busy === "cover_letter"}
        onSubmit={() =>
          coverLetterId &&
          post("cover_letter", {
            attachmentType: "cover_letter",
            coverLetterId,
          })
        }
      />
      <PickerRow
        label="포트폴리오"
        value={portfolioId}
        onValueChange={setPortfolioId}
        options={portfolios}
        emptyText="등록된 포트폴리오가 없습니다"
        disabled={busy !== null}
        loading={busy === "portfolio"}
        onSubmit={() =>
          portfolioId &&
          post("portfolio", { attachmentType: "portfolio", portfolioId })
        }
      />
      <PickerRow
        label="프로젝트"
        value={projectId}
        onValueChange={setProjectId}
        options={projects.map((p) => ({
          id: p.id,
          title: p.period ? `${p.title} · ${p.period}` : p.title,
        }))}
        emptyText="이력서에 등록된 프로젝트가 없습니다"
        disabled={busy !== null}
        loading={busy === "project"}
        onSubmit={() => {
          if (!projectId) return;
          const target = projects.find((p) => p.id === projectId);
          void post("project", {
            attachmentType: "project",
            projectId,
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
  value,
  onValueChange,
  options,
  emptyText,
  disabled,
  loading,
  onSubmit,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: Option[];
  emptyText: string;
  disabled: boolean;
  loading: boolean;
  onSubmit: () => void;
}) {
  const isEmpty = options.length === 0;
  return (
    <div className="grid grid-cols-[6rem_1fr_auto] items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isEmpty}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue
            placeholder={isEmpty ? emptyText : `${label} 선택`}
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
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 px-3"
        disabled={!value || disabled}
        onClick={onSubmit}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {loading ? "연결 중…" : "연결"}
      </Button>
    </div>
  );
}
