"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, ScanFace } from "lucide-react";
import { useFaceCapture } from "@/hooks/interview/use-face-capture";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { calibrateBaseline } from "@/lib/interview/face/face-metrics";

type Landmark = { x: number; y: number };

export type FaceCalibrationStatus = "idle" | "running" | "done" | "skipped" | "unavailable";

type Step = "front" | "left" | "right";
const STEP_LABEL: Record<Step, string> = { front: "정면", left: "좌측", right: "우측" };

// 느슨한 감지 파라미터 — 통과가 쉬워야 UX가 산다.
const FRONT_HOLD_MS = 1200; // 정면 유지 시간(진행 바가 차오르는 시간)
const SIDE_HOLD_MS = 400; // 좌/우 회전 유지 시간
const SIDE_YAW_TH = 8; // 좌/우로 인정할 yaw 편차(도)
const SIDE_TIMEOUT_MS = 12000; // 미감지 시 "생략하고 완료" 안내(실패 아님)
const POLL_MS = 66; // ~15fps — 마스킹이 부드럽게 따라오도록 (GPU delegate 기준 여유)

export interface FaceCalibration {
  status: FaceCalibrationStatus;
  step: Step;
  message: string;
  faceDetected: boolean;
  engineReady: boolean;
  progress: number; // 0~1 현재 단계 유지 진행도
  liveYawDev: number; // 좌/우 단계 실시간 편차(연출용)
  sideStuck: boolean; // 좌/우 장시간 미감지
  /** 최신 478 랜드마크(정규화, 미인식 시 null) — 오버레이 마스킹이 rAF로 읽는다(setState 스팸 회피). */
  landmarksRef: MutableRefObject<Landmark[] | null>;
  start: () => void;
  skip: () => void;
  completeWithBaseline: () => void; // 좌/우 생략하고 완료(baseline 확보 시)
}

/**
 * 얼굴 캘리브레이션 로직 훅 — 디바이스 체크 박스에 통합해 쓴다.
 * - 카메라가 켜지면 즉시 MediaPipe 프리로드 + 라이브 얼굴 감지(시작 전에도 오벌이 반응).
 * - 정면: 유지 진행 바 → baseline 저장. 좌/우: 부호 자동 감지(첫 회전 부호 기록, 반대쪽은 반대 부호).
 * - 실패로 막지 않는다: 타임아웃은 "생략하고 완료", 카메라 없으면 unavailable(게이트 통과).
 */
export function useFaceCalibration(
  videoEl: HTMLVideoElement | null,
  cameraOn: boolean,
  onCalibrationChange?: (status: "done" | "skipped" | "unavailable") => void,
): FaceCalibration {
  const face = useFaceCapture();
  const setFaceBaseline = useInterviewSetupStore((s) => s.setFaceBaseline);

  const [status, setStatus] = useState<FaceCalibrationStatus>("idle");
  const [step, setStep] = useState<Step>("front");
  const [message, setMessage] = useState("얼굴 캘리브레이션 (선택)");
  const [faceDetected, setFaceDetected] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveYawDev, setLiveYawDev] = useState(0);
  const [sideStuck, setSideStuck] = useState(false);

  const onChangeRef = useRef(onCalibrationChange);
  onChangeRef.current = onCalibrationChange;
  const setBaselineRef = useRef(setFaceBaseline);
  setBaselineRef.current = setFaceBaseline;

  const pollRef = useRef<number | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const stepRef = useRef(step);
  stepRef.current = step;
  const holdStartRef = useRef<number | null>(null);
  const frontFramesRef = useRef<Array<{ gazeX: number; gazeY: number; yaw: number; pitch: number }>>([]);
  const yaw0Ref = useRef(0);
  const sideSignRef = useRef<number | null>(null);
  const sideStartRef = useRef<number>(0);
  const landmarksRef = useRef<Landmark[] | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const finalize = useCallback(
    (next: "done" | "skipped" | "unavailable", msg: string) => {
      stopPoll();
      setProgress(0);
      setSideStuck(false);
      setMessage(msg);
      setStatus(next);
      onChangeRef.current?.(next);
    },
    [stopPoll],
  );

  const completeWithBaseline = useCallback(() => {
    finalize("done", "얼굴 캘리브레이션 완료");
  }, [finalize]);

  const skip = useCallback(() => {
    setBaselineRef.current(null);
    finalize("skipped", "건너뜀 — 음성 중심으로 진행");
  }, [finalize]);

  // 라이브 감지 + 단계 진행 (단일 폴링 루프)
  useEffect(() => {
    if (!cameraOn || !videoEl) return;
    let cancelled = false;

    void face
      .ensureLandmarker()
      .then(() => {
        if (!cancelled) setEngineReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setBaselineRef.current(null);
          finalize("unavailable", "얼굴 분석 엔진을 불러오지 못했습니다 — 음성으로 진행");
        }
      });

    const tick = () => {
      const st = statusRef.current;
      if (st === "done" || st === "skipped" || st === "unavailable") return;
      if (!videoEl || videoEl.videoWidth === 0) return;

      const pose = face.readFace(videoEl);
      landmarksRef.current = pose?.landmarks?.length ? pose.landmarks : null;
      setFaceDetected(!!pose);
      if (!pose) {
        holdStartRef.current = null;
        setProgress(0);
        return;
      }

      const now = performance.now();
      if (st !== "running") return;

      const cur = stepRef.current;
      if (cur === "front") {
        frontFramesRef.current.push(pose);
        if (holdStartRef.current == null) holdStartRef.current = now;
        const held = now - holdStartRef.current;
        setProgress(Math.min(held / FRONT_HOLD_MS, 1));
        if (held >= FRONT_HOLD_MS && frontFramesRef.current.length >= 4) {
          const base = calibrateBaseline(frontFramesRef.current);
          face.setBaseline(base);
          setBaselineRef.current(base);
          yaw0Ref.current = base.yaw0;
          holdStartRef.current = null;
          setProgress(0);
          sideSignRef.current = null;
          sideStartRef.current = now;
          setSideStuck(false);
          setStep("left");
          setMessage("고개를 왼쪽으로 살짝 돌려 주세요");
        }
      } else {
        const dev = pose.yaw - yaw0Ref.current;
        setLiveYawDev(dev);
        const need = cur === "left" ? null : sideSignRef.current == null ? null : -sideSignRef.current;
        const passes = Math.abs(dev) > SIDE_YAW_TH && (need == null || Math.sign(dev) === need);
        if (passes) {
          if (holdStartRef.current == null) holdStartRef.current = now;
          const held = now - holdStartRef.current;
          setProgress(Math.min(held / SIDE_HOLD_MS, 1));
          if (held >= SIDE_HOLD_MS) {
            holdStartRef.current = null;
            setProgress(0);
            if (cur === "left") {
              sideSignRef.current = Math.sign(dev);
              sideStartRef.current = now;
              setSideStuck(false);
              setStep("right");
              setMessage("좋아요 — 이번엔 반대쪽으로");
            } else {
              completeWithBaseline();
            }
          }
        } else {
          holdStartRef.current = null;
          setProgress(0);
        }
        if (now - sideStartRef.current > SIDE_TIMEOUT_MS) setSideStuck(true);
      }
    };

    pollRef.current = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      stopPoll();
    };
  }, [cameraOn, videoEl, face, finalize, completeWithBaseline, stopPoll]);

  const start = useCallback(() => {
    if (statusRef.current === "running") return;
    if (!cameraOn || !videoEl) {
      setBaselineRef.current(null);
      finalize("unavailable", "카메라가 꺼져 있어 사용할 수 없습니다");
      return;
    }
    frontFramesRef.current = [];
    holdStartRef.current = null;
    setProgress(0);
    setSideStuck(false);
    setStep("front");
    setStatus("running");
    setMessage("정면을 바라본 채 잠시 유지해 주세요");
  }, [cameraOn, videoEl, finalize]);

  // 카메라 꺼진 채 시작 전이면 자동 unavailable(게이트 통과). 다시 켜지면 idle 복귀해 [시작] 노출.
  useEffect(() => {
    if (status === "idle" && !cameraOn) {
      setBaselineRef.current(null);
      finalize("unavailable", "카메라를 켜면 사용할 수 있어요 (선택)");
    } else if (status === "unavailable" && cameraOn) {
      setStatus("idle");
      setMessage("얼굴 캘리브레이션 (선택)");
    }
  }, [cameraOn, status, finalize]);

  return { status, step, message, faceDetected, engineReady, progress, liveYawDev, sideStuck, landmarksRef, start, skip, completeWithBaseline };
}

// 미러(-scale-x-100) + object-cover 매핑으로 정규화 랜드마크 → 표시 좌표.
function drawFaceMask(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  vw: number,
  vh: number,
  cssW: number,
  cssH: number,
) {
  const s = Math.max(cssW / vw, cssH / vh); // object-cover
  const dx = (cssW - vw * s) / 2;
  const dy = (cssH - vh * s) / 2;
  const X = (lm: Landmark) => cssW - (dx + lm.x * vw * s); // 미러 반전
  const Y = (lm: Landmark) => dy + lm.y * vh * s;

  // 1) 얼굴 메시 점묘 마스킹 (468 mesh — 스캔되는 느낌)
  ctx.fillStyle = "rgba(130,184,76,0.5)";
  const meshCount = Math.min(landmarks.length, 468);
  for (let i = 0; i < meshCount; i++) {
    const lm = landmarks[i];
    ctx.fillRect(X(lm) - 0.6, Y(lm) - 0.6, 1.2, 1.2);
  }

  // 2) 눈동자(iris 468~477) — 초점 잡는 연출: 중심 도트 + 조준 링
  if (landmarks.length >= 478) {
    for (const c of [468, 473]) {
      const cx = X(landmarks[c]);
      const cy = Y(landmarks[c]);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(130,184,76,1)";
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 469; i < 478; i++) {
      if (i === 473) continue;
      const lm = landmarks[i];
      ctx.fillRect(X(lm) - 1, Y(lm) - 1, 2, 2);
    }
  }
}

/** 카메라 미리보기 위에 얹는 오버레이 — 얼굴 메시·눈동자 마스킹 + 가이드 오벌 + 인식 칩 + 진행 바 + 좌/우 화살표. */
export function FaceGuideOverlay({ calib, videoEl }: { calib: FaceCalibration; videoEl: HTMLVideoElement | null }) {
  const { status, step, faceDetected, engineReady, progress, liveYawDev, landmarksRef } = calib;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settled = status === "skipped" || status === "unavailable";

  // 랜드마크 마스킹 rAF 드로잉 — landmarksRef를 직접 읽어 리렌더 없이 부드럽게.
  useEffect(() => {
    if (settled) return;
    let raf: number | null = null;
    let disposed = false;
    const draw = () => {
      if (disposed) return;
      const cnv = canvasRef.current;
      const v = videoEl;
      if (cnv) {
        const cssW = cnv.clientWidth;
        const cssH = cnv.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        if (cnv.width !== Math.round(cssW * dpr) || cnv.height !== Math.round(cssH * dpr)) {
          cnv.width = Math.round(cssW * dpr);
          cnv.height = Math.round(cssH * dpr);
        }
        const ctx = cnv.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, cssW, cssH);
          const lms = landmarksRef.current;
          if (lms && v && v.videoWidth > 0 && cssW > 0) {
            drawFaceMask(ctx, lms, v.videoWidth, v.videoHeight, cssW, cssH);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [settled, videoEl, landmarksRef]);

  if (settled) return null;
  const isRunning = status === "running";
  const isSide = isRunning && step !== "front";
  const isDone = status === "done";

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* 얼굴 메시·눈동자 마스킹 캔버스 */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* 가이드 오벌 — 얼굴을 찾기 전 안내용(인식되면 마스킹이 메인) */}
      {!faceDetected && !isDone && (
        <svg viewBox="0 0 160 90" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
          <ellipse
            cx="80"
            cy="46"
            rx="27"
            ry="35"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            className="stroke-white/60"
          />
        </svg>
      )}

      {/* 인식 상태 칩 (좌상단) */}
      <span
        className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors motion-reduce:transition-none ${
          isDone || faceDetected ? "bg-primary text-primary-foreground" : "bg-black/55 text-white/85"
        }`}
      >
        {isDone ? <CheckCircle2 className="h-3 w-3" /> : faceDetected ? <Check className="h-3 w-3" /> : <ScanFace className="h-3 w-3" />}
        {isDone ? "캘리브레이션 완료" : faceDetected ? "얼굴 인식됨" : engineReady ? "가이드에 얼굴을 맞춰 주세요" : "인식 준비 중..."}
      </span>

      {/* 진행 바 (하단) — 유지 시간이 차오르는 연출 */}
      {isRunning && (
        <div className="absolute inset-x-3 bottom-2 h-1.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear motion-reduce:transition-none"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      {/* 단계 안내 배지 (하단 중앙) */}
      {isRunning && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold text-white/90">
          {step === "front" ? "정면 유지" : step === "left" ? "왼쪽으로" : "오른쪽으로"} · {STEP_LABEL[step]} 단계
        </span>
      )}

      {/* 좌/우 화살표 — 목표 방향 점등 + 회전 시작 시 확대 반응 */}
      {isSide && (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-3">
          <ArrowLeft
            className={`h-7 w-7 transition-all motion-reduce:transition-none ${
              step === "left" ? "text-primary drop-shadow-[0_0_4px_rgba(130,184,76,0.9)]" : "text-white/25"
            } ${step === "left" && Math.abs(liveYawDev) > SIDE_YAW_TH / 2 ? "scale-125" : ""}`}
          />
          <ArrowRight
            className={`h-7 w-7 transition-all motion-reduce:transition-none ${
              step === "right" ? "text-primary drop-shadow-[0_0_4px_rgba(130,184,76,0.9)]" : "text-white/25"
            } ${step === "right" && Math.abs(liveYawDev) > SIDE_YAW_TH / 2 ? "scale-125" : ""}`}
          />
        </div>
      )}
    </div>
  );
}

/** 디바이스 체크 리스트에 들어가는 캘리브레이션 행 — 카메라/마이크 행과 같은 포맷. */
export function FaceCalibrationRow({ calib, cameraOn }: { calib: FaceCalibration; cameraOn: boolean }) {
  const { status, message, engineReady, sideStuck, start, skip, completeWithBaseline } = calib;
  const isRunning = status === "running";
  const isDone = status === "done";
  const isSkipped = status === "skipped";
  const isUnavailable = status === "unavailable";

  const Icon = isDone ? CheckCircle2 : isRunning ? Loader2 : isSkipped ? Check : isUnavailable ? AlertCircle : ScanFace;
  const iconTone = isDone ? "text-primary" : isRunning ? "text-primary" : "text-muted-foreground";

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${iconTone} ${isRunning ? "animate-spin motion-reduce:animate-none" : ""}`} />
        <span aria-live="polite" className={`truncate ${isDone ? "font-medium text-foreground" : "text-muted-foreground"}`}>
          {message}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isRunning && sideStuck && (
          <button
            type="button"
            onClick={completeWithBaseline}
            className="rounded-md border border-primary bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/20"
          >
            생략하고 완료
          </button>
        )}
        {!isRunning && !isDone && !isSkipped && cameraOn && (
          <button
            type="button"
            onClick={start}
            disabled={!engineReady}
            className="rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {engineReady ? "시작" : "준비 중..."}
          </button>
        )}
        {(isRunning || (!isDone && !isSkipped && cameraOn)) && (
          <button
            type="button"
            onClick={skip}
            className="rounded-md border border-border px-2 py-1 text-[11px] font-bold text-foreground transition-colors hover:bg-muted"
          >
            건너뛰기
          </button>
        )}
        {isSkipped && cameraOn && (
          <button
            type="button"
            onClick={start}
            className="rounded-md border border-border px-2 py-1 text-[11px] font-bold text-foreground transition-colors hover:bg-muted"
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}
