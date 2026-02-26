"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Loader2 } from "lucide-react";
import type { PublicResumeSummary, ResumePayload } from "../profile-types";
import { ResumeEditor } from "./resume-editor";

interface ResumeTabProps {
  isOwner: boolean;
  loading?: boolean;
  error?: string;
  resumePayload: ResumePayload;
  onChangeResumePayload: (payload: ResumePayload) => void;
  onSaveResume: () => void;
  saving: boolean;
  onGoSetup: () => void;
  resumeSummary: PublicResumeSummary | null;
}

export function ResumeTab({
  isOwner,
  loading,
  error,
  resumePayload,
  onChangeResumePayload,
  onSaveResume,
  saving,
  onGoSetup,
  resumeSummary,
}: ResumeTabProps) {
  if (isOwner) {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          이력서를 불러오는 중...
        </div>
      );
    }

    if (error) {
      return <p className="text-sm text-red-500 py-10 text-center">{error}</p>;
    }

    return (
      <ResumeEditor
        payload={resumePayload}
        onChange={onChangeResumePayload}
        onSave={onSaveResume}
        saving={saving}
        onGoSetup={onGoSetup}
      />
    );
  }

  return (
    <div className="rounded-xl border bg-card px-5 py-6 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">공개 이력서</span>
        <Badge className="text-[10px] h-5 px-1.5 bg-primary/10 text-primary border-0">
          면접 setup에 사용됨
        </Badge>
      </div>
      <Separator />
      <div className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">한 줄 소개</p>
        <p className="font-medium">{resumeSummary?.headline || "—"}</p>
        <p className="text-xs text-muted-foreground pt-2">핵심 스킬</p>
        <p>{(resumeSummary?.topSkills || []).join(", ") || "—"}</p>
      </div>
    </div>
  );
}
