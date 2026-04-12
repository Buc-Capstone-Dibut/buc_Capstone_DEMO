"use client";

import { Check, ChevronRight, Trash2, X } from "lucide-react";
import type { ExperienceInput } from "@/app/career/experiences/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExperienceFormPanel } from "./experience-form-panel";
import type { ExperienceTimelineFormData } from "./experience-timeline.types";

interface ExperienceTimelineCardProps {
  experience: ExperienceInput;
  isActive: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  formData: ExperienceTimelineFormData;
  setFormData: (data: ExperienceTimelineFormData) => void;
  onCardClick: (experience: ExperienceInput) => void;
  onDelete: (id: string) => Promise<void>;
  onSave: (closeFn: () => void) => Promise<void>;
  onCloseActive: () => void;
  isSaving: boolean;
}

export function ExperienceTimelineCard({
  experience,
  isActive,
  isSelected,
  selectionMode,
  formData,
  setFormData,
  onCardClick,
  onDelete,
  onSave,
  onCloseActive,
  isSaving,
}: ExperienceTimelineCardProps) {
  return (
    <div className="group relative flex w-full items-start justify-center">
      <div className="w-1/2 pr-10 md:pr-14 flex justify-end">
        <div
          onClick={() => onCardClick(experience)}
          className={cn(
            "relative w-full max-w-[440px] cursor-pointer rounded-[24px] p-6 transition-all duration-300 group-hover:-translate-x-1",
            isActive &&
              !selectionMode &&
              "border-2 border-slate-300 bg-slate-50 shadow-md dark:border-slate-700 dark:bg-slate-900",
            isSelected &&
              selectionMode &&
              "border-2 border-primary bg-primary/10 shadow-lg ring-4 ring-primary/10 dark:bg-primary/20",
            !isActive &&
              !(isSelected && selectionMode) &&
              "border border-slate-200 bg-white/70 shadow-sm backdrop-blur-md hover:border-primary/40 hover:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-primary/50",
          )}
        >
          {selectionMode && (
            <div className="absolute right-6 top-6 transition-all duration-300">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-slate-300 bg-transparent dark:border-slate-600",
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
            </div>
          )}

          {!selectionMode && !isActive && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void onDelete(experience.id!);
              }}
              className="absolute right-12 top-6 rounded-full p-2 text-slate-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <div className="mb-3 flex items-start justify-between">
            <span className="text-[13px] font-black tracking-widest text-slate-400 uppercase dark:text-slate-500">
              {experience.period || "---"}
            </span>
            {!selectionMode && !isActive && (
              <ChevronRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-primary" />
            )}
          </div>

          <h3 className="mb-3 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-primary dark:text-slate-100">
            {experience.company || "(제목 없음)"}
          </h3>

          <div className="flex flex-wrap gap-2">
            {experience.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-slate-200/50 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 top-10 z-20 flex -translate-x-1/2 flex-col items-center justify-center">
        <div
          onClick={() => onCardClick(experience)}
          className={cn(
            "h-[18px] w-[18px] cursor-pointer rounded-full ring-8 ring-[#f8fafc] transition-all duration-500 dark:ring-[#0f172a]",
            isActive || isSelected
              ? "scale-[1.3] bg-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]"
              : "bg-slate-300 group-hover:bg-slate-400 dark:bg-slate-700",
          )}
        />
      </div>

      <div className="relative min-h-[160px] w-1/2 pl-10 md:pl-16">
        <div
          className={cn(
            "absolute origin-left w-full max-w-[540px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            isActive && !selectionMode
              ? "z-30 scale-100 translate-x-0 opacity-100"
              : "pointer-events-none z-0 scale-95 -translate-x-12 opacity-0",
          )}
        >
          {isActive && !selectionMode && (
            <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_80px_-15px_rgba(0,0,0,0.1)] dark:border-slate-800 dark:bg-slate-900">
              <div className="absolute -left-[10px] top-[40px] h-5 w-5 -rotate-45 transform border-l border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />

              <div className="max-h-[700px] overflow-y-auto p-8 no-scrollbar">
                <div className="mb-8 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800 dark:text-slate-100">
                    경험 편집
                  </h4>
                  <button
                    type="button"
                    onClick={onCloseActive}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <ExperienceFormPanel
                  formData={formData}
                  setFormData={setFormData}
                />

                <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
                  <Button
                    variant="ghost"
                    onClick={onCloseActive}
                    className="h-12 rounded-2xl px-6 font-bold text-slate-500 hover:bg-transparent hover:text-slate-700 dark:hover:bg-transparent dark:hover:text-slate-300"
                    disabled={isSaving}
                  >
                    닫기
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-12 rounded-2xl px-8 font-bold text-primary transition-all hover:bg-transparent hover:text-primary/80"
                    onClick={() => void onSave(onCloseActive)}
                    disabled={isSaving}
                  >
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
}
