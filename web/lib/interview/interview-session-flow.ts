export type InterviewSessionType = "live_interview" | "portfolio_defense";

export function isPendingReportStatus(status: string | null | undefined): boolean {
  return status === "pending" || status === "running";
}

export function shouldRedirectToPortfolioReport(detail: { analysis?: { rubricScores?: unknown } | null } | null | undefined): boolean {
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
