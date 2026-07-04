"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  RECORDING_BUCKET,
  buildRecordingStoragePath,
  buildRecordingMetadata,
} from "@/lib/interview/recording/recording-metadata";
import { fixRecordingDuration } from "@/lib/interview/recording/fix-duration";
import { getInterviewPlaybackAudioContext } from "@/lib/interview/playback-audio";

const CODECS = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const UPLOAD_FETCH_TIMEOUT_MS = 20_000;

export interface RecordingResult {
  ok: boolean;
  error?: string;
}

export interface RecordingStartOptions {
  /** AI(면접관) 재생 음성 탭 스트림 — 있으면 마이크와 믹스해 한 트랙으로 녹음. */
  aiAudioStream?: MediaStream | null;
}

export function useInterviewRecording() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const ownedAudioRef = useRef<MediaStream | null>(null); // 훅이 직접 취득한 마이크 (정리 책임)
  const mixNodesRef = useRef<AudioNode[]>([]); // 믹서 노드(정리 책임 — disconnect만, ctx는 공유라 close 금지)
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const aliveRef = useRef(true); // 언마운트 후 start() 연속부가 마이크를 잡는 것 방지

  const teardownMixNodes = useCallback(() => {
    for (const node of mixNodesRef.current) {
      try { node.disconnect(); } catch { /* ignore */ }
    }
    mixNodesRef.current = [];
  }, []);

  // 마이크 + AI 음성(탭)을 공유 AudioContext 에서 한 트랙으로 믹스.
  // Chrome MediaRecorder 는 다중 오디오 트랙 중 첫 트랙만 기록하므로 믹싱이 필수다.
  // 컨텍스트가 없거나 잠겨 있으면 마이크 원본 트랙으로 폴백(기존 동작 보존).
  const buildAudioTracks = useCallback((micStream: MediaStream, aiStream: MediaStream | null | undefined) => {
    if (!aiStream) return micStream.getAudioTracks();
    const ctx = getInterviewPlaybackAudioContext(); // aiStream 없으면 호출 안 함 — release 후 유령 컨텍스트 생성 방지
    if (!ctx || ctx.state !== "running") return micStream.getAudioTracks();
    try {
      const mixDest = ctx.createMediaStreamDestination();
      const micSource = ctx.createMediaStreamSource(micStream);
      micSource.connect(mixDest);
      const aiSource = ctx.createMediaStreamSource(aiStream);
      aiSource.connect(mixDest);
      mixNodesRef.current = [micSource, aiSource, mixDest];
      return mixDest.stream.getAudioTracks();
    } catch {
      teardownMixNodes();
      return micStream.getAudioTracks();
    }
  }, [teardownMixNodes]);

  // videoStream: 미리보기와 공유하는 카메라 스트림(소유권은 호출자). null이면 오디오 전용 녹화.
  const start = useCallback(async (videoStream: MediaStream | null, options: RecordingStartOptions = {}) => {
    if (recorderRef.current) return;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // getUserMedia 대기 중 언마운트됐으면 즉시 폐기 — 마이크 잔존(표시등)·유령 recorder 방지.
      if (!aliveRef.current) {
        audioStream.getTracks().forEach((t) => t.stop());
        return;
      }
      ownedAudioRef.current = audioStream;

      const tracks: MediaStreamTrack[] = buildAudioTracks(audioStream, options.aiAudioStream);
      const videoTrack = videoStream?.getVideoTracks?.()[0];
      if (videoTrack) tracks.unshift(videoTrack);
      const combined = new MediaStream(tracks);

      const mimeType = CODECS.find((c) => MediaRecorder.isTypeSupported(c)) ?? "video/webm";
      const recorder = new MediaRecorder(combined, {
        mimeType,
        audioBitsPerSecond: 128_000,
        // 800kbps — 얼굴 분석·리포트 재생 화질엔 충분하면서 저장 용량을 절반으로 줄인다
        // (Supabase 무료플랜 Storage 1GB 여유 확보: 7분 면접 ≈ 85MB→44MB).
        videoBitsPerSecond: 800_000,
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(5000); // 5초마다 청크 flush
    } catch (err) {
      teardownMixNodes();
      ownedAudioRef.current?.getTracks().forEach((t) => t.stop());
      ownedAudioRef.current = null;
      console.error("[recording] 시작 실패(영상 없이 면접은 계속):", err);
    }
  }, [buildAudioTracks, teardownMixNodes]);

  const stopAndUpload = useCallback(async (sessionId: string): Promise<RecordingResult> => {
    const recorder = recorderRef.current;
    const startedAt = startedAtRef.current;
    if (!recorder || !startedAt) return { ok: false, error: "no-recorder" };

    const blob: Blob = await new Promise((resolve) => {
      if (recorder.state === "inactive") {
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
        return;
      }
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
      recorder.stop();
    });

    // 훅이 소유한 마이크·믹서 노드만 정리. 공유 비디오 트랙은 멈추지 않는다(미리보기가 소유).
    teardownMixNodes();
    ownedAudioRef.current?.getTracks().forEach((t) => t.stop());
    ownedAudioRef.current = null;
    recorderRef.current = null;

    const durationMs = Date.now() - startedAt;
    const fixed = await fixRecordingDuration(blob, durationMs);
    const storagePath = buildRecordingStoragePath(sessionId, recorder.mimeType);

    // 요청별 독립 타임아웃 — 하나의 signal 을 공유하면 스토리지 업로드가 오래 걸릴 때
    // 이후 메타 POST 가 이미 만료된 signal 로 즉사해 '파일만 있고 DB 행 없는' 유실이 난다.
    const timedFetch = (url: string, init: RequestInit) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPLOAD_FETCH_TIMEOUT_MS);
      return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
    };
    try {
      const signRes = await timedFetch(`/api/interview/sessions/${sessionId}/recording/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
      });
      const signJson = await signRes.json();
      if (!signJson?.success) throw new Error(signJson?.error ?? "sign failed");

      // 로컬 개발: 서버 파일 저장 라우트로 한 번에 업로드+메타 기록(dev 노드 서버 — body 제한 없음).
      if (signJson.data?.mode === "local") {
        const q = new URLSearchParams({
          path: storagePath,
          durationMs: String(durationMs),
          startedAt: new Date(startedAt).toISOString(),
        });
        const upRes = await fetch(`/api/interview/sessions/${sessionId}/recording/upload?${q.toString()}`, {
          method: "POST",
          headers: { "Content-Type": recorder.mimeType || "video/webm" },
          body: fixed,
        });
        const upJson = await upRes.json().catch(() => null);
        if (!upJson?.success) throw new Error(upJson?.error ?? "local upload failed");
        return { ok: true };
      }

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
      const metaRes = await timedFetch(`/api/interview/sessions/${sessionId}/recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      const metaJson = await metaRes.json().catch(() => null);
      if (!metaJson?.success) throw new Error(metaJson?.error ?? "recording metadata save failed");
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[recording] 업로드 실패:", msg);
      return { ok: false, error: msg };
    }
  }, [teardownMixNodes]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      // 비정상 언마운트 시 누수 방지: 녹화 중이면 정지하고 마이크 트랙 정리.
      // (정상 종료는 stopAndUpload가 이미 처리하므로 여기선 트랙만 정리)
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      teardownMixNodes();
      ownedAudioRef.current?.getTracks().forEach((t) => t.stop());
      ownedAudioRef.current = null;
      recorderRef.current = null;
    };
  }, [teardownMixNodes]);

  // 녹화 실제 시작 시각(wall-clock) — 얼굴 시계열 tMs 리베이스용.
  const getStartedAt = useCallback(() => startedAtRef.current, []);

  return useMemo(() => ({ start, stopAndUpload, getStartedAt }), [start, stopAndUpload, getStartedAt]);
}
