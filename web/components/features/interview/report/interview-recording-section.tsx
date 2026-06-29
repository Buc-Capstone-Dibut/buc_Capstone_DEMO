"use client";

import { useRef } from "react";
import { SegmentVideoPlayer, type SegmentVideoPlayerHandle } from "./segment-video-player";
import { SegmentTimelineBar } from "./segment-timeline-bar";
import { AnswerScriptPanel, type SegmentFeedback } from "./answer-script-panel";
import { useSegmentSync } from "@/hooks/interview/use-segment-sync";
import type { AnswerSegment } from "@/lib/interview/report/answer-segments";

interface Props {
  recordingUrl: string;
  segments: AnswerSegment[];
  feedbackByOrder?: Record<number, SegmentFeedback>;
}

export function InterviewRecordingSection({ recordingUrl, segments, feedbackByOrder }: Props) {
  const videoRef = useRef<SegmentVideoPlayerHandle | null>(null);
  const { activeId, currentTimeMs, durationMs, seekTo } = useSegmentSync(videoRef, segments);

  return (
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
        feedbackByOrder={feedbackByOrder}
        onSeek={seekTo}
      />
    </div>
  );
}
