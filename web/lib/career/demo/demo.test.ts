import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCareerDemoFullCoverLetter,
  buildCareerDemoProjectStory,
  buildCareerDemoReply,
  fitCareerDemoAnswer,
  getAllCareerDemoEvidence,
  isCareerDemoPlainCoverLetterRequest,
  selectCareerDemoProjects,
} from "./cover-letter";
import { CAREER_DEMO_JOB_URL, getCareerDemoJobPosting, isCareerDemoEnabled } from "./job-posting";
import { buildCareerDemoPortfolioEdit, getCareerDemoShowcaseFill } from "./portfolio";
import {
  buildCareerDemoCoachRefinement,
  buildCareerDemoResumeResult,
  getCareerDemoStrengthSuggestions,
  polishCareerDemoResumeText,
} from "./resume";
import { createCareerDemoStream, waitForDemo } from "./stream";
import { getVisibleAssistantContent, parseAssistantProtocol } from "@/components/features/career/cover-letter-wizard/model";
import { interpretParseJobResponse } from "@/lib/interview/validation";
import { normalizeResumePayload } from "@/app/my/[handle]/profile-utils";

const records = [
  { id: "hello", company: "고용노동부_청년미래일경험 ㈜헬로프렌즈_외국인 행정·비자 플랫폼 'Vizabridge' IT·AI고도화 프로젝트" },
  { id: "tiny", company: "고용노동부_청년미래일경험_㈜에쉬 티니타이거 쇼핑몰 리뉴얼" },
  { id: "blavers", company: "2026제 4회  블레이버스 MVP 개발 해커톤_창업MVP개발" },
  { id: "other", company: "다른 프로젝트" },
];
const projects = selectCareerDemoProjects(records, ["hello", "tiny", "blavers"]);
const question = { title: "지원동기", maxChars: 700 };

async function readAll(response: Response) {
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
  return { text: text + decoder.decode(), chunks };
}

test("demo mode is the default and only CAREER_AI_MODE=live disables it", () => {
  assert.equal(isCareerDemoEnabled(undefined), true);
  assert.equal(isCareerDemoEnabled("demo"), true);
  assert.equal(isCareerDemoEnabled(" LIVE "), false);
});

test("Acanet posting fixture satisfies the parse-job contract for every caller", () => {
  const data = getCareerDemoJobPosting();
  const interpreted = interpretParseJobResponse({ success: true, data });
  assert.equal(interpreted.failed, false);
  assert.equal(data.company, "㈜아카넷");
  // Both the career dialog and the interview setup map `title` to the role field.
  assert.equal(data.title, "웹개발자 (Java 웹프로그래머) - 신입");
  assert.equal(data.url, CAREER_DEMO_JOB_URL);
  assert.match(CAREER_DEMO_JOB_URL, /Gno=50016735$/);
  assert.ok(data.responsibilities.length && data.requirements.length && data.preferred.length);
  assert.ok(data.techStack.includes("Java") && data.culture.length);
  assert.ok(data.preferred.some((item) => item.includes("SQLD")));
  assert.deepEqual(data.schedules, [{ kind: "deadline", title: "서류 접수 마감", startAt: "2026-11-06" }]);
  assert.doesNotMatch(JSON.stringify(data), /클래스101|Class101|2026\.10\.18/);
  data.techStack.push("mutation");
  assert.equal(getCareerDemoJobPosting().techStack.includes("mutation"), false);
});

test("selected owner records narrow the evidence; no match falls back to all three", () => {
  assert.deepEqual(selectCareerDemoProjects(records, ["tiny", "missing", "other"]).map((project) => project.name), ["티니타이거"]);
  assert.deepEqual(selectCareerDemoProjects(null, ["tiny"]), []);
  assert.deepEqual(selectCareerDemoProjects(records, null), []);
  assert.equal(selectCareerDemoProjects([...records, records[0]], ["hello"]).length, 1);
  assert.deepEqual(getAllCareerDemoEvidence().map((project) => project.name), ["헬로프렌즈", "티니타이거", "블레이버스"]);
  const reply = buildCareerDemoReply({ operation: "intro", selectedQuestion: question }, selectCareerDemoProjects(records, ["tiny"]));
  assert.ok(reply.content.includes("티니타이거"));
  assert.doesNotMatch(reply.content, /헬로프렌즈|블레이버스/);
  // An empty selection never rejects the request.
  const fallback = buildCareerDemoReply({ operation: "intro", selectedQuestion: question }, []);
  assert.match(fallback.content, /헬로프렌즈·티니타이거·블레이버스/);
});

test("intro and direction return different workflow stages without an apply candidate", () => {
  const intro = buildCareerDemoReply({ operation: "intro", selectedQuestion: question }, projects);
  const parsedIntro = parseAssistantProtocol(intro.content + intro.protocol);
  assert.equal(parsedIntro.stage, "direction");
  assert.equal(parsedIntro.ready, false);
  assert.equal(parsedIntro.answer, "");
  assert.match(intro.content, /^안녕하세요, 디벗 AI 자소서 컨설팅입니다\. ㈜아카넷/);
  const direction = buildCareerDemoReply({ workflowStage: "direction", selectedQuestion: question, messages: [{ role: "user", content: "데이터 정확성과 협업을 강조하고 싶어요" }] }, projects);
  assert.equal(parseAssistantProtocol(direction.protocol).stage, "draft");
  assert.equal(parseAssistantProtocol(direction.protocol).answer, "");
});

test("the intro prompt listing every project does not override the question's preferred evidence", () => {
  const introPrompt = "[기반 프로젝트]\n블레이버스 해커톤\n티니타이거\n헬로프렌즈";
  const reply = buildCareerDemoReply({ operation: "intro", selectedQuestion: { title: "협업 경험", maxChars: 700 }, messages: [{ role: "user", content: introPrompt }] }, projects);
  assert.match(reply.content, /블레이버스의 우선순위 합의와 팀 리딩 경험/);
});

test("explicit draft requests work from the first direction stage", () => {
  const reply = buildCareerDemoReply({ workflowStage: "direction", selectedQuestion: question, messages: [{ role: "user", content: "헬로프렌즈를 중심으로 바로 초안을 써줘" }] }, projects);
  const parsed = parseAssistantProtocol(reply.content + "\n" + reply.protocol);
  assert.equal(parsed.stage, "refine");
  assert.match(parsed.answer, /헬로프렌즈/);
  assert.match(parsed.answer, /아카넷/);
  assert.equal(parsed.ready, false);
  assert.ok(parsed.answer.length <= 700);
});

test("question-specific drafts fit the form, stay on the Acanet target and keep the shared numbers", () => {
  const titles = ["자기소개", "지원동기", "입사 후 포부", "장점과 단점", "성장 과정", "협업 경험", "도전 경험", "갈등 경험", "직무 역량", "대표 프로젝트", "자유 문항"];
  const answers = titles.map((title) => {
    const reply = buildCareerDemoReply({ workflowStage: "draft", selectedQuestion: { title, maxChars: 600 } }, projects);
    const parsed = parseAssistantProtocol(reply.protocol);
    assert.ok(parsed.answer.length > 300 && parsed.answer.length <= 600, `${title}: ${parsed.answer.length}`);
    assert.equal(parsed.competency, true);
    assert.equal(parsed.ready, false);
    assert.doesNotMatch(parsed.answer, /클래스101|결제|정산|어린 시절/);
    return parsed.answer;
  });
  assert.equal(new Set(answers).size, 10); // The unknown title uses the competency template.
  assert.ok(answers.some((answer) => /약 87%/.test(answer)));
});

test("a requested project switches the evidence only when it was selected", () => {
  const request = { workflowStage: "refine", operation: "tone", selectedQuestion: question, currentAnswer: "기존 문장입니다.", messages: [{ role: "user", content: "티니타이거 경험으로 다시 작성해줘" }] };
  const reply = buildCareerDemoReply(request, projects);
  assert.match(parseAssistantProtocol(reply.protocol).answer, /티니타이거/);
  const onlyHello = buildCareerDemoReply({ ...request, currentAnswer: "" }, selectCareerDemoProjects(records, ["hello"]));
  assert.doesNotMatch(parseAssistantProtocol(onlyHello.protocol).answer, /티니타이거|블레이버스/);
});

test("refinement preserves the user's edited content and ties it to Acanet", () => {
  const currentAnswer = "저는 문서 구조를 먼저 확인했습니다. 사용자가 근거를 찾을 수 있게 했어요.";
  const reply = buildCareerDemoReply({ operation: "tone", workflowStage: "refine", selectedQuestion: question, currentAnswer }, projects);
  const answer = parseAssistantProtocol(reply.protocol).answer;
  assert.match(answer, /문서 구조를 먼저 확인했습니다/);
  assert.match(answer, /찾을 수 있게 했습니다/);
  assert.match(answer, /아카넷에서도/);
  assert.doesNotMatch(answer, /해커톤/);
});

test("length adjustment respects both requested and form ceilings and keeps paragraphs", () => {
  const reply = buildCareerDemoReply({ workflowStage: "refine", operation: "fit-length", selectedQuestion: { title: "직무 역량", maxChars: 250 }, currentAnswer: "업무 구조를 먼저 정리했습니다. ".repeat(30), messages: [{ role: "user", content: "200자로 줄여줘" }] }, projects);
  const answer = parseAssistantProtocol(reply.protocol).answer;
  assert.ok(answer.length > 0 && answer.length <= 200);
  assert.ok(answer.endsWith("."));
  for (const maxChars of [40, 100, 300, 500]) {
    assert.ok(fitCareerDemoAnswer("매우 긴 단일 문장".repeat(100), maxChars).length <= maxChars);
  }
  const fitted = fitCareerDemoAnswer(`첫 문단 첫 문장입니다. 첫 문단 둘째 문장입니다.\n\n둘째 문단입니다. ${"아주 긴 마지막 문장".repeat(10)}.`, 60);
  assert.equal(fitted, "첫 문단 첫 문장입니다. 첫 문단 둘째 문장입니다.\n\n둘째 문단입니다.");
});

test("the suggested stronger-opening action changes the opening and preserves experience", () => {
  const currentAnswer = "저는 개발자입니다. 헬로프렌즈에서 문서 검색과 근거 제시를 구현했습니다.";
  const reply = buildCareerDemoReply({ workflowStage: "refine", operation: "tone", selectedQuestion: question, currentAnswer, messages: [{ role: "user", content: "첫 문장을 더 강하게 바꿔줘" }] }, projects);
  const answer = parseAssistantProtocol(reply.protocol).answer;
  assert.ok(answer.startsWith("매일 쓰던 학사시스템을"));
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
  const { text, chunks } = await readAll(response);
  assert.ok(chunks > 2);
  assert.equal(text, `${reply.content}\n\n${reply.protocol}`);
  assert.ok(parseAssistantProtocol(text).answer.length > 0);
});

test("the resume assistant gets the full plain letter with no protocol", async () => {
  // ResumeAiAssistant body: no selectedQuestion / operation / workflowStage.
  assert.equal(isCareerDemoPlainCoverLetterRequest({ messages: [] }), true);
  assert.equal(isCareerDemoPlainCoverLetterRequest({ operation: "intro", workflowStage: "direction" }), false);
  assert.equal(isCareerDemoPlainCoverLetterRequest({ selectedQuestion: { title: "지원동기" }, workflowStage: "draft" }), false);
  const letter = buildCareerDemoFullCoverLetter();
  for (const heading of ["[지원동기]", "[직무역량]", "[문제해결·협업]", "[입사 후 포부]"]) {
    assert.ok(letter.content.includes(heading), heading);
  }
  const { text } = await readAll(createCareerDemoStream(letter, undefined, { initialDelayMs: 0, chunkDelayMs: 0, chunkSize: 50 }));
  assert.equal(text, letter.content);
  assert.doesNotMatch(text, /dibut_/);
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

test("tailored resume keeps the user's items and order while rewriting matched copy", () => {
  const current = normalizeResumePayload({
    personalInfo: { name: "김디벗", email: "dibut2026@dibut.kr", phone: "010-2026-0608", intro: "", links: { github: "github.com/dibut2026" } },
    education: [{ id: "edu-1", school: "부천대학교", major: "", startDate: "", endDate: "", status: "enrolled", included: true }],
    experience: [
      { id: "exp-tiny", company: "㈜에쉬 티니타이거", position: "풀스택", period: "2024.09 ~ 2024.12", description: "원문" },
      { id: "exp-other", company: "카페 아르바이트", position: "바리스타", period: "2023", description: "그대로" },
    ],
    projects: [
      { id: "p-blavers", name: "블레이버스 MVP 해커톤", period: "2026.02", description: "", techStack: ["Next.js"], achievements: [] },
      { id: "p-hello", name: "Vizabridge RAG", period: "2026.04 ~ 06", description: "", techStack: ["Python"], achievements: [] },
    ],
    skills: [{ name: "Java", level: "Intermediate" }],
    selfIntroduction: "아주 긴 기존 자기소개 ".repeat(10),
  });
  const result = buildCareerDemoResumeResult(current, "");
  const next = result.resumePayload;
  assert.equal(result.title, "김정환 - ㈜아카넷 웹개발자(Java) 맞춤 이력서");
  assert.deepEqual(result.applicationTarget.company, "㈜아카넷");
  assert.equal(result.applicationTarget.role, "웹개발자(Java) 신입");
  assert.ok(result.applicationTarget.jobDescription.includes("aXis Platform"));
  assert.ok(result.fitSummary.length >= 3 && result.fitSummary.length <= 4);
  assert.equal(next.personalInfo.name, "김정환");
  assert.equal(next.personalInfo.email, "dibut2026@dibut.kr");
  assert.ok(next.selfIntroduction.length <= 50); // longer text would be copied into the cover-letter pool
  assert.deepEqual(next.experience.map((item) => item.id), ["exp-tiny", "exp-other"]);
  assert.match(next.experience[0].description, /낙관적 업데이트/);
  assert.equal(next.experience[1].description, "그대로");
  assert.deepEqual(next.projects.map((item) => item.id), ["p-blavers", "p-hello"]);
  assert.match(next.projects[1].achievements.join(" "), /87%/);
  assert.deepEqual(next.projects[0].techStack, ["Next.js"]);
  assert.ok(next.skills.every((skill) => skill.category));
  assert.deepEqual(next.education.map((item) => [item.id, item.major, item.endDate, item.status]), [["edu-1", "컴퓨터소프트웨어과", "2027-02", "expected"]]);
  assert.equal(buildCareerDemoResumeResult(normalizeResumePayload({ education: [] })).resumePayload.education[0].school, "부천대학교");
});

test("resume coach demo keeps raw fields and answers by request type", () => {
  const raw = { personalInfo: { name: "a", email: "", phone: "", intro: "", links: {} }, education: [], experience: [], skills: [], selfIntroduction: "유지", projects: [], timeline: [{ id: "t1" }] };
  const polished = polishCareerDemoResumeText(raw as never) as unknown as typeof raw;
  assert.deepEqual(polished.timeline, [{ id: "t1" }]);
  assert.equal(polished.selfIntroduction, "유지");
  assert.ok(buildCareerDemoCoachRefinement("더 짧게 줄여줘").length < 900);
  assert.match(buildCareerDemoCoachRefinement("아카넷에 더 맞춰줘"), /전자정부 표준프레임워크로 수강신청 예제/);
  assert.equal(getCareerDemoStrengthSuggestions().length, 4);
  assert.match(buildCareerDemoProjectStory("칸반 실시간 동기화 - 티니타이거"), /버전 값/);
  assert.match(buildCareerDemoProjectStory(""), /Vizabridge/);
});

const pages = [
  { id: "p-cover", type: "cover", title: "김정환 포트폴리오", subtitle: "", narrative: "", emphasis: ["Java", "RAG"], blocks: [{ id: "b-m", type: "metric" }] },
  {
    id: "p-hello",
    type: "project-detail",
    title: "Vizabridge RAG 어시스턴트",
    narrative: "첫 문장입니다. 둘째 문장입니다. 셋째 문장입니다.",
    emphasis: ["pgvector"],
    blocks: [
      { id: "b-flow", type: "flow", items: ["수집", "정제", "임베딩"] },
      { id: "b-call", type: "callout" },
    ],
  },
  { id: "p-skills", type: "skills", title: "기술", blocks: [{ id: "b-tags", type: "tags", items: ["Java", "SQL", "Python"] }] },
  { id: "p-contact", type: "contact", title: "연락처", blocks: [] },
];
const ALLOWED_FIELDS = ["title", "subtitle", "eyebrow", "intent", "narrative", "emphasis", "visible"];

test("portfolio AI edit demo builds safe patches from the real pages", () => {
  const ids = new Set(pages.map((page) => page.id));
  const tone = buildCareerDemoPortfolioEdit({ pages, activePageId: "p-hello", message: "아카넷 공고에 맞게 다듬어줘" });
  assert.equal(tone.patches.length, 1);
  const patch = tone.patches[0] as { op: string; pageId: string; fields: Record<string, string> };
  assert.equal(patch.op, "patch_page");
  assert.equal(patch.pageId, "p-hello");
  assert.ok(Object.keys(patch.fields).every((key) => ALLOWED_FIELDS.includes(key)));
  assert.match(patch.fields.subtitle, /1,200건/);
  assert.match(patch.fields.narrative, /^첫 문장입니다\. 둘째 문장입니다\. 이 경험은/);
  assert.match(tone.reply, /㈜아카넷/);

  const cover = buildCareerDemoPortfolioEdit({ pages, activePageId: "p-hello", message: "표지 톤 부드럽게" });
  assert.equal(cover.patches[0].pageId, "p-cover");
  assert.deepEqual(buildCareerDemoPortfolioEdit({ pages, message: "마지막 페이지 숨겨" }).patches, [{ op: "toggle_visibility", pageId: "p-contact", visible: false }]);
  assert.deepEqual(buildCareerDemoPortfolioEdit({ pages, activePageId: "p-hello", message: "callout 빼줘" }).patches, [{ op: "delete_block", pageId: "p-hello", blockId: "b-call" }]);
  assert.deepEqual(buildCareerDemoPortfolioEdit({ pages, activePageId: "p-skills", message: "Python 빼줘" }).patches, [{ op: "update_block_items", pageId: "p-skills", blockId: "b-tags", items: ["Java", "SQL"] }]);
  assert.deepEqual(buildCareerDemoPortfolioEdit({ pages, activePageId: "p-cover", message: "RAG 키워드 빼줘" }).patches, [{ op: "patch_page", pageId: "p-cover", fields: { emphasis: ["Java"] } }]);
  const flow = buildCareerDemoPortfolioEdit({ pages, activePageId: "p-hello", message: "흐름 단계를 4개로 정리" }).patches[0];
  assert.equal((flow.items as string[]).length, 4);
  const metric = buildCareerDemoPortfolioEdit({ pages, activePageId: "p-hello", message: "핵심 지표 카드 하나 추가해줘" }).patches[0] as { op: string; block: { type: string; value: string } };
  assert.deepEqual([metric.op, metric.block.type, metric.block.value], ["add_block", "metric", "87%"]);
  // Skills pages do not render metric blocks, so the request falls back to a text patch.
  assert.equal(buildCareerDemoPortfolioEdit({ pages, activePageId: "p-skills", message: "지표 카드 추가해줘" }).patches[0].op, "patch_page");
  for (const message of ["아무 요청", "표지 톤 부드럽게", "callout 빼줘", "흐름 단계 정리"]) {
    for (const p of buildCareerDemoPortfolioEdit({ pages, activePageId: "p-hello", message }).patches) {
      assert.ok(ids.has(String(p.pageId)), message);
    }
  }
  assert.deepEqual(buildCareerDemoPortfolioEdit({ pages: [], message: "다듬어줘" }).patches, []);
});

test("showcase fill respects the Neon Editorial copy limits", () => {
  const fill = getCareerDemoShowcaseFill();
  assert.ok(fill.bio.length <= 80 && fill.aboutQuote.length <= 60);
  assert.equal(fill.aboutParagraphs.length, 2);
  assert.ok(fill.aboutParagraphs.every((paragraph) => paragraph.length <= 200));
  assert.equal(fill.strengths.length, 4);
  assert.ok(fill.strengths.every((item) => item.title.length <= 30 && item.title === item.title.toUpperCase() && item.body.length <= 80));
  assert.ok(fill.kpis.length <= 3 && fill.kpis.every((kpi) => kpi.suffix.length <= 6 && kpi.label.length <= 30));
  assert.deepEqual(fill.kpis.map((kpi) => kpi.num), [1200, 87, 10]);
  assert.ok(fill.marqueeKeywords.length >= 6 && fill.marqueeKeywords.length <= 8);
  assert.ok(fill.experience.every((row) => row.title.length <= 50 && row.org.length <= 50 && row.bullets.every((bullet) => bullet.length <= 120)));
  assert.ok(fill.education.some((row) => row.org === "부천대학교" && /2027\.02/.test(row.date)));
  assert.ok(["SQLD", "정보처리산업기사"].every((name) => fill.education.some((row) => row.title.includes(name))));
});
