export const LOCAL_INTERVIEW_FALLBACK_USER_ID = "local-dev-user";

export function resolveInterviewBaseUrlFromWsUrl(socketUrl: string): string {
  try {
    const parsed = new URL(socketUrl);
    parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:8001";
  }
}

export function isLocalInterviewBaseUrl(baseUrl: string): boolean {
  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
