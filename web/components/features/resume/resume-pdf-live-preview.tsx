"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

/**
 * react-pdf 로 실시간 PDF 미리보기를 만든다.
 *
 * - 사용자가 입력하면 600ms 디바운스 후 PDF blob 을 재생성한다.
 * - 생성된 blob URL 을 iframe 에 `#toolbar=0&navpanes=0` 옵션과 함께 임베드 →
 *   PDF.js 도구모음 없이 깔끔한 페이지 미리보기.
 * - PDF 의 페이지 분할/break 규칙이 그대로 화면에 반영되므로, 미리보기에 보이는
 *   페이지 수와 다운로드 PDF 페이지 수가 1:1 일치한다.
 * - aspect-ratio 로 A4 비율 유지, 페이지 다중일 때는 iframe 내부 스크롤로 이동.
 */
export function ResumePdfLivePreview({
  payload,
  title,
  className = "",
}: {
  payload: ResumePayload;
  title?: string;
  className?: string;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  // 입력이 빨라도 PDF 재생성을 디바운스해서 부하 완화 (600ms).
  const [debouncedPayload, setDebouncedPayload] = useState(payload);
  const [debouncedTitle, setDebouncedTitle] = useState(title);
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedPayload(payload);
      setDebouncedTitle(title);
    }, 600);
    return () => clearTimeout(id);
  }, [payload, title]);

  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      setGenerating(true);
      setError(null);
      try {
        // 클라이언트 전용 — Node-only 모듈 회피를 위해 동적 import.
        const [{ pdf }, { ResumePdfDocument }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("./resume-pdf-document"),
        ]);
        const blob = await pdf(
          <ResumePdfDocument resume={debouncedPayload} title={debouncedTitle} />,
        ).toBlob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const previous = lastUrlRef.current;
        lastUrlRef.current = url;
        setPdfUrl(url);
        if (previous) {
          // 이전 blob URL 해제는 새 iframe 이 로드된 뒤가 안전. 한 박자 늦춰서 revoke.
          setTimeout(() => URL.revokeObjectURL(previous), 500);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "미리보기를 생성하지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) setGenerating(false);
      }
    };
    void generate();
    return () => {
      cancelled = true;
    };
  }, [debouncedPayload, debouncedTitle]);

  useEffect(
    () => () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    },
    [],
  );

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 ${className}`}
      style={{ aspectRatio: "794 / 1123" }}
    >
      {pdfUrl ? (
        <iframe
          title={`${debouncedTitle || "이력서"} 미리보기`}
          src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
          className="h-full w-full bg-white"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <p className="inline-flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            미리보기 준비 중…
          </p>
        </div>
      )}
      {generating && pdfUrl ? (
        <div className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          업데이트 중…
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-x-3 bottom-3 rounded-md bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
