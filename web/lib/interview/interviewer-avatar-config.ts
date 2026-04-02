export type InterviewAvatarState = "idle" | "thinking" | "listening" | "speaking";

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

const customAvatarUrl = process.env.NEXT_PUBLIC_INTERVIEWER_AVATAR_URL?.trim();

export const DEFAULT_INTERVIEWER_AVATAR: InterviewerAvatarModelConfig = {
  url: customAvatarUrl || "/interview/avatar/avatarsdk.glb",
  body: "F",
  avatarMood: "neutral",
  baseline: {
    headRotateX: -0.03,
    eyeBlinkLeft: 0.05,
    eyeBlinkRight: 0.05,
  },
};
