import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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

// ---- Phase C: error line number is corrected by preamble offset ----

// Worker is a sandboxed `.js` file we can't import. We assert the contract here by
// loading the worker source and exercising the pure helper via `new Function`. If
// the worker copy drifts, this test catches it.
function loadWorkerHelper(): (msg: string, preambleLineCount: number) => string {
  const here = dirname(fileURLToPath(import.meta.url));
  const workerPath = resolve(here, "../../../../../public/workers/skulpt.worker.js");
  const src = readFileSync(workerPath, "utf8");
  const match = src.match(
    /function adjustErrorLineNumbers\(message, preambleLineCount\) \{[\s\S]*?\n\}/,
  );
  assert.ok(match, "worker must expose adjustErrorLineNumbers");
  const wrapped = `${match[0]}\nreturn adjustErrorLineNumbers;`;
  // eslint-disable-next-line no-new-func
  return new Function(wrapped)() as (msg: string, n: number) => string;
}

test("adjustErrorLineNumbers (worker helper): subtracts preamble offset from <stdin>, line N", () => {
  const adjust = loadWorkerHelper();
  const original = "NameError: name 'foo' is not defined on line 14 of <stdin>, line 14";
  // Preamble = trace helper + input helper (~12 lines in current worker build).
  const adjusted = adjust(original, 12);
  // User's actual line is 14 - 12 = 2.
  assert.match(adjusted, /<stdin>, line 2/);
  // The bare "on line 14" text is Skulpt-internal and not in our regex, so it stays.
  assert.match(adjusted, /on line 14/);
});

test("adjustErrorLineNumbers (worker helper): clamps to 1 when subtraction would underflow", () => {
  const adjust = loadWorkerHelper();
  const adjusted = adjust("Traceback at <stdin>, line 3", 10);
  assert.match(adjusted, /<stdin>, line 1/);
});

test("adjustErrorLineNumbers (worker helper): no-op when preambleLineCount is 0", () => {
  const adjust = loadWorkerHelper();
  const msg = "<stdin>, line 7";
  assert.equal(adjust(msg, 0), msg);
});

// ---- Phase B: wall-clock timeout fires when worker never responds ----

// MockWorker that NEVER posts back — simulates a hung Skulpt.
class HangWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  terminated = false;
  constructor(_url: string) {}
  postMessage(_data: unknown) {
    // Intentionally do nothing — caller's wall-clock timer should fire.
  }
  terminate() {
    this.terminated = true;
  }
}

test("Phase B: BrowserJudge.run surfaces TLE when worker hangs past wallClockMs", async () => {
  // Replace global Worker with the hung impl for this test.
  const originalWorker = (globalThis as { Worker?: unknown }).Worker;
  (globalThis as unknown as { Worker: typeof HangWorker }).Worker = HangWorker;
  try {
    // Dynamic import so the new global Worker is picked up by BrowserJudge's `new Worker(...)`.
    const { BrowserJudge } = await import("./BrowserJudge");
    const problem = makeProblem({
      wallClockMs: 25,
      testCases: [{ input: "1\n", output: "ok\n" }],
    });
    const start = Date.now();
    const result = await BrowserJudge.run("print('x')", problem);
    const elapsed = Date.now() - start;
    assert.equal(result.overall, "TLE");
    assert.equal(result.cases[0].verdict, "TLE");
    assert.match(result.cases[0].errorMessage ?? "", /25ms wall-clock/);
    // Sanity: the test should not have taken multiple seconds.
    assert.ok(elapsed < 2_000, `wall-clock timer should fire fast, got ${elapsed}ms`);
  } finally {
    if (originalWorker === undefined) {
      delete (globalThis as { Worker?: unknown }).Worker;
    } else {
      (globalThis as { Worker?: unknown }).Worker = originalWorker;
    }
  }
});
