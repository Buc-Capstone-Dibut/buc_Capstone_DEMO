"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Captions, Clock3, Loader2, Mic, MicOff, PhoneOff } from "lucide-react";
import { LocalCameraPreview } from "@/components/features/interview/local-camera-preview";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { useOpenLLM } from "@/hooks/use-open-llm";

interface TranscriptItem {
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

interface RuntimeMeta {
  targetDurationSec: number;
  closingThresholdSec: number;
  elapsedSec: number;
  remainingSec: number;
  timeProgressPercent: number;
  estimatedTotalQuestions: number;
  questionCount: number;
  isClosingPhase: boolean;
  interviewComplete: boolean;
  finishReason: string;
}

const DEFAULT_TARGET_DURATION_SEC = 10 * 60;

const AVATAR_ASSETS = {
  idle: "/interview/avatar/dibut-idle.svg",
  thinking: "/interview/avatar/dibut-thinking.svg",
  listening: "/interview/avatar/dibut-listening.svg",
  speaking: "/interview/avatar/dibut-speaking.svg",
} as const;

const clampDurationMinute = (raw: string | null): 5 | 10 | 15 => {
  const parsed = Number(raw);
  if (parsed === 5 || parsed === 10 || parsed === 15) return parsed;
  return 10;
};

const formatTime = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remains = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remains).padStart(2, "0")}`;
};

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toText = (value: unknown, fallback: string) => (typeof value === "string" && value.trim() ? value : fallback);

export default function InterviewVideoRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const durationMinutes = clampDurationMinute(searchParams.get("duration"));
  const requestedTargetDurationSec = durationMinutes * 60;

  const {
    jobData,
    resumeData,
    setInterviewSessionId,
    setChatHistory,
  } = useInterviewSetupStore();

  const [runtimeMeta, setRuntimeMeta] = useState<RuntimeMeta>({
    targetDurationSec: requestedTargetDurationSec || DEFAULT_TARGET_DURATION_SEC,
    closingThresholdSec: 60,
    elapsedSec: 0,
    remainingSec: requestedTargetDurationSec || DEFAULT_TARGET_DURATION_SEC,
    timeProgressPercent: 0,
    estimatedTotalQuestions: 6,
    questionCount: 0,
    isClosingPhase: false,
    interviewComplete: false,
    finishReason: "",
  });
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [streamingCaption, setStreamingCaption] = useState("");
  const [streamingUserCaption, setStreamingUserCaption] = useState("");
  const [statusMessage, setStatusMessage] = useState("음성 파이프라인 연결 준비 중...");
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [showCaption, setShowCaption] = useState(true);

  const startedRef = useRef(false);

  const wsUrl = process.env.NEXT_PUBLIC_AI_WS_URL || "ws://localhost:8001/v1/interview/ws/client";
  const jobMeta = (jobData && typeof jobData === "object" ? jobData : {}) as Record<string, unknown>;
  const jobCompany = typeof jobMeta.company === "string" ? jobMeta.company : "";
  const jobRole = typeof jobMeta.role === "string" ? jobMeta.role : "";

  const {
    connect,
    disconnect,
    initInterviewSession,
    startMic,
    stopMic,
    isConnected,
    isMicOn,
    isAIProcessing,
    isAISpeaking,
    volume,
  } = useOpenLLM({
    serverUrl: wsUrl,
    onTranscript: (text, role) => {
      const clean = text.trim();
      if (!clean) return;
      if (role === "ai") {
        setStreamingCaption("");
      }
      if (role === "user") {
        setStreamingUserCaption("");
      }
      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role && last.text === clean) {
          return prev;
        }
        return [...prev, { role, text: clean, timestamp: Date.now() }];
      });
    },
    onEvent: (event) => {
      const eventType = typeof event.type === "string" ? event.type : "";

      if (eventType === "interview-session-created") {
        const uid = typeof event.client_uid === "string" ? event.client_uid : "";
        if (!uid) return;

        setInterviewSessionId(uid);
        setRuntimeMeta((prev) => ({
          ...prev,
          targetDurationSec: toNumber(event.targetDurationSec, prev.targetDurationSec),
          remainingSec: toNumber(event.targetDurationSec, prev.targetDurationSec),
          closingThresholdSec: toNumber(event.closingThresholdSec, prev.closingThresholdSec),
          estimatedTotalQuestions: toNumber(event.estimatedTotalQuestions, prev.estimatedTotalQuestions),
        }));
        setIsSessionReady(true);
        setStatusMessage("면접 세션이 시작되었습니다. 답변해 주세요.");
      }

      if (eventType === "runtime.meta") {
        setRuntimeMeta((prev) => {
          const targetDurationSec = toNumber(event.targetDurationSec, prev.targetDurationSec);
          const elapsedSec = toNumber(event.elapsedSec, prev.elapsedSec);
          const progress = Math.max(0, Math.min(100, Math.round((elapsedSec / Math.max(1, targetDurationSec)) * 100)));
          return {
            ...prev,
            targetDurationSec,
            closingThresholdSec: toNumber(event.closingThresholdSec, prev.closingThresholdSec),
            elapsedSec,
            remainingSec: toNumber(event.remainingSec, prev.remainingSec),
            estimatedTotalQuestions: toNumber(event.estimatedTotalQuestions, prev.estimatedTotalQuestions),
            questionCount: toNumber(event.questionCount, prev.questionCount),
            isClosingPhase: Boolean(event.isClosingPhase),
            interviewComplete: Boolean(event.interviewComplete),
            finishReason: toText(event.finishReason, ""),
            timeProgressPercent: progress,
          };
        });
      }

      if (eventType === "interview-phase-updated") {
        setStatusMessage(toText(event.message, "면접 단계가 업데이트되었습니다."));
      }

      if (
        eventType === "warning" ||
        eventType === "error" ||
        eventType === "mic-error" ||
        eventType === "audio-gesture-required"
      ) {
        setStatusMessage(toText(event.message, "오디오 파이프라인 상태를 확인해 주세요."));
      }

      if (eventType === "transcript.delta" && event.role === "ai") {
        const accumulated =
          typeof event.accumulatedText === "string" ? event.accumulatedText : "";
        const delta = typeof event.delta === "string" ? event.delta : "";
        setStreamingCaption((prev) => (accumulated ? accumulated : `${prev}${delta}`));
      }
      if (eventType === "transcript.delta" && event.role === "user") {
        const accumulated =
          typeof event.accumulatedText === "string" ? event.accumulatedText : "";
        const delta = typeof event.delta === "string" ? event.delta : "";
        setStreamingUserCaption((prev) => (accumulated ? accumulated : `${prev}${delta}`));
      }
    },
  });

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (!isConnected || startedRef.current) return;
    startedRef.current = true;
    setStatusMessage("면접 세션 초기화 중...");

    initInterviewSession({
      sessionType: "live_interview",
      style: "professional",
      targetDurationSec: requestedTargetDurationSec,
      closingThresholdSec: 60,
      llmStreamMode: "delta",
      ttsMode: "server",
      jobData: (jobData as unknown as Record<string, unknown>) || {},
      resumeData: (resumeData?.parsedContent as Record<string, unknown>) || {},
    });
  }, [
    isConnected,
    initInterviewSession,
    requestedTargetDurationSec,
    jobData,
    resumeData,
  ]);

  useEffect(() => {
    if (!runtimeMeta.interviewComplete) return;

    const chatHistory: { role: "user" | "model"; parts: string }[] = transcript.map((item) => ({
      role: item.role === "ai" ? "model" : "user",
      parts: item.text,
    }));
    setChatHistory(chatHistory);

    let remaining = 3;
    setStatusMessage(`면접이 완료되었습니다. ${remaining}초 후 결과 페이지로 이동합니다...`);

    const tick = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(tick);
        router.push(`/interview/result?duration=${durationMinutes}`);
      } else {
        setStatusMessage(`면접이 완료되었습니다. ${remaining}초 후 결과 페이지로 이동합니다...`);
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [runtimeMeta.interviewComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const timerBadgeClass =
    runtimeMeta.remainingSec <= 30
      ? "bg-red-600/80 text-white border border-red-400/30"
      : runtimeMeta.remainingSec <= 60
      ? "bg-orange-500/75 text-white border border-orange-400/30"
      : "bg-black/55 text-white border border-white/20";

  const avatarState = isAISpeaking
    ? "speaking"
    : isAIProcessing
      ? "thinking"
      : isMicOn
        ? "listening"
        : "idle";

  const avatarSrc = AVATAR_ASSETS[avatarState];
  const latestCaption = transcript[transcript.length - 1];
  const previousCaption = transcript[transcript.length - 2];
  const activeAiCaption = streamingCaption.trim();
  const activeUserCaption = streamingUserCaption.trim();

  const handleMicToggle = async () => {
    if (isMicOn) {
      stopMic(false);
      setStatusMessage("마이크를 일시 중지했습니다.");
      return;
    }

    await startMic({ userGesture: true });
    setStatusMessage("마이크를 활성화했습니다.");
  };

  const handleFinish = () => {
    const chatHistory: { role: "user" | "model"; parts: string }[] = transcript.map((item) => ({
      role: item.role === "ai" ? "model" : "user",
      parts: item.text,
    }));
    setChatHistory(chatHistory);
      router.push(`/interview/result?duration=${durationMinutes}`);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-[#0b1220] p-3 md:p-4 overflow-hidden">
      <div className="relative h-full rounded-3xl border border-slate-700/70 bg-[#0f172a] overflow-hidden">
        <div className="absolute right-4 top-4 z-30 flex items-center gap-2 flex-wrap justify-end">
          <Badge className="bg-blue-600/75 text-white border border-blue-400/30 text-[11px]">
            모의면접
            {jobCompany ? ` · ${jobCompany}` : ""}
            {jobRole ? ` ${jobRole}` : ""}
          </Badge>
          <Badge className={timerBadgeClass}>
            <Clock3 className="w-3.5 h-3.5 mr-1.5" /> {formatTime(runtimeMeta.remainingSec)}
          </Badge>
          <Badge variant="secondary" className="bg-slate-800/80 text-slate-100 border border-slate-600/60">
            {isConnected ? "WS Connected" : "WS Connecting"}
          </Badge>
        </div>

        <div className="grid h-full grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] pb-28">
          <section className="relative min-h-0 border-b border-slate-700/60 lg:border-b-0 lg:border-r">
            <div className="absolute left-4 top-4 z-20 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white border border-white/15">
              Dibut 면접관
            </div>
            <div className="h-full w-full flex items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(59,130,246,0.22),rgba(15,23,42,0.95)_45%)] px-8">
              <Image
                src={avatarSrc}
                alt="Dibut interviewer"
                width={460}
                height={560}
                className="w-full max-w-[420px] h-auto object-contain drop-shadow-[0_18px_50px_rgba(15,23,42,0.55)]"
                priority
              />
              {isAISpeaking && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-end gap-1.5">
                  {[6, 10, 14, 10, 6].map((h, idx) => (
                    <span
                      key={`wave-${idx}`}
                      className="w-1.5 rounded-full bg-blue-300 animate-pulse"
                      style={{ height: `${h}px`, animationDelay: `${idx * 0.08}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="relative min-h-0">
            <div className="absolute left-4 top-4 z-20 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white border border-white/15">
              지원자
            </div>
            <div className="h-full w-full">
              <LocalCameraPreview enabled fill />
            </div>
          </section>
        </div>

        {showCaption && (
          <div className="pointer-events-none absolute bottom-28 left-1/2 z-30 w-[min(960px,92%)] -translate-x-1/2">
            <div className="rounded-2xl border border-white/20 bg-black/55 backdrop-blur-md px-4 py-3 text-white shadow-2xl">
              <div className="flex items-center gap-2 text-[11px] text-white/70 mb-1.5">
                <Captions className="w-3.5 h-3.5" />
                실시간 자막
              </div>
              {latestCaption || activeAiCaption || activeUserCaption ? (
                <div className="space-y-1">
                  {previousCaption && !activeAiCaption && !activeUserCaption && (
                    <p className="text-[12px] text-white/60 truncate">
                      {previousCaption.role === "ai" ? "Dibut" : "나"}: {previousCaption.text}
                    </p>
                  )}
                  {activeAiCaption ? (
                    <p className="text-sm font-medium leading-relaxed">
                      <span className="text-emerald-300 mr-1">Dibut:</span>
                      {activeAiCaption}
                    </p>
                  ) : activeUserCaption ? (
                    <p className="text-sm font-medium leading-relaxed">
                      <span className="text-emerald-300 mr-1">나:</span>
                      {activeUserCaption}
                    </p>
                  ) : (
                    <p className="text-sm font-medium leading-relaxed">
                      <span className="text-emerald-300 mr-1">{latestCaption.role === "ai" ? "Dibut" : "나"}:</span>
                      {latestCaption.text}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/70">
                  {isSessionReady ? "자막 수신 대기 중..." : "세션을 초기화하고 있습니다..."}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
          <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/20 bg-black/60 backdrop-blur-md px-3 py-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-white/70 truncate">{statusMessage}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant={isMicOn ? "default" : "outline"}
                  className={isMicOn ? "bg-emerald-500 hover:bg-emerald-500/90 text-white" : "bg-transparent text-white border-white/30 hover:bg-white/10"}
                  onClick={handleMicToggle}
                >
                  {isMicOn ? <Mic className="w-4 h-4 mr-1.5" /> : <MicOff className="w-4 h-4 mr-1.5" />}
                  {isMicOn ? "마이크 켜짐" : "마이크 켜기"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-transparent text-white border-white/30 hover:bg-white/10"
                  onClick={() => setShowCaption((prev) => !prev)}
                >
                  <Captions className="w-4 h-4 mr-1.5" />
                  자막 {showCaption ? "끄기" : "켜기"}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleFinish}>
                  <PhoneOff className="w-4 h-4 mr-1.5" />
                  종료
                </Button>
              </div>
            </div>

            <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${runtimeMeta.timeProgressPercent}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
              <span>{runtimeMeta.isClosingPhase ? "마무리 질문 단계" : "핵심 역량 검증 단계"}</span>
              <span className="inline-flex items-center gap-1.5">
                {isAIProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                질문 {runtimeMeta.questionCount}/{runtimeMeta.estimatedTotalQuestions} · Mic {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
