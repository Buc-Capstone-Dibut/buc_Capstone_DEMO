"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CameraOff, CheckCircle2, Loader2 } from "lucide-react";

type DeviceStatus = "checking" | "ready" | "audio-only" | "denied";

interface InterviewDeviceCheckProps {
  /** 마이크 사용 가능(권한 허용) 여부가 바뀔 때 호출 — 부모의 '시작' 버튼 활성화에 사용 */
  onMicReady?: (ready: boolean) => void;
}

/**
 * 면접 시작 전 풀스크린 준비 페이지에서 쓰는 최소 기기 점검 위젯.
 * - 카메라 미리보기(선택) + 마이크 입력 레벨 미터(필수)
 * - getUserMedia 권한/장치 상태를 시각적으로 보여줌(카메라 없으면 음성 전용으로 폴백)
 * - 언마운트 시 모든 트랙을 정리해 실제 면접 파이프라인이 깨끗하게 장치를 잡도록 함
 */
export function InterviewDeviceCheck({ onMicReady }: InterviewDeviceCheckProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const onMicReadyRef = useRef(onMicReady);
  onMicReadyRef.current = onMicReady;

  const [status, setStatus] = useState<DeviceStatus>("checking");
  const [hasVideo, setHasVideo] = useState(false);
  const [level, setLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const stopAll = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => undefined);
        audioCtxRef.current = null;
      }
    };

    const startLevelMeter = (stream: MediaStream) => {
      if (stream.getAudioTracks().length === 0) return;
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctor();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          if (!cancelled) setLevel(Math.min(1, rms * 3.2));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // 레벨 미터는 옵션 — 실패해도 점검 자체는 계속
      }
    };

    const attach = async (stream: MediaStream, withVideo: boolean) => {
      streamRef.current = stream;
      const showVideo = withVideo && stream.getVideoTracks().length > 0;
      setHasVideo(showVideo);
      if (showVideo && videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      startLevelMeter(stream);
    };

    const run = async () => {
      setStatus("checking");
      if (!navigator?.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setStatus("denied");
          onMicReadyRef.current?.(false);
        }
        return;
      }
      // 1) 카메라 + 마이크
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        await attach(s, true);
        setStatus("ready");
        onMicReadyRef.current?.(true);
        return;
      } catch {
        // 카메라 거부/없음 → 음성만 재시도
      }
      // 2) 마이크만 (카메라는 선택 사항)
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        await attach(s, false);
        setStatus("audio-only");
        onMicReadyRef.current?.(true);
        return;
      } catch {
        if (!cancelled) {
          setStatus("denied");
          onMicReadyRef.current?.(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopAll();
    };
  }, [attempt]);

  const micOk = status === "ready" || status === "audio-only";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* 카메라 미리보기 */}
      <div className="relative flex aspect-video w-full items-center justify-center bg-muted/50">
        {hasVideo ? (
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {status === "checking" ? <Loader2 className="h-7 w-7 animate-spin" /> : <CameraOff className="h-7 w-7" />}
            <p className="text-xs">
              {status === "checking" ? "카메라 확인 중..." : "카메라 없이 음성으로 진행됩니다"}
            </p>
          </div>
        )}
      </div>

      {/* 상태 + 마이크 레벨 */}
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm">
          {hasVideo ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <CameraOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={hasVideo ? "font-medium text-foreground" : "text-muted-foreground"}>
            카메라 {hasVideo ? "정상" : "꺼짐 (선택 사항)"}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {micOk ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : status === "checking" ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <span className={micOk ? "font-medium text-foreground" : "text-muted-foreground"}>
              {micOk
                ? "마이크 인식됨 — 말해보세요"
                : status === "checking"
                  ? "마이크 확인 중..."
                  : "마이크 권한이 필요합니다"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-75"
              style={{ width: micOk ? `${Math.max(4, Math.round(level * 100))}%` : "0%" }}
            />
          </div>
        </div>

        {status === "denied" && (
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="w-full rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            권한 다시 요청 · 다시 확인
          </button>
        )}
      </div>
    </div>
  );
}
