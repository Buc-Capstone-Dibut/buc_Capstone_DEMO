import assert from "node:assert/strict";
import test from "node:test";
import {
  RecordingTranscriptClock,
  recordingTranscriptSchema,
} from "./transcript";
import {
  buildAnswerDetails,
  buildRecordedAnswerSegments,
} from "../report/answer-segments";

test("uses scheduled playback and captured audio, not delayed transcript arrival", () => {
  const clock = new RecordingTranscriptClock();
  clock.start(1000);
  clock.text("ai", "turn-1", "질문");
  clock.audio({
    role: "ai",
    turnId: "turn-1",
    startTimeMs: 1500,
    endTimeMs: 2500,
  });
  clock.audio({
    role: "ai",
    turnId: "turn-1",
    startTimeMs: 2500,
    endTimeMs: 3000,
  });
  clock.audio({
    role: "user",
    turnId: "capture-1",
    startTimeMs: 4000,
    endTimeMs: 6000,
  });
  clock.text("user", "turn-2", "첫 전사");
  clock.audio({
    role: "user",
    turnId: "capture-2",
    startTimeMs: 9000,
    endTimeMs: 12000,
  });
  clock.text("user", "turn-2", "뒤늦게 정정된 첫 답변");
  clock.text("user", "turn-3", "두 번째 답변");
  const result = clock.snapshot(15000);
  assert.deepEqual(
    result.entries.map((entry) => [entry.role, entry.startMs, entry.endMs]),
    [
      ["ai", 500, 2000],
      ["user", 3000, 5000],
      ["user", 8000, 11000],
    ],
  );
  assert.equal(result.entries[1].text, "뒤늦게 정정된 첫 답변");
  assert.equal(result.entries[1].turnId, "turn-2");
  assert.equal(buildRecordedAnswerSegments(result)[0].question, "질문");
  assert.equal(buildRecordedAnswerSegments(result)[0].endMs, 5000);
});

test("cancelled answers are removed and replay bounds never extend beyond recording", () => {
  const clock = new RecordingTranscriptClock();
  clock.start(1000);
  clock.audio({
    role: "user",
    turnId: "capture-1",
    startTimeMs: 900,
    endTimeMs: 4000,
  });
  clock.text("user", "turn-1", "취소할 답변");
  clock.cancelAnswer("capture-1");
  clock.audio({
    role: "user",
    turnId: "capture-2",
    startTimeMs: 4500,
    endTimeMs: 7000,
  });
  clock.text("user", "turn-2", "다시 한 답변");
  const entries = clock.snapshot(5000).entries;
  assert.equal(entries.length, 1);
  assert.deepEqual([entries[0].startMs, entries[0].endMs], [3500, 5000]);
});

test("missing audio timings stay unknown instead of inventing a seek position", () => {
  const clock = new RecordingTranscriptClock();
  clock.start(0);
  clock.text("ai", "turn-1", "음성이 없는 질문");
  assert.equal(clock.snapshot(2000).entries[0].startMs, null);
});

test("unknown timing preserves question order and does not shift feedback onto another answer", () => {
  const clock = new RecordingTranscriptClock();
  clock.start(0);
  clock.text("ai", "turn-1", "First question");
  clock.text("user", "turn-2", "Answer without a timestamp");
  clock.text("ai", "turn-2", "Second question");
  clock.audio({
    role: "user",
    turnId: "capture-2",
    startTimeMs: 1000,
    endTimeMs: 2000,
  });
  clock.text("user", "turn-3", "Timed answer");
  const transcript = clock.snapshot(3000);
  assert.deepEqual(
    transcript.entries.map((entry) => entry.text),
    [
      "First question",
      "Answer without a timestamp",
      "Second question",
      "Timed answer",
    ],
  );
  const segments = buildRecordedAnswerSegments(transcript);
  assert.equal(segments[0].question, "Second question");
  assert.equal(segments[0].answerOrder, 2);
  const feedback = { improvements: ["Second answer feedback"] };
  assert.deepEqual(
    buildAnswerDetails(segments, { 2: feedback })[0].finding,
    feedback,
  );
});

test("rejects malformed transcript timing ranges", () => {
  const entry = {
    id: "x",
    turnId: "turn-1",
    role: "user",
    text: "답변",
    startMs: 100,
    endMs: 90,
  };
  assert.equal(
    recordingTranscriptSchema.safeParse({ version: 1, entries: [entry] })
      .success,
    false,
  );
  assert.equal(
    recordingTranscriptSchema.safeParse({
      version: 1,
      entries: [{ ...entry, startMs: null }],
    }).success,
    false,
  );
});
