"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AudioProcessor } from "@/lib/audio-utils";
import {
  getInterviewPlaybackAudioContext,
  getInterviewPlaybackRecordingTap,
  isInterviewPlaybackAudioReady,
  prepareInterviewPlaybackAudio,
  releaseInterviewPlaybackAudio,
} from "@/lib/interview/playback-audio";
import { buildApproximateVisemeTimeline } from "@/lib/interview/avatar-visemes";
import type { InterviewAvatarViseme } from "@/lib/interview/interviewer-avatar-config";

const AUDIO_UNLOCK_NOTICE_COOLDOWN_MS = 3000;
const AUDIO_DRAIN_SETTLE_MS = 10;
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
  onTranscript?: (
    text: string,
    role: "user" | "ai",
    meta?: { turnId?: string; provider?: string },
  ) => void;
  onEvent?: (event: Record<string, unknown>) => void;
}

interface StartMicOptions {
  userGesture?: boolean;
}

interface PendingAudioChunk {
  audio: number[];
  sampleRate: number;
  turnId: string;
  turnSeq: number;
}

interface AudioLevelCue {
  atMs: number;
  level: number;
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

function calculateAudioLevel(samples: number[], start = 0, end = samples.length): number {
  const safeStart = Math.max(0, Math.floor(start));
  const safeEnd = Math.min(samples.length, Math.max(safeStart, Math.floor(end)));
  if (safeEnd <= safeStart) return 0;

  let sum = 0;
  for (let i = safeStart; i < safeEnd; i += 1) {
    const sample = samples[i];
    sum += sample * sample;
  }

  const rms = Math.sqrt(sum / (safeEnd - safeStart));
  return Math.min(rms * 8, 1);
}

function buildAudioLevelTimeline(samples: number[], sampleRate: number): AudioLevelCue[] {
  if (!samples.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return [];

  const windowSize = Math.max(1, Math.round(sampleRate * 0.08));
  const cues: AudioLevelCue[] = [];
  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    cues.push({
      atMs: Math.round((start / sampleRate) * 1000),
      level: calculateAudioLevel(samples, start, end),
    });
  }

  return cues;
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
  const [aiAudioLevel, setAiAudioLevel] = useState(0);
  const [aiViseme, setAiViseme] = useState<InterviewAvatarViseme>("rest");

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
  const lastStartMicTurnIdRef = useRef("");
  const audioUnlockedRef = useRef(false);
  const lastAudioUnlockNoticeAtRef = useRef(0);
  const pendingMicRestartTimerRef = useRef<number | null>(null);
  const pendingPlaybackDrainTimerRef = useRef<number | null>(null);
  const aiAudioLevelTimersRef = useRef<number[]>([]);
  const aiVisemeTimersRef = useRef<number[]>([]);
  const aiTextByTurnIdRef = useRef<Map<string, string>>(new Map());
  const aiVisemeCursorByTurnIdRef = useRef<Map<string, number>>(new Map());
  const latestAiTextRef = useRef("");
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
    const sharedContext = getInterviewPlaybackAudioContext();
    if (!sharedContext) return null;
    audioContextRef.current = sharedContext;
    if (isInterviewPlaybackAudioReady() && sharedContext.state === "running") {
      audioUnlockedRef.current = true;
    }
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

  const pauseMic = useCallback((flush: boolean = true) => {
    // audioProcessor 도 stop + null — 그래야 다음 startMic 가 새로 시작.
    // (예전엔 살려뒀는데, startMic 의 early return 때문에 audio chunk 가 다시 안 흘러
    //  마이크 초록색이지만 volume=0 / 자막 없는 상태가 됐음)
    audioProcessorRef.current?.stop();
    audioProcessorRef.current = null;
    isMicStreamingRef.current = false;
    pendingStartMicRef.current = false;
    setIsMicOn(false);
    setVolume(0);

    if (flush && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "flush-audio" }));
    }
  }, []);

  const stopMic = useCallback((flush: boolean = true) => {
    audioProcessorRef.current?.stop();
    audioProcessorRef.current = null;
    isMicStreamingRef.current = false;
    pendingStartMicRef.current = false;
    setIsMicOn(false);
    setVolume(0);

    if (flush && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "flush-audio" }));
    }
  }, []);

  /**
   * 수동 턴 제어 — 사용자가 "전송" 버튼 클릭 시 호출.
   * - 마이크 일시정지 (mic-audio-end 신호는 백엔드가 처리 시작 시 보내옴)
   * - flush-audio 로 누적된 audio segment 종료 → 백엔드가 Gemini 에 audio_stream_end 전송
   * - AI 응답 시작
   */
  const submitTurn = useCallback(() => {
    // pauseMic(true) 이미 flush-audio 보냄
    pauseMic(true);
  }, [pauseMic]);

  /**
   * 다시 말하기 — 사용자가 발화 중에 "다시 말하기" 클릭 시 호출.
   * - 백엔드의 누적 audio buffer 폐기 (reset-audio 메시지)
   * - 마이크는 ON 상태 유지 — 사용자가 처음부터 다시 말할 수 있도록
   */
  const cancelTurn = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "reset-audio" }));
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

  const clearPendingPlaybackDrainCheck = useCallback(() => {
    if (pendingPlaybackDrainTimerRef.current === null) return;
    window.clearTimeout(pendingPlaybackDrainTimerRef.current);
    pendingPlaybackDrainTimerRef.current = null;
  }, []);

  const clearAiAudioLevelTimers = useCallback(() => {
    for (const timerId of aiAudioLevelTimersRef.current) {
      window.clearTimeout(timerId);
    }
    aiAudioLevelTimersRef.current = [];
    setAiAudioLevel(0);
  }, []);

  const clearAiVisemeTimers = useCallback(() => {
    for (const timerId of aiVisemeTimersRef.current) {
      window.clearTimeout(timerId);
    }
    aiVisemeTimersRef.current = [];
    setAiViseme("rest");
  }, []);

  const scheduleAiAudioLevel = useCallback((level: number, delayMs: number) => {
    const timerId = window.setTimeout(() => {
      aiAudioLevelTimersRef.current = aiAudioLevelTimersRef.current.filter((id) => id !== timerId);
      setAiAudioLevel(level);
    }, delayMs);
    aiAudioLevelTimersRef.current.push(timerId);
  }, []);

  const scheduleAiViseme = useCallback((viseme: InterviewAvatarViseme, delayMs: number) => {
    const timerId = window.setTimeout(() => {
      aiVisemeTimersRef.current = aiVisemeTimersRef.current.filter((id) => id !== timerId);
      setAiViseme(viseme);
    }, delayMs);
    aiVisemeTimersRef.current.push(timerId);
  }, []);

  const rememberAiTurnText = useCallback((turnId: unknown, text: unknown) => {
    if (typeof text !== "string" || !text.trim()) return;
    const normalized = text.trim();
    latestAiTextRef.current = normalized;

    if (typeof turnId !== "string" || !turnId.trim()) return;
    const normalizedTurnId = turnId.trim();
    const previous = aiTextByTurnIdRef.current.get(normalizedTurnId) || "";
    if (normalized.length >= previous.length) {
      aiTextByTurnIdRef.current.set(normalizedTurnId, normalized);
    }

    if (aiTextByTurnIdRef.current.size <= 12) return;
    const oldestTurnId = aiTextByTurnIdRef.current.keys().next().value as string | undefined;
    if (oldestTurnId) {
      aiTextByTurnIdRef.current.delete(oldestTurnId);
      aiVisemeCursorByTurnIdRef.current.delete(oldestTurnId);
    }
  }, []);

  const takeVisemeTextSlice = useCallback((turnId: string, durationMs: number) => {
    const normalizedTurnId = turnId.trim();
    const source = normalizedTurnId
      ? (aiTextByTurnIdRef.current.get(normalizedTurnId) || latestAiTextRef.current)
      : latestAiTextRef.current;
    if (!source.trim()) return "";

    const characters = Array.from(source);
    const approxChars = Math.max(1, Math.min(24, Math.ceil(durationMs / 185)));
    if (!normalizedTurnId) return characters.slice(0, approxChars).join("");

    const cursor = aiVisemeCursorByTurnIdRef.current.get(normalizedTurnId) || 0;
    if (cursor >= characters.length) {
      return characters.slice(Math.max(0, characters.length - approxChars)).join("");
    }

    aiVisemeCursorByTurnIdRef.current.set(
      normalizedTurnId,
      Math.min(characters.length, cursor + approxChars),
    );
    return characters.slice(cursor, cursor + approxChars).join("");
  }, []);

  const scheduleAiVisemesForAudioChunk = useCallback((
    turnId: string,
    durationMs: number,
    delayMs: number,
  ) => {
    const textSlice = takeVisemeTextSlice(turnId, durationMs);
    const timeline = buildApproximateVisemeTimeline(textSlice, durationMs);
    for (const cue of timeline) {
      scheduleAiViseme(cue.viseme, delayMs + cue.atMs);
    }
  }, [scheduleAiViseme, takeVisemeTextSlice]);

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

  const hasPendingAiAudio = useCallback((ctx?: AudioContext | null) => {
    const currentCtx = ctx ?? audioContextRef.current;
    return (
      queuedAudioSourcesRef.current > 0
      || pendingAudioQueueRef.current.length > 0
      || (Boolean(currentCtx) && nextStartTimeRef.current > (currentCtx?.currentTime || 0) + 0.02)
    );
  }, []);

  const finalizeAiPlaybackIfDrained = useCallback((ctx?: AudioContext | null) => {
    const currentCtx = ctx ?? audioContextRef.current;
    if (hasPendingAiAudio(currentCtx)) {
      return false;
    }

    clearPendingPlaybackDrainCheck();
    clearAiAudioLevelTimers();
    clearAiVisemeTimers();
    if (currentCtx) {
      nextStartTimeRef.current = currentCtx.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
    setIsAISpeaking(false);

    const completedTurnId = pendingPlaybackCompleteTurnIdRef.current;
    if (completedTurnId) {
      sendPlaybackComplete(completedTurnId);
      if (!isMicStreamingRef.current && !isMicStartingRef.current && !pendingStartMicRef.current) {
        void startMicRef.current();
      }
    }

    if (pendingStartMicRef.current && !isMicStreamingRef.current && !isMicStartingRef.current) {
      pendingStartMicRef.current = false;
      clearPendingMicRestart();
      void startMicRef.current();
    }
    return true;
  }, [clearAiAudioLevelTimers, clearAiVisemeTimers, clearPendingMicRestart, clearPendingPlaybackDrainCheck, hasPendingAiAudio, sendPlaybackComplete]);

  const schedulePlaybackDrainCheck = useCallback((ctx?: AudioContext | null) => {
    const currentCtx = ctx ?? audioContextRef.current;
    if (!currentCtx) return;
    clearPendingPlaybackDrainCheck();

    const remainingSec = Math.max(0, nextStartTimeRef.current - currentCtx.currentTime);
    const delayMs = Math.max(
      AUDIO_DRAIN_SETTLE_MS,
      Math.ceil(remainingSec * 1000) + AUDIO_DRAIN_SETTLE_MS,
    );

    pendingPlaybackDrainTimerRef.current = window.setTimeout(() => {
      pendingPlaybackDrainTimerRef.current = null;
      if (finalizeAiPlaybackIfDrained(currentCtx)) return;

      if (
        queuedAudioSourcesRef.current === 0 &&
        pendingAudioQueueRef.current.length === 0 &&
        nextStartTimeRef.current > currentCtx.currentTime + 0.02
      ) {
        schedulePlaybackDrainCheck(currentCtx);
      }
    }, delayMs);
  }, [clearPendingPlaybackDrainCheck, finalizeAiPlaybackIfDrained]);

  const scheduleAudioChunk = useCallback((audioData: number[], sampleRate: number, turnId: string): boolean => {
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
    // 녹화 탭에도 이중 연결 — 면접관 음성이 녹화 믹서로 흘러간다(스피커 재생과 무간섭).
    const recordingTap = getInterviewPlaybackRecordingTap();
    if (recordingTap && recordingTap.context === ctx) source.connect(recordingTap);

    const currentTime = ctx.currentTime;
    const minLeadSec = nextStartTimeRef.current <= 0 ? 0.18 : 0.06;
    if (nextStartTimeRef.current < currentTime + minLeadSec) {
      nextStartTimeRef.current = currentTime + minLeadSec;
    }

    const startAt = nextStartTimeRef.current;
    queuedAudioSourcesRef.current += 1;
    source.start(startAt);
    const startDelayMs = Math.max(0, Math.round((startAt - currentTime) * 1000));
    for (const cue of buildAudioLevelTimeline(audioData, normalizedRate)) {
      scheduleAiAudioLevel(cue.level, startDelayMs + cue.atMs);
    }
    scheduleAiVisemesForAudioChunk(turnId, Math.round(buffer.duration * 1000), startDelayMs);
    nextStartTimeRef.current += buffer.duration;

    source.onended = () => {
      queuedAudioSourcesRef.current = Math.max(0, queuedAudioSourcesRef.current - 1);
      if (queuedAudioSourcesRef.current === 0 && pendingAudioQueueRef.current.length === 0) {
        setAiAudioLevel(0);
      }
      if (finalizeAiPlaybackIfDrained(ctx)) {
        return;
      }
      if (queuedAudioSourcesRef.current === 0 && pendingAudioQueueRef.current.length === 0) {
        schedulePlaybackDrainCheck(ctx);
      }
    };

    return true;
  }, [finalizeAiPlaybackIfDrained, getOrCreateAudioContext, scheduleAiAudioLevel, scheduleAiVisemesForAudioChunk, schedulePlaybackDrainCheck]);

  const flushPendingAudioQueue = useCallback(() => {
    if (!audioUnlockedRef.current) return;
    if (!pendingAudioQueueRef.current.length) return;

    clearPendingMicRestart();
    if (isMicStreamingRef.current) {
      pauseMic(false);
    }
    setIsAIProcessing(false);
    setIsAISpeaking(true);

    const queued = pendingAudioQueueRef.current;
    pendingAudioQueueRef.current = [];
    for (let idx = 0; idx < queued.length; idx += 1) {
      const chunk = queued[idx];
      const scheduled = scheduleAudioChunk(chunk.audio, chunk.sampleRate, chunk.turnId);
      if (scheduled) continue;
      pendingAudioQueueRef.current = queued.slice(idx);
      break;
    }
  }, [clearPendingMicRestart, pauseMic, scheduleAudioChunk]);

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
      await prepareInterviewPlaybackAudio();
      const resumedState = ctx.state as AudioContextState;
      audioUnlockedRef.current = resumedState === "running";
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
      clearPendingPlaybackDrainCheck();
      clearAiAudioLevelTimers();
      clearAiVisemeTimers();
      void releaseInterviewPlaybackAudio();
    };
  }, [clearAiAudioLevelTimers, clearAiVisemeTimers, clearPendingMicRestart, clearPendingPlaybackDrainCheck, clearReconnectTimer, unlockAudioContext]);

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

  const prepareAudio = useCallback(async () => {
    return await unlockAudioContext(true);
  }, [unlockAudioContext]);

  const startMic = useCallback(async (options: StartMicOptions = {}) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    if (isMicStreamingRef.current || isMicStartingRef.current) return;
    isMicStartingRef.current = true;

    try {
      if (options.userGesture) {
        await unlockAudioContext(true);
      }

      // 기존에 살아있는 processor 가 있으면 stop + null — 항상 새로 만들어 .start() 보장.
      // (예전엔 early-return 으로 isMicOn 만 set 했는데, processor 가 실제 동작 안 하면
      //  마이크 초록인데 audio 안 흐르는 버그 발생)
      if (audioProcessorRef.current) {
        try {
          audioProcessorRef.current.stop();
        } catch {
          // 무시
        }
        audioProcessorRef.current = null;
      }

      audioProcessorRef.current = new AudioProcessor((data, sampleRate) => {
        if (!isMicStreamingRef.current) return;

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
            sampleRate,
          }));
        }
      });

      await audioProcessorRef.current.start();
      isMicStreamingRef.current = true;
      pendingStartMicRef.current = false;
      setIsMicOn(true);
      setIsAIProcessing(false);
    } catch (error) {
      console.error("Mic start failed", error);
      // 실패 시 state 완전 리셋 — 안 그러면 isMicStreamingRef=true 상태로 stuck.
      // 다음 startMic 호출이 line 438 의 early-return 타서 영영 회복 불가.
      try {
        audioProcessorRef.current?.stop();
      } catch {
        // 무시
      }
      audioProcessorRef.current = null;
      isMicStreamingRef.current = false;
      pendingStartMicRef.current = false;
      setIsMicOn(false);
      setVolume(0);
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

  const playAudioChunk = useCallback((audioData: number[], sampleRate: number, turnSeq: number, turnId: string): boolean => {
    const ctx = getOrCreateAudioContext();
    if (!ctx || !audioData.length) return false;

    const normalizedRate = Number.isFinite(sampleRate) && sampleRate > 1000 ? sampleRate : 24000;
    if (!audioUnlockedRef.current || ctx.state !== "running") {
      pendingAudioQueueRef.current.push({
        audio: audioData,
        sampleRate: normalizedRate,
        turnId,
        turnSeq,
      });
      if (pendingAudioQueueRef.current.length > 64) {
        pendingAudioQueueRef.current = pendingAudioQueueRef.current.slice(-64);
      }
      notifyAudioGestureRequired();
      return true;
    }

    return scheduleAudioChunk(audioData, normalizedRate, turnId);
  }, [getOrCreateAudioContext, notifyAudioGestureRequired, scheduleAudioChunk]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    clearReconnectTimer();
    clearPendingMicRestart();
    clearPendingPlaybackDrainCheck();
    clearAiAudioLevelTimers();
    clearAiVisemeTimers();
    pendingStartMicRef.current = false;
    queuedAudioSourcesRef.current = 0;
    pendingAudioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    lastAudioSignatureRef.current = "";
    latestAiTurnSeqRef.current = 0;
    latestAiTextRef.current = "";
    aiTextByTurnIdRef.current.clear();
    aiVisemeCursorByTurnIdRef.current.clear();
    pendingPlaybackCompleteTurnIdRef.current = "";
    lastCompletedPlaybackTurnIdRef.current = "";
    lastStartMicTurnIdRef.current = "";
    audioUnlockedRef.current = false;
    const staleSocket = socketRef.current;
    if (staleSocket) {
      // 핸들러를 먼저 떼야 늦게 도착하는 close 이벤트가 유령 재연결을 만들지 않는다.
      staleSocket.onopen = null;
      staleSocket.onmessage = null;
      staleSocket.onerror = null;
      staleSocket.onclose = null;
      staleSocket.close();
    }
    socketRef.current = null;
    setIsConnected(false); // onclose 를 떼었으므로 여기서 직접 내린다
    stopMic(false);
    setIsAIProcessing(false);
    setIsAISpeaking(false);
  }, [clearAiAudioLevelTimers, clearAiVisemeTimers, clearPendingMicRestart, clearPendingPlaybackDrainCheck, clearReconnectTimer, stopMic]);

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
      const sampleRate = Number(event.sampleRate) || 24000;

      if (!turnId) {
        clearPendingMicRestart();
        const scheduled = playAudioChunk(audio, sampleRate, turnSeq, turnId);
        if (!scheduled) return;
        if (isMicStreamingRef.current) {
          pauseMic(false);
        }
        setIsAIProcessing(false);
        setIsAISpeaking(true);
        return;
      }

      clearPendingMicRestart();
      const scheduled = playAudioChunk(audio, sampleRate, turnSeq, turnId);
      if (!scheduled) return;
      if (isMicStreamingRef.current) {
        pauseMic(false);
      }
      setIsAIProcessing(false);
      setIsAISpeaking(true);
      if (event.isFinalChunk === true) {
        pendingPlaybackCompleteTurnIdRef.current = turnId;
      }
      return;
    }

    if (eventType === "transcript.final") {
      if ((event.role === "user" || event.role === "ai") && typeof event.text === "string") {
        if (event.role === "ai") {
          rememberAiTurnText(event.turnId, event.text);
          const turnSeq = extractTurnSeq(event.turnId);
          if (turnSeq > 0) {
            latestAiTurnSeqRef.current = Math.max(latestAiTurnSeqRef.current, turnSeq);
          }
        }
        onTranscriptRef.current?.(event.text, event.role, {
          turnId: typeof event.turnId === "string" ? event.turnId : "",
          provider: typeof event.provider === "string" ? event.provider : "",
        });
      }
      return;
    }

    if (eventType === "transcript.delta") {
      if (event.role === "ai") {
        rememberAiTurnText(
          event.turnId,
          typeof event.accumulatedText === "string" && event.accumulatedText
            ? event.accumulatedText
            : event.delta,
        );
        const turnSeq = extractTurnSeq(event.turnId);
        if (turnSeq > 0) {
          latestAiTurnSeqRef.current = Math.max(latestAiTurnSeqRef.current, turnSeq);
        }
      }
      // user 의 실시간 partial transcript (parallel STT) — 자막에 표시되도록 forward
      if (event.role === "user") {
        const accumulated =
          typeof event.accumulatedText === "string" && event.accumulatedText
            ? event.accumulatedText
            : typeof event.delta === "string"
              ? event.delta
              : "";
        if (accumulated.trim()) {
          onTranscriptRef.current?.(accumulated, "user", {
            turnId: typeof event.turnId === "string" ? event.turnId : "",
            provider: typeof event.provider === "string" ? event.provider : "",
          });
        }
      }
      return;
    }

    if (eventType === "full-text") {
      rememberAiTurnText(event.turnId, event.text);
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
        if (!finalizeAiPlaybackIfDrained(audioContextRef.current)) {
          if (queuedAudioSourcesRef.current === 0 && pendingAudioQueueRef.current.length === 0) {
            schedulePlaybackDrainCheck(audioContextRef.current);
          }
        }
      }
      return;
    }

    if (eventType === "control") {
      const controlText = typeof event.text === "string" ? event.text : "";

      if (controlText === "interrupt") {
        clearPendingMicRestart();
        clearPendingPlaybackDrainCheck();
        clearAiVisemeTimers();
        pendingStartMicRef.current = false;
        nextStartTimeRef.current = 0;
        queuedAudioSourcesRef.current = 0;
        pendingAudioQueueRef.current = [];
        pendingPlaybackCompleteTurnIdRef.current = "";
        lastStartMicTurnIdRef.current = "";
        setIsAIProcessing(false);
        setIsAISpeaking(false);
        return;
      }

      if (controlText === "mic-audio-end") {
        lastStartMicTurnIdRef.current = "";
        pauseMic(false);
        setIsAIProcessing(true);
        return;
      }

      if (controlText === "start-mic") {
        const incomingTurnId = typeof event.turnId === "string" ? event.turnId.trim() : "";
        const controlTurnSeq = extractTurnSeq(event.turnId);
        if (controlTurnSeq > 0 && controlTurnSeq < latestAiTurnSeqRef.current) {
          return;
        }
        if (
          incomingTurnId &&
          incomingTurnId === lastStartMicTurnIdRef.current &&
          (isMicStreamingRef.current || isMicStartingRef.current || pendingStartMicRef.current)
        ) {
          return;
        }
        if (incomingTurnId) {
          lastStartMicTurnIdRef.current = incomingTurnId;
        }

        const ctx = audioContextRef.current;
        const hasQueuedAudio = hasPendingAiAudio(ctx);

        if (hasQueuedAudio) {
          pendingStartMicRef.current = true;
          if (queuedAudioSourcesRef.current === 0 && pendingAudioQueueRef.current.length === 0) {
            schedulePlaybackDrainCheck(ctx);
          }
        } else {
          const pendingTurnId = pendingPlaybackCompleteTurnIdRef.current.trim();
          if (pendingTurnId) {
            sendPlaybackComplete(pendingTurnId);
          }
          pendingStartMicRef.current = false;
          clearPendingMicRestart();
          void startMic();
        }
      }

      if (controlText === "audio-turn-end") {
        const completedTurnId = typeof event.turnId === "string" ? event.turnId.trim() : "";
        if (completedTurnId) {
          pendingPlaybackCompleteTurnIdRef.current = completedTurnId;
        }
        const ctx = audioContextRef.current;
        if (!finalizeAiPlaybackIfDrained(ctx) && queuedAudioSourcesRef.current === 0 && pendingAudioQueueRef.current.length === 0) {
          schedulePlaybackDrainCheck(ctx);
        }
      }
    }
  }, [clearAiVisemeTimers, clearPendingMicRestart, clearPendingPlaybackDrainCheck, finalizeAiPlaybackIfDrained, hasPendingAiAudio, pauseMic, playAudioChunk, rememberAiTurnText, schedulePlaybackDrainCheck, sendPlaybackComplete, startMic]);

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
    lastStartMicTurnIdRef.current = "";

    ws.onopen = () => {
      const wasReconnect = reconnectAttemptsRef.current > 0;
      clearReconnectTimer();
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      if (!lastInitPayloadRef.current?.sessionId && wasReconnect) {
        // init 전 재연결 성공 — resumed 를 쏴서 페이지의 isReconnecting 게이트를 풀어준다.
        onEventRef.current?.({
          type: "connection.resumed",
          message: "연결이 복구되었습니다.",
        });
      }
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
          type: "connection.resumed",
          message: "연결이 복구되어 이전 면접 세션을 복원 중입니다.",
        });
      }
    };

    ws.onclose = () => {
      // 이미 교체된(재연결로 대체된) 소켓의 뒤늦은 close 는 무시 — 유령 재연결 방지.
      if (socketRef.current !== ws) return;
      setIsConnected(false);
      clearPendingMicRestart();
      clearPendingPlaybackDrainCheck();
      clearAiAudioLevelTimers();
      clearAiVisemeTimers();
      stopMic(false);
      pendingAudioQueueRef.current = [];
      pendingPlaybackCompleteTurnIdRef.current = "";
      lastCompletedPlaybackTurnIdRef.current = "";
      lastStartMicTurnIdRef.current = "";
      audioUnlockedRef.current = false;
      setIsAIProcessing(false);
      setIsAISpeaking(false);
      // init 전이라도 자동 재연결한다 — 최초 연결이 거부되면(서버 재시작·핸드셰이크 실패 등)
      // 여기서 복구하지 않으면 페이지는 isConnected 만 기다리며 영원히 멈춘다.
      if (!manualDisconnectRef.current) {
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(
          RECONNECT_MAX_DELAY_MS,
          RECONNECT_BASE_DELAY_MS * reconnectAttemptsRef.current,
        );
        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          onEventRef.current?.({
            type: "connection.reconnecting",
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
  }, [clearAiAudioLevelTimers, clearAiVisemeTimers, clearPendingMicRestart, clearPendingPlaybackDrainCheck, clearReconnectTimer, handleServerMessage, serverUrl, stopMic]);

  return {
    connect,
    disconnect,
    initInterviewSession,
    sendJson,
    prepareAudio,
    startMic,
    stopMic,
    submitTurn,
    cancelTurn,
    isConnected,
    isMicOn,
    isAIProcessing,
    isAISpeaking,
    volume,
    aiAudioLevel,
    aiViseme,
  };
}
