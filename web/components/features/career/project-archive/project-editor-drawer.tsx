"use client";

import { X } from "lucide-react";
import type { ProjectInput } from "@/app/career/projects/types";
import { Button } from "@/components/ui/button";
import { ProjectFormPanel } from "./project-form-panel";
import type { ProjectArchiveFormData } from "./project-archive.types";

interface ProjectEditorDrawerProps {
  project: ProjectInput | undefined;
  formData: ProjectArchiveFormData;
  setFormData: (data: ProjectArchiveFormData) => void;
  onClose: () => void;
  onSave: (closeFn: () => void) => Promise<void>;
  isSaving: boolean;
}

export function ProjectEditorDrawer({
  project,
  formData,
  setFormData,
  onClose,
  onSave,
  isSaving,
}: ProjectEditorDrawerProps) {
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-slate-950/35 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label="프로젝트 편집 닫기"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Project Editor
            </p>
            <h2 className="mt-1 line-clamp-2 text-xl font-bold text-slate-900 dark:text-slate-50">
              {project.company || "프로젝트 편집"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ProjectFormPanel formData={formData} setFormData={setFormData} />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-lg px-5"
            disabled={isSaving}
          >
            닫기
          </Button>
          <Button
            onClick={() => void onSave(onClose)}
            className="h-11 rounded-lg px-6 font-bold"
            disabled={isSaving}
          >
            {isSaving ? "저장 중..." : "프로젝트 저장"}
          </Button>
        </div>
      </aside>
    </div>
  );
}
