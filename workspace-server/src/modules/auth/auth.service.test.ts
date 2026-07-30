import assert from "node:assert/strict";
import test from "node:test";
import { Socket } from "socket.io";
import { AuthService, getSocketIdentity } from "./auth.service";

test("빈 access token은 인증하지 않는다", async () => {
  const user = await AuthService.verifyAccessToken("");
  assert.equal(user, null);
});

test("검증된 identity가 없는 socket은 거부한다", () => {
  const socket = { data: {} } as Socket;
  assert.throws(
    () => getSocketIdentity(socket),
    /인증되지 않은 실시간 연결/,
  );
});

test("검증된 socket identity를 그대로 반환한다", () => {
  const identity = {
    userId: "user-id",
    workspaceId: "workspace-id",
    role: "member" as const,
  };
  const socket = { data: { identity } } as unknown as Socket;
  assert.deepEqual(getSocketIdentity(socket), identity);
});
