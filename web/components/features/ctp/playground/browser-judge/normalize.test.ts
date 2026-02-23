import assert from "node:assert/strict";
import test from "node:test";

import { normalizeOutput } from "./normalize";

test("normalizeOutput trims trailing spaces per line", () => {
  const raw = "1   \n2    \n3\n";
  assert.equal(normalizeOutput(raw), "1\n2\n3");
});

test("normalizeOutput trims surrounding blank lines", () => {
  const raw = "\n\nhello\nworld\n\n";
  assert.equal(normalizeOutput(raw), "hello\nworld");
});

test("normalizeOutput keeps meaningful internal blank lines", () => {
  const raw = "A\n\nB\n";
  assert.equal(normalizeOutput(raw), "A\n\nB");
});
