import assert from "node:assert/strict";
import test from "node:test";

import { formatStreamingTranscriptForDisplay, formatTranscriptForDisplay } from "@/lib/transcript-display";

test("user captions standardize spoken technical terms while preserving answer content", () => {
  const raw = "실무 경험은 없지만 수업에서 스프링으로 crud를 만들어 봤고, 지금은 스프링 부트로 송금 api를 만들고 있습니다.";
  const expected = "실무 경험은 없지만 수업에서 스프링으로 CRUD를 만들어 봤고, 지금은 Spring Boot로 송금 API를 만들고 있습니다.";
  for (const format of [formatTranscriptForDisplay, formatStreamingTranscriptForDisplay]) {
    assert.equal(format(raw, "user"), expected);
    assert.equal(format(expected, "user"), expected);
    for (const untouched of ["김리버입니다.", "SpringBootApplication", "crudRepository", "RapidAPI", "스프링 부트캠프"]) {
      assert.equal(format(untouched, "user"), untouched);
    }
  }
});

test("transcript punctuation preserves numbers, versions, and dotted technical names", () => {
  const cases = [
    ["오류율을 0.15%로 줄였습니다.", ["0.15"]],
    ["Next.js와 Node.js를 사용했습니다.", ["Next.js", "Node.js"]],
    ["Python 3.11과 OAuth 2.0을 사용했습니다.", ["3.11", "2.0"]],
    ["12:30에 월 1,000건을 처리했습니다.", ["12:30", "1,000"]],
  ] as const;
  for (const format of [formatTranscriptForDisplay, formatStreamingTranscriptForDisplay]) {
    for (const role of ["user", "ai"] as const) {
      for (const [text, tokens] of cases) {
        const formatted = format(text, role);
        assert.equal(formatted.replace(/\s/gu, ""), text.replace(/\s/gu, ""));
        for (const token of tokens) assert.ok(formatted.includes(token), formatted);
        assert.equal(format(formatted, role), formatted);
      }
    }
  }
});

test("transcript punctuation still separates Korean sentences and lists", () => {
  assert.equal(
    formatTranscriptForDisplay("안녕하세요.반갑습니다!저는 백엔드,프론트엔드를 담당했습니다.", "user"),
    "안녕하세요. 반갑습니다! 저는 백엔드, 프론트엔드를 담당했습니다.",
  );
});

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
