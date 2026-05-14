"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  FolderKanban,
  Inbox,
  Loader2,
  PencilLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

type ImportProject = ResumePayload["projects"][number];
type ImportExperience = ResumePayload["experience"][number];

/**
 * 자기소개서 import 시 보존하는 개별 문항. `CoverLetterQuestion` 의 부분 형상으로
 * 답변·상태·갱신시각이 옵셔널이다. ResumeEditor 의 questions[] 형식과 호환된다.
 */
interface ImportCoverLetterQuestion {
  id: string;
  title: string;
  maxChars: number;
  answer?: string;
  status?: "draft" | "done";
  updatedAt?: string;
}

interface ImportCoverLetter {
  id: string;
  title: string;
  content: string;
  /** 문항별 폼 데이터. 없으면 단일 content 모드. */
  questions?: ImportCoverLetterQuestion[];
  updatedAt?: string;
}

export interface ResumeImportSelection {
  projects: ImportProject[];
  experiences: ImportExperience[];
  coverLetters: ImportCoverLetter[];
}

interface ResumeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (selection: ResumeImportSelection) => void;
}

type TabKey = "projects" | "experiences" | "coverLetters";

interface ResumeListItem {
  id?: string;
  resume_payload?: unknown;
  resumePayload?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function pickPayload(item: ResumeListItem): Record<string, unknown> {
  return asRecord(item.resume_payload ?? item.resumePayload);
}

function projectKey(item: ImportProject): string {
  if (item.id) return `id:${item.id}`;
  return `np:${(item.name || "").trim().toLowerCase()}|${(item.period || "").trim()}`;
}

function experienceKey(item: ImportExperience): string {
  if (item.id) return `id:${item.id}`;
  return `xp:${(item.company || "").trim().toLowerCase()}|${(item.position || "").trim().toLowerCase()}|${(item.period || "").trim()}`;
}

function ensureProjectShape(raw: unknown): ImportProject | null {
  const row = asRecord(raw);
  const nameCandidate =
    (typeof row.name === "string" && row.name) ||
    (typeof row.company === "string" && row.company) ||
    "";
  const period = typeof row.period === "string" ? row.period : "";
  if (!nameCandidate.trim() && !period.trim()) return null;

  const techStack = Array.isArray(row.techStack)
    ? row.techStack.filter((v): v is string => typeof v === "string")
    : Array.isArray(row.tags)
      ? row.tags.filter((v): v is string => typeof v === "string")
      : [];

  const achievements = Array.isArray(row.achievements)
    ? row.achievements.filter((v): v is string => typeof v === "string")
    : [];

  return {
    id: typeof row.id === "string" && row.id ? row.id : undefined,
    name: nameCandidate || "(이름 없음)",
    period,
    description: typeof row.description === "string" ? row.description : "",
    techStack,
    achievements,
  };
}

function ensureExperienceShape(raw: unknown): ImportExperience | null {
  const row = asRecord(raw);
  const company = typeof row.company === "string" ? row.company : "";
  const position = typeof row.position === "string" ? row.position : "";
  const period = typeof row.period === "string" ? row.period : "";
  if (!company.trim() && !position.trim() && !period.trim()) return null;

  return {
    id: typeof row.id === "string" && row.id ? row.id : undefined,
    company,
    position,
    period,
    description: typeof row.description === "string" ? row.description : "",
  };
}

function ensureCoverLetterQuestionShape(
  raw: unknown,
): ImportCoverLetterQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  const id = typeof q.id === "string" && q.id ? q.id : "";
  const title = typeof q.title === "string" ? q.title : "";
  if (!id && !title.trim()) return null;
  const maxChars =
    typeof q.maxChars === "number" && q.maxChars > 0 ? Math.floor(q.maxChars) : 500;
  const answer = typeof q.answer === "string" ? q.answer : undefined;
  // status 를 명시적으로 "draft" | "done" 으로 narrow.
  const status: "draft" | "done" | undefined =
    q.status === "done" ? "done" : q.status === "draft" ? "draft" : undefined;
  const updatedAt = typeof q.updatedAt === "string" ? q.updatedAt : undefined;
  return {
    id: id || crypto.randomUUID(),
    title,
    maxChars,
    answer,
    status,
    updatedAt,
  };
}

function ensureCoverLetterShape(raw: unknown): ImportCoverLetter | null {
  const row = asRecord(raw);
  const id = typeof row.id === "string" ? row.id : "";
  if (!id) return null;
  const title = typeof row.title === "string" ? row.title : "(제목 없음)";
  const content =
    typeof row.body === "string"
      ? row.body
      : typeof row.content === "string"
        ? row.content
        : "";
  const updatedAt =
    typeof row.updatedAt === "string"
      ? row.updatedAt
      : typeof row.updated_at === "string"
        ? row.updated_at
        : undefined;
  // questions: API 가 CoverLetterQuestion[] 배열로 반환한다고 가정. 비어있을 수도 있음.
  const questions = Array.isArray(row.questions)
    ? (row.questions
        .map(ensureCoverLetterQuestionShape)
        .filter(Boolean) as ImportCoverLetterQuestion[])
    : undefined;
  return {
    id,
    title,
    content,
    questions: questions && questions.length > 0 ? questions : undefined,
    updatedAt,
  };
}

function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function ResumeImportDialog({
  open,
  onOpenChange,
  onApply,
}: ResumeImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("projects");
  const [projects, setProjects] = useState<ImportProject[]>([]);
  const [experiences, setExperiences] = useState<ImportExperience[]>([]);
  const [coverLetters, setCoverLetters] = useState<ImportCoverLetter[]>([]);

  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [selectedExperiences, setSelectedExperiences] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCoverLetters, setSelectedCoverLetters] = useState<Set<string>>(
    new Set(),
  );

  const [previewProject, setPreviewProject] = useState<string | null>(null);
  const [previewExperience, setPreviewExperience] = useState<string | null>(
    null,
  );
  const [previewCoverLetter, setPreviewCoverLetter] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open) {
      setSelectedProjects(new Set());
      setSelectedExperiences(new Set());
      setSelectedCoverLetters(new Set());
      setPreviewProject(null);
      setPreviewExperience(null);
      setPreviewCoverLetter(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [resumeRes, coverRes] = await Promise.all([
          fetch("/api/my/resume", { cache: "no-store" }),
          fetch("/api/my/cover-letters", { cache: "no-store" }),
        ]);

        const resumeJson = await resumeRes.json().catch(() => null);
        const coverJson = await coverRes.json().catch(() => null);

        const rawList: ResumeListItem[] = Array.isArray(
          resumeJson?.data?.items,
        )
          ? resumeJson.data.items
          : [];

        const projectAcc: ImportProject[] = [];
        const experienceAcc: ImportExperience[] = [];

        for (const item of rawList) {
          const payload = pickPayload(item);
          const projectsRaw = Array.isArray(payload.projects)
            ? payload.projects
            : [];
          const timelineRaw = Array.isArray(payload.timeline)
            ? payload.timeline
            : [];
          const expsRaw = Array.isArray(payload.experience)
            ? payload.experience
            : [];

          for (const r of projectsRaw) {
            const shaped = ensureProjectShape(r);
            if (shaped) projectAcc.push(shaped);
          }
          for (const r of timelineRaw) {
            const shaped = ensureProjectShape(r);
            if (shaped) projectAcc.push(shaped);
          }
          for (const r of expsRaw) {
            const shaped = ensureExperienceShape(r);
            if (shaped) experienceAcc.push(shaped);
          }
        }

        const dedupedProjects = dedupeBy(projectAcc, projectKey);
        const dedupedExperiences = dedupeBy(experienceAcc, experienceKey);

        const coverItems = Array.isArray(coverJson?.data?.items)
          ? coverJson.data.items
          : [];
        const shapedCovers = coverItems
          .map(ensureCoverLetterShape)
          .filter((v: ImportCoverLetter | null): v is ImportCoverLetter =>
            Boolean(v),
          );

        if (cancelled) return;

        setProjects(dedupedProjects);
        setExperiences(dedupedExperiences);
        setCoverLetters(shapedCovers);
        setPreviewProject(
          dedupedProjects.length > 0 ? projectKey(dedupedProjects[0]) : null,
        );
        setPreviewExperience(
          dedupedExperiences.length > 0
            ? experienceKey(dedupedExperiences[0])
            : null,
        );
        setPreviewCoverLetter(
          shapedCovers.length > 0 ? shapedCovers[0].id : null,
        );
      } catch (error) {
        console.error("[ResumeImportDialog] load failed", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const totalSelected =
    selectedProjects.size + selectedExperiences.size + selectedCoverLetters.size;

  const projectByKey = useMemo(() => {
    const m = new Map<string, ImportProject>();
    for (const p of projects) m.set(projectKey(p), p);
    return m;
  }, [projects]);

  const experienceByKey = useMemo(() => {
    const m = new Map<string, ImportExperience>();
    for (const x of experiences) m.set(experienceKey(x), x);
    return m;
  }, [experiences]);

  const coverByKey = useMemo(() => {
    const m = new Map<string, ImportCoverLetter>();
    for (const c of coverLetters) m.set(c.id, c);
    return m;
  }, [coverLetters]);

  const toggle = (
    set: Set<string>,
    setter: (next: Set<string>) => void,
    key: string,
  ) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  const handleApply = () => {
    const selection: ResumeImportSelection = {
      projects: Array.from(selectedProjects)
        .map((k) => projectByKey.get(k))
        .filter((v): v is ImportProject => Boolean(v)),
      experiences: Array.from(selectedExperiences)
        .map((k) => experienceByKey.get(k))
        .filter((v): v is ImportExperience => Boolean(v)),
      coverLetters: Array.from(selectedCoverLetters)
        .map((k) => coverByKey.get(k))
        .filter((v): v is ImportCoverLetter => Boolean(v)),
    };
    onApply(selection);
    onOpenChange(false);
  };

  const previewProjectItem = previewProject
    ? projectByKey.get(previewProject)
    : null;
  const previewExperienceItem = previewExperience
    ? experienceByKey.get(previewExperience)
    : null;
  const previewCoverLetterItem = previewCoverLetter
    ? coverByKey.get(previewCoverLetter)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Inbox className="w-5 h-5 text-primary" />
            기존 자료 가져오기
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-1">
            선택한 항목들이 새 이력서에 자동으로 채워집니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabKey)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-4 pb-2 border-b border-slate-100 shrink-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="projects" className="gap-1.5">
                <FolderKanban className="w-3.5 h-3.5" />
                프로젝트
                <span className="ml-1 text-[10px] font-semibold text-slate-400">
                  {projects.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="experiences" className="gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                경력
                <span className="ml-1 text-[10px] font-semibold text-slate-400">
                  {experiences.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="coverLetters" className="gap-1.5">
                <PencilLine className="w-3.5 h-3.5" />
                자기소개서
                <span className="ml-1 text-[10px] font-semibold text-slate-400">
                  {coverLetters.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="px-6 py-8 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                <TabsContent
                  value="projects"
                  className="m-0 h-full overflow-hidden data-[state=inactive]:hidden"
                >
                  <ImportTwoPanel
                    items={projects}
                    keyFn={projectKey}
                    selected={selectedProjects}
                    onToggle={(k) =>
                      toggle(selectedProjects, setSelectedProjects, k)
                    }
                    previewKey={previewProject}
                    onPreview={setPreviewProject}
                    renderListLabel={(item) => (
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {item.name || "(이름 없음)"}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.period || "기간 미상"}
                        </p>
                      </div>
                    )}
                    renderPreview={() =>
                      previewProjectItem ? (
                        <ProjectPreview item={previewProjectItem} />
                      ) : (
                        <EmptyPreview text="왼쪽에서 프로젝트를 선택해 미리보기를 확인하세요." />
                      )
                    }
                    emptyText="가져올 프로젝트가 없습니다. 먼저 보관함에서 프로젝트를 등록해주세요."
                  />
                </TabsContent>

                <TabsContent
                  value="experiences"
                  className="m-0 h-full overflow-hidden data-[state=inactive]:hidden"
                >
                  <ImportTwoPanel
                    items={experiences}
                    keyFn={experienceKey}
                    selected={selectedExperiences}
                    onToggle={(k) =>
                      toggle(selectedExperiences, setSelectedExperiences, k)
                    }
                    previewKey={previewExperience}
                    onPreview={setPreviewExperience}
                    renderListLabel={(item) => (
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {item.company || "(회사명 없음)"}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.position || "직책 미상"} ·{" "}
                          {item.period || "기간 미상"}
                        </p>
                      </div>
                    )}
                    renderPreview={() =>
                      previewExperienceItem ? (
                        <ExperiencePreview item={previewExperienceItem} />
                      ) : (
                        <EmptyPreview text="왼쪽에서 경력을 선택해 미리보기를 확인하세요." />
                      )
                    }
                    emptyText="가져올 경력이 없습니다."
                  />
                </TabsContent>

                <TabsContent
                  value="coverLetters"
                  className="m-0 h-full overflow-hidden data-[state=inactive]:hidden"
                >
                  <ImportTwoPanel
                    items={coverLetters}
                    keyFn={(item) => item.id}
                    selected={selectedCoverLetters}
                    onToggle={(k) =>
                      toggle(selectedCoverLetters, setSelectedCoverLetters, k)
                    }
                    previewKey={previewCoverLetter}
                    onPreview={setPreviewCoverLetter}
                    renderListLabel={(item) => (
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {item.title || "(제목 없음)"}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.questions && item.questions.length > 0
                            ? `문항 ${item.questions.length}개`
                            : item.content
                              ? item.content.slice(0, 60)
                              : "내용 없음"}
                        </p>
                      </div>
                    )}
                    renderPreview={() =>
                      previewCoverLetterItem ? (
                        <CoverLetterPreview item={previewCoverLetterItem} />
                      ) : (
                        <EmptyPreview text="왼쪽에서 자기소개서를 선택해 미리보기를 확인하세요." />
                      )
                    }
                    emptyText="가져올 자기소개서가 없습니다."
                  />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">
            <span className="text-primary font-bold">{totalSelected}</span>개
            항목 선택됨
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="font-semibold"
            >
              취소
            </Button>
            <Button
              onClick={handleApply}
              disabled={totalSelected === 0 || loading}
              className="font-semibold gap-2 px-6"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              가져오기 ({totalSelected}개)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ImportTwoPanelProps<T> {
  items: T[];
  keyFn: (item: T) => string;
  selected: Set<string>;
  onToggle: (key: string) => void;
  previewKey: string | null;
  onPreview: (key: string) => void;
  renderListLabel: (item: T) => React.ReactNode;
  renderPreview: () => React.ReactNode;
  emptyText: string;
}

function ImportTwoPanel<T>({
  items,
  keyFn,
  selected,
  onToggle,
  previewKey,
  onPreview,
  renderListLabel,
  renderPreview,
  emptyText,
}: ImportTwoPanelProps<T>) {
  if (items.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-8 py-12 text-center">
        <p className="text-sm text-slate-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] h-[420px]">
      <ScrollArea className="border-r border-slate-100">
        <ul className="p-2 space-y-1">
          {items.map((item) => {
            const key = keyFn(item);
            const isSelected = selected.has(key);
            const isPreviewed = previewKey === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onPreview(key)}
                  className={cn(
                    "w-full text-left flex items-start gap-2.5 rounded-lg p-2.5 transition-colors",
                    isPreviewed
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "hover:bg-slate-100",
                  )}
                >
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(key);
                    }}
                    className="mt-0.5"
                    role="presentation"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(key)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </span>
                  {renderListLabel(item)}
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      <ScrollArea className="bg-slate-50/50">
        <div className="p-5">{renderPreview()}</div>
      </ScrollArea>
    </div>
  );
}

function EmptyPreview({ text }: { text: string }) {
  return (
    <div className="h-full min-h-[200px] flex items-center justify-center text-center">
      <p className="text-xs text-slate-400">{text}</p>
    </div>
  );
}

function ProjectPreview({ item }: { item: ImportProject }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
        <p className="text-[11px] text-slate-500">
          {item.period || "기간 미상"}
        </p>
      </div>
      {item.description && (
        <p className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
          {item.description}
        </p>
      )}
      {item.techStack.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            기술 스택
          </p>
          <div className="flex flex-wrap gap-1">
            {item.techStack.map((tech, i) => (
              <span
                key={i}
                className="text-[11px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
      {item.achievements.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            주요 성과
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {item.achievements.map((ach, i) => (
              <li key={i} className="text-[12px] text-slate-700">
                {ach}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExperiencePreview({ item }: { item: ImportExperience }) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-800">
          {item.company || "(회사명 없음)"}
        </h4>
        <p className="text-[11px] text-slate-500">
          {item.position || "직책 미상"} · {item.period || "기간 미상"}
        </p>
      </div>
      {item.description && (
        <p className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
          {item.description}
        </p>
      )}
    </div>
  );
}

function CoverLetterPreview({ item }: { item: ImportCoverLetter }) {
  const hasQuestions = !!item.questions && item.questions.length > 0;
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
        {item.updatedAt && (
          <p className="text-[11px] text-slate-500">
            업데이트: {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
          </p>
        )}
      </div>
      {hasQuestions ? (
        <ul className="space-y-3">
          {item.questions!.map((q, i) => (
            <li
              key={q.id || i}
              className="rounded-md border border-slate-200 bg-white p-3 space-y-1"
            >
              <p className="text-[12px] font-semibold text-slate-800">
                Q{i + 1}. {q.title || "(문항 미지정)"}
              </p>
              {q.answer ? (
                <p className="text-[12px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {q.answer.length > 240
                    ? `${q.answer.slice(0, 240)}…`
                    : q.answer}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">미작성</p>
              )}
              <p className="text-[10px] text-slate-400 tabular-nums">
                {(q.answer?.length ?? 0)} / {q.maxChars}자
              </p>
            </li>
          ))}
        </ul>
      ) : item.content ? (
        <p className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">
          {item.content.length > 600
            ? `${item.content.slice(0, 600)}…`
            : item.content}
        </p>
      ) : (
        <p className="text-xs text-slate-400">내용 없음</p>
      )}
    </div>
  );
}
