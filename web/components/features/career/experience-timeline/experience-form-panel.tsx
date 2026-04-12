"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MonthRangePicker } from "@/components/features/resume/MonthRangePicker";
import type { ExperienceTimelineFormData } from "./experience-timeline.types";

interface ExperienceFormPanelProps {
  formData: ExperienceTimelineFormData;
  setFormData: (data: ExperienceTimelineFormData) => void;
}

export function ExperienceFormPanel({
  formData,
  setFormData,
}: ExperienceFormPanelProps) {
  const [tagsInput, setTagsInput] = useState(formData.tags?.join(", ") || "");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    setTagsInput(formData.tags?.join(", ") || "");
  }, [formData.id, formData.tags]);

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const tags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    setFormData({ ...formData, tags });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-800/50 dark:bg-slate-900/50">
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            활동명 (Title)
          </label>
          <input
            value={formData.company || ""}
            onChange={(event) =>
              setFormData({ ...formData, company: event.target.value })
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
            placeholder="예: GDSC 3기 멤버"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              진행 기간 (Date)
            </label>
            <MonthRangePicker
              value={formData.period || ""}
              onChange={(value) => setFormData({ ...formData, period: value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            1줄 요약 (Short Summary)
          </label>
          <input
            value={formData.description || ""}
            onChange={(event) =>
              setFormData({ ...formData, description: event.target.value })
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
            placeholder="예: 팀장으로서 5명의 팀원을 이끌고 메신저 앱 배포"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            핵심 태그 (Tags: 쉼표로 구분)
          </label>
          <input
            value={tagsInput}
            onChange={(event) => handleTagsChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
            placeholder="예: 리더십, 소통, React, 배포"
          />
          <p className="ml-1 text-[11px] font-medium text-slate-500">
            입력한 태그가 타임라인 카드에 표시됩니다.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsDetailsOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between px-2 text-slate-500 transition-colors group hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <span className="text-[14px] font-bold">상세 경험 보기</span>
        {isDetailsOpen ? (
          <ChevronUp className="h-5 w-5 rounded-full p-0.5 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-800" />
        ) : (
          <ChevronDown className="h-5 w-5 rounded-full p-0.5 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-800" />
        )}
      </button>

      {isDetailsOpen && (
        <div className="animate-in slide-in-from-top-2 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm duration-300 dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              어떤 상황이었나요? (Situation)
            </label>
            <textarea
              value={formData.situation || ""}
              onChange={(event) =>
                setFormData({ ...formData, situation: event.target.value })
              }
              className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-transparent p-4 text-[14px] leading-relaxed shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              나의 임무는 무엇이었나요? (Role)
            </label>
            <textarea
              value={formData.role || ""}
              onChange={(event) =>
                setFormData({ ...formData, role: event.target.value })
              }
              className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-transparent p-4 text-[14px] leading-relaxed shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              구체적으로 어떤 행동을 했나요? (Solution)
            </label>
            <textarea
              value={formData.solution || ""}
              onChange={(event) =>
                setFormData({ ...formData, solution: event.target.value })
              }
              className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-transparent p-4 text-[14px] leading-relaxed shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              가장 힘들었던 점은 무엇인가요? (Difficulty)
            </label>
            <textarea
              value={formData.difficulty || ""}
              onChange={(event) =>
                setFormData({ ...formData, difficulty: event.target.value })
              }
              className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-transparent p-4 text-[14px] leading-relaxed shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              어떤 결과물이 있었나요? (Result)
            </label>
            <textarea
              value={formData.result || ""}
              onChange={(event) =>
                setFormData({ ...formData, result: event.target.value })
              }
              className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-transparent p-4 text-[14px] leading-relaxed shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              새롭게 배운 점은 무엇인가요? (Lesson)
            </label>
            <textarea
              value={formData.lesson || ""}
              onChange={(event) =>
                setFormData({ ...formData, lesson: event.target.value })
              }
              className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-transparent p-4 text-[14px] leading-relaxed shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
