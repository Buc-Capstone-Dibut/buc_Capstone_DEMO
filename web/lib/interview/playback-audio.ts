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

export function getInterviewPlaybackAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedAudioContext && sharedAudioContext.state !== "closed") {
    return sharedAudioContext;
  }
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;
  sharedAudioContext = new AudioContextClass();
  return sharedAudioContext;
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
