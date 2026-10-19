import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

test("workspace reopening authenticates the owner and only restores lifecycle state", async (t) => {
  const id = "21c58fed-893c-e184-0f8e-e2a11a0d2ba3";
  let userId: string | null = "owner";
  let authError: Error | null = null;
  let role: string | null = "owner";
  let exists = true;
  let updateCount = 1;
  let databaseError: Error | null = null;
  const workspace = {
    id, lifecycle_status: "COMPLETED", completed_at: new Date("2026-10-19"),
    result_link: "https://example.com/result", result_note: "완료 결과",
    docs: ["existing-document"], members: ["owner", "member"],
  } as { id: string; lifecycle_status: string; completed_at: Date | null; result_link: string; result_note: string; docs: string[]; members: string[] };
  const memberQueries: unknown[] = [];
  const updates: { where: unknown; data: { lifecycle_status: string; completed_at: null } }[] = [];
  const dependencies = {
    getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: authError }),
    prisma: {
      workspace_members: {
        findUnique: async (query: unknown) => {
          memberQueries.push(query);
          return role ? { role } : null;
        },
      },
      workspaces: {
        findUnique: async () => exists ? {
          id, lifecycle_status: workspace.lifecycle_status, completed_at: workspace.completed_at,
        } : null,
        updateMany: async (query: typeof updates[number]) => {
          updates.push(query);
          if (databaseError) throw databaseError;
          if (updateCount > 0) Object.assign(workspace, query.data);
          return { count: updateCount };
        },
      },
    },
  };
  const globals = globalThis as typeof globalThis & { workspaceReopenRouteTest?: typeof dependencies };
  globals.workspaceReopenRouteTest = dependencies;
  try {
    const bundle = await build({
      entryPoints: [fileURLToPath(new URL("../../app/api/workspaces/[id]/reopen/route.ts", import.meta.url))],
      bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
      plugins: [{ name: "workspace-reopen-test-dependencies", setup(builder) {
        const stubs: Record<string, string> = {
          "@/lib/prisma": "export default globalThis.workspaceReopenRouteTest.prisma;",
          "@/lib/supabase/server": "export const createClient = async () => ({auth: {getUser: globalThis.workspaceReopenRouteTest.getUser}});",
        };
        builder.onResolve({ filter: /.*/ }, ({ path }) => Object.hasOwn(stubs, path) ? { path, namespace: "stub" } : undefined);
        builder.onLoad({ filter: /.*/, namespace: "stub" }, ({ path }) => ({ contents: stubs[path], loader: "js" }));
      } }],
    });
    const mod = { exports: {} as { POST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response> } };
    new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
    const invoke = (workspaceId = id, origin = "http://localhost") => mod.exports.POST(
      new Request(`http://localhost/api/workspaces/${workspaceId}/reopen`, { method: "POST", headers: { origin } }),
      { params: Promise.resolve({ id: workspaceId }) },
    );

    await t.test("rejects anonymous and invalid sessions and malformed IDs without DB access", async () => {
      userId = null;
      assert.equal((await invoke()).status, 401);
      userId = "owner";
      authError = new Error("invalid session");
      assert.equal((await invoke()).status, 401);
      authError = null;
      assert.equal((await invoke("bad-id")).status, 400);
      assert.equal(memberQueries.length, 0);
      assert.equal(updates.length, 0);
    });
    await t.test("rejects cross-origin requests and non-owners including admins", async () => {
      assert.equal((await invoke(id, "https://other.example")).status, 403);
      assert.equal(memberQueries.length, 0);
      for (const value of [null, "member", "admin", "viewer"]) {
        role = value;
        assert.equal((await invoke()).status, 403);
      }
      assert.deepEqual(memberQueries[0], {
        where: { workspace_id_user_id: { workspace_id: id, user_id: "owner" } },
        select: { role: true },
      });
      assert.equal(updates.length, 0);
      role = "owner";
    });
    await t.test("does not recreate a deleted workspace", async () => {
      exists = false;
      assert.equal((await invoke()).status, 404);
      assert.equal(updates.length, 0);
      exists = true;
    });
    await t.test("conditionally restores a completed owner's workspace without removing its data", async () => {
      const preserved = { result_link: workspace.result_link, result_note: workspace.result_note, docs: [...workspace.docs], members: [...workspace.members] };
      const response = await invoke();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.deepEqual(await response.json(), {
        success: true, reopened: true,
        workspace: { id, lifecycle_status: "IN_PROGRESS", completed_at: null },
      });
      assert.deepEqual(updates, [{
        where: { id, lifecycle_status: "COMPLETED", members: { some: { user_id: "owner", role: "owner" } } },
        data: { lifecycle_status: "IN_PROGRESS", completed_at: null },
      }]);
      assert.deepEqual({ result_link: workspace.result_link, result_note: workspace.result_note, docs: workspace.docs, members: workspace.members }, preserved);
    });
    await t.test("already active requests succeed without another write", async () => {
      const before = updates.length;
      const response = await invoke();
      assert.equal(response.status, 200);
      assert.equal((await response.json()).reopened, false);
      assert.equal(updates.length, before);
    });
    await t.test("reports a state or ownership change during reopening", async () => {
      workspace.lifecycle_status = "COMPLETED";
      updateCount = 0;
      assert.equal((await invoke()).status, 409);
      assert.equal(workspace.lifecycle_status, "COMPLETED");
    });
    await t.test("does not expose database error details", async () => {
      t.mock.method(console, "error", () => {});
      databaseError = new Error("private database connection details");
      const response = await invoke();
      assert.equal(response.status, 500);
      assert.ok(!(await response.text()).includes("private database"));
    });
  } finally {
    delete globals.workspaceReopenRouteTest;
  }
});
