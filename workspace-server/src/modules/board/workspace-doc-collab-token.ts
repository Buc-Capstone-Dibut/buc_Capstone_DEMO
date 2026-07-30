import { createHmac, timingSafeEqual } from "crypto";
import { COLLAB_TOKEN_SECRET } from "../../config/env";

type WorkspaceDocCollabTokenPayload = {
  docId?: string;
  whiteboardId?: string;
  workspaceId: string;
  userId: string;
  exp: number;
};

function signValue(value: string) {
  return createHmac("sha256", COLLAB_TOKEN_SECRET)
    .update(value)
    .digest("base64url");
}

function decodePayload<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function verifyWorkspaceDocCollabToken(token: string) {
  if (!COLLAB_TOKEN_SECRET) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  const payload = decodePayload<WorkspaceDocCollabTokenPayload>(encodedPayload);
  if (
    !payload ||
    typeof payload.workspaceId !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  if (payload.exp < Date.now()) {
    return null;
  }

  const hasDocTarget = typeof payload.docId === "string";
  const hasWhiteboardTarget = typeof payload.whiteboardId === "string";
  if (hasDocTarget === hasWhiteboardTarget) {
    return null;
  }

  return payload;
}
