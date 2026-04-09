import assert from "node:assert/strict";
import test from "node:test";

import { buildSessionInterviewDetailModel } from "@/lib/interview/report/session-interview-detail-adapter";
import type { MockInterviewReportModel } from "@/lib/interview/report/report-types";
import type { AnalysisResult } from "@/store/interview-setup-store";

const analysisFixture: AnalysisResult = {
  overallScore: 79,
  passProbability: 68,
  evaluation: {
    jobFit: 77,
    logic: 81,
    communication: 74,
    attitude: 72,
  },
  sentimentTimeline: [0.62, 0.71, 0.73],
  habits: [{ habit: "음", count: 2, severity: "low" }],
  feedback: {
    strengths: ["구조화된 답변"],
    improvements: ["성과 지표 보강"],
  },
  bestPractices: [
    {
      question: "최근 프로젝트에서 맡은 역할을 설명해주세요.",
      userAnswer: "백엔드 구조를 개선했습니다.",
      refinedAnswer: "문제 상황과 결과를 먼저 연결해 설명하세요.",
      reason: "답변의 구조는 좋았지만 성과 수치가 약했습니다.",
    },
  ],
};

const reportModelFixture: MockInterviewReportModel = {
  badgeLabel: "이번 면접의 디벗 유형",
  typeName: "구조형-구축형",
  typeLabels: ["구조형", "시스템형", "안정형", "구축형"],
  summary: "요약",
  heroMetrics: [],
  metaItems: [{ label: "직무", value: "Backend Engineer" }],
  axes: {
    approach: 82,
    scope: 68,
    decision: 71,
    execution: 64,
  },
  axisEvidence: [],
  strengths: ["강점"],
  weaknesses: ["개선점"],
  focusPoint: "핵심 보완점",
  nextActions: ["다음 액션"],
  fitSummary: "적합도 요약",
  questionHighlights: [],
  deliveryInsights: [],
  habits: [],
  footerActions: [],
};

test("session interview detail adapter builds timeline insights and positioning guide", () => {
  const model = buildSessionInterviewDetailModel({
    analysis: analysisFixture,
    reportView: null,
    reportModel: reportModelFixture,
    roleLabel: "Backend Engineer",
    durationMinutes: 10,
    timeline: [
      {
        id: "t-1",
        timeLabel: "01:20",
        phaseLabel: "technical",
        prompt: "최근 프로젝트에서 맡은 역할을 설명해주세요.",
        answer: "백엔드 구조를 개선했습니다.",
        hasExactTimestamp: true,
      },
    ],
  });

  assert.equal(model.coreResponses.length, 1);
  assert.equal(model.timelineInsights.length, 1);
  assert.equal(model.timelineInsights[0]?.recommendedAnswer, "문제 상황과 결과를 먼저 연결해 설명하세요.");
  assert.ok(model.timelineInsights[0]?.followUp.includes("구체적으로 설명"));
  assert.equal(model.timelineInsights[0]?.analysisSource, "best_practice");
  assert.equal(model.timelineInsights[0]?.coachingSource, "question_finding");
  assert.ok(model.positioningGuide);
  assert.equal(model.positioningGuide?.dominantAxes.length, 4);
  assert.equal(model.positioningGuide?.guideSteps.length, 3);
});

test("session interview detail adapter prefers report view question findings when analysis is missing", () => {
  const model = buildSessionInterviewDetailModel({
    analysis: null,
    reportView: {
      questionFindings: [
        {
          question: "최근 프로젝트에서 맡은 역할을 설명해주세요.",
          userAnswer: "백엔드 구조 개선을 맡았습니다.",
          strengths: ["역할과 판단 근거를 비교적 선명하게 설명했습니다."],
          improvements: ["성과 수치를 더 또렷하게 붙이면 좋습니다."],
          refinedAnswer: "문제 상황과 결과를 먼저 연결해 설명하세요.",
          followUpQuestion: "직접 판단한 부분을 더 설명해주실 수 있나요?",
          evidence: ["백엔드 구조 개선을 맡았습니다."],
          confidence: 84,
        },
      ],
    },
    reportModel: reportModelFixture,
    roleLabel: "Backend Engineer",
    durationMinutes: 10,
    timeline: [
      {
        id: "t-1",
        timeLabel: "01:20",
        phaseLabel: "technical",
        prompt: "최근 프로젝트에서 맡은 역할을 설명해주세요.",
        answer: "백엔드 구조 개선을 맡았습니다.",
        hasExactTimestamp: true,
      },
    ],
  });

  assert.equal(model.coreResponses.length, 1);
  assert.equal(model.coreResponses[0]?.timeLabel, "01:20");
  assert.ok(model.coreResponses[0]?.analysis.includes("좋았던 점"));
  assert.equal(model.coreResponses[0]?.analysisSource, "question_finding");
  assert.deepEqual(model.coreResponses[0]?.evidence, ["백엔드 구조 개선을 맡았습니다."]);
  assert.equal(model.timelineInsights[0]?.followUp, "직접 판단한 부분을 더 설명해주실 수 있나요?");
  assert.equal(model.timelineInsights[0]?.analysisSource, "question_finding");
  assert.equal(model.timelineInsights[0]?.confidence, 84);
});

test("session interview detail adapter tolerates missing analysis and report model", () => {
  const model = buildSessionInterviewDetailModel({
    analysis: null,
    reportView: null,
    reportModel: null,
    roleLabel: "개발자",
    durationMinutes: 5,
    timeline: [
      {
        id: "t-2",
        timeLabel: "00:40",
        phaseLabel: "introduction",
        prompt: "프로젝트 경험을 설명해주세요.",
        answer: "간단히 설명했습니다.",
        hasExactTimestamp: false,
      },
    ],
  });

  assert.equal(model.coreResponses.length, 0);
  assert.equal(model.timelineInsights.length, 1);
  assert.equal(model.positioningGuide, null);
  assert.ok(model.timelineInsights[0]?.recommendedAnswer.includes("프로젝트 설명"));
  assert.equal(model.timelineInsights[0]?.analysisSource, "none");
  assert.equal(model.timelineInsights[0]?.coachingSource, "generated");
});
