import assert from "node:assert/strict";
import test from "node:test";

import { formatTranscriptForDisplay } from "@/lib/transcript-display";

test("formatTranscriptForDisplay collapses fragmented user transcript tokens", () => {
  assert.equal(
    formatTranscriptForDisplay("실 시 간 a i 면 접", "user"),
    "실시간 ai 면접",
  );
});

test("formatTranscriptForDisplay recompacts dense fragmented user transcript", () => {
  const formatted = formatTranscriptForDisplay(
    "세션별상태를가 볍게 유지 하고 이벤트 처리 비동기로분했으며서버인 스턴 나눠연결을산 시키 는방식 으로 병목줄여수십명접속황 에서 도과끊김없안정 적으로 운 영했습니다.",
    "user",
  );

  assert.match(formatted, /세션별 상태를 가볍게 유지하고/);
  assert.match(formatted, /병목 줄여/);
});
