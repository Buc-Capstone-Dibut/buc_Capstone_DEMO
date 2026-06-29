"use client";

import { useRef } from "react";
import { Eye } from "lucide-react";
import { SegmentVideoPlayer, type SegmentVideoPlayerHandle } from "./segment-video-player";
import { SegmentTimelineBar } from "./segment-timeline-bar";
import { AnswerScriptPanel } from "./answer-script-panel";
import { AnswerDetailList } from "./answer-detail-list";
import { useSegmentSync } from "@/hooks/interview/use-segment-sync";
import { buildAnswerDetails, type AnswerSegment, type AnswerFinding } from "@/lib/interview/report/answer-segments";
import { CollapsibleSection } from "@/components/features/resume/collapsible-section";

interface NonverbalSummary {
  overall?: string;
  perAnswer?: Array<{ index?: number; comment?: string }>;
  awayRatio?: number;
  awaySegments?: Array<[number, number]>;
  expressionHistogram?: Record<string, number>;
}

interface Props {
  recordingUrl: string;
  segments: AnswerSegment[];
  findingsByOrder?: Record<number, AnswerFinding>;
  nonverbalSummary?: NonverbalSummary | null;
}

// 시선이탈 비율을 정성 문구로 표현(점수·등급 아님).
function describeAwayRatio(ratio: number): string {
  const percent = Math.round(ratio * 100);
  if (percent <= 10) return `시선은 대체로 화면을 향했습니다 (이탈 약 ${percent}%)`;
  if (percent <= 30) return `간헐적으로 시선이 분산됐습니다 (이탈 약 ${percent}%)`;
  return `시선이 자주 화면을 벗어나는 경향이 보였습니다 (이탈 약 ${percent}%)`;
}

function NonverbalPanel({ summary }: { summary: NonverbalSummary }) {
  const overall = String(summary.overall || "").trim();
  const perAnswer = (summary.perAnswer || []).filter((item) => String(item?.comment || "").trim());
  const histogram = Object.entries(summary.expressionHistogram || {}).filter(([, count]) => Number(count) > 0);
  const hasContent = overall || perAnswer.length > 0 || histogram.length > 0;
  if (!hasContent) return null;

  return (
    <div className="rounded-2xl border border-primary/15 bg-card p-5">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary" aria-hidden />
        <h4 className="text-sm font-semibold text-foreground">시선·표정 경향</h4>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        점수가 아닌 정성적 관찰입니다. 시선·표정은 답변 내용 평가와 무관하게 참고용으로만 제공됩니다.
      </p>

      {overall && <p className="mt-3 text-sm leading-relaxed text-foreground">{overall}</p>}

      <p className="mt-3 text-sm text-muted-foreground">{describeAwayRatio(Number(summary.awayRatio || 0))}</p>

      {histogram.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {histogram.map(([label, count]) => (
            <span
              key={label}
              className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80"
            >
              {label} {count}회
            </span>
          ))}
        </div>
      )}

      {perAnswer.length > 0 && (
        <ul className="mt-4 space-y-2">
          {perAnswer.map((item, idx) => (
            <li key={`${item.index ?? idx}-${idx}`} className="rounded-xl bg-muted/30 px-4 py-3 text-sm text-foreground">
              <span className="mr-2 font-semibold text-primary">Q{item.index ?? idx + 1}</span>
              {String(item.comment || "").trim()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InterviewRecordingSection({ recordingUrl, segments, findingsByOrder, nonverbalSummary }: Props) {
  const videoRef = useRef<SegmentVideoPlayerHandle | null>(null);
  const { activeId, currentTimeMs, durationMs, seekTo } = useSegmentSync(videoRef, segments);
  const details = buildAnswerDetails(segments, findingsByOrder);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <SegmentVideoPlayer ref={videoRef} src={recordingUrl} />
          <SegmentTimelineBar
            segments={segments}
            durationMs={durationMs}
            currentTimeMs={currentTimeMs}
            activeId={activeId}
            onSeek={seekTo}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            답변/타임라인을 클릭하면 영상이 해당 구간으로 이동합니다.
          </p>
        </div>
        <AnswerScriptPanel
          segments={segments}
          activeId={activeId}
          feedbackByOrder={findingsByOrder}
          onSeek={seekTo}
        />
      </div>

      <CollapsibleSection title="면접 내용 상세히 보기" defaultOpen={false}>
        {nonverbalSummary && <NonverbalPanel summary={nonverbalSummary} />}
        <AnswerDetailList details={details} onSeek={seekTo} />
      </CollapsibleSection>
    </div>
  );
}
