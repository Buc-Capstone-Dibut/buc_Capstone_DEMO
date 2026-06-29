import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gazeFromBlendshapes, headPoseFromMatrix, calibrateBaseline,
  isLookingAway, expressionLabel, aggregateSamples, type FaceSample,
} from "./face-metrics";

test("gazeFromBlendshapes: looking screen-right is +X", () => {
  const b = { eyeLookInLeft: 0.8, eyeLookOutRight: 0.8, eyeLookOutLeft: 0, eyeLookInRight: 0 };
  const g = gazeFromBlendshapes(b);
  assert.ok(g.gazeX > 0.5);
  assert.equal(g.gazeY, 0);
});

test("headPoseFromMatrix: identity rotation → ~0 angles", () => {
  const I = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  const p = headPoseFromMatrix(I)!;
  assert.ok(Math.abs(p.yaw) < 0.01 && Math.abs(p.pitch) < 0.01 && Math.abs(p.roll) < 0.01);
});

test("calibrateBaseline averages frames", () => {
  const base = calibrateBaseline([
    { gazeX: 0.1, gazeY: 0, yaw: 2, pitch: 0 },
    { gazeX: 0.3, gazeY: 0, yaw: 4, pitch: 0 },
  ]);
  assert.equal(base.gazeX0, 0.2);
  assert.equal(base.yaw0, 3);
});

test("isLookingAway: deviation beyond threshold, blink-gated", () => {
  const base = { gazeX0: 0, gazeY0: 0, yaw0: 0, pitch0: 0 };
  assert.equal(isLookingAway({ gazeX: 0.5, gazeY: 0, yaw: 0, pitch: 0, blink: 0 }, base), true);
  assert.equal(isLookingAway({ gazeX: 0.5, gazeY: 0, yaw: 0, pitch: 0, blink: 0.9 }, base), false);
  assert.equal(isLookingAway({ gazeX: 0.1, gazeY: 0, yaw: 5, pitch: 0, blink: 0 }, base), false);
});

test("expressionLabel maps blendshape combos", () => {
  assert.equal(expressionLabel({ mouthSmileLeft: 0.6, mouthSmileRight: 0.6 }), "여유");
  assert.equal(expressionLabel({ browDownLeft: 0.6, browDownRight: 0.6 }), "긴장");
  assert.equal(expressionLabel({}), "중립");
});

test("aggregateSamples: away ratio + segments + expression histogram", () => {
  const samples: FaceSample[] = [
    { tMs: 0, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: false, expr: "중립" },
    { tMs: 200, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: true, expr: "긴장" },
    { tMs: 400, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: true, expr: "긴장" },
    { tMs: 600, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: false, expr: "중립" },
  ];
  const agg = aggregateSamples(samples);
  assert.equal(agg.awayRatio, 0.5);
  assert.deepEqual(agg.awaySegments, [[200, 400]]);
  assert.equal(agg.expressionHistogram["긴장"], 2);
});
