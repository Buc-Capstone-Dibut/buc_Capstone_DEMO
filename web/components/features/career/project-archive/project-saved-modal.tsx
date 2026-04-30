"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectSavedModalProps {
  onOpenCareerLetters: () => void;
  onClose: () => void;
}

export function ProjectSavedModal({
  onOpenCareerLetters,
  onClose,
}: ProjectSavedModalProps) {
  return (
    <div className="bg-black/45 fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl">
        <div className="px-6 py-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            저장 완료
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            문항 답변이 저장되었습니다.
            <br />
            자소서 관리 탭에서 이어서 열람하고 수정할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t px-6 py-4">
          <Button
            size="lg"
            onClick={onOpenCareerLetters}
            className="h-11 rounded-xl bg-primary font-semibold text-white"
          >
            자소서 관리에서 열람하기
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onClose}
            className="h-10 rounded-xl text-slate-600"
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
