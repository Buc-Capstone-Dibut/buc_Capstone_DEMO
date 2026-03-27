import { createHmac, timingSafeEqual } from "crypto";
import { INTERNAL_API_SECRET } from "../../config/env";

type WorkspaceDocCollabTokenPayload = {
  docId: string;
  workspaceId: string;
  userId: string;
  exp: number;
};

function signValue(value: string) {
  return createHmac("sha256", INTERNAL_API_SECRET).update(value).digest("base64url");
}

function decodePayload<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function verifyWorkspaceDocCollabToken(token: string) {
  if (!INTERNAL_API_SECRET) {
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
  if (!payload) {
    return null;
  }

  if (payload.exp < Date.now()) {
    return null;
  }

  return payload;
}
