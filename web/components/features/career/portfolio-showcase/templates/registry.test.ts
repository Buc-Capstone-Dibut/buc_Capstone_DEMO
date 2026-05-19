import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOWCASE_TEMPLATES, getShowcaseTemplate, isShowcaseTemplateId } from "./registry";

test("neon-editorial entry exists", () => {
  assert.ok(SHOWCASE_TEMPLATES["neon-editorial"]);
  assert.equal(SHOWCASE_TEMPLATES["neon-editorial"].label, "Neon Editorial");
});

test("getShowcaseTemplate returns default for unknown id", () => {
  assert.equal(getShowcaseTemplate("does-not-exist").label, "Neon Editorial");
});

test("isShowcaseTemplateId narrows correctly", () => {
  assert.equal(isShowcaseTemplateId("neon-editorial"), true);
  assert.equal(isShowcaseTemplateId("nope"), false);
});
