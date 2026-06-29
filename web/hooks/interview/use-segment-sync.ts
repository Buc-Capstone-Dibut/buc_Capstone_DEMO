"use client";

import { useEffect, useState, type RefObject } from "react";
import type { SegmentVideoPlayerHandle } from "@/components/features/interview/report/segment-video-player";
import type { AnswerSegment } from "@/lib/interview/report/answer-segments";

export function useSegmentSync(
  videoRef: RefObject<SegmentVideoPlayerHandle | null>,
  segments: AnswerSegment[],
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const ms = v.getCurrentTimeMs();
      setCurrentTimeMs(ms);
      const d = v.getDurationMs();
      if (d > 0) setDurationMs(d);
      const active = segments.find((s) => ms >= s.startMs && ms < s.endMs);
      setActiveId(active?.id ?? null);
    }, 200);
    return () => clearInterval(interval);
  }, [videoRef, segments]);

  const seekTo = (ms: number) => videoRef.current?.seekTo(ms);

  return { activeId, currentTimeMs, durationMs, seekTo };
}
