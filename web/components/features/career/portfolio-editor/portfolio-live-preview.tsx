"use client";

/**
 * 포트폴리오 라이브 미리보기.
 *
 * 기존 publicSummary.previewPages 의 SVG 스냅샷 방식 (canvas.elements 재구성)
 * 대신 실제 PortfolioSiteRenderer 를 미니 사이즈로 렌더 — 항상 본문과 일치.
 *
 * 동작:
 *   - portfolioId 받으면 API 로 document fetch
 *   - 각 페이지 = 1120×630 디자인의 mini-thumbnail (transform: scale)
 *   - hover → 살짝 떠오르는 효과
 *
 * site 포맷만 지원 — 다른 포맷은 fallback UI.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PortfolioDocument, PortfolioSitePage } from "@/lib/career-portfolios";
import { PortfolioSiteRenderer } from "@/components/features/career/portfolio-site/portfolio-site-renderer";
import { cn } from "@/lib/utils";

const BASE_W = 1120;
const BASE_H = 630;

type Props = {
  portfolioId: string;
  format?: string;
};

export function PortfolioLivePreview({ portfolioId, format }: Props) {
  const [document, setDocument] = useState<PortfolioDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDocument(null);
    (async () => {
      try {
        const response = await fetch(`/api/career/portfolios/${portfolioId}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error(`미리보기를 불러오지 못했어요 (${response.status})`);
        }
        const payload = (await response.json()) as { document?: PortfolioDocument };
        if (cancelled) return;
        if (!payload.document) throw new Error("응답에 document 가 없어요");
        setDocument(payload.document);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portfolioId]);

  if (loading) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
        <Loader2 className="mb-3 h-7 w-7 animate-spin text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">미리보기 불러오는 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/50 text-center">
        <p className="text-sm font-semibold text-red-600">{error}</p>
      </div>
    );
  }

  if (!document) return null;

  if (document.format !== "site") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 text-center">
        <p className="text-sm font-semibold text-slate-500">
          이 형식 ({format || document.format}) 은 라이브 미리보기를 지원하지 않아요
        </p>
        <p className="mt-1.5 text-[12px] text-slate-400">
          편집기에서 직접 확인해주세요
        </p>
      </div>
    );
  }

  const pages = (document.pages || []).filter((p) => p.visible !== false);

  if (!pages.length) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
        <p className="text-sm font-semibold text-slate-500">표시할 페이지가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {pages.map((page, index) => (
        <MiniSlide
          key={page.id || index}
          document={document}
          page={page}
          index={index}
        />
      ))}
    </div>
  );
}

function MiniSlide({
  document,
  page,
  index,
}: {
  document: PortfolioDocument;
  page: PortfolioSitePage;
  index: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  // 컨테이너 너비에 맞춰 transform: scale 자동 계산
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / BASE_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 같은 document 의 다른 페이지를 위한 안정된 reference (메모이즈)
  const documentRef = useMemo(() => document, [document]);

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
      )}
    >
      {/* mini slide canvas */}
      <div
        ref={containerRef}
        className="portfolio-mini-preview relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
        style={{ aspectRatio: "16 / 9" }}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: `${BASE_W}px`,
            height: `${BASE_H}px`,
            transform: `scale(${scale})`,
          }}
        >
          <PortfolioSiteRenderer
            document={documentRef}
            activeIndex={index}
            hideHeader
            hideThumbnails
            disableKeyboardNav
          />
        </div>
        {/* 페이지 번호 배지 */}
        <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-white shadow-sm backdrop-blur">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      {/* 페이지 제목 + 타입 */}
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="truncate text-[12.5px] font-bold text-slate-800">
          {page.title || "(제목 없음)"}
        </p>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {page.type}
        </span>
      </div>
    </div>
  );
}
