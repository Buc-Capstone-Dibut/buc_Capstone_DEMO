import assert from "node:assert/strict";
import test from "node:test";
import { createInterviewConsoleCoach, isLikelyInterviewQuestion } from "@/lib/interview/console-coaching";

function setup() {
  let sessionId = "session-one";
  const requests: { question: string; signal: AbortSignal; resolve: (answer: string) => void; reject: (reason: Error) => void }[] = [];
  const printed: string[] = [];
  const notices: string[] = [];
  const coach = createInterviewConsoleCoach({
    getSessionId: () => sessionId,
    requestAnswer: async (_, question, signal) => new Promise<string>((resolve, reject) => requests.push({ question, signal, resolve, reject })),
    printAnswer: (_, answer) => printed.push(answer),
    notify: (message) => notices.push(message),
  });
  return { ...coach, requests, printed, notices, setSessionId: (id: string) => { sessionId = id; } };
}

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("waits for a console command; concurrent commands share one request and reuse its answer", async () => {
  const coach = setup();
  coach.observeQuestion("성능을 개선한 경험을 설명해 주세요.", "turn-one");
  await tick();
  assert.equal(coach.requests.length, 0);
  const first = coach.commands.answer();
  const second = coach.commands.answer();
  assert.equal(first, second);
  await tick();
  assert.equal(coach.requests.length, 1);
  coach.requests[0].resolve("측정한 병목부터 개선했습니다.");
  assert.equal(await first, "측정한 병목부터 개선했습니다.");
  await coach.commands.answer();
  assert.equal(coach.requests.length, 1);
  assert.equal(coach.printed.length, 2);
});

test("start covers the current and future questions; repeated transcripts do not generate twice", async () => {
  const coach = setup();
  await coach.commands.start();
  coach.observeQuestion("캐시 무효화는 어떻게 설계하나요?", "one");
  coach.observeQuestion("캐시 무효화는 어떻게 설계하나요?", "one");
  await tick();
  assert.equal(coach.requests.length, 1);
  coach.requests[0].resolve("변경 시 무효화와 TTL을 함께 적용하겠습니다.");
  await tick();
  await coach.commands.start();
  assert.equal(coach.requests.length, 1);
  coach.observeQuestion("트랜잭션 격리 수준은 무엇인가요?", "two");
  await tick();
  assert.equal(coach.requests.length, 2);
  coach.dispose();
});

test("a new question cancels the old generation and hides its late response", async () => {
  const coach = setup();
  coach.observeQuestion("첫 프로젝트를 설명해 주세요.", "one");
  const old = coach.commands.start();
  await tick();
  coach.observeQuestion("다음 프로젝트는 어떤가요?", "two");
  await tick();
  assert.equal(coach.requests[0].signal.aborted, true);
  coach.requests[0].resolve("이전 질문 답변");
  assert.equal(await old, null);
  coach.requests[1].resolve("현재 질문 답변");
  await tick();
  assert.deepEqual(coach.printed, ["현재 질문 답변"]);
});

test("stop aborts in-flight work, disables automatic requests, and still permits a manual answer", async () => {
  const coach = setup();
  coach.observeQuestion("협업 경험을 설명해 주세요.");
  const pending = coach.commands.start();
  await tick();
  coach.commands.stop();
  assert.equal(coach.requests[0].signal.aborted, true);
  coach.requests[0].resolve("취소된 답변");
  assert.equal(await pending, null);
  coach.observeQuestion("새 질문에 답해 주실 수 있나요?");
  await tick();
  assert.equal(coach.requests.length, 1);
  const manual = coach.commands.answer();
  await tick();
  coach.requests[1].resolve("직접 요청한 답변");
  assert.equal(await manual, "직접 요청한 답변");
});

test("closing, session changes and disposal never expose a previous question's answer", async () => {
  const coach = setup();
  coach.observeQuestion("자기소개 부탁드립니다.");
  coach.setSessionId("another-session");
  assert.equal(await coach.commands.answer(), null);
  assert.equal(coach.requests.length, 0);
  coach.observeQuestion("오늘 면접은 여기까지입니다. 수고하셨습니다.");
  assert.equal(await coach.commands.answer(), null);
  coach.dispose();
  coach.observeQuestion("왜 이 기술을 선택했나요?");
  await coach.commands.start();
  assert.equal(coach.requests.length, 0);
  assert.equal(isLikelyInterviewQuestion("이 구조를 설명해 주세요."), true);
  assert.equal(isLikelyInterviewQuestion("수고하셨습니다."), false);
});

test("generation failures are reported without unhandled rejection and can be retried", async () => {
  const coach = setup();
  coach.observeQuestion("이 설계의 이유가 무엇인가요?");
  const first = coach.commands.answer();
  await tick();
  coach.requests[0].reject(new Error("upstream unavailable"));
  assert.equal(await first, null);
  assert.match(coach.notices[0], /다시 시도/);
  const retry = coach.commands.answer();
  await tick();
  coach.requests[1].resolve("요구사항에 맞춰 선택했습니다.");
  assert.ok(await retry);
});
