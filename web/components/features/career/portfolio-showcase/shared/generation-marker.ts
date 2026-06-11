/**
 * showcase 포트폴리오의 백그라운드 생성 상태 마커.
 *
 * showcase_portfolios 테이블에는 상태 컬럼이 없어서 content_payload 안의
 * `_generation` 메타 필드로 추적한다. 템플릿 콘텐츠 zod 스키마가 unknown key 를
 * strip 하므로 에디터/렌더러에는 절대 노출되지 않고, 위저드가 저장(PUT)하면
 * 자연스럽게 사라진다(완료 후에만 저장 가능하므로 안전).
 */

export type ShowcaseGenerationStatus = "pending" | "running" | "completed" | "failed";

export type ShowcaseGenerationMarker = {
  status: ShowcaseGenerationStatus;
  /** AI 채움에 쓸 프로젝트 스냅샷 ID 들 (생성 시점에 저장) */
  projectIds?: string[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

export function readShowcaseGenerationMarker(
  contentPayload: unknown,
): ShowcaseGenerationMarker | null {
  if (!contentPayload || typeof contentPayload !== "object") return null;
  const raw = (contentPayload as Record<string, unknown>)._generation;
  if (!raw || typeof raw !== "object") return null;
  const marker = raw as Record<string, unknown>;
  const status = marker.status;
  if (
    status !== "pending" &&
    status !== "running" &&
    status !== "completed" &&
    status !== "failed"
  ) {
    return null;
  }
  return {
    status,
    projectIds: Array.isArray(marker.projectIds)
      ? marker.projectIds.filter((v): v is string => typeof v === "string")
      : undefined,
    startedAt: typeof marker.startedAt === "string" ? marker.startedAt : undefined,
    finishedAt: typeof marker.finishedAt === "string" ? marker.finishedAt : undefined,
    error: typeof marker.error === "string" ? marker.error : undefined,
  };
}
