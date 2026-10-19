import assert from "node:assert/strict";
import test from "node:test";
import { buildCareerDemoReply, fitCareerDemoAnswer, selectCareerDemoProjects } from "./cover-letter";
import { CAREER_DEMO_JOB_URL, getCareerDemoJobPosting, isCareerDemoEnabled, isCareerDemoJobUrl } from "./job-posting";
import { createCareerDemoStream, waitForDemo } from "./stream";
import { getVisibleAssistantContent, parseAssistantProtocol } from "@/components/features/career/cover-letter-wizard/model";
import { interpretParseJobResponse } from "@/lib/interview/validation";

const records = [
  { id: "hello", company: "고용노동부 헬로프렌즈 Vizabridge" },
  { id: "tiny", company: "고용노동부 티니타이거 쇼핑몰 리뉴얼" },
  { id: "blavers", company: "블레이버스 MVP 개발 해커톤" },
  { id: "other", company: "다른 프로젝트" },
];
const projects = selectCareerDemoProjects(records, ["hello", "tiny", "blavers"]);
const question = { title: "지원동기", maxChars: 700 };

test("demo scope only accepts the exact agreed Wanted posting", () => {
  for (const url of [CAREER_DEMO_JOB_URL, `${CAREER_DEMO_JOB_URL}/?utm_source=demo#top`, "https://wanted.co.kr/wd/387806"]) {
    assert.equal(isCareerDemoJobUrl(url), true);
  }
  for (const url of ["https://wanted.co.kr.evil.test/wd/387806", "https://www.wanted.co.kr/wd/387807", "https://www.wanted.co.kr/wd/387806/other", "file:///wd/387806", null]) {
    assert.equal(isCareerDemoJobUrl(url), false);
  }
  assert.equal(isCareerDemoEnabled(undefined), true);
  assert.equal(isCareerDemoEnabled(" LIVE "), false);
});

test("posting fixture satisfies the existing analysis form contract", () => {
  const data = getCareerDemoJobPosting();
  const interpreted = interpretParseJobResponse({ success: true, data });
  assert.equal(interpreted.failed, false);
  assert.equal(data.company, "클래스101(Class101)");
  assert.ok(data.responsibilities.length && data.requirements.length && data.preferred.length);
  assert.ok(data.techStack.length && data.culture.length);
  assert.deepEqual(data.schedules, []);
  assert.match(data.description, /상시채용/);
  data.techStack.push("mutation");
  assert.equal(getCareerDemoJobPosting().techStack.includes("mutation"), false);
});

test("only selected supported owner records contribute evidence", () => {
  assert.deepEqual(selectCareerDemoProjects(records, ["tiny", "missing", "other"]).map((project) => project.name), ["티니타이거"]);
  assert.deepEqual(selectCareerDemoProjects(null, ["tiny"]), []);
  assert.deepEqual(selectCareerDemoProjects(records, null), []);
  assert.equal(selectCareerDemoProjects([...records, records[0]], ["hello"]).length, 1);
  const reply = buildCareerDemoReply({ operation: "intro", selectedQuestion: question }, selectCareerDemoProjects(records, ["tiny"]));
  assert.ok(reply.content.includes("티니타이거"));
  assert.doesNotMatch(reply.content, /헬로프렌즈|블레이버스/);
});

test("intro and direction return different workflow stages without an apply candidate", () => {
  const intro = buildCareerDemoReply({ operation: "intro", selectedQuestion: question }, projects);
  const parsedIntro = parseAssistantProtocol(intro.content + intro.protocol);
  assert.equal(parsedIntro.stage, "direction");
  assert.equal(parsedIntro.ready, false);
  assert.equal(parsedIntro.answer, "");
  const direction = buildCareerDemoReply({ workflowStage: "direction", selectedQuestion: question, messages: [{ role: "user", content: "데이터 정확성과 협업을 강조하고 싶어요" }] }, projects);
  assert.equal(parseAssistantProtocol(direction.protocol).stage, "draft");
  assert.equal(parseAssistantProtocol(direction.protocol).answer, "");
});

test("explicit draft requests work from the first direction stage", () => {
  const reply = buildCareerDemoReply({ workflowStage: "direction", selectedQuestion: question, messages: [{ role: "user", content: "헬로프렌즈를 중심으로 바로 초안을 써줘" }] }, projects);
  const parsed = parseAssistantProtocol(reply.content + "\n" + reply.protocol);
  assert.equal(parsed.stage, "refine");
  assert.ok(parsed.answer.includes("헬로프렌즈"));
  assert.equal(parsed.ready, false);
  assert.ok(parsed.answer.length <= 700);
});

test("question-specific drafts use appropriate selected experience and no invented payment work", () => {
  const titles = ["자기소개", "지원동기", "입사 후 포부", "장점과 단점", "성장 과정", "협업 경험", "도전 경험", "갈등 경험", "직무 역량", "대표 프로젝트", "자유 문항"];
  const answers = titles.map((title) => {
    const reply = buildCareerDemoReply({ workflowStage: "draft", selectedQuestion: { title, maxChars: 600 } }, projects);
    const parsed = parseAssistantProtocol(reply.protocol);
    assert.ok(parsed.answer.length > 100 && parsed.answer.length <= 600, title);
    assert.equal(parsed.competency, true);
    assert.equal(parsed.ready, false);
    assert.doesNotMatch(parsed.answer, /결제 시스템을 구현했|정산 시스템을 개발했|매출.*%|어린 시절/);
    return parsed.answer;
  });
  assert.equal(new Set(answers).size, 10); // The unknown title uses the competency template.
});

test("a requested project switches the evidence only when it was selected", () => {
  const request = { workflowStage: "refine", operation: "tone", selectedQuestion: question, currentAnswer: "기존 문장입니다.", messages: [{ role: "user", content: "티니타이거 경험으로 다시 작성해줘" }] };
  const reply = buildCareerDemoReply(request, projects);
  assert.match(parseAssistantProtocol(reply.protocol).answer, /티니타이거/);
  const onlyHello = buildCareerDemoReply({ ...request, currentAnswer: "" }, selectCareerDemoProjects(records, ["hello"]));
  assert.doesNotMatch(parseAssistantProtocol(onlyHello.protocol).answer, /티니타이거|블레이버스/);
});

test("refinement preserves the user's edited content", () => {
  const currentAnswer = "저는 문서 구조를 먼저 확인했습니다. 사용자가 근거를 찾을 수 있게 했어요.";
  const reply = buildCareerDemoReply({ operation: "tone", workflowStage: "refine", selectedQuestion: question, currentAnswer }, projects);
  const answer = parseAssistantProtocol(reply.protocol).answer;
  assert.match(answer, /문서 구조를 먼저 확인했습니다/);
  assert.match(answer, /찾을 수 있게 했습니다/);
  assert.doesNotMatch(answer, /해커톤/);
});

test("length adjustment respects both requested and form ceilings", () => {
  const reply = buildCareerDemoReply({ workflowStage: "refine", operation: "fit-length", selectedQuestion: { title: "직무 역량", maxChars: 250 }, currentAnswer: "업무 구조를 먼저 정리했습니다. ".repeat(30), messages: [{ role: "user", content: "200자로 줄여줘" }] }, projects);
  const answer = parseAssistantProtocol(reply.protocol).answer;
  assert.ok(answer.length > 0 && answer.length <= 200);
  assert.ok(answer.endsWith("."));
  for (const maxChars of [40, 100, 300, 500]) {
    assert.ok(fitCareerDemoAnswer("매우 긴 단일 문장".repeat(100), maxChars).length <= maxChars);
  }
});

test("the suggested stronger-opening action changes the opening and preserves experience", () => {
  const currentAnswer = "저는 개발자입니다. 헬로프렌즈에서 문서 검색과 근거 제시를 구현했습니다.";
  const reply = buildCareerDemoReply({ workflowStage: "refine", operation: "tone", selectedQuestion: question, currentAnswer, messages: [{ role: "user", content: "첫 문장을 더 강하게 바꿔줘" }] }, projects);
  const answer = parseAssistantProtocol(reply.protocol).answer;
  assert.ok(answer.startsWith("사용자가 안심하고 배우는 경험"));
  assert.ok(answer.includes("헬로프렌즈에서 문서 검색과 근거 제시를 구현했습니다."));
  assert.ok(!answer.includes("저는 개발자입니다."));
});

test("a restored answer can be shortened even when its legacy workflow is direction", () => {
  const reply = buildCareerDemoReply({ workflowStage: "direction", selectedQuestion: question, currentAnswer: "직접 맡은 역할과 협업 과정을 정리했습니다. ".repeat(20), messages: [{ role: "user", content: "300자 안으로 줄여줘" }] }, projects);
  const parsed = parseAssistantProtocol(reply.protocol);
  assert.equal(parsed.stage, "refine");
  assert.ok(parsed.answer.length > 0 && parsed.answer.length <= 300);
});

test("final confirmation is ready only after an answer has been applied", () => {
  const request = { workflowStage: "confirm", selectedQuestion: question };
  assert.equal(parseAssistantProtocol(buildCareerDemoReply(request, projects).protocol).ready, false);
  const confirmed = parseAssistantProtocol(buildCareerDemoReply({ ...request, currentAnswer: "직접 작성한 최종 답변입니다." }, projects).protocol);
  assert.equal(confirmed.stage, "confirm");
  assert.equal(confirmed.ready, true);
  assert.equal(confirmed.answer, "직접 작성한 최종 답변입니다.");
});

test("typing never exposes complete or partial internal protocol tags", () => {
  const text = "사용자에게 보이는 답변입니다.\n\n<dibut_state>\nstage=refine\n</dibut_state><dibut_answer>답변</dibut_answer>";
  const visible = "사용자에게 보이는 답변입니다.";
  for (let index = visible.length; index <= text.length; index += 1) {
    assert.equal(getVisibleAssistantContent(text.slice(0, index)).trim(), visible);
  }
  assert.equal(getVisibleAssistantContent("일반 문장입니다."), "일반 문장입니다.");
});

test("simulated stream delivers valid UTF-8 in multiple chunks and preserves the protocol", async () => {
  const reply = buildCareerDemoReply({ workflowStage: "draft", selectedQuestion: question }, projects);
  const response = createCareerDemoStream(reply, undefined, { initialDelayMs: 0, chunkDelayMs: 0, chunkSize: 30 });
  assert.match(response.headers.get("Content-Type") || "", /text\/plain/);
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let chunks = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks += 1;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  assert.ok(chunks > 2);
  assert.equal(text, `${reply.content}\n\n${reply.protocol}`);
  assert.ok(parseAssistantProtocol(text).answer.length > 0);
});

test("aborting or cancelling a demo clears its pending delay", async () => {
  const abort = new AbortController();
  const wait = waitForDemo(10000, abort.signal);
  abort.abort();
  await assert.rejects(wait, { name: "AbortError" });
  const response = createCareerDemoStream({ content: "답변", protocol: "" }, undefined, { initialDelayMs: 10000, chunkDelayMs: 0, chunkSize: 1 });
  const reader = response.body!.getReader();
  const read = reader.read();
  await reader.cancel();
  assert.equal((await read).done, true);
});
