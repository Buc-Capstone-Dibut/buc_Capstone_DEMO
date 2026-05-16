"use client";

import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileBadge,
  FileText,
  Inbox,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { deleteResumeAction, setActiveResumeAction } from "./actions";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import {
  DEFAULT_RESUME_A4_OPTIONS,
  ScaledKoreanResumeDocument,
} from "@/components/features/resume/KoreanResumePreview";
import { ResumePdfDownloadButton } from "@/components/features/resume/resume-pdf-download-button";
import { cn } from "@/lib/utils";

interface JobPostingOption {
  id: string;
  companyName: string;
  roleTitle: string;
  status: string;
  techStack?: string[];
  responsibilities?: string[];
  requirements?: string[];
  schedules?: Array<{ kind: string; startAt: string }>;
}

export type ResumeListItem = {
  id: string;
  title: string;
  updatedAt: string;
  is_active: boolean;
  techStack: string[];
  payload: ResumePayload;
  /** 이 이력서가 첨부된 채용공고들 (user_job_posting_attachments via resume_id) */
  linkedPostings: Array<{
    id: string;
    companyName: string;
    roleTitle: string;
    status: string;
  }>;
  /** 이 이력서를 source로 작성된 자소서들 (user_cover_letters.source_resume_id) */
  derivedCoverLetters: Array<{ id: string; title: string }>;
  /** 작성 시 선택한 정규화된 채용공고 참조 */
  targetPosting: {
    id: string;
    companyName: string;
    roleTitle: string;
    status: string;
  } | null;
  /** 공고 등록 없이 직접 입력한 대상 정보 */
  targetMeta: {
    company: string;
    division: string;
    role: string;
    deadline: string;
  } | null;
};

export default function ResumesClient({ resumes }: { resumes: ResumeListItem[] }) {
  const router = useRouter();
  const [localResumes, setLocalResumes] = useState(resumes);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createCompany, setCreateCompany] = useState("");
  const [createDivision, setCreateDivision] = useState("");
  const [createRole, setCreateRole] = useState("");
  const [createDeadline, setCreateDeadline] = useState("");
  const [createJobDescription, setCreateJobDescription] = useState("");

  // 우측 상단: 내 채용공고 목록
  const [postings, setPostings] = useState<JobPostingOption[]>([]);
  const [postingsLoading, setPostingsLoading] = useState(false);
  const [postingsLoaded, setPostingsLoaded] = useState(false);
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setIsCreateDialogOpen(true);
  };

  // 다이얼로그 열릴 때 한 번만 fetch
  useEffect(() => {
    if (!isCreateDialogOpen || postingsLoaded) return;
    const ctrl = new AbortController();
    setPostingsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/my/job-postings?pageSize=30&sort=newest", {
          cache: "no-store",
          signal: ctrl.signal,
        });
        const json = await res.json();
        if (json?.success) {
          setPostings(((json.data?.items ?? []) as JobPostingOption[]));
        }
        setPostingsLoaded(true);
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") setPostingsLoaded(true);
      } finally {
        setPostingsLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [isCreateDialogOpen, postingsLoaded]);

  const handleSelectPosting = useCallback((p: JobPostingOption) => {
    setSelectedPostingId(p.id);
    setCreateCompany(p.companyName ?? "");
    setCreateRole(p.roleTitle ?? "");
    // 사업부는 채용공고에 없음 — 비워두거나 유지
    // 마감일정: schedules에서 'deadline' 또는 'document_due' 우선
    const deadlineEvent = (p.schedules ?? []).find(
      (s) => s.kind === "deadline" || s.kind === "document_due",
    );
    if (deadlineEvent?.startAt) {
      const d = new Date(deadlineEvent.startAt);
      if (!Number.isNaN(d.getTime())) {
        // yyyy-MM-dd 형식
        const iso = d.toISOString().slice(0, 10);
        setCreateDeadline(iso);
      }
    } else {
      setCreateDeadline("");
    }
    // 채용공고 핵심 요구사항: requirements + responsibilities 결합
    const lines: string[] = [];
    if ((p.requirements ?? []).length > 0) {
      lines.push("[자격 요건]");
      for (const r of p.requirements ?? []) lines.push(`- ${r}`);
    }
    if ((p.responsibilities ?? []).length > 0) {
      if (lines.length > 0) lines.push("");
      lines.push("[주요 업무]");
      for (const r of p.responsibilities ?? []) lines.push(`- ${r}`);
    }
    if ((p.techStack ?? []).length > 0) {
      if (lines.length > 0) lines.push("");
      lines.push(`[기술 스택] ${(p.techStack ?? []).join(", ")}`);
    }
    setCreateJobDescription(lines.join("\n"));
  }, []);

  const handleStartNewResume = () => {
    const target = {
      company: createCompany.trim(),
      division: createDivision.trim(),
      role: createRole.trim(),
      deadline: createDeadline,
      jobDescription: createJobDescription.trim(),
      // 우측 패널에서 공고를 선택했다면 그 ID를 같이 전달 → DB에서 정규화된 참조로 저장됨
      jobPostingId: selectedPostingId,
    };
    sessionStorage.setItem("resume_creation_target", JSON.stringify(target));
    setIsCreateDialogOpen(false);
    router.push("/resume?mode=new&target=1");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("이 이력서를 삭제하시겠습니까?")) return;
    
    try {
      await deleteResumeAction(id);
      setLocalResumes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      alert("삭제 실패");
    }
  };

  const handleOpenResume = async (id: string, is_active: boolean) => {
    try {
      if (!is_active) {
        await setActiveResumeAction(id);
      }
      router.push("/resume");
    } catch (err) {
      console.error(err);
      alert("이력서를 여는 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in px-4 pb-24 pt-12 duration-500 sm:px-8 md:pt-20">
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div>
              <DialogTitle className="text-lg font-semibold">이력서 작성 설정</DialogTitle>
              <p className="mt-1 text-xs text-slate-500">1/2 단계 · 좌측에 직접 입력하거나 우측의 내 채용공고에서 가져오세요</p>
            </div>
          </DialogHeader>

          <div className="grid max-h-[75vh] grid-cols-1 overflow-hidden md:grid-cols-[1fr_320px]">
            {/* 좌측: 입력 폼 */}
            <div className="space-y-5 overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">지원 대상 정보</h3>
                <div>
                  <Label>기업*</Label>
                  <Input
                    className="mt-2 h-11"
                    placeholder="예: 삼성전자 DS"
                    value={createCompany}
                    onChange={(event) => setCreateCompany(event.target.value)}
                  />
                </div>
                <div>
                  <Label>사업부 (선택)</Label>
                  <Input
                    className="mt-2 h-11"
                    placeholder="예: 메모리 사업부"
                    value={createDivision}
                    onChange={(event) => setCreateDivision(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>직무*</Label>
                    <Input
                      className="mt-2 h-11"
                      placeholder="예: 소프트웨어 개발"
                      value={createRole}
                      onChange={(event) => setCreateRole(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label>마감일정 (선택)</Label>
                    <Input
                      className="mt-2 h-11"
                      type="date"
                      value={createDeadline}
                      onChange={(event) => setCreateDeadline(event.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>채용공고 핵심 요구사항 (선택)</Label>
                  <Textarea
                    className="mt-2 min-h-[92px] resize-none"
                    placeholder="공고에서 중요한 기술, 협업 방식, 우대사항을 붙여 넣으면 맞춤형 이력서 생성에 참고합니다."
                    value={createJobDescription}
                    onChange={(event) => setCreateJobDescription(event.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">
                다음 단계에서 사용자의 프로젝트, 프로필, 자소서 기록을 참고해 지원 대상에 맞는 이력서 초안을 생성합니다.
              </div>
            </div>

            {/* 우측: 채용공고 선택 + 미리보기 */}
            <aside className="flex flex-col overflow-hidden border-t bg-slate-50/50 md:border-l md:border-t-0 dark:bg-slate-950/30">
              {/* 우상단: 내 채용공고 목록 */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b">
                <div className="flex items-center gap-2 border-b bg-white px-4 py-3 dark:bg-slate-900">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    내 채용공고에서 가져오기
                  </h3>
                  {postings.length > 0 && (
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                      {postings.length}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {postingsLoading ? (
                    <div className="flex h-32 items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      불러오는 중…
                    </div>
                  ) : postings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                      <Inbox className="h-6 w-6 text-slate-300" aria-hidden />
                      <p className="text-[11px] text-muted-foreground">
                        등록된 채용공고가 없습니다
                      </p>
                      <a
                        href="/my/job-postings"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        공고 등록하러 가기 →
                      </a>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                      {postings.map((p) => {
                        const active = p.id === selectedPostingId;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectPosting(p)}
                              className={cn(
                                "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors",
                                active
                                  ? "bg-primary/10"
                                  : "hover:bg-white dark:hover:bg-slate-900",
                              )}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {p.companyName}
                                </span>
                                {active && (
                                  <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                                )}
                              </div>
                              <span className="truncate text-[13px] font-bold text-foreground">
                                {p.roleTitle}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* 우하단: 실시간 미리보기 */}
              <div className="border-t bg-white p-4 dark:bg-slate-900">
                <div className="mb-2 flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    미리보기
                  </h3>
                </div>
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                  {(createCompany.trim() || createRole.trim()) ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {createCompany.trim() || "기업 미입력"}
                        {createDivision.trim() && (
                          <span className="ml-1 text-muted-foreground/70">
                            · {createDivision.trim()}
                          </span>
                        )}
                      </p>
                      <p className="text-sm font-bold leading-tight text-foreground">
                        {createRole.trim() || "직무 미입력"}
                      </p>
                      {createDeadline && (
                        <div className="flex items-center gap-1 pt-0.5 text-[11px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" aria-hidden />
                          마감 {createDeadline}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      좌측에 입력하거나 위 공고를 선택하세요
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>

          <div className="flex items-center justify-between gap-3 border-t bg-slate-50 px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                sessionStorage.removeItem("resume_creation_target");
                setIsCreateDialogOpen(false);
                router.push("/resume?mode=new");
              }}
            >
              빈 이력서로 시작
            </Button>
            <Button
              type="button"
              className="min-w-[120px] gap-2"
              disabled={!createCompany.trim() || !createRole.trim()}
              onClick={handleStartNewResume}
            >
              다음
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-10 flex min-w-0 flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {localResumes.length}개 이력서
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            이력서 캐비닛
          </h1>
          <p className="max-w-2xl text-[14px] leading-6 text-slate-500">
            커리어 탭에서 모은 프로젝트와 경력을 바탕으로 작성한 이력서를 한 곳에서 관리하세요.
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="h-12 shrink-0 rounded-full bg-primary/10 px-6 font-bold text-primary shadow-sm transition-all hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
        >
          <Plus className="mr-2 h-5 w-5" />
          새 이력서 작성
        </Button>
      </div>

      {localResumes.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
          <FileBadge className="mb-4 h-11 w-11 text-slate-300" />
          <p className="font-semibold text-slate-600">저장된 이력서가 없습니다.</p>
          <p className="mt-1 text-sm text-slate-400">새 이력서를 작성해 캐비닛에 추가하세요.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {localResumes.map((resume) => (
            <article
              key={resume.id}
              role="button"
              tabIndex={0}
              onClick={() => handleOpenResume(resume.id, resume.is_active)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                void handleOpenResume(resume.id, resume.is_active);
              }}
              className="group relative grid min-h-[440px] cursor-pointer grid-cols-[1fr_180px] overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-800 dark:bg-slate-900/70"
            >
              <button
                onClick={(event) => handleDelete(event, resume.id)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/85 text-slate-400 opacity-0 shadow-sm backdrop-blur transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:bg-slate-950/80"
                aria-label="이력서 삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* 좌측: 미리보기 (크게) */}
              <div className="flex items-center justify-center border-r border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="w-full max-w-[300px] rounded-md bg-white p-2 shadow-sm ring-1 ring-slate-200">
                  <ScaledKoreanResumeDocument
                    payload={resume.payload}
                    title={resume.title}
                    options={DEFAULT_RESUME_A4_OPTIONS}
                    minHeightClass="min-h-0"
                  />
                </div>
              </div>

              {/* 우측: 정보 (얇게) */}
              <div className="flex min-w-0 flex-col p-4">
                {/* 한 줄: 파일 아이콘 + "기본 이력서" 배지 */}
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileBadge className="h-3 w-3" />
                  </span>
                  {resume.is_active && (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                      title="새 채용공고에 이력서 첨부 시 자동 추천"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      기본
                    </span>
                  )}
                </div>

                <h3 className="line-clamp-3 pr-7 text-[15px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-primary dark:text-slate-100">
                  {resume.title}
                </h3>

                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(resume.updatedAt).toLocaleDateString("ko-KR")}
                </div>

                {/* 지원 대상 (작성 시 입력/선택한 공고) */}
                <ResumeTargetSection
                  resumeId={resume.id}
                  targetPosting={resume.targetPosting}
                  targetMeta={resume.targetMeta}
                  onChanged={() => router.refresh()}
                />

                {/* 추가로 첨부된 채용공고 (N:N) — 사용자가 공고 페이지에서 명시적으로 첨부한 경우 */}
                {resume.linkedPostings.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-dashed pt-3">
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <Briefcase className="h-3 w-3" aria-hidden />
                      이 이력서를 첨부한 공고 ({resume.linkedPostings.length})
                    </div>
                    <div className="flex flex-col gap-1">
                      {resume.linkedPostings.slice(0, 3).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/my/job-postings/${p.id}`);
                          }}
                          className="group/chip flex items-center gap-1 truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-[11px] transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-900"
                          title={`${p.companyName} · ${p.roleTitle}`}
                        >
                          <span className="truncate font-bold text-slate-700 dark:text-slate-200">
                            {p.companyName}
                          </span>
                          <span className="shrink-0 text-slate-400">·</span>
                          <span className="truncate text-slate-500">
                            {p.roleTitle}
                          </span>
                        </button>
                      ))}
                      {resume.linkedPostings.length > 3 && (
                        <span className="px-2 text-[10px] text-slate-400">
                          외 {resume.linkedPostings.length - 3}개 공고
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 이 이력서를 source로 작성된 자소서 (역방향) — user_cover_letters.source_resume_id */}
                {resume.derivedCoverLetters.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-dashed pt-3">
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <FileText className="h-3 w-3" aria-hidden />
                      이 이력서로 작성된 자소서 ({resume.derivedCoverLetters.length})
                    </div>
                    <div className="flex flex-col gap-1">
                      {resume.derivedCoverLetters.slice(0, 3).map((cl) => (
                        <button
                          key={cl.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/career/cover-letters?id=${cl.id}`);
                          }}
                          className="group/chip flex items-center gap-1 truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-left text-[11px] transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-900"
                          title={cl.title}
                        >
                          <span className="truncate font-bold text-slate-700 dark:text-slate-200">
                            {cl.title}
                          </span>
                        </button>
                      ))}
                      {resume.derivedCoverLetters.length > 3 && (
                        <span className="px-2 text-[10px] text-slate-400">
                          외 {resume.derivedCoverLetters.length - 3}개 자소서
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-auto flex flex-col gap-2 pt-4">
                  <ResumePdfDownloadButton
                    resumePayload={resume.payload}
                    title={resume.title}
                    fileName={resume.title || "resume"}
                    stopPropagation
                    className="h-9 w-full rounded-xl border-slate-200 px-3 text-[12px] font-bold text-slate-600 hover:border-primary/40 hover:text-primary"
                  />
                  <div className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-400 shadow-sm transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-white dark:border-slate-800 dark:bg-slate-900">
                    열기
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 카드 안의 "지원 대상" 섹션.
 * - target_posting(FK) 있으면 정규화된 공고 정보 표시 + 클릭 시 공고 페이지 이동
 * - 없고 target_meta 있으면 free-form 정보 표시
 * - 둘 다 없으면 "공고에 연결" 버튼만 (사용자가 나중에 매칭 가능)
 */
function ResumeTargetSection({
  resumeId,
  targetPosting,
  targetMeta,
  onChanged,
}: {
  resumeId: string;
  targetPosting: ResumeListItem["targetPosting"];
  targetMeta: ResumeListItem["targetMeta"];
  onChanged: () => void;
}) {
  const router = useRouter();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkPostings, setLinkPostings] = useState<JobPostingOption[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  const openLinkPicker = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLinkOpen((prev) => !prev);
    if (linkPostings.length > 0) return;
    setLinkLoading(true);
    try {
      const res = await fetch("/api/my/job-postings?pageSize=50&sort=newest", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.success) {
        setLinkPostings((json.data?.items ?? []) as JobPostingOption[]);
      }
    } finally {
      setLinkLoading(false);
    }
  };

  const linkToPosting = async (postingId: string | null) => {
    setLinking(true);
    try {
      const res = await fetch(`/api/my/resume/${resumeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetJobPostingId: postingId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "연결 실패");
      setLinkOpen(false);
      onChanged();
    } catch (err) {
      console.error(err);
      alert("공고 연결에 실패했습니다.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="mt-3 border-t border-dashed pt-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <Briefcase className="h-3 w-3" aria-hidden />
          지원 대상
        </span>
        <button
          type="button"
          onClick={openLinkPicker}
          className="text-[10px] font-semibold text-slate-400 transition-colors hover:text-primary"
        >
          {targetPosting || targetMeta ? "변경" : "공고 연결"}
        </button>
      </div>

      {/* 표시: target_posting > target_meta > placeholder */}
      {targetPosting ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/my/job-postings/${targetPosting.id}`);
          }}
          className="flex w-full items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-primary/10"
          title={`${targetPosting.companyName} · ${targetPosting.roleTitle}`}
        >
          <span className="truncate font-bold text-primary">
            {targetPosting.companyName}
          </span>
          <span className="shrink-0 text-primary/60">·</span>
          <span className="truncate text-primary/80">
            {targetPosting.roleTitle}
          </span>
        </button>
      ) : targetMeta && (targetMeta.company || targetMeta.role) ? (
        <div
          className="flex w-full items-center gap-1.5 rounded-md border border-dashed bg-slate-50 px-2 py-1.5 text-[11px]"
          title="직접 입력된 정보. 공고에 연결하면 동기화됩니다."
        >
          <span className="truncate font-bold text-slate-600">
            {targetMeta.company || "기업 미입력"}
          </span>
          {targetMeta.role && (
            <>
              <span className="shrink-0 text-slate-400">·</span>
              <span className="truncate text-slate-500">{targetMeta.role}</span>
            </>
          )}
        </div>
      ) : (
        <p className="px-1 text-[11px] text-slate-400">
          연결된 공고 없음
        </p>
      )}

      {/* 연결 picker (드롭다운) */}
      {linkOpen && (
        <div
          className="mt-2 max-h-40 overflow-y-auto rounded-md border bg-white p-1 shadow-sm dark:bg-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          {linkLoading ? (
            <div className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> 불러오는 중…
            </div>
          ) : linkPostings.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-muted-foreground">
              등록된 공고가 없습니다.
            </p>
          ) : (
            <>
              {(targetPosting || targetMeta) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void linkToPosting(null);
                  }}
                  disabled={linking}
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-[11px] text-slate-500 transition-colors hover:bg-muted disabled:opacity-50"
                >
                  연결 해제
                </button>
              )}
              {linkPostings.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void linkToPosting(p.id);
                  }}
                  disabled={linking || p.id === targetPosting?.id}
                  className="flex w-full flex-col items-start gap-0 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                    {p.companyName}
                  </span>
                  <span className="truncate text-[12px] font-bold text-foreground">
                    {p.roleTitle}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
