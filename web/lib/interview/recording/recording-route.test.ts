import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

type Route = (
  request: Request,
  context: { params: { id: string } },
) => Promise<Response>;

test("recording routes enforce ownership, validate metadata and sign retryable uploads", async (t) => {
  let userId: string | null = "owner";
  let ownerId = "owner";
  const mode = "supabase";
  let recording: Record<string, unknown> | null = null;
  let lookupError: { message: string } | null = null;
  let persisted: Record<string, unknown> | null = null;
  let signOptions: unknown;
  const turns = [
    {
      role: "user",
      content: "Final refined answer",
      payload: { turn_id: "turn-1" },
    },
  ];
  const admin = {
    from(table: string) {
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        maybeSingle: async () =>
          table === "interview_sessions"
            ? { data: { user_id: ownerId } }
            : { data: recording, error: lookupError },
        upsert: async (row: Record<string, unknown>) => {
          persisted = row;
          return { error: null };
        },
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve({ data: turns }).then(resolve);
        },
      };
      return query;
    },
    storage: {
      listBuckets: async () => ({ data: [{ name: "interview-recordings" }] }),
      from: () => ({
        createSignedUploadUrl: async (path: string, options: unknown) => {
          signOptions = options;
          return {
            data: {
              path,
              token: "test",
              signedUrl: "https://storage.example/upload",
            },
          };
        },
        createSignedUrl: async () => ({
          data: { signedUrl: "https://storage.example/video" },
        }),
      }),
    },
  };
  const dependencies = { userId: () => userId, mode: () => mode, admin };
  const global = globalThis as typeof globalThis & {
    recordingRouteTest?: typeof dependencies;
  };
  global.recordingRouteTest = dependencies;
  const loadRoute = async (relativePath: string) => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
      bundle: true,
      write: false,
      platform: "node",
      format: "cjs",
      packages: "external",
      plugins: [
        {
          name: "recording-route-dependencies",
          setup(builder) {
            const stubs: Record<string, string> = {
              "server-only": "",
              "@/lib/interview/route-auth":
                "export const getInterviewRouteUserId = async () => globalThis.recordingRouteTest.userId(); export const unauthorizedInterviewResponse = () => Response.json({success:false}, {status:401});",
              "@/lib/supabase/admin":
                "export const createAdminSupabaseClient = () => globalThis.recordingRouteTest.admin;",
              "@/lib/interview/recording/storage-mode":
                "export const getRecordingStorageMode = () => globalThis.recordingRouteTest.mode();",
            };
            builder.onResolve({ filter: /.*/ }, ({ path }) =>
              Object.hasOwn(stubs, path)
                ? { path, namespace: "stub" }
                : undefined,
            );
            builder.onLoad({ filter: /.*/, namespace: "stub" }, ({ path }) => ({
              contents: stubs[path],
              loader: "js",
            }));
          },
        },
      ],
    });
    const routeModule = { exports: {} as Record<"GET" | "POST", Route> };
    new Function("require", "module", "exports", result.outputFiles[0].text)(
      createRequire(import.meta.url),
      routeModule,
      routeModule.exports,
    );
    return routeModule.exports;
  };
  try {
    const route = await loadRoute(
      "../../../app/api/interview/sessions/[id]/recording/route.ts",
    );
    const upload = await loadRoute(
      "../../../app/api/interview/sessions/[id]/recording/upload-url/route.ts",
    );
    const context = { params: { id: "test-session" } };
    const transcript = {
      version: 1,
      entries: [
        {
          id: "user:capture-1",
          role: "user",
          turnId: "turn-1",
          text: "Draft answer",
          startMs: 100,
          endMs: 200,
        },
      ],
    };
    const body = {
      bucket: "interview-recordings",
      storagePath: "test-session/video.webm",
      mimeType: "video/webm;codecs=vp8,opus",
      sizeBytes: 1000,
      durationMs: 500,
      recordingStartedAt: "2026-09-07T00:00:00.000Z",
      transcript,
    };
    const post = (value: unknown) =>
      new Request("https://app.example/recording", {
        method: "POST",
        body: JSON.stringify(value),
      });
    const get = () => new Request("https://app.example/recording");

    await t.test(
      "unauthenticated requests cannot read or publish recordings",
      async () => {
        userId = null;
        assert.equal((await route.GET(get(), context)).status, 401);
        assert.equal((await route.POST(post(body), context)).status, 401);
        assert.equal((await upload.POST(post(body), context)).status, 401);
        userId = "owner";
      },
    );
    await t.test(
      "another user cannot read, overwrite or obtain an upload URL",
      async () => {
        ownerId = "someone-else";
        assert.equal((await route.GET(get(), context)).status, 403);
        assert.equal((await route.POST(post(body), context)).status, 403);
        assert.equal((await upload.POST(post(body), context)).status, 403);
        assert.equal(persisted, null);
        ownerId = "owner";
      },
    );
    await t.test(
      "rejects malformed metadata and paths outside the session",
      async () => {
        for (const invalid of [
          null,
          { ...body, bucket: "other" },
          { ...body, storagePath: "test-session/.." },
          { ...body, storagePath: "other/video.webm" },
          { ...body, durationMs: 150 },
          { ...body, durationMs: -1 },
          { ...body, sizeBytes: 600 * 1024 * 1024 },
        ]) {
          assert.equal((await route.POST(post(invalid), context)).status, 400);
        }
        for (const invalid of [
          null,
          [],
          { storagePath: 123 },
          { storagePath: "test-session/../video.webm" },
        ]) {
          assert.equal((await upload.POST(post(invalid), context)).status, 400);
        }
      },
    );
    await t.test("production cannot publish a local-only file", async () => {
      assert.equal(
        (await route.POST(post({ ...body, bucket: "local" }), context)).status,
        400,
      );
    });
    await t.test(
      "persists transcript with existing recording metadata",
      async () => {
        assert.equal((await route.POST(post(body), context)).status, 200);
        assert.deepEqual(persisted?.transcript, transcript);
        assert.equal(persisted?.session_id, "test-session");
      },
    );
    await t.test(
      "signed uploads allow retries to the same private object",
      async () => {
        const response = await upload.POST(post(body), context);
        assert.equal(response.status, 200);
        assert.deepEqual(signOptions, { upsert: true });
        assert.equal(
          (await response.json()).data.signedUrl,
          "https://storage.example/upload",
        );
      },
    );
    await t.test(
      "missing recordings differ from database failures",
      async () => {
        assert.equal(
          (await (await route.GET(get(), context)).json()).data,
          null,
        );
        lookupError = { message: "missing migration" };
        assert.equal((await route.GET(get(), context)).status, 500);
        lookupError = null;
      },
    );
    await t.test("legacy rows load without a transcript", async () => {
      recording = {
        bucket: body.bucket,
        storage_path: body.storagePath,
        duration_ms: 500,
        transcript: null,
      };
      assert.equal(
        (await (await route.GET(get(), context)).json()).data.transcript,
        null,
      );
    });
    await t.test(
      "Render's refined text replaces the snapshot without shifting timing",
      async () => {
        recording = { ...recording, transcript };
        const result = (await (await route.GET(get(), context)).json()).data;
        assert.equal(result.transcript.entries[0].text, "Final refined answer");
        assert.equal(result.transcript.entries[0].startMs, 100);
        assert.equal(result.storagePath, body.storagePath);
        assert.ok(result.expiresAt > Date.now());
      },
    );
  } finally {
    delete global.recordingRouteTest;
  }
});
