export type InterviewAvatarState = "idle" | "thinking" | "listening" | "speaking";
export type InterviewAvatarViseme = "rest" | "openA" | "wideI" | "roundOU" | "closedMBP" | "teethFV";

export interface InterviewerAvatarModelConfig extends Record<string, unknown> {
  url: string;
  body?: "M" | "F";
  avatarMood?: "neutral" | "happy" | "angry" | "sad" | "fear" | "disgust" | "love" | "sleep";
  baseline?: Record<string, number>;
  retarget?: Record<string, unknown>;
}

export const INTERVIEWER_AVATAR_FALLBACKS: Record<InterviewAvatarState, string> = {
  idle: "/interview/avatar/dibut-idle.svg",
  thinking: "/interview/avatar/dibut-thinking.svg",
  listening: "/interview/avatar/dibut-listening.svg",
  speaking: "/interview/avatar/dibut-speaking.svg",
};

export const SEMI_REALISTIC_INTERVIEWER_AVATAR_BASE =
  "/images/interview/avatar/interviewer-base-v1.png";
export const SEMI_REALISTIC_INTERVIEWER_AVATAR_BLINK =
  "/images/interview/avatar/interviewer-blink-v1.png";
export const SEMI_REALISTIC_INTERVIEWER_AVATAR_MOUTH_OPEN =
  "/images/interview/avatar/interviewer-mouth-open-v1.png";
export const SEMI_REALISTIC_INTERVIEWER_AVATAR_MOUTH_WIDE_I =
  "/images/interview/avatar/interviewer-mouth-wide-i-v1.png";
export const SEMI_REALISTIC_INTERVIEWER_AVATAR_MOUTH_ROUND_OU =
  "/images/interview/avatar/interviewer-mouth-round-ou-v1.png";
export const SEMI_REALISTIC_INTERVIEWER_AVATAR_MOUTH_TEETH_FV =
  "/images/interview/avatar/interviewer-mouth-teeth-fv-v1.png";

export const SEMI_REALISTIC_INTERVIEWER_AVATAR_VISEME_IMAGES: Partial<Record<InterviewAvatarViseme, string>> = {
  openA: SEMI_REALISTIC_INTERVIEWER_AVATAR_MOUTH_OPEN,
  wideI: SEMI_REALISTIC_INTERVIEWER_AVATAR_MOUTH_WIDE_I,
  roundOU: SEMI_REALISTIC_INTERVIEWER_AVATAR_MOUTH_ROUND_OU,
  teethFV: SEMI_REALISTIC_INTERVIEWER_AVATAR_MOUTH_TEETH_FV,
};

const customAvatarUrl = process.env.NEXT_PUBLIC_INTERVIEWER_AVATAR_URL?.trim();

export const DEFAULT_INTERVIEWER_AVATAR: InterviewerAvatarModelConfig = {
  url: customAvatarUrl || "/interview/avatar/talkinghead-avaturn.glb",
  body: "F",
  avatarMood: "neutral",
  baseline: {
    headRotateX: 0.01,
    eyeBlinkLeft: 0.05,
    eyeBlinkRight: 0.05,
  },
};
