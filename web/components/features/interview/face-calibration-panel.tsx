"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, ScanFace } from "lucide-react";
import { useFaceCapture } from "@/hooks/interview/use-face-capture";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { calibrateBaseline } from "@/lib/interview/face/face-metrics";

export type FaceCalibrationStatus = "idle" | "running" | "done" | "skipped" | "unavailable";

interface FaceCalibrationPanelProps {
  /** 셋업에서 이미 켜둔 공유 카메라의 video 엘리먼트 — 이 스트림을 패널 미리보기에 공유(새 getUserMedia 없음). */
  videoEl: HTMLVideoElement | null;
  /** 공유 카메라가 켜져 미리보기가 살아있는지 여부 */
  cameraOn: boolean;
  /** 상태가 확정될 때마다 호출 — 부모의 시작 게이트(done|skipped|unavailable)에 사용 */
  onCalibrationChange?: (status: "done" | "skipped" | "unavailable") => void;
}

type Step = "front" | "left" | "right";
const STEP_LABEL: Record<Step, string> = { front: "정면", left: "좌측", right: "우측" };

// 느슨한 감지 파라미터 — 통과가 쉬워야 UX가 산다. (정밀도는 분석 단계가 아님)
const FRONT_HOLD_MS = 1200; // 정면 유지 시간(진행 바가 차오르는 시간)
const SIDE_HOLD_MS = 400; // 좌/우 회전 유지 시간
const SIDE_YAW_TH = 8; // 좌/우로 인정할 yaw 편차(도) — 8°면 살짝만 돌려도 잡힌다
const SIDE_TIMEOUT_MS = 12000; // 이 시간 동안 못 잡으면 "이 단계 생략" 안내(실패 아님)
const POLL_MS = 120; // 라이브 감지 주기

/**
 * 셋업 얼굴 캘리브레이션 — 인터랙티브:
 * - 카메라가 켜지면 즉시 MediaPipe를 프리로드하고 라이브 감지 시작 → 오벌이 라임으로 변하며 "얼굴 인식됨" 연출.
 * - 정면: 얼굴을 유지하면 진행 바가 차오르고, 다 차면 baseline 저장.
 * - 좌/우: 어느 방향이든 |yaw 편차| > 8° 회전을 감지 — 첫 회전의 부호를 기록하고 반대쪽은 반대 부호를 요구
 *   (미러 미리보기/MediaPipe 부호 규약 차이를 자동 흡수). 12초 내 미감지 시 "이 단계 생략하고 완료" 제공.
 * - 정면 baseline만 있으면 분석이 가능하므로 좌/우는 트래킹 확인용 — 생략해도 done.
 */
export function FaceCalibrationPanel({ videoEl, cameraOn, onCalibrationChange }: FaceCalibrationPanelProps) {
  const face = useFaceCapture();
  const setFaceBaseline = useInterviewSetupStore((s) => s.setFaceBaseline);

  const [status, setStatus] = useState<FaceCalibrationStatus>("idle");
  const [step, setStep] = useState<Step>("front");
  const [message, setMessage] = useState("카메라를 켜고 가이드 안에 얼굴을 맞춰 주세요.");
  const [faceDetected, setFaceDetected] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [progress, setProgress] = useState(0); // 0~1, 현재 단계 유지 진행도
  const [liveYawDev, setLiveYawDev] = useState(0); // 좌/우 단계 실시간 편차(연출용)
  const [sideStuck, setSideStuck] = useState(false); // 좌/우 장시간 미감지 → 생략 버튼 강조

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const onChangeRef = useRef(onCalibrationChange);
  onChangeRef.current = onCalibrationChange;
  const setBaselineRef = useRef(setFaceBaseline);
  setBaselineRef.current = setFaceBaseline;

  const pollRef = useRef<number | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const stepRef = useRef(step);
  stepRef.current = step;
  // 진행 상태(리렌더 없이 폴링 루프에서 사용)
  const holdStartRef = useRef<number | null>(null);
  const frontFramesRef = useRef<Array<{ gazeX: number; gazeY: number; yaw: number; pitch: number }>>([]);
  const yaw0Ref = useRef(0);
  const sideSignRef = useRef<number | null>(null); // 첫 측면 회전에서 기록한 부호
  const sideStartRef = useRef<number>(0);

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

  // 좌/우 확인을 생략하고 완료 — baseline은 이미 있으므로 분석 가능.
  const completeWithBaseline = useCallback(() => {
    finalize("done", "캘리브레이션 완료 — 기준값이 저장되었습니다.");
  }, [finalize]);

  const skip = useCallback(() => {
    setBaselineRef.current(null);
    finalize("skipped", "얼굴 분석을 건너뛰었습니다 — 음성 중심으로 진행됩니다.");
  }, [finalize]);

  // ── 라이브 감지 + 단계 진행 (단일 폴링 루프) ─────────────────────────────
  useEffect(() => {
    if (!cameraOn || !videoEl) return;
    let cancelled = false;

    // MediaPipe 프리로드: 시작 버튼을 누르기 전에 미리 초기화해 "첫 시도 실패"를 없앤다.
    void face
      .ensureLandmarker()
      .then(() => {
        if (!cancelled) setEngineReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setBaselineRef.current(null);
          finalize("unavailable", "얼굴 분석 엔진을 불러오지 못했습니다 — 음성으로 진행됩니다.");
        }
      });

    const tick = () => {
      const st = statusRef.current;
      if (st === "done" || st === "skipped" || st === "unavailable") return;
      const src = previewRef.current && previewRef.current.videoWidth > 0 ? previewRef.current : videoEl;
      if (!src || src.videoWidth === 0) return;

      const pose = face.readPose(src);
      setFaceDetected(!!pose);
      if (!pose) {
        holdStartRef.current = null;
        setProgress(0);
        return;
      }

      const now = performance.now();
      if (st === "running") {
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
            setMessage("이제 고개를 왼쪽으로 살짝 돌려 주세요.");
          }
        } else {
          // 좌/우: 부호 자동 감지 — left 는 아무 방향이나 8° 이상, right 는 그 반대 부호.
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
                setMessage("좋아요. 이번엔 반대쪽으로 돌려 주세요.");
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
      }
    };

    pollRef.current = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      stopPoll();
    };
  }, [cameraOn, videoEl, face, finalize, completeWithBaseline, stopPoll]);

  // 패널 자체 미러 미리보기 — 공유 스트림을 연결(가이드에 얼굴을 "맞출 수 있게").
  useEffect(() => {
    const pv = previewRef.current;
    if (!pv) return;
    if (cameraOn && videoEl?.srcObject) {
      if (pv.srcObject !== videoEl.srcObject) pv.srcObject = videoEl.srcObject;
      void pv.play().catch(() => undefined);
    } else {
      pv.srcObject = null;
    }
  }, [cameraOn, videoEl, videoEl?.srcObject]);

  const startCalibration = useCallback(() => {
    if (statusRef.current === "running") return;
    if (!cameraOn || !videoEl) {
      setBaselineRef.current(null);
      finalize("unavailable", "카메라가 꺼져 있어 얼굴 분석을 사용할 수 없습니다 — 음성으로 진행됩니다.");
      return;
    }
    frontFramesRef.current = [];
    holdStartRef.current = null;
    setProgress(0);
    setSideStuck(false);
    setStep("front");
    setStatus("running");
    setMessage("정면을 바라본 채 잠시 유지해 주세요 — 바가 차오르면 완료됩니다.");
  }, [cameraOn, videoEl, finalize]);

  // 카메라 꺼진 채 시작 전이면(음성 전용) 자동 unavailable — 게이트가 pending에 묶이지 않게.
  useEffect(() => {
    if (status === "idle" && !cameraOn) {
      setBaselineRef.current(null);
      finalize("unavailable", "카메라가 꺼져 있어 얼굴 분석을 사용할 수 없습니다 — 음성으로 진행됩니다.");
    }
  }, [cameraOn, status, finalize]);

  const isRunning = status === "running";
  const isDone = status === "done";
  const isUnavailable = status === "unavailable";
  const isSkipped = status === "skipped";
  const settled = isDone || isUnavailable || isSkipped;
  const isSide = isRunning && step !== "front";

  const StatusIcon = isDone ? CheckCircle2 : isUnavailable ? AlertCircle : isRunning ? Loader2 : isSkipped ? Check : ScanFace;
  const statusTone = isDone ? "text-primary" : isUnavailable ? "text-destructive" : "text-muted-foreground";
  const steps: Step[] = ["front", "left", "right"];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <ScanFace className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-bold text-foreground">얼굴 캘리브레이션 (선택)</h4>
        {cameraOn && !engineReady && !settled && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" /> 엔진 준비 중
          </span>
        )}
      </div>

      {/* 미러 미리보기 + 얼굴 가이드 + 라이브 인식 연출 */}
      <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black/90">
        <video
          ref={previewRef}
          muted
          playsInline
          autoPlay
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
        />
        {!cameraOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60 px-4 text-center text-[11px] text-muted-foreground">
            카메라를 켜면 얼굴 분석을 사용할 수 있어요 (선택)
          </div>
        )}

        {/* 가이드 오벌 — 인식되면 라임 실선으로 살아난다 */}
        <svg viewBox="0 0 160 90" className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
          <ellipse
            cx="80"
            cy="46"
            rx="27"
            ry="35"
            fill="none"
            strokeWidth={faceDetected ? 2.4 : 1.5}
            strokeDasharray={faceDetected ? "none" : "4 3"}
            className={`transition-all duration-200 motion-reduce:transition-none ${
              faceDetected ? "stroke-[#82B84C] drop-shadow-[0_0_6px_rgba(130,184,76,0.8)]" : "stroke-white/60"
            }`}
          />
        </svg>

        {/* 인식 상태 칩 (좌상단) */}
        {cameraOn && (
          <span
            className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors motion-reduce:transition-none ${
              faceDetected ? "bg-primary text-primary-foreground" : "bg-black/55 text-white/85"
            }`}
          >
            {faceDetected ? <Check className="h-3 w-3" /> : <ScanFace className="h-3 w-3" />}
            {faceDetected ? "얼굴 인식됨" : engineReady ? "가이드에 얼굴을 맞춰 주세요" : "인식 준비 중..."}
          </span>
        )}

        {/* 진행 바 (하단) — 유지 시간이 차오르는 연출 */}
        {isRunning && (
          <div className="absolute inset-x-3 bottom-2 h-1.5 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear motion-reduce:transition-none"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}

        {/* 좌/우 단계: 방향 화살표 + 실시간 반응 연출 */}
        {isSide && (
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-3" aria-hidden="true">
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

      {/* 3단계 인디케이터 */}
      <ol className="mb-3 flex items-center justify-center gap-2" aria-label="캘리브레이션 단계">
        {steps.map((s, i) => {
          const current = isRunning && i === stepIdx;
          const complete = isDone || (isRunning && i < stepIdx);
          return (
            <li key={s} className="flex items-center gap-2">
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
                {STEP_LABEL[s]}
              </span>
              {i < steps.length - 1 && <span className="h-px w-3 bg-border" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {/* 상태 줄 — 아이콘 + 텍스트 (WCAG 1.4.1) */}
      <p aria-live="polite" className={`mb-3 flex items-center justify-center gap-2 text-center text-xs ${statusTone}`}>
        <StatusIcon className={`h-4 w-4 shrink-0 ${isRunning ? "animate-spin motion-reduce:animate-none" : ""}`} />
        <span>{message}</span>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {!settled && !isRunning && (
          <button
            type="button"
            onClick={startCalibration}
            disabled={cameraOn && !engineReady}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 motion-reduce:transition-none"
          >
            <ScanFace className="h-3.5 w-3.5" />
            캘리브레이션 시작
          </button>
        )}
        {/* 좌/우가 오래 안 잡히면: 실패가 아니라 "생략하고 완료" (baseline 은 이미 확보) */}
        {isSide && sideStuck && (
          <button
            type="button"
            onClick={completeWithBaseline}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20 motion-reduce:transition-none"
          >
            <Check className="h-3.5 w-3.5" />
            이 단계 생략하고 완료
          </button>
        )}
        {(isUnavailable || isSkipped) && cameraOn && (
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setMessage("카메라를 켜고 가이드 안에 얼굴을 맞춰 주세요.");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted motion-reduce:transition-none"
          >
            <ScanFace className="h-3.5 w-3.5" />
            다시 시도
          </button>
        )}
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
