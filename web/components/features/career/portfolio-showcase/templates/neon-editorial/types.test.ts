import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NeonEditorialContentSchema,
  NeonEditorialTokensSchema,
  createDefaultNeonEditorialContent,
  createDefaultNeonEditorialTokens,
} from "./types";

test("default content parses successfully", () => {
  const content = createDefaultNeonEditorialContent({ name: "DOYOON KIM" });
  const parsed = NeonEditorialContentSchema.safeParse(content);
  assert.equal(parsed.success, true);
});

test("default tokens parse successfully", () => {
  const tokens = createDefaultNeonEditorialTokens();
  const parsed = NeonEditorialTokensSchema.safeParse(tokens);
  assert.equal(parsed.success, true);
});

test("content with empty projects array is still valid", () => {
  const content = createDefaultNeonEditorialContent({ name: "X" });
  content.projects = [];
  const parsed = NeonEditorialContentSchema.safeParse(content);
  assert.equal(parsed.success, true);
});

test("invalid token color is rejected", () => {
  const tokens = createDefaultNeonEditorialTokens();
  // @ts-expect-error testing runtime rejection
  tokens.accent = 123;
  const parsed = NeonEditorialTokensSchema.safeParse(tokens);
  assert.equal(parsed.success, false);
});
