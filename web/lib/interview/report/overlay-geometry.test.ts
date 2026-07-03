import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleAtTime, letterboxRect, awayAtTime } from "./overlay-geometry";

const S = [
  { tMs: 0, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: false, smile: false },
  { tMs: 200, gazeX: 0.4, gazeY: 0, yaw: 20, pitch: 0, away: true, smile: true },
  { tMs: 400, gazeX: 0, gazeY: 0, yaw: 0, pitch: 0, away: false, smile: false },
];

test("sampleAtTime returns nearest sample by tMs", () => {
  assert.equal(sampleAtTime(S, 0)?.smile, false);
  assert.equal(sampleAtTime(S, 180)?.smile, true);
  assert.equal(sampleAtTime(S, 9999)?.tMs, 400);
  assert.equal(sampleAtTime([], 100), null);
});

test("letterboxRect maps object-contain content box", () => {
  const r = letterboxRect(1280, 720, 200, 200);
  assert.equal(Math.round(r.width), 200);
  assert.equal(Math.round(r.height), 113);
  assert.ok(r.offsetX === 0 && r.offsetY > 0);
});

test("awayAtTime true inside an away segment", () => {
  assert.equal(awayAtTime([[200, 400]], 300), true);
  assert.equal(awayAtTime([[200, 400]], 100), false);
});
