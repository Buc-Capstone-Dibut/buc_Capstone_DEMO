"use client";

/**
 * 인라인 PDF 출력 도우미.
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
 *   2. 화면 밖에 PortfolioSiteRenderer 를 autoPrint 로 mount
 *   3. autoPrint 가 print-deck 마운트 + window.print() 호출
 *   4. print 대화상자 닫히면 (afterprint 또는 fallback timeout) onDone 호출 → 부모가 unmount
 *
 * 새 탭 열지 않고 현재 페이지에서 native print 대화상자만 띄움.
 */

import { useEffect, useState } from "react";
import type { PortfolioDocument } from "@/lib/career-portfolios";
import { PortfolioSiteRenderer } from "@/components/features/career/portfolio-site/portfolio-site-renderer";

type Props = {
  portfolioId: string;
  onDone: () => void;
};

export function PortfolioPdfPrinter({ portfolioId, onDone }: Props) {
  const [document, setDocument] = useState<PortfolioDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1) 문서 fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/career/portfolios/${portfolioId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error(`문서를 불러오지 못했어요 (${response.status})`);
        }
        const payload = (await response.json()) as { document?: PortfolioDocument };
        if (cancelled) return;
        if (!payload.document) throw new Error("응답에 document 가 없어요");
        setDocument(payload.document);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
        // 에러 알린 후 잠깐 뒤 종료
        setTimeout(() => onDone(), 1500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portfolioId, onDone]);

  // 2) afterprint 듣고 unmount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      // 약간 지연 후 unmount — 인쇄 직후 React 정리 충돌 방지
      setTimeout(() => onDone(), 100);
    };
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, [onDone]);

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

  if (!document) {
    return (
      <div
        className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-[#d8e4d0] bg-white px-4 py-1.5 text-[12px] font-semibold text-slate-600 shadow-lg"
        aria-live="polite"
      >
        PDF 준비 중…
      </div>
    );
  }

  if (document.format !== "site") {
    return (
      <div
        role="alert"
        className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-[12px] font-semibold text-amber-700 shadow-lg"
      >
        이 포트폴리오는 PDF 출력 지원 형식이 아닙니다 (웹 슬라이드만 지원)
      </div>
    );
  }

  // 3) 화면 밖에서 mount — autoPrint 가 알아서 print-deck mount + window.print()
  // 화면에선 숨김, 인쇄 시 print-deck 만 보이도록 .portfolio-renderer-pdf-host 클래스로 제어.
  // (inline position:fixed; top:-99999px 로 하면 인쇄에서도 -99999px 에 그려져 첫 페이지만
  //  보이는 버그 발생 → CSS @media 로 화면/인쇄 분리)
  return (
    <div className="portfolio-renderer-pdf-host" aria-hidden>
      <PortfolioSiteRenderer
        document={document}
        readonly
        hideHeader
        hideThumbnails
        disableKeyboardNav
        autoPrint
      />
    </div>
  );
}
