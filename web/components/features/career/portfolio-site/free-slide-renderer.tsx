"use client";

import { Component, type CSSProperties, type ReactNode } from "react";
import {
  getFreeSlideLayout,
  type FreeSlideNode,
  type PortfolioFreeSlide,
  type PortfolioTheme,
} from "@/lib/career-portfolios";
import { cn } from "@/lib/utils";

type FreeSlideRendererProps = {
  slide: PortfolioFreeSlide;
  theme: PortfolioTheme;
};

/**
 * AI 자율 슬라이드 렌더러 — html 우선, 구버전 slots 폴백 지원.
 *
 * - html: AI 가 작성한 HTML 문자열. 서버에서 sanitizeAiHtml 로 정제됨.
 *   클라이언트에서는 dangerouslySetInnerHTML 로 그대로 삽입.
 *   외곽 컨테이너에 aspect-[16/9] + overflow-hidden 강제로 화면 벗어남 방지.
 * - slots: 구버전(슬롯 기반 트리). html 이 비어 있을 때만 사용.
 */
export function FreeSlideRenderer({ slide, theme }: FreeSlideRendererProps) {
  return (
    <FreeSlideErrorBoundary>
      <article
        className="relative h-full w-full overflow-hidden"
        style={
          {
            backgroundColor: theme.background,
            color: theme.text,
            ["--portfolio-primary" as string]: theme.primary,
            ["--portfolio-accent" as string]: theme.accent,
            ["--portfolio-surface" as string]: theme.surface,
            ["--portfolio-text" as string]: theme.text,
            ["--portfolio-muted" as string]: theme.muted,
          } as CSSProperties
        }
        aria-label={slide.intent || "포트폴리오 슬라이드"}
      >
        {slide.html ? (
          <div
            className="h-full w-full overflow-hidden"
            // sanitize 는 서버 normalize 단계에서 끝남
            dangerouslySetInnerHTML={{ __html: slide.html }}
          />
        ) : slide.slots && slide.slots.length ? (
          <LegacySlotRenderer slide={slide} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500">
            슬라이드 내용이 비어 있습니다.
          </div>
        )}
      </article>
    </FreeSlideErrorBoundary>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 구버전 — 슬롯 트리 기반 렌더 (호환 유지)
// ──────────────────────────────────────────────────────────────────────────────

function LegacySlotRenderer({ slide }: { slide: PortfolioFreeSlide }) {
  const layout = getFreeSlideLayout(slide.layout);
  return (
    <div className={layout.rootClassName}>
      {layout.slots.map((slot, index) => {
        const node = slide.slots?.[index];
        return (
          <div key={slot.key} className={slot.className}>
            {node ? <RenderedNode node={node} depth={0} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function renderNode(node: FreeSlideNode, depth: number): ReactNode {
  if (depth > 10) return null;
  const Tag = node.tag as keyof JSX.IntrinsicElements;
  const safeClassName =
    depth === 0 && node.className ? cn("min-w-0", node.className) : node.className;

  const props: { className?: string; style?: CSSProperties } = {};
  if (safeClassName) props.className = safeClassName;
  if (node.style) props.style = node.style as CSSProperties;

  if (node.tag === "br" || node.tag === "hr") {
    return <Tag {...props} />;
  }

  const childNodes = node.children?.map((child, index) => (
    <RenderedNode key={index} node={child} depth={depth + 1} />
  ));

  return (
    <Tag {...props}>
      {node.text}
      {childNodes}
    </Tag>
  );
}

function RenderedNode({ node, depth }: { node: FreeSlideNode; depth: number }) {
  return <>{renderNode(node, depth)}</>;
}

// ──────────────────────────────────────────────────────────────────────────────
// 에러 바운더리 — 깨져도 슬라이드만 fallback
// ──────────────────────────────────────────────────────────────────────────────

class FreeSlideErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.warn("[FreeSlideRenderer] slide render failed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <article className="flex h-full w-full items-center justify-center bg-slate-50 px-8 py-12 text-slate-600">
          <div className="max-w-md text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              슬라이드 렌더링 실패
            </p>
            <p className="mt-3 text-base font-bold text-slate-700">
              이 슬라이드를 표시하는 중에 문제가 생겼어요.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-500">
              다음 페이지로 넘기거나 다시 생성해주세요.
            </p>
          </div>
        </article>
      );
    }
    return this.props.children;
  }
}
