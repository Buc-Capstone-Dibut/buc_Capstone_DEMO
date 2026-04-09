import assert from "node:assert/strict";
import test from "node:test";

import { buildSessionInterviewReportModel } from "@/lib/interview/report/session-interview-report-adapter";
import type { AnalysisResult } from "@/store/interview-setup-store";

type SessionAnalysisFixture = AnalysisResult & {
  summary?: string;
  fitSummary?: string;
  nextActions?: string[];
  strengths?: string[];
  improvements?: string[];
};

test("session interview adapter prefers report view fields over fallback analysis", () => {
  const analysis: SessionAnalysisFixture = {
    evaluation: {
      logic: 82,
      communication: 76,
      jobFit: 79,
      attitude: 74,
    },
    overallScore: 81,
    passProbability: 73,
    sentimentTimeline: [0.6, 0.7, 0.74],
    feedback: {
      strengths: ["분석 fallback 강점"],
      improvements: ["분석 fallback 개선"],
    },
    bestPractices: [
      {
        question: "최근 프로젝트에서 맡은 역할을 설명해주세요.",
        userAnswer: "백엔드 구조를 개선했습니다.",
        refinedAnswer: "문제, 역할, 결과 순으로 더 구조화해 말하세요.",
        reason: "직무 연결성이 좋았습니다.",
      },
    ],
    habits: [
      { habit: "음", count: 2, severity: "low" },
    ],
    summary: "분석 요약",
    fitSummary: "분석 적합도",
    nextActions: ["분석 next action"],
    strengths: ["분석 강점"],
    improvements: ["분석 개선"],
  };

  const model = buildSessionInterviewReportModel({
    analysis,
    reportView: {
      company: "Dibut",
      role: "Backend Engineer",
      summary: "리포트 요약 우선",
      strengths: ["리포트 강점 1", "리포트 강점 2"],
      improvements: ["리포트 개선 1"],
      nextActions: ["리포트 액션 1"],
    },
    session: {
      company: "Fallback Company",
      role: "Fallback Role",
      createdAt: 1710000000,
      originalUrl: "https://example.com/job/123",
    },
  });

  assert.equal(model.summary, "리포트 요약 우선");
  assert.deepEqual(model.strengths, ["리포트 강점 1", "리포트 강점 2"]);
  assert.deepEqual(model.weaknesses, ["리포트 개선 1"]);
  assert.deepEqual(model.nextActions, ["리포트 액션 1"]);
  assert.equal(model.metaItems[0]?.value, "Backend Engineer");
  assert.equal(model.metaItems[1]?.href, "https://example.com/job/123");
});

test("session interview adapter falls back to analysis and feedback when report view is sparse", () => {
  const analysis: SessionAnalysisFixture = {
    evaluation: {
      logic: 68,
      communication: 64,
      jobFit: 70,
      attitude: 72,
    },
    overallScore: 70,
    passProbability: 58,
    sentimentTimeline: [0.45, 0.56, 0.61],
    feedback: {
      strengths: ["feedback 강점"],
      improvements: ["feedback 개선"],
    },
    bestPractices: [
      {
        question: "성능 개선 경험을 설명해주세요.",
        userAnswer: "캐시 전략을 바꿨습니다.",
        refinedAnswer: "지표와 결과까지 붙여 설명하세요.",
        reason: "핵심 구조는 좋았습니다.",
      },
    ],
    habits: [],
    fitSummary: "",
    nextActions: [],
    strengths: [],
    improvements: [],
  };

  const model = buildSessionInterviewReportModel({
    analysis,
    reportView: {
      company: "Dibut",
      role: "Platform Engineer",
    },
    session: {
      company: "Dibut",
      role: "Platform Engineer",
      createdAt: 1710000000,
    },
  });

  assert.equal(model.strengths[0], "feedback 강점");
  assert.equal(model.weaknesses[0], "feedback 개선");
  assert.equal(model.questionHighlights.length, 1);
  assert.equal(model.questionHighlights[0]?.title, "성능 개선 경험을 설명해주세요.");
  assert.equal(model.footerActions[0]?.href, "/interview/analysis");
});

test("session interview adapter builds summary-only report when analysis is missing", () => {
  const model = buildSessionInterviewReportModel({
    analysis: null,
    reportView: {
      sessionType: "live_interview",
      analysisMode: "summary",
      company: "Dibut",
      role: "Backend Engineer",
      summary: "질문 흐름 중심의 요약 리포트입니다.",
      strengths: ["구조적인 답변 흐름"],
      improvements: ["성과 수치를 더 또렷하게 제시하기"],
      nextActions: ["프로젝트 답변을 STAR 형식으로 다시 정리하기"],
    },
    session: {
      company: "Dibut",
      role: "Backend Engineer",
      createdAt: 1710000000,
      schemaVersion: "v2",
      reportGenerationMeta: {
        questionCount: 4,
        turnCount: 8,
        analysisMode: "summary",
      },
    },
  });

  assert.equal(model.analysisMode, "summary");
  assert.equal(model.isFallback, true);
  assert.equal(model.typeName, "요약 리포트");
  assert.equal(model.summary, "질문 흐름 중심의 요약 리포트입니다.");
  assert.equal(model.heroMetrics[0]?.value, "4개");
  assert.equal(model.heroMetrics[1]?.value, "8턴");
  assert.equal(model.heroMetrics[2]?.value, "요약 리포트");
  assert.equal(model.questionHighlights.length, 0);
  assert.equal(model.axisEvidence[0]?.description.includes("중립값"), true);
});
