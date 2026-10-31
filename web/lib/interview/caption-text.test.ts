import assert from "node:assert/strict";
import test from "node:test";
import { preferLongerCaption, selectUserCaptionText } from "./caption-text";

test("Cloud STT can replace a longer hypothesis with a shorter correction", () => {
  assert.equal(
    selectUserCaptionText("캐시를 도입해서 응답 시간을 크게 줄였습니다.", "캐시로 응답 시간을 줄였습니다.", "google-cloud-stt"),
    "캐시로 응답 시간을 줄였습니다.",
  );
});

test("Cloud STT can retract an uncertain suffix and then extend the corrected snapshot", () => {
  const corrected = selectUserCaptionText("웹소켓을 적용했습니다.", "웹소켓을", "google-cloud-stt");
  assert.equal(corrected, "웹소켓을");
  assert.equal(selectUserCaptionText(corrected, "웹소켓을 검토했습니다.", "google-cloud-stt"), "웹소켓을 검토했습니다.");
});

test("an empty Cloud STT update keeps the existing caption", () => {
  assert.equal(selectUserCaptionText("답변입니다.", "  ", "google-cloud-stt"), "답변입니다.");
});

test("other providers and AI captions retain their existing merge policy", () => {
  assert.equal(selectUserCaptionText("웹소켓을 적용했습니다.", "웹소켓을", "gemini-live-single"), "웹소켓을 적용했습니다.");
  assert.equal(preferLongerCaption("질문입니다.", "질문"), "질문입니다.");
});
