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

const LIME = "rgba(130,184,76,0.95)";
const AMBER = "rgba(245,158,11,0.95)";

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

      // 간략한 점 표기만 — 테두리/화살표/텍스트 pill 없음.
      // 1) 시선 점: 중앙 기준점(옅은 점) + 시선 위치 점(정면=라임, 이탈=amber).
      const cx = rect.offsetX + rect.width / 2;
      const cy = rect.offsetY + rect.height / 2;
      const reach = 0.22 * Math.min(rect.width, rect.height);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
      const gx = cx + s.gazeX * reach;
      const gy = cy + -s.gazeY * reach; // gazeY는 캔버스 좌표로 반전
      ctx.fillStyle = s.away ? AMBER : LIME;
      ctx.beginPath();
      ctx.arc(gx, gy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; // 밝은 배경 대비용 얇은 윤곽
      ctx.lineWidth = 1;
      ctx.stroke();

      // 2) 우상단 미니 상태 점: 시선(정면/이탈) · 표정(미소/기본)
      const items = [
        { label: "시선", color: s.away ? AMBER : LIME },
        { label: "표정", color: s.smile ? LIME : "rgba(255,255,255,0.4)" },
      ];
      ctx.font = "600 10px Pretendard, sans-serif";
      ctx.textBaseline = "middle";
      const dotR = 3.5;
      const gap = 10;
      const itemWs = items.map((it) => dotR * 2 + 4 + ctx.measureText(it.label).width);
      const totalW = itemWs.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
      const padX = 8;
      const capH = 20;
      const capX = rect.offsetX + rect.width - 8 - (totalW + padX * 2);
      const capY = rect.offsetY + 8;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      roundRectPath(ctx, capX, capY, totalW + padX * 2, capH, capH / 2);
      ctx.fill();
      let ix = capX + padX;
      const midY = capY + capH / 2;
      items.forEach((it, i) => {
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.arc(ix + dotR, midY, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillText(it.label, ix + dotR * 2 + 4, midY);
        ix += itemWs[i] + gap;
      });
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
