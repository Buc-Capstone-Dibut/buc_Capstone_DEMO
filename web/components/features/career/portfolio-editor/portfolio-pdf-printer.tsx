"use client";

/**
 * 슬라이드형 포트폴리오 PDF 다운로드 도우미.
 *
 * 사용법:
 *   const [printingId, setPrintingId] = useState<string | null>(null);
 *   ...
 *   <button onClick={() => setPrintingId(portfolio.id)}>PDF</button>
 *   {printingId ? (
 *     <PortfolioPdfPrinter portfolioId={printingId} onDone={() => setPrintingId(null)} />
 *   ) : null}
 *
 * 동작:
 *   1. portfolioId 받으면 API 로 document fetch
 *   2. 화면 밖에 모든 슬라이드를 1120×630 으로 mount
 *   3. html2canvas-pro 로 슬라이드별 캡쳐 → jsPDF 16:9 페이지로 합침
 *   4. <a download> 로 파일 저장 → onDone
 *
 * 이전엔 window.print() 인쇄 대화상자 방식이라 Chrome 다운로드 표시줄에 안 떴다.
 * 이력서 PDF 와 같은 스냅샷 방식으로 바꿔 실제 파일 다운로드로 처리한다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { PortfolioDocument } from "@/lib/career-portfolios";
import { PortfolioSiteRenderer } from "@/components/features/career/portfolio-site/portfolio-site-renderer";

type Props = {
  portfolioId: string;
  onDone: () => void;
  onProgress?: (percent: number) => void;
};

const SLIDE_W_PX = 1120;
const SLIDE_H_PX = 630;
const PAGE_W_MM = 297;
const PAGE_H_MM = 167; // 16:9

function sanitizeFileName(name: string): string {
  return name.replace(/[\/\\?%*:|"<>]/g, "").trim();
}

export function PortfolioPdfPrinter({ portfolioId, onDone, onProgress }: Props) {
  const [document, setDocument] = useState<PortfolioDocument | null>(null);
  const [title, setTitle] = useState("portfolio");
  const [error, setError] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  // 부모 리렌더마다 콜백이 새로 만들어져도 fetch/캡쳐가 재시작되지 않게 ref 로 보관.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const reportProgress = (percent: number) => {
    onProgressRef.current?.(Math.max(0, Math.min(99, Math.round(percent))));
  };

  // 1) 문서 fetch
  useEffect(() => {
    let cancelled = false;
    reportProgress(10);
    (async () => {
      try {
        const response = await fetch(`/api/career/portfolios/${portfolioId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error(`문서를 불러오지 못했어요 (${response.status})`);
        }
        const payload = (await response.json()) as {
          document?: PortfolioDocument;
          item?: { title?: string };
        };
        if (cancelled) return;
        if (!payload.document) throw new Error("응답에 document 가 없어요");
        if (payload.item?.title) setTitle(payload.item.title);
        reportProgress(16);
        setDocument(payload.document);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
        // 에러 알린 후 잠깐 뒤 종료
        setTimeout(() => onDoneRef.current(), 1500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portfolioId]);

  const slideCount = useMemo(() => {
    if (!document) return 0;
    return document.pages?.length
      ? document.pages.filter((p) => p.visible !== false).length
      : document.sections.length;
  }, [document]);

  // 2) 슬라이드 mount 후 캡쳐 → PDF 저장
  useEffect(() => {
    if (!document || document.format !== "site" || slideCount === 0) return;
    let cancelled = false;
    (async () => {
      try {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        try {
          await window.document.fonts?.ready;
        } catch {
          /* fonts API 없을 수도 — 무시 */
        }
        const host = hostRef.current;
        if (cancelled || !host) return;

        const imgs = Array.from(host.querySelectorAll("img"));
        await Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.addEventListener("load", () => resolve(), { once: true });
                  img.addEventListener("error", () => resolve(), { once: true });
                }),
          ),
        );

        const slides = Array.from(
          host.querySelectorAll<HTMLElement>(".portfolio-renderer-canvas > *"),
        );
        if (slides.length === 0) throw new Error("캡쳐할 슬라이드가 없어요");
        reportProgress(20);

        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
          import("html2canvas-pro"),
          import("jspdf"),
        ]);
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: [PAGE_W_MM, PAGE_H_MM],
          compress: true,
        });
        for (let i = 0; i < slides.length; i++) {
          const canvas = await html2canvas(slides[i], {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
            width: SLIDE_W_PX,
            height: SLIDE_H_PX,
          });
          if (cancelled) return;
          if (i > 0) pdf.addPage([PAGE_W_MM, PAGE_H_MM], "landscape");
          pdf.addImage(
            canvas.toDataURL("image/jpeg", 0.95),
            "JPEG",
            0,
            0,
            PAGE_W_MM,
            PAGE_H_MM,
            undefined,
            "FAST",
          );
          reportProgress(20 + ((i + 1) / slides.length) * 76);
        }
        reportProgress(98);
        pdf.setProperties({ title });

        const url = URL.createObjectURL(pdf.output("blob"));
        const a = window.document.createElement("a");
        a.href = url;
        a.download = `${sanitizeFileName(title) || "portfolio"}.pdf`;
        window.document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        onDoneRef.current();
      } catch (e) {
        if (cancelled) return;
        console.error("[PortfolioPdfPrinter] PDF 생성 실패", e);
        setError(e instanceof Error ? e.message : "PDF 생성 실패");
        setTimeout(() => onDoneRef.current(), 1500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [document, slideCount, title]);

  if (error) {
    return (
      <div
        role="alert"
        className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-red-200 bg-white px-4 py-2 text-[12px] font-semibold text-red-600 shadow-lg"
      >
        PDF 출력 실패: {error}
      </div>
    );
  }

  if (document && document.format !== "site") {
    return (
      <div
        role="alert"
        className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-[12px] font-semibold text-amber-700 shadow-lg"
      >
        이 포트폴리오는 PDF 출력 지원 형식이 아닙니다 (슬라이드형만 지원)
      </div>
    );
  }

  return (
    <>
      {/* 3) 화면 밖 캡쳐용 — 슬라이드마다 1120×630 고정 크기로 렌더 */}
      {document ? (
        <div ref={hostRef} className="portfolio-pdf-snapshot-host" aria-hidden>
          {Array.from({ length: slideCount }, (_, i) => (
            <PortfolioSiteRenderer
              key={i}
              document={document}
              activeIndex={i}
              readonly
              hideHeader
              hideThumbnails
              disableKeyboardNav
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
