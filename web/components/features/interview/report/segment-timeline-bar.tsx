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

// 실선형 타임라인: 가는 베이스 라인 위에 답변 구간(라임 선)·시선 이탈(하단 빨간 선)·재생 틱.
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

      {/* 트랙 (실선) */}
      <div
        ref={trackRef}
        onClick={handleTrackSeek}
        className="relative mt-0.5 h-9 w-full cursor-pointer"
      >
        {/* 베이스 라인 */}
        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-border" />

        {/* Q 라벨 (구간 시작 위) */}
        {sorted.map((s, idx) => {
          const width = pct(s.endMs) - pct(s.startMs);
          if (width < 5) return null;
          const isActive = s.id === activeId;
          return (
            <span
              key={`label-${s.id}`}
              className={`pointer-events-none absolute top-0 text-[10px] font-semibold leading-none tabular-nums ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              style={{ left: `${pct(s.startMs)}%` }}
            >
              Q{idx + 1} <span className="font-normal opacity-70">{fmt(s.startMs)}</span>
            </span>
          );
        })}

        {/* 답변 구간 선 */}
        {sorted.map((s, idx) => {
          const left = pct(s.startMs);
          const width = Math.max(pct(s.endMs) - pct(s.startMs), 0.5);
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeek(s.startMs);
              }}
              title={`Q${idx + 1} 답변 구간 ${fmt(s.startMs)}~${fmt(s.endMs)}`}
              className="group absolute top-1/2 flex h-6 -translate-y-1/2 items-center"
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <span
                className={`w-full rounded-full transition-all ${
                  isActive
                    ? "h-[7px] bg-primary"
                    : "h-[5px] bg-primary/45 group-hover:bg-primary/75"
                }`}
              />
            </button>
          );
        })}

        {/* 시선 이탈 선 (베이스 라인 아래) */}
        {away.map(([s, e], i) => (
          <button
            key={`away-${i}`}
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              onSeek(s);
            }}
            title={`시선 이탈 ${fmt(s)}~${fmt(e)}`}
            className="group absolute top-[62%] flex h-3 items-center"
            style={{ left: `${pct(s)}%`, width: `${Math.max(pct(e) - pct(s), 0.6)}%` }}
          >
            <span className="w-full rounded-full transition h-[3px] bg-red-500/75 group-hover:bg-red-500" />
          </button>
        ))}

        {/* 재생 틱 */}
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `${indicator}%` }}
        />
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[5px] w-4 rounded-full bg-primary/60" />
          답변 구간
        </span>
        {away.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-4 rounded-full bg-red-500/75" />
            시선 이탈
          </span>
        )}
      </div>
    </div>
  );
}
