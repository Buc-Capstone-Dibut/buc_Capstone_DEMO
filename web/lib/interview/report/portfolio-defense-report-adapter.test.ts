import assert from "node:assert/strict";
import test from "node:test";

import { buildPortfolioDefenseReportModel } from "@/lib/interview/report/portfolio-defense-report-adapter";

test("portfolio defense adapter builds coverage and transcript highlights from timeline", () => {
  const model = buildPortfolioDefenseReportModel({
    analysis: {
      rubricScores: {
        design_intent: { raw: 88, weighted: 52.8 },
        code_quality: { raw: 70, weighted: 7 },
        ai_usage: { raw: 76, weighted: 22.8 },
      },
      totalWeightedScore: 82.6,
      strengths: ["설계 의도를 조리 있게 설명했습니다."],
      improvements: ["배포 전략을 더 선명히 말해보세요."],
      nextActions: ["장애 대응 사례를 1분 버전으로 정리하세요."],
    },
    reportView: {
      repoUrl: "https://github.com/dibut/demo",
      summary: "포트폴리오 디펜스 요약",
    },
    timeline: [
      {
        prompt: "아키텍처와 CI/CD를 어떻게 구성했나요?",
        answer: "레이어 구조와 GitHub Actions 기반 배포 파이프라인을 구성했습니다.",
        phaseLabel: "technical",
      },
      {
        prompt: "장애 대응과 모니터링은 어떻게 했나요?",
        answer: "Prometheus, Grafana, 알림 체계와 장애 복구 절차를 설명했습니다.",
        phaseLabel: "closing",
      },
    ],
    session: {
      repoUrl: "https://github.com/dibut/demo",
      detectedTopics: ["architecture", "cicd", "monitoring", "incident-response"],
      mode: "video",
      createdAt: 1710000000,
      durationMinute: 10,
    },
  });

  assert.equal(model.summary, "포트폴리오 디펜스 요약");
  assert.equal(model.metaItems[0]?.value, "https://github.com/dibut/demo");
  assert.equal(model.metaItems[1]?.value, "화상 디펜스");
  assert.equal(model.topicCoverage.covered, 4);
  assert.equal(model.topicCoverage.total, 4);
  assert.equal(model.transcriptHighlights.length, 4);
  assert.ok(model.axes.approach > 0);
});

test("portfolio defense adapter falls back to safe defaults when sparse payload is provided", () => {
  const model = buildPortfolioDefenseReportModel({
    analysis: null,
    reportView: {
      comparisonPayload: {
        repoUrl: "https://github.com/dibut/fallback",
      },
    },
    timeline: [],
    session: {
      detectedTopics: ["architecture"],
      mode: "voice",
      createdAt: 1710000000,
      durationMinute: 5,
    },
  });

  assert.equal(model.metaItems[0]?.value, "https://github.com/dibut/fallback");
  assert.equal(model.metaItems[1]?.value, "음성 디펜스");
  assert.equal(model.topicCoverage.total, 1);
  assert.equal(model.transcriptHighlights.length, 0);
  assert.ok(model.strengths.length >= 1);
  assert.ok(model.nextActions.length >= 1);
});
