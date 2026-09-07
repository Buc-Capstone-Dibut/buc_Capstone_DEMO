"use client";

import {
  CheckCircle2,
  Download,
  Film,
  Loader2,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecordingReport } from "@/hooks/interview/use-recording-report";
import { InterviewRecordingSection } from "./interview-recording-section";
import type { AnswerFinding } from "@/lib/interview/report/answer-segments";
import type { ComponentProps } from "react";

export function RecordingReportTab({
  sessionId,
  findingsByOrder,
  nonverbalSummary,
}: {
  sessionId: string;
  findingsByOrder?: Record<number, AnswerFinding>;
  nonverbalSummary?: ComponentProps<
    typeof InterviewRecordingSection
  >["nonverbalSummary"];
}) {
  const report = useRecordingReport(sessionId);
  const saveOriginal = () => {
    if (!report.pending) return;
    const url = URL.createObjectURL(report.pending.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      report.pending.storagePath.split("/").pop() || "interview.webm";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section aria-label="면접 영상" className="min-w-0 py-4">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Film className="h-5 w-5" />
          면접 영상
        </h2>
        {report.status === "ready" && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            저장 완료
          </span>
        )}
      </div>
      {report.status === "loading" && (
        <div
          role="status"
          className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          영상 저장 상태를 확인하고 있습니다.
        </div>
      )}
      {report.status === "missing" && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
          <Film className="h-8 w-8 text-muted-foreground" />
          <p>저장된 영상이 없습니다.</p>
          <Button variant="outline" onClick={report.refresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            다시 확인
          </Button>
        </div>
      )}
      {report.status === "error" && (
        <div className="space-y-4 py-10">
          <p role="alert">{report.error}</p>
          <Button variant="outline" onClick={report.refresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            영상 다시 불러오기
          </Button>
        </div>
      )}
      {(report.status === "pending" || report.status === "uploading") && (
        <div className="space-y-4 border-l-2 border-amber-500 py-4 pl-4">
          <h3 className="font-semibold">
            {report.status === "uploading"
              ? `영상 저장 중 ${report.progress}%`
              : "영상 저장이 완료되지 않았습니다."}
          </h3>
          <p className="text-sm text-muted-foreground">
            이 브라우저에 남아 있는 원본을 다시 저장할 수 있습니다.
          </p>
          {report.error && (
            <p role="alert" className="text-sm text-red-700">
              {report.error}
            </p>
          )}
          {report.status === "uploading" ? (
            <progress
              value={report.progress}
              max={100}
              aria-label="영상 저장 진행률"
              className="h-2 w-full max-w-md"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void report.retry()}>
                <UploadCloud className="mr-2 h-4 w-4" />
                다시 저장
              </Button>
              <Button variant="outline" onClick={saveOriginal}>
                <Download className="mr-2 h-4 w-4" />
                원본 다운로드
              </Button>
            </div>
          )}
        </div>
      )}
      {report.status === "ready" && report.recording && (
        <>
          {!report.recording.transcript && (
            <p className="mb-4 text-sm text-muted-foreground">
              이전 녹화의 구간 시각은 추정값입니다. 질문별 정확한 시간 정보가
              없습니다.
            </p>
          )}
          <InterviewRecordingSection
            recordingUrl={report.recording.url}
            transcript={report.recording.transcript}
            segments={report.segments}
            findingsByOrder={findingsByOrder}
            nonverbalSummary={nonverbalSummary}
            faceSamples={report.samples}
            awaySegments={report.away}
            onReload={report.refresh}
          />
        </>
      )}
    </section>
  );
}
