"use client";

import { useCallback, useRef } from "react";
import {
  gazeFromBlendshapes, headPoseFromMatrix, calibrateBaseline, isLookingAway, expressionLabel,
  type Baseline, type FaceSample, type Blendshapes,
} from "@/lib/interview/face/face-metrics";

const SAMPLE_MS = 200; // 5Hz

export function useFaceCapture() {
  const lmRef = useRef<unknown>(null);
  const samplesRef = useRef<FaceSample[]>([]);
  const baselineRef = useRef<Baseline | null>(null);
  const t0Ref = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const ensureLandmarker = useCallback(async () => {
    if (lmRef.current) return lmRef.current;
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    lmRef.current = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
    return lmRef.current;
  }, []);

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
    return { gaze, head, expr: expressionLabel(b) };
  }, []);

  const calibrate = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    await ensureLandmarker();
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
  }, [ensureLandmarker, readFrame]);

  const start = useCallback(async (video: HTMLVideoElement | null) => {
    if (!video || !lmRef.current || !baselineRef.current) return;
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
          samplesRef.current.push({ tMs: Math.round(now - (t0Ref.current ?? now)), gazeX: f.gaze.gazeX, gazeY: f.gaze.gazeY, yaw: f.head.yaw, pitch: f.head.pitch, away, expr: f.expr });
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [readFrame]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    return { sampleRateHz: 5, samples: samplesRef.current, baseline: baselineRef.current };
  }, []);

  return { ensureLandmarker, calibrate, start, stop, getBaseline: () => baselineRef.current };
}
