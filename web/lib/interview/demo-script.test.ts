import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { DEMO_SCRIPT_PAIRS, findDemoScriptAnswer, isDemoScriptJobPayload } from "./demo-script";

const normalize = (text: string) => text.replace(/[^0-9A-Za-z가-힣]/g, "");

test("web script pairs match the FastAPI demo script word for word", () => {
  const python = normalize(
    // 테스트는 web/ 에서 실행한다.
    readFileSync(join(process.cwd(), "../ai-interview/app/interview/domain/demo_script.py"), "utf8"),
  );
  assert.equal(DEMO_SCRIPT_PAIRS.length, 13);
  for (const pair of DEMO_SCRIPT_PAIRS) {
    assert.ok(python.includes(normalize(pair.question)), `question missing: ${pair.question.slice(0, 30)}`);
    assert.ok(python.includes(normalize(pair.answer)), `answer missing: ${pair.answer.slice(0, 30)}`);
  }
});

test("finds the scripted answer from the shown question, tolerating STT-style drift", () => {
  assert.equal(findDemoScriptAnswer(DEMO_SCRIPT_PAIRS[3].question), DEMO_SCRIPT_PAIRS[3].answer);
  assert.equal(
    findDemoScriptAnswer("그럼 틀린 13 퍼센트는요 어떤 유형이었고 그걸 그냥 두셨어요"),
    DEMO_SCRIPT_PAIRS[4].answer,
  );
  assert.equal(findDemoScriptAnswer("오늘 점심 메뉴는 무엇인가요"), null);
});

test("only dozn sessions use the script", () => {
  assert.equal(isDemoScriptJobPayload({ company: "더즌(dozn)" }), true);
  assert.equal(isDemoScriptJobPayload({ company: "DOZN" }), true);
  assert.equal(isDemoScriptJobPayload({ demoScript: "dozn-2026-backend" }), true);
  assert.equal(isDemoScriptJobPayload({ company: "클래스101" }), false);
  assert.equal(isDemoScriptJobPayload(null), false);
});
