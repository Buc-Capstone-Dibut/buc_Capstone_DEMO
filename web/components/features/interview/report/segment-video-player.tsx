"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { RefreshCw } from "lucide-react";

import type { FaceSample } from "@/lib/interview/face/face-metrics";

import { ReplayOverlay } from "./replay-overlay";
import { FaceMaskOverlay } from "./face-mask-overlay";

export interface SegmentVideoPlayerHandle {
  seekTo: (ms: number) => void;
  getCurrentTimeMs: () => number;
  getDurationMs: () => number;
}

interface Props {
  src: string;
  className?: string;
  samples?: FaceSample[];
  /** 지정 시 구간 플레이어로 동작: 메타 로드 후 구간 시작으로 이동. */
  clipStartMs?: number;
  /** 지정 시 구간 끝에 도달하면 자동 일시정지(스크럽으로 벗어나는 건 허용). */
  clipEndMs?: number;
  /** 재생 프레임에 MediaPipe 를 돌려 얼굴 위에 마스킹(와이어프레임·동공 락온)을 그린다. */
  faceMask?: boolean;
  onReload?: () => void;
}

// WebM(MediaRecorder) duration=Infinity 보정: 메타 로드 시 강제 seek으로 실제 길이 확정.
export const SegmentVideoPlayer = forwardRef<SegmentVideoPlayerHandle, Props>(
  function SegmentVideoPlayer(
    { src, className, samples, clipStartMs, clipEndMs, faceMask, onReload },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [error, setError] = useState("");
    const pendingSeekRef = useRef<{ ms: number; play: boolean } | null>(null);
    const probingDurationRef = useRef(false);
    const loadedSourceRef = useRef(src);
    const positionRef = useRef({ ms: 0, play: false });
    useEffect(() => {
      setError("");
      probingDurationRef.current = false;
    }, [src]);

    const applyPendingSeek = () => {
      const video = videoRef.current;
      const pending = pendingSeekRef.current;
      if (!video || !pending || !video.readyState || probingDurationRef.current)
        return;
      pendingSeekRef.current = null;
      video.currentTime = Math.max(
        0,
        Math.min(pending.ms / 1000, video.duration || Infinity),
      );
      if (pending.play) {
        void video.play().catch((cause: unknown) => {
          if (cause instanceof DOMException && cause.name === "AbortError")
            return;
          setError("재생 버튼을 눌러 영상을 시작해 주세요.");
        });
      }
    };

    useImperativeHandle(ref, () => ({
      seekTo: (ms: number) => {
        pendingSeekRef.current = { ms, play: true };
        applyPendingSeek();
      },
      getCurrentTimeMs: () =>
        videoRef.current ? videoRef.current.currentTime * 1000 : 0,
      getDurationMs: () =>
        videoRef.current && isFinite(videoRef.current.duration)
          ? videoRef.current.duration * 1000
          : 0,
    }));

    const handleLoadedMetadata = () => {
      const v = videoRef.current;
      if (!v) return;
      if (!pendingSeekRef.current) {
        // Refreshing an expiring signed URL must preserve the current position.
        pendingSeekRef.current =
          loadedSourceRef.current !== src
            ? { ...positionRef.current }
            : { ms: clipStartMs ?? 0, play: false };
      }
      loadedSourceRef.current = src;
      if (!isFinite(v.duration)) {
        probingDurationRef.current = true;
        v.currentTime = 1e101;
      } else {
        applyPendingSeek();
      }
    };

    // 구간 끝 자동 정지 — 아래에서 경계를 '통과'하는 순간 1회만 멈춘다.
    // (끝에서 다시 재생을 누르면 계속 볼 수 있고, 스크럽으로 벗어나는 것도 막지 않는다)
    const wasBeforeClipEndRef = useRef(false);
    const handleTimeUpdate = () => {
      const v = videoRef.current;
      if (
        !v ||
        !v.readyState ||
        probingDurationRef.current ||
        loadedSourceRef.current !== src
      )
        return;
      const ms = v.currentTime * 1000;
      positionRef.current.ms = ms;
      if (clipEndMs == null) return;
      if (ms < clipEndMs) {
        wasBeforeClipEndRef.current = true;
        return;
      }
      if (wasBeforeClipEndRef.current && !v.paused) v.pause();
      wasBeforeClipEndRef.current = false;
    };

    const video = (
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        onError={() =>
          setError("영상을 재생하지 못했습니다. 다시 불러와 주세요.")
        }
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={() => {
          if (!probingDurationRef.current) return;
          probingDurationRef.current = false;
          applyPendingSeek();
        }}
        onPlay={() => {
          positionRef.current.play = true;
          setError("");
        }}
        onPause={() => {
          if (
            videoRef.current?.readyState &&
            loadedSourceRef.current === src &&
            !probingDurationRef.current
          ) {
            positionRef.current.play = false;
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        className={
          className ??
          "aspect-video w-full rounded-lg border bg-black object-contain"
        }
      />
    );

    return (
      <div>
        <div className="relative">
          {video}
          {faceMask ? <FaceMaskOverlay videoRef={videoRef} /> : null}
          {samples?.length ? (
            <ReplayOverlay videoRef={videoRef} samples={samples} />
          ) : null}
        </div>
        {error && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <p role="alert">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError("");
                if (onReload) onReload();
                else videoRef.current?.load();
              }}
              className="inline-flex items-center gap-1 underline"
            >
              <RefreshCw className="h-4 w-4" />
              다시 불러오기
            </button>
          </div>
        )}
      </div>
    );
  },
);
