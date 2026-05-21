/**
 * 모든 렌더러가 공유하는 데이터 추출 유틸 + 타입.
 * 시각 디자인은 각 렌더러마다 다르지만, *어떤 데이터를 어떤 페이지에서 보여줄지*는 동일.
 */

import type {
  PortfolioSiteBlock,
  PortfolioSitePage,
  PortfolioSitePageType,
} from "@/lib/career-portfolios";

export type RendererProps = {
  document: import("@/lib/career-portfolios").PortfolioDocument;
  className?: string;
  /** 외부에서 활성 페이지 제어 (편집기 사이드바와 동기화) */
  activeIndex?: number;
  onActiveIndexChange?: (next: number) => void;
  /** chrome 옵션 (편집기에서 헤더/썸네일 대체할 때) */
  hideHeader?: boolean;
  hideThumbnails?: boolean;
  /** input 포커스 충돌 방지 */
  disableKeyboardNav?: boolean;
  /** 편집기에선 숨김 페이지도 표시 */
  includeHiddenPages?: boolean;
};

export const PAGE_LABEL: Record<PortfolioSitePageType, string> = {
  cover: "표지",
  profile: "프로필",
  skills: "기술",
  "project-index": "목차",
  "case-study": "케이스",
  "project-detail": "상세",
  experience: "경력",
  retrospective: "성장",
  contact: "연락처",
};

export const ROLE_LABEL: Record<string, string> = {
  headline: "핵심",
  summary: "요약",
  problem: "문제",
  role: "역할",
  solution: "해결",
  result: "결과",
  lesson: "배운 점",
  impact: "임팩트",
  decision: "판단",
  evidence: "근거",
  next: "다음",
  body: "본문",
};

// ──────────────────────────────────────────────────────────────────────────────
// 텍스트 자르기 / 정리
// ──────────────────────────────────────────────────────────────────────────────

export function plainText(value?: string, max = 280) {
  const normalized = (value || "").replace(/[ \t]+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}...`;
}

export function multilineText(value?: string, max = 360) {
  const normalized = (value || "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}...`;
}

// ──────────────────────────────────────────────────────────────────────────────
// 페이지에서 블록 데이터 추출
// ──────────────────────────────────────────────────────────────────────────────

export function textBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "text" && block.content?.trim());
}

export function tagBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "tags" && block.items?.length);
}

export function metricBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "metric");
}

export function timelineBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "timeline" && block.items?.length);
}

export function flowBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "flow" && block.items?.length);
}

export function matrixBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "matrix" && block.items?.length);
}

export function contributionBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "contribution");
}

export function calloutBlocks(page: PortfolioSitePage) {
  return page.blocks.filter((block) => block.type === "callout" && block.content?.trim());
}

export function getBlockLabel(block: PortfolioSiteBlock, fallback = "") {
  return block.label || (block.role ? ROLE_LABEL[block.role] : "") || fallback;
}

export function blockText(block: PortfolioSiteBlock, max = 240) {
  return multilineText(block.content || block.caption || block.value, max);
}

export function pageNarrative(page: PortfolioSitePage, max = 260) {
  return multilineText(
    page.narrative ||
      textBlocks(page)[0]?.content ||
      page.subtitle ||
      page.intent ||
      page.title,
    max,
  );
}

export function pageEmphasis(page: PortfolioSitePage) {
  const explicit = page.emphasis?.filter(Boolean) || [];
  if (explicit.length) return explicit.slice(0, 6);
  return tagBlocks(page)[0]?.items?.slice(0, 6) || [];
}

export function flowItems(page: PortfolioSitePage) {
  const blockItems = flowBlocks(page)[0]?.items?.filter(Boolean) || [];
  if (blockItems.length >= 3) return blockItems.slice(0, 5);
  const tags = pageEmphasis(page);
  return tags.length >= 3 ? tags.slice(0, 5) : ["문제", "역할", "해결", "결과"];
}

export function matrixItems(page: PortfolioSitePage) {
  const blockItems = matrixBlocks(page)[0]?.items?.filter(Boolean) || [];
  if (blockItems.length) return blockItems.slice(0, 10);
  return pageEmphasis(page).slice(0, 10);
}

export function timelineItems(page: PortfolioSitePage) {
  const blockItems = timelineBlocks(page)[0]?.items?.filter(Boolean) || [];
  if (blockItems.length) return blockItems.slice(0, 6);
  return flowItems(page).slice(0, 6);
}
