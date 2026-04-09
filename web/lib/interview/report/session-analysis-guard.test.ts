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
    questionFindings: [
      {
        question: "프로젝트에서 맡은 역할은 무엇이었나요?",
        userAnswer: "백엔드 구조를 담당했습니다.",
        strengths: ["질문의 핵심을 바로 짚었습니다."],
        improvements: ["성과 수치를 더 명확히 제시하면 좋습니다."],
        refinedAnswer: "문제 상황과 성과를 먼저 연결해 설명하세요.",
        followUpQuestion: "직접 판단한 장면을 더 설명해주실 수 있나요?",
        evidence: ["백엔드 구조를 담당했습니다."],
        confidence: 81,
      },
    ],
    competencyCoverage: [
      {
        competency: "문제 해결",
        score: 78,
        evidence: "문제 상황과 해결 방향을 비교적 구조적으로 설명했습니다.",
        confidence: 76,
      },
    ],
    jdCoverage: [
      {
        requirement: "WebSocket 경험",
        matched: true,
        evidence: "실시간 처리 경험을 설명했습니다.",
        confidence: 72,
      },
    ],
    summary: "요약",
  });

  assert.ok(payload);
  assert.equal(payload?.evaluation.logic, 84);
  assert.equal(payload?.feedback.strengths[0], "구조적인 답변");
  assert.equal(payload?.habits[0]?.severity, "medium");
  assert.equal(payload?.summary, "요약");
  assert.equal(payload?.questionFindings?.[0]?.confidence, 81);
  assert.equal(payload?.competencyCoverage?.[0]?.competency, "문제 해결");
  assert.equal(payload?.jdCoverage?.[0]?.matched, true);
});
