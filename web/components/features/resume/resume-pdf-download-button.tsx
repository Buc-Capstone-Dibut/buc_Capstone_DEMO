"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import type { ResumeA4Options } from "./KoreanResumePreview";

function sanitizeFileName(name: string): string {
  // 파일 이름에 사용 불가한 문자를 제거.
  return name.replace(/[\/\\?%*:|"<>]/g, "").trim();
}

/**
 * 이력서 PDF 다운로드 버튼.
 *
 * 구현 방식: HTML 미리보기 그 자체(KoreanResumeSnapshotDocument) 를 화면 밖에 렌더 →
 * html2canvas-pro 로 각 A4 페이지 스냅샷 → jsPDF 로 PDF Blob 생성.
 *
 * 장점: 화면 미리보기 = PDF 완벽 동일. 로고·폰트·레이아웃 모두 보존.
 * 단점: 텍스트 검색·복사 불가 (이미지 기반).
 *
 * `openInNewTab` 이 true 면 다운로드와 동시에 생성된 PDF 를 새 탭으로도 띄운다.
 */
export function ResumePdfDownloadButton({
  resumePayload,
  resumeOptions,
  title,
  fileName,
  variant = "outline",
  size = "sm",
  className,
  label = "PDF 다운로드",
  stopPropagation = false,
  openInNewTab = false,
  iconLeft,
}: {
  resumePayload: ResumePayload;
  resumeOptions?: ResumeA4Options;
  title?: string;
  fileName?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
  stopPropagation?: boolean;
  /** true 면 다운로드와 동시에 생성된 PDF 를 새 탭으로도 연다. */
  openInNewTab?: boolean;
  /** 좌측 아이콘 커스터마이즈. 미지정 시 Download 아이콘. */
  iconLeft?: React.ReactNode;
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
      // 모두 클라이언트 전용. 동적 import 로 서버 번들에서 분리.
      const [
        { snapshotReactTreeToPdf },
        { KoreanResumeSnapshotDocument },
        { preloadLogosForLabels },
      ] = await Promise.all([
        import("@/lib/resume/snapshot-pdf"),
        import("./KoreanResumePreview"),
        import("@/lib/interview/tech-logo-preload"),
      ]);

      const documentTitle =
        title?.trim() ||
        (resumePayload.personalInfo?.name
          ? `${resumePayload.personalInfo.name} 이력서`
          : "이력서");

      // 기술 스택 로고(SVG) 를 미리 base64 data URI 로 fetch 해두고 snapshot 에
      // 인라인으로 박는다. 이렇게 하면 off-screen 렌더 직후 html2canvas 가 캡쳐할 때
      // 외부 SVG 로딩 race 가 없어 로고가 안 뜨는 문제가 사라진다.
      const skillLabels = (resumePayload.skills || []).map((s) => s.name);
      const logoUriByLabel = await preloadLogosForLabels(skillLabels);

      const blob = await snapshotReactTreeToPdf(
        () => (
          <KoreanResumeSnapshotDocument
            payload={resumePayload}
            title={title}
            options={resumeOptions}
            logoUriByLabel={logoUriByLabel}
          />
        ),
        { title: documentTitle, scale: 2 },
      );

      const url = URL.createObjectURL(blob);
      const candidateBase =
        sanitizeFileName(
          fileName || title || resumePayload.personalInfo?.name || "resume",
        ) || "resume";
      const downloadName = candidateBase.toLowerCase().endsWith(".pdf")
        ? candidateBase
        : `${candidateBase}.pdf`;

      // 1) 다운로드 트리거 — 사용자에게 즉시 저장.
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // 2) 다운로드가 시작될 시간 한 frame 정도 양보한 뒤 새 탭으로 PDF 뷰어 열기.
      //    팝업 차단 으로 막힐 경우 toast 의 "열기" 버튼으로 fallback.
      if (openInNewTab) {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const opened = window.open(url, "_blank");
        if (!opened || opened.closed) {
          toast({
            title: "PDF 가 저장됐어요",
            description:
              "새 탭 열기가 차단됐습니다. 아래 버튼으로 직접 열 수 있어요.",
            action: (
              <button
                type="button"
                onClick={() => window.open(url, "_blank")}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent"
              >
                새 탭에서 PDF 열기
              </button>
            ),
          });
        }
      }

      // 새 탭의 PDF 뷰어가 blob 을 충분히 읽도록 대기 후 revoke.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error("[ResumePdfDownloadButton] PDF 생성 실패", error);
      toast({
        title: "PDF 생성에 실패했습니다.",
        description:
          error instanceof Error
            ? error.message
            : "잠시 후 다시 시도해 주세요.",
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
        iconLeft ?? <Download className="mr-1 h-4 w-4" />
      )}
      {generating ? "생성 중..." : label}
    </Button>
  );
}
