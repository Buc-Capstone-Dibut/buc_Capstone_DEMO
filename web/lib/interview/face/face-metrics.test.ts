import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gazeFromBlendshapes, headPoseFromMatrix, calibrateBaseline,
  isLookingAway, isSmiling, headMovementFromSamples, aggregateSamples,
  type FaceSample,
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

test("isSmiling: observable smile only (no emotion inference)", () => {
  assert.equal(isSmiling({ mouthSmileLeft: 0.6, mouthSmileRight: 0.6 }), true);
  assert.equal(isSmiling({ mouthSmileLeft: 0.1, mouthSmileRight: 0.1 }), false);
  // 눈썹 움직임은 미소 판정에 영향을 주지 않는다(감정 추측 제거).
  assert.equal(isSmiling({ browDownLeft: 0.9, browDownRight: 0.9 }), false);
});

test("headMovementFromSamples: stddev levels", () => {
  const still = headMovementFromSamples([
    { yaw: 0, pitch: 0 }, { yaw: 1, pitch: 0.5 }, { yaw: -1, pitch: -0.5 },
  ]);
  assert.equal(still.level, "낮음");
  const shaky = headMovementFromSamples([
    { yaw: -15, pitch: 0 }, { yaw: 15, pitch: 0 }, { yaw: -15, pitch: 0 }, { yaw: 15, pitch: 0 },
  ]);
  assert.equal(shaky.level, "높음");
  assert.ok(shaky.yawStd > 9);
});

test("aggregateSamples: away ratio + segments + smile ratio + head movement", () => {
  const samples: FaceSample[] = [
    { tMs: 0, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: false, smile: false },
    { tMs: 200, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: true, smile: false },
    { tMs: 400, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: true, smile: true },
    { tMs: 600, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: false, smile: true },
  ];
  const agg = aggregateSamples(samples);
  assert.equal(agg.awayRatio, 0.5);
  assert.deepEqual(agg.awaySegments, [[200, 400]]);
  assert.equal(agg.smileRatio, 0.5);
  assert.equal(agg.headMovement.level, "낮음");
  assert.equal(agg.sampleCount, 4);
});
