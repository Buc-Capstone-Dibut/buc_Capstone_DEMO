import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInterviewTypePayload,
  getInterviewTypeVisual,
  INTERVIEW_TYPE_VISUALS,
  resolveInterviewTypeVisual,
} from "@/lib/interview/interview-type-visuals";

test("interview type visual catalog has 16 transparent png-backed types", () => {
  assert.equal(INTERVIEW_TYPE_VISUALS.length, 16);
  assert.equal(new Set(INTERVIEW_TYPE_VISUALS.map((item) => item.key)).size, 16);
  assert.ok(INTERVIEW_TYPE_VISUALS.every((item) => item.imagePath.startsWith("/images/interview/types/")));
  assert.ok(INTERVIEW_TYPE_VISUALS.every((item) => item.imagePath.endsWith(".png")));
  assert.ok(INTERVIEW_TYPE_VISUALS.every((item) => item.questionFocus.length >= 4));
});

test("interview type resolver maps role, portfolio, explicit payloads", () => {
  assert.equal(resolveInterviewTypeVisual({ role: "Backend Engineer", jobData: { techStack: ["Spring"] } }).key, "backend-system");
  assert.equal(resolveInterviewTypeVisual({ role: "Frontend Developer", jobData: { techStack: ["React"] } }).key, "frontend-ui");
  assert.equal(resolveInterviewTypeVisual({ sessionType: "portfolio_defense", repoUrl: "https://github.com/a/b" }).key, "portfolio-defense");
  assert.equal(resolveInterviewTypeVisual({ interviewType: "cloud-infra" }).key, "cloud-infra");
});

test("interview type payload is stable for session start and reporting", () => {
  const visual = getInterviewTypeVisual("ai-ml");
  const payload = buildInterviewTypePayload(visual);

  assert.deepEqual(payload, {
    interviewType: "ai-ml",
    interviewTypeLabel: "AI/ML 면접",
    questionFocus: visual.questionFocus,
    reportLens: visual.reportLens,
    interviewTypeBlogTags: visual.blogTags,
  });
});
