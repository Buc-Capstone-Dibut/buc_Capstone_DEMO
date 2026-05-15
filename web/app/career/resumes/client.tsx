"use client";

import { ArrowRight, CalendarDays, CheckCircle2, FileBadge, Plus, Trash2 } from "lucide-react";
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
import { useState } from "react";
import { deleteResumeAction, setActiveResumeAction } from "./actions";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import {
  DEFAULT_RESUME_A4_OPTIONS,
  ScaledKoreanResumeDocument,
} from "@/components/features/resume/KoreanResumePreview";
import { ResumePdfDownloadButton } from "@/components/features/resume/resume-pdf-download-button";

export type ResumeListItem = {
  id: string;
  title: string;
  updatedAt: string;
  is_active: boolean;
  techStack: string[];
  payload: ResumePayload;
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
  
  const handleCreateNew = () => {
    setIsCreateDialogOpen(true);
  };

  const handleStartNewResume = () => {
    const target = {
      company: createCompany.trim(),
      division: createDivision.trim(),
      role: createRole.trim(),
      deadline: createDeadline,
      jobDescription: createJobDescription.trim(),
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
        <DialogContent className="max-w-lg overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div>
              <DialogTitle className="text-lg font-semibold">이력서 작성 설정</DialogTitle>
              <p className="mt-1 text-xs text-slate-500">1/2 단계</p>
            </div>
          </DialogHeader>

          <div className="max-h-[75vh] space-y-5 overflow-y-auto px-6 py-5">
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
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
              className="group relative flex min-h-[420px] cursor-pointer flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-800 dark:bg-slate-900/70"
            >
              <button
                onClick={(event) => handleDelete(event, resume.id)}
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/85 text-slate-400 opacity-0 shadow-sm backdrop-blur transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:bg-slate-950/80"
                aria-label="이력서 삭제"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div className="border-b border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto max-w-[230px] rounded-md bg-white p-2 shadow-sm ring-1 ring-slate-200">
                  <ScaledKoreanResumeDocument
                    payload={resume.payload}
                    title={resume.title}
                    options={DEFAULT_RESUME_A4_OPTIONS}
                    minHeightClass="min-h-0"
                  />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileBadge className="h-4 w-4" />
                </div>
                <div className="flex items-start gap-2 pr-6">
                  <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-primary dark:text-slate-100">
                    {resume.title}
                  </h3>
                  {resume.is_active && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      보는 중
                    </span>
                  )}
                </div>

              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                <CalendarDays className="h-4 w-4" />
                {new Date(resume.updatedAt).toLocaleDateString("ko-KR")}
              </div>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {resume.techStack.length > 0 ? (
                  resume.techStack.slice(0, 8).map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800"
                    >
                      {tech}
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] text-slate-400">등록된 스킬이 없습니다.</span>
                )}
              </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-5">
                  <ResumePdfDownloadButton
                    resumePayload={resume.payload}
                    title={resume.title}
                    fileName={resume.title || "resume"}
                    stopPropagation
                    className="h-9 rounded-xl border-slate-200 px-3 text-[12px] font-bold text-slate-600 hover:border-primary/40 hover:text-primary"
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-white dark:border-slate-800 dark:bg-slate-900">
                    <ArrowRight className="h-4 w-4" />
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
