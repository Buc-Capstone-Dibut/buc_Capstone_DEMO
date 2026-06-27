import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRecordingStoragePath,
  pickRecordingExtension,
  buildRecordingMetadata,
} from "./recording-metadata";

test("pickRecordingExtension maps webm mime to webm", () => {
  assert.equal(pickRecordingExtension("video/webm;codecs=vp9,opus"), "webm");
  assert.equal(pickRecordingExtension("video/webm"), "webm");
});

test("pickRecordingExtension falls back to webm for unknown mime", () => {
  assert.equal(pickRecordingExtension(""), "webm");
});

test("buildRecordingStoragePath scopes by session id", () => {
  const path = buildRecordingStoragePath("sess_123", "video/webm");
  assert.match(path, /^sess_123\/recording-\d+\.webm$/);
});

test("buildRecordingMetadata shapes the POST body", () => {
  const meta = buildRecordingMetadata({
    storagePath: "sess_123/recording-1.webm",
    bucket: "interview-recordings",
    mimeType: "video/webm",
    sizeBytes: 4096,
    durationMs: 12000,
    recordingStartedAtIso: "2026-06-27T00:00:00.000Z",
  });
  assert.deepEqual(meta, {
    bucket: "interview-recordings",
    storagePath: "sess_123/recording-1.webm",
    mimeType: "video/webm",
    sizeBytes: 4096,
    durationMs: 12000,
    recordingStartedAt: "2026-06-27T00:00:00.000Z",
  });
});
