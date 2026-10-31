"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { InterviewAvatarState } from "@/lib/interview/interviewer-avatar-config";

/**
 * 신입(entry) 면접관 — 눈(뜸·감음) × 입(다묾·반쯤·벌림) 6프레임.
 * 프레임을 반투명으로 섞지 않고, 눈·입 자리에만 둥근 마스크를 씌워 한 장씩 바꿔 끼운다.
 * 말하는 동안 입을 정해진 순서로 0.18초마다 바꾸고, 중간에 꼭 '다묾'을 넣어 열고 닫는 리듬이 보이게 한다.
 * 출처: jhkim0602/gbsa_aws apps/applicant-interview/src/features/interview/Avatar.tsx
 */

type EyeState = "open" | "closed";
type MouthState = "closed" | "mid" | "open";

const MOUTH_SEQUENCE: readonly MouthState[] = ["mid", "mid", "closed", "mid", "mid", "open", "mid", "closed"];
const MOUTH_FRAME_DURATION_MS = 180;
const MOUTH_CROSSFADE_MS = 110;
const MID_MOUTH_OPACITY = 0.88;
const OPEN_MOUTH_OPACITY = 0.72;
const BLINK_DURATION_MS = 140;
const BLINK_DELAYS_MS = [3200, 4700, 3800] as const;
// 문장 사이 쉼: 음량이 이 값 아래로 이만큼 머물면 입을 다문다(음량 = RMS×8, 0~1).
const SILENT_LEVEL = 0.06;
const SILENT_HOLD_MS = 220;
const AVATAR_WIDTH = 1536;
const AVATAR_HEIGHT = 1024;

const EYE_AREAS = [
  { cx: 704, cy: 312, rx: 60, ry: 30 },
  { cx: 832, cy: 312, rx: 60, ry: 30 },
] as const;
const EYE_BLUR = 8;
const MOUTH_AREA = { cx: 768, cy: 462, rx: 82, ry: 34 } as const;
const MOUTH_BLUR = 5;

const frameSrc = (eyes: EyeState, mouth: MouthState) =>
  `/images/interview/avatar/entry/eyes-${eyes}-mouth-${mouth}.webp`;
const BASE_SRC = frameSrc("open", "closed");
const EYES_CLOSED_SRC = frameSrc("closed", "closed");
const MOUTH_MID_SRC = frameSrc("open", "mid");
const MOUTH_OPEN_SRC = frameSrc("open", "open");

export function EntryInterviewerAvatar({
  state,
  audioLevel = 0,
  className,
}: {
  state: InterviewAvatarState;
  audioLevel?: number;
  className?: string;
}) {
  const [eyes, setEyes] = useState<EyeState>("open");
  const [mouth, setMouth] = useState<MouthState>("closed");
  const svgId = useId().replaceAll(":", "");
  const speaking = state === "speaking";
  const audioLevelRef = useRef(audioLevel);
  audioLevelRef.current = audioLevel;

  useEffect(() => {
    for (const src of [BASE_SRC, EYES_CLOSED_SRC, MOUTH_MID_SRC, MOUTH_OPEN_SRC]) {
      const image = new Image();
      image.src = src;
    }
  }, []);

  useEffect(() => {
    let delayIndex = 0;
    let blinkTimer: number | undefined;
    let reopenTimer: number | undefined;
    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        setEyes("closed");
        reopenTimer = window.setTimeout(() => {
          setEyes("open");
          delayIndex = (delayIndex + 1) % BLINK_DELAYS_MS.length;
          scheduleBlink();
        }, BLINK_DURATION_MS);
      }, BLINK_DELAYS_MS[delayIndex]);
    };
    scheduleBlink();
    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(reopenTimer);
    };
  }, []);

  useEffect(() => {
    if (!speaking) {
      setMouth("closed");
      return undefined;
    }
    let index = 0;
    let silentSince: number | null = null;
    setMouth(MOUTH_SEQUENCE[index]);
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (audioLevelRef.current < SILENT_LEVEL) {
        silentSince ??= now;
        if (now - silentSince >= SILENT_HOLD_MS) {
          setMouth("closed");
          return;
        }
      } else {
        silentSince = null;
      }
      index = (index + 1) % MOUTH_SEQUENCE.length;
      setMouth(MOUTH_SEQUENCE[index]);
    }, MOUTH_FRAME_DURATION_MS);
    return () => window.clearInterval(timer);
  }, [speaking]);

  const eyeMaskId = `${svgId}-eye-mask`;
  const eyeBlurId = `${svgId}-eye-blur`;
  const mouthMaskId = `${svgId}-mouth-mask`;
  const mouthBlurId = `${svgId}-mouth-blur`;
  const mouthFade = { transition: `opacity ${MOUTH_CROSSFADE_MS}ms ease-out` };

  return (
    <figure
      className={cn("relative m-0 overflow-hidden bg-slate-200", className)}
      aria-label={speaking ? "AI 면접관 발화 중" : "AI 면접관 대기 중"}
      data-state={state}
      data-eyes={eyes}
      data-mouth={mouth}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${AVATAR_WIDTH} ${AVATAR_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="신입 AI 면접관"
        focusable="false"
      >
        <defs>
          <filter id={eyeBlurId} x="0" y="0" width={AVATAR_WIDTH} height={AVATAR_HEIGHT} filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation={EYE_BLUR} />
          </filter>
          <filter id={mouthBlurId} x="0" y="0" width={AVATAR_WIDTH} height={AVATAR_HEIGHT} filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation={MOUTH_BLUR} />
          </filter>
          <mask id={eyeMaskId} x="0" y="0" width={AVATAR_WIDTH} height={AVATAR_HEIGHT} maskUnits="userSpaceOnUse">
            <rect width={AVATAR_WIDTH} height={AVATAR_HEIGHT} fill="black" />
            {EYE_AREAS.map((area, index) => (
              <ellipse key={index} {...area} fill="white" filter={`url(#${eyeBlurId})`} />
            ))}
          </mask>
          <mask id={mouthMaskId} x="0" y="0" width={AVATAR_WIDTH} height={AVATAR_HEIGHT} maskUnits="userSpaceOnUse">
            <rect width={AVATAR_WIDTH} height={AVATAR_HEIGHT} fill="black" />
            <ellipse {...MOUTH_AREA} fill="white" filter={`url(#${mouthBlurId})`} />
          </mask>
        </defs>
        <image href={BASE_SRC} width={AVATAR_WIDTH} height={AVATAR_HEIGHT} />
        <image
          href={EYES_CLOSED_SRC}
          width={AVATAR_WIDTH}
          height={AVATAR_HEIGHT}
          mask={`url(#${eyeMaskId})`}
          opacity={eyes === "closed" ? 1 : 0}
        />
        <image
          href={MOUTH_MID_SRC}
          width={AVATAR_WIDTH}
          height={AVATAR_HEIGHT}
          mask={`url(#${mouthMaskId})`}
          opacity={mouth === "mid" ? MID_MOUTH_OPACITY : 0}
          style={mouthFade}
        />
        <image
          href={MOUTH_OPEN_SRC}
          width={AVATAR_WIDTH}
          height={AVATAR_HEIGHT}
          mask={`url(#${mouthMaskId})`}
          opacity={mouth === "open" ? OPEN_MOUTH_OPACITY : 0}
          style={mouthFade}
        />
      </svg>
    </figure>
  );
}
