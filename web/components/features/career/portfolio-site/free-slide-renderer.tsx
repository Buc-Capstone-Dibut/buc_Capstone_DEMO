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
 * AI 자율 슬라이드를 안전한 grid 슬롯 위에 렌더한다.
 *
 * 구조:
 *   <article aspect-[16/9] overflow-hidden>
 *     <div [layout.rootClassName]>     ← 우리가 정한 안전 grid
 *       <div [slot[0].className]>      ← min-w-0 min-h-0 overflow-hidden 강제
 *         {renderNode(slide.slots[0])} ← AI 가 만든 자식 트리만 자유
 *       </div>
 *       ... (슬롯 N개)
 *     </div>
 *   </article>
 *
 * - tag 화이트리스트는 normalize 단계에서 검증됨
 * - className 도 normalize 단계에서 위험 클래스 제거됨 (absolute/fixed/큰 사이즈 등)
 * - text 는 평문만 → React 가 자동 escape → XSS 차단
 */
export function FreeSlideRenderer({ slide, theme }: FreeSlideRendererProps) {
  const layout = getFreeSlideLayout(slide.layout);

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
        <div className={layout.rootClassName}>
          {layout.slots.map((slot, index) => {
            const node = slide.slots[index];
            return (
              <div key={slot.key} className={slot.className}>
                {node ? <RenderedNode node={node} depth={0} /> : null}
              </div>
            );
          })}
        </div>
      </article>
    </FreeSlideErrorBoundary>
  );
}

function renderNode(node: FreeSlideNode, depth: number): ReactNode {
  if (depth > 10) return null;
  const Tag = node.tag as keyof JSX.IntrinsicElements;
  // 슬롯 안쪽 자식들에 자동으로 적용되는 안전망:
  //  - depth 0 (슬롯 직속 자식) 컨테이너는 min-w-0 자동 부착 (overflow 방지)
  const safeClassName =
    depth === 0 && node.className
      ? cn("min-w-0", node.className)
      : node.className;

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
// 에러 바운더리 — AI 트리가 깨져도 슬라이드만 fallback
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
