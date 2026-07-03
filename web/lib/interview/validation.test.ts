import assert from "node:assert/strict";
import test from "node:test";

import {
  interpretParseJobResponse,
  isAllowedRecordingBucket,
  isValidSessionId,
} from "@/lib/interview/validation";

// --- isAllowedRecordingBucket ---

test("bucket whitelist: allows the canonical recording bucket", () => {
  assert.equal(isAllowedRecordingBucket("interview-recordings"), true);
});

test("bucket whitelist: allows the local dev marker", () => {
  assert.equal(isAllowedRecordingBucket("local"), true);
});

test("bucket whitelist: rejects an arbitrary bucket name", () => {
  assert.equal(isAllowedRecordingBucket("attacker-bucket"), false);
});

test("bucket whitelist: rejects a look-alike bucket", () => {
  assert.equal(isAllowedRecordingBucket("interview-recordings-evil"), false);
});

test("bucket whitelist: rejects empty string", () => {
  assert.equal(isAllowedRecordingBucket(""), false);
});

test("bucket whitelist: rejects null / undefined / non-string", () => {
  assert.equal(isAllowedRecordingBucket(null), false);
  assert.equal(isAllowedRecordingBucket(undefined), false);
  assert.equal(isAllowedRecordingBucket(123), false);
  assert.equal(isAllowedRecordingBucket({}), false);
});

// --- isValidSessionId ---

test("session id: accepts a UUID", () => {
  assert.equal(isValidSessionId("3f2504e0-4f89-41d3-9a0c-0305e82c3301"), true);
});

test("session id: accepts a non-UUID seed id (obs-e2e-*)", () => {
  assert.equal(isValidSessionId("obs-e2e-12345"), true);
});

test("session id: accepts underscores and digits", () => {
  assert.equal(isValidSessionId("session_007"), true);
});

test("session id: rejects path traversal", () => {
  assert.equal(isValidSessionId("../etc/passwd"), false);
});

test("session id: rejects slashes", () => {
  assert.equal(isValidSessionId("a/b"), false);
});

test("session id: rejects whitespace and quotes (SQL-ish payloads)", () => {
  assert.equal(isValidSessionId("a' OR '1'='1"), false);
  assert.equal(isValidSessionId("a b"), false);
});

test("session id: rejects empty string", () => {
  assert.equal(isValidSessionId(""), false);
});

test("session id: rejects overly long input", () => {
  assert.equal(isValidSessionId("a".repeat(129)), false);
});

test("session id: rejects non-string", () => {
  assert.equal(isValidSessionId(null), false);
  assert.equal(isValidSessionId(undefined), false);
  assert.equal(isValidSessionId(42), false);
});

// --- interpretParseJobResponse ---

test("parse-job: success true with real data → not failed", () => {
  const result = interpretParseJobResponse({
    success: true,
    data: { title: "Backend Engineer", company: "Acme", responsibilities: ["Build APIs"] },
  });
  assert.equal(result.failed, false);
  assert.equal(result.message, null);
  assert.equal(result.data?.title, "Backend Engineer");
});

test("parse-job: success false with fallback data → failed but data preserved", () => {
  const result = interpretParseJobResponse({
    success: false,
    error: "PARSE_FAILED",
    data: { title: "Some Job", company: "Some Co" },
  });
  assert.equal(result.failed, true);
  assert.ok(result.message && result.message.length > 0);
  assert.equal(result.data?.title, "Some Job");
});

test("parse-job: success false without data → failed with null data", () => {
  const result = interpretParseJobResponse({ success: false, error: "PARSE_FAILED" });
  assert.equal(result.failed, true);
  assert.equal(result.data, null);
  assert.ok(result.message);
});

test("parse-job: legacy fallback marker in title (success true) → failed", () => {
  const result = interpretParseJobResponse({
    success: true,
    data: { title: "채용 공고 (AI 분석 불가)", company: "채용 공고" },
  });
  assert.equal(result.failed, true);
  assert.ok(result.message);
  // fallback 데이터는 폼 프리필용으로 보존한다.
  assert.equal(result.data?.company, "채용 공고");
});

test("parse-job: legacy fallback marker in responsibilities (success true) → failed", () => {
  const result = interpretParseJobResponse({
    success: true,
    data: { title: "정상 제목", responsibilities: ["AI 분석 실패 - 본문을 참고해주세요"] },
  });
  assert.equal(result.failed, true);
});

test("parse-job: normal data with unrelated title is not flagged as fallback", () => {
  const result = interpretParseJobResponse({
    success: true,
    data: { title: "AI 엔지니어", responsibilities: ["모델 학습"] },
  });
  assert.equal(result.failed, false);
});

test("parse-job: null response → failed defensively? no — treated as no-data non-failure", () => {
  // success 가 명시적 false 가 아니고 data 도 없으면 실패로 단정하지 않는다(상위에서 HTTP 에러로 이미 처리됨).
  const result = interpretParseJobResponse(null);
  assert.equal(result.failed, false);
  assert.equal(result.data, null);
});

test("parse-job: undefined response → not failed, null data", () => {
  const result = interpretParseJobResponse(undefined);
  assert.equal(result.failed, false);
  assert.equal(result.data, null);
});

test("parse-job: success true but data null → not failed, null data", () => {
  const result = interpretParseJobResponse({ success: true, data: null });
  assert.equal(result.failed, false);
  assert.equal(result.data, null);
});

test("parse-job: empty responsibilities array does not trip fallback detection", () => {
  const result = interpretParseJobResponse({
    success: true,
    data: { title: "정상", responsibilities: [] },
  });
  assert.equal(result.failed, false);
});

test("parse-job: fallback message is Korean and actionable", () => {
  const result = interpretParseJobResponse({ success: false });
  assert.match(result.message ?? "", /직접 입력|다시 시도/);
});
