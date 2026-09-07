"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPendingRecording,
  type PendingRecording,
} from "@/lib/interview/recording/pending-recording";
import {
  recordingRequest,
  uploadRecording,
} from "@/lib/interview/recording/upload-recording";
import {
  buildAnswerSegments,
  buildRecordedAnswerSegments,
  type AnswerSegment,
} from "@/lib/interview/report/answer-segments";
import type { RecordingTranscript } from "@/lib/interview/recording/transcript";
import type { FaceSample } from "@/lib/interview/face/face-metrics";

interface RecordingData {
  url: string;
  storagePath: string;
  durationMs: number;
  expiresAt?: number;
  transcript: RecordingTranscript | null;
}

export function useRecordingReport(sessionId: string) {
  const [recording, setRecording] = useState<RecordingData | null>(null);
  const [pending, setPending] = useState<PendingRecording | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "missing" | "error" | "pending" | "uploading"
  >("loading");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [segments, setSegments] = useState<AnswerSegment[]>([]);
  const [samples, setSamples] = useState<FaceSample[]>([]);
  const [away, setAway] = useState<Array<[number, number]>>([]);
  const generation = useRef(0);
  const retrying = useRef(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const id = ++generation.current;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const base = `/api/interview/sessions/${encodeURIComponent(sessionId)}`;
    const active = () =>
      generation.current === id && !controller.signal.aborted;
    const load = async (attempt = 0) => {
      try {
        const data: RecordingData | null = await recordingRequest(
          `${base}/recording`,
          { signal: controller.signal },
        );
        const local = await getPendingRecording(sessionId);
        if (!active()) return;
        setPending(local);
        setError("");
        if (local && (!data || !data.storagePath.endsWith(local.storagePath))) {
          setStatus("pending");
          return;
        }
        setRecording(data);
        if (!data) {
          setStatus(attempt < 4 ? "loading" : "missing");
          if (attempt < 4)
            timer = setTimeout(() => void load(attempt + 1), 3000);
          return;
        }
        setStatus("ready");
        if (data.transcript) {
          setSegments(buildRecordedAnswerSegments(data.transcript));
        } else {
          const legacy = await recordingRequest(`${base}/segments`, {
            signal: controller.signal,
          }).catch(() => null);
          if (active())
            setSegments(
              legacy?.anchorIso
                ? buildAnswerSegments(
                    legacy.turns,
                    legacy.anchorIso,
                    data.durationMs,
                  )
                : [],
            );
        }
        const signals = await recordingRequest(`${base}/signals`, {
          signal: controller.signal,
        }).catch(() => null);
        if (!active()) return;
        setSamples(signals?.samples ?? []);
        setAway(signals?.aggregates?.awaySegments ?? []);
        if (data.expiresAt)
          timer = setTimeout(
            () => void load(),
            Math.max(1000, data.expiresAt - Date.now()),
          );
      } catch (err) {
        if (!active()) return;
        setError(
          err instanceof Error ? err.message : "영상을 불러오지 못했습니다.",
        );
        setStatus("error");
      }
    };
    setStatus("loading");
    setRecording(null);
    setSegments([]);
    setSamples([]);
    setAway([]);
    setPending(null);
    if (sessionId) void load();
    else setStatus("missing");
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [sessionId, revision, refresh]);

  const retry = useCallback(async () => {
    if (!pending || retrying.current) return;
    retrying.current = true;
    const id = generation.current;
    setStatus("uploading");
    setError("");
    setProgress(0);
    try {
      await uploadRecording(pending, (percent) => {
        if (id === generation.current) setProgress(percent);
      });
      if (id === generation.current) refresh();
    } catch (err) {
      if (id !== generation.current) return;
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setStatus("pending");
    } finally {
      retrying.current = false;
    }
  }, [pending, refresh]);

  return {
    recording,
    pending,
    status,
    error,
    progress,
    segments,
    samples,
    away,
    refresh,
    retry,
  };
}
