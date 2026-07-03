"use client";

import { useEffect, useRef } from "react";

import type { FaceSample } from "@/lib/interview/face/face-metrics";
import { letterboxRect, sampleAtTime } from "@/lib/interview/report/overlay-geometry";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  samples: FaceSample[];
}

// requestVideoFrameCallback는 lib.dom에 아직 없는 환경이 있어 로컬 타입으로 캐스팅.
type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// 좌상단/우상단 작은 pill (배경 + 흰 텍스트). 그려진 너비를 반환.
function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bg: string,
  align: "left" | "right",
) {
  const padX = 8;
  const padY = 5;
  const fontH = 12;
  ctx.font = "600 12px Pretendard, sans-serif";
  ctx.textBaseline = "top";
  const textW = ctx.measureText(text).width;
  const pillW = textW + padX * 2;
  const pillH = fontH + padY * 2;
  const left = align === "right" ? x - pillW : x;
  ctx.fillStyle = bg;
  roundRectPath(ctx, left, y, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, left + padX, y + padY);
  return pillW;
}

export function ReplayOverlay({ videoRef, samples }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current as VideoWithRVFC | null;
    if (!canvas || !video) return;

    let rvfcHandle: number | null = null;
    let rafHandle: number | null = null;
    let disposed = false;

    const supportsRVFC = typeof video.requestVideoFrameCallback === "function";

    const draw = () => {
      const v = videoRef.current;
      const cnv = canvasRef.current;
      if (!v || !cnv) return;
      const ctx = cnv.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const cssW = cnv.clientWidth;
      const cssH = cnv.clientHeight;
      const wantW = Math.round(cssW * dpr);
      const wantH = Math.round(cssH * dpr);
      if (cnv.width !== wantW) cnv.width = wantW;
      if (cnv.height !== wantH) cnv.height = wantH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const clear = () => ctx.clearRect(0, 0, cssW, cssH);
      clear();

      if (samples.length === 0) return;
      // 메타데이터 로드 전(비디오 크기 0)에는 그릴 수 없음.
      if (!v.videoWidth || !v.videoHeight) return;

      const t = v.currentTime * 1000;
      const s = sampleAtTime(samples, t);
      if (!s) return;

      const rect = letterboxRect(v.videoWidth, v.videoHeight, cssW, cssH);

      // 시선 이탈: amber 외곽선 + 좌상단 pill
      if (s.away) {
        const inset = 1.5;
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(245,158,11,0.9)";
        roundRectPath(
          ctx,
          rect.offsetX + inset,
          rect.offsetY + inset,
          rect.width - inset * 2,
          rect.height - inset * 2,
          12,
        );
        ctx.stroke();
        drawPill(ctx, "시선 이탈", rect.offsetX + 10, rect.offsetY + 10, "rgba(245,158,11,0.9)", "left");
      }

      // 관찰 가능 행동만 표시: 미소 중일 때만 우상단 pill (감정 라벨 없음)
      if (s.smile) {
        drawPill(
          ctx,
          "미소",
          rect.offsetX + rect.width - 10,
          rect.offsetY + 10,
          "rgba(99,153,34,0.9)",
          "right",
        );
      }

      // 시선 인디케이터: rect 중심에서 (gazeX, gazeY) 방향 (gazeY는 캔버스 좌표로 반전)
      const cx = rect.offsetX + rect.width / 2;
      const cy = rect.offsetY + rect.height / 2;
      const reach = 0.25 * Math.min(rect.width, rect.height);
      const tipX = cx + s.gazeX * reach;
      const tipY = cy + -s.gazeY * reach;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(130,184,76,0.95)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.fillStyle = "rgba(130,184,76,0.95)";
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    const scheduleRVFC = () => {
      if (disposed) return;
      rvfcHandle = (video.requestVideoFrameCallback as NonNullable<VideoWithRVFC["requestVideoFrameCallback"]>)(
        () => {
          if (disposed) return;
          draw();
          scheduleRVFC();
        },
      );
    };

    const scheduleRAF = () => {
      if (disposed) return;
      rafHandle = window.requestAnimationFrame(() => {
        if (disposed) return;
        draw();
        // 일시정지 중에는 루프 중단(rVFC 시맨틱 모방). 재생 시 play 이벤트로 재개.
        if (!video.paused) scheduleRAF();
      });
    };

    // 정적 이벤트(seek/일시정지/리사이즈)에서도 1회 즉시 갱신.
    const onStatic = () => draw();
    video.addEventListener("seeked", onStatic);
    video.addEventListener("pause", onStatic);

    // rAF 폴백에서만: 재생 시작 시 루프 재개. + 첫 프레임(일시정지) 주석.
    const onPlay = () => scheduleRAF();
    const onLoadedData = () => draw();
    if (!supportsRVFC) video.addEventListener("play", onPlay);
    video.addEventListener("loadeddata", onLoadedData);

    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);

    if (supportsRVFC) scheduleRVFC();
    else scheduleRAF();
    draw();

    return () => {
      disposed = true;
      if (rvfcHandle !== null && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(rvfcHandle);
      }
      if (rafHandle !== null) window.cancelAnimationFrame(rafHandle);
      video.removeEventListener("seeked", onStatic);
      video.removeEventListener("pause", onStatic);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("loadeddata", onLoadedData);
      ro.disconnect();
    };
  }, [videoRef, samples]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
