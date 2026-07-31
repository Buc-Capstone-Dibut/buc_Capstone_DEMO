import { createHmac } from "crypto";

const WHITEBOARD_SECRET =
  process.env.WHITEBOARD_TOKEN_SECRET ??
  process.env.COLLAB_TOKEN_SECRET ??
  process.env.INTERNAL_API_SECRET ??
  "";
const WHITEBOARD_TOKEN_TTL_MS = 5 * 60 * 1000;

type WorkspaceWhiteboardTokenPayload = {
  whiteboardId: string;
  workspaceId: string;
  userId: string;
  exp: number;
};

function signValue(value: string) {
  return createHmac("sha256", WHITEBOARD_SECRET)
    .update(value)
    .digest("base64url");
}

export function createWorkspaceWhiteboardToken(input: {
  workspaceId: string;
  userId: string;
}) {
  if (!WHITEBOARD_SECRET) {
    throw new Error(
      "WHITEBOARD_TOKEN_SECRET is required to issue whiteboard tokens.",
    );
  }

  const payload: WorkspaceWhiteboardTokenPayload = {
    whiteboardId: input.workspaceId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    exp: Date.now() + WHITEBOARD_TOKEN_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${encodedPayload}.${signValue(encodedPayload)}`;
}
