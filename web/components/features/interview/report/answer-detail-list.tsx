"use client";

import type { AnswerDetail } from "@/lib/interview/report/answer-segments";

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

interface Props {
  details: AnswerDetail[];
  onSeek: (ms: number) => void;
}

export function AnswerDetailList({ details, onSeek }: Props) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">상세 내용이 없습니다.</p>;
  }
  return (
    <div className="flex flex-col gap-5">
      {details.map((d, i) => {
        const { segment: s, finding: f } = d;
        return (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Q{i + 1} · {fmt(s.startMs)}
              </p>
              <button
                type="button"
                onClick={() => onSeek(s.startMs)}
                className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition hover:border-primary hover:text-primary"
              >
                영상에서 보기
              </button>
            </div>
            {s.question ? <p className="mt-2 text-sm font-semibold">{s.question}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{s.answer}</p>

            {f?.strengths && f.strengths.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground">강점</p>
                <ul className="mt-1 list-disc pl-5 text-sm leading-6">
                  {f.strengths.map((x, j) => (
                    <li key={j}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {f?.improvements && f.improvements.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground">개선점</p>
                <ul className="mt-1 list-disc pl-5 text-sm leading-6">
                  {f.improvements.map((x, j) => (
                    <li key={j}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {f?.refinedAnswer ? (
              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground">모범 답안 예시</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{f.refinedAnswer}</p>
              </div>
            ) : null}

            {f?.followUpQuestion ? (
              <p className="mt-3 text-sm text-muted-foreground">
                예상 꼬리질문: <span className="text-foreground">{f.followUpQuestion}</span>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
