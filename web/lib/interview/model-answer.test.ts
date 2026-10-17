import assert from "node:assert/strict";
import test from "node:test";
import { buildInterviewAnswerPrompt, getSupportingPortfolioIds, MAX_MODEL_ANSWER_LENGTH, normalizeInterviewAnswer } from "@/lib/interview/model-answer";

test("posting answers include the JD, resume and connected project, cover letter and portfolio", () => {
  const prompt = buildInterviewAnswerPrompt({
    question: "지연을 줄인 경험을 말씀해 주세요.",
    session: {
      session_type: "live_interview",
      job_payload: { company: "테스트회사", requirements: ["API 성능 개선"], supportingMaterials: { coverLetter: { body: "로그를 바탕으로 병목을 찾았습니다." }, projects: [{ name: "연결 프로젝트" }] } },
      resume_payload: { parsedContent: { personalInfo: { name: "김디벗", email: "private@example.com", phone: "010-private" }, projects: [{ name: "이력서 프로젝트", achievements: ["지연 30% 감소"] }] } },
    },
    portfolios: [{ title: "첨부 포트폴리오", source_snapshot: { description: "웹소켓 구현" } }],
  });
  for (const fact of ["공고 기반 면접", "API 성능 개선", "병목", "연결 프로젝트", "이력서 프로젝트", "30%", "첨부 포트폴리오", "웹소켓"]) assert.ok(prompt.includes(fact), fact);
  assert.ok(!prompt.includes("private@example.com"));
  assert.ok(!prompt.includes("010-private"));
  assert.match(prompt, /지어내지 마세요/);
});

test("role answers use the selected role without requiring personal experience", () => {
  const prompt = buildInterviewAnswerPrompt({ question: "클로저를 설명해 주세요.", session: { session_type: "live_interview", job_payload: { interviewTrack: "role", role: "프론트엔드", techStack: ["JavaScript"] }, resume_payload: {} } });
  assert.match(prompt, /면접 유형: 직무 면접/);
  assert.match(prompt, /프론트엔드/);
  assert.match(prompt, /JavaScript/);
});

test("defense answers include persisted GitHub evidence and distinguish hypotheses", () => {
  const prompt = buildInterviewAnswerPrompt({ question: "API를 분리한 이유는 무엇인가요?", session: { session_type: "portfolio_defense", job_payload: { repoUrl: "https://github.com/example/repo", readmeSummary: "Next.js + FastAPI" }, resume_payload: { unrelated: "should not be used" } }, portfolioSource: { readme_snapshot: "작업 큐를 사용", tree_snapshot: "api/ worker/", infra_files_snapshot: "compose.yaml" } });
  for (const fact of ["포트폴리오 디펜스", "Next.js", "작업 큐", "api/ worker/", "compose.yaml", "가설을 구현 사실로 단정하지"]) assert.ok(prompt.includes(fact), fact);
  assert.ok(!prompt.includes("should not be used"));
});

test("answers stay under 360 characters and four sentences without splitting technology names", () => {
  assert.equal(normalizeInterviewAnswer("Node.js를 사용합니다.\n Next.js도 사용합니다."), "Node.js를 사용합니다. Next.js도 사용합니다.");
  assert.equal(normalizeInterviewAnswer("하나. 둘. 셋. 넷. 다섯."), "하나. 둘. 셋. 넷.");
  assert.ok(normalizeInterviewAnswer("긴답변".repeat(500)).length <= MAX_MODEL_ANSWER_LENGTH);
  const sentence = "이력서에서 확인한 근거를 바탕으로 설명하겠습니다. ";
  assert.ok(normalizeInterviewAnswer(sentence.repeat(30)).endsWith("."));
  assert.throws(() => normalizeInterviewAnswer(" \n "));
});

test("portfolio references are validated and deduplicated", () => {
  const id = "21c58fed-893c-e184-0f8e-e2a11a0d2ba3";
  assert.deepEqual(getSupportingPortfolioIds({ supportingMaterials: { portfolioIds: [id, id, "invalid", null] } }), [id]);
  assert.deepEqual(getSupportingPortfolioIds(null), []);
});
