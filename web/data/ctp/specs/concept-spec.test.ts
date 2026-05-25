import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateConceptSpec } from "./concept-spec";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("ConceptSpec", () => {
  it("validates binary-search sample", () => {
    const json = readFileSync(
      resolve(__dirname, "samples/binary-search.json"),
      "utf-8"
    );
    const spec = JSON.parse(json);
    validateConceptSpec(spec);
    assert.equal(spec.id, "basic-binary-search");
  });

  it("rejects missing story.analogy", () => {
    const bad = {
      id: "x", title: "X",
      content: { story: { problem: "p", definition: "d" }, features: [] },
    };
    assert.throws(() => validateConceptSpec(bad), /story.problem\/definition\/analogy/);
  });

  it("rejects features count !== 4", () => {
    const bad = {
      id: "x", title: "X",
      content: {
        story: { problem: "p", definition: "d", analogy: "a" },
        features: [],
      },
    };
    assert.throws(() => validateConceptSpec(bad), /features must be exactly 4/);
  });
});
