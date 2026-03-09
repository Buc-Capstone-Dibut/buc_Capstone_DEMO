"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

interface LocalCameraPreviewProps {
  enabled: boolean;
  fill?: boolean;
  maxHeight?: number;
}

export function LocalCameraPreview({
  enabled,
  fill = false,
  maxHeight = 220,
}: LocalCameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const stopStream = () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const start = async () => {
      setIsLoading(true);
      setError(null);

      if (!navigator?.mediaDevices?.getUserMedia) {
        setError("이 브라우저는 카메라 미리보기를 지원하지 않습니다.");
        setIsLoading(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "카메라 접근 권한이 필요합니다.";
        setError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [enabled]);

  if (!enabled) return null;

  if (error) {
    return (
      <div
        className={`rounded-xl border bg-muted/20 text-muted-foreground flex flex-col items-center justify-center gap-2 px-4 py-3 ${fill ? "h-full" : ""}`}
        style={fill ? undefined : { minHeight: maxHeight, height: maxHeight }}
      >
        <CameraOff className="w-5 h-5" />
        <p className="text-xs text-center">카메라 연결 실패 — 음성 면접은 계속 진행할 수 있습니다.</p>
        <p className="text-[11px] text-center opacity-70">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl overflow-hidden border bg-black relative ${fill ? "h-full" : ""}`}
      style={fill ? undefined : { height: maxHeight }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover scale-x-[-1]"
      />
      {isLoading && (
        <div className="absolute inset-0 bg-black/55 text-white/75 text-xs flex items-center justify-center">
          카메라 연결 중...
        </div>
      )}
    </div>
  );
}
