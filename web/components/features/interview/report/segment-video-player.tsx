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
}

// WebM(MediaRecorder) duration=Infinity 보정: 메타 로드 시 강제 seek으로 실제 길이 확정.
export const SegmentVideoPlayer = forwardRef<SegmentVideoPlayerHandle, Props>(
  function SegmentVideoPlayer({ src, className, samples }, ref) {
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
          v.currentTime = 0;
          setFixedDuration(true);
          v.removeEventListener("seeked", onSeeked);
        };
        v.addEventListener("seeked", onSeeked);
        v.currentTime = 1e101;
      }
    };

    const video = (
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
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
