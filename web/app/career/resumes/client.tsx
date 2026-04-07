"use client";

import { Plus, ArrowRight, Trash2 } from "lucide-react";
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
    <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-12 md:pt-20 pb-24 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">내 이력서 캐비닛</h1>
          <p className="text-[14px] text-slate-500 mt-1.5">커리어 탭에서 모은 모든 경험이 자동으로 동기화된 완성형 이력서 리스트입니다.</p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white font-semibold shadow-sm gap-2 transition-all text-[13px]"
        >
          <Plus className="w-4 h-4" /> 새 이력서 작성
        </Button>
      </div>

      <div className="w-full border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111] rounded-3xl overflow-hidden shadow-sm">
        
        <div className="hidden md:flex items-center justify-between bg-slate-50/80 dark:bg-[#151515] px-8 py-4 border-b-2 border-slate-200 dark:border-slate-800 text-[13px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
          <div>이력서 목록</div>
          <div className="pr-4">관리</div>
        </div>

        <div className="divide-y-2 divide-slate-100 dark:divide-slate-800/60">
          
          {localResumes.length === 0 ? (
             <div className="p-8 text-center text-slate-400 text-sm">저장된 이력서가 없습니다.</div>
          ) : localResumes.map((resume) => (
            <div 
              key={resume.id}
              onClick={() => handleOpenResume(resume.id, resume.is_active)}
              className="group flex flex-col md:flex-row md:items-center justify-between px-6 md:px-8 py-5 hover:bg-primary/[0.04] dark:hover:bg-primary/[0.08] transition-all duration-300 cursor-pointer bg-white dark:bg-[#111] gap-4"
            >
              <div className="flex items-center pl-2 flex-1 min-w-0 pr-4">
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                     <h3 className="text-[15px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors tracking-tight truncate">
                       {resume.title}
                     </h3>
                     {resume.is_active && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">보는 중</span>}
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {resume.techStack.length > 0 ? resume.techStack.map(tech => (
                      <span key={tech} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500">{tech}</span>
                    )) : (
                      <span className="text-[11px] text-slate-400 mt-0.5">등록된 스킬이 없습니다.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-6 shrink-0 self-end md:self-auto">
                <span className="hidden md:block text-[13px] font-bold text-slate-400">
                  {new Date(resume.updatedAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => handleDelete(e, resume.id)}
                    className="w-10 h-10 rounded-xl bg-transparent md:hover:bg-red-50 md:hover:text-red-500 dark:hover:bg-red-950/30 flex items-center justify-center text-slate-300 md:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all text-slate-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
          
        </div>
      </div>
    </div>
  );
}
