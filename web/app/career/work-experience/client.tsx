"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  GitCommitVertical,
  LayoutGrid,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthRangePicker } from "@/components/features/resume/MonthRangePicker";
import { saveWorkExperienceAction, deleteWorkExperienceAction, type WorkExperienceInput } from "./actions";

export default function WorkExperienceClient({ initialExperiences }: { initialExperiences: WorkExperienceInput[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [experiences, setExperiences] = useState<WorkExperienceInput[]>(initialExperiences || []);
  const [formData, setFormData] = useState<Partial<WorkExperienceInput>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards");

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
  const activeExperience = sortedExperiences.find((experience) => experience.id === activeId);

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
    <div className="relative min-h-screen overflow-x-hidden pb-48 pt-12 font-sans md:pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="mb-10 flex min-w-0 flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {sortedExperiences.length}개 경력
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              경력 보관함
            </h1>
            <p className="max-w-2xl text-[14px] leading-6 text-slate-500">
              공식적인 직장 재직 이력을 카드로 관리하고, 필요할 때 타임라인 뷰로 흐름을 확인하세요.
            </p>
          </div>

          <div className="-mx-1 flex min-w-0 gap-3 overflow-x-auto px-1 pb-1 lg:shrink-0 lg:flex-wrap lg:overflow-visible">
            <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold transition-colors",
                  viewMode === "cards"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                카드
              </button>
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold transition-colors",
                  viewMode === "timeline"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
                )}
              >
                <GitCommitVertical className="h-4 w-4" />
                타임라인
              </button>
            </div>

            <Button
              size="lg"
              onClick={handleAddNew}
              className="h-12 shrink-0 rounded-full bg-primary/10 px-6 font-bold text-primary shadow-sm transition-all hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
            >
              <Plus className="mr-2 h-5 w-5" />
              새 직장 추가
            </Button>
          </div>
        </div>

        {sortedExperiences.length === 0 && activeId === null && (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 py-20 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="mb-4 font-medium text-slate-500">아직 등록된 재직 경력이 없습니다.</p>
            <Button onClick={handleAddNew} variant="outline" className="rounded-full">
              경력 추가하기
            </Button>
          </div>
        )}

        {activeId?.startsWith("new_") && (
          <div className="mb-8 max-w-2xl">
            <ExperienceFormCard
              formData={formData}
              setFormData={setFormData}
              onClose={() => setActiveId(null)}
              onSave={handleSave}
              isSaving={isSaving}
            />
          </div>
        )}

        {sortedExperiences.length > 0 && viewMode === "cards" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedExperiences.map((exp) => {
              const isActive = activeId === exp.id;
              return (
                <article
                  key={exp.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(exp)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    handleCardClick(exp);
                  }}
                  className={cn(
                    "group relative flex min-h-[220px] cursor-pointer flex-col rounded-lg border bg-white p-6 text-left shadow-sm transition-all duration-200 dark:bg-slate-900/70",
                    "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30",
                    isActive
                      ? "border-primary/40 bg-primary/5 ring-2 ring-primary/10"
                      : "border-slate-200 dark:border-slate-800",
                  )}
                >
                  <button
                    onClick={(event) => handleDelete(exp.id!, event)}
                    className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <CalendarDays className="h-4 w-4" />
                    {exp.period || "---"}
                  </div>
                  <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-primary dark:text-slate-100">
                    {exp.company || "(회사명 미입력)"}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {exp.position || "(직책 미입력)"}
                  </p>
                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {exp.description || "주요 업무와 성과가 아직 작성되지 않았습니다."}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
                      <Building2 className="h-3.5 w-3.5" />
                      경력
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-primary" />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {viewMode === "cards" && activeExperience && !activeId?.startsWith("new_") && (
          <div className="mt-8 max-w-2xl">
            <ExperienceFormCard
              formData={formData}
              setFormData={setFormData}
              onClose={() => setActiveId(null)}
              onSave={handleSave}
              isSaving={isSaving}
            />
          </div>
        )}

        {sortedExperiences.length > 0 && viewMode === "timeline" && (
          <div
            className={cn(
              "relative w-full pb-20 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
              activeId !== null ? "translate-x-0" : "lg:translate-x-[20%]",
            )}
          >
            <div className="absolute bottom-0 left-1/2 top-4 w-[2px] -translate-x-1/2 rounded-full bg-slate-200 dark:bg-slate-800/60" />
            <div className="relative z-10 flex flex-col gap-10">
              {sortedExperiences.map((exp) => {
                const isActive = activeId === exp.id;
                return (
                  <div key={exp.id} className="group relative flex w-full items-start justify-center">
                    <div className="flex w-1/2 justify-end pr-10 md:pr-14">
                      <div
                        onClick={() => handleCardClick(exp)}
                        className={cn(
                          "relative w-full max-w-[440px] cursor-pointer rounded-[24px] p-6 transition-all duration-300 group-hover:-translate-x-1",
                          isActive
                            ? "border-2 border-slate-300 bg-slate-50 shadow-md dark:border-slate-700 dark:bg-slate-900"
                            : "border border-slate-200 bg-white/70 shadow-sm backdrop-blur-md hover:border-primary/40 hover:bg-white dark:border-slate-800 dark:bg-slate-900/40",
                        )}
                      >
                        {!isActive && (
                          <button
                            onClick={(event) => handleDelete(exp.id!, event)}
                            className="absolute right-6 top-6 rounded-full p-2 text-slate-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <div className="mb-3 flex items-start justify-between">
                          <span className="text-[13px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            {exp.period || "---"}
                          </span>
                        </div>
                        <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-primary dark:text-slate-100">
                          {exp.company || "(회사명 미입력)"}
                        </h3>
                        <p className="mt-1.5 text-[13.5px] font-medium text-slate-500">
                          {exp.position || "(직책 미입력)"}
                        </p>
                      </div>
                    </div>

                    <div className="absolute left-1/2 top-10 z-20 flex -translate-x-1/2 flex-col items-center justify-center">
                      <div
                        onClick={() => handleCardClick(exp)}
                        className={cn(
                          "h-[18px] w-[18px] cursor-pointer rounded-full ring-8 ring-[#f8fafc] transition-all duration-500 dark:ring-[#0f172a]",
                          isActive
                            ? "scale-[1.3] bg-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]"
                            : "bg-slate-300 group-hover:bg-slate-400 dark:bg-slate-700",
                        )}
                      />
                    </div>

                    <div className="relative min-h-[160px] w-1/2 pl-10 md:pl-16">
                      <div
                        className={cn(
                          "absolute origin-left w-full max-w-[540px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          isActive
                            ? "z-30 scale-100 translate-x-0 opacity-100"
                            : "pointer-events-none z-0 scale-95 -translate-x-12 opacity-0",
                        )}
                      >
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
        )}
      </div>
    </div>
  );
}

// Internal Form Component
function ExperienceFormCard({
  formData,
  setFormData,
  onClose,
  onSave,
  isSaving,
}: {
  formData: Partial<WorkExperienceInput>;
  setFormData: (data: Partial<WorkExperienceInput>) => void;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
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
