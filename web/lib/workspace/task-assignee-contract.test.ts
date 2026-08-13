import assert from "node:assert/strict";
import test from "node:test";
import { parseTaskAssigneeIds } from "../server/task-assignees";

test("task assignment API accepts and deduplicates canonical arrays", () => {
  assert.deepEqual(
    parseTaskAssigneeIds({
      assigneeIds: ["user-a", "user-b", "user-a"],
    }),
    ["user-a", "user-b"],
  );
});

test("task assignment API keeps legacy clients compatible", () => {
  assert.deepEqual(parseTaskAssigneeIds({ assigneeId: "user-a" }), [
    "user-a",
  ]);
  assert.deepEqual(parseTaskAssigneeIds({ assigneeId: null }), []);
  assert.equal(parseTaskAssigneeIds({ title: "unchanged" }), undefined);
});

test("task assignment API rejects malformed arrays", () => {
  assert.throws(
    () => parseTaskAssigneeIds({ assigneeIds: "user-a" }),
    /목록 형식/,
  );
  assert.throws(
    () => parseTaskAssigneeIds({ assigneeIds: ["user-a", 123] }),
    /ID가 올바르지/,
  );
});
