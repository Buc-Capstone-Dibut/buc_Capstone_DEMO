import assert from "node:assert/strict";
import test from "node:test";
import {
  installWorkspaceConsole,
  type ReopenWorkspaceResult,
  type WorkspaceConsoleControl,
} from "./console-control";

const workspaceId = "21c58fed-893c-e184-0f8e-e2a11a0d2ba3";
const result: ReopenWorkspaceResult = {
  success: true,
  reopened: true,
  workspace: { id: workspaceId, lifecycle_status: "IN_PROGRESS", completed_at: null },
};

function setup(request: typeof fetch = async () => Response.json(result)) {
  const target: { workspaceControl?: WorkspaceConsoleControl } = {};
  const notices: string[] = [];
  const requests: { url: unknown; init?: RequestInit }[] = [];
  let reloads = 0;
  const dispose = installWorkspaceConsole(target, workspaceId, {
    request: async (url, init) => {
      requests.push({ url, init });
      return request(url, init);
    },
    reload: () => { reloads += 1; },
    notify: (message) => notices.push(message),
  });
  return { target, notices, requests, dispose, reloads: () => reloads };
}

test("console registration waits for an explicit command and shares concurrent requests", async () => {
  const control = setup();
  assert.equal(control.requests.length, 0);
  assert.match(control.notices[0], /await workspaceControl.reopen\(\)/);
  const first = control.target.workspaceControl!.reopen();
  const second = control.target.workspaceControl!.reopen();
  assert.equal(first, second);
  assert.deepEqual(await first, result);
  assert.equal(control.requests.length, 1);
  assert.equal(control.requests[0].url, `/api/workspaces/${workspaceId}/reopen`);
  assert.equal(control.requests[0].init?.method, "POST");
  assert.equal(control.requests[0].init?.credentials, "same-origin");
  assert.equal(control.reloads(), 1);
  control.dispose();
  assert.equal(control.target.workspaceControl, undefined);
});

test("permission failures do not reload and a later command can retry", async () => {
  let denied = true;
  const control = setup(async () => denied
    ? Response.json({ error: "소유자만 재개할 수 있습니다." }, { status: 403 })
    : Response.json(result));
  await assert.rejects(control.target.workspaceControl!.reopen(), /소유자만/);
  assert.equal(control.reloads(), 0);
  denied = false;
  await control.target.workspaceControl!.reopen();
  assert.equal(control.requests.length, 2);
  assert.equal(control.reloads(), 1);
  control.dispose();
});

test("network errors, non-JSON errors and malformed successes do not reload", async () => {
  for (const request of [
    async () => { throw new Error("network unavailable"); },
    async () => new Response("Bad Gateway", { status: 502 }),
    async () => Response.json({ success: true }),
    async () => Response.json({ ...result, workspace: { ...result.workspace, id: "another-workspace" } }),
  ]) {
    const control = setup(request);
    await assert.rejects(control.target.workspaceControl!.reopen());
    assert.equal(control.reloads(), 0);
    control.dispose();
  }
});

test("an already active workspace refreshes stale read-only UI", async () => {
  const control = setup(async () => Response.json({ ...result, reopened: false }));
  assert.equal((await control.target.workspaceControl!.reopen()).reopened, false);
  assert.equal(control.reloads(), 1);
  assert.match(control.notices.at(-1)!, /이미 진행 중/);
  control.dispose();
});

test("canonical UUID casing in the response still identifies the same workspace", async () => {
  const control = setup(async () => Response.json({
    ...result, workspace: { ...result.workspace, id: workspaceId.toUpperCase() },
  }));
  await control.target.workspaceControl!.reopen();
  assert.equal(control.reloads(), 1);
  control.dispose();
});

test("leaving the page removes the command and prevents a late response from reloading another page", async () => {
  let resolve!: (response: Response) => void;
  const control = setup(async () => new Promise<Response>((done) => { resolve = done; }));
  const commands = control.target.workspaceControl!;
  const pending = commands.reopen();
  control.dispose();
  assert.equal(control.target.workspaceControl, undefined);
  resolve(Response.json(result));
  await pending;
  assert.equal(control.reloads(), 0);
  assert.equal(control.notices.length, 1);
  await assert.rejects(commands.reopen(), /현재 워크스페이스/);
  assert.equal(control.requests.length, 1);
});

test("cleanup does not delete a newer workspace's console command", () => {
  const control = setup();
  const newer: WorkspaceConsoleControl = { reopen: async () => result };
  control.target.workspaceControl = newer;
  control.dispose();
  assert.equal(control.target.workspaceControl, newer);
});
