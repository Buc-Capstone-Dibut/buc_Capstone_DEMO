"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CheckCircle2, Eye, Loader2, ScanFace } from "lucide-react";
import { useFaceCapture, type FaceConnections } from "@/hooks/interview/use-face-capture";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { calibrateBaseline } from "@/lib/interview/face/face-metrics";

type Landmark = { x: number; y: number };

export type FaceCalibrationStatus = "idle" | "running" | "done" | "skipped" | "unavailable";

type Step = "front" | "left" | "right" | "up" | "down" | "eyes";
const STEP_ORDER: Step[] = ["front", "left", "right", "up", "down", "eyes"];
const STEP_LABEL: Record<Step, string> = { front: "정면", left: "좌측", right: "우측", up: "위", down: "아래", eyes: "눈동자" };
const STEP_GUIDE: Record<Step, string> = {
  front: "정면을 바라본 채 잠시 유지해 주세요",
  left: "고개를 왼쪽으로 살짝 돌려 주세요",
  right: "이번엔 오른쪽으로 돌려 주세요",
  up: "고개를 살짝 위로 들어 주세요",
  down: "이번엔 살짝 아래로 숙여 주세요",
  eyes: "고개는 고정하고, 눈동자만 좌우로 움직여 주세요",
};

// 느슨한 감지 파라미터 — 통과가 쉬워야 UX가 산다.
const FRONT_HOLD_MS = 1200; // 정면 유지 시간(진행 바가 차오르는 시간)
const SIDE_HOLD_MS = 400; // 각 확인 스텝 유지 시간
const SIDE_YAW_TH = 8; // 좌/우로 인정할 yaw 편차(도)
const PITCH_TH = 7; // 위/아래로 인정할 pitch 편차(도)
const EYE_TH = 0.22; // 눈동자(시선 x) 편차 임계 — 고개 고정, 눈만 움직여도 넘는 값
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
  /** 최신 머리각/시선(rAF 리드아웃용, 미인식 시 null) */
  poseRef: MutableRefObject<{ yaw: number; pitch: number; gazeX: number; gazeY: number } | null>;
  /** 정면 캘리브레이션 기준값들 — 좌우(yaw)/상하(pitch)/눈동자(gazeX) 게이지 계산용 */
  baselineYaw: number;
  baselinePitch: number;
  baselineGazeX: number;
  /** MediaPipe 정적 연결선(테셀레이션/윤곽) — 엔진 로드 후 채워짐 */
  connections: FaceConnections | null;
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
  const [baselineYaw, setBaselineYaw] = useState(0);
  const [baselinePitch, setBaselinePitch] = useState(0);
  const [baselineGazeX, setBaselineGazeX] = useState(0);
  const [connections, setConnections] = useState<FaceConnections | null>(null);

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
  const pitch0Ref = useRef(0);
  const gazeX0Ref = useRef(0);
  const sideSignRef = useRef<number | null>(null);
  const vertSignRef = useRef<number | null>(null);
  const sideStartRef = useRef<number>(0);
  const landmarksRef = useRef<Landmark[] | null>(null);
  const poseRef = useRef<{ yaw: number; pitch: number; gazeX: number; gazeY: number } | null>(null);

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
      // 확정 후 잔여 마스킹이 화면에 남지 않도록 최신 프레임 데이터를 비운다.
      landmarksRef.current = null;
      poseRef.current = null;
      setFaceDetected(false);
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
        if (!cancelled) {
          setEngineReady(true);
          setConnections(face.getConnections());
        }
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
      poseRef.current = pose ? { yaw: pose.yaw, pitch: pose.pitch, gazeX: pose.gazeX, gazeY: pose.gazeY } : null;
      setFaceDetected(!!pose);
      if (!pose) {
        holdStartRef.current = null;
        setProgress(0);
        return;
      }

      const now = performance.now();
      if (st !== "running") return;

      const cur = stepRef.current;
      // 다음 스텝으로 전환(공통): 타이머/스턱 리셋 + 가이드 메시지.
      const advance = () => {
        holdStartRef.current = null;
        setProgress(0);
        const idx = STEP_ORDER.indexOf(cur);
        const next = STEP_ORDER[idx + 1];
        if (!next) {
          completeWithBaseline();
          return;
        }
        sideStartRef.current = now;
        setSideStuck(false);
        setStep(next);
        setMessage(STEP_GUIDE[next]);
      };

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
          pitch0Ref.current = base.pitch0;
          gazeX0Ref.current = base.gazeX0;
          setBaselineYaw(base.yaw0);
          setBaselinePitch(base.pitch0);
          setBaselineGazeX(base.gazeX0);
          sideSignRef.current = null;
          vertSignRef.current = null;
          advance();
        }
      } else {
        // 확인 스텝별 편차/임계/부호 페어링:
        // 좌·우=yaw, 위·아래=pitch(각각 첫 방향 부호 기록→반대쪽은 반대 부호), 눈동자=gazeX(방향 무관).
        let dev = 0;
        let th = SIDE_YAW_TH;
        let passes = false;
        if (cur === "left" || cur === "right") {
          dev = pose.yaw - yaw0Ref.current;
          th = SIDE_YAW_TH;
          const need = cur === "left" ? null : sideSignRef.current == null ? null : -sideSignRef.current;
          passes = Math.abs(dev) > th && (need == null || Math.sign(dev) === need);
        } else if (cur === "up" || cur === "down") {
          dev = pose.pitch - pitch0Ref.current;
          th = PITCH_TH;
          const need = cur === "up" ? null : vertSignRef.current == null ? null : -vertSignRef.current;
          passes = Math.abs(dev) > th && (need == null || Math.sign(dev) === need);
        } else {
          dev = pose.gazeX - gazeX0Ref.current;
          th = EYE_TH;
          passes = Math.abs(dev) > th;
        }
        setLiveYawDev(dev);

        if (passes) {
          if (holdStartRef.current == null) holdStartRef.current = now;
          const held = now - holdStartRef.current;
          setProgress(Math.min(held / SIDE_HOLD_MS, 1));
          if (held >= SIDE_HOLD_MS) {
            if (cur === "left") sideSignRef.current = Math.sign(dev);
            if (cur === "up") vertSignRef.current = Math.sign(dev);
            advance();
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
    setMessage(STEP_GUIDE.front);
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

  return { status, step, message, faceDetected, engineReady, progress, liveYawDev, sideStuck, landmarksRef, poseRef, baselineYaw, baselinePitch, baselineGazeX, connections, start, skip, completeWithBaseline };
}

// ── 영화식 스캔 렌더러 ─────────────────────────────────────────────────────
// 미러(-scale-x-100) + object-cover 매핑으로 정규화 랜드마크 → 표시 좌표.
// 레이어: 테셀레이션 와이어프레임 → 윤곽 글로우 → 정점 → 타겟 브래킷 → 스캔라인
//        → 동공 락온(회전 조준링·십자선·시선 벡터) → 수치 리드아웃 → 좌/우 yaw 게이지.
interface CineOpts {
  connections: FaceConnections | null;
  pose: { yaw: number; pitch: number; gazeX: number; gazeY: number } | null;
  timeMs: number;
  step: Step;
  isRunning: boolean;
  baselineYaw: number;
  baselinePitch: number;
  baselineGazeX: number;
  reducedMotion: boolean;
}

const LIME = "130,184,76";

function drawFaceMask(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  vw: number,
  vh: number,
  cssW: number,
  cssH: number,
  o: CineOpts,
) {
  const s = Math.max(cssW / vw, cssH / vh); // object-cover
  const dx = (cssW - vw * s) / 2;
  const dy = (cssH - vh * s) / 2;
  const X = (lm: Landmark) => cssW - (dx + lm.x * vw * s); // 미러 반전
  const Y = (lm: Landmark) => dy + lm.y * vh * s;
  const t = o.reducedMotion ? 0 : o.timeMs;

  // 얼굴 바운딩 박스(메시 468점 기준)
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
  const pad = 10;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const bw = maxX - minX, bh = maxY - minY;

  const strokeConnections = (list: Array<{ start: number; end: number }>, style: string, width: number) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const c of list) {
      const a = landmarks[c.start], b = landmarks[c.end];
      if (!a || !b) continue;
      ctx.moveTo(X(a), Y(a));
      ctx.lineTo(X(b), Y(b));
    }
    ctx.stroke();
  };

  // 1) 테셀레이션 와이어프레임 — "찐한" 스캔 메시
  if (o.connections?.tesselation?.length) {
    strokeConnections(o.connections.tesselation, `rgba(${LIME},0.22)`, 0.55);
  }

  // 2) 주요 윤곽(얼굴 오벌·눈·눈썹·입술) — 중요 라인은 확실히 찐하게 + 글로우
  if (o.connections) {
    ctx.save();
    ctx.shadowColor = `rgba(${LIME},1)`;
    ctx.shadowBlur = 10;
    strokeConnections(o.connections.faceOval, `rgba(${LIME},1)`, 2.4);
    ctx.shadowBlur = 5;
    const soft = `rgba(210,255,170,0.95)`;
    strokeConnections(o.connections.leftEye, soft, 1.6);
    strokeConnections(o.connections.rightEye, soft, 1.6);
    strokeConnections(o.connections.leftEyebrow, `rgba(${LIME},0.85)`, 1.3);
    strokeConnections(o.connections.rightEyebrow, `rgba(${LIME},0.85)`, 1.3);
    strokeConnections(o.connections.lips, `rgba(${LIME},0.85)`, 1.3);
    ctx.restore();
  }

  // 3) 정점 점묘 — 전 정점, 더 또렷하게
  ctx.fillStyle = `rgba(${LIME},0.6)`;
  for (let i = 0; i < meshCount; i++) {
    const lm = landmarks[i];
    ctx.fillRect(X(lm) - 0.8, Y(lm) - 0.8, 1.6, 1.6);
  }

  // 4) 타겟 브래킷(모서리 락온) — 미세 호흡
  const breathe = o.reducedMotion ? 0 : Math.sin(t / 500) * 2;
  const L = 16;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1.6;
  const bx0 = minX - breathe, by0 = minY - breathe, bx1 = maxX + breathe, by1 = maxY + breathe;
  ctx.beginPath();
  ctx.moveTo(bx0, by0 + L); ctx.lineTo(bx0, by0); ctx.lineTo(bx0 + L, by0);
  ctx.moveTo(bx1 - L, by0); ctx.lineTo(bx1, by0); ctx.lineTo(bx1, by0 + L);
  ctx.moveTo(bx1, by1 - L); ctx.lineTo(bx1, by1); ctx.lineTo(bx1 - L, by1);
  ctx.moveTo(bx0 + L, by1); ctx.lineTo(bx0, by1); ctx.lineTo(bx0, by1 - L);
  ctx.stroke();

  // 5) 스캔라인 스윕(위→아래 반복) — 그라데이션 밴드
  if (!o.reducedMotion && bh > 0) {
    const phase = (t % 1700) / 1700;
    const sy = minY + phase * bh;
    const bandH = 20;
    const grad = ctx.createLinearGradient(0, sy - bandH, 0, sy + 2);
    grad.addColorStop(0, `rgba(${LIME},0)`);
    grad.addColorStop(0.85, `rgba(${LIME},0.28)`);
    grad.addColorStop(1, `rgba(${LIME},0.55)`);
    ctx.save();
    ctx.beginPath();
    ctx.rect(minX, minY, bw, bh);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(minX, sy - bandH, bw, bandH + 2);
    ctx.strokeStyle = `rgba(${LIME},0.85)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(minX, sy);
    ctx.lineTo(maxX, sy);
    ctx.stroke();
    ctx.restore();
  }

  // 6) 동공 락온 — 실측 홍채(468~477): 중심 도트 + 십자선 + 이중 링(외곽 대시 회전) + 시선 벡터
  if (landmarks.length >= 478) {
    const centers: Array<[number, number]> = [];
    for (const c of [468, 473]) {
      const cx = X(landmarks[c]);
      const cy = Y(landmarks[c]);
      centers.push([cx, cy]);

      // 십자선
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const [ddx, ddy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        ctx.moveTo(cx + ddx * 4, cy + ddy * 4);
        ctx.lineTo(cx + ddx * 9, cy + ddy * 9);
      }
      ctx.stroke();

      // 내부 링 + 중심 도트
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(${LIME},1)`;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
      ctx.fill();

      // 외곽 대시 링(회전) — 락온 연출
      ctx.save();
      ctx.strokeStyle = `rgba(${LIME},0.95)`;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = o.reducedMotion ? 0 : -t / 24;
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 시선 마이크로 벡터(blendshape gaze — 미러라 x 반전)
      if (o.pose) {
        const gx = -o.pose.gazeX, gy = -o.pose.gazeY;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + gx * 16, cy + gy * 16);
        ctx.stroke();
      }
    }
    // 동공 연결선 + IRIS LOCK 라벨
    if (centers.length === 2) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(centers[0][0], centers[0][1]);
      ctx.lineTo(centers[1][0], centers[1][1]);
      ctx.stroke();
      ctx.restore();
      const midX = (centers[0][0] + centers[1][0]) / 2;
      const topEyeY = Math.min(centers[0][1], centers[1][1]);
      ctx.font = "600 9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(${LIME},0.95)`;
      ctx.fillText("IRIS LOCK", midX, topEyeY - 16);
    }
  }

  // 7) 수치 리드아웃 — 실측 yaw/pitch/시선 (전문 장비 느낌, 모노스페이스)
  ctx.font = "600 9px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText("FACE TRACK · 478 pts", bx0 + 2, by0 - 6);
  if (o.pose) {
    const yawTxt = `YAW ${o.pose.yaw >= 0 ? "+" : ""}${o.pose.yaw.toFixed(1)}°`;
    const pitTxt = `PIT ${o.pose.pitch >= 0 ? "+" : ""}${o.pose.pitch.toFixed(1)}°`;
    ctx.textAlign = "right";
    ctx.fillStyle = `rgba(${LIME},0.95)`;
    ctx.fillText(`${yawTxt}  ${pitTxt}`, bx1 - 2, by0 - 6);
  }

  // 8) 확인 스텝 게이지 — 좌우(yaw)/상하(pitch)/눈동자(gazeX) 편차 니들 + 목표존
  if (o.isRunning && o.step !== "front" && o.pose) {
    const isVert = o.step === "up" || o.step === "down";
    const isEyes = o.step === "eyes";
    const dev = isEyes
      ? o.pose.gazeX - o.baselineGazeX
      : isVert
        ? o.pose.pitch - o.baselinePitch
        : o.pose.yaw - o.baselineYaw;
    const range = isEyes ? 0.5 : 25; // 니들 스케일
    const th = isEyes ? EYE_TH : isVert ? PITCH_TH : SIDE_YAW_TH;
    const dirEn: Record<string, string> = { left: "LEFT", right: "RIGHT", up: "UP", down: "DOWN" };
    const label = isEyes
      ? `EYES ${dev >= 0 ? "+" : ""}${dev.toFixed(2)}`
      : `${isVert ? "TILT" : "TURN"} ${dirEn[o.step]} ${dev >= 0 ? "+" : ""}${dev.toFixed(1)}°`;

    const gw = Math.min(150, bw);
    const gx0 = minX + (bw - gw) / 2;
    const gy = maxY + 16;
    const half = gw / 2;
    const clamp = Math.max(-range, Math.min(range, dev));
    const needleX = gx0 + half + (clamp / range) * half;
    const thPx = (th / range) * half;

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(gx0, gy);
    ctx.lineTo(gx0 + gw, gy);
    ctx.stroke();
    // 목표존(|dev|>th) 양측 표시
    ctx.strokeStyle = `rgba(${LIME},0.9)`;
    ctx.beginPath();
    ctx.moveTo(gx0, gy);
    ctx.lineTo(gx0 + half - thPx, gy);
    ctx.moveTo(gx0 + half + thPx, gy);
    ctx.lineTo(gx0 + gw, gy);
    ctx.stroke();
    // 중앙 기준 틱 + 니들
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx0 + half, gy - 5);
    ctx.lineTo(gx0 + half, gy + 5);
    ctx.stroke();
    ctx.fillStyle = Math.abs(dev) > th ? `rgba(${LIME},1)` : "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(needleX, gy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "600 9px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(label, gx0 + half, gy + 16);
  }
}

/** 카메라 미리보기 위에 얹는 오버레이 — 얼굴 메시·눈동자 마스킹 + 가이드 오벌 + 인식 칩 + 진행 바 + 좌/우 화살표. */
export function FaceGuideOverlay({ calib, videoEl }: { calib: FaceCalibration; videoEl: HTMLVideoElement | null }) {
  const { status, step, faceDetected, engineReady, progress, liveYawDev, landmarksRef, poseRef, baselineYaw, baselinePitch, baselineGazeX, connections } = calib;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const settled = status === "skipped" || status === "unavailable";
  // 최신 값을 rAF 루프에서 리렌더 없이 읽기 위한 미러 refs
  const stepRef = useRef(step);
  stepRef.current = step;
  const statusMirrorRef = useRef(status);
  statusMirrorRef.current = status;
  const runningRef = useRef(status === "running");
  runningRef.current = status === "running";
  const baselineYawRef = useRef(baselineYaw);
  baselineYawRef.current = baselineYaw;
  const baselinePitchRef = useRef(baselinePitch);
  baselinePitchRef.current = baselinePitch;
  const baselineGazeXRef = useRef(baselineGazeX);
  baselineGazeXRef.current = baselineGazeX;
  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;

  // 랜드마크 마스킹 rAF 드로잉 — refs를 직접 읽어 리렌더 없이 부드럽게(60fps 연출, 15fps 데이터).
  useEffect(() => {
    if (settled) return;
    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
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
          // 완료(done) 후에는 잔여 마스킹을 그리지 않는다 — 캔버스는 비운 상태 유지.
          if (statusMirrorRef.current !== "done" && lms && v && v.videoWidth > 0 && cssW > 0) {
            drawFaceMask(ctx, lms, v.videoWidth, v.videoHeight, cssW, cssH, {
              connections: connectionsRef.current,
              pose: poseRef.current,
              timeMs: performance.now(),
              step: stepRef.current,
              isRunning: runningRef.current,
              baselineYaw: baselineYawRef.current,
              baselinePitch: baselinePitchRef.current,
              baselineGazeX: baselineGazeXRef.current,
              reducedMotion,
            });
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
  }, [settled, videoEl, landmarksRef, poseRef]);

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

      {/* 단계 인디케이터 (상단 중앙) — 6단계 미니 트랙 */}
      {isRunning && (
        <ol className="absolute left-1/2 top-2 flex -translate-x-1/2 items-center gap-1" aria-hidden="true">
          {STEP_ORDER.map((s) => {
            const idx = STEP_ORDER.indexOf(s);
            const curIdx = STEP_ORDER.indexOf(step);
            const done = idx < curIdx;
            const cur = idx === curIdx;
            return (
              <li
                key={s}
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none transition-colors motion-reduce:transition-none ${
                  done ? "bg-primary/80 text-primary-foreground" : cur ? "bg-white/90 text-black" : "bg-black/45 text-white/60"
                }`}
              >
                {STEP_LABEL[s]}
              </li>
            );
          })}
        </ol>
      )}

      {/* 단계 안내 배지 (하단 중앙) — 자세 가이드 문구 */}
      {isRunning && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white/95">
          {STEP_GUIDE[step]}
        </span>
      )}

      {/* 방향 가이드 — 좌/우(가로 화살표), 상/하(세로 화살표), 눈동자(Eye 아이콘) */}
      {isSide && (step === "left" || step === "right") && (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-3">
          <ArrowLeft
            className={`h-8 w-8 transition-all motion-reduce:transition-none ${
              step === "left" ? "text-primary drop-shadow-[0_0_6px_rgba(130,184,76,1)]" : "text-white/20"
            } ${step === "left" && Math.abs(liveYawDev) > SIDE_YAW_TH / 2 ? "scale-125" : ""}`}
          />
          <ArrowRight
            className={`h-8 w-8 transition-all motion-reduce:transition-none ${
              step === "right" ? "text-primary drop-shadow-[0_0_6px_rgba(130,184,76,1)]" : "text-white/20"
            } ${step === "right" && Math.abs(liveYawDev) > SIDE_YAW_TH / 2 ? "scale-125" : ""}`}
          />
        </div>
      )}
      {isSide && (step === "up" || step === "down") && (
        <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col items-center justify-between py-8">
          <ArrowUp
            className={`h-8 w-8 transition-all motion-reduce:transition-none ${
              step === "up" ? "text-primary drop-shadow-[0_0_6px_rgba(130,184,76,1)]" : "text-white/20"
            } ${step === "up" && Math.abs(liveYawDev) > PITCH_TH / 2 ? "scale-125" : ""}`}
          />
          <ArrowDown
            className={`h-8 w-8 transition-all motion-reduce:transition-none ${
              step === "down" ? "text-primary drop-shadow-[0_0_6px_rgba(130,184,76,1)]" : "text-white/20"
            } ${step === "down" && Math.abs(liveYawDev) > PITCH_TH / 2 ? "scale-125" : ""}`}
          />
        </div>
      )}
      {isSide && step === "eyes" && (
        <span className="absolute left-1/2 top-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
          <Eye className="h-3.5 w-3.5" />
          고개 고정 · 눈동자만 좌우로
        </span>
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
