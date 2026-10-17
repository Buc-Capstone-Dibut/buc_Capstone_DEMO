import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

test("model-answer route checks ownership, selects the right evidence and bounds generation", async (t) => {
  let userId: string | null = "owner";
  let ownerId = "owner";
  let sessionType = "live_interview";
  let lookupError: unknown = null;
  let generateError: Error | null = null;
  let generated = "확인한 자료를 바탕으로 문제를 분석했습니다. 측정 결과를 기준으로 개선하겠습니다.";
  const portfolioId = "21c58fed-893c-e184-0f8e-e2a11a0d2ba3";
  let job: Record<string, unknown> = { company: "공고회사", supportingMaterials: { portfolioIds: [portfolioId], coverLetter: { body: "자소서 근거" }, projects: [{ name: "연결 프로젝트" }] } };
  const calls: { table: string; filters: Record<string, unknown> }[] = [];
  const generations: Record<string, unknown>[] = [];
  const admin = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      calls.push({ table, filters });
      const result = () => {
        if (table === "interview_sessions") return { data: ownerId === filters.user_id ? { session_type: sessionType, job_payload: job, resume_payload: { projects: [{ name: "이력서 근거" }] } } : null, error: lookupError };
        if (table === "portfolio_sources") return { data: { readme_snapshot: "GitHub 분석 근거", tree_snapshot: "api/ worker/" }, error: null };
        if (table === "user_portfolios") return { data: [{ title: "포트폴리오 근거" }], error: null };
        throw new Error(`Unexpected table: ${table}`);
      };
      const query = {
        select() { return query; },
        eq(key: string, value: unknown) { filters[key] = value; return query; },
        in(key: string, value: unknown) { filters[key] = value; return query; },
        maybeSingle: async () => result(),
        then(resolve: (value: unknown) => unknown) { return Promise.resolve(result()).then(resolve); },
      };
      return query;
    },
  };
  const dependencies = {
    userId: () => userId,
    admin,
    generate: async (options: Record<string, unknown>) => {
      generations.push(options);
      if (generateError) throw generateError;
      return generated;
    },
  };
  const globals = globalThis as typeof globalThis & { modelAnswerRouteTest?: typeof dependencies };
  globals.modelAnswerRouteTest = dependencies;
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL("../../app/api/interview/sessions/[id]/model-answer/route.ts", import.meta.url))],
    bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
    plugins: [{
      name: "model-answer-test-dependencies",
      setup(builder) {
        const stubs: Record<string, string> = {
          "@/lib/interview/route-auth": "export const getInterviewRouteUserId = async () => globalThis.modelAnswerRouteTest.userId(); export const unauthorizedInterviewResponse = () => Response.json({success:false},{status:401});",
          "@/lib/supabase/admin": "export const createAdminSupabaseClient = () => globalThis.modelAnswerRouteTest.admin;",
          "@/lib/ai/gemini-text": "export const generateGeminiText = (options) => globalThis.modelAnswerRouteTest.generate(options);",
        };
        builder.onResolve({ filter: /.*/ }, ({ path }) => Object.hasOwn(stubs, path) ? { path, namespace: "stub" } : undefined);
        builder.onLoad({ filter: /.*/, namespace: "stub" }, ({ path }) => ({ contents: stubs[path], loader: "js" }));
      },
    }],
  });
  const routeModule = { exports: {} as { POST: (request: Request, context: { params: { id: string } }) => Promise<Response> } };
  new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), routeModule, routeModule.exports);
  const invoke = (question: unknown = "개선 경험을 말씀해 주세요.", id = "session-one") => routeModule.exports.POST(new Request("http://localhost/api/model-answer", { method: "POST", body: JSON.stringify({ question }), headers: { "Content-Type": "application/json" } }), { params: { id } });
  try {
    await t.test("rejects anonymous, invalid questions and other users' sessions before generating", async () => {
      userId = null;
      assert.equal((await invoke()).status, 401);
      userId = "owner";
      assert.equal((await invoke("")).status, 400);
      assert.equal((await invoke("x".repeat(2001))).status, 400);
      assert.equal((await invoke("question", "../../bad")).status, 404);
      ownerId = "someone-else";
      assert.equal((await invoke()).status, 404);
      assert.equal(generations.length, 0);
      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0].filters, { id: "session-one", user_id: "owner" });
      ownerId = "owner";
    });
    await t.test("posting generation uses owned portfolio and attached materials with short non-thinking generation", async () => {
      calls.length = 0;
      const response = await invoke();
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.deepEqual(body.data, { answer: generated });
      assert.deepEqual(calls.find((c) => c.table === "user_portfolios")?.filters, { user_id: "owner", id: [portfolioId] });
      assert.ok(!calls.some((c) => c.table === "portfolio_sources"));
      const options = generations.at(-1)!;
      for (const fact of ["공고회사", "자소서 근거", "연결 프로젝트", "이력서 근거", "포트폴리오 근거"]) assert.ok(String(options.prompt).includes(fact), fact);
      assert.equal(options.disableThinking, true);
      assert.equal(options.maxOutputTokens, 768);
      assert.equal(options.maxRetries, 0);
      assert.ok(options.abortSignal instanceof AbortSignal);
    });
    await t.test("role generation does not require a portfolio or personal history", async () => {
      calls.length = 0;
      job = { interviewTrack: "role", role: "백엔드", techStack: ["PostgreSQL"] };
      assert.equal((await invoke("격리 수준을 설명해 주세요.")).status, 200);
      assert.match(String(generations.at(-1)!.prompt), /면접 유형: 직무 면접/);
      assert.deepEqual(calls.map((c) => c.table), ["interview_sessions"]);
    });
    await t.test("defense reads its session's stored GitHub snapshot", async () => {
      calls.length = 0;
      sessionType = "portfolio_defense";
      job = { repoUrl: "https://github.com/example/repo" };
      assert.equal((await invoke()).status, 200);
      assert.deepEqual(calls.find((c) => c.table === "portfolio_sources")?.filters, { session_id: "session-one" });
      assert.match(String(generations.at(-1)!.prompt), /GitHub 분석 근거/);
    });
    await t.test("caps overlong output and hides database and provider error details", async () => {
      generated = "긴답변".repeat(500);
      const body = await (await invoke()).json();
      assert.ok(body.data.answer.length <= 360);
      lookupError = { message: "private database details" };
      const failed = await invoke();
      assert.equal(failed.status, 500);
      assert.ok(!(await failed.text()).includes("private database"));
      lookupError = null;
      generateError = new DOMException("upstream timeout", "TimeoutError");
      assert.equal((await invoke()).status, 504);
    });
  } finally {
    delete globals.modelAnswerRouteTest;
  }
});
