"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Captions, Clock3, Loader2, Mic, MicOff, PhoneOff, WifiOff } from "lucide-react";
import { TalkingHeadInterviewer } from "@/components/features/interview/avatar/talking-head-interviewer";
import { LocalCameraPreview } from "@/components/features/interview/local-camera-preview";
import {
  buildInterviewResultPath,
  shouldRouteToSetupOnReconnectTimeout,
} from "@/lib/interview/interview-session-flow";
import type { InterviewAvatarState } from "@/lib/interview/interviewer-avatar-config";
import {
  isLocalInterviewBaseUrl,
  LOCAL_INTERVIEW_FALLBACK_USER_ID,
  resolveInterviewBaseUrlFromWsUrl,
} from "@/lib/interview/dev-auth";
import { isInterviewPlaybackAudioReady } from "@/lib/interview/playback-audio";
import { formatStreamingTranscriptForDisplay, formatTranscriptForDisplay } from "@/lib/transcript-display";
import { supabase } from "@/lib/supabase/client";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { useOpenLLM } from "@/hooks/use-open-llm";

type SessionType = "live_interview" | "portfolio_defense";

interface TranscriptItem {
  role: "user" | "ai";
  text: string;
  timestamp: number;
  turnId?: string;
  provider?: string;
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

interface StickyCaption {
  role: "user" | "ai";
  text: string;
  turnId?: string;
  provider?: string;
}

const DEFAULT_TARGET_DURATION_SEC = 10 * 60;
const RECONNECT_GRACE_SEC = 60;

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

const preferLongerCaption = (current: string, candidate: string) => {
  const normalizedCurrent = (current || "").trim();
  const normalizedCandidate = (candidate || "").trim();

  if (!normalizedCurrent) return normalizedCandidate;
  if (!normalizedCandidate) return normalizedCurrent;
  if (normalizedCandidate.startsWith(normalizedCurrent)) return normalizedCandidate;
  if (normalizedCurrent.startsWith(normalizedCandidate)) return normalizedCurrent;

  const compactCurrent = normalizedCurrent.replace(/\s+/g, "");
  const compactCandidate = normalizedCandidate.replace(/\s+/g, "");
  return compactCandidate.length >= compactCurrent.length ? normalizedCandidate : normalizedCurrent;
};

const isGoogleTranscriptProvider = (provider?: string) =>
  (provider || "").toLowerCase().includes("google-cloud-stt");

const shouldIgnoreNonGoogleUserUpdate = (
  currentTurnId: string,
  currentProvider: string,
  incomingTurnId: string,
  incomingProvider: string,
) =>
  Boolean(
    currentTurnId
    && (incomingTurnId ? currentTurnId === incomingTurnId : true)
    && isGoogleTranscriptProvider(currentProvider)
    && !isGoogleTranscriptProvider(incomingProvider),
  );

const mergeCommittedUserCaption = (
  prev: StickyCaption | null,
  text: string,
  turnId: string,
  provider = "",
): StickyCaption | null => {
  const cleanText = text.trim();
  if (!cleanText) return prev;

  const cleanTurnId = turnId.trim();
  const previousText = prev && prev.turnId === cleanTurnId ? prev.text : "";
  const previousProvider = prev && prev.turnId === cleanTurnId ? (prev.provider || "") : "";
  if (
    prev
    && prev.turnId === cleanTurnId
    && isGoogleTranscriptProvider(previousProvider)
    && !isGoogleTranscriptProvider(provider)
  ) {
    return prev;
  }
  return {
    role: "user",
    text: preferLongerCaption(previousText, cleanText),
    turnId: cleanTurnId || prev?.turnId || "",
    provider: provider || previousProvider || prev?.provider,
  };
};

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
  const [streamingAiTurnId, setStreamingAiTurnId] = useState("");
  const [streamingUserTurnId, setStreamingUserTurnId] = useState("");
  const [streamingUserProvider, setStreamingUserProvider] = useState("");
  const [stickyCaption, setStickyCaption] = useState<StickyCaption | null>(null);
  const [committedUserCaption, setCommittedUserCaption] = useState<StickyCaption | null>(null);
  const [statusMessage, setStatusMessage] = useState("음성 파이프라인 연결 준비 중...");
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [showCaption, setShowCaption] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectRemainingSec, setReconnectRemainingSec] = useState(RECONNECT_GRACE_SEC);
  const [isAudioPrimed, setIsAudioPrimed] = useState(() => isInterviewPlaybackAudioReady());
  const [isPrimingAudio, setIsPrimingAudio] = useState(false);
  const [hasConfirmedInterviewStart, setHasConfirmedInterviewStart] = useState(false);
  const [isFinishingSession, setIsFinishingSession] = useState(false);

  const startedRef = useRef(false);
  const sessionStartingRef = useRef(false);
  const completionRedirectedRef = useRef(false);
  const activeSessionIdRef = useRef("");
  const initRetryTimerRef = useRef<number | null>(null);
  const initRetryAttemptedRef = useRef(false);
  const isSessionReadyRef = useRef(false);
  const captionScrollRef = useRef<HTMLDivElement | null>(null);

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

  const snapshotCommittedUserCaption = useCallback((text: string, turnId: string = "", provider = "") => {
    setCommittedUserCaption((prev) => mergeCommittedUserCaption(prev, text, turnId, provider));
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
    onTranscript: (text, role, meta) => {
      const clean = text.trim();
      if (!clean) return;
      const turnId = (meta?.turnId || "").trim();
      const provider = (meta?.provider || "").trim();
      if (role === "ai") {
        setStreamingAiCaption((prev) => {
          if (turnId && streamingAiTurnId && turnId === streamingAiTurnId) {
            return preferLongerCaption(prev, clean);
          }
          return prev;
        });
      } else {
        if (
          shouldIgnoreNonGoogleUserUpdate(streamingUserTurnId, streamingUserProvider, turnId, provider)
          || shouldIgnoreNonGoogleUserUpdate(committedUserCaption?.turnId || "", committedUserCaption?.provider || "", turnId, provider)
        ) {
          return;
        }
        snapshotCommittedUserCaption(clean, turnId, provider);
        if (!isAISpeaking && !isAIProcessing) {
          setStreamingAiCaption("");
          setStreamingAiTurnId("");
          if (turnId) {
            setStreamingUserTurnId(turnId);
          }
          setStreamingUserProvider((prev) => provider || prev);
          setStreamingUserCaption((prev) => preferLongerCaption(prev, clean));
        }
      }
      setTranscript((prev) => {
        if (turnId) {
          const existingIndex = prev.findLastIndex(
            (item) => item.role === role && (item.turnId || "") === turnId,
          );
          if (existingIndex >= 0) {
            const existing = prev[existingIndex];
            if (
              role === "user"
              && isGoogleTranscriptProvider(existing.provider)
              && !isGoogleTranscriptProvider(provider)
            ) {
              return prev;
            }
            const next = [...prev];
            next[existingIndex] = {
              ...next[existingIndex],
              text: role === "user" ? preferLongerCaption(next[existingIndex].text, clean) : clean,
              timestamp: Date.now(),
              turnId,
              provider: provider || next[existingIndex].provider,
            };
            return next;
          }
        }
        const last = prev[prev.length - 1];
        if (
          last
          && last.role === role
          && last.text === clean
          && (last.turnId || "") === turnId
          && (last.provider || "") === provider
        ) {
          return prev;
        }
        return [...prev, { role, text: clean, timestamp: Date.now(), turnId, provider }];
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
        setStreamingAiTurnId("");
        setStreamingUserTurnId("");
        setStreamingUserProvider("");
        setStickyCaption(null);
        setCommittedUserCaption(null);
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

      if (eventType === "control") {
        const controlText = typeof event.text === "string" ? event.text : "";
        if (controlText === "mic-audio-end") {
          snapshotCommittedUserCaption(streamingUserCaption, streamingUserTurnId, streamingUserProvider);
        }
      }

      if (eventType === "transcript.delta" && (event.role === "ai" || event.role === "user")) {
        const accumulated = typeof event.accumulatedText === "string" ? event.accumulatedText : "";
        const delta = typeof event.delta === "string" ? event.delta : "";
        const turnId = typeof event.turnId === "string" ? event.turnId : "";
        const provider = typeof event.provider === "string" ? event.provider : "";
        if (event.role === "ai") {
          const userPreview = streamingUserCaption.trim();
          const userPreviewTurnId = streamingUserTurnId.trim();
          if (userPreview) {
            snapshotCommittedUserCaption(userPreview, userPreviewTurnId, streamingUserProvider);
          }
          setStreamingUserCaption("");
          setStreamingUserTurnId("");
          setStreamingUserProvider("");
          setStreamingAiTurnId(turnId);
          setStreamingAiCaption((prev) => {
            if (accumulated) return accumulated;
            if (turnId && turnId !== streamingAiTurnId) return delta;
            return `${prev}${delta}`;
          });
        } else {
          if (
            shouldIgnoreNonGoogleUserUpdate(streamingUserTurnId, streamingUserProvider, turnId, provider)
            || shouldIgnoreNonGoogleUserUpdate(committedUserCaption?.turnId || "", committedUserCaption?.provider || "", turnId, provider)
          ) {
            return;
          }
          setStreamingAiCaption("");
          setStreamingAiTurnId("");
          setStreamingUserTurnId(turnId);
          setStreamingUserProvider((prev) => provider || prev);
          setStreamingUserCaption((prev) => {
            if (accumulated) return accumulated;
            if (turnId && turnId !== streamingUserTurnId) return delta;
            return `${prev}${delta}`;
          });
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
    if (!isConnected || startedRef.current || !isAudioPrimed || !hasConfirmedInterviewStart) return;

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
    hasConfirmedInterviewStart,
    isAudioPrimed,
    isConnected,
    requestedSessionId,
    sendInterviewInit,
  ]);

  useEffect(() => {
    if (startedRef.current || hasConfirmedInterviewStart || isSessionReady) return;
    setStatusMessage(
      isAudioPrimed
        ? "준비가 완료되었습니다. 면접 시작을 누르면 바로 시작됩니다."
        : "오디오를 준비한 뒤 면접 시작을 눌러주세요.",
    );
  }, [hasConfirmedInterviewStart, isAudioPrimed, isSessionReady]);

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



  const avatarState: InterviewAvatarState = isAISpeaking
    ? "speaking"
    : isAIProcessing
      ? "thinking"
      : isMicOn
        ? "listening"
        : "idle";
  const latestCaption = transcript[transcript.length - 1];
  const previousCaption = transcript[transcript.length - 2];
  const activeAiCaption = formatStreamingTranscriptForDisplay(streamingAiCaption.trim(), "ai");
  const activeUserCaption = formatStreamingTranscriptForDisplay(streamingUserCaption.trim(), "user");
  const committedUserCaptionText = committedUserCaption
    ? formatTranscriptForDisplay(committedUserCaption.text, "user")
    : "";
  const committedUserCaptionTurnId = committedUserCaption?.turnId ?? "";
  const activeCaptionRole: "ai" | "user" | null = activeAiCaption
    ? "ai"
    : (activeUserCaption && !isAIProcessing && !isAISpeaking ? "user" : null);
  const activeCaptionText = activeCaptionRole === "ai" ? activeAiCaption : activeUserCaption;
  const latestCaptionText = latestCaption
    ? formatTranscriptForDisplay(latestCaption.text, latestCaption.role)
    : "";
  const previousCaptionText = previousCaption
    ? formatTranscriptForDisplay(previousCaption.text, previousCaption.role)
    : "";
  const fallbackCaptionRole = stickyCaption?.role ?? null;
  const fallbackCaptionText = stickyCaption ? formatTranscriptForDisplay(stickyCaption.text, stickyCaption.role) : "";
  const fallbackCaptionTurnId = stickyCaption?.turnId ?? "";
  const latestCaptionTurnId = latestCaption?.turnId ?? "";
  const sameTurnAiCaption =
    latestCaption?.role === "ai"
    && latestCaptionTurnId
    && latestCaptionTurnId === streamingAiTurnId
      ? preferLongerCaption(activeAiCaption, latestCaptionText)
      : activeAiCaption;
  const latestOrFallbackRole =
    latestCaption && latestCaptionText
      ? latestCaption.role
      : fallbackCaptionRole;
  const stableLatestCaptionText =
    latestCaption
      && latestCaptionText
      && fallbackCaptionRole === latestCaption.role
      ? preferLongerCaption(latestCaptionText, fallbackCaptionText)
      : (latestCaptionText || fallbackCaptionText);
  const aiStickyCaption =
    fallbackCaptionRole === "ai"
      ? fallbackCaptionText
      : "";
  const aiPresentationText =
    sameTurnAiCaption
    || (((isAISpeaking || isAIProcessing) && aiStickyCaption) ? aiStickyCaption : "");
  const latestUserCaptionText =
    latestCaption?.role === "user" && isGoogleTranscriptProvider(latestCaption.provider)
      ? stableLatestCaptionText
      : "";
  const committedUserPresentationText = committedUserCaptionText || latestUserCaptionText;
  const isAiPrimary = Boolean(aiPresentationText) && (isAISpeaking || Boolean(sameTurnAiCaption));
  const userPresentationText =
    isAIProcessing && !isAISpeaking
      ? committedUserPresentationText
      : (activeUserCaption || committedUserPresentationText);
  const resolvedCaptionRole =
    activeCaptionRole
    ?? (isAiPrimary ? "ai" : (userPresentationText ? "user" : latestOrFallbackRole));
  const resolvedCaptionText =
    (isAiPrimary ? aiPresentationText : userPresentationText)
    || committedUserPresentationText;
  const secondaryCaption = (() => {
    if ((resolvedCaptionRole === "ai" || isAISpeaking || isAIProcessing) && committedUserCaption?.text) {
      const userText = committedUserCaptionText;
      if (userText && userText !== resolvedCaptionText) {
        return {
          role: "user" as const,
          text: userText,
          turnId: committedUserCaptionTurnId,
        };
      }
    }
    const candidates = [
      latestCaption && latestCaptionText
        ? { role: latestCaption.role, text: latestCaptionText, turnId: latestCaptionTurnId }
        : null,
      previousCaption && previousCaptionText
        ? { role: previousCaption.role, text: previousCaptionText, turnId: previousCaption.turnId ?? "" }
        : null,
      stickyCaption && fallbackCaptionText
        ? { role: stickyCaption.role, text: fallbackCaptionText, turnId: fallbackCaptionTurnId }
        : null,
    ].filter(Boolean) as Array<{ role: "ai" | "user"; text: string; turnId: string }>;

    for (const candidate of candidates) {
      if (!candidate.text) continue;
      if (candidate.role === resolvedCaptionRole && candidate.text === resolvedCaptionText) continue;
      if (resolvedCaptionRole && candidate.role === resolvedCaptionRole) continue;
      return candidate;
    }
    return null;
  })();

  useEffect(() => {
    if (activeCaptionRole && activeCaptionText) {
      const nextTurnId =
        activeCaptionRole === "ai" ? streamingAiTurnId : streamingUserTurnId;
      setStickyCaption({ role: activeCaptionRole, text: activeCaptionText, turnId: nextTurnId });
      return;
    }
    if (latestCaption && latestCaptionText) {
      const nextText =
        latestCaption.role === "ai" && fallbackCaptionRole === "ai" && fallbackCaptionTurnId === latestCaptionTurnId
          ? preferLongerCaption(latestCaptionText, fallbackCaptionText)
          : latestCaptionText;
      setStickyCaption({ role: latestCaption.role, text: nextText, turnId: latestCaptionTurnId });
    }
  }, [
    activeCaptionRole,
    activeCaptionText,
    fallbackCaptionRole,
    fallbackCaptionText,
    fallbackCaptionTurnId,
    latestCaption,
    latestCaptionText,
    latestCaptionTurnId,
    streamingAiTurnId,
    streamingUserTurnId,
  ]);

  useEffect(() => {
    const node = captionScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [activeAiCaption, activeUserCaption, resolvedCaptionText, secondaryCaption?.text, transcript.length]);

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
      if (!isAudioPrimed) {
        const ready = await prepareAudio();
        if (!ready) {
          setStatusMessage("오디오 재생을 시작하지 못했습니다. 브라우저에서 사운드 자동재생을 허용해 주세요.");
          return;
        }
        setIsAudioPrimed(true);
      }
      setHasConfirmedInterviewStart(true);
      setStatusMessage("준비가 완료되었습니다. 첫 질문을 불러오는 중...");
    } finally {
      setIsPrimingAudio(false);
    }
  };

  const completeSession = useCallback(async ({
    interruptAudio = false,
    status,
  }: {
    interruptAudio?: boolean;
    status: string;
  }) => {
    if (!activeSessionId) {
      routeToSetup();
      return false;
    }

    if (isFinishingSession) return false;

    setIsFinishingSession(true);
    setStatusMessage(status);
    try {
      if (interruptAudio) {
        disconnect();
      }
      const response = await fetch(`/api/interview/sessions/${activeSessionId}/complete`, {
        method: "POST",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "면접 종료 처리에 실패했습니다.");
      }
      completionRedirectedRef.current = true;
      if (!interruptAudio) {
        disconnect();
      }
      router.push(buildResultPath(activeSessionId));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "면접 종료 처리에 실패했습니다.";
      setStatusMessage(message);
      return false;
    } finally {
      setIsFinishingSession(false);
    }
  }, [activeSessionId, buildResultPath, disconnect, isFinishingSession, routeToSetup, router]);

  const handleFinish = async () => {
    await completeSession({
      status: "면접 종료와 리포트 생성을 요청하는 중...",
    });
  };

  useEffect(() => {
    if (
      !isSessionReady
      || !activeSessionId
      || runtimeMeta.interviewComplete
      || completionRedirectedRef.current
      || isFinishingSession
      || runtimeMeta.remainingSec > 0
    ) {
      return;
    }

    completionRedirectedRef.current = true;
    void (async () => {
      const completed = await completeSession({
        interruptAudio: true,
        status: "면접 시간이 종료되어 결과를 정리하는 중...",
      });
      if (!completed) {
        completionRedirectedRef.current = false;
      }
    })();
  }, [
    activeSessionId,
    completeSession,
    isFinishingSession,
    isSessionReady,
    runtimeMeta.interviewComplete,
    runtimeMeta.remainingSec,
  ]);

  const isUserSpeaking = Boolean(isMicOn && (activeUserCaption || volume > 0.1));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full flex-col bg-background p-4 md:p-6 font-sans antialiased text-foreground">
      
      {/* Top Header Bar */}
      <div className="flex shrink-0 items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 font-semibold shadow-sm">
            {sessionType === "portfolio_defense" ? "PORTFOLIO DEFENSE" : "LIVE INTERVIEW"}
          </Badge>
          {displayCompany && (
            <Badge variant="outline" className="border-border text-muted-foreground bg-muted/30 px-2 py-1 font-medium hidden sm:inline-flex">
              {displayCompany} {displayRole ? `· ${displayRole}` : ""}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isConnected ? 'bg-primary' : 'bg-destructive'}`}></span>
              <span className={`relative inline-flex h-2 w-2 rounded-full ${isConnected ? 'bg-primary' : 'bg-destructive'}`}></span>
            </span>
            {isConnected ? "Connected" : "Connecting"}
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono text-sm font-bold shadow-sm transition-colors ${
            runtimeMeta.remainingSec <= 60 
              ? 'border-destructive bg-destructive/10 text-destructive animate-pulse' 
              : 'border-border bg-card text-foreground'
          }`}>
            <Clock3 className={`h-4 w-4 ${runtimeMeta.remainingSec <= 60 ? 'text-destructive' : 'text-primary'}`} />
            {formatTime(runtimeMeta.remainingSec)}
          </div>
        </div>
      </div>

      {/* Video Feeds Grid */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row relative">
        {/* AI Interviewer View */}
        <section className={`relative flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 ${
          isAISpeaking 
            ? 'border-primary ring-2 ring-primary/20 shadow-[0_4px_20px_rgba(130,184,76,0.15)]' // Using Dibut Green
            : 'border-border shadow-sm'
        }`}>
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-md bg-background/90 px-3 py-1.5 text-xs font-bold text-foreground shadow-sm border border-border/50">
            <div className={`h-2 w-2 rounded-full ${isAISpeaking ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
            Dibut 면접관
          </div>
          <div className="flex h-full w-full items-center justify-center bg-white px-4 md:px-8">
            <TalkingHeadInterviewer
              state={avatarState}
              className="h-full w-full max-w-[520px]"
            />
            {isAISpeaking && (
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-end gap-1">
                {[4, 8, 12, 8, 4].map((height, index) => (
                  <span
                    key={`wave-ai-${index}`}
                    className="w-1.5 rounded-full bg-primary shadow-sm"
                    style={{ height: `${height}px`, animation: `pulse-voice 1.2s ease-in-out infinite`, animationDelay: `${index * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Candidate View */}
        <section className={`relative flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 ${
          isUserSpeaking
            ? 'border-primary ring-2 ring-primary/20 shadow-[0_4px_20px_rgba(130,184,76,0.15)]'
            : 'border-border shadow-sm'
        }`}>
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-md bg-background/90 px-3 py-1.5 text-xs font-bold text-foreground shadow-sm border border-border/50">
            <div className={`h-2 w-2 rounded-full ${isUserSpeaking ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
            지원자
          </div>
          <div className="h-full w-full overflow-hidden bg-muted/40 [&>video]:object-cover [&>video]:scale-105">
            <LocalCameraPreview enabled fill />
          </div>
          {isUserSpeaking && (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-end gap-1 z-20">
              {[3, 6, 9, 6, 3].map((height, index) => (
                <span
                  key={`wave-user-${index}`}
                  className="w-1 rounded-full bg-primary shadow-sm"
                  style={{ height: `${height}px`, animation: `pulse-voice 1.2s ease-in-out infinite`, animationDelay: `${index * 0.15}s` }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Video Overlay Captions */}
        {showCaption && (
          <div className="absolute bottom-5 left-0 right-0 flex w-full flex-col px-4 md:px-8 z-40 transition-all pointer-events-none">
            {resolvedCaptionText || activeAiCaption || activeUserCaption ? (
              <div className="mx-auto w-full max-w-2xl rounded-[18px] border border-border/30 bg-background/30 backdrop-blur-md px-5 py-2.5 text-center shadow-sm transition-all duration-300 pointer-events-auto">
                <div ref={captionScrollRef} className="flex flex-col items-center gap-0.5 max-h-[8rem] overflow-y-auto overscroll-contain px-2">
                  {secondaryCaption && (
                    <p className="text-[10px] font-bold text-muted-foreground/80 tracking-widest line-clamp-1 uppercase">
                      {secondaryCaption.role === "ai" ? "Dibut" : "나"}: {secondaryCaption.text}
                    </p>
                  )}
                  {resolvedCaptionText && (
                    <div className="flex w-full justify-center mt-0.5">
                      <div className="flex items-start text-left text-[13px] md:text-[14px] font-bold leading-relaxed tracking-tight text-foreground drop-shadow-sm max-w-full">
                        <span className={`shrink-0 mr-2 font-extrabold mt-[0.5px] ${resolvedCaptionRole === "ai" ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)_/_0.3)]" : "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"}`}>
                          {resolvedCaptionRole === "ai" ? "Dibut" : "나"}
                        </span>
                        <div className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                          {resolvedCaptionText}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

      </div>

      {/* Reconnecting Modal */}
      {isReconnecting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm flex flex-col items-center text-center overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-xl">
             <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-5">
               <WifiOff className="h-6 w-6" />
             </div>
             <h3 className="text-lg font-bold text-foreground">재연결 시도중...</h3>
             <p className="mt-2 text-sm text-muted-foreground">
               연결이 복구될 때까지 면접을 잠시 멈췄습니다.
             </p>
             <div className="mt-6 flex w-full flex-col items-center">
               <div className="flex w-full justify-between text-xs font-semibold text-muted-foreground mb-2">
                 <span>남은 재연결 시간</span>
                 <span className="text-destructive">{reconnectRemainingSec}초</span>
               </div>
               <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                 <div className="h-full bg-destructive transition-all duration-1000 ease-linear" style={{ width: `${(reconnectRemainingSec / RECONNECT_GRACE_SEC) * 100}%` }} />
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Audio Priming Modal */}
      {!hasConfirmedInterviewStart && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
           <div className="mx-4 w-full max-w-md flex flex-col items-center text-center overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-5">
               <Mic className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">면접 시작 준비</h3>
            <p className="text-sm text-muted-foreground mb-8">
              {isAudioPrimed
                ? "준비는 완료되었습니다. 면접 시작을 누르면 첫 질문이 바로 재생됩니다."
                : "첫 질문 음성이 브라우저 자동재생 제한에 막히지 않도록, 시작 전에 한 번 눌러 오디오를 활성화합니다."}
            </p>
            <Button
              size="lg"
              className="w-full text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              onClick={handlePrimeAudio}
              disabled={isPrimingAudio}
            >
              {isPrimingAudio ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isPrimingAudio ? "준비 중..." : "면접 시작하기"}
            </Button>
          </div>
        </div>
      )}

      {/* Refined Minimalist Bottom Control Area */}
      <div className="mt-4 flex shrink-0 flex-col items-center justify-end w-full pb-4 relative z-20">
        
        {/* Invisible Container Floating Controls */}
        <div className="mt-2 flex shrink-0 flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 md:px-8 w-full z-20 mb-2">
           
           {/* Left Info Group */}
           <div className="flex flex-col gap-1 md:w-1/2 ml-1">
             <div className="flex items-center gap-2">
               <span className="inline-flex items-center rounded-md border border-border/50 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold bg-secondary/50 backdrop-blur-sm text-secondary-foreground transition-colors">
                 {runtimeMeta.isClosingPhase ? "마무리" : "면접 진행중"}
               </span>
               <span className="text-[11px] sm:text-[12px] font-bold tracking-widest text-muted-foreground uppercase pt-[1px] drop-shadow-sm">
                 핵심 역량 검증
               </span>
             </div>
             <div className="text-sm sm:text-[15px] font-semibold text-foreground mt-0.5 truncate max-w-full pl-0.5 drop-shadow-sm">
               {statusMessage || "AI가 대화를 분석하고 있습니다."}
             </div>
           </div>

           {/* Right-Aligned Primary Buttons */}
           <div className="flex gap-2.5 items-center w-full md:w-auto justify-end">
             
             {/* Unified Mic + Audio Status Button */}
             <Button
                size="default"
                variant={isMicOn ? "default" : "outline"}
                className={`h-11 px-3.5 sm:px-4 rounded-xl font-bold shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${
                  isMicOn 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent" 
                    : "bg-background/80 backdrop-blur-sm text-muted-foreground hover:bg-muted border-border/60"
                }`}
                disabled={isReconnecting}
                onClick={handleMicToggle}
              >
                {isAIProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline-block tracking-wide text-sm">응답 대기 중...</span>
                  </>
                ) : (
                  <>
                    {isMicOn ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
                    <div className="h-4 w-[1px] bg-current opacity-30 mx-0.5" />
                    <span className="text-sm w-9 text-left font-bold tracking-wider">
                      {isMicOn ? `${Math.round(volume * 100)}%` : 'OFF'}
                    </span>
                  </>
                )}
             </Button>

             {/* CC Toggle */}
             <Button
                size="icon"
                variant={showCaption ? "default" : "outline"}
                className={`h-11 w-11 rounded-xl font-bold shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0 ${
                  showCaption 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent' 
                    : 'bg-background/80 backdrop-blur-sm text-muted-foreground hover:bg-muted border-border/60'
                }`}
                onClick={() => setShowCaption((prev) => !prev)}
                title={showCaption ? "자막 끄기" : "자막 켜기"}
              >
                <Captions className="h-4.5 w-4.5" />
             </Button>

             {/* End Call */}
             <Button 
                size="default" 
                variant="destructive" 
                className="h-11 rounded-xl px-4 sm:px-5 font-bold shadow-sm transition-all hover:scale-105 active:scale-95 border-transparent text-sm tracking-wide shrink-0 ml-0.5" 
                onClick={() => void handleFinish()} 
                disabled={isFinishingSession}
              >
                {isFinishingSession ? <Loader2 className="mr-2 h-4.5 w-4.5 animate-spin" /> : <PhoneOff className="mr-2 h-4.5 w-4.5" />}
                {isFinishingSession ? "종료..." : "종료"}
             </Button>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-voice {
          0%, 100% { transform: scaleY(0.6); opacity: 0.6; }
          50% { transform: scaleY(1.3); opacity: 1; }
        }
      `}} />
    </div>
  );
}
