"use client";

import { useEffect, useRef } from "react";

import { useFaceCapture, type FaceConnections } from "@/hooks/interview/use-face-capture";
import { letterboxRect } from "@/lib/interview/report/overlay-geometry";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

type VideoWithRVFC = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const LIME = "130,184,76";
const DETECT_INTERVAL_MS = 66; // ~15fps 감지(그리기는 프레임마다) — 재생 성능 보호

interface Landmark {
  x: number;
  y: number;
}

interface Pose {
  yaw: number;
  pitch: number;
  gazeX: number;
}

/** 재생 영상(비미러·object-contain) 좌표계에서 얼굴 마스킹을 그린다 — 캘리브레이션 연출의 재생판. */
function drawMask(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  connections: FaceConnections | null,
  rect: { offsetX: number; offsetY: number; width: number; height: number },
  cssW: number,
  pose: Pose | null,
) {
  const X = (lm: Landmark) => rect.offsetX + lm.x * rect.width;
  const Y = (lm: Landmark) => rect.offsetY + lm.y * rect.height;

  const stroke = (list: Array<{ start: number; end: number }>, style: string, width: number) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const c of list) {
      const a = landmarks[c.start];
      const b = landmarks[c.end];
      if (!a || !b) continue;
      ctx.moveTo(X(a), Y(a));
      ctx.lineTo(X(b), Y(b));
    }
    ctx.stroke();
  };

  // 1) 테셀레이션 와이어프레임 — 얼굴 전체 스캔 메시
  if (connections?.tesselation?.length) stroke(connections.tesselation, `rgba(${LIME},0.16)`, 0.5);

  // 2) 주요 윤곽 — 오벌·눈·눈썹·입술 글로우
  if (connections) {
    ctx.save();
    ctx.shadowColor = `rgba(${LIME},1)`;
    ctx.shadowBlur = 8;
    stroke(connections.faceOval, `rgba(${LIME},0.95)`, 2);
    ctx.shadowBlur = 4;
    const soft = "rgba(210,255,170,0.9)";
    stroke(connections.leftEye, soft, 1.4);
    stroke(connections.rightEye, soft, 1.4);
    stroke(connections.leftEyebrow, soft, 1.1);
    stroke(connections.rightEyebrow, soft, 1.1);
    stroke(connections.lips, soft, 1.1);
    ctx.restore();
  }

  // 3) 동공 락온 — iris 랜드마크(468~477) 중심에 링+점
  for (const base of [468, 473]) {
    const pts = landmarks.slice(base, base + 5);
    if (pts.length < 5) continue;
    const cx = pts.reduce((s, p) => s + X(p), 0) / pts.length;
    const cy = pts.reduce((s, p) => s + Y(p), 0) / pts.length;
    const r = Math.max(3, Math.hypot(X(pts[1]) - X(pts[3]), Y(pts[1]) - Y(pts[3])) / 2);
    ctx.strokeStyle = `rgba(${LIME},0.95)`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(230,255,200,0.95)";
    ctx.beginPath();
    ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4) 얼굴 bbox 코너 브래킷 — 추적 중임을 드러내는 최소 프레임
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const meshCount = Math.min(landmarks.length, 468);
  for (let i = 0; i < meshCount; i++) {
    const x = X(landmarks[i]);
    const y = Y(landmarks[i]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const pad = 8;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const L = Math.min(14, (maxX - minX) * 0.18);
  ctx.strokeStyle = `rgba(${LIME},0.85)`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(minX, minY + L); ctx.lineTo(minX, minY); ctx.lineTo(minX + L, minY);
  ctx.moveTo(maxX - L, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + L);
  ctx.moveTo(maxX, maxY - L); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX - L, maxY);
  ctx.moveTo(minX + L, maxY); ctx.lineTo(minX, maxY); ctx.lineTo(minX, maxY - L);
  ctx.stroke();

  // 5) 우상단 고정 리드아웃 — 실측 수치(전문 장비 HUD)
  ctx.font = "600 9px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("FACE TRACK · 478 pts", cssW - 8, 14);
  if (pose) {
    ctx.fillStyle = `rgba(${LIME},0.95)`;
    ctx.fillText(
      `YAW ${pose.yaw >= 0 ? "+" : ""}${pose.yaw.toFixed(1)}°  PIT ${pose.pitch >= 0 ? "+" : ""}${pose.pitch.toFixed(1)}°`,
      cssW - 8,
      26,
    );
  }
  ctx.textAlign = "left";
}

/**
 * 재생 영상 위 얼굴 마스킹 오버레이 — 저장 데이터가 아니라 재생 프레임에 MediaPipe 를
 * 직접 돌려 실제 얼굴 위치에 와이어프레임·동공 락온을 그린다(과거 녹화에도 적용).
 * 얼굴이 감지되지 않는 프레임(음성 전용 등)은 조용히 아무것도 그리지 않는다.
 */
export function FaceMaskOverlay({ videoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const face = useFaceCapture();

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current as VideoWithRVFC | null;
    if (!canvas || !video) return;

    let disposed = false;
    let rvfcHandle: number | null = null;
    let rafHandle: number | null = null;
    let engineReady = false;
    let lastDetectAt = 0;
    let landmarks: Landmark[] | null = null;
    let pose: Pose | null = null;
    let connections: FaceConnections | null = null;

    void face.ensureLandmarker().then(() => {
      if (disposed) return;
      engineReady = true;
      connections = face.getConnections();
      draw();
    });

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
      if (cnv.width !== Math.round(cssW * dpr)) cnv.width = Math.round(cssW * dpr);
      if (cnv.height !== Math.round(cssH * dpr)) cnv.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      if (!engineReady || !v.videoWidth || !v.videoHeight || cssW <= 0) return;

      // 감지는 스로틀(15fps), 그리기는 최신 랜드마크로 매 프레임.
      const now = performance.now();
      if (v.readyState >= 2 && now - lastDetectAt >= DETECT_INTERVAL_MS) {
        lastDetectAt = now;
        try {
          const f = face.readFace(v);
          landmarks = f?.landmarks?.length ? f.landmarks : null;
          pose = f ? { yaw: f.yaw, pitch: f.pitch, gazeX: f.gazeX } : null;
        } catch {
          landmarks = null;
        }
      }
      if (!landmarks) return;
      const rect = letterboxRect(v.videoWidth, v.videoHeight, cssW, cssH);
      drawMask(ctx, landmarks, connections, rect, cssW, pose);
    };

    const scheduleRVFC = () => {
      if (disposed) return;
      rvfcHandle = (video.requestVideoFrameCallback as NonNullable<VideoWithRVFC["requestVideoFrameCallback"]>)(() => {
        if (disposed) return;
        draw();
        scheduleRVFC();
      });
    };
    const scheduleRAF = () => {
      if (disposed) return;
      rafHandle = window.requestAnimationFrame(() => {
        if (disposed) return;
        draw();
        if (!video.paused) scheduleRAF();
      });
    };

    const onStatic = () => draw();
    video.addEventListener("seeked", onStatic);
    video.addEventListener("pause", onStatic);
    video.addEventListener("loadeddata", onStatic);
    const onPlay = () => scheduleRAF();
    if (!supportsRVFC) video.addEventListener("play", onPlay);

    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);

    if (supportsRVFC) scheduleRVFC();
    else scheduleRAF();

    return () => {
      disposed = true;
      if (rvfcHandle !== null && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(rvfcHandle);
      }
      if (rafHandle !== null) window.cancelAnimationFrame(rafHandle);
      video.removeEventListener("seeked", onStatic);
      video.removeEventListener("pause", onStatic);
      video.removeEventListener("loadeddata", onStatic);
      video.removeEventListener("play", onPlay);
      ro.disconnect();
    };
  }, [videoRef, face]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
