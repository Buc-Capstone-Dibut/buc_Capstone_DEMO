"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ImagePlus, X } from "lucide-react";
import { MonthRangePicker } from "@/components/features/resume/MonthRangePicker";
import type { ProjectArchiveFormData } from "./project-archive.types";

interface ProjectFormPanelProps {
  formData: ProjectArchiveFormData;
  setFormData: (data: ProjectArchiveFormData) => void;
}

const MAX_REPRESENTATIVE_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ProjectFormPanel({
  formData,
  setFormData,
}: ProjectFormPanelProps) {
  const [tagsInput, setTagsInput] = useState(formData.tags?.join(", ") || "");
  const [techStackInput, setTechStackInput] = useState(
    formData.techStack?.join(", ") || "",
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRepresentativeImageProcessing, setIsRepresentativeImageProcessing] = useState(false);

  useEffect(() => {
    setTagsInput(formData.tags?.join(", ") || "");
    setTechStackInput(formData.techStack?.join(", ") || "");
  }, [formData.id, formData.tags, formData.techStack]);

  const splitCommaValues = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const tags = splitCommaValues(value);
    setFormData({ ...formData, tags });
  };

  const handleTechStackChange = (value: string) => {
    setTechStackInput(value);
    const techStack = splitCommaValues(value);
    setFormData({ ...formData, techStack });
  };

  const handleRepresentativeImageChange = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      alert("JPG, PNG, WEBP 이미지만 등록할 수 있습니다.");
      return;
    }
    if (file.size > MAX_REPRESENTATIVE_IMAGE_BYTES) {
      alert("대표 이미지는 5MB 이하로 등록해주세요.");
      return;
    }

    setIsRepresentativeImageProcessing(true);
    try {
      const title = formData.company?.trim() || "프로젝트";
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("title", title);

      const response = await fetch("/api/career/projects/assets", {
        method: "POST",
        body: uploadFormData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "대표 이미지 업로드에 실패했습니다.");
      }

      setFormData({
        ...formData,
        representativeImage: payload.representativeImage,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "대표 이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsRepresentativeImageProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50 p-6 dark:border-slate-800/50 dark:bg-slate-900/50">
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            대표 이미지
          </label>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            {formData.representativeImage?.url ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.representativeImage.url}
                  alt={formData.representativeImage.alt || "프로젝트 대표 이미지"}
                  className="aspect-[16/9] w-full object-cover"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-500"
                  onClick={() => {
                    const nextFormData = { ...formData };
                    delete nextFormData.representativeImage;
                    setFormData(nextFormData);
                  }}
                  aria-label="대표 이미지 제거"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex aspect-[16/9] flex-col items-center justify-center rounded-xl bg-slate-50 text-center dark:bg-slate-900">
                <ImagePlus className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  포트폴리오 표지와 프로젝트 슬라이드에 사용할 이미지
                </p>
                <p className="mt-1 text-xs text-slate-400">JPG, PNG, WEBP · 최대 5MB</p>
              </div>
            )}
            <label className="mt-3 flex h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {isRepresentativeImageProcessing
                ? "이미지 처리 중..."
                : formData.representativeImage?.url
                  ? "대표 이미지 변경"
                  : "대표 이미지 등록"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={isRepresentativeImageProcessing}
                onChange={(event) => {
                  void handleRepresentativeImageChange(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <p className="ml-1 text-[11px] font-medium text-slate-500">
            프로젝트 상세 이미지와 별도로 1개만 저장되며, 포트폴리오 PPT 생성 시 우선 사용됩니다.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            프로젝트명 (Title)
          </label>
          <input
            value={formData.company || ""}
            onChange={(event) =>
              setFormData({ ...formData, company: event.target.value })
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
            placeholder="예: 실시간 협업 보드 리뉴얼"
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
            placeholder="예: 팀장으로서 5명의 팀원을 이끌고 협업 기능을 배포"
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
            입력한 태그가 프로젝트 카드에 표시됩니다.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            기술 스택 (로고 자동)
          </label>
          <input
            value={techStackInput}
            onChange={(event) => handleTechStackChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] shadow-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950"
            placeholder="예: React, Next.js, TypeScript, Supabase"
          />
          <p className="ml-1 text-[11px] font-medium text-slate-500">
            입력한 기술명은 포트폴리오 PPT 기술 슬라이드에서 로고로 자동 배치됩니다.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsDetailsOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between px-2 text-slate-500 transition-colors group hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <span className="text-[14px] font-bold">상세 프로젝트 보기</span>
        {isDetailsOpen ? (
          <ChevronUp className="h-5 w-5 rounded-full p-0.5 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-800" />
        ) : (
          <ChevronDown className="h-5 w-5 rounded-full p-0.5 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-800" />
        )}
      </button>

      {isDetailsOpen && (
        <div className="animate-in slide-in-from-top-2 space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm duration-300 dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              어떤 배경에서 시작한 프로젝트인가요? (Situation)
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
              나의 역할은 무엇이었나요? (Role)
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
              구체적으로 무엇을 실행했나요? (Solution)
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
