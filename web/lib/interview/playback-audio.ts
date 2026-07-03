const getAudioContextClass = () => {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
};

let sharedAudioContext: AudioContext | null = null;
let sharedAudioPrimed = false;
let recordingTap: MediaStreamAudioDestinationNode | null = null;

export function getInterviewPlaybackAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedAudioContext && sharedAudioContext.state !== "closed") {
    return sharedAudioContext;
  }
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;
  sharedAudioContext = new AudioContextClass();
  recordingTap = null; // 새 컨텍스트 — 이전 컨텍스트의 탭 노드는 무음이므로 폐기
  return sharedAudioContext;
}

/**
 * AI(면접관) 재생 음성을 녹화로 뽑아내는 탭.
 * 재생 소스가 스피커(ctx.destination)와 이 탭에 이중 connect 되어,
 * 탭의 stream 을 녹화 믹서에 넣으면 면접관 음성이 녹화에 포함된다.
 * 컨텍스트가 재생성되면 탭도 재생성한다(낡은 컨텍스트의 노드는 무음).
 * 주의: 이 탭을 ctx.destination 에 connect 하면 이중 재생(에코)이 난다 — 금지.
 */
export function getInterviewPlaybackRecordingTap(): MediaStreamAudioDestinationNode | null {
  const ctx = getInterviewPlaybackAudioContext();
  if (!ctx) return null;
  if (recordingTap && recordingTap.context === ctx) return recordingTap;
  recordingTap = ctx.createMediaStreamDestination();
  return recordingTap;
}

export async function prepareInterviewPlaybackAudio(): Promise<boolean> {
  const ctx = getInterviewPlaybackAudioContext();
  if (!ctx) return false;
  if (ctx.state !== "running") {
    await ctx.resume();
  }
  sharedAudioPrimed = ctx.state === "running";
  return sharedAudioPrimed;
}

export function isInterviewPlaybackAudioReady(): boolean {
  return Boolean(sharedAudioPrimed && sharedAudioContext && sharedAudioContext.state === "running");
}

export async function releaseInterviewPlaybackAudio(): Promise<void> {
  recordingTap = null;
  if (!sharedAudioContext) {
    sharedAudioPrimed = false;
    return;
  }
  const ctx = sharedAudioContext;
  sharedAudioContext = null;
  sharedAudioPrimed = false;
  if (ctx.state !== "closed") {
    await ctx.close();
  }
}
