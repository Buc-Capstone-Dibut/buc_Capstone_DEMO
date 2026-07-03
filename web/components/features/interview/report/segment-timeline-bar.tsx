"use client";

import { useRef } from "react";
import type { AnswerSegment } from "@/lib/interview/report/answer-segments";

interface Props {
  segments: AnswerSegment[];
  durationMs: number;
  currentTimeMs: number;
  activeId: string | null;
  onSeek: (ms: number) => void;
  awaySegments?: Array<[number, number]>;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 영상 챕터형 타임라인: 답변 구간(Q 라벨) + 하단 시선 이탈 레인 + 시간 축 + 재생 칩.
export function SegmentTimelineBar({
  segments,
  durationMs,
  currentTimeMs,
  activeId,
  onSeek,
  awaySegments,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  if (durationMs <= 0) return null;

  const pct = (ms: number) => Math.min(Math.max((ms / durationMs) * 100, 0), 100);
  const indicator = pct(currentTimeMs);
  const away = (awaySegments ?? []).filter(([s, e]) => e > s);
  const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);

  // 트랙 빈 곳 클릭 → 해당 시각으로 seek
  const handleTrackSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    onSeek(Math.round(ratio * durationMs));
  };

  return (
    <div className="mt-3">
      {/* 시간 축 */}
      <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
        <span className="font-medium text-primary">{fmt(currentTimeMs)}</span>
        <span>{fmt(durationMs)}</span>
      </div>

      {/* 트랙 */}
      <div
        ref={trackRef}
        onClick={handleTrackSeek}
        className="relative mt-1 h-11 w-full cursor-pointer rounded-lg border border-border/60 bg-muted/60"
      >
        {/* 답변 챕터 */}
        {sorted.map((s, idx) => {
          const left = pct(s.startMs);
          const width = Math.max(pct(s.endMs) - pct(s.startMs), 0.5);
          const isActive = s.id === activeId;
          const showLabel = width >= 6;
          const showTime = width >= 14;
          return (
            <button
              key={s.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeek(s.startMs);
              }}
              title={`Q${idx + 1} 답변 구간 ${fmt(s.startMs)}~${fmt(s.endMs)}`}
              className={`absolute top-1 bottom-3 flex items-center gap-1 overflow-hidden rounded-md px-1.5 transition ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-primary/20 text-foreground/70 hover:bg-primary/35"
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {showLabel && (
                <span className={`text-[11px] font-semibold leading-none ${isActive ? "" : "text-primary"}`}>
                  Q{idx + 1}
                </span>
              )}
              {showTime && (
                <span className="truncate text-[10px] leading-none opacity-80 tabular-nums">
                  {fmt(s.startMs)}
                </span>
              )}
            </button>
          );
        })}

        {/* 시선 이탈 레인(하단) */}
        {away.map(([s, e], i) => (
          <button
            key={`away-${i}`}
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onSeek(s);
            }}
            title={`시선 이탈 ${fmt(s)}~${fmt(e)}`}
            className="absolute bottom-[3px] h-[5px] rounded-full bg-red-500/80 transition hover:bg-red-500"
            style={{ left: `${pct(s)}%`, width: `${Math.max(pct(e) - pct(s), 0.6)}%` }}
          />
        ))}

        {/* 재생 헤드 + 시간 칩 */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-foreground/80"
          style={{ left: `${indicator}%` }}
        />
        <div
          className="pointer-events-none absolute -top-0.5 -translate-x-1/2 rounded bg-foreground px-1 py-px text-[9px] font-medium tabular-nums text-background shadow-sm"
          style={{ left: `${Math.min(Math.max(indicator, 3), 97)}%` }}
        >
          {fmt(currentTimeMs)}
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-primary/70" />
          답변 구간
        </span>
        {away.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[5px] w-3 rounded-full bg-red-500/80" />
            시선 이탈
          </span>
        )}
      </div>
    </div>
  );
}
