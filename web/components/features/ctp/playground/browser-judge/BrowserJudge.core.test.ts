import assert from "node:assert/strict";
import test from "node:test";

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
