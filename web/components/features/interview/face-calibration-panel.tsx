"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Loader2, ScanFace } from "lucide-react";
import { useFaceCapture } from "@/hooks/interview/use-face-capture";
import { useInterviewSetupStore } from "@/store/interview-setup-store";

export type FaceCalibrationStatus = "idle" | "running" | "done" | "skipped" | "unavailable";

interface FaceCalibrationPanelProps {
  /** 셋업에서 이미 켜둔 공유 카메라의 video 엘리먼트. MediaPipe calibrate(video) 에 사용 — 새 getUserMedia 를 열지 않는다. */
  videoEl: HTMLVideoElement | null;
  /** 공유 카메라가 켜져 미리보기가 살아있는지 여부 */
  cameraOn: boolean;
  /** 상태가 확정될 때마다 호출 — 부모의 시작 게이트(done|skipped|unavailable)에 사용 */
  onCalibrationChange?: (status: "done" | "skipped" | "unavailable") => void;
}

type Pose = "front" | "left" | "right";
const POSES: Pose[] = ["front", "left", "right"];
const POSE_LABEL: Record<Pose, string> = { front: "정면", left: "좌측", right: "우측" };
const HOLD_MS = 500; // 좌/우 포즈 유지 확인 시간

/**
 * 셋업 단계 얼굴 캘리브레이션(정면 → 좌 → 우).
 * - 정면: useFaceCapture().calibrate(video) 로 시선/머리자세 기준값(baseline) 캡처 → 스토어에 저장.
 * - 좌/우: 트래킹 확인용 가이드 단계 — 포즈 유지 ~0.5s 후 자동 확정.
 * - 카메라 미지원/거부 OR baseline 미확보 → 자동 unavailable. 항상 건너뛰기 가능.
 * 실제 카메라 동작은 본 면접 진입 전 별도 검증(Task 8). 여기선 그레이스풀 디그레이드만 보장.
 */
export function FaceCalibrationPanel({ videoEl, cameraOn, onCalibrationChange }: FaceCalibrationPanelProps) {
  const face = useFaceCapture();
  const setFaceBaseline = useInterviewSetupStore((s) => s.setFaceBaseline);

  const [status, setStatus] = useState<FaceCalibrationStatus>("idle");
  const [poseIndex, setPoseIndex] = useState(0);
  const [message, setMessage] = useState("정면을 바라본 뒤 캘리브레이션을 시작하세요.");

  const onChangeRef = useRef(onCalibrationChange);
  onChangeRef.current = onCalibrationChange;
  const setBaselineRef = useRef(setFaceBaseline);
  setBaselineRef.current = setFaceBaseline;
  const holdTimerRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const finalize = useCallback((next: "done" | "skipped" | "unavailable") => {
    runningRef.current = false;
    clearHoldTimer();
    setStatus(next);
    onChangeRef.current?.(next);
  }, [clearHoldTimer]);

  const markUnavailable = useCallback((reason: string) => {
    setBaselineRef.current(null);
    setMessage(reason);
    finalize("unavailable");
  }, [finalize]);

  // 좌/우 트래킹 확인 단계 — 포즈 유지 ~0.5s 후 자동 확정.
  const runConfirmStep = useCallback((index: number) => {
    const pose = POSES[index];
    setMessage(`${POSE_LABEL[pose]}을(를) 바라봐 주세요 — 잠시 유지하면 자동으로 넘어갑니다.`);
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      if (!runningRef.current) return;
      const nextIndex = index + 1;
      if (nextIndex >= POSES.length) {
        setMessage("캘리브레이션 완료 — 시선·머리자세 기준이 저장되었습니다.");
        finalize("done");
        return;
      }
      setPoseIndex(nextIndex);
      runConfirmStep(nextIndex);
    }, HOLD_MS);
  }, [clearHoldTimer, finalize]);

  const startCalibration = useCallback(async () => {
    if (runningRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      markUnavailable("이 브라우저는 얼굴 분석을 지원하지 않습니다 — 음성으로 진행됩니다.");
      return;
    }
    if (!cameraOn || !videoEl) {
      markUnavailable("카메라가 꺼져 있어 얼굴 분석을 사용할 수 없습니다 — 음성으로 진행됩니다.");
      return;
    }

    runningRef.current = true;
    setStatus("running");
    setPoseIndex(0);
    setMessage("정면을 바라본 채로 잠시 기다려 주세요 — 기준값을 측정 중입니다.");

    let ok = false;
    try {
      ok = await face.calibrate(videoEl);
    } catch {
      ok = false;
    }
    if (!runningRef.current) return; // 도중 건너뛰기/언마운트
    if (!ok) {
      markUnavailable("얼굴을 인식하지 못했습니다 — 음성으로 진행됩니다. 필요하면 다시 시도하세요.");
      return;
    }

    setBaselineRef.current(face.getBaseline());
    // 정면(index 0) 확인 → 좌(1)부터 트래킹 확인 단계 진행.
    setPoseIndex(1);
    runConfirmStep(1);
  }, [cameraOn, face, markUnavailable, runConfirmStep, videoEl]);

  const skip = useCallback(() => {
    setBaselineRef.current(null);
    setMessage("얼굴 분석을 건너뛰었습니다 — 음성으로 진행됩니다.");
    finalize("skipped");
  }, [finalize]);

  // 언마운트 시 진행 중 루프/타이머 정리
  useEffect(() => {
    return () => {
      runningRef.current = false;
      clearHoldTimer();
    };
  }, [clearHoldTimer]);

  const isRunning = status === "running";
  const isDone = status === "done";
  const isUnavailable = status === "unavailable";
  const isSkipped = status === "skipped";
  const settled = isDone || isUnavailable || isSkipped;

  // aria-live 상태 줄 아이콘 — 색상만으로 구분하지 않도록 항상 아이콘+텍스트 동반.
  const StatusIcon = isDone
    ? CheckCircle2
    : isUnavailable
      ? AlertCircle
      : isRunning
        ? Loader2
        : isSkipped
          ? Check
          : ScanFace;
  const statusTone = isDone
    ? "text-primary"
    : isUnavailable
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <ScanFace className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-bold text-foreground">얼굴 캘리브레이션 (선택)</h4>
      </div>

      {/* 카메라 미리보기 위 SVG 얼굴 가이드 오버레이 */}
      <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted/40">
        {cameraOn && videoEl ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-medium text-muted-foreground">
            가이드 안에 얼굴을 맞춰 주세요
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-[11px] text-muted-foreground">
            카메라를 켜면 얼굴 분석을 사용할 수 있어요 (선택)
          </div>
        )}
        <svg
          viewBox="0 0 160 90"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid meet"
        >
          <ellipse
            cx="80"
            cy="45"
            rx="26"
            ry="34"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className={`transition-colors motion-reduce:transition-none ${isDone ? "text-primary" : isUnavailable ? "text-destructive/70" : "text-primary/60"}`}
          />
        </svg>
      </div>

      {/* 3단계 인디케이터 (정면/좌/우) — 텍스트 라벨 + 아이콘으로 상태 표시 */}
      <ol className="mb-3 flex items-center justify-center gap-2" aria-label="캘리브레이션 단계">
        {POSES.map((pose, i) => {
          const current = isRunning && i === poseIndex;
          const complete = isDone || (isRunning && i < poseIndex);
          return (
            <li key={pose} className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors motion-reduce:transition-none ${
                  complete
                    ? "border-primary bg-primary/10 text-primary"
                    : current
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                }`}
              >
                {complete ? <Check className="h-3 w-3" /> : current ? <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" /> : null}
                {POSE_LABEL[pose]}
              </span>
              {i < POSES.length - 1 && <span className="h-px w-3 bg-border" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {/* 상태 줄 — 아이콘 + 텍스트 (색상 단독 의존 금지, WCAG 1.4.1) */}
      <p aria-live="polite" className={`mb-3 flex items-center justify-center gap-2 text-center text-xs ${statusTone}`}>
        <StatusIcon className={`h-4 w-4 shrink-0 ${isRunning ? "animate-spin motion-reduce:animate-none" : ""}`} />
        <span>{message}</span>
      </p>

      <div className="flex items-center justify-center gap-2">
        {!settled && (
          <button
            type="button"
            onClick={() => void startCalibration()}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 motion-reduce:transition-none"
          >
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <ScanFace className="h-3.5 w-3.5" />}
            {isRunning ? "측정 중..." : "캘리브레이션 시작"}
          </button>
        )}
        {(isUnavailable || isSkipped) && (
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setMessage("정면을 바라본 뒤 캘리브레이션을 시작하세요.");
              void startCalibration();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted motion-reduce:transition-none"
          >
            <ScanFace className="h-3.5 w-3.5" />
            다시 시도
          </button>
        )}
        {/* 건너뛰기는 항상 노출 (확정 전) */}
        {!settled && (
          <button
            type="button"
            onClick={skip}
            className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted motion-reduce:transition-none"
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
