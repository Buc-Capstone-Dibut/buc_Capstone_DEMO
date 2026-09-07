"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { buildRecordingStoragePath } from "@/lib/interview/recording/recording-metadata";
import { fixRecordingDuration } from "@/lib/interview/recording/fix-duration";
import { getInterviewPlaybackAudioContext } from "@/lib/interview/playback-audio";
import {
  RecordingTranscriptClock,
  type RecordingAudioSpan,
} from "@/lib/interview/recording/transcript";
import {
  savePendingRecording,
  type PendingRecording,
} from "@/lib/interview/recording/pending-recording";
import { uploadRecording } from "@/lib/interview/recording/upload-recording";

const CODECS = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

export interface RecordingResult {
  ok: boolean;
  error?: string;
  recoverable?: boolean;
  durable?: boolean;
}

export interface RecordingStartOptions {
  aiAudioStream?: MediaStream | null;
}

export function useInterviewRecording() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const ownedAudioRef = useRef<MediaStream | null>(null);
  const mixNodesRef = useRef<AudioNode[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const monotonicStartRef = useRef(0);
  const aliveRef = useRef(true);
  const clockRef = useRef(new RecordingTranscriptClock());
  const pendingRef = useRef<PendingRecording | null>(null);
  const stoppingRef = useRef<Promise<RecordingResult> | null>(null);
  const startingRef = useRef<Promise<boolean> | null>(null);

  const teardown = useCallback(() => {
    for (const node of mixNodesRef.current) {
      try {
        node.disconnect();
      } catch {
        /* Already disconnected. */
      }
    }
    mixNodesRef.current = [];
    ownedAudioRef.current?.getTracks().forEach((track) => track.stop());
    ownedAudioRef.current = null;
  }, []);

  const start = useCallback(
    (
      videoStream: MediaStream | null,
      options: RecordingStartOptions = {},
    ): Promise<boolean> => {
      if (recorderRef.current) return Promise.resolve(true);
      if (startingRef.current) return startingRef.current;
      const starting = (async () => {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          if (!aliveRef.current) {
            mic.getTracks().forEach((track) => track.stop());
            return false;
          }
          ownedAudioRef.current = mic;
          let audioTracks = mic.getAudioTracks();
          const ctx = options.aiAudioStream
            ? getInterviewPlaybackAudioContext()
            : null;
          if (ctx?.state === "running" && options.aiAudioStream) {
            const destination = ctx.createMediaStreamDestination();
            const microphone = ctx.createMediaStreamSource(mic);
            const interviewer = ctx.createMediaStreamSource(
              options.aiAudioStream,
            );
            microphone.connect(destination);
            interviewer.connect(destination);
            mixNodesRef.current = [microphone, interviewer, destination];
            audioTracks = destination.stream.getAudioTracks();
          }
          const combined = new MediaStream([
            ...(videoStream?.getVideoTracks() ?? []),
            ...audioTracks,
          ]);
          const mimeType = CODECS.find((codec) =>
            MediaRecorder.isTypeSupported(codec),
          );
          const recorder = new MediaRecorder(combined, {
            ...(mimeType ? { mimeType } : {}),
            audioBitsPerSecond: 128_000,
            videoBitsPerSecond: 800_000,
          });
          chunksRef.current = [];
          pendingRef.current = null;
          recorder.ondataavailable = (event) => {
            if (event.data.size) chunksRef.current.push(event.data);
          };
          recorderRef.current = recorder;
          startedAtRef.current = Date.now();
          monotonicStartRef.current = performance.now();
          clockRef.current.start(monotonicStartRef.current);
          recorder.start(5000);
          return true;
        } catch (error) {
          teardown();
          recorderRef.current = null;
          console.error("[recording] start failed", error);
          return false;
        }
      })().finally(() => {
        startingRef.current = null;
      });
      startingRef.current = starting;
      return starting;
    },
    [teardown],
  );

  const stopAndUpload = useCallback(
    (
      sessionId: string,
      onProgress?: (percent: number) => void,
    ): Promise<RecordingResult> => {
      if (stoppingRef.current) return stoppingRef.current;
      const stopping = (async (): Promise<RecordingResult> => {
        let durable = false;
        try {
          await startingRef.current;
          if (!pendingRef.current) {
            const recorder = recorderRef.current;
            const startedAt = startedAtRef.current;
            if (!recorder || !startedAt)
              return { ok: false, error: "녹화된 영상이 없습니다." };
            const durationMs = Math.round(
              performance.now() - monotonicStartRef.current,
            );
            const blob = await new Promise<Blob>((resolve, reject) => {
              const finish = () =>
                resolve(
                  new Blob(chunksRef.current, { type: recorder.mimeType }),
                );
              if (recorder.state === "inactive") return finish();
              recorder.onstop = finish;
              recorder.onerror = () =>
                reject(new Error("녹화를 마무리하지 못했습니다."));
              recorder.stop();
            });
            teardown();
            recorderRef.current = null;
            if (!blob.size) throw new Error("녹화된 영상이 없습니다.");
            pendingRef.current = {
              sessionId,
              blob,
              storagePath: buildRecordingStoragePath(
                sessionId,
                recorder.mimeType,
              ),
              mimeType: recorder.mimeType,
              durationMs,
              startedAt: new Date(startedAt).toISOString(),
              transcript: clockRef.current.snapshot(durationMs),
            };
            // Keep the original even when optional WebM metadata repair fails.
            if (recorder.mimeType.includes("webm")) {
              pendingRef.current.blob = await fixRecordingDuration(
                blob,
                durationMs,
              ).catch(() => blob);
            }
            chunksRef.current = [];
          }
          durable = await savePendingRecording(pendingRef.current);
          await uploadRecording(pendingRef.current, onProgress);
          pendingRef.current = null;
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "영상 저장에 실패했습니다.",
            recoverable: Boolean(pendingRef.current),
            durable,
          };
        }
      })().finally(() => {
        stoppingRef.current = null;
      });
      stoppingRef.current = stopping;
      return stopping;
    },
    [teardown],
  );

  const audio = useCallback(
    (span: RecordingAudioSpan) => clockRef.current.audio(span),
    [],
  );
  const text = useCallback(
    (role: "ai" | "user", id: string, value: string) =>
      clockRef.current.text(role, id, value),
    [],
  );
  const cancelAnswer = useCallback(
    (id: string) => clockRef.current.cancelAnswer(id),
    [],
  );
  const getStartedAt = useCallback(() => startedAtRef.current, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (recorderRef.current?.state === "recording")
        recorderRef.current.stop();
      teardown();
      recorderRef.current = null;
    };
  }, [teardown]);

  return useMemo(
    () => ({ start, stopAndUpload, getStartedAt, audio, text, cancelAnswer }),
    [start, stopAndUpload, getStartedAt, audio, text, cancelAnswer],
  );
}
