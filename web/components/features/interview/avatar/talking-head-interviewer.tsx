"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TalkingHead } from "@met4citizen/talkinghead";
import { cn } from "@/lib/utils";
import {
  DEFAULT_INTERVIEWER_AVATAR,
  INTERVIEWER_AVATAR_FALLBACKS,
  type InterviewAvatarState,
  type InterviewerAvatarModelConfig,
} from "@/lib/interview/interviewer-avatar-config";

interface TalkingHeadInterviewerProps {
  state: InterviewAvatarState;
  className?: string;
  model?: InterviewerAvatarModelConfig;
}

const setMorphTargetValue = (
  head: TalkingHead | null,
  key: string,
  value: number | null,
) => {
  const target = head?.mtAvatar?.[key];
  if (!target) return;
  target.realtime = value;
  target.needsUpdate = true;
};

export function TalkingHeadInterviewer({
  state,
  className,
  model = DEFAULT_INTERVIEWER_AVATAR,
}: TalkingHeadInterviewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<TalkingHead | null>(null);
  const mouthLoopRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const fallbackImage = useMemo(() => INTERVIEWER_AVATAR_FALLBACKS[state], [state]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      if (!containerRef.current) return;

      setIsReady(false);
      setHasError(false);
      setLoadProgress(0);

      try {
        const { TalkingHead } = await import("@met4citizen/talkinghead");
        if (cancelled || !containerRef.current) return;

        const head = new TalkingHead(containerRef.current, {
          cameraView: "upper",
          cameraPanEnable: false,
          cameraRotateEnable: false,
          cameraZoomEnable: false,
          modelFPS: 30,
          modelPixelRatio: 0.9,
          lipsyncModules: [],
          avatarMood: "neutral",
          avatarIdleEyeContact: 0.35,
          avatarIdleHeadMove: 0.2,
          avatarSpeakingEyeContact: 0.8,
          avatarSpeakingHeadMove: 0.65,
          lightAmbientIntensity: 2.1,
          lightDirectColor: 0xcbd5f5,
          lightDirectIntensity: 18,
          lightDirectPhi: 1,
          lightDirectTheta: 2,
          lightSpotColor: 0x93c5fd,
          lightSpotIntensity: 6,
          lightSpotPhi: 0.2,
          lightSpotTheta: 4.2,
          lightSpotDispersion: 0.65,
        });

        await head.showAvatar(model as Record<string, unknown>, (event) => {
          if (!event?.lengthComputable || cancelled) return;
          setLoadProgress(Math.round((event.loaded / Math.max(event.total || 1, 1)) * 100));
        });

        if (cancelled) {
          head.dispose();
          return;
        }

        head.setView("upper", {
          cameraDistance: 1.15,
          cameraY: 0.02,
          cameraRotateY: 0.05,
          cameraRotateX: -0.02,
        });
        head.setLighting({
          lightAmbientIntensity: 2.1,
          lightDirectIntensity: 18,
          lightSpotIntensity: 6,
        });
        head.makeEyeContact(1800);

        headRef.current = head;
        setLoadProgress(100);
        setIsReady(true);
      } catch (error) {
        console.error("TalkingHead init failed", error);
        if (!cancelled) {
          setHasError(true);
          setIsReady(false);
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
      if (mouthLoopRef.current !== null) {
        window.cancelAnimationFrame(mouthLoopRef.current);
        mouthLoopRef.current = null;
      }
      setMorphTargetValue(headRef.current, "jawOpen", null);
      setMorphTargetValue(headRef.current, "mouthFunnel", null);
      setMorphTargetValue(headRef.current, "mouthClose", null);
      headRef.current?.dispose();
      headRef.current = null;
    };
  }, [model]);

  useEffect(() => {
    const head = headRef.current;
    if (!head || !isReady) return;

    if (state === "speaking") {
      head.setMood("happy");
      head.makeEyeContact(3200);
      head.lookAtCamera(2600);
      return;
    }

    if (state === "listening") {
      head.stopGesture(250);
      head.setMood("neutral");
      head.makeEyeContact(2400);
      head.lookAtCamera(1800);
      return;
    }

    if (state === "thinking") {
      head.stopGesture(250);
      head.setMood("neutral");
      head.lookAhead(1600);
      return;
    }

    head.stopGesture(250);
    head.setMood("neutral");
    head.lookAhead(1200);
  }, [isReady, state]);

  useEffect(() => {
    if (mouthLoopRef.current !== null) {
      window.cancelAnimationFrame(mouthLoopRef.current);
      mouthLoopRef.current = null;
    }

    const head = headRef.current;
    if (!head || !isReady || state !== "speaking") {
      setMorphTargetValue(head, "jawOpen", null);
      setMorphTargetValue(head, "mouthFunnel", null);
      setMorphTargetValue(head, "mouthClose", null);
      return;
    }

    const animate = () => {
      const time = performance.now();
      const jawOpen = 0.08 + ((Math.sin(time / 92) + 1) / 2) * 0.18;
      const mouthFunnel = 0.03 + ((Math.sin(time / 135 + 0.8) + 1) / 2) * 0.06;
      const mouthClose = 0.06 + ((Math.cos(time / 118) + 1) / 2) * 0.08;

      setMorphTargetValue(head, "jawOpen", jawOpen);
      setMorphTargetValue(head, "mouthFunnel", mouthFunnel);
      setMorphTargetValue(head, "mouthClose", mouthClose);
      mouthLoopRef.current = window.requestAnimationFrame(animate);
    };

    mouthLoopRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (mouthLoopRef.current !== null) {
        window.cancelAnimationFrame(mouthLoopRef.current);
        mouthLoopRef.current = null;
      }
      setMorphTargetValue(head, "jawOpen", null);
      setMorphTargetValue(head, "mouthFunnel", null);
      setMorphTargetValue(head, "mouthClose", null);
    };
  }, [isReady, state]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div ref={containerRef} className={cn("h-full w-full transition-opacity duration-500", isReady ? "opacity-100" : "opacity-0")} />

      {!isReady && !hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="h-20 w-20 rounded-full border border-white/15 bg-white/5 shadow-[0_0_40px_rgba(59,130,246,0.2)]" />
          <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] text-white/80 backdrop-blur">
            3D avatar loading{loadProgress > 0 ? ` ${loadProgress}%` : "..."}
          </div>
        </div>
      ) : null}

      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <Image
            src={fallbackImage}
            alt="Dibut interviewer fallback"
            width={420}
            height={520}
            className="h-auto w-full max-w-[360px] object-contain drop-shadow-[0_18px_50px_rgba(15,23,42,0.55)]"
            priority
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent" />

      {state === "speaking" ? (
        <div className="pointer-events-none absolute bottom-10 left-1/2 flex -translate-x-1/2 items-end gap-1.5">
          {[7, 11, 15, 11, 7].map((height, index) => (
            <span
              key={`wave-${index}`}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300"
              style={{ height: `${height}px`, animationDelay: `${index * 0.08}s` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
