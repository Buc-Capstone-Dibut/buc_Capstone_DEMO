import type { InterviewAvatarViseme } from "@/lib/interview/interviewer-avatar-config";

export interface InterviewAvatarVisemeCue {
  viseme: InterviewAvatarViseme;
  atMs: number;
}

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const HANGUL_MEDIAL_COUNT = 21;
const HANGUL_FINAL_COUNT = 28;

const KOREAN_MEDIAL_VISEMES: InterviewAvatarViseme[] = [
  "openA",
  "wideI",
  "openA",
  "wideI",
  "openA",
  "wideI",
  "openA",
  "wideI",
  "roundOU",
  "wideI",
  "wideI",
  "wideI",
  "roundOU",
  "roundOU",
  "roundOU",
  "roundOU",
  "roundOU",
  "wideI",
  "wideI",
  "wideI",
  "wideI",
];

const KOREAN_CLOSED_FINALS = new Set([16, 17, 26]);
const VISEME_CUE_INTERVAL_MS = 185;
const FALLBACK_SEQUENCE: InterviewAvatarViseme[] = ["openA", "wideI", "openA", "roundOU", "closedMBP"];

const isPunctuationOrSpace = (char: string) => /[\s.,!?;:()[\]{}"'`~…·、。！？]/u.test(char);

const isHangulSyllable = (char: string) => {
  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_END;
};

const hangulToVisemes = (char: string): InterviewAvatarViseme[] => {
  const offset = char.charCodeAt(0) - HANGUL_BASE;
  const medial = Math.floor(offset / HANGUL_FINAL_COUNT) % HANGUL_MEDIAL_COUNT;
  const final = offset % HANGUL_FINAL_COUNT;
  const primary = KOREAN_MEDIAL_VISEMES[medial] ?? "openA";
  return KOREAN_CLOSED_FINALS.has(final) ? [primary, "closedMBP"] : [primary];
};

export const textToAvatarVisemeSequence = (text: string): InterviewAvatarViseme[] => {
  const sequence: InterviewAvatarViseme[] = [];
  const normalized = text.normalize("NFKC");

  for (const char of Array.from(normalized)) {
    const lower = char.toLowerCase();

    if (isPunctuationOrSpace(char)) {
      sequence.push("rest");
    } else if (isHangulSyllable(char)) {
      sequence.push(...hangulToVisemes(char));
    } else if (/[bmp]/.test(lower)) {
      sequence.push("closedMBP");
    } else if (/[fv]/.test(lower)) {
      sequence.push("teethFV");
    } else if (/[ouqw]/.test(lower)) {
      sequence.push("roundOU");
    } else if (/[ieyj]/.test(lower)) {
      sequence.push("wideI");
    } else if (/[a]/.test(lower)) {
      sequence.push("openA");
    } else if (/[0-9ㄱ-ㅎㅏ-ㅣa-z]/.test(lower)) {
      sequence.push("openA");
    }
  }

  return sequence.filter((viseme, index) => {
    const previous = sequence[index - 1];
    if (!previous) return true;
    if (previous === "rest") return viseme !== "rest";
    if (viseme === "rest") return true;
    return viseme !== previous;
  });
};

export const buildApproximateVisemeTimeline = (
  text: string,
  durationMs: number,
): InterviewAvatarVisemeCue[] => {
  const safeDurationMs = Math.max(80, Math.round(durationMs));
  const cueCount = Math.max(1, Math.ceil(safeDurationMs / VISEME_CUE_INTERVAL_MS));
  const sourceSequence = textToAvatarVisemeSequence(text);
  const sequence = sourceSequence.length ? sourceSequence : FALLBACK_SEQUENCE;
  const cues: InterviewAvatarVisemeCue[] = [];

  for (let index = 0; index < cueCount; index += 1) {
    const sourceIndex = Math.floor((index / cueCount) * sequence.length);
    const viseme = sequence[sourceIndex] ?? sequence[index % sequence.length] ?? "openA";
    cues.push({
      viseme,
      atMs: Math.round((index / cueCount) * safeDurationMs),
    });
  }

  cues.push({ viseme: "rest", atMs: safeDurationMs });
  return cues;
};
