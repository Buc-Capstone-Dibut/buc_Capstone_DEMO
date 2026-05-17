"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { AttachmentRecord } from "@/lib/job-postings/types";

type Detail =
  | { kind: "resume"; data: any }
  | { kind: "cover_letter"; data: any }
  | { kind: "portfolio"; data: any }
  | { kind: "project"; data: any }
  | null;

const TYPE_LABEL: Record<AttachmentRecord["attachmentType"], string> = {
  resume: "이력서",
  cover_letter: "자기소개서",
  portfolio: "포트폴리오",
  project: "프로젝트",
};

const EDIT_HREF: Record<AttachmentRecord["attachmentType"], string> = {
  resume: "/career/resumes",
  cover_letter: "/career/cover-letters",
  portfolio: "/career/portfolio",
  project: "/career/resumes",
};

export function AttachmentPreviewDialog({
  attachment,
  open,
  onClose,
}: {
  attachment: AttachmentRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !attachment) return;
    let cancelled = false;
    setDetail(null);
    setError(null);
    setLoading(true);

    const fetcher = (async () => {
      try {
        if (attachment.attachmentType === "resume" && attachment.resumeId) {
          const res = await fetch(`/api/my/resume/${attachment.resumeId}`, {
            cache: "no-store",
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "불러올 수 없습니다");
          return { kind: "resume" as const, data: json.data };
        }
        if (
          attachment.attachmentType === "cover_letter" &&
          attachment.coverLetterId
        ) {
          const res = await fetch(
            `/api/my/cover-letters/${attachment.coverLetterId}`,
            { cache: "no-store" },
          );
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "불러올 수 없습니다");
          return { kind: "cover_letter" as const, data: json.data };
        }
        if (attachment.attachmentType === "portfolio" && attachment.portfolioId) {
          const res = await fetch(
            `/api/career/portfolios/${attachment.portfolioId}`,
            { cache: "no-store" },
          );
          const json = await res.json();
          if (json.error) throw new Error(json.error);
          return { kind: "portfolio" as const, data: json };
        }
        // project: detail endpoint이 없으므로 snapshotPayload 사용
        return {
          kind: "project" as const,
          data: attachment.snapshotPayload ?? {},
        };
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "불러올 수 없습니다");
        return null;
      }
    })();

    fetcher.then((d) => {
      if (cancelled) return;
      setDetail(d);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, attachment]);

  if (!attachment) return null;
  const typeLabel = TYPE_LABEL[attachment.attachmentType];
  const editHref = EDIT_HREF[attachment.attachmentType];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px]">
              {typeLabel}
            </Badge>
            <DialogTitle className="text-base">
              {titleOf(attachment, detail)}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            연결된 자료 미리보기
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 text-sm">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              불러오는 중…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && detail && <PreviewBody detail={detail} />}
        </div>

        <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-3 text-xs">
          <span className="text-muted-foreground">
            전체 편집은 {typeLabel} 페이지에서 진행하세요.
          </span>
          <Link
            href={editHref}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {typeLabel} 페이지 열기
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function titleOf(att: AttachmentRecord, detail: Detail): string {
  if (detail) {
    if (detail.kind === "resume") return detail.data?.title || "이력서";
    if (detail.kind === "cover_letter")
      return detail.data?.title || "자기소개서";
    if (detail.kind === "portfolio")
      return detail.data?.item?.title || "포트폴리오";
    if (detail.kind === "project")
      return (
        att.projectLabel || detail.data?.name || detail.data?.title || "프로젝트"
      );
  }
  // fallback to snapshot
  const snap = att.snapshotPayload as any;
  if (att.attachmentType === "cover_letter")
    return att.coverLetterLabel || snap?.title || "자기소개서";
  if (att.attachmentType === "project")
    return att.projectLabel || snap?.name || "프로젝트";
  return snap?.title || TYPE_LABEL[att.attachmentType];
}

function PreviewBody({ detail }: { detail: Exclude<Detail, null> }) {
  if (detail.kind === "resume") return <ResumePreview data={detail.data} />;
  if (detail.kind === "cover_letter")
    return <CoverLetterPreview data={detail.data} />;
  if (detail.kind === "portfolio")
    return <PortfolioPreview data={detail.data} />;
  return <ProjectPreview data={detail.data} />;
}

/* ---------- Resume ---------- */
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function ResumePreview({ data }: { data: any }) {
  const payload = data?.resume_payload ?? {};
  const profile = payload?.personalInfo ?? payload?.profile ?? {};
  const summary =
    asString(payload?.selfIntroduction) ||
    asString(data?.public_summary) ||
    asString(profile?.summary) ||
    asString(profile?.intro);
  const experiences: any[] =
    payload?.experience ?? payload?.experiences ?? [];
  const projects: any[] = payload?.projects ?? [];
  const educations: any[] = payload?.education ?? payload?.educations ?? [];
  const skills: any[] = payload?.skills ?? [];
  const certs: any[] =
    payload?.awards ?? payload?.certifications ?? [];

  return (
    <div className="space-y-5">
      {summary && (
        <Section title="요약">
          <p className="whitespace-pre-line leading-relaxed text-foreground/90">
            {summary}
          </p>
        </Section>
      )}
      {(profile?.name || profile?.email) && (
        <Section title="기본 정보">
          <KvGrid
            rows={(
              [
                ["이름", profile?.name],
                ["이메일", profile?.email],
                ["연락처", profile?.phone],
                ["한 줄 소개", profile?.intro],
                ["GitHub", profile?.links?.github || profile?.github],
                ["블로그", profile?.links?.blog || profile?.blog],
                ["LinkedIn", profile?.links?.linkedin],
              ] as Array<[string, any]>
            ).filter(([, v]) => Boolean(v))}
          />
        </Section>
      )}
      {experiences.length > 0 && (
        <Section title={`경력 (${experiences.length})`}>
          <ul className="space-y-3">
            {experiences.map((e, i) => (
              <li key={i} className="rounded-md border bg-card px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {e?.company || "(회사 없음)"}
                    {(e?.position || e?.role) && (
                      <span className="ml-2 text-muted-foreground">
                        · {e.position || e.role}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {e?.period || ""}
                  </span>
                </div>
                {e?.description && (
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">
                    {e.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {projects.length > 0 && (
        <Section title={`프로젝트 (${projects.length})`}>
          <ul className="space-y-3">
            {projects.map((p, i) => (
              <li key={i} className="rounded-md border bg-card px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{p?.name || "(이름 없음)"}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {p?.period || ""}
                  </span>
                </div>
                {p?.role && (
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    역할: {p.role}
                  </p>
                )}
                {p?.description && (
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">
                    {p.description}
                  </p>
                )}
                {Array.isArray(p?.achievements) && p.achievements.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-[12px] text-foreground/80">
                    {p.achievements.map((a: string, j: number) => (
                      <li key={j} className="flex gap-2">
                        <span
                          aria-hidden
                          className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-500/70"
                        />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {Array.isArray(p?.techStack) && p.techStack.length > 0 && (
                  <div className="mt-1.5">
                    <Chips items={p.techStack} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {skills.length > 0 && (
        <Section title="스킬">
          <Chips
            items={skills
              .map((s: any) => {
                if (typeof s === "string") return s;
                const name = s?.name || "";
                const level = s?.level ? ` · ${s.level}` : "";
                return name ? `${name}${level}` : "";
              })
              .filter(Boolean)}
          />
        </Section>
      )}
      {educations.length > 0 && (
        <Section title="학력">
          <ul className="space-y-1.5">
            {educations.map((e, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2">
                <span>
                  {e?.school || "(학교)"}
                  {e?.degree && (
                    <span className="ml-2 text-muted-foreground">
                      · {e.degree}
                    </span>
                  )}
                  {e?.description && (
                    <span className="ml-2 text-[12px] text-muted-foreground">
                      · {e.description}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {e?.period || ""}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {certs.length > 0 && (
        <Section title="수상 / 자격">
          <ul className="space-y-1">
            {certs.map((c, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-2"
              >
                <span>
                  {c?.title || c?.name || ""}
                  {c?.issuer && (
                    <span className="ml-2 text-muted-foreground">
                      · {c.issuer}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {c?.date || ""}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {summary === "" &&
        experiences.length === 0 &&
        projects.length === 0 &&
        skills.length === 0 && (
          <EmptyHint message="이력서 본문이 비어 있습니다." />
        )}
    </div>
  );
}

/* ---------- Cover Letter ---------- */
function CoverLetterPreview({ data }: { data: any }) {
  const questions: any[] = data?.questions ?? [];
  const body: string = data?.body ?? "";

  return (
    <div className="space-y-5">
      {questions.length > 0 ? (
        <ol className="space-y-4">
          {questions.map((q, i) => (
            <li key={q?.id || i} className="rounded-md border bg-card">
              <div className="flex items-start justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                <div className="font-medium leading-snug">
                  Q{i + 1}. {q?.title || "(문항 없음)"}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
                  {q?.status === "done" ? (
                    <Badge variant="secondary" className="text-[10px]">
                      완료
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      작성중
                    </Badge>
                  )}
                  <span>
                    {String(q?.answer ?? "").length}
                    {q?.maxChars ? ` / ${q.maxChars}` : ""}자
                  </span>
                </div>
              </div>
              <div className="px-3 py-3 text-[13px] leading-relaxed">
                {q?.answer ? (
                  <p className="whitespace-pre-line text-foreground/90">
                    {q.answer}
                  </p>
                ) : (
                  <EmptyHint message="답변이 비어 있습니다." />
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : body ? (
        <p className="whitespace-pre-line leading-relaxed text-foreground/90">
          {body}
        </p>
      ) : (
        <EmptyHint message="자기소개서 본문이 비어 있습니다." />
      )}
    </div>
  );
}

/* ---------- Portfolio ---------- */
function PortfolioPreview({ data }: { data: any }) {
  const item = data?.item ?? {};
  const document = data?.document ?? {};
  const assets: any[] = data?.assets ?? [];
  const sections: any[] = document?.sections ?? document?.items ?? [];

  return (
    <div className="space-y-4">
      <KvGrid
        rows={(
          [
            ["템플릿", item?.templateId],
            ["포맷", item?.format],
            ["페이지", item?.pageSize],
            ["방향", item?.orientation],
          ] as Array<[string, any]>
        ).filter(([, v]) => Boolean(v))}
      />
      {sections.length > 0 && (
        <Section title={`섹션 (${sections.length})`}>
          <ul className="space-y-3">
            {sections.map((s: any, i: number) => (
              <li key={i} className="rounded-md border bg-card px-3 py-2">
                <div className="font-medium">
                  {s?.title || s?.name || `섹션 ${i + 1}`}
                </div>
                {s?.description && (
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground/80">
                    {s.description}
                  </p>
                )}
                {Array.isArray(s?.items) && s.items.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-[13px]">
                    {s.items.map((it: any, j: number) => (
                      <li key={j} className="flex gap-2">
                        <span
                          aria-hidden
                          className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50"
                        />
                        <span>
                          {typeof it === "string"
                            ? it
                            : it?.title || it?.name || JSON.stringify(it)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {assets.length > 0 && (
        <Section title={`첨부 (${assets.length})`}>
          <ul className="space-y-1">
            {assets.map((a: any, i: number) => (
              <li key={a?.id || i} className="flex items-baseline gap-2">
                <span className="truncate">{a?.name || `첨부 ${i + 1}`}</span>
                {a?.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    열기
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {sections.length === 0 && assets.length === 0 && (
        <EmptyHint message="포트폴리오 본문이 비어 있습니다." />
      )}
    </div>
  );
}

/* ---------- Project (snapshot only) ---------- */
function ProjectPreview({ data }: { data: any }) {
  const name = data?.name || data?.title;
  const period = data?.period;
  const role = data?.role;
  const description = data?.description;
  const tech: string[] = Array.isArray(data?.techStack) ? data.techStack : [];

  return (
    <div className="space-y-4">
      <KvGrid
        rows={(
          [
            ["프로젝트", name],
            ["기간", period],
            ["역할", role],
          ] as Array<[string, any]>
        ).filter(([, v]) => Boolean(v))}
      />
      {description && (
        <Section title="설명">
          <p className="whitespace-pre-line leading-relaxed text-foreground/90">
            {description}
          </p>
        </Section>
      )}
      {tech.length > 0 && (
        <Section title="기술 스택">
          <Chips items={tech} />
        </Section>
      )}
      {!name && !description && tech.length === 0 && (
        <EmptyHint message="프로젝트 정보가 비어 있습니다." />
      )}
    </div>
  );
}

/* ---------- Primitives ---------- */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function KvGrid({ rows }: { rows: Array<[string, any]> }) {
  if (rows.length === 0) return null;
  return (
    <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-foreground/90">{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((t, i) => (
        <span
          key={i}
          className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-foreground/80"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
      {message}
    </p>
  );
}
