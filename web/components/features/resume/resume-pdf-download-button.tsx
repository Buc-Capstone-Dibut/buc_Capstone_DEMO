"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

function sanitizeFileName(name: string): string {
  // 파일 이름에 사용 불가한 문자를 제거.
  return name
    .replace(/[\/\\?%*:|"<>]/g, "")
    .trim();
}

export function ResumePdfDownloadButton({
  resumePayload,
  title,
  fileName,
  variant = "outline",
  size = "sm",
  className,
  label = "PDF 다운로드",
  stopPropagation = false,
}: {
  resumePayload: ResumePayload;
  title?: string;
  fileName?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
  stopPropagation?: boolean;
}) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleDownload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (generating) return;
    setGenerating(true);
    try {
      // @react-pdf/renderer는 클라이언트 사이드에서만 사용되도록 동적 import.
      // 이렇게 하면 서버 번들 그래프에서 라이브러리가 빠져 SSR 시 Node-only
      // 모듈을 마주칠 가능성을 줄인다.
      const [{ pdf }, { ResumePdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./resume-pdf-document"),
      ]);
      const blob = await pdf(
        <ResumePdfDocument resume={resumePayload} title={title} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const candidateBase =
        sanitizeFileName(fileName || title || resumePayload.personalInfo?.name || "resume") ||
        "resume";
      a.download = candidateBase.toLowerCase().endsWith(".pdf")
        ? candidateBase
        : `${candidateBase}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // 브라우저가 다운로드를 트리거할 시간을 잠깐 준 뒤 revoke.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("[ResumePdfDownloadButton] PDF 생성 실패", error);
      toast({
        title: "PDF 생성에 실패했습니다.",
        description:
          error instanceof Error
            ? error.message
            : "잠시 후 다시 시도해 주세요. 한국어 폰트 로딩이 지연될 수 있습니다.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={generating}
      className={className}
    >
      {generating ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-1 h-4 w-4" />
      )}
      {generating ? "생성 중..." : label}
    </Button>
  );
}
