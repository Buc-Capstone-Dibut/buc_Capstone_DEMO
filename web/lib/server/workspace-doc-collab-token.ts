import { createHmac, timingSafeEqual } from "crypto";

const COLLAB_SECRET =
  process.env.COLLAB_TOKEN_SECRET ?? process.env.INTERNAL_API_SECRET ?? "";
export const WORKSPACE_DOC_COLLAB_TOKEN_TTL_MS = 5 * 60 * 1000;

type WorkspaceDocCollabTokenPayload = {
  docId?: string;
  whiteboardId?: string;
  workspaceId: string;
  userId: string;
  exp: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function signValue(value: string) {
  return createHmac("sha256", COLLAB_SECRET).update(value).digest("base64url");
}

export function createWorkspaceDocCollabToken(input: {
  docId: string;
  workspaceId: string;
  userId: string;
}) {
  if (!COLLAB_SECRET) {
    throw new Error(
      "COLLAB_TOKEN_SECRET is required to issue collaboration tokens.",
    );
  }

  const payload: WorkspaceDocCollabTokenPayload = {
    docId: input.docId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    exp: Date.now() + WORKSPACE_DOC_COLLAB_TOKEN_TTL_MS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function createWorkspaceWhiteboardToken(input: {
  workspaceId: string;
  userId: string;
}) {
  if (!COLLAB_SECRET) {
    throw new Error(
      "COLLAB_TOKEN_SECRET is required to issue collaboration tokens.",
    );
  }

  const payload: WorkspaceDocCollabTokenPayload = {
    whiteboardId: input.workspaceId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    exp: Date.now() + WORKSPACE_DOC_COLLAB_TOKEN_TTL_MS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyWorkspaceDocCollabToken(token: string) {
  if (!COLLAB_SECRET) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = signValue(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  const payload = fromBase64Url<WorkspaceDocCollabTokenPayload>(encodedPayload);
  if (!payload) return null;
  if (
    typeof payload.workspaceId !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.exp !== "number" ||
    payload.exp < Date.now()
  ) {
    return null;
  }

  const hasDocTarget = typeof payload.docId === "string";
  const hasWhiteboardTarget = typeof payload.whiteboardId === "string";
  if (hasDocTarget === hasWhiteboardTarget) return null;

  return payload;
}
