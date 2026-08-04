export const BOARD_REALTIME_EVENT = "board.changed";

export type BoardRealtimePayload = {
  workspaceId: string;
  entity: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  recordId: string | null;
};

export function getBoardRealtimeTopic(workspaceId: string) {
  return `workspace:${workspaceId}:board`;
}

export function isBoardRealtimePayload(
  value: unknown,
  workspaceId: string,
): value is BoardRealtimePayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<BoardRealtimePayload>;
  return (
    payload.workspaceId === workspaceId &&
    typeof payload.entity === "string" &&
    (payload.operation === "INSERT" ||
      payload.operation === "UPDATE" ||
      payload.operation === "DELETE") &&
    (payload.recordId === null || typeof payload.recordId === "string")
  );
}
