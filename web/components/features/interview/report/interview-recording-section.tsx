"use client";

import { useMemo, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { SegmentVideoPlayer, type SegmentVideoPlayerHandle } from "./segment-video-player";
import { SegmentTimelineBar } from "./segment-timeline-bar";
import { AnswerHighlights } from "./answer-highlights";
import { AnswerScriptPanel } from "./answer-script-panel";
import { AnswerDetailList } from "./answer-detail-list";
import { useSegmentSync } from "@/hooks/interview/use-segment-sync";
import { buildAnswerDetails, type AnswerSegment, type AnswerFinding } from "@/lib/interview/report/answer-segments";
import type { FaceSample } from "@/lib/interview/face/face-metrics";
import { CollapsibleSection } from "@/components/features/resume/collapsible-section";

interface NonverbalSummary {
  overall?: string;
  perAnswer?: Array<{ index?: number; comment?: string }>;
  awayRatio?: number;
  awaySegments?: Array<[number, number]>;
  smileRatio?: number;
  headMovement?: { yawStd?: number; pitchStd?: number; level?: string };
}

interface Props {
  recordingUrl: string;
  segments: AnswerSegment[];
  findingsByOrder?: Record<number, AnswerFinding>;
  nonverbalSummary?: NonverbalSummary | null;
  faceSamples?: FaceSample[];
  awaySegments?: Array<[number, number]>;
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
  const moveLevel = String(summary.headMovement?.level || "").trim();
  const hasContent = overall || perAnswer.length > 0 || moveLevel || (summary.awaySegments?.length ?? 0) > 0;
  if (!hasContent) return null;

  const gazePercent = Math.round((1 - Number(summary.awayRatio || 0)) * 100);
  const smilePercent = Math.round(Number(summary.smileRatio || 0) * 100);

  return (
    <div className="rounded-2xl border border-primary/15 bg-card p-5">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary" aria-hidden />
        <h4 className="text-sm font-semibold text-foreground">비언어 행동 관찰</h4>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        카메라로 관찰된 행동(응시·미소·고개 움직임)만 기록합니다. 감정 추측·점수 없이 참고용으로만 제공됩니다.
      </p>

      {overall && <p className="mt-3 text-sm leading-relaxed text-foreground">{overall}</p>}

      <p className="mt-3 text-sm text-muted-foreground">{describeAwayRatio(Number(summary.awayRatio || 0))}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80">
          정면 응시 약 {gazePercent}%
        </span>
        <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80">
          미소 약 {smilePercent}%
        </span>
        {moveLevel && (
          <span className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80">
            고개 움직임 {moveLevel}
          </span>
        )}
      </div>

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

export function InterviewRecordingSection({
  recordingUrl,
  segments,
  findingsByOrder,
  nonverbalSummary,
  faceSamples,
  awaySegments,
}: Props) {
  const videoRef = useRef<SegmentVideoPlayerHandle | null>(null);
  const { activeId, currentTimeMs, durationMs, seekTo } = useSegmentSync(videoRef, segments);
  const details = buildAnswerDetails(segments, findingsByOrder);
  const samples = useMemo(() => faceSamples ?? [], [faceSamples]);
  // 영상 위 분석 오버레이(시선 점 + 우상단 시선·표정 상태 점) 표시 토글 — 기본 켜짐.
  const [showOverlay, setShowOverlay] = useState(true);
  const hasOverlayData = samples.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {hasOverlayData && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowOverlay((v) => !v)}
                aria-pressed={showOverlay}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold transition-colors ${
                  showOverlay
                    ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {showOverlay ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                분석 오버레이 {showOverlay ? "켜짐" : "꺼짐"}
              </button>
            </div>
          )}
          <SegmentVideoPlayer ref={videoRef} src={recordingUrl} samples={showOverlay && hasOverlayData ? samples : undefined} />
          <SegmentTimelineBar
            segments={segments}
            durationMs={durationMs}
            currentTimeMs={currentTimeMs}
            activeId={activeId}
            onSeek={seekTo}
            awaySegments={awaySegments ?? nonverbalSummary?.awaySegments}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            답변/타임라인을 클릭하면 영상이 해당 구간으로 이동합니다.
          </p>
          <AnswerHighlights
            src={recordingUrl}
            segments={segments}
            samples={showOverlay && hasOverlayData ? samples : undefined}
          />
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
