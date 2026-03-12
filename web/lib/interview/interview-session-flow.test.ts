import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInterviewResultPath,
  isPendingReportStatus,
  shouldRedirectToPortfolioReport,
  shouldRouteToSetupOnReconnectTimeout,
} from "@/lib/interview/interview-session-flow";

test("isPendingReportStatus matches pending and running only", () => {
  assert.equal(isPendingReportStatus("pending"), true);
  assert.equal(isPendingReportStatus("running"), true);
  assert.equal(isPendingReportStatus("done"), false);
  assert.equal(isPendingReportStatus("failed"), false);
  assert.equal(isPendingReportStatus(undefined), false);
});

test("shouldRedirectToPortfolioReport checks rubricScores presence", () => {
  assert.equal(shouldRedirectToPortfolioReport({ analysis: { rubricScores: { design_intent: 88 } } }), true);
  assert.equal(shouldRedirectToPortfolioReport({ analysis: {} }), false);
  assert.equal(shouldRedirectToPortfolioReport(null), false);
});

test("buildInterviewResultPath builds route by session type", () => {
  assert.equal(
    buildInterviewResultPath("live_interview", 10, "session-1"),
    "/interview/result?duration=10&id=session-1",
  );
  assert.equal(
    buildInterviewResultPath("portfolio_defense", 15, "session-2"),
    "/interview/training/portfolio/report?id=session-2",
  );
});

test("reconnect timeout helper only routes after grace period expires", () => {
  assert.equal(shouldRouteToSetupOnReconnectTimeout(true, 0), true);
  assert.equal(shouldRouteToSetupOnReconnectTimeout(true, 5), false);
  assert.equal(shouldRouteToSetupOnReconnectTimeout(false, 0), false);
});
