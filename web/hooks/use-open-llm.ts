"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AudioProcessor } from "@/lib/audio-utils";

const AUDIO_UNLOCK_NOTICE_COOLDOWN_MS = 3000;
const MIC_RESTART_COOLDOWN_MS = 280;
const RECONNECT_BASE_DELAY_MS = 900;
const RECONNECT_MAX_DELAY_MS = 4000;

export interface WsInterviewInitPayload {
  sessionId?: string;
  sessionType?: "live_interview" | "portfolio_defense";
  style?: string;
  targetDurationSec?: number;
  closingThresholdSec?: number;
  llmStreamMode?: "final" | "delta";
  ttsMode?: "server" | "full" | "sentence" | "client";
  jobData?: Record<string, unknown>;
  resumeData?: Record<string, unknown>;
  jd?: string;
  resume?: string;
}

interface UseOpenLLMProps {
  serverUrl?: string;
  onTranscript?: (text: string, role: "user" | "ai") => void;
  onEvent?: (event: Record<string, unknown>) => void;
}

interface StartMicOptions {
  userGesture?: boolean;
}

interface PendingAudioChunk {
  audio: number[];
  sampleRate: number;
  turnSeq: number;
}

function decodePcm16Base64(base64Data: unknown): number[] {
  if (typeof base64Data !== "string" || !base64Data) return [];
  if (typeof window === "undefined" || typeof window.atob !== "function") return [];

  try {
    const binary = window.atob(base64Data);
    if (binary.length < 2) return [];

    const sampleCount = Math.floor(binary.length / 2);
    const output = new Array<number>(sampleCount);
    for (let i = 0; i < sampleCount; i += 1) {
      const lo = binary.charCodeAt(i * 2);
      const hi = binary.charCodeAt(i * 2 + 1);
      let int16 = (hi << 8) | lo;
      if (int16 & 0x8000) int16 -= 0x10000;
      output[i] = int16 / 32768;
    }
    return output;
  } catch {
    return [];
  }
}

function extractTurnSeq(turnId: unknown): number {
  if (typeof turnId !== "string" || !turnId.trim()) return 0;
  const tail = turnId.split(":").pop() || "";
  const seq = Number(tail);
  return Number.isFinite(seq) && seq > 0 ? seq : 0;
}

export function useOpenLLM({
  serverUrl = process.env.NEXT_PUBLIC_AI_WS_URL || "ws://localhost:8001/v1/interview/ws/client",
  onTranscript,
  onEvent,
}: UseOpenLLMProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [volume, setVolume] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const isMicStreamingRef = useRef(false);
  const isMicStartingRef = useRef(false);
  const pendingStartMicRef = useRef(false);
  const queuedAudioSourcesRef = useRef(0);
  const pendingAudioQueueRef = useRef<PendingAudioChunk[]>([]);
  const lastAudioSignatureRef = useRef("");
  const latestAiTurnSeqRef = useRef(0);
  const pendingPlaybackCompleteTurnIdRef = useRef("");
  const lastCompletedPlaybackTurnIdRef = useRef("");
  const audioUnlockedRef = useRef(false);
  const lastAudioUnlockNoticeAtRef = useRef(0);
  const pendingMicRestartTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const manualDisconnectRef = useRef(false);
  const lastInitPayloadRef = useRef<WsInterviewInitPayload | null>(null);
  const startMicRef = useRef<(options?: StartMicOptions) => Promise<void>>(async () => {});
  const onTranscriptRef = useRef(onTranscript);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const getOrCreateAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      return audioContextRef.current;
    }
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContextRef.current = new AudioContextClass();
    return audioContextRef.current;
  }, []);

  const notifyAudioGestureRequired = useCallback(() => {
    const now = Date.now();
    if (now - lastAudioUnlockNoticeAtRef.current < AUDIO_UNLOCK_NOTICE_COOLDOWN_MS) return;
    lastAudioUnlockNoticeAtRef.current = now;
    onEventRef.current?.({
      type: "audio-gesture-required",
      message: "브라우저 자동재생 제한으로 음성 재생이 차단되었습니다. 화면을 한 번 클릭하거나 마이크 버튼을 눌러 주세요.",
    });
  }, []);

  const stopMic = useCallback((flush: boolean = true) => {
    audioProcessorRef.current?.stop();
    audioProcessorRef.current = null;
    isMicStreamingRef.current = false;
    setIsMicOn(false);
    setVolume(0);

    if (flush && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "flush-audio" }));
    }
  }, []);

  const clearPendingMicRestart = useCallback(() => {
    if (pendingMicRestartTimerRef.current === null) return;
    window.clearTimeout(pendingMicRestartTimerRef.current);
    pendingMicRestartTimerRef.current = null;
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current === null) return;
    window.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }, []);

  const schedulePendingMicRestart = useCallback(() => {
    clearPendingMicRestart();
    pendingMicRestartTimerRef.current = window.setTimeout(() => {
      pendingMicRestartTimerRef.current = null;
      if (!pendingStartMicRef.current) return;
      pendingStartMicRef.current = false;
      void startMicRef.current();
    }, MIC_RESTART_COOLDOWN_MS);
  }, [clearPendingMicRestart]);

  const scheduleAudioChunk = useCallback((audioData: number[], sampleRate: number): boolean => {
    const ctx = getOrCreateAudioContext();
    if (!ctx || !audioData.length || ctx.state !== "running") return false;

    const normalizedRate = Number.isFinite(sampleRate) && sampleRate > 1000 ? sampleRate : 24000;
    const buffer = ctx.createBuffer(1, audioData.length, normalizedRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < audioData.length; i += 1) {
      channelData[i] = audioData[i];
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    const minLeadSec = 0.04;
    if (nextStartTimeRef.current < currentTime + minLeadSec) {
      nextStartTimeRef.current = currentTime + minLeadSec;
    }

    queuedAudioSourcesRef.current += 1;
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;

    source.onended = () => {
      queuedAudioSourcesRef.current = Math.max(0, queuedAudioSourcesRef.current - 1);
      const hasQueuedAudio =
        queuedAudioSourcesRef.current > 0 ||
        nextStartTimeRef.current > ctx.currentTime + 0.03 ||
        pendingAudioQueueRef.current.length > 0;
      if (!hasQueuedAudio) {
        setIsAISpeaking(false);
        const completedTurnId = pendingPlaybackCompleteTurnIdRef.current;
        if (completedTurnId) {
          sendPlaybackComplete(completedTurnId);
        }
        if (pendingStartMicRef.current) {
          schedulePendingMicRestart();
        }
      }
    };

    return true;
  }, [getOrCreateAudioContext, schedulePendingMicRestart, sendPlaybackComplete]);

  const flushPendingAudioQueue = useCallback(() => {
    if (!audioUnlockedRef.current) return;
    if (!pendingAudioQueueRef.current.length) return;

    clearPendingMicRestart();
    if (isMicStreamingRef.current) {
      stopMic(false);
    }
    setIsAIProcessing(false);
    setIsAISpeaking(true);

    const queued = pendingAudioQueueRef.current;
    pendingAudioQueueRef.current = [];
    for (let idx = 0; idx < queued.length; idx += 1) {
      const chunk = queued[idx];
      const scheduled = scheduleAudioChunk(chunk.audio, chunk.sampleRate);
      if (scheduled) continue;
      pendingAudioQueueRef.current = queued.slice(idx);
      break;
    }
  }, [clearPendingMicRestart, scheduleAudioChunk, stopMic]);

  const unlockAudioContext = useCallback(async (fromUserGesture: boolean): Promise<boolean> => {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return false;
    if (ctx.state === "running") {
      audioUnlockedRef.current = true;
      flushPendingAudioQueue();
      return true;
    }
    if (!fromUserGesture) {
      notifyAudioGestureRequired();
      return false;
    }

    try {
      await ctx.resume();
      audioUnlockedRef.current = ctx.state === "running";
      if (!audioUnlockedRef.current) {
        notifyAudioGestureRequired();
        return false;
      }
      flushPendingAudioQueue();
      return audioUnlockedRef.current;
    } catch {
      notifyAudioGestureRequired();
      return false;
    }
  }, [flushPendingAudioQueue, getOrCreateAudioContext, notifyAudioGestureRequired]);

  useEffect(() => {
    const onUserGesture = () => {
      void unlockAudioContext(true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("pointerdown", onUserGesture, { passive: true });
      window.addEventListener("keydown", onUserGesture);
      window.addEventListener("touchstart", onUserGesture, { passive: true });
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("pointerdown", onUserGesture);
        window.removeEventListener("keydown", onUserGesture);
        window.removeEventListener("touchstart", onUserGesture);
      }
      clearPendingMicRestart();
      clearReconnectTimer();
      audioContextRef.current?.close();
    };
  }, [clearPendingMicRestart, clearReconnectTimer, unlockAudioContext]);

  const sendJson = useCallback((payload: Record<string, unknown>) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  const sendPlaybackComplete = useCallback((turnId: string) => {
    const normalized = turnId.trim();
    if (!normalized) return false;
    if (normalized === lastCompletedPlaybackTurnIdRef.current) {
      pendingPlaybackCompleteTurnIdRef.current = "";
      return true;
    }
    const sent = sendJson({ type: "audio-playback-complete", turnId: normalized });
    if (!sent) return false;
    lastCompletedPlaybackTurnIdRef.current = normalized;
    pendingPlaybackCompleteTurnIdRef.current = "";
    return true;
  }, [sendJson]);

  const initInterviewSession = useCallback((payload: WsInterviewInitPayload = {}) => {
    lastInitPayloadRef.current = {
      ...payload,
      ttsMode: payload.ttsMode || "server",
    };
    return sendJson({
      type: "init-interview-session",
      sessionId: payload.sessionId,
      sessionType: payload.sessionType || "live_interview",
      style: payload.style || "professional",
      targetDurationSec: payload.targetDurationSec,
      closingThresholdSec: payload.closingThresholdSec,
      llmStreamMode: payload.llmStreamMode,
      ttsMode: payload.ttsMode || "server",
      jobData: payload.jobData,
      resumeData: payload.resumeData,
      jd: payload.jd,
      resume: payload.resume,
    });
  }, [sendJson]);

  const startMic = useCallback(async (options: StartMicOptions = {}) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    if (isMicStreamingRef.current || isMicStartingRef.current) return;
    isMicStartingRef.current = true;

    try {
      if (options.userGesture) {
        await unlockAudioContext(true);
      }

      audioProcessorRef.current = new AudioProcessor((data) => {
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          sum += data[i] * data[i];
        }
        const rms = Math.sqrt(sum / data.length);
        setVolume(Math.min(rms * 10, 1));

        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: "raw-audio-data",
            audio: Array.from(data),
          }));
        }
      });

      await audioProcessorRef.current.start();
      isMicStreamingRef.current = true;
      setIsMicOn(true);
      setIsAIProcessing(false);
    } catch (error) {
      console.error("Mic start failed", error);
      const isPermissionError =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
      onEventRef.current?.({
        type: "mic-error",
        message: isPermissionError
          ? "마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요."
          : "마이크를 시작할 수 없습니다. 마이크 연결 상태를 확인해주세요.",
      });
    } finally {
      isMicStartingRef.current = false;
    }
  }, [unlockAudioContext]);

  useEffect(() => {
    startMicRef.current = startMic;
  }, [startMic]);

  const playAudioChunk = useCallback((audioData: number[], sampleRate: number, turnSeq: number): boolean => {
    const ctx = getOrCreateAudioContext();
    if (!ctx || !audioData.length) return false;

    const normalizedRate = Number.isFinite(sampleRate) && sampleRate > 1000 ? sampleRate : 24000;
    if (!audioUnlockedRef.current || ctx.state !== "running") {
      pendingAudioQueueRef.current.push({
        audio: audioData,
        sampleRate: normalizedRate,
        turnSeq,
      });
      if (pendingAudioQueueRef.current.length > 64) {
        pendingAudioQueueRef.current = pendingAudioQueueRef.current.slice(-64);
      }
      notifyAudioGestureRequired();
      return true;
    }

    return scheduleAudioChunk(audioData, normalizedRate);
  }, [getOrCreateAudioContext, notifyAudioGestureRequired, scheduleAudioChunk]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    clearReconnectTimer();
    clearPendingMicRestart();
    pendingStartMicRef.current = false;
    queuedAudioSourcesRef.current = 0;
    pendingAudioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    lastAudioSignatureRef.current = "";
    latestAiTurnSeqRef.current = 0;
    pendingPlaybackCompleteTurnIdRef.current = "";
    lastCompletedPlaybackTurnIdRef.current = "";
    audioUnlockedRef.current = false;
    socketRef.current?.close();
    socketRef.current = null;
    stopMic(false);
    setIsAIProcessing(false);
    setIsAISpeaking(false);
  }, [clearPendingMicRestart, clearReconnectTimer, stopMic]);

  const handleServerMessage = useCallback((data: unknown) => {
    if (!data || typeof data !== "object") return;
    const event = data as Record<string, unknown>;
    const eventType = typeof event.type === "string" ? event.type : "";

    onEventRef.current?.(event);

    if (eventType === "interview-session-created") {
      const uid = typeof event.client_uid === "string" ? event.client_uid : "";
      if (uid && lastInitPayloadRef.current) {
        lastInitPayloadRef.current = {
          ...lastInitPayloadRef.current,
          sessionId: uid,
        };
      }
    }

    if (eventType === "audio") {
      if (!Array.isArray(event.audio) && typeof event.audioBase64 !== "string") return;

      const turnSeq = extractTurnSeq(event.turnId);
      if (turnSeq > 0 && turnSeq < latestAiTurnSeqRef.current) return;
      if (turnSeq > 0) {
        latestAiTurnSeqRef.current = Math.max(latestAiTurnSeqRef.current, turnSeq);
        const floorTurnSeq = latestAiTurnSeqRef.current;
        pendingAudioQueueRef.current = pendingAudioQueueRef.current.filter((chunk) => chunk.turnSeq >= floorTurnSeq);
      }

      const packetSeq =
        typeof event.packetSeq === "number" ? String(event.packetSeq) : String(event.chunkIndex ?? "na");
      const audioLengthHint = Array.isArray(event.audio)
        ? event.audio.length
        : (typeof event.audioBase64 === "string" ? event.audioBase64.length : 0);
      const signature = `${turnSeq}:${packetSeq}:${audioLengthHint}:${String(event.isFinalChunk ?? false)}`;
      if (lastAudioSignatureRef.current === signature) return;
      lastAudioSignatureRef.current = signature;

      const audio = Array.isArray(event.audio)
        ? event.audio.filter((value): value is number => typeof value === "number")
        : decodePcm16Base64(event.audioBase64);
      if (!audio.length) return;
      const turnId = typeof event.turnId === "string" ? event.turnId : "";
      if (event.isFinalChunk === true && turnId) {
        pendingPlaybackCompleteTurnIdRef.current = turnId;
      }

      clearPendingMicRestart();
      const scheduled = playAudioChunk(audio, Number(event.sampleRate) || 24000, turnSeq);
      if (!scheduled) return;
      if (isMicStreamingRef.current) {
        stopMic(false);
      }
      setIsAIProcessing(false);
      setIsAISpeaking(true);
      return;
    }

    if (eventType === "transcript.final") {
      if ((event.role === "user" || event.role === "ai") && typeof event.text === "string") {
        if (event.role === "ai") {
          const turnSeq = extractTurnSeq(event.turnId);
          if (turnSeq > 0) {
            latestAiTurnSeqRef.current = Math.max(latestAiTurnSeqRef.current, turnSeq);
          }
        }
        onTranscriptRef.current?.(event.text, event.role);
      }
      return;
    }

    if (eventType === "transcript.delta") {
      if (event.role === "ai") {
        const turnSeq = extractTurnSeq(event.turnId);
        if (turnSeq > 0) {
          latestAiTurnSeqRef.current = Math.max(latestAiTurnSeqRef.current, turnSeq);
        }
      }
      return;
    }

    if (eventType === "full-text") {
      const turnSeq = extractTurnSeq(event.turnId);
      if (turnSeq > 0) {
        latestAiTurnSeqRef.current = Math.max(latestAiTurnSeqRef.current, turnSeq);
      }
      return;
    }

    if (eventType === "avatar.state") {
      const avatarState = typeof event.state === "string" ? event.state : "";
      if (avatarState === "thinking") {
        setIsAIProcessing(true);
      } else if (avatarState === "speaking") {
        setIsAIProcessing(false);
        setIsAISpeaking(true);
      } else if (avatarState === "listening" || avatarState === "idle") {
        setIsAIProcessing(false);
        const hasQueuedAudio = queuedAudioSourcesRef.current > 0;
        if (!hasQueuedAudio) {
          setIsAISpeaking(false);
        }
      }
      return;
    }

    if (eventType === "control") {
      const controlText = typeof event.text === "string" ? event.text : "";

      if (controlText === "interrupt") {
        clearPendingMicRestart();
        pendingStartMicRef.current = false;
        nextStartTimeRef.current = 0;
        queuedAudioSourcesRef.current = 0;
        pendingAudioQueueRef.current = [];
        pendingPlaybackCompleteTurnIdRef.current = "";
        setIsAIProcessing(false);
        setIsAISpeaking(false);
        return;
      }

      if (controlText === "mic-audio-end") {
        stopMic(false);
        setIsAIProcessing(true);
        return;
      }

      if (controlText === "start-mic") {
        const controlTurnSeq = extractTurnSeq(event.turnId);
        if (controlTurnSeq > 0 && controlTurnSeq < latestAiTurnSeqRef.current) {
          return;
        }

        const ctx = audioContextRef.current;
        const hasQueuedAudio =
          queuedAudioSourcesRef.current > 0 ||
          (Boolean(ctx) && nextStartTimeRef.current > (ctx?.currentTime || 0) + 0.02);

        if (hasQueuedAudio) {
          pendingStartMicRef.current = true;
        } else {
          clearPendingMicRestart();
          void startMic();
        }
      }
    }
  }, [clearPendingMicRestart, playAudioChunk, startMic, stopMic]);

  const connect = useCallback(() => {
    if (
      socketRef.current?.readyState === WebSocket.OPEN ||
      socketRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const ws = new WebSocket(serverUrl);
    socketRef.current = ws;
    manualDisconnectRef.current = false;
    lastAudioSignatureRef.current = "";
    pendingPlaybackCompleteTurnIdRef.current = "";
    lastCompletedPlaybackTurnIdRef.current = "";

    ws.onopen = () => {
      clearReconnectTimer();
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      if (lastInitPayloadRef.current?.sessionId) {
        socketRef.current?.send(JSON.stringify({
          type: "init-interview-session",
          sessionId: lastInitPayloadRef.current.sessionId,
          sessionType: lastInitPayloadRef.current.sessionType || "live_interview",
          style: lastInitPayloadRef.current.style || "professional",
          targetDurationSec: lastInitPayloadRef.current.targetDurationSec,
          closingThresholdSec: lastInitPayloadRef.current.closingThresholdSec,
          llmStreamMode: lastInitPayloadRef.current.llmStreamMode,
          ttsMode: lastInitPayloadRef.current.ttsMode || "server",
          jobData: lastInitPayloadRef.current.jobData,
          resumeData: lastInitPayloadRef.current.resumeData,
          jd: lastInitPayloadRef.current.jd,
          resume: lastInitPayloadRef.current.resume,
        }));
        onEventRef.current?.({
          type: "socket-resumed",
          message: "연결이 복구되어 이전 면접 세션을 복원 중입니다.",
        });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      clearPendingMicRestart();
      stopMic(false);
      pendingAudioQueueRef.current = [];
      pendingPlaybackCompleteTurnIdRef.current = "";
      lastCompletedPlaybackTurnIdRef.current = "";
      audioUnlockedRef.current = false;
      setIsAIProcessing(false);
      setIsAISpeaking(false);
      if (!manualDisconnectRef.current && lastInitPayloadRef.current?.sessionId) {
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(
          RECONNECT_MAX_DELAY_MS,
          RECONNECT_BASE_DELAY_MS * reconnectAttemptsRef.current,
        );
        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          onEventRef.current?.({
            type: "socket-reconnecting",
            message: "연결이 끊겨 자동으로 재연결을 시도합니다.",
            attempt: reconnectAttemptsRef.current,
          });
          connect();
        }, delay);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        handleServerMessage(data);
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };
  }, [clearPendingMicRestart, clearReconnectTimer, handleServerMessage, serverUrl, stopMic]);

  return {
    connect,
    disconnect,
    initInterviewSession,
    sendJson,
    startMic,
    stopMic,
    isConnected,
    isMicOn,
    isAIProcessing,
    isAISpeaking,
    volume,
  };
}
