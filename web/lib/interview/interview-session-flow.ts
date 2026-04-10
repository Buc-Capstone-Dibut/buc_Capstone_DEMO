export type InterviewSessionType = "live_interview" | "portfolio_defense";

export function isPendingReportStatus(status: string | null | undefined): boolean {
  return status === "pending" || status === "running";
}

export function hasRenderableInterviewReport(detail: {
  analysis?: unknown;
  report_view?: unknown;
  timeline?: unknown[] | null;
} | null | undefined): boolean {
  if (detail?.report_view) return true;
  if (Array.isArray(detail?.timeline) && detail.timeline.length > 0) return true;
  return Boolean(detail?.analysis);
}

export function hasStructuredInterviewReport(detail: {
  analysis?: unknown;
  report_view?: unknown;
} | null | undefined): boolean {
  return Boolean(detail?.report_view || detail?.analysis);
}

export function shouldWaitForInterviewReport(detail: {
  reportStatus?: string | null;
  analysis?: unknown;
  report_view?: unknown;
  timeline?: unknown[] | null;
} | null | undefined): boolean {
  return isPendingReportStatus(detail?.reportStatus) && !hasRenderableInterviewReport(detail);
}

export function shouldPollForInterviewReport(detail: {
  reportStatus?: string | null;
  analysis?: unknown;
  report_view?: unknown;
} | null | undefined): boolean {
  return isPendingReportStatus(detail?.reportStatus) && !hasStructuredInterviewReport(detail);
}

export function shouldRecoverInterruptedInterviewReport(detail: {
  status?: string | null;
  reportStatus?: string | null;
  analysis?: unknown;
  report_view?: unknown;
  timeline?: unknown[] | null;
} | null | undefined): boolean {
  const status = String(detail?.status || "").trim();
  if (!status || status === "completed" || status === "failed") return false;
  if (isPendingReportStatus(detail?.reportStatus)) return false;
  return hasRenderableInterviewReport(detail);
}

export function shouldRedirectToPortfolioReport(detail: {
  session_type?: string | null;
  report_view?: { sessionType?: string | null } | null;
  analysis?: { rubricScores?: unknown } | null;
} | null | undefined): boolean {
  if (detail?.session_type === "portfolio_defense") return true;
  if (detail?.report_view?.sessionType === "portfolio_defense") return true;
  return Boolean(detail?.analysis?.rubricScores);
}

export function buildInterviewResultPath(
  sessionType: InterviewSessionType,
  durationMinutes: 5 | 10 | 15,
  sessionId: string,
): string {
  if (sessionType === "portfolio_defense") {
    return `/interview/training/portfolio/report?id=${encodeURIComponent(sessionId)}`;
  }

  const params = new URLSearchParams({
    duration: String(durationMinutes),
  });
  params.set("id", sessionId);
  return `/interview/result?${params.toString()}`;
}

export function shouldRouteToSetupOnReconnectTimeout(
  isReconnecting: boolean,
  reconnectRemainingSec: number,
): boolean {
  return isReconnecting && reconnectRemainingSec <= 0;
}
