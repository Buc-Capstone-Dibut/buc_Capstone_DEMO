"use client";

import Image from "next/image";
import { memo, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  SEMI_REALISTIC_INTERVIEWER_AVATAR_BASE,
  SEMI_REALISTIC_INTERVIEWER_AVATAR_BLINK,
  SEMI_REALISTIC_INTERVIEWER_AVATAR_VISEME_IMAGES,
  type InterviewAvatarState,
  type InterviewAvatarViseme,
} from "@/lib/interview/interviewer-avatar-config";

interface SemiRealisticInterviewerAvatarProps {
  state: InterviewAvatarState;
  audioLevel?: number;
  className?: string;
  blinkImageSrc?: string;
  imageSrc?: string;
  viseme?: InterviewAvatarViseme;
  visemeImageSrcs?: Partial<Record<InterviewAvatarViseme, string>>;
}

const STATE_ACCENT: Record<InterviewAvatarState, string> = {
  idle: "148 163 184",
  thinking: "245 158 11",
  listening: "16 185 129",
  speaking: "59 130 246",
};

const MOUTH_PATCH_VISEMES = [
  "openA",
  "wideI",
  "roundOU",
  "teethFV",
] as const satisfies readonly InterviewAvatarViseme[];
type MouthPatchViseme = (typeof MOUTH_PATCH_VISEMES)[number];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const createMouthPatchValues = (value: number): Record<MouthPatchViseme, number> => ({
  openA: value,
  roundOU: value,
  teethFV: value,
  wideI: value,
});

const getTargetMouthOpen = (
  state: InterviewAvatarState,
  activeViseme: InterviewAvatarViseme,
  audioLevel: number,
) => {
  if (state !== "speaking" || activeViseme === "rest") return 0;
  if (activeViseme === "closedMBP") return clamp(audioLevel * 0.1, 0, 0.08);

  const easedLevel = Math.sqrt(clamp(audioLevel, 0, 1));
  return clamp(0.08 + easedLevel * 0.74, 0.08, 0.82);
};

const getTargetMouthPatchValues = (
  activeViseme: InterviewAvatarViseme,
  mouthOpen: number,
): Record<MouthPatchViseme, number> => {
  const values = createMouthPatchValues(0);
  if (mouthOpen <= 0.01) return values;

  values.openA = mouthOpen * 0.72;

  if (activeViseme === "wideI") {
    values.openA = mouthOpen * 0.48;
    values.wideI = mouthOpen * 0.3;
  } else if (activeViseme === "roundOU") {
    values.openA = mouthOpen * 0.42;
    values.roundOU = mouthOpen * 0.34;
  } else if (activeViseme === "teethFV") {
    values.openA = mouthOpen * 0.34;
    values.teethFV = mouthOpen * 0.28;
  }

  return values;
};

export const SemiRealisticInterviewerAvatar = memo(SemiRealisticInterviewerAvatarImpl);

function SemiRealisticInterviewerAvatarImpl({
  state,
  audioLevel = 0,
  className,
  blinkImageSrc = SEMI_REALISTIC_INTERVIEWER_AVATAR_BLINK,
  imageSrc = SEMI_REALISTIC_INTERVIEWER_AVATAR_BASE,
  viseme = "rest",
  visemeImageSrcs = SEMI_REALISTIC_INTERVIEWER_AVATAR_VISEME_IMAGES,
}: SemiRealisticInterviewerAvatarProps) {
  const normalizedAudioLevel = clamp(audioLevel, 0, 1);
  const audioLevelRef = useRef(normalizedAudioLevel);
  const stateRef = useRef(state);
  const blinkLayerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const mouthOpenRef = useRef(0);
  const mouthPatchRefs = useRef<
    Partial<Record<MouthPatchViseme, HTMLDivElement | null>>
  >({});
  const mouthPatchValuesRef = useRef<Record<MouthPatchViseme, number>>(
    createMouthPatchValues(0),
  );
  const visemeRef = useRef<InterviewAvatarViseme>(viseme);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = normalizedAudioLevel;
  }, [normalizedAudioLevel]);

  useEffect(() => {
    visemeRef.current = viseme;
  }, [viseme]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frameId = 0;
    let blinkStartedAt = -1000;
    let nextBlinkAt = performance.now() + 2200 + Math.random() * 1800;
    let previousFrameAt = performance.now();

    const animate = (now: number) => {
      const deltaMs = clamp(now - previousFrameAt, 0, 80);
      previousFrameAt = now;
      const currentState = stateRef.current;
      const shouldReduceMotion = reduceMotion.matches;
      const currentViseme = currentState === "speaking" ? visemeRef.current : "rest";

      if (!shouldReduceMotion && frameRef.current) {
        const pace = currentState === "speaking" ? 1800 : 2500;
        const breath = Math.sin(now / pace);
        const breathY = breath * 0.42;
        const breathScale = 1.003 + (breath + 1) * 0.0025;
        frameRef.current.style.transform = `translate(-50%, -50%) translate3d(0, ${breathY}%, 0) scale(${breathScale})`;
      }

      if (!shouldReduceMotion && blinkLayerRef.current) {
        if (now >= nextBlinkAt) {
          blinkStartedAt = now;
          nextBlinkAt = now + 3200 + Math.random() * 2600;
        }

        const blinkElapsed = now - blinkStartedAt;
        const nextOpacity =
          blinkElapsed >= 0 && blinkElapsed < 72
            ? 1
            : blinkElapsed >= 72 && blinkElapsed < 138
              ? 0.42
              : 0;
        blinkLayerRef.current.style.opacity = `${nextOpacity}`;
      } else if (blinkLayerRef.current) {
        blinkLayerRef.current.style.opacity = "0";
      }

      const targetMouthOpen = getTargetMouthOpen(
        currentState,
        currentViseme,
        audioLevelRef.current,
      );
      const openTimeConstant = targetMouthOpen > mouthOpenRef.current ? 120 : 155;
      const openStep = 1 - Math.exp(-deltaMs / openTimeConstant);
      mouthOpenRef.current += (targetMouthOpen - mouthOpenRef.current) * openStep;

      const targetPatchValues = getTargetMouthPatchValues(currentViseme, mouthOpenRef.current);
      const patchStep = 1 - Math.exp(-deltaMs / 145);
      for (const patchViseme of MOUTH_PATCH_VISEMES) {
        const nextValue =
          mouthPatchValuesRef.current[patchViseme]
          + (
            targetPatchValues[patchViseme]
            - mouthPatchValuesRef.current[patchViseme]
          ) * patchStep;
        const stableValue = Math.abs(nextValue) < 0.006 ? 0 : nextValue;
        const layer = mouthPatchRefs.current[patchViseme];
        mouthPatchValuesRef.current[patchViseme] = stableValue;

        if (!layer) continue;
        const scaleY =
          patchViseme === "openA"
            ? 0.9 + mouthOpenRef.current * 0.14
            : 0.96 + mouthOpenRef.current * 0.06;
        const translateY = patchViseme === "openA" ? (1 - mouthOpenRef.current) * 0.18 : 0;
        layer.style.opacity = `${clamp(stableValue, 0, 0.82)}`;
        layer.style.transform = `translate3d(0, ${translateY}%, 0) scaleY(${scaleY})`;
      }

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const accent = STATE_ACCENT[state];
  const sceneStyle = useMemo(
    () => ({
      background: "#edf3f7",
      containerType: "size",
      height: "100%",
      isolation: "isolate",
      minHeight: 420,
      overflow: "hidden",
      position: "relative",
      width: "100%",
    }) as CSSProperties,
    [],
  );

  const frameStyle = useMemo(
    () => ({
      height: "max(100cqh, 66.6667cqw)",
      left: "50%",
      overflow: "hidden",
      position: "absolute",
      top: "50%",
      transform: "translate(-50%, -50%)",
      transformOrigin: "50% 68%",
      width: "max(100cqw, 150cqh)",
      zIndex: 1,
    }) as CSSProperties,
    [],
  );

  const baseImageStyle = useMemo(
    () => ({
      filter: "saturate(1.02) contrast(1.01)",
      objectFit: "cover",
      objectPosition: "center",
      userSelect: "none",
      zIndex: 1,
    }) as CSSProperties,
    [],
  );

  const focusStyle = useMemo(
    () => ({
      background: [
        `radial-gradient(circle at 50% 37%, rgba(${accent} / ${state === "listening" ? "0.15" : "0.12"}), transparent 24%)`,
        `linear-gradient(to top, rgba(255 255 255 / ${state === "listening" ? "0.2" : "0.18"}), transparent 34%)`,
      ].join(", "),
      inset: 0,
      mixBlendMode: "soft-light",
      pointerEvents: "none",
      position: "absolute",
      zIndex: 2,
    }) as CSSProperties,
    [accent, state],
  );

  const mouthPatchStyle = useMemo(
    () => ({
      inset: 0,
      maskImage:
        "radial-gradient(ellipse 8.4% 4.8% at 50.9% 53.4%, #000 46%, rgba(0, 0, 0, 0.78) 72%, transparent 100%)",
      opacity: 0,
      pointerEvents: "none",
      position: "absolute",
      transformOrigin: "50.9% 53.4%",
      WebkitMaskImage:
        "radial-gradient(ellipse 8.4% 4.8% at 50.9% 53.4%, #000 46%, rgba(0, 0, 0, 0.78) 72%, transparent 100%)",
      willChange: "opacity, transform",
      zIndex: 3,
    }) as CSSProperties,
    [],
  );

  const blinkPatchStyle = useMemo(
    () => ({
      inset: 0,
      maskImage:
        "radial-gradient(ellipse 8.4% 3.4% at 47.2% 36.9%, #000 44%, rgba(0, 0, 0, 0.74) 68%, transparent 100%), radial-gradient(ellipse 8.4% 3.4% at 56.7% 36.8%, #000 44%, rgba(0, 0, 0, 0.74) 68%, transparent 100%)",
      opacity: 0,
      pointerEvents: "none",
      position: "absolute",
      transition: "opacity 52ms ease-in-out",
      WebkitMaskImage:
        "radial-gradient(ellipse 8.4% 3.4% at 47.2% 36.9%, #000 44%, rgba(0, 0, 0, 0.74) 68%, transparent 100%), radial-gradient(ellipse 8.4% 3.4% at 56.7% 36.8%, #000 44%, rgba(0, 0, 0, 0.74) 68%, transparent 100%)",
      zIndex: 4,
    }) as CSSProperties,
    [],
  );

  const mouthPatchEntries = useMemo(
    () =>
      MOUTH_PATCH_VISEMES
        .map((mouthViseme) => ({
          imageSrc: visemeImageSrcs[mouthViseme],
          viseme: mouthViseme,
        }))
        .filter((entry): entry is { imageSrc: string; viseme: MouthPatchViseme } =>
          Boolean(entry.imageSrc),
        ),
    [visemeImageSrcs],
  );

  const activeViseme = state === "speaking" ? viseme : "rest";

  const statusGlowStyle = useMemo(
    () => ({
      background: `radial-gradient(ellipse at center, rgba(${accent} / ${state === "idle" ? "0.18" : "0.28"}), transparent 68%)`,
      borderRadius: 999,
      bottom: "8%",
      filter: "blur(26px)",
      height: "18%",
      left: "18%",
      opacity: state === "idle" ? 0.38 : 0.65,
      pointerEvents: "none",
      position: "absolute",
      right: "18%",
      zIndex: 0,
    }) as CSSProperties,
    [accent, state],
  );

  return (
    <div
      className={cn("avatar-scene", className)}
      data-state={state}
      data-viseme={activeViseme}
      style={sceneStyle}
    >
      <div ref={frameRef} className="avatar-frame" style={frameStyle}>
        <Image
          src={imageSrc}
          alt="Debut AI interviewer"
          fill
          sizes="(max-width: 768px) 150vw, 75vw"
          priority
          className="avatar-base"
          draggable={false}
          style={baseImageStyle}
        />

        <div className="avatar-focus" style={focusStyle} />
        <div
          ref={blinkLayerRef}
          className="avatar-blink-patch"
          aria-hidden="true"
          style={blinkPatchStyle}
        >
          <Image
            src={blinkImageSrc}
            alt=""
            fill
            sizes="(max-width: 768px) 150vw, 75vw"
            className="avatar-blink-frame"
            draggable={false}
            style={baseImageStyle}
          />
        </div>
        {mouthPatchEntries.map((entry) => (
          <div
            key={entry.viseme}
            ref={(node) => {
              mouthPatchRefs.current[entry.viseme] = node;
            }}
            className="avatar-mouth-patch"
            aria-hidden="true"
            data-viseme-patch={entry.viseme}
            style={mouthPatchStyle}
          >
            <Image
              src={entry.imageSrc}
              alt=""
              fill
              sizes="(max-width: 768px) 150vw, 75vw"
              className="avatar-mouth-frame"
              draggable={false}
              style={baseImageStyle}
            />
          </div>
        ))}
      </div>
      <div className="avatar-status-glow" style={statusGlowStyle} />
    </div>
  );
}
