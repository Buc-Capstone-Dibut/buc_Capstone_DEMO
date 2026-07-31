import { createHmac, timingSafeEqual } from "crypto";
import { WHITEBOARD_TOKEN_SECRET } from "../../config/env";

type WorkspaceWhiteboardTokenPayload = {
  whiteboardId: string;
  workspaceId: string;
  userId: string;
  exp: number;
};

function signValue(value: string) {
  return createHmac("sha256", WHITEBOARD_TOKEN_SECRET)
    .update(value)
    .digest("base64url");
}

export function verifyWorkspaceWhiteboardToken(token: string) {
  if (!WHITEBOARD_TOKEN_SECRET) return null;

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) return null;

  const expectedBuffer = Buffer.from(signValue(encodedPayload));
  const providedBuffer = Buffer.from(providedSignature);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as WorkspaceWhiteboardTokenPayload;
    if (
      typeof payload.whiteboardId !== "string" ||
      typeof payload.workspaceId !== "string" ||
      typeof payload.userId !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now() ||
      payload.whiteboardId !== payload.workspaceId
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
