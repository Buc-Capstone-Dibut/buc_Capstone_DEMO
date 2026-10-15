import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInterviewConsoleRecommendation,
  isLikelyInterviewQuestion,
} from "@/lib/interview/console-coaching";

const resumeData = {
  personalInfo: { intro: "사용자 문제를 데이터로 해결하는 백엔드 개발자입니다" },
  skills: [{ name: "TypeScript", level: "Advanced" }],
  projects: [
    {
      name: "Debut",
      description: "실시간 AI 모의면접 서비스를 개발했습니다",
      techStack: ["Next.js", "FastAPI", "WebSocket"],
      achievements: ["응답 지연을 30% 줄였습니다"],
    },
  ],
};

test("detects interview questions while excluding closing messages", () => {
  assert.equal(isLikelyInterviewQuestion("가장 어려웠던 프로젝트를 설명해 주세요."), true);
  assert.equal(isLikelyInterviewQuestion("오늘 면접은 여기까지입니다. 수고하셨습니다."), false);
});

test("builds a project recommendation from resume facts", () => {
  const answer = buildInterviewConsoleRecommendation({
    question: "최근 프로젝트에서 성능을 개선한 경험을 말씀해 주세요.",
    sessionType: "live_interview",
    jobData: { role: "백엔드 개발자" },
    resumeData,
  });

  assert.match(answer, /Debut/);
  assert.match(answer, /응답 지연을 30% 줄였습니다/);
  assert.match(answer, /Next\.js, FastAPI, WebSocket/);
});

test("leaves explicit placeholders instead of inventing collaboration details", () => {
  const answer = buildInterviewConsoleRecommendation({
    question: "팀원과 의견이 충돌했을 때 어떻게 조율했나요?",
    sessionType: "live_interview",
    resumeData,
  });

  assert.match(answer, /Debut/);
  assert.match(answer, /\[의견 차이 또는 협업 이슈\]/);
  assert.match(answer, /\[직접 제안·실행한 조율 방식\]/);
});

test("uses portfolio context for defense questions", () => {
  const answer = buildInterviewConsoleRecommendation({
    question: "이 프로젝트의 아키텍처를 이렇게 구성한 이유가 무엇인가요?",
    sessionType: "portfolio_defense",
    jobData: {
      repoUrl: "https://github.com/example/debut",
      readmeSummary: "면접 연습과 분석을 제공하는 서비스",
      detectedTopics: ["Next.js", "FastAPI"],
    },
  });

  assert.match(answer, /debut/);
  assert.match(answer, /면접 연습과 분석을 제공하는 서비스/);
  assert.match(answer, /Next\.js, FastAPI/);
});
