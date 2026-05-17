import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pickProjectSnapshotsByIds,
  normalizeShowcaseSlug,
} from "./showcase-portfolios-pure";

test("pickProjectSnapshotsByIds preserves order from the ids array", () => {
  const all = [
    { id: "a", company: "A" },
    { id: "b", company: "B" },
    { id: "c", company: "C" },
  ];
  const result = pickProjectSnapshotsByIds(all as never, ["c", "a"]);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "c");
  assert.equal(result[1].id, "a");
});

test("pickProjectSnapshotsByIds skips unknown ids", () => {
  const all = [{ id: "a" }];
  const result = pickProjectSnapshotsByIds(all as never, ["a", "missing"]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "a");
});

test("pickProjectSnapshotsByIds returns a deep copy (mutation-safe)", () => {
  const all = [{ id: "a", company: "Original", tags: ["x"] }];
  const result = pickProjectSnapshotsByIds(all as never, ["a"]);
  (result[0] as { company: string }).company = "Mutated";
  (result[0] as { tags: string[] }).tags.push("y");
  assert.equal((all[0] as { company: string }).company, "Original");
  assert.equal((all[0] as { tags: string[] }).tags.length, 1);
});

test("normalizeShowcaseSlug strips invalid chars and falls back", () => {
  assert.equal(normalizeShowcaseSlug("My Portfolio! v2"), "my-portfolio-v2");
  assert.equal(normalizeShowcaseSlug(""), "");
  assert.equal(normalizeShowcaseSlug("프론트 엔드"), "프론트-엔드");
});
