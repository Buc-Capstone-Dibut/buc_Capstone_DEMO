import assert from "node:assert/strict";
import test from "node:test";
import {
  getTaskAssigneeIds,
  getTaskAssignees,
  isTaskAssignedTo,
  isTaskUnassigned,
  moveTaskAssigneeIds,
} from "./task-assignees";

test("canonical empty arrays do not fall back to stale legacy fields", () => {
  const task = {
    assigneeId: "legacy-user",
    assignee: "Legacy User",
    assigneeIds: [],
    assignees: [],
  };

  assert.deepEqual(getTaskAssigneeIds(task), []);
  assert.deepEqual(getTaskAssignees(task), []);
  assert.equal(isTaskUnassigned(task), true);
});

test("multiple assignees are deduplicated and searchable by membership", () => {
  const task = {
    assigneeIds: ["user-a", "user-b", "user-a"],
    assignees: [
      { id: "user-a", name: "A" },
      { id: "user-b", name: "B" },
      { id: "user-a", name: "A duplicate" },
    ],
  };

  assert.deepEqual(getTaskAssigneeIds(task), ["user-a", "user-b"]);
  assert.deepEqual(
    getTaskAssignees(task).map((assignee) => assignee.id),
    ["user-a", "user-b"],
  );
  assert.equal(isTaskAssignedTo(task, "user-b"), true);
  assert.equal(isTaskAssignedTo(task, "user-c"), false);
});

test("legacy single-assignee payloads remain compatible", () => {
  const task = {
    assigneeId: "user-a",
    assignee: "Member A",
    assigneeProfile: { id: "user-a", name: "Member A", avatar: null },
  };

  assert.deepEqual(getTaskAssigneeIds(task), ["user-a"]);
  assert.deepEqual(getTaskAssignees(task), [
    { id: "user-a", name: "Member A", avatar: null },
  ]);
});

test("moving an assignee Kanban card replaces only the source assignment", () => {
  assert.deepEqual(
    moveTaskAssigneeIds(["user-a", "user-b"], "user-a", "user-c"),
    ["user-c", "user-b"],
  );
  assert.deepEqual(
    moveTaskAssigneeIds(["user-a", "user-b"], "user-a", "user-b"),
    ["user-b"],
  );
  assert.deepEqual(moveTaskAssigneeIds([], "unassigned", "user-a"), [
    "user-a",
  ]);
  assert.deepEqual(
    moveTaskAssigneeIds(["user-a", "user-b"], "user-a", "unassigned"),
    [],
  );
});
