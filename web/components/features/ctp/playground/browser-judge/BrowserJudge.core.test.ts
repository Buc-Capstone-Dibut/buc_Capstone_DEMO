import assert from "node:assert/strict";
import test from "node:test";

import type { ProblemBankItem } from "@/components/features/ctp/problem-bank/types";

import { __browserJudgeInternals } from "./BrowserJudge";

test("toStdinLines normalizes CRLF and strips trailing newline", () => {
  const lines = __browserJudgeInternals.toStdinLines("1\r\n2\r\n3\r\n");
  assert.deepEqual(lines, ["1", "2", "3"]);
});

test("toStdinLines returns empty on empty input", () => {
  const lines = __browserJudgeInternals.toStdinLines("");
  assert.deepEqual(lines, []);
});

test("deriveOverall prioritizes OLE > TLE > RTE > WA", () => {
  const overall = __browserJudgeInternals.deriveOverall([
    { index: 1, verdict: "AC" },
    { index: 2, verdict: "WA" },
    { index: 3, verdict: "TLE" },
    { index: 4, verdict: "OLE" },
  ]);
  assert.equal(overall, "OLE");
});

test("deriveOverall returns AC when all cases pass", () => {
  const overall = __browserJudgeInternals.deriveOverall([
    { index: 1, verdict: "AC" },
    { index: 2, verdict: "AC" },
  ]);
  assert.equal(overall, "AC");
});

// ---- Phase A: maxSteps / wallClockMs semantic split ----

function makeProblem(overrides: Partial<ProblemBankItem>): ProblemBankItem {
  return {
    id: "p",
    moduleId: "m",
    title: "t",
    difficulty: "bronze",
    type: "coding",
    description: "",
    inputFormat: "",
    outputFormat: "",
    constraints: [],
    sampleIO: [],
    testCases: [],
    tags: [],
    ...overrides,
  };
}

test("resolveMaxSteps: prefers maxSteps over deprecated timeLimit", () => {
  const problem = makeProblem({ maxSteps: 5_000_000, timeLimit: 10_000 });
  assert.equal(__browserJudgeInternals.resolveMaxSteps(problem), 5_000_000);
});

test("resolveMaxSteps: falls back to timeLimit when maxSteps absent (backcompat)", () => {
  const problem = makeProblem({ timeLimit: 12_345 });
  assert.equal(__browserJudgeInternals.resolveMaxSteps(problem), 12_345);
});

test("resolveMaxSteps: undefined when neither set (worker default kicks in)", () => {
  const problem = makeProblem({});
  assert.equal(__browserJudgeInternals.resolveMaxSteps(problem), undefined);
});
