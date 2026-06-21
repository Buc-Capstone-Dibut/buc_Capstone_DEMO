"use client";

import type { PortfolioDocument } from "@/lib/career-portfolios";
import { PortfolioSiteRenderer } from "@/components/features/career/portfolio-site/portfolio-site-renderer";
import { PortfolioRenderer } from "@/components/features/career/portfolio-editor/portfolio-renderer";

export function PortfolioPrintClient({
  document,
}: {
  document: PortfolioDocument;
}) {
  if (document.format === "site") {
    return (
      <>
        {/* 작은 안내 — 인쇄 시 CSS 가 자동으로 숨김 (visibility hidden) */}
        <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-[#d8e4d0] bg-white/95 px-4 py-1.5 text-[11.5px] font-semibold text-slate-600 shadow-md backdrop-blur">
          잠시 후 인쇄 대화상자가 열립니다 — 대상에서 <b className="text-primary">PDF로 저장</b> 선택
        </div>
        <PortfolioSiteRenderer
          document={document}
          readonly
          hideHeader
          hideThumbnails
          disableKeyboardNav
          autoPrint
        />
      </>
    );
  }

  // site 형식이 아니면 legacy renderer — PDF 미지원, 안내 UI
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-10 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-[15px] font-bold text-slate-900">
          이 포트폴리오는 PDF 출력 지원 형식이 아닙니다
        </p>
        <p className="mt-2 text-[13px] font-medium leading-7 text-slate-500">
          슬라이드형 포트폴리오만 PDF 로 출력할 수 있어요.
        </p>
        <PortfolioRenderer document={document} readonly />
      </div>
    </main>
  );
}
