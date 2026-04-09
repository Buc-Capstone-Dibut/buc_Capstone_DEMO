import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAnalysisHubSessions,
  collectRecommendedActions,
  collectRecurringWeaknesses,
  computeAxisTrends,
  computeRepresentativeAxes,
  getQuadrantKey,
  getQuadrantPoint,
} from "@/lib/interview/report/analysis-hub";

test("analysis hub builds live and defense sessions from real session payloads", () => {
  const sessions = buildAnalysisHubSessions([
    {
      id: "live-1",
      sessionType: "live_interview",
      mode: "video",
      targetDurationSec: 600,
      company: "Dibut",
      role: "Backend Engineer",
      createdAt: 1713000000,
      analysis: {
        overallScore: 81,
        passProbability: 74,
        evaluation: {
          jobFit: 79,
          logic: 83,
          communication: 75,
          attitude: 72,
        },
        sentimentTimeline: [62, 70, 74],
        habits: [],
        feedback: {
          strengths: ["구조적으로 설명했습니다."],
          improvements: ["성과 수치를 더 분명히 말하기"],
        },
        bestPractices: [],
      },
      reportView: {
        sessionType: "live_interview",
        analysisMode: "full",
        summary: "실제 면접 기반 리포트",
        strengths: ["구조적으로 설명했습니다."],
        improvements: ["성과 수치를 더 분명히 말하기"],
        nextActions: ["답변 첫 문장에서 결론 먼저 말하기"],
        profile: {
          axes: {
            approach: 82,
            scope: 66,
            decision: 70,
            execution: 64,
          },
          typeName: "아키텍트형",
          typeLabels: ["구조형", "시스템형", "안정형", "구축형"],
        },
        analysisQuality: {
          score: 84,
          label: "높음",
        },
      },
      reportGenerationMeta: {
        analysisQuality: {
          score: 84,
          label: "높음",
        },
      },
      reportStatus: "completed",
    },
    {
      id: "defense-1",
      sessionType: "portfolio_defense",
      mode: "video",
      targetDurationSec: 600,
      repoUrl: "https://github.com/example/repo",
      detectedTopics: ["architecture", "monitoring"],
      createdAt: 1714000000,
      analysis: {
        overallScore: 0,
        passProbability: 0,
        evaluation: {
          jobFit: 0,
          logic: 0,
          communication: 0,
          attitude: 0,
        },
        sentimentTimeline: [],
        habits: [],
        feedback: {
          strengths: [],
          improvements: [],
        },
        bestPractices: [],
        rubricScores: {
          design_intent: { raw: 84, weighted: 50.4 },
          code_quality: { raw: 72, weighted: 7.2 },
          ai_usage: { raw: 68, weighted: 20.4 },
        },
        totalWeightedScore: 78,
        strengths: ["설계 의도 설명이 선명했습니다."],
        improvements: ["개인 기여 장면을 더 또렷하게 말하기"],
        nextActions: ["대안 비교 기준을 먼저 말하기"],
      },
      reportView: {
        summary: "설계 의도는 좋았고 기여도 설명은 보완이 필요합니다.",
      },
      timeline: [
        { prompt: "구조를 설명해주세요.", answer: "레이어 구조를 택했습니다.", phaseLabel: "discussion" },
      ],
      reportStatus: "completed",
    },
  ]);

  assert.equal(sessions.length, 2);
  assert.equal(sessions[0]?.id, "defense-1");
  assert.equal(sessions[0]?.kind, "defense");
  assert.ok(sessions[0]?.href.includes("/interview/training/portfolio/report?id=defense-1"));
  assert.equal(sessions[1]?.kind, "mock");
  assert.equal(sessions[1]?.typeName, "아키텍트형");
  assert.equal(sessions[1]?.analysisQualityLabel, "높음");
});

test("analysis hub computes representative axes, trends, weaknesses, and actions from sessions", () => {
  const sessions = buildAnalysisHubSessions([
    {
      id: "live-1",
      sessionType: "live_interview",
      mode: "video",
      targetDurationSec: 600,
      company: "Dibut",
      role: "Backend Engineer",
      createdAt: 1713000000,
      analysis: {
        overallScore: 81,
        passProbability: 74,
        evaluation: { jobFit: 79, logic: 83, communication: 75, attitude: 72 },
        sentimentTimeline: [],
        habits: [],
        feedback: { strengths: ["강점"], improvements: ["성과 수치를 더 분명히 말하기"] },
        bestPractices: [],
      },
      reportView: {
        summary: "요약",
        strengths: ["강점"],
        improvements: ["성과 수치를 더 분명히 말하기"],
        nextActions: ["답변 첫 문장에서 결론 먼저 말하기"],
        profile: {
          axes: { approach: 82, scope: 66, decision: 70, execution: 64 },
          typeName: "아키텍트형",
          typeLabels: ["구조형", "시스템형", "안정형", "구축형"],
        },
      },
    },
    {
      id: "live-2",
      sessionType: "live_interview",
      mode: "video",
      targetDurationSec: 600,
      company: "Dibut",
      role: "Backend Engineer",
      createdAt: 1712000000,
      analysis: {
        overallScore: 78,
        passProbability: 68,
        evaluation: { jobFit: 75, logic: 79, communication: 72, attitude: 70 },
        sentimentTimeline: [],
        habits: [],
        feedback: { strengths: ["강점"], improvements: ["성과 수치를 더 분명히 말하기"] },
        bestPractices: [],
      },
      reportView: {
        summary: "요약",
        strengths: ["강점"],
        improvements: ["성과 수치를 더 분명히 말하기"],
        nextActions: ["답변 첫 문장에서 결론 먼저 말하기"],
        profile: {
          axes: { approach: 76, scope: 61, decision: 66, execution: 59 },
          typeName: "아키텍트형",
          typeLabels: ["구조형", "시스템형", "안정형", "구축형"],
        },
      },
    },
    {
      id: "defense-1",
      sessionType: "portfolio_defense",
      mode: "video",
      targetDurationSec: 600,
      repoUrl: "https://github.com/example/repo",
      detectedTopics: ["architecture", "monitoring"],
      createdAt: 1711000000,
      analysis: {
        overallScore: 0,
        passProbability: 0,
        evaluation: { jobFit: 0, logic: 0, communication: 0, attitude: 0 },
        sentimentTimeline: [],
        habits: [],
        feedback: { strengths: [], improvements: [] },
        bestPractices: [],
        rubricScores: {
          design_intent: { raw: 80, weighted: 48 },
          code_quality: { raw: 70, weighted: 7 },
          ai_usage: { raw: 60, weighted: 18 },
        },
        totalWeightedScore: 73,
        strengths: ["설계 의도 설명이 좋았습니다."],
        improvements: ["개인 기여 장면을 더 또렷하게 말하기"],
        nextActions: ["답변 첫 문장에서 결론 먼저 말하기"],
      },
      reportView: {
        summary: "디펜스 요약",
      },
      timeline: [
        { prompt: "구조를 설명해주세요.", answer: "레이어 구조를 택했습니다.", phaseLabel: "discussion" },
      ],
    },
  ]);

  const representativeAxes = computeRepresentativeAxes(sessions);
  const trends = computeAxisTrends(sessions);
  const recurringWeaknesses = collectRecurringWeaknesses(sessions);
  const recommendedActions = collectRecommendedActions(sessions);
  const quadrantKey = getQuadrantKey(getQuadrantPoint(representativeAxes));

  assert.equal(representativeAxes.approach > 70, true);
  assert.equal(typeof trends.approach, "number");
  assert.deepEqual(recurringWeaknesses[0], "성과 수치를 더 분명히 말하기");
  assert.deepEqual(recommendedActions[0], "답변 첫 문장에서 결론 먼저 말하기");
  assert.ok(["tl", "tr", "bl", "br"].includes(quadrantKey));
});
