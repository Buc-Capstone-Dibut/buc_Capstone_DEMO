import assert from "node:assert/strict";
import test from "node:test";
import {
  getBoardRealtimeTopic,
  isBoardRealtimePayload,
} from "./board-realtime";

const workspaceId = "21c58fed-893c-e184-0f8e-e2a11a0d2ba3";

test("builds a workspace-scoped board topic", () => {
  assert.equal(
    getBoardRealtimeTopic(workspaceId),
    `workspace:${workspaceId}:board`,
  );
});

test("accepts only board events for the active workspace", () => {
  assert.equal(
    isBoardRealtimePayload(
      {
        workspaceId,
        entity: "kanban_tasks",
        operation: "UPDATE",
        recordId: "task-id",
      },
      workspaceId,
    ),
    true,
  );

  assert.equal(
    isBoardRealtimePayload(
      {
        workspaceId: "another-workspace",
        entity: "kanban_tasks",
        operation: "UPDATE",
        recordId: "task-id",
      },
      workspaceId,
    ),
    false,
  );
});
