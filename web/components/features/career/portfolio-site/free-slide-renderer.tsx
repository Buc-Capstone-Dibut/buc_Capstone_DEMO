"use client";

import { Component, type CSSProperties, type ReactNode } from "react";
import {
  type FreeSlideNode,
  type PortfolioFreeSlide,
  type PortfolioTheme,
} from "@/lib/career-portfolios";

type FreeSlideRendererProps = {
  slide: PortfolioFreeSlide;
  theme: PortfolioTheme;
};

/**
 * AI 자율 슬라이드 트리를 React 트리로 변환해 렌더링한다.
 * - tag 는 normalize 단계에서 화이트리스트 검증됨
 * - className 은 sanitize 단계에서 안전 문자만 통과 (Tailwind 클래스)
 * - style 은 allowlist 키만 통과 (CSSProperties 안전 subset)
 * - text 는 평문으로만 삽입 (React 가 자동 escape → XSS 차단)
 * - children 은 재귀 처리
 *
 * Error 가 발생해도 화면 전체가 깨지지 않게 ErrorBoundary 로 감쌈.
 */
export function FreeSlideRenderer({ slide, theme }: FreeSlideRendererProps) {
  return (
    <FreeSlideErrorBoundary>
      <article
        className="relative h-full w-full overflow-hidden"
        style={{
          backgroundColor: theme.background,
          color: theme.text,
          // CSS 변수로 노출 → AI가 className 에서 var(--portfolio-primary) 등 활용 가능
          ["--portfolio-primary" as string]: theme.primary,
          ["--portfolio-accent" as string]: theme.accent,
          ["--portfolio-surface" as string]: theme.surface,
          ["--portfolio-text" as string]: theme.text,
          ["--portfolio-muted" as string]: theme.muted,
        } as CSSProperties}
        aria-label={slide.intent || "포트폴리오 슬라이드"}
      >
        {renderNode(slide.root, 0)}
      </article>
    </FreeSlideErrorBoundary>
  );
}

function renderNode(node: FreeSlideNode, depth: number): ReactNode {
  if (depth > 10) return null;
  const Tag = node.tag as keyof JSX.IntrinsicElements;
  const props: { className?: string; style?: CSSProperties } = {};
  if (node.className) props.className = node.className;
  if (node.style) props.style = node.style as CSSProperties;

  const childNodes = node.children?.map((child, index) => (
    <RenderedNode key={index} node={child} depth={depth + 1} />
  ));

  // void elements (br, hr) 는 children 못 가짐
  if (node.tag === "br" || node.tag === "hr") {
    return <Tag {...props} />;
  }

  // text + children 동시 허용 (text 가 먼저)
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
// 에러 바운더리 — AI 트리가 깨져도 슬라이드만 fallback 으로 렌더
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
