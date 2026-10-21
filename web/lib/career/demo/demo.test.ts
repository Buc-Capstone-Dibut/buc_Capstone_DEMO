import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCareerDemoFullCoverLetter,
  buildCareerDemoProjectStory,
  buildCareerDemoReply,
  classifyCareerDemoQuestion,
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
  const intro = (title: string) =>
    buildCareerDemoReply({ operation: "intro", selectedQuestion: { title, maxChars: 700 }, messages: [{ role: "user", content: introPrompt }] }, projects).content;
  // 갈등 tells the hackathon scope conflict; 협업 tells a different project so the two never repeat.
  assert.match(intro("갈등 해결"), /블레이버스의 우선순위 합의와 팀 리딩 경험/);
  assert.match(intro("협업 경험"), /티니타이거의 실시간 데이터 정합성 경험/);
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
  assert.equal(new Set(answers).size, titles.length); // An unknown title still gets its own direct answer.
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

// --- Conversation-level behaviour (mirrors use-cover-letter-wizard runChat) -----------------------

type ChatMessage = { role: "user" | "assistant"; content: string };

/** Drives the demo like the wizard client: cleaned assistant text in history, stage from the protocol. */
function conversation(title: string, maxChars: number, options: { backgroundContext?: string; selection?: typeof projects } = {}) {
  const messages: ChatMessage[] = [];
  let stage = "direction";
  let answer = "";
  const pool = options.selection ?? projects;
  const intro = buildCareerDemoReply(
    { operation: "intro", workflowStage: "direction", selectedQuestion: { title, maxChars }, backgroundContext: options.backgroundContext },
    pool,
  );
  messages.push({ role: "assistant", content: parseAssistantProtocol(intro.content + intro.protocol).cleanedContent });
  return {
    intro: intro.content,
    send(prompt: string) {
      messages.push({ role: "user", content: prompt });
      const reply = buildCareerDemoReply(
        {
          messages: [...messages],
          workflowStage: stage,
          operation: stage === "refine" ? "tone" : "draft",
          currentAnswer: answer,
          selectedQuestion: { title, maxChars },
          backgroundContext: options.backgroundContext,
        },
        pool,
      );
      const parsed = parseAssistantProtocol(`${reply.content}\n\n${reply.protocol}`);
      messages.push({ role: "assistant", content: parsed.cleanedContent });
      if (parsed.stage && !(parsed.stage === "confirm" && !(answer && parsed.ready))) stage = parsed.stage;
      return { ...parsed, description: parsed.cleanedContent.split("\n")[0] };
    },
    /** The '적용하기' button: the answer is saved and the question is confirmed. */
    apply(text: string) {
      answer = text;
      stage = "confirm";
    },
  };
}

const sentencesOf = (text: string) => text.split(/(?<=[.!?])\s+|\n+/u).map((sentence) => sentence.trim()).filter(Boolean);
function longestSharedRun(a: string, b: string) {
  let best = 0;
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      let k = 0;
      while (a[i + k] && a[i + k] === b[j + k]) k += 1;
      best = Math.max(best, k);
    }
  }
  return best;
}
const DANGLING = /^(그때마다|그 기준은|그 기준이|그래서|그 결과|이후|그런데)/;
const mainProjectName = (text: string) =>
  ["헬로프렌즈", "티니타이거", "블레이버스"]
    .map((name) => ({ name, index: text.indexOf(name) }))
    .filter((hit) => hit.index >= 0)
    .sort((a, b) => a.index - b.index)[0]?.name;

test("question titles map to the right answer type, including custom and combined titles", () => {
  const cases: Array<[string, string[]]> = [
    ["자기소개", ["introduction"]],
    ["Tell us about yourself", ["introduction"]],
    ["지원동기", ["motivation"]],
    ["왜 아카넷에 지원했나요?", ["motivation"]],
    ["아카넷에 지원한 이유", ["motivation"]],
    ["입사 후 포부", ["goal"]],
    ["10년 후 나의 모습", ["goal"]],
    ["목표를 세우고 달성한 경험", ["challenge"]],
    ["가장 큰 성취", ["challenge"]],
    ["열정을 가지고 도전한 경험", ["challenge"]],
    ["실패를 극복한 경험", ["failure"]],
    ["가장 아쉬웠던 프로젝트", ["failure"]],
    ["리더십을 발휘한 경험", ["collaboration"]],
    ["팀 프로젝트 경험", ["collaboration"]],
    ["팀 내 갈등을 해결한 경험", ["conflict"]],
    ["본인의 가치관", ["growth"]],
    ["아카넷에 대해 아는 것을 쓰시오", ["company"]],
    ["지원동기 및 입사 후 포부", ["motivation", "goal"]],
    ["성장과정 및 장단점", ["growth", "strength"]],
    ["문제 해결·협업 경험", ["challenge", "collaboration"]],
    ["직무 역량", ["competency"]],
    ["자유 문항", ["general"]],
  ];
  for (const [title, expected] of cases) assert.deepEqual(classifyCareerDemoQuestion(title), expected, title);
});

test("custom titles get an on-topic answer, never another category's template", () => {
  const answer = (title: string) =>
    parseAssistantProtocol(buildCareerDemoReply({ workflowStage: "draft", selectedQuestion: { title, maxChars: 700 } }, projects).protocol).answer;
  assert.match(answer("실패를 극복한 경험"), /첫 성적표|기대에 못 미쳤습니다/);
  assert.match(answer("실패를 극복한 경험"), /150문항/);
  assert.match(answer("아카넷에 대해 아는 것"), /2009년|aXis Platform/);
  assert.match(answer("목표를 세우고 달성한 경험"), /^어려운 문제/);
  const combined = answer("지원동기 및 입사 후 포부");
  assert.match(combined, /수강신청/);
  assert.match(combined, /1년 안에는|3년 뒤에는/);
  assert.ok(combined.length <= 700);
});

test("the presenter's '자소서 완성본 보내줘' right after the intro returns a ready-to-apply final answer", () => {
  for (const [title, maxChars] of [["자기소개", 500], ["지원동기", 700]] as const) {
    for (const prompt of ["자소서 완성본 보내줘", "최종본 보내줘", "완성된 답변 줘", "전체 답변 보여줘", "끝까지 써줘", "바로 보내줘"]) {
      const chat = conversation(title, maxChars);
      const reply = chat.send(prompt);
      assert.equal(reply.stage, "refine", `${title} ${prompt}`);
      assert.equal(reply.ready, false);
      assert.ok(reply.answer.length >= maxChars * 0.8 && reply.answer.length <= maxChars * 0.9, `${title} ${prompt}: ${reply.answer.length}`);
      assert.doesNotMatch(reply.cleanedContent, /초안을 작성해 드릴까요/);
    }
  }
  const intro = conversation("자기소개", 500).send("자소서 완성본 보내줘");
  assert.match(intro.description, /완성본을 작성했습니다/);
  for (const fact of ["김정환", "부천대학교", "컴퓨터소프트웨어과", "2027년 2월", "SQLD", "정보처리산업기사", "데이터의 근거를 끝까지 확인", "아카넷"]) {
    assert.ok(intro.answer.includes(fact), fact);
  }
  assert.ok(["헬로프렌즈", "티니타이거", "블레이버스"].filter((name) => intro.answer.includes(name)).length >= 2);
  const motivation = conversation("지원동기", 700).send("자소서 완성본 보내줘");
  for (const fact of ["수강신청", "학사시스템", "URP/CRP", "aXis Platform", "Vizabridge", "1,200건", "아카넷"]) {
    assert.ok(motivation.answer.includes(fact), fact);
  }
  // Both answers are shown side by side: no repeated sentence, no long copied phrase.
  assert.deepEqual(sentencesOf(intro.answer).filter((sentence) => sentencesOf(motivation.answer).includes(sentence)), []);
  assert.ok(longestSharedRun(intro.answer, motivation.answer) < 25);
});

test("an agreed project carries over: '티니타이거로 해줘' → '네 좋아요' → '더 짧게 줄여줘'", () => {
  const chat = conversation("지원동기", 700);
  const direction = chat.send("티니타이거로 해줘");
  assert.equal(direction.answer, "");
  assert.equal(direction.stage, "draft");
  assert.match(direction.cleanedContent, /티니타이거 경험을 중심으로/);
  const draft = chat.send("네 좋아요");
  assert.match(draft.answer, /티니타이거/);
  assert.doesNotMatch(draft.answer, /헬로프렌즈|Vizabridge/);
  // Not applied yet: the shortened answer is built from the draft on screen, not from defaults.
  const shorter = chat.send("더 짧게 줄여줘");
  assert.match(shorter.answer, /티니타이거/);
  assert.doesNotMatch(shorter.answer, /헬로프렌즈/);
  assert.ok(shorter.answer.length < draft.answer.length);
  assert.ok(sentencesOf(shorter.answer).every((sentence) => draft.answer.includes(sentence)));
});

test("affirmatives in the direction stage are a go-ahead; advice requests get prose, not a draft", () => {
  for (const yes of ["네", "좋아요", "좋습니다", "응", "그래", "진행해줘", "ㅇㅇ", "오케이", "ok"]) {
    const reply = conversation("직무 역량", 800).send(yes);
    assert.ok(reply.answer.length > 400, yes);
  }
  assert.equal(conversation("직무 역량", 800).send("예시를 들어 설명해줘").answer.length > 0, false);
  for (const prompt of ["면접관 포인트가 뭐야?", "핵심 메시지만 먼저 정리해줘", "다음에 답할 내용을 질문해줘", "강조할 핵심 역량을 추천해줘", "어떤 프로젝트를 연결하면 좋을지 골라줘", "이 문항의 작성 방향을 잡아줘"]) {
    const chat = conversation("성장 과정", 700);
    const advice = chat.send(prompt);
    assert.equal(advice.answer, "", prompt);
    assert.ok(advice.cleanedContent.length > 80, prompt);
    // Also after a draft has been applied.
    const applied = conversation("성장 과정", 700);
    applied.apply(applied.send("완성본 보내줘").answer);
    const later = applied.send(prompt);
    assert.equal(later.answer, "", `${prompt} (applied)`);
    assert.notEqual(later.stage, "direction");
  }
  const picked = conversation("성장 과정", 700);
  assert.match(picked.send("어떤 프로젝트를 연결하면 좋을지 골라줘").cleanedContent, /티니타이거 경험을 중심으로/);
  assert.match(picked.send("네").answer, /티니타이거/);
});

test("after 적용하기 every edit request visibly changes the answer and never claims a final check", () => {
  const maxChars = 1000;
  const requests: Array<[string, (before: string, after: string) => void]> = [
    ["더 구체적으로 써줘", (before, after) => assert.ok(sentencesOf(after).some((sentence) => !before.includes(sentence)))],
    ["근거를 보강해줘", (before, after) => assert.ok(sentencesOf(after).some((sentence) => !before.includes(sentence)))],
    ["숫자 강조해줘", (_, after) => assert.match(sentencesOf(after)[0], /87%|131/)],
    ["공고 키워드 넣어줘", (_, after) => assert.ok(/전자정부/.test(after) && /SQL/.test(after) && /Java/.test(after) && /통합정보시스템/.test(after))],
    ["다른 프로젝트로 바꿔줘", (before, after) => assert.notEqual(mainProjectName(after), mainProjectName(before))],
    ["1000자로 늘려줘", (before, after) => assert.ok(after.length > before.length && after.length <= 1000)],
    // Already at the requested size: the answer still changes (a sharper sentence replaces a weaker one).
    ["900자로 늘려줘", (before, after) => assert.ok(after.length <= 900 && after !== before)],
    ["700자 안으로 압축해줘", (before, after) => assert.ok(after.length < before.length && after.length <= 700)],
    ["더 짧게 줄여줘", (before, after) => assert.ok(after.length < before.length)],
    ["첫 문장을 더 강하게 바꿔줘", (before, after) => assert.notEqual(sentencesOf(after)[0], sentencesOf(before)[0])],
    ["좀 더 자신감 있게 써줘", (before, after) => assert.notEqual(after, before)],
    ["더 겸손하고 부드럽게", (before, after) => assert.notEqual(after, before)],
    ["현재 답안을 더 자연스럽게 다듬어줘", (before, after) => assert.notEqual(after, before)],
  ];
  for (const [request, check] of requests) {
    const chat = conversation("직무 역량", maxChars);
    const applied = chat.send("완성본 보내줘").answer;
    chat.apply(applied);
    const reply = chat.send(request);
    assert.ok(reply.answer.length > 0 && reply.answer.length <= maxChars, request);
    assert.notEqual(reply.answer, applied, request);
    try {
      check(applied, reply.answer);
    } catch (error) {
      assert.fail(`${request}: ${(error as Error).message}\n${reply.description}\n${reply.answer}`);
    }
    assert.equal(reply.ready, false, request);
    assert.equal(reply.stage, "refine", request);
    assert.doesNotMatch(reply.description, /최종 점검/, request);
  }
  // Only an explicit final-check request confirms.
  const chat = conversation("직무 역량", maxChars);
  const applied = chat.send("완성본 보내줘").answer;
  chat.apply(applied);
  const confirmed = chat.send("최종 점검해줘");
  assert.equal(confirmed.ready, true);
  assert.equal(confirmed.stage, "confirm");
  assert.equal(confirmed.answer, applied);
  assert.match(confirmed.description, /최종 점검/);
});

test("repeated requests do not return the same text twice", () => {
  const chat = conversation("지원동기", 700);
  chat.apply(chat.send("완성본 보내줘").answer);
  const first = chat.send("첫 문장 바꿔줘").answer;
  chat.apply(first);
  const second = chat.send("첫 문장 바꿔줘").answer;
  assert.notEqual(sentencesOf(first)[0], sentencesOf(second)[0]);
  chat.apply(second);
  const third = chat.send("다시 써줘").answer;
  assert.notEqual(third, second);
});

test("a new first sentence never leaves the next sentence dangling", () => {
  for (const title of ["지원동기", "성장 과정", "대표 프로젝트", "직무 역량", "갈등 해결", "자기소개"]) {
    const chat = conversation(title, 700);
    const draft = chat.send("완성본 보내줘").answer;
    for (let round = 0; round < 3; round += 1) {
      const answer = chat.send("첫 문장을 더 강하게 바꿔줘").answer;
      const sentences = sentencesOf(answer);
      assert.notEqual(sentences[0], sentencesOf(draft)[0], title);
      assert.doesNotMatch(sentences[0], DANGLING, title);
      // A sentence leaning on the one before still follows a sentence of its own story from the draft.
      sentences.forEach((sentence, index) => {
        if (index === 0 || !DANGLING.test(sentence) || !draft.includes(sentence)) return;
        const original = sentencesOf(draft);
        const predecessor = original.indexOf(sentences[index - 1]);
        assert.ok(predecessor >= 0 && predecessor < original.indexOf(sentence), `${title}: ${sentence}`);
      });
    }
  }
});

test("only a clearly named project switches the evidence; incidental words do not", () => {
  const chat = conversation("대표 프로젝트", 800);
  const draft = chat.send("완성본 보내줘").answer;
  assert.match(draft, /티니타이거/);
  const detail = chat.send("멘토 피드백 부분이랑 칸반 쪽을 더 구체적으로 써줘").answer;
  assert.match(detail, /티니타이거/);
  assert.doesNotMatch(detail, /블레이버스/);
  const switched = chat.send("해커톤 경험으로 바꿔줘").answer;
  assert.match(switched, /블레이버스/);
});

test("갈등 해결 tells a real conflict and its compromise; sibling questions use different projects", () => {
  const conflict = parseAssistantProtocol(
    buildCareerDemoReply({ workflowStage: "draft", selectedQuestion: { title: "갈등 해결", maxChars: 700 } }, projects).protocol,
  ).answer;
  for (const beat of ["PM과 디자이너", "손글씨 피드백", "심사 기준", "텍스트 피드백", "로드맵", "본선"]) assert.ok(conflict.includes(beat), beat);
  const pairs: Array<[string, string]> = [
    ["협업 경험", "갈등 해결"],
    ["도전 경험", "대표 프로젝트"],
    ["성장 과정", "직무 역량"],
  ];
  const draft = (title: string, backgroundContext?: string) =>
    parseAssistantProtocol(buildCareerDemoReply({ workflowStage: "draft", selectedQuestion: { title, maxChars: 700 }, backgroundContext }, projects).protocol).answer;
  for (const [a, b] of pairs) {
    const shared = sentencesOf(draft(a)).filter((sentence) => sentencesOf(draft(b)).includes(sentence));
    assert.deepEqual(shared, [], `${a} / ${b}`);
  }
  const context = "[기업] ㈜아카넷\n[직무] 웹개발자\n\n[문항 정보]\n1. 지원동기 (700자)\n2. 직무 역량 (800자)\n3. 도전 경험 (700자)\n4. 문제 해결·협업 경험 (700자)";
  const main = (title: string) => mainProjectName(draft(title, context));
  assert.equal(main("직무 역량"), "헬로프렌즈");
  assert.notEqual(main("도전 경험"), "헬로프렌즈");
  assert.notEqual(main("문제 해결·협업 경험"), main("도전 경험"));
});

test("drafts fill 80-90% of the form at common limits and stay within long ones", () => {
  const titles = ["자기소개", "지원동기", "입사 후 포부", "장점과 단점", "성장 과정", "협업 경험", "도전 경험", "직무 역량", "대표 프로젝트", "실패 경험"];
  for (const maxChars of [700, 800]) {
    for (const title of titles) {
      const answer = parseAssistantProtocol(buildCareerDemoReply({ workflowStage: "draft", selectedQuestion: { title, maxChars } }, projects).protocol).answer;
      assert.ok(answer.length >= maxChars * 0.75 && answer.length <= maxChars * 0.9, `${title} ${maxChars}: ${answer.length}`);
    }
  }
  for (const title of titles) {
    const answer = parseAssistantProtocol(buildCareerDemoReply({ workflowStage: "draft", selectedQuestion: { title, maxChars: 1500 } }, projects).protocol).answer;
    assert.ok(answer.length >= 750 && answer.length <= 1350, `${title} 1500: ${answer.length}`);
  }
});

test("fitting drops a leaning sentence together with the sentence it leans on, and keeps the conclusion", () => {
  const text = "도입 문장입니다. 수강신청 날마다 시간표가 겹친다는 사실을 신청 직전에야 알게 되곤 했습니다. 그때마다 미리 검사할 수 없을까 생각했습니다. 결론 문장입니다.";
  const fitted = fitCareerDemoAnswer(text, 40);
  assert.ok(fitted.length <= 40);
  assert.ok(fitted.endsWith("결론 문장입니다."));
  assert.ok(!fitted.includes("그때마다") || fitted.includes("수강신청 날마다"));
});

test("long question titles are shortened in the assistant's prose", () => {
  const title = "본인이 지원한 직무와 관련하여 가장 자신 있는 역량과 이를 키우기 위해 노력한 경험을 구체적으로 서술하시오";
  const intro = buildCareerDemoReply({ operation: "intro", selectedQuestion: { title, maxChars: 800 } }, projects).content;
  assert.ok(!intro.includes(title));
  assert.match(intro, /‘본인이 지원한 직무와 관련하여[^’]*…’/);
  const chat = conversation(title, 800);
  const reply = chat.send("완성본 보내줘");
  assert.ok(!reply.description.includes(title));
  assert.ok(reply.answer.length > 0);
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
