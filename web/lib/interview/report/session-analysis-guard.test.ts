import assert from "node:assert/strict";
import test from "node:test";

import { coerceSessionAnalysisPayload } from "@/lib/interview/report/session-analysis-guard";

test("coerceSessionAnalysisPayload returns null for empty payload", () => {
  assert.equal(coerceSessionAnalysisPayload({}), null);
});

test("coerceSessionAnalysisPayload normalizes valid interview analysis", () => {
  const payload = coerceSessionAnalysisPayload({
    overallScore: 82,
    passProbability: 77,
    evaluation: {
      jobFit: 80,
      logic: 84,
      communication: 78,
      attitude: 86,
    },
    feedback: {
      strengths: ["구조적인 답변"],
      improvements: ["지표 보강"],
    },
    habits: [{ habit: "음", count: 2, severity: "medium" }],
    bestPractices: [
      {
        question: "질문",
        userAnswer: "답변",
        refinedAnswer: "보완 답변",
        reason: "이유",
      },
    ],
    summary: "요약",
  });

  assert.ok(payload);
  assert.equal(payload?.evaluation.logic, 84);
  assert.equal(payload?.feedback.strengths[0], "구조적인 답변");
  assert.equal(payload?.habits[0]?.severity, "medium");
  assert.equal(payload?.summary, "요약");
});
