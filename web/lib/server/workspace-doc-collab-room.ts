const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? "";

function getWorkspaceServerHttpUrl() {
  const configuredUrl =
    process.env.WORKSPACE_SERVER_HTTP_URL ||
    process.env.WORKSPACE_SERVER_URL ||
    null;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const publicWsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (publicWsUrl) {
    return publicWsUrl.replace(/^wss?:\/\//, (match) =>
      match === "wss://" ? "https://" : "http://",
    );
  }

  return "http://localhost:4000";
}

async function callWorkspaceServerDocRoomAction(
  docId: string,
  action: "reset" | "flush",
  options: { force?: boolean } = {},
) {
  if (!INTERNAL_API_SECRET) {
    return {
      ok: false as const,
      status: 500,
      error: "INTERNAL_API_SECRET is required to manage document collaboration rooms.",
    };
  }

  let response: Response;
  try {
    const query = action === "reset" && options.force ? "?force=true" : "";
    response = await fetch(
      `${getWorkspaceServerHttpUrl()}/internal/yjs/docs/${docId}/${action}${query}`,
      {
        method: "POST",
        headers: {
          "x-internal-secret": INTERNAL_API_SECRET,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );
  } catch (error) {
    console.error(`[doc-collab] workspace server ${action} failed`, error);
    return {
      ok: false as const,
      status: 503,
      error: "Workspace collaboration server is unavailable.",
    };
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        error?: string;
      }
    | null;

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error: payload?.error || "Workspace server request failed",
    };
  }

  return { ok: true as const };
}

export function resetWorkspaceDocCollabRoom(
  docId: string,
  options: { force?: boolean } = {},
) {
  return callWorkspaceServerDocRoomAction(docId, "reset", options);
}

export function flushWorkspaceDocCollabRoom(docId: string) {
  return callWorkspaceServerDocRoomAction(docId, "flush");
}
