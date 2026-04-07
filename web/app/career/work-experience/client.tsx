"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, X, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthRangePicker } from "@/components/features/resume/MonthRangePicker";
import { saveWorkExperienceAction, deleteWorkExperienceAction, type WorkExperienceInput } from "./actions";

export default function WorkExperienceClient({ initialExperiences }: { initialExperiences: WorkExperienceInput[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [experiences, setExperiences] = useState<WorkExperienceInput[]>(initialExperiences || []);
  const [formData, setFormData] = useState<Partial<WorkExperienceInput>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Default sorted experiences
  const sortedExperiences = [...experiences].sort((a, b) => {
    const getDateString = (periodStr?: string) => {
      if (!periodStr) return "0000.00";
      const startPart = periodStr.split("~")[0].trim();
      const match = startPart.match(/(\d{4})[:./-](\d{1,2})/);
      if (match) {
        return `${match[1]}.${match[2].padStart(2, '0')}`;
      }
      return "0000.00";
    };
    const dateA = getDateString(a.period);
    const dateB = getDateString(b.period);
    return dateB.localeCompare(dateA);
  });

  const handleAddNew = () => {
    const newId = `new_${Date.now()}`;
    setFormData({
      id: newId,
      company: "",
      position: "",
      period: "",
      description: "",
    });
    setActiveId(newId);
  };

  const handleSave = async () => {
    if (!formData.company || !formData.period) {
      alert("회사명과 재직 기간을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const isNew = formData.id?.startsWith("new_");
      const saveData = { ...formData };
      if (isNew) delete saveData.id;

      const result = await saveWorkExperienceAction(saveData as WorkExperienceInput);

      setExperiences(prev => {
        if (isNew) return [...prev, result.experience];
        return prev.map(e => e.id === result.experience.id ? result.experience : e);
      });

      setActiveId(null);
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("정말 이 경력을 삭제하시겠습니까?")) return;
    try {
      await deleteWorkExperienceAction(id);
      setExperiences(prev => prev.filter(e => e.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleCardClick = (exp: WorkExperienceInput) => {
    setActiveId(prev => prev === exp.id ? null : exp.id!);
    if (activeId !== exp.id) setFormData(exp);
  };

  return (
    <div className="min-h-screen pt-12 md:pt-20 pb-48 font-sans overflow-x-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              나의 경력 보관함
            </h1>
            <p className="text-[14px] text-slate-500 max-w-2xl">인턴, 계약직, 정규직 등 공식적인 나의 직장 재직 이력을 시간순으로 관리하세요. 여기서 작성한 내역은 이력서에 손쉽게 연동됩니다.</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              size="lg"
              onClick={handleAddNew}
              className="rounded-full h-12 shadow-sm transition-all font-bold bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 px-6 gap-2"
            >
              <Plus className="w-5 h-5" />
              새 직장 추가
            </Button>
          </div>
        </div>

        {/* Timeline Container */}
        <div className={cn(
          "relative w-full pb-20 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          (activeId !== null && sortedExperiences.length > 0) ? "translate-x-0" :
            (sortedExperiences.length > 0) ? "lg:translate-x-[20%]" : "translate-x-0"
        )}>

          {sortedExperiences.length > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 top-4 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-800/60 rounded-full" />
          )}

          {sortedExperiences.length === 0 && activeId === null && (
            <div className="relative z-10 flex flex-col items-center justify-center py-20 mx-auto max-w-2xl w-full bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-slate-500 font-medium mb-4">아직 등록된 재직 경력이 없습니다.</p>
              <Button onClick={handleAddNew} variant="outline" className="rounded-full">경력 추가하기</Button>
            </div>
          )}

          <div className="flex flex-col gap-10 relative z-10">
            {activeId?.startsWith("new_") && (
              <div className="relative w-full flex justify-center items-start group">
                {/* Virtual card for new item */}
                <div className="w-1/2 pr-10 md:pr-14 flex justify-end">
                  <div className="w-full max-w-[440px] rounded-[24px] p-6 bg-slate-50 dark:bg-slate-900 shadow-md border-2 border-primary/30 opacity-70">
                    <h3 className="font-semibold text-[15px] text-slate-400">새로운 직장 (작성 중...)</h3>
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-10 flex flex-col items-center justify-center z-20">
                  <div className="w-[18px] h-[18px] rounded-full bg-primary scale-[1.3] shadow-[0_0_15px_rgba(var(--primary),0.4)] ring-8 ring-[#f8fafc] dark:ring-[#0f172a]" />
                </div>
                <div className="w-1/2 pl-10 md:pl-16 relative min-h-[160px] z-30 opacity-100 translate-x-0 scale-100">
                  {/* Form directly inline */}
                  <ExperienceFormCard
                    formData={formData}
                    setFormData={setFormData}
                    onClose={() => setActiveId(null)}
                    onSave={handleSave}
                    isSaving={isSaving}
                  />
                </div>
              </div>
            )}

            {sortedExperiences.map((exp) => {
              const isActive = activeId === exp.id;

              return (
                <div key={exp.id} className="relative w-full flex justify-center items-start group">
                  <div className="w-1/2 pr-10 md:pr-14 flex justify-end">
                    <div
                      onClick={() => handleCardClick(exp)}
                      className={cn(
                        "w-full max-w-[440px] rounded-[24px] p-6 transition-all duration-300 cursor-pointer relative group-hover:-translate-x-1",
                        isActive && "bg-slate-50 dark:bg-slate-900 shadow-md border-2 border-slate-300 dark:border-slate-700",
                        !isActive && "bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border shadow-sm border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-white"
                      )}
                    >
                      {!isActive && (
                        <button
                          onClick={(e) => handleDelete(exp.id!, e)}
                          className="absolute top-6 right-6 p-2 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[13px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">{exp.period || "---"}</span>
                      </div>

                      <h3 className="font-semibold text-[16px] leading-snug text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-2">
                        {exp.company || "(회사명 미입력)"}
                      </h3>
                      <p className="text-[13.5px] font-medium text-slate-500 mt-1.5">{exp.position || "(직책 미입력)"}</p>
                    </div>
                  </div>

                  <div className="absolute left-1/2 -translate-x-1/2 top-10 flex flex-col items-center justify-center z-20">
                    <div
                      onClick={() => handleCardClick(exp)}
                      className={cn(
                        "w-[18px] h-[18px] rounded-full transition-all duration-500 cursor-pointer ring-8 ring-[#f8fafc] dark:ring-[#0f172a]",
                        isActive ? "bg-primary scale-[1.3] shadow-[0_0_15px_rgba(var(--primary),0.4)]" : "bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400"
                      )}
                    />
                  </div>

                  <div className="w-1/2 pl-10 md:pl-16 relative min-h-[160px]">
                    <div className={cn(
                      "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] absolute origin-left w-full max-w-[540px]",
                      isActive ? "opacity-100 translate-x-0 scale-100 z-30" : "opacity-0 -translate-x-12 scale-95 pointer-events-none z-0"
                    )}>
                      {isActive && (
                        <ExperienceFormCard
                          formData={formData}
                          setFormData={setFormData}
                          onClose={() => setActiveId(null)}
                          onSave={handleSave}
                          isSaving={isSaving}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Internal Form Component
function ExperienceFormCard({ formData, setFormData, onClose, onSave, isSaving }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-[0_20px_80px_-15px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-800 overflow-hidden relative">
      <div className="absolute top-[40px] -left-[10px] w-5 h-5 bg-white dark:bg-slate-900 border-l border-t border-slate-200 dark:border-slate-800 transform -rotate-45" />

      <div className="p-8 max-h-[700px] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-8">
          <h4 className="font-semibold text-[15px] text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            경력 정보 작성
          </h4>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 tracking-tight">회사명</label>
            <input
              value={formData.company || ""}
              onChange={e => setFormData({ ...formData, company: e.target.value })}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm text-[14px]"
              placeholder="(주)회사이름"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 tracking-tight">부서 및 직책</label>
            <input
              value={formData.position || ""}
              onChange={e => setFormData({ ...formData, position: e.target.value })}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm text-[14px]"
              placeholder="예: 마케팅팀 인턴, 프론트엔드 개발자"
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 tracking-tight">재직 기간</label>
            <MonthRangePicker
              value={formData.period || ""}
              onChange={v => setFormData({ ...formData, period: v })}
            />
          </div>

          <div className="space-y-2 pt-4">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 tracking-tight">주요 업무 및 성과</label>
            <textarea
              value={formData.description || ""}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full min-h-[140px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px] leading-relaxed resize-none shadow-sm"
              placeholder="- 소셜 미디어 마케팅 채널 콘텐츠 기획 및 운영&#10;- 주간 인사이트 리포트 작성&#10;- 사내 웹 애플리케이션 프론트엔드 개발"
            />
            <p className="text-[12px] text-slate-500 font-medium">이력서의 경력기술서에 그대로 들어갈 내용입니다. 개조식(-, •)으로 작성하시는 것을 추천드려요.</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="h-10 font-bold rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-6" disabled={isSaving}>취소</Button>
          <Button className="h-10 font-bold text-white bg-primary hover:bg-primary/90 rounded-xl px-8 shadow-md" onClick={onSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
