"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  gazeFromBlendshapes, headPoseFromMatrix, calibrateBaseline, isLookingAway, isSmiling,
  type Baseline, type FaceSample, type Blendshapes,
} from "@/lib/interview/face/face-metrics";

const SAMPLE_MS = 200; // 5Hz

export interface FaceConnections {
  tesselation: Array<{ start: number; end: number }>;
  faceOval: Array<{ start: number; end: number }>;
  leftEye: Array<{ start: number; end: number }>;
  rightEye: Array<{ start: number; end: number }>;
  leftEyebrow: Array<{ start: number; end: number }>;
  rightEyebrow: Array<{ start: number; end: number }>;
  lips: Array<{ start: number; end: number }>;
}

export function useFaceCapture() {
  const lmRef = useRef<unknown>(null);
  const connectionsRef = useRef<FaceConnections | null>(null);
  const samplesRef = useRef<FaceSample[]>([]);
  const baselineRef = useRef<Baseline | null>(null);
  const t0Ref = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const cancelRaf = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cancelRaf();
      try { (lmRef.current as { close?: () => void } | null)?.close?.(); } catch { /* ignore */ }
      lmRef.current = null;
    };
  }, [cancelRaf]);

  const ensureLandmarker = useCallback(async () => {
    if (lmRef.current) return lmRef.current;
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    // 마스킹 연출용 정적 연결선(테셀레이션/윤곽) — 모델과 함께 1회 캡처.
    connectionsRef.current = {
      tesselation: FaceLandmarker.FACE_LANDMARKS_TESSELATION ?? [],
      faceOval: FaceLandmarker.FACE_LANDMARKS_FACE_OVAL ?? [],
      leftEye: FaceLandmarker.FACE_LANDMARKS_LEFT_EYE ?? [],
      rightEye: FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE ?? [],
      leftEyebrow: FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW ?? [],
      rightEyebrow: FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW ?? [],
      lips: FaceLandmarker.FACE_LANDMARKS_LIPS ?? [],
    };
    const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const opts = {
      baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "GPU" as const },
      runningMode: "VIDEO" as const,
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    };
    try {
      lmRef.current = await FaceLandmarker.createFromOptions(fileset, opts);
    } catch {
      lmRef.current = await FaceLandmarker.createFromOptions(fileset, { ...opts, baseOptions: { ...opts.baseOptions, delegate: "CPU" as const } });
    }
    return lmRef.current;
  }, []);

  const getConnections = useCallback(() => connectionsRef.current, []);

  const readFrame = useCallback((video: HTMLVideoElement) => {
    const lm = lmRef.current as { detectForVideo: (v: HTMLVideoElement, t: number) => any } | null;
    if (!lm) return null;
    const res = lm.detectForVideo(video, performance.now());
    const cats = res.faceBlendshapes?.[0]?.categories ?? [];
    if (cats.length === 0) return null;
    const b: Blendshapes = {};
    for (const c of cats) b[c.categoryName] = c.score;
    const gaze = gazeFromBlendshapes(b);
    const head = headPoseFromMatrix(res.facialTransformationMatrixes?.[0]?.data) ?? { yaw: 0, pitch: 0, roll: 0 };
    const landmarks = (res.faceLandmarks?.[0] ?? []) as Array<{ x: number; y: number }>;
    return { gaze, head, smile: isSmiling(b), landmarks };
  }, []);

  const calibrate = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    await ensureLandmarker();
    cancelRaf();
    const frames: Array<{ gazeX: number; gazeY: number; yaw: number; pitch: number }> = [];
    const end = performance.now() + 1500;
    return new Promise((resolve) => {
      const tick = () => {
        const f = readFrame(video);
        if (f) frames.push({ gazeX: f.gaze.gazeX, gazeY: f.gaze.gazeY, yaw: f.head.yaw, pitch: f.head.pitch });
        if (performance.now() < end) { rafRef.current = requestAnimationFrame(tick); }
        else { if (frames.length >= 5) { baselineRef.current = calibrateBaseline(frames); resolve(true); } else resolve(false); }
      };
      rafRef.current = requestAnimationFrame(tick);
    });
  }, [ensureLandmarker, readFrame, cancelRaf]);

  const start = useCallback(async (video: HTMLVideoElement | null) => {
    if (!video || !lmRef.current || !baselineRef.current) return;
    cancelRaf();
    samplesRef.current = [];
    t0Ref.current = performance.now();
    let last = 0;
    const loop = () => {
      const now = performance.now();
      if (now - last >= SAMPLE_MS) {
        last = now;
        const f = readFrame(video);
        if (f && baselineRef.current) {
          const away = isLookingAway({ gazeX: f.gaze.gazeX, gazeY: f.gaze.gazeY, yaw: f.head.yaw, pitch: f.head.pitch, blink: f.gaze.blink }, baselineRef.current);
          samplesRef.current.push({ tMs: Math.round(now - (t0Ref.current ?? now)), gazeX: f.gaze.gazeX, gazeY: f.gaze.gazeY, yaw: f.head.yaw, pitch: f.head.pitch, away, smile: f.smile });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [readFrame, cancelRaf]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    return { sampleRateHz: 5, samples: samplesRef.current, baseline: baselineRef.current };
  }, []);

  const getBaseline = useCallback(() => baselineRef.current, []);

  const setBaseline = useCallback((b: Baseline | null) => { baselineRef.current = b; }, []);

  // 단일 프레임 포즈 읽기(좌/우 yaw 감지용). readFrame 위 얇은 공개 래퍼 — readFrame 자체는 건드리지 않음.
  const readPose = useCallback((video: HTMLVideoElement) => {
    const f = readFrame(video);
    return f ? { yaw: f.head.yaw, pitch: f.head.pitch, gazeX: f.gaze.gazeX, gazeY: f.gaze.gazeY } : null;
  }, [readFrame]);

  // 단일 프레임: 포즈 + 478 랜드마크(얼굴 메시 468 + 눈동자 10, 정규화 좌표) — 캘리브레이션 마스킹 연출용.
  const readFace = useCallback((video: HTMLVideoElement) => {
    const f = readFrame(video);
    return f
      ? { yaw: f.head.yaw, pitch: f.head.pitch, gazeX: f.gaze.gazeX, gazeY: f.gaze.gazeY, landmarks: f.landmarks }
      : null;
  }, [readFrame]);

  return useMemo(
    () => ({ ensureLandmarker, calibrate, readPose, readFace, start, stop, getBaseline, setBaseline, getConnections }),
    [ensureLandmarker, calibrate, readPose, readFace, start, stop, getBaseline, setBaseline, getConnections],
  );
}
