"use client";

import type { AnswerSegment } from "@/lib/interview/report/answer-segments";

export interface SegmentFeedback {
  improvements?: string[];
}

interface Props {
  segments: AnswerSegment[];
  activeId: string | null;
  feedbackByOrder?: Record<number, SegmentFeedback>;
  onSeek: (ms: number) => void;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function AnswerScriptPanel({ segments, activeId, feedbackByOrder, onSeek }: Props) {
  if (segments.length === 0) {
    return <p className="text-sm text-muted-foreground">표시할 답변 구간이 없습니다.</p>;
  }
  return (
    <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
      {segments.map((s, i) => {
        const fb = feedbackByOrder?.[i + 1];
        const isActive = s.id === activeId;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSeek(s.startMs)}
              className={`w-full rounded-xl border p-3 text-left transition hover:border-primary ${
                isActive ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <p className="text-xs font-semibold text-muted-foreground">
                Q{i + 1} · {fmt(s.startMs)}
              </p>
              {s.question ? <p className="mt-1 text-sm font-medium">{s.question}</p> : null}
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.answer}</p>
              {fb?.improvements && fb.improvements.length > 0 ? (
                <p className="mt-2 text-xs text-foreground">개선: {fb.improvements[0]}</p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
