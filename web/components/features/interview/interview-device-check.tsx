"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CameraOff, CheckCircle2, Loader2 } from "lucide-react";
import {
  FaceCalibrationRow,
  FaceGuideOverlay,
  useFaceCalibration,
} from "@/components/features/interview/face-calibration-panel";

type MicStatus = "checking" | "ready" | "denied";
type CameraStatus = "off" | "starting" | "on" | "error";

interface InterviewDeviceCheckProps {
  /** 마이크 사용 가능(권한 허용) 여부가 바뀔 때 호출 — 부모의 '시작' 버튼 활성화에 사용 */
  onMicReady?: (ready: boolean) => void;
  /** 카메라 토글 상태가 바뀔 때 호출 — 본 면접 화면의 카메라 초기 상태로 이어진다 */
  onCameraPreferenceChange?: (on: boolean) => void;
  /** 얼굴 캘리브레이션 결과가 확정될 때 호출 — 부모의 '시작' 게이트에 사용 (done|skipped|unavailable) */
  onCalibrationChange?: (status: "done" | "skipped" | "unavailable") => void;
}

/**
 * 면접 시작 전 풀스크린 준비 페이지에서 쓰는 최소 기기 점검 위젯.
 * - 마이크 입력 레벨 미터(필수) — 마운트 시 자동 점검
 * - 카메라는 기본 꺼짐(선택) — 사용자가 켜기 버튼으로 미리보기 테스트 가능
 * - 언마운트 시 모든 트랙을 정리해 실제 면접 파이프라인이 깨끗하게 장치를 잡도록 함
 */
export function InterviewDeviceCheck({ onMicReady, onCameraPreferenceChange, onCalibrationChange }: InterviewDeviceCheckProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // 캘리브레이션 패널은 공유 카메라의 <video> 엘리먼트가 필요하다. 콜백 ref 로 마운트 시점에
  // state 로 끌어올려 패널이 calibrate(video) 에 그대로 사용하게 한다(새 getUserMedia 안 엶).
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const setVideoNode = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoEl(node);
  }, []);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const onMicReadyRef = useRef(onMicReady);
  onMicReadyRef.current = onMicReady;
  const onCameraPreferenceChangeRef = useRef(onCameraPreferenceChange);
  onCameraPreferenceChangeRef.current = onCameraPreferenceChange;

  const [micStatus, setMicStatus] = useState<MicStatus>("checking");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("off");
  const [cameraError, setCameraError] = useState("");
  const [level, setLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // ── 마이크: 마운트 시 자동 점검 ──
  useEffect(() => {
    let cancelled = false;

    const stopMicSide = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => undefined);
        audioCtxRef.current = null;
      }
    };

    const startLevelMeter = (stream: MediaStream) => {
      if (stream.getAudioTracks().length === 0) return;
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctor();
        audioCtxRef.current = ctx;
        // autoplay 정책상 사용자 제스처 전엔 suspended로 시작할 수 있어 레벨미터가
        // 멈춘다 → resume()으로 분석 컨텍스트를 깨운다(소리 출력은 없음).
        if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          if (!cancelled) setLevel(Math.min(1, rms * 3.2));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // 레벨 미터는 옵션 — 실패해도 점검 자체는 계속
      }
    };

    const run = async () => {
      setMicStatus("checking");
      if (!navigator?.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setMicStatus("denied");
          onMicReadyRef.current?.(false);
        }
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        micStreamRef.current = s;
        startLevelMeter(s);
        setMicStatus("ready");
        onMicReadyRef.current?.(true);
      } catch {
        if (!cancelled) {
          setMicStatus("denied");
          onMicReadyRef.current?.(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopMicSide();
    };
  }, [attempt]);

  // ── 카메라: 기본 꺼짐, 토글로 미리보기 테스트 ──
  const stopCamera = () => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const turnCameraOn = async () => {
    if (cameraStatus === "starting" || cameraStatus === "on") return;
    setCameraStatus("starting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      camStreamRef.current = s;
      setCameraStatus("on");
      onCameraPreferenceChangeRef.current?.(true);
      // setState 후 video 엘리먼트가 그려진 다음 srcObject 연결
      requestAnimationFrame(() => {
        if (videoRef.current && camStreamRef.current) {
          videoRef.current.srcObject = camStreamRef.current;
          void videoRef.current.play().catch(() => undefined);
        }
      });
    } catch {
      stopCamera();
      setCameraStatus("error");
      onCameraPreferenceChangeRef.current?.(false);
    }
  };

  const turnCameraOff = () => {
    stopCamera();
    setCameraStatus("off");
    onCameraPreferenceChangeRef.current?.(false);
  };

  // 언마운트 시 카메라 트랙 정리
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const micOk = micStatus === "ready";
  const cameraOn = cameraStatus === "on";

  // 얼굴 캘리브레이션 — 같은 박스에 통합: 오버레이는 미리보기 위, 상태는 체크리스트 행.
  const calib = useFaceCalibration(videoEl, cameraOn, onCalibrationChange);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* 카메라 미리보기 (기본 꺼짐) */}
      <div className="relative flex aspect-video w-full items-center justify-center bg-muted/50">
        {cameraOn ? (
          <video ref={setVideoNode} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            {cameraStatus === "starting" ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin" />
                <p className="text-xs">카메라 켜는 중...</p>
              </>
            ) : (
              <>
                <CameraOff className="h-7 w-7" />
                <p className="text-xs">
                  {cameraStatus === "error"
                    ? "카메라를 사용할 수 없습니다 — 권한과 연결을 확인해 주세요"
                    : "카메라가 꺼져 있습니다 (면접은 음성으로 진행돼요)"}
                </p>
                <button
                  type="button"
                  onClick={() => void turnCameraOn()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {cameraStatus === "error" ? "카메라 다시 시도" : "카메라 켜고 테스트"}
                </button>
              </>
            )}
          </div>
        )}
        {/* 얼굴 가이드 오버레이 — 미리보기 위에서 메시·눈동자 마스킹 + 진행 연출 */}
        {cameraOn && <FaceGuideOverlay calib={calib} videoEl={videoEl} />}
        {cameraOn && (
          <button
            type="button"
            onClick={turnCameraOff}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-bold text-foreground backdrop-blur transition-colors hover:bg-muted"
          >
            <CameraOff className="h-3.5 w-3.5" />
            카메라 끄기
          </button>
        )}
      </div>

      {/* 상태 + 마이크 레벨 */}
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            {cameraOn ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <CameraOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={cameraOn ? "font-medium text-foreground" : "text-muted-foreground"}>
              카메라 {cameraOn ? "정상" : "꺼짐 (선택 사항)"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => (cameraOn ? turnCameraOff() : void turnCameraOn())}
            disabled={cameraStatus === "starting"}
            className="rounded-md border border-border px-2 py-1 text-[11px] font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {cameraOn ? "끄기" : cameraStatus === "starting" ? "켜는 중..." : "켜기"}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {micOk ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : micStatus === "checking" ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <span className={micOk ? "font-medium text-foreground" : "text-muted-foreground"}>
              {micOk
                ? "마이크 인식됨 — 말해보세요"
                : micStatus === "checking"
                  ? "마이크 확인 중..."
                  : "마이크 권한이 필요합니다"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-75"
              style={{ width: micOk ? `${Math.max(4, Math.round(level * 100))}%` : "0%" }}
            />
          </div>
        </div>

        {/* 얼굴 캘리브레이션 — 카메라/마이크와 같은 체크리스트 행 */}
        <FaceCalibrationRow calib={calib} cameraOn={cameraOn} />

        {micStatus === "denied" && (
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="w-full rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            권한 다시 요청 · 다시 확인
          </button>
        )}
      </div>
    </div>
  );
}
