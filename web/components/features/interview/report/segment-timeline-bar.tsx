"use client";

import type { AnswerSegment } from "@/lib/interview/report/answer-segments";

interface Props {
  segments: AnswerSegment[];
  durationMs: number;
  currentTimeMs: number;
  activeId: string | null;
  onSeek: (ms: number) => void;
}

export function SegmentTimelineBar({ segments, durationMs, currentTimeMs, activeId, onSeek }: Props) {
  if (durationMs <= 0) return null;
  const indicator = Math.min((currentTimeMs / durationMs) * 100, 100);

  return (
    <div className="relative mt-3 h-8 w-full overflow-hidden rounded-lg bg-muted">
      {segments.map((s) => {
        const left = (s.startMs / durationMs) * 100;
        const width = ((s.endMs - s.startMs) / durationMs) * 100;
        const isActive = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSeek(s.startMs)}
            title={`${Math.round(s.startMs / 1000)}s`}
            className={`absolute top-1 bottom-1 rounded-md bg-primary/70 transition hover:bg-primary ${
              isActive ? "ring-2 ring-primary ring-offset-1" : ""
            }`}
            style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
          />
        );
      })}
      <div
        className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-foreground"
        style={{ left: `${indicator}%` }}
      />
    </div>
  );
}
