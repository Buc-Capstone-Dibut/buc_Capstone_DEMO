"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Captions, Clock3, Loader2, Mic, MicOff, PhoneOff, WifiOff } from "lucide-react";
import { LocalCameraPreview } from "@/components/features/interview/local-camera-preview";
import {
  buildInterviewResultPath,
  shouldRouteToSetupOnReconnectTimeout,
} from "@/lib/interview/interview-session-flow";
import {
  isLocalInterviewBaseUrl,
  LOCAL_INTERVIEW_FALLBACK_USER_ID,
  resolveInterviewBaseUrlFromWsUrl,
} from "@/lib/interview/dev-auth";
import { formatTranscriptForDisplay } from "@/lib/transcript-display";
import { supabase } from "@/lib/supabase/client";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { useOpenLLM } from "@/hooks/use-open-llm";

type SessionType = "live_interview" | "portfolio_defense";

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
  sessionPaused: boolean;
  reconnectRemainingSec: number;
  runtimeStatus: string;
}

const DEFAULT_TARGET_DURATION_SEC = 10 * 60;
const RECONNECT_GRACE_SEC = 60;

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

const resolveSessionType = (raw: string | null): SessionType =>
  raw === "portfolio_defense" ? "portfolio_defense" : "live_interview";

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

const toText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value : fallback;

const toStringList = (value: string | null) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function InterviewVideoRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionType = resolveSessionType(searchParams.get("sessionType"));
  const durationMinutes = clampDurationMinute(searchParams.get("duration"));
  const requestedTargetDurationSec = durationMinutes * 60;
  const requestedSessionId = (searchParams.get("sessionId") || "").trim();
  const requestedRepoUrl = (searchParams.get("repoUrl") || "").trim();

  const {
    jobData,
    resumeData,
    setInterviewSessionId,
    reset,
  } = useInterviewSetupStore();

  const [activeSessionId, setActiveSessionId] = useState(requestedSessionId || "");
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
    sessionPaused: false,
    reconnectRemainingSec: 0,
    runtimeStatus: "created",
  });
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [streamingAiCaption, setStreamingAiCaption] = useState("");
  const [streamingUserCaption, setStreamingUserCaption] = useState("");
  const [statusMessage, setStatusMessage] = useState("음성 파이프라인 연결 준비 중...");
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [showCaption, setShowCaption] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectRemainingSec, setReconnectRemainingSec] = useState(RECONNECT_GRACE_SEC);
  const [isAudioPrimed, setIsAudioPrimed] = useState(false);
  const [isPrimingAudio, setIsPrimingAudio] = useState(false);
  const [isFinishingSession, setIsFinishingSession] = useState(false);

  const startedRef = useRef(false);
  const sessionStartingRef = useRef(false);
  const completionRedirectedRef = useRef(false);
  const activeSessionIdRef = useRef("");
  const initRetryTimerRef = useRef<number | null>(null);
  const initRetryAttemptedRef = useRef(false);
  const isSessionReadyRef = useRef(false);

  const wsUrl = process.env.NEXT_PUBLIC_AI_WS_URL || "ws://localhost:8001/v1/interview/ws/client";
  const interviewJobData = useMemo(
    () => (jobData && typeof jobData === "object" ? jobData : {}) as Record<string, unknown>,
    [jobData],
  );
  const portfolioJobData = useMemo(
    () => ({
      repoUrl: requestedRepoUrl,
      focus: ["architecture", "infra", "ai-usage"],
      readmeSummary: searchParams.get("readmeSummary") || "",
      treeSummary: searchParams.get("treeSummary") || "",
      infraHypotheses: toStringList(searchParams.get("infraHypotheses")),
      detectedTopics: toStringList(searchParams.get("detectedTopics")),
    }),
    [requestedRepoUrl, searchParams],
  );

  const runtimeJobData =
    sessionType === "portfolio_defense" ? portfolioJobData : interviewJobData;

  const displayCompany =
    sessionType === "portfolio_defense"
      ? requestedRepoUrl || "Portfolio Defense"
      : (typeof interviewJobData.company === "string" ? interviewJobData.company : "");
  const displayRole =
    sessionType === "portfolio_defense"
      ? "포트폴리오 디펜스"
      : (typeof interviewJobData.role === "string" ? interviewJobData.role : "");

  const buildResultPath = useCallback(
    (sessionId: string) => buildInterviewResultPath(sessionType, durationMinutes, sessionId),
    [durationMinutes, sessionType],
  );

  const routeToSetup = useCallback(() => {
    reset();
    router.replace(sessionType === "portfolio_defense" ? "/interview/training/portfolio" : "/interview");
  }, [reset, router, sessionType]);

  const clearInitRetryTimer = useCallback(() => {
    if (initRetryTimerRef.current === null) return;
    window.clearTimeout(initRetryTimerRef.current);
    initRetryTimerRef.current = null;
  }, []);

  useEffect(() => {
    isSessionReadyRef.current = isSessionReady;
    if (!isSessionReady) return;
    clearInitRetryTimer();
    initRetryAttemptedRef.current = false;
  }, [clearInitRetryTimer, isSessionReady]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const ensureSessionId = useCallback(async (): Promise<string | null> => {
    if (activeSessionIdRef.current) return activeSessionIdRef.current;
    if (sessionStartingRef.current) return null;

    sessionStartingRef.current = true;
    try {
      setStatusMessage("면접 세션을 생성하는 중...");
      const endpoint =
        sessionType === "portfolio_defense"
          ? "/api/interview/portfolio/session/start"
          : "/api/interview/session/start";
      const aiBaseUrl = resolveInterviewBaseUrlFromWsUrl(wsUrl);
      const allowDirectStartFallback = isLocalInterviewBaseUrl(aiBaseUrl);
      const directEndpoint =
        sessionType === "portfolio_defense"
          ? `${aiBaseUrl}/v1/interview/portfolio/session/start`
          : `${aiBaseUrl}/v1/interview/session/start`;
      const body =
        sessionType === "portfolio_defense"
          ? {
              repoUrl: portfolioJobData.repoUrl,
              mode: "video",
              targetDurationSec: requestedTargetDurationSec,
              closingThresholdSec: 60,
              focus: portfolioJobData.focus,
              readmeSummary: portfolioJobData.readmeSummary,
              treeSummary: portfolioJobData.treeSummary,
              infraHypotheses: portfolioJobData.infraHypotheses,
              detectedTopics: portfolioJobData.detectedTopics,
            }
          : {
              mode: "video",
              personality: "professional",
              jobData: interviewJobData,
              resumeData,
              targetDurationSec: requestedTargetDurationSec,
              closingThresholdSec: 60,
            };

      const parseSessionStartResponse = async (response: Response) => {
        const result = await response.json().catch(() => null);
        if (response.status === 401) {
          router.push("/auth/login");
          return null;
        }
        if (!response.ok || !result?.success || !result?.data?.sessionId) {
          throw new Error(result?.error || "면접 세션 시작에 실패했습니다.");
        }
        return result;
      };

      const startViaBff = async () => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 6000);
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          return await parseSessionStartResponse(response);
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      const startDirectWithClientAuth = async () => {
        if (useDirectStartFirst) {
          return await startDirectWithUserId(LOCAL_INTERVIEW_FALLBACK_USER_ID);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const sessionUserId = session?.user?.id ?? null;

        if (!sessionUserId) {
          const getUserResult = await Promise.race([
            supabase.auth.getUser(),
            new Promise<never>((_, reject) =>
              window.setTimeout(() => reject(new Error("사용자 인증 정보를 확인하는 중 시간이 초과되었습니다.")), 2000),
            ),
          ]);
          const { data, error } = getUserResult as Awaited<ReturnType<typeof supabase.auth.getUser>>;
          if (error) {
            throw new Error(error.message || "사용자 인증 정보를 확인하지 못했습니다.");
          }
          if (!data.user?.id) {
            router.push("/auth/login");
            return null;
          }

          return await startDirectWithUserId(data.user.id);
        }

        return await startDirectWithUserId(sessionUserId);
      };

      const startDirectWithUserId = async (userId: string) => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);
        try {
          const response = await fetch(directEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": userId,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          return await parseSessionStartResponse(response);
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      let result: { data?: Record<string, unknown> } | null = null;
      try {
        result = await startViaBff();
      } catch (error) {
        const isTimeout = error instanceof Error && error.name === "AbortError";
        if (!isTimeout || !allowDirectStartFallback) {
          throw error;
        }
        setStatusMessage("세션 생성 응답이 지연되어 로컬 AI 서버 직접 연결로 재시도하는 중...");
        result = await startDirectWithClientAuth();
      }
      if (!result?.data?.sessionId) return null;

      const nextSessionId = String(result.data.sessionId);
      setActiveSessionId(nextSessionId);
      setInterviewSessionId(nextSessionId);
      setRuntimeMeta((prev) => ({
        ...prev,
        targetDurationSec: toNumber(result.data.targetDurationSec, prev.targetDurationSec),
        remainingSec: toNumber(result.data.targetDurationSec, prev.targetDurationSec),
        closingThresholdSec: toNumber(result.data.closingThresholdSec, prev.closingThresholdSec),
        estimatedTotalQuestions: toNumber(result.data.estimatedTotalQuestions, prev.estimatedTotalQuestions),
      }));
      return nextSessionId;
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "면접 세션 생성이 지연되고 있습니다. AI 서버 상태를 확인해 주세요."
          : (error instanceof Error ? error.message : "면접 세션 시작에 실패했습니다.");
      setStatusMessage(message);
      return null;
    } finally {
      sessionStartingRef.current = false;
    }
  }, [
    interviewJobData,
    portfolioJobData.detectedTopics,
    portfolioJobData.focus,
    portfolioJobData.infraHypotheses,
    portfolioJobData.readmeSummary,
    portfolioJobData.repoUrl,
    portfolioJobData.treeSummary,
    requestedTargetDurationSec,
    resumeData,
    router,
    sessionType,
    setInterviewSessionId,
    wsUrl,
  ]);

  const {
    connect,
    disconnect,
    initInterviewSession,
    prepareAudio,
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
        setStreamingAiCaption("");
      } else {
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
        const resumed = Boolean(event.resumed);
        if (uid) {
          setActiveSessionId(uid);
          setInterviewSessionId(uid);
        }
        if (!resumed) {
          setTranscript([]);
        }
        setStreamingAiCaption("");
        setStreamingUserCaption("");
        setRuntimeMeta((prev) => ({
          ...prev,
          targetDurationSec: toNumber(event.targetDurationSec, prev.targetDurationSec),
          remainingSec: toNumber(event.targetDurationSec, prev.targetDurationSec),
          closingThresholdSec: toNumber(event.closingThresholdSec, prev.closingThresholdSec),
          estimatedTotalQuestions: toNumber(event.estimatedTotalQuestions, prev.estimatedTotalQuestions),
        }));
        setIsSessionReady(true);
        setStatusMessage(
          resumed
            ? "이전 면접 세션에 다시 연결되었습니다."
            : "면접 세션이 시작되었습니다. 질문에 답변해 주세요.",
        );
      }

      if (eventType === "runtime.meta") {
        setRuntimeMeta((prev) => {
          const targetDurationSec = toNumber(event.targetDurationSec, prev.targetDurationSec);
          const elapsedSec = toNumber(event.elapsedSec, prev.elapsedSec);
          const sessionPaused = Boolean(event.sessionPaused);
          const reconnectRemaining = toNumber(event.reconnectRemainingSec, prev.reconnectRemainingSec);
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
            sessionPaused,
            reconnectRemainingSec: reconnectRemaining,
            runtimeStatus: toText(event.runtimeStatus, prev.runtimeStatus),
            timeProgressPercent: Math.max(
              0,
              Math.min(100, Math.round((elapsedSec / Math.max(1, targetDurationSec)) * 100)),
            ),
          };
        });
        if (Boolean(event.sessionPaused)) {
          setIsReconnecting(true);
          setReconnectRemainingSec(toNumber(event.reconnectRemainingSec, RECONNECT_GRACE_SEC));
        } else {
          setIsReconnecting(false);
        }
      }

      if (eventType === "interview-phase-updated") {
        setStatusMessage(toText(event.message, "면접 단계가 업데이트되었습니다."));
      }

      if (eventType === "warning" || eventType === "error" || eventType === "mic-error" || eventType === "audio-gesture-required") {
        setStatusMessage(toText(event.message, "오디오 파이프라인 상태를 확인해 주세요."));
      }

      if (eventType === "connection.reconnecting" || eventType === "socket-reconnecting") {
        setIsReconnecting(true);
        setReconnectRemainingSec(RECONNECT_GRACE_SEC);
        setStatusMessage("재연결 시도중...");
      }

      if (eventType === "connection.resumed" || eventType === "socket-resumed") {
        setIsReconnecting(false);
        setReconnectRemainingSec(RECONNECT_GRACE_SEC);
        setStatusMessage(toText(event.message, "연결이 복구되었습니다."));
      }

      if (eventType === "connection.ready") {
        setStatusMessage(toText(event.message, "실시간 면접 연결이 준비되었습니다."));
      }

      if (eventType === "connection.expired") {
        setStatusMessage(toText(event.message, "재연결 가능 시간이 만료되었습니다."));
        routeToSetup();
      }

      if (eventType === "transcript.delta" && (event.role === "ai" || event.role === "user")) {
        const accumulated = typeof event.accumulatedText === "string" ? event.accumulatedText : "";
        const delta = typeof event.delta === "string" ? event.delta : "";
        if (event.role === "ai") {
          setStreamingAiCaption((prev) => (accumulated ? accumulated : `${prev}${delta}`));
          setStreamingUserCaption("");
        } else {
          setStreamingUserCaption((prev) => (accumulated ? accumulated : `${prev}${delta}`));
          setStreamingAiCaption("");
        }
      }
    },
  });

  const sendInterviewInit = useCallback(async (sessionId: string, attempt: "initial" | "retry" = "initial") => {
    const payload = {
      sessionId,
      sessionType,
      style: "professional" as const,
      targetDurationSec: requestedTargetDurationSec,
      closingThresholdSec: 60,
      llmStreamMode: "delta" as const,
      ttsMode: "server" as const,
      jobData: runtimeJobData,
      resumeData:
        sessionType === "portfolio_defense"
          ? {}
          : ((resumeData?.parsedContent as Record<string, unknown> | undefined) || {}),
    };

    let sent = false;
    for (let retry = 0; retry < 3; retry += 1) {
      sent = initInterviewSession(payload);
      if (sent) break;
      await new Promise((resolve) => window.setTimeout(resolve, 250 * (retry + 1)));
    }

    if (!sent) {
      startedRef.current = false;
      setStatusMessage("실시간 면접 세션 초기화 요청 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return false;
    }

    setStatusMessage(
      attempt === "retry"
        ? "세션 초기화 응답이 지연되어 다시 요청하는 중..."
        : "실시간 면접 세션을 초기화하는 중...",
    );
    clearInitRetryTimer();
    initRetryTimerRef.current = window.setTimeout(() => {
      if (isSessionReadyRef.current || initRetryAttemptedRef.current) return;
      initRetryAttemptedRef.current = true;
      void sendInterviewInit(sessionId, "retry");
    }, 4000);

    return true;
  }, [
    clearInitRetryTimer,
    initInterviewSession,
    requestedTargetDurationSec,
    resumeData?.parsedContent,
    runtimeJobData,
    sessionType,
  ]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (!requestedSessionId) {
      setActiveSessionId("");
      setInterviewSessionId(null);
      return;
    }
    setActiveSessionId(requestedSessionId);
    setInterviewSessionId(requestedSessionId);
  }, [requestedSessionId, setInterviewSessionId]);

  useEffect(() => {
    if (!isConnected || startedRef.current || !isAudioPrimed) return;

    let cancelled = false;
    startedRef.current = true;
    setStatusMessage("면접 세션 초기화 중...");

    void (async () => {
      const nextSessionId = requestedSessionId || (await ensureSessionId());
      if (!nextSessionId || cancelled) {
        if (!nextSessionId) startedRef.current = false;
        return;
      }

      await sendInterviewInit(nextSessionId);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    ensureSessionId,
    isAudioPrimed,
    isConnected,
    requestedSessionId,
    sendInterviewInit,
  ]);

  useEffect(() => () => clearInitRetryTimer(), [clearInitRetryTimer]);

  useEffect(() => {
    if (!isReconnecting) return;
    const timer = window.setInterval(() => {
      setReconnectRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isReconnecting]);

  useEffect(() => {
    if (!isSessionReady || !activeSessionId) return;
    if (runtimeMeta.interviewComplete || isReconnecting || runtimeMeta.sessionPaused) return;

    const timer = window.setInterval(() => {
      setRuntimeMeta((prev) => {
        if (prev.interviewComplete || prev.sessionPaused) {
          return prev;
        }
        const nextElapsed = Math.min(prev.targetDurationSec, prev.elapsedSec + 1);
        const nextRemaining = Math.max(0, prev.targetDurationSec - nextElapsed);
        return {
          ...prev,
          elapsedSec: nextElapsed,
          remainingSec: nextRemaining,
          timeProgressPercent: Math.max(
            0,
            Math.min(100, Math.round((nextElapsed / Math.max(1, prev.targetDurationSec)) * 100)),
          ),
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeSessionId, isReconnecting, isSessionReady, runtimeMeta.interviewComplete, runtimeMeta.sessionPaused]);

  useEffect(() => {
    if (!shouldRouteToSetupOnReconnectTimeout(isReconnecting, reconnectRemainingSec)) return;
    disconnect();
    routeToSetup();
  }, [disconnect, isReconnecting, reconnectRemainingSec, routeToSetup]);

  useEffect(() => {
    if (!runtimeMeta.interviewComplete || completionRedirectedRef.current || !activeSessionId) return;
    completionRedirectedRef.current = true;

    let remaining = 3;
    setStatusMessage(`면접이 완료되었습니다. ${remaining}초 후 결과 페이지로 이동합니다...`);

    const tick = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(tick);
        router.push(buildResultPath(activeSessionId));
      } else {
        setStatusMessage(`면접이 완료되었습니다. ${remaining}초 후 결과 페이지로 이동합니다...`);
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [activeSessionId, buildResultPath, router, runtimeMeta.interviewComplete]);

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
  const activeAiCaption = formatTranscriptForDisplay(streamingAiCaption.trim(), "ai");
  const activeUserCaption = formatTranscriptForDisplay(streamingUserCaption.trim(), "user");
  const activeCaptionRole: "ai" | "user" | null = activeAiCaption
    ? "ai"
    : (activeUserCaption ? "user" : null);
  const activeCaptionText = activeCaptionRole === "ai" ? activeAiCaption : activeUserCaption;
  const latestCaptionText = latestCaption
    ? formatTranscriptForDisplay(latestCaption.text, latestCaption.role)
    : "";
  const previousCaptionText = previousCaption
    ? formatTranscriptForDisplay(previousCaption.text, previousCaption.role)
    : "";

  const handleMicToggle = async () => {
    if (isReconnecting) return;
    if (isMicOn) {
      stopMic(false);
      setStatusMessage("마이크를 일시 중지했습니다.");
      return;
    }

    await startMic({ userGesture: true });
    setStatusMessage("마이크를 활성화했습니다.");
  };

  const handlePrimeAudio = async () => {
    if (isPrimingAudio) return;
    setIsPrimingAudio(true);
    try {
      const ready = await prepareAudio();
      if (!ready) {
        setStatusMessage("오디오 재생을 시작하지 못했습니다. 브라우저에서 사운드 자동재생을 허용해 주세요.");
        return;
      }
      setIsAudioPrimed(true);
      setStatusMessage("오디오 준비가 완료되었습니다. 면접을 시작합니다.");
    } finally {
      setIsPrimingAudio(false);
    }
  };

  const handleFinish = async () => {
    if (!activeSessionId) {
      routeToSetup();
      return;
    }

    if (isFinishingSession) return;

    setIsFinishingSession(true);
    setStatusMessage("면접 종료와 리포트 생성을 요청하는 중...");
    try {
      const response = await fetch(`/api/interview/sessions/${activeSessionId}/complete`, {
        method: "POST",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "면접 종료 처리에 실패했습니다.");
      }
      completionRedirectedRef.current = true;
      disconnect();
      router.push(buildResultPath(activeSessionId));
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "면접 종료 처리에 실패했습니다.";
      setStatusMessage(message);
    } finally {
      setIsFinishingSession(false);
    }

  };

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden bg-[#0b1220] p-3 md:p-4">
      <div className="relative h-full overflow-hidden rounded-3xl border border-slate-700/70 bg-[#0f172a]">
        <div className="absolute right-4 top-4 z-30 flex flex-wrap items-center justify-end gap-2">
          <Badge className="border border-blue-400/30 bg-blue-600/75 text-[11px] text-white">
            {sessionType === "portfolio_defense" ? "PORTFOLIO DEFENSE" : "LIVE INTERVIEW"}
            {displayCompany ? ` · ${displayCompany}` : ""}
            {displayRole ? ` ${displayRole}` : ""}
          </Badge>
          <Badge className={timerBadgeClass}>
            <Clock3 className="mr-1.5 h-3.5 w-3.5" /> {formatTime(runtimeMeta.remainingSec)}
          </Badge>
          <Badge variant="secondary" className="border border-slate-600/60 bg-slate-800/80 text-slate-100">
            {isConnected ? "WS Connected" : "WS Connecting"}
          </Badge>
        </div>

        <div className="grid h-full grid-cols-1 pb-28 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="relative min-h-0 border-b border-slate-700/60 lg:border-b-0 lg:border-r">
            <div className="absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs font-medium text-white">
              Dibut 면접관
            </div>
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(59,130,246,0.22),rgba(15,23,42,0.95)_45%)] px-8">
              <Image
                src={avatarSrc}
                alt="Dibut interviewer"
                width={460}
                height={560}
                className="h-auto w-full max-w-[420px] object-contain drop-shadow-[0_18px_50px_rgba(15,23,42,0.55)]"
                priority
              />
              {isAISpeaking ? (
                <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-end gap-1.5">
                  {[6, 10, 14, 10, 6].map((height, index) => (
                    <span
                      key={`wave-${index}`}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-300"
                      style={{ height: `${height}px`, animationDelay: `${index * 0.08}s` }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="relative min-h-0">
            <div className="absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs font-medium text-white">
              지원자
            </div>
            <div className="h-full w-full">
              <LocalCameraPreview enabled fill />
            </div>
          </section>
        </div>

        {showCaption ? (
          <div className="pointer-events-none absolute bottom-28 left-1/2 z-30 w-[min(960px,92%)] -translate-x-1/2">
            <div className="pointer-events-auto rounded-2xl border border-white/20 bg-black/55 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
              <div className="mb-1.5 flex items-center gap-2 text-[11px] text-white/70">
                <Captions className="h-3.5 w-3.5" />
                실시간 자막
              </div>
              {latestCaption || activeCaptionText ? (
                <div className="max-h-[min(44vh,16rem)] space-y-1 overflow-y-auto overscroll-contain pr-1">
                  {previousCaption && !activeCaptionText ? (
                    <p className="break-words text-[12px] leading-relaxed text-white/60">
                      {previousCaption.role === "ai" ? "Dibut" : "나"}: {previousCaptionText}
                    </p>
                  ) : null}
                  {activeCaptionText ? (
                    <p className="break-words whitespace-pre-wrap text-sm font-medium leading-relaxed">
                      <span className={`mr-1 ${activeCaptionRole === "ai" ? "text-emerald-300" : "text-sky-300"}`}>
                        {activeCaptionRole === "ai" ? "Dibut" : "나"}:
                      </span>
                      {activeCaptionText}
                    </p>
                  ) : latestCaption ? (
                    <p className="break-words whitespace-pre-wrap text-sm font-medium leading-relaxed">
                      <span className="mr-1 text-emerald-300">
                        {latestCaption.role === "ai" ? "Dibut" : "나"}:
                      </span>
                      {latestCaptionText}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-white/70">
                  {isSessionReady ? "AI 자막 수신 대기 중..." : "세션을 초기화하고 있습니다..."}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {isReconnecting ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#020617]/75 backdrop-blur-sm">
            <div className="mx-6 w-full max-w-md rounded-[28px] border border-white/15 bg-[#111827]/90 p-7 text-white shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <WifiOff className="h-5 w-5 text-blue-200" />
                </div>
                <div>
                  <p className="text-lg font-semibold">재연결 시도중...</p>
                  <p className="mt-1 text-sm text-white/70">
                    연결이 복구될 때까지 면접을 잠시 멈췄습니다.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>남은 재연결 시간</span>
                  <span>{reconnectRemainingSec}초</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-blue-400 transition-all duration-1000"
                    style={{ width: `${(reconnectRemainingSec / RECONNECT_GRACE_SEC) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!isAudioPrimed ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#020617]/82 backdrop-blur-sm">
            <div className="mx-6 w-full max-w-lg rounded-[28px] border border-white/15 bg-[#111827]/92 p-7 text-white shadow-2xl">
              <p className="text-lg font-semibold">면접 시작 준비</p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                첫 질문 음성이 브라우저 자동재생 제한에 막히지 않도록, 시작 전에 한 번 눌러 오디오를 활성화합니다.
              </p>
              <Button
                className="mt-5 w-full bg-emerald-500 text-white hover:bg-emerald-500/90"
                onClick={handlePrimeAudio}
                disabled={isPrimingAudio}
              >
                {isPrimingAudio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                면접 시작하기
              </Button>
            </div>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
          <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/20 bg-black/60 px-3 py-3 backdrop-blur-md">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="max-w-2xl break-words whitespace-pre-wrap text-xs leading-relaxed text-white/70">
                {statusMessage}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant={isMicOn ? "default" : "outline"}
                  className={
                    isMicOn
                      ? "bg-emerald-500 text-white hover:bg-emerald-500/90"
                      : "border-white/30 bg-transparent text-white hover:bg-white/10"
                  }
                  disabled={isReconnecting}
                  onClick={handleMicToggle}
                >
                  {isMicOn ? <Mic className="mr-1.5 h-4 w-4" /> : <MicOff className="mr-1.5 h-4 w-4" />}
                  {isMicOn ? "마이크 켜짐" : "마이크 켜기"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                  onClick={() => setShowCaption((prev) => !prev)}
                >
                  <Captions className="mr-1.5 h-4 w-4" />
                  자막 {showCaption ? "끄기" : "켜기"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void handleFinish()} disabled={isFinishingSession}>
                  <PhoneOff className="mr-1.5 h-4 w-4" />
                  {isFinishingSession ? "종료 처리 중..." : "종료"}
                </Button>
              </div>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${runtimeMeta.timeProgressPercent}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
              <span>{runtimeMeta.isClosingPhase ? "마무리 질문 단계" : "핵심 역량 검증 단계"}</span>
              <span className="inline-flex items-center gap-1.5">
                {isAIProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                질문 {runtimeMeta.questionCount}/{runtimeMeta.estimatedTotalQuestions} · Mic {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
