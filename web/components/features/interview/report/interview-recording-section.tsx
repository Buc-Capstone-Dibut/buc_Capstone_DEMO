"use client";

import { useRef } from "react";
import { SegmentVideoPlayer, type SegmentVideoPlayerHandle } from "./segment-video-player";
import { SegmentTimelineBar } from "./segment-timeline-bar";
import { AnswerScriptPanel } from "./answer-script-panel";
import { AnswerDetailList } from "./answer-detail-list";
import { useSegmentSync } from "@/hooks/interview/use-segment-sync";
import { buildAnswerDetails, type AnswerSegment, type AnswerFinding } from "@/lib/interview/report/answer-segments";
import { CollapsibleSection } from "@/components/features/resume/collapsible-section";

interface Props {
  recordingUrl: string;
  segments: AnswerSegment[];
  findingsByOrder?: Record<number, AnswerFinding>;
}

export function InterviewRecordingSection({ recordingUrl, segments, findingsByOrder }: Props) {
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
        <AnswerDetailList details={details} onSeek={seekTo} />
      </CollapsibleSection>
    </div>
  );
}
