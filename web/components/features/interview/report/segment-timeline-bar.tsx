"use client";

import type { AnswerSegment } from "@/lib/interview/report/answer-segments";

interface Props {
  segments: AnswerSegment[];
  durationMs: number;
  currentTimeMs: number;
  activeId: string | null;
  onSeek: (ms: number) => void;
  awaySegments?: Array<[number, number]>;
}

export function SegmentTimelineBar({
  segments,
  durationMs,
  currentTimeMs,
  activeId,
  onSeek,
  awaySegments,
}: Props) {
  if (durationMs <= 0) return null;
  const indicator = Math.min((currentTimeMs / durationMs) * 100, 100);
  const away = (awaySegments ?? []).filter(([s, e]) => e > s);

  return (
    <div>
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
        {away.map(([s, e], i) => {
          const left = (s / durationMs) * 100;
          const width = Math.max(((e - s) / durationMs) * 100, 0.4);
          return (
            <button
              key={`away-${i}`}
              type="button"
              onClick={() => onSeek(s)}
              title={`시선 이탈 ${Math.round(s / 1000)}s~${Math.round(e / 1000)}s`}
              className="absolute top-0 h-1.5 rounded-sm bg-red-500/70 transition hover:bg-red-500"
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-foreground"
          style={{ left: `${indicator}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-primary/70" />
          답변 구간
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-red-500/70" />
          시선 이탈
        </span>
      </div>
    </div>
  );
}
