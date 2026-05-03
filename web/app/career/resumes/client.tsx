"use client";

import { ArrowRight, CalendarDays, CheckCircle2, FileBadge, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteResumeAction, setActiveResumeAction } from "./actions";

export type ResumeListItem = {
  id: string;
  title: string;
  updatedAt: string;
  is_active: boolean;
  techStack: string[];
};

export default function ResumesClient({ resumes }: { resumes: ResumeListItem[] }) {
  const router = useRouter();
  const [localResumes, setLocalResumes] = useState(resumes);
  
  const handleCreateNew = () => {
    router.push("/resume?mode=new");
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              className="group relative flex min-h-[236px] cursor-pointer flex-col rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-800 dark:bg-slate-900/70"
            >
              <button
                onClick={(event) => handleDelete(event, resume.id)}
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileBadge className="h-5 w-5" />
              </div>
              <div className="flex items-start gap-2 pr-8">
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

              <div className="mt-auto flex items-center justify-between pt-5">
                <span className="text-xs font-semibold text-slate-400">
                  클릭해서 이력서 열기
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-white dark:border-slate-800 dark:bg-slate-900">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
