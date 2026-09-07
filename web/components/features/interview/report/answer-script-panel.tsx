"use client";

import type {
  AnswerSegment,
  AnswerFinding,
} from "@/lib/interview/report/answer-segments";
import type { RecordingTranscript } from "@/lib/interview/recording/transcript";
import { Play } from "lucide-react";

interface Props {
  segments: AnswerSegment[];
  activeId: string | null;
  feedbackByOrder?: Record<number, AnswerFinding>;
  onSeek: (ms: number) => void;
  transcript?: RecordingTranscript | null;
  currentTimeMs?: number;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function AnswerScriptPanel({
  segments,
  activeId,
  feedbackByOrder,
  onSeek,
  transcript,
  currentTimeMs = 0,
}: Props) {
  if (transcript) {
    let answerOrder = 0;
    return (
      <div className="min-w-0">
        <h3 className="mb-3 text-sm font-semibold">질문 · 답변 전사문</h3>
        {transcript.entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            저장된 전사문이 없습니다.
          </p>
        )}
        <ol className="max-h-[560px] space-y-3 overflow-y-auto pr-1 lg:max-h-[640px]">
          {transcript.entries.map((entry) => {
            if (entry.role === "user") answerOrder += 1;
            const active =
              entry.startMs !== null &&
              entry.endMs !== null &&
              currentTimeMs >= entry.startMs &&
              currentTimeMs < entry.endMs;
            const feedback =
              entry.role === "user" ? feedbackByOrder?.[answerOrder] : null;
            const label = entry.role === "ai" ? "면접관 질문" : "내 답변";
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  disabled={entry.startMs === null}
                  onClick={() =>
                    entry.startMs !== null && onSeek(entry.startMs)
                  }
                  aria-current={active ? "true" : undefined}
                  className={`w-full min-w-0 rounded-lg border p-3 text-left transition-colors disabled:cursor-default ${active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
                >
                  <span className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                    <span
                      className={
                        entry.role === "ai"
                          ? "text-sky-700"
                          : "text-emerald-700"
                      }
                    >
                      {label}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                      {entry.startMs !== null && entry.endMs !== null ? (
                        <>
                          <Play className="h-3 w-3" />
                          {fmt(entry.startMs)} ~ {fmt(entry.endMs)}
                        </>
                      ) : (
                        "시간 정보 없음"
                      )}
                    </span>
                  </span>
                  <span className="block whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">
                    {entry.text}
                  </span>
                </button>
                {feedback?.improvements?.[0] && (
                  <p className="mt-1 border-l-2 border-amber-400 pl-3 text-xs leading-5 text-muted-foreground">
                    {feedback.improvements[0]}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }
  if (segments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        표시할 답변 구간이 없습니다.
      </p>
    );
  }
  return (
    <ul className="flex min-w-0 max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
      {segments.map((s, i) => {
        const fb = feedbackByOrder?.[i + 1];
        const isActive = s.id === activeId;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSeek(s.startMs)}
              className={`w-full rounded-xl border p-3 text-left transition hover:border-primary ${
                isActive
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-xs font-semibold text-muted-foreground">
                Q{i + 1} · {fmt(s.startMs)}
              </p>
              {s.question ? (
                <p className="mt-1 text-sm font-medium">{s.question}</p>
              ) : null}
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {s.answer}
              </p>
              {fb?.improvements && fb.improvements.length > 0 ? (
                <p className="mt-2 text-xs text-foreground">
                  개선: {fb.improvements[0]}
                </p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
