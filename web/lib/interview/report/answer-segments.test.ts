import { test } from "node:test";
import assert from "node:assert/strict";
import { isModelRole, buildAnswerSegments, type RawTurn } from "./answer-segments";
import { buildAnswerDetails, type AnswerFinding } from "./answer-segments";

test("isModelRole treats model/ai/assistant/interviewer as question", () => {
  for (const r of ["model", "ai", "assistant", "interviewer", "MODEL"]) {
    assert.equal(isModelRole(r), true);
  }
  assert.equal(isModelRole("user"), false);
  assert.equal(isModelRole(""), false);
});

test("buildAnswerSegments pairs by exchange_index and computes offsets from created_at - anchor", () => {
  const anchor = "2026-06-29T00:00:00.000Z";
  const turns: RawTurn[] = [
    { id: "q1", role: "model", content: "자기소개 해주세요", exchangeIndex: 1, turnIndex: 0, createdAt: "2026-06-29T00:00:05.000Z" },
    { id: "a1", role: "user", content: "안녕하세요 저는", exchangeIndex: 1, turnIndex: 1, createdAt: "2026-06-29T00:00:20.000Z" },
    { id: "q2", role: "model", content: "기술 경험은?", exchangeIndex: 2, turnIndex: 2, createdAt: "2026-06-29T00:01:00.000Z" },
    { id: "a2", role: "user", content: "결제 모듈을", exchangeIndex: 2, turnIndex: 3, createdAt: "2026-06-29T00:01:30.000Z" },
  ];
  const segs = buildAnswerSegments(turns, anchor, 200_000);
  assert.equal(segs.length, 2);
  assert.equal(segs[0].question, "자기소개 해주세요");
  assert.equal(segs[0].answer, "안녕하세요 저는");
  assert.equal(segs[0].startMs, 20_000);
  assert.equal(segs[0].endMs, 90_000);
  assert.equal(segs[1].startMs, 90_000);
  assert.equal(segs[1].endMs, 200_000);
});

test("buildAnswerSegments falls back to nearest preceding model turn when exchange_index is 0", () => {
  const anchor = "2026-06-29T00:00:00.000Z";
  const turns: RawTurn[] = [
    { id: "q1", role: "model", content: "Q1", exchangeIndex: 0, turnIndex: 0, createdAt: "2026-06-29T00:00:05.000Z" },
    { id: "a1", role: "user", content: "A1", exchangeIndex: 0, turnIndex: 1, createdAt: "2026-06-29T00:00:10.000Z" },
  ];
  const segs = buildAnswerSegments(turns, anchor, 60_000);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].question, "Q1");
  assert.equal(segs[0].startMs, 10_000);
  assert.equal(segs[0].endMs, 60_000);
});

test("buildAnswerSegments clamps negative offsets to 0 and returns [] for invalid anchor", () => {
  const turns: RawTurn[] = [
    { id: "q1", role: "model", content: "Q", exchangeIndex: 1, turnIndex: 0, createdAt: "2026-06-29T00:00:00.000Z" },
    { id: "a1", role: "user", content: "A", exchangeIndex: 1, turnIndex: 1, createdAt: "2026-06-28T23:59:59.000Z" },
  ];
  const segs = buildAnswerSegments(turns, "2026-06-29T00:00:00.000Z", 60_000);
  assert.equal(segs[0].startMs, 0);
  assert.deepEqual(buildAnswerSegments(turns, "not-a-date", 60_000), []);
});

test("buildAnswerDetails zips segments with 1-based findings", () => {
  const segs = [
    { id: "a1", exchangeIndex: 1, question: "Q1", answer: "A1", startMs: 0, endMs: 10 },
    { id: "a2", exchangeIndex: 2, question: "Q2", answer: "A2", startMs: 10, endMs: 20 },
  ];
  const findings: Record<number, AnswerFinding> = {
    1: { improvements: ["imp1"], strengths: ["str1"], refinedAnswer: "ref1", followUpQuestion: "fu1" },
  };
  const details = buildAnswerDetails(segs, findings);
  assert.equal(details.length, 2);
  assert.equal(details[0].segment.id, "a1");
  assert.equal(details[0].finding?.refinedAnswer, "ref1");
  assert.equal(details[1].finding, undefined);
});

test("buildAnswerDetails handles undefined findings map", () => {
  const segs = [{ id: "a1", exchangeIndex: 1, question: "Q", answer: "A", startMs: 0, endMs: 10 }];
  const details = buildAnswerDetails(segs, undefined);
  assert.equal(details.length, 1);
  assert.equal(details[0].finding, undefined);
});
