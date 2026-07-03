"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Film } from "lucide-react";

import type { AnswerSegment } from "@/lib/interview/report/answer-segments";
import { aggregateSamples, type FaceSample } from "@/lib/interview/face/face-metrics";

import { SegmentVideoPlayer } from "./segment-video-player";

interface Props {
  src: string;
  segments: AnswerSegment[];
  samples?: FaceSample[];
}

const MIN_SEGMENT_SAMPLES = 3; // 표본이 이보다 적으면 구간 관찰 칩을 숨긴다(과잉 해석 방지)

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * 질문별 영상 하이라이트 — 접힌 질문 칩을 펼치면 해당 질의응답 구간만 재생하는
 * 미니 플레이어(시선 오버레이 포함)와 구간 관찰 칩(이탈·미소, 무점수 참고용)이 열린다.
 * 한 번에 하나만 펼치는 아코디언 — 같은 녹화 URL로 video 를 중복 로드하지 않기 위함.
 */
export function AnswerHighlights({ src, segments, samples }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const bySegment = new Map<string, ReturnType<typeof aggregateSamples>>();
    if (!samples?.length) return bySegment;
    for (const seg of segments) {
      if (seg.endMs <= seg.startMs) continue;
      const inRange = samples.filter((s) => s.tMs >= seg.startMs && s.tMs < seg.endMs);
      bySegment.set(seg.id, aggregateSamples(inRange));
    }
    return bySegment;
  }, [samples, segments]);

  if (segments.length === 0) return null;

  return (
    <section className="mt-4">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-primary" aria-hidden />
        <h4 className="text-sm font-semibold text-foreground">질문별 하이라이트</h4>
        <span className="text-[11px] text-muted-foreground">질문을 선택하면 해당 구간만 재생됩니다</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {segments.map((seg, idx) => {
          const isOpen = openId === seg.id;
          return (
            <button
              key={seg.id}
              type="button"
              onClick={() => setOpenId(isOpen ? null : seg.id)}
              aria-expanded={isOpen}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                isOpen
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-foreground/80 hover:border-primary/50"
              }`}
            >
              Q{idx + 1}
              <span className="text-[10px] text-muted-foreground">{formatClock(seg.startMs)}</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          );
        })}
      </div>

      {segments.map((seg, idx) => {
        if (openId !== seg.id) return null;
        const st = stats.get(seg.id);
        const showStats = !!st && st.sampleCount >= MIN_SEGMENT_SAMPLES;
        return (
          <div key={seg.id} className="mt-3 rounded-2xl border border-primary/15 bg-card p-4">
            <p className="text-sm font-medium leading-relaxed text-foreground">
              <span className="mr-2 font-semibold text-primary">Q{idx + 1}</span>
              {seg.question || "질문"}
            </p>

            <div className="mt-3">
              <SegmentVideoPlayer
                src={src}
                samples={samples?.length ? samples : undefined}
                clipStartMs={seg.startMs}
                clipEndMs={seg.endMs > seg.startMs ? seg.endMs : undefined}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80">
                구간 {formatClock(seg.startMs)}–{formatClock(seg.endMs)}
              </span>
              {showStats && (
                <>
                  <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80">
                    시선 이탈 약 {Math.round(st.awayRatio * 100)}%
                  </span>
                  <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80">
                    미소 약 {Math.round(st.smileRatio * 100)}%
                  </span>
                </>
              )}
              <span className="text-[11px] text-muted-foreground">
                구간이 끝나면 자동으로 멈춥니다 · 관찰 수치는 점수가 아닌 참고용입니다
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
