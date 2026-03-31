import { prepareInterviewPlaybackAudio } from "@/lib/interview/playback-audio";

interface SessionStartResult {
  success?: boolean;
  data?: {
    sessionId?: string;
  };
  error?: string;
}

interface OpeningPrepareResult {
  success?: boolean;
  data?: {
    prepared?: boolean;
  };
  error?: string;
}

interface StartInterviewPreflightOptions {
  sessionStartEndpoint: string;
  sessionStartBody: Record<string, unknown>;
}

export async function startInterviewPreflight({
  sessionStartEndpoint,
  sessionStartBody,
}: StartInterviewPreflightOptions): Promise<{ sessionId: string; openingPrepared: boolean }> {
  const [audioReady, sessionResponse] = await Promise.all([
    prepareInterviewPlaybackAudio(),
    fetch(sessionStartEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionStartBody),
    }),
  ]);

  if (!audioReady) {
    throw new Error("브라우저 오디오를 준비하지 못했습니다. 다시 시도해 주세요.");
  }

  const sessionResult = (await sessionResponse.json().catch(() => null)) as SessionStartResult | null;
  if (!sessionResponse.ok || !sessionResult?.success || !sessionResult.data?.sessionId) {
    throw new Error(sessionResult?.error || "면접 세션 생성에 실패했습니다.");
  }

  const sessionId = sessionResult.data.sessionId;
  let openingPrepared = false;
  try {
    const prepareResponse = await fetch(`/api/interview/sessions/${encodeURIComponent(sessionId)}/prepare-opening`, {
      method: "POST",
    });
    const prepareResult = (await prepareResponse.json().catch(() => null)) as OpeningPrepareResult | null;
    openingPrepared = Boolean(prepareResponse.ok && prepareResult?.success && prepareResult.data?.prepared);
  } catch {
    openingPrepared = false;
  }

  return { sessionId, openingPrepared };
}
