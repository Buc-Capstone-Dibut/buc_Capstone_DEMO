"use client";

// Voice notification sounds + playback unlock. Extracted verbatim from
// voice-manager so it can be shared by the lazily-loaded active-call overlay
// WITHOUT pulling the LiveKit SDK into the provider. No LiveKit dependency here.

const SOUND_DEBOUNCE_MS = 800;
export const VOICE_JOIN_SOUND = "/sound/Join_Sound.mp3";
export const VOICE_LEAVE_SOUND = "/sound/Leave_Sound.mp3";
const VOICE_SOUND_VOLUME = 0.35;
const voiceSoundPlayedAt = new Map<string, number>();
const voiceSoundCache = new Map<string, HTMLAudioElement>();
let voiceSoundUnlockAttempted = false;
let hasLoggedVoiceSoundError = false;

export type VoiceSoundKind = "join" | "leave";

function getCachedVoiceSound(src: string) {
  const cached = voiceSoundCache.get(src);
  if (cached) {
    return cached;
  }

  const audio = new Audio(src);
  audio.preload = "auto";
  voiceSoundCache.set(src, audio);
  return audio;
}

function playFallbackTone(kind: VoiceSoundKind) {
  if (typeof window === "undefined") return;

  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;

  try {
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const baseFreq = kind === "join" ? 880 : 440;
    const endAt = now + 0.2;

    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.02, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(endAt);
    osc.onended = () => {
      void ctx.close().catch(() => {});
    };
  } catch {
    // Ignore fallback tone errors.
  }
}

export async function unlockVoiceSoundPlayback() {
  if (typeof window === "undefined" || voiceSoundUnlockAttempted) return;
  voiceSoundUnlockAttempted = true;

  const sources = [VOICE_JOIN_SOUND, VOICE_LEAVE_SOUND];
  await Promise.allSettled(
    sources.map(async (src) => {
      const audio = getCachedVoiceSound(src);
      audio.muted = true;
      audio.currentTime = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }),
  );
}

export function playVoiceSound(src: string, key: string, kind: VoiceSoundKind) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const prev = voiceSoundPlayedAt.get(key) || 0;
  if (now - prev < SOUND_DEBOUNCE_MS) return;

  voiceSoundPlayedAt.set(key, now);
  const audio = getCachedVoiceSound(src).cloneNode(true) as HTMLAudioElement;
  audio.volume = VOICE_SOUND_VOLUME;
  void audio.play().catch((error) => {
    if (!hasLoggedVoiceSoundError) {
      hasLoggedVoiceSoundError = true;
      console.warn("[Voice] Sound playback failed. Using fallback tone.", error);
    }
    playFallbackTone(kind);
  });
}
