export function isSttTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "development") return true;
  const query = new URLSearchParams(window.location.search).get("debugStt");
  if (query === "0") return false;
  if (query === "1") return true;
  try {
    return window.sessionStorage.getItem("interview.sttDebug") === "1";
  } catch {
    return false;
  }
}

export function rememberSttTracePreference(): void {
  if (typeof window === "undefined") return;
  const query = new URLSearchParams(window.location.search).get("debugStt");
  try {
    if (query === "1") window.sessionStorage.setItem("interview.sttDebug", "1");
    if (query === "0") window.sessionStorage.removeItem("interview.sttDebug");
  } catch {
    // The URL flag still works when browser storage is unavailable.
  }
}

export function logSttTrace(stage: string, fields: Record<string, unknown> = {}): void {
  if (!isSttTraceEnabled()) return;
  // Timing and counters only: never record microphone samples or transcript text.
  console.info(`[Debut STT] ${JSON.stringify({ stage, atMs: Math.round(performance.now()), epochMs: Date.now(), ...fields })}`);
}
