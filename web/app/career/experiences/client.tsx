"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { saveExperienceAction, deleteExperienceAction, type ExperienceInput } from "./actions";
import { Plus, Trash2, Sparkles, Check, ChevronRight, ChevronDown, ChevronUp, X, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthRangePicker } from "@/components/features/resume/MonthRangePicker";

interface ExperienceFormProps {
  formData: Partial<ExperienceInput>;
  setFormData: (data: Partial<ExperienceInput>) => void;
}

const ExperienceFormUI = ({ formData, setFormData }: ExperienceFormProps) => {
  const [tagsInput, setTagsInput] = React.useState(formData.tags?.join(", ") || "");
  const [isStadriOpen, setIsStadriOpen] = React.useState(false);

  // Update local state when formData changes (e.g. when opening a new experience)
  React.useEffect(() => {
    setTagsInput(formData.tags?.join(", ") || "");
  }, [formData.id]);

  const handleTagsChange = (val: string) => {
    setTagsInput(val);
    const tags = val.split(",").map(t => t.trim()).filter(Boolean);
    setFormData({ ...formData, tags });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50">
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">활동명 (Title)</label>
          <input
            value={formData.company || ""}
            onChange={e => setFormData({ ...formData, company: e.target.value })}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm text-[14px]" placeholder="예: GDSC 3기 멤버" />
        </div>

        <div className="flex gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">진행 기간 (Date)</label>
            <MonthRangePicker
              value={formData.period || ""}
              onChange={v => setFormData({ ...formData, period: v })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">1줄 요약 (Short Summary)</label>
          <input
            value={formData.description || ""}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm text-[14px]" placeholder="예: 팀장으로서 5명의 팀원을 이끌고 메신저 앱 배포" />
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">핵심 태그 (Tags: 쉼표로 구분)</label>
          <input
            value={tagsInput}
            onChange={e => handleTagsChange(e.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm text-[14px]" placeholder="예: 리더십, 소통, React, 배포" />
          <p className="text-[11px] text-slate-500 font-medium ml-1">입력한 태그가 타임라인 카드에 표시됩니다.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsStadriOpen(!isStadriOpen)}
        className="w-full h-10 flex items-center justify-between px-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors group"
      >
        <span className="text-[14px] font-bold">상세 경험 보기</span>
        {isStadriOpen ? <ChevronUp className="w-5 h-5 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 rounded-full p-0.5 transition-colors" /> : <ChevronDown className="w-5 h-5 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 rounded-full p-0.5 transition-colors" />}
      </button>

      {isStadriOpen && (
        <div className="p-6 space-y-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">어떤 상황이었나요? (Situation)</label>
            <textarea
              value={formData.situation || ""}
              onChange={e => setFormData({ ...formData, situation: e.target.value })}
              className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px] leading-relaxed resize-none shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">나의 임무는 무엇이었나요? (Role)</label>
            <textarea
              value={formData.role || ""}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px] leading-relaxed resize-none shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">구체적으로 어떤 행동을 했나요? (Solution)</label>
            <textarea
              value={formData.solution || ""}
              onChange={e => setFormData({ ...formData, solution: e.target.value })}
              className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px] leading-relaxed resize-none shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">가장 힘들었던 점은 무엇인가요? (Difficulty)</label>
            <textarea
              value={formData.difficulty || ""}
              onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
              className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px] leading-relaxed resize-none shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">어떤 결과물이 있었나요? (Result)</label>
            <textarea
              value={formData.result || ""}
              onChange={e => setFormData({ ...formData, result: e.target.value })}
              className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px] leading-relaxed resize-none shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">새롭게 배운 점은 무엇인가요? (Lesson)</label>
            <textarea
              value={formData.lesson || ""}
              onChange={e => setFormData({ ...formData, lesson: e.target.value })}
              className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px] leading-relaxed resize-none shadow-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default function CareerTimelineClient({ initialExperiences }: { initialExperiences: ExperienceInput[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const [experiences, setExperiences] = useState<ExperienceInput[]>(initialExperiences || []);
  const [formData, setFormData] = useState<Partial<ExperienceInput>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleAddNew = () => {
    router.push("/career/experiences/new");
  };

  const handleSave = async (closeFn: () => void) => {
    if (!formData.company?.trim()) {
      alert("활동명을 입력해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await saveExperienceAction(formData as ExperienceInput);
      if (result.success && result.experience) {
        setExperiences(prev => {
          const exists = prev.find(e => e.id === result.experience!.id);
          if (exists) return prev.map(e => e.id === result.experience!.id ? result.experience! : e);
          return [...prev, result.experience!];
        });
        closeFn();
      }
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("정말 이 경험을 삭제하시겠습니까?")) return;
    try {
      await deleteExperienceAction(id);
      setExperiences(prev => prev.filter(e => e.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleCardClick = (exp: ExperienceInput) => {
    if (selectionMode) {
      setSelectedIds(prev => prev.includes(exp.id!) ? prev.filter(id => id !== exp.id!) : [...prev, exp.id!]);
    } else {
      setActiveId(prev => prev === exp.id ? null : exp.id!);
      if (activeId !== exp.id) setFormData(exp);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (!selectionMode) setActiveId(null);
    else setSelectedIds([]);
  };

  // Navigate to the AI resume setup wizard with pre-filled experience context
  const navigateToAiSetup = () => {
    const selectedExps = experiences.filter(e => selectedIds.includes(e.id!));

    // Build a rich context string including all STADRI fields
    const fullContextString = selectedExps.map(e => `
[경험 제목: ${e.company}]
진행 기간: ${e.period || "미입력"}
요약: ${e.description || "미입력"}
태그: ${e.tags?.join(", ") || "없음"}
상황(Situation): ${e.situation || "미입력"}
역할(Role): ${e.role || "미입력"}
행동(Solution): ${e.solution || "미입력"}
어려움(Difficulty): ${e.difficulty || "미입력"}
결과(Result): ${e.result || "미입력"}
배운점(Lesson): ${e.lesson || "미입력"}
    `.trim()).join("\n\n---\n\n");

    // Store in sessionStorage to bypass URL length limits
    sessionStorage.setItem("wizard_context_data", fullContextString);

    const params = new URLSearchParams({
      source: "career",
      experienceIds: selectedIds.join(","),
    });
    router.push(`/career/cover-letter-wizard?${params.toString()}`);
  };


  return (
    <div className="min-h-screen pt-12 md:pt-20 pb-48 font-sans overflow-x-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">나의 경험 타임라인</h1>
            <p className="text-[14px] text-slate-500 max-w-2xl">활동을 기록하고 세부 사항을 작성하세요. 자소서 뼈대로 활용할 수 있습니다.</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={toggleSelectionMode}
              variant={selectionMode ? "default" : "outline"}
              className={cn(
                "rounded-full h-12 px-6 font-bold shadow-sm transition-all duration-300 gap-2",
                selectionMode
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              )}
            >
              {selectionMode ? <Check className="w-4 h-4" /> : <MousePointerClick className="w-4 h-4" />}
              {selectionMode ? "작성 모드 취소" : "자소서 작성 모드"}
            </Button>

            <Button
              size="lg"
              onClick={handleAddNew}
              className="rounded-full h-12 shadow-sm transition-all font-bold bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30 shrink-0 px-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              새 경험 추가
            </Button>
          </div>
        </div>

        {/* Timeline Container */}
        <div className={cn(
          "relative w-full pb-20 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          (experiences.length > 0 && activeId !== null && !selectionMode) ? "translate-x-0" :
            (experiences.length > 0) ? "lg:translate-x-[20%]" : "translate-x-0"
        )}>
          {/* Centered Vertical Line — only visible when there are experiences */}
          {experiences.length > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 top-4 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-800/60 rounded-full" />
          )}

          {experiences.length === 0 && (
            <div className="relative z-10 flex flex-col items-center justify-center py-20 mx-auto w-full bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-slate-500 font-medium mb-4">아직 등록된 경험이 없습니다.</p>
              <Button onClick={handleAddNew} variant="outline" className="rounded-full">새 경험 추가하기</Button>
            </div>
          )}

          <div className="flex flex-col gap-10 relative z-10">
            {[...experiences].sort((a, b) => {
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
            }).map((exp) => {
              const isActive = activeId === exp.id;
              const isSelected = selectedIds.includes(exp.id!);

              return (
                <div key={exp.id} className="relative w-full flex justify-center items-start group">
                  <div className="w-1/2 pr-10 md:pr-14 flex justify-end">
                    <div
                      onClick={() => handleCardClick(exp)}
                      className={cn(
                        "w-full max-w-[440px] rounded-[24px] p-6 transition-all duration-300 cursor-pointer relative group-hover:-translate-x-1",
                        isActive && !selectionMode && "bg-slate-50 dark:bg-slate-900 shadow-md border-2 border-slate-300 dark:border-slate-700",
                        isSelected && selectionMode && "bg-primary/10 dark:bg-primary/20 shadow-lg border-2 border-primary ring-4 ring-primary/10",
                        !isActive && !(isSelected && selectionMode) && "bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border shadow-sm border-slate-200 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/50 hover:bg-white"
                      )}
                    >
                      {selectionMode && (
                        <div className="absolute top-6 right-6 transition-all duration-300">
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-slate-300 dark:border-slate-600 bg-transparent"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      )}

                      {!selectionMode && !isActive && (
                        <button
                          onClick={(e) => handleDelete(exp.id!, e)}
                          className="absolute top-6 right-6 p-2 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[13px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">{exp.period || "---"}</span>
                        {!selectionMode && !isActive && <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />}
                      </div>

                      <h3 className="font-semibold text-[15px] leading-snug text-slate-800 dark:text-slate-100 mb-3 group-hover:text-primary transition-colors line-clamp-2">
                        {exp.company || "(제목 없음)"}
                      </h3>

                      <div className="flex flex-wrap gap-2">
                        {exp.tags?.map(tag => (
                          <span key={tag} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-1/2 -translate-x-1/2 top-10 flex flex-col items-center justify-center z-20">
                    <div
                      onClick={() => handleCardClick(exp)}
                      className={cn(
                        "w-[18px] h-[18px] rounded-full transition-all duration-500 cursor-pointer ring-8 ring-[#f8fafc] dark:ring-[#0f172a]",
                        (isActive || isSelected)
                          ? "bg-primary scale-[1.3] shadow-[0_0_15px_rgba(var(--primary),0.4)]"
                          : "bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400"
                      )}
                    />
                  </div>

                  <div className="w-1/2 pl-10 md:pl-16 relative min-h-[160px]">
                    <div className={cn(
                      "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] absolute origin-left w-full max-w-[540px]",
                      isActive && !selectionMode
                        ? "opacity-100 translate-x-0 scale-100 z-30"
                        : "opacity-0 -translate-x-12 scale-95 pointer-events-none z-0"
                    )}>
                      {isActive && !selectionMode && (
                        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-[0_20px_80px_-15px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                          <div className="absolute top-[40px] -left-[10px] w-5 h-5 bg-white dark:bg-slate-900 border-l border-t border-slate-200 dark:border-slate-800 transform -rotate-45" />

                          <div className="p-8 max-h-[700px] overflow-y-auto no-scrollbar">
                            <div className="flex justify-between items-center mb-8">
                              <h4 className="font-semibold text-[15px] text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                경험 편집
                              </h4>
                              <button onClick={() => setActiveId(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <ExperienceFormUI formData={formData} setFormData={setFormData} />

                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                              <Button variant="ghost" onClick={() => setActiveId(null)} className="h-12 font-bold rounded-2xl text-slate-500 hover:text-slate-700 hover:bg-transparent dark:hover:text-slate-300 dark:hover:bg-transparent px-6" disabled={isSaving}>닫기</Button>
                              <Button variant="ghost" className="h-12 font-bold text-primary hover:text-primary/80 hover:bg-transparent rounded-2xl px-8 transition-all" onClick={() => handleSave(() => setActiveId(null))} disabled={isSaving}>
                                {isSaving ? "저장 중..." : "저장하기"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={cn(
        "fixed bottom-10 left-1/2 -translate-x-1/2 z-[40] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        (selectionMode && selectedIds.length > 0) ? "translate-y-0 opacity-100 scale-100" : "translate-y-24 opacity-0 scale-95 pointer-events-none"
      )}>
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-primary/20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-full pl-6 pr-2 py-2 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
              {selectedIds.length}
            </div>
            <span className="text-[15px] font-extrabold text-slate-800 dark:text-slate-200 whitespace-nowrap pr-2">
              개의 경험 선택됨
            </span>
          </div>

          <Button
            onClick={navigateToAiSetup}
            className="rounded-full h-12 px-6 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold space-x-2 transition-transform active:scale-95"
          >
            <Sparkles className="w-5 h-5" />
            <span>선택한 경험으로 자소서 생성</span>
          </Button>
        </div>
      </div>

    </div>
  );
}
