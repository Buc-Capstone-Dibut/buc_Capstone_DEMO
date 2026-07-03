"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

import type { FaceSample } from "@/lib/interview/face/face-metrics";

import { ReplayOverlay } from "./replay-overlay";

export interface SegmentVideoPlayerHandle {
  seekTo: (ms: number) => void;
  getCurrentTimeMs: () => number;
  getDurationMs: () => number;
}

interface Props {
  src: string;
  className?: string;
  samples?: FaceSample[];
  /** 지정 시 구간 플레이어로 동작: 메타 로드 후 구간 시작으로 이동. */
  clipStartMs?: number;
  /** 지정 시 구간 끝에 도달하면 자동 일시정지(스크럽으로 벗어나는 건 허용). */
  clipEndMs?: number;
}

// WebM(MediaRecorder) duration=Infinity 보정: 메타 로드 시 강제 seek으로 실제 길이 확정.
export const SegmentVideoPlayer = forwardRef<SegmentVideoPlayerHandle, Props>(
  function SegmentVideoPlayer({ src, className, samples, clipStartMs, clipEndMs }, ref) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [fixedDuration, setFixedDuration] = useState(false);

    useImperativeHandle(ref, () => ({
      seekTo: (ms: number) => {
        if (videoRef.current) videoRef.current.currentTime = ms / 1000;
      },
      getCurrentTimeMs: () => (videoRef.current ? videoRef.current.currentTime * 1000 : 0),
      getDurationMs: () =>
        videoRef.current && isFinite(videoRef.current.duration)
          ? videoRef.current.duration * 1000
          : 0,
    }));

    const handleLoadedMetadata = () => {
      const v = videoRef.current;
      if (!v) return;
      if (!isFinite(v.duration) && !fixedDuration) {
        const onSeeked = () => {
          v.currentTime = (clipStartMs ?? 0) / 1000;
          setFixedDuration(true);
          v.removeEventListener("seeked", onSeeked);
        };
        v.addEventListener("seeked", onSeeked);
        v.currentTime = 1e101;
      } else if (clipStartMs != null) {
        v.currentTime = clipStartMs / 1000;
      }
    };

    // 구간 끝 자동 정지 — 아래에서 경계를 '통과'하는 순간 1회만 멈춘다.
    // (끝에서 다시 재생을 누르면 계속 볼 수 있고, 스크럽으로 벗어나는 것도 막지 않는다)
    const wasBeforeClipEndRef = useRef(false);
    const handleTimeUpdate = () => {
      const v = videoRef.current;
      if (!v || clipEndMs == null) return;
      const ms = v.currentTime * 1000;
      if (ms < clipEndMs) {
        wasBeforeClipEndRef.current = true;
        return;
      }
      if (wasBeforeClipEndRef.current && !v.paused) v.pause();
      wasBeforeClipEndRef.current = false;
    };

    const video = (
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={clipEndMs != null ? handleTimeUpdate : undefined}
        className={className ?? "w-full rounded-xl border bg-black"}
      />
    );

    if (samples?.length) {
      return (
        <div className="relative">
          {video}
          <ReplayOverlay videoRef={videoRef} samples={samples} />
        </div>
      );
    }

    return video;
  },
);
