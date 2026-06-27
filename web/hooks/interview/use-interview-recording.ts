"use client";

import { useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  RECORDING_BUCKET,
  buildRecordingStoragePath,
  buildRecordingMetadata,
} from "@/lib/interview/recording/recording-metadata";
import { fixRecordingDuration } from "@/lib/interview/recording/fix-duration";

const CODECS = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const UPLOAD_FETCH_TIMEOUT_MS = 20_000;

export interface RecordingResult {
  ok: boolean;
  error?: string;
}

export function useInterviewRecording() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const ownedAudioRef = useRef<MediaStream | null>(null); // 훅이 직접 취득한 마이크 (정리 책임)
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);

  // videoStream: 미리보기와 공유하는 카메라 스트림(소유권은 호출자). null이면 오디오 전용 녹화.
  const start = useCallback(async (videoStream: MediaStream | null) => {
    if (recorderRef.current) return;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      ownedAudioRef.current = audioStream;

      const tracks: MediaStreamTrack[] = [...audioStream.getAudioTracks()];
      const videoTrack = videoStream?.getVideoTracks?.()[0];
      if (videoTrack) tracks.unshift(videoTrack);
      const combined = new MediaStream(tracks);

      const mimeType = CODECS.find((c) => MediaRecorder.isTypeSupported(c)) ?? "video/webm";
      const recorder = new MediaRecorder(combined, {
        mimeType,
        audioBitsPerSecond: 128_000,
        videoBitsPerSecond: 1_500_000,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(5000); // 5초마다 청크 flush
    } catch (err) {
      console.error("[recording] 시작 실패(영상 없이 면접은 계속):", err);
    }
  }, []);

  const stopAndUpload = useCallback(async (sessionId: string): Promise<RecordingResult> => {
    const recorder = recorderRef.current;
    const startedAt = startedAtRef.current;
    if (!recorder || !startedAt) return { ok: false, error: "no-recorder" };

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
      recorder.stop();
    });

    // 훅이 소유한 마이크만 정리. 공유 비디오 트랙은 멈추지 않는다(미리보기가 소유).
    ownedAudioRef.current?.getTracks().forEach((t) => t.stop());
    ownedAudioRef.current = null;
    recorderRef.current = null;

    const durationMs = Date.now() - startedAt;
    const fixed = await fixRecordingDuration(blob, durationMs);
    const storagePath = buildRecordingStoragePath(sessionId, recorder.mimeType);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPLOAD_FETCH_TIMEOUT_MS);
    try {
      const signRes = await fetch(`/api/interview/sessions/${sessionId}/recording/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
        signal: controller.signal,
      });
      const signJson = await signRes.json();
      if (!signJson?.success) throw new Error(signJson?.error ?? "sign failed");

      const { error: upErr } = await supabase.storage
        .from(RECORDING_BUCKET)
        .uploadToSignedUrl(signJson.data.path, signJson.data.token, fixed);
      if (upErr) throw upErr;

      const meta = buildRecordingMetadata({
        bucket: RECORDING_BUCKET,
        storagePath,
        mimeType: recorder.mimeType,
        sizeBytes: fixed.size,
        durationMs,
        recordingStartedAtIso: new Date(startedAt).toISOString(),
      });
      await fetch(`/api/interview/sessions/${sessionId}/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
        signal: controller.signal,
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[recording] 업로드 실패:", msg);
      return { ok: false, error: msg };
    } finally {
      clearTimeout(timer);
    }
  }, []);

  return { start, stopAndUpload };
}
