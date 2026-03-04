"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AudioProcessor } from "@/lib/audio-utils";

export interface WsInterviewInitPayload {
  sessionType?: "live_interview" | "portfolio_defense";
  style?: string;
  targetDurationSec?: number;
  closingThresholdSec?: number;
  llmStreamMode?: "final" | "delta";
  ttsMode?: "full" | "sentence" | "client";
  jobData?: Record<string, unknown>;
  resumeData?: Record<string, unknown>;
  jd?: string;
  resume?: string;
}

interface UseOpenLLMProps {
  serverUrl?: string; // e.g. "ws://localhost:8001/v1/interview/ws/client"
  onTranscript?: (text: string, role: "user" | "ai") => void;
  onEvent?: (event: Record<string, unknown>) => void;
}

function joinSpeechText(base: string, addition: string): string {
  const left = base || "";
  const right = addition || "";
  if (!left) return right;
  if (!right) return left;

  if (/\s$/.test(left) || /^[\s,.!?;:)\]}]/.test(right)) {
    return `${left}${right}`;
  }
  return `${left} ${right}`;
}

function splitSpeakableSegments(buffer: string, flushTail: boolean): { segments: string[]; remainder: string } {
  const segments: string[] = [];
  let start = 0;

  for (let i = 0; i < buffer.length; i += 1) {
    const ch = buffer[i];
    const isStrongBoundary = ch === "." || ch === "!" || ch === "?" || ch === "\n";
    const isSoftBoundary = (ch === "," || ch === ";" || ch === ":") && i - start >= 12;
    if (!isStrongBoundary && !isSoftBoundary) continue;

    const segment = buffer.slice(start, i + 1).trim();
    if (segment) segments.push(segment);
    start = i + 1;
  }

  let remainder = buffer.slice(start);

  while (remainder.length >= 34) {
    const hardCut = remainder.lastIndexOf(" ", 34);
    const cut = hardCut > 8 ? hardCut : -1;
    if (cut === -1) break;

    const segment = remainder.slice(0, cut).trim();
    if (segment) segments.push(segment);
    remainder = remainder.slice(cut + 1);
  }

  if (flushTail) {
    const tail = remainder.trim();
    if (tail) segments.push(tail);
    remainder = "";
  }

  return { segments, remainder };
}

function decodePcm16Base64(base64Data: unknown): number[] {
  if (typeof base64Data !== "string" || !base64Data) return [];
  if (typeof window === "undefined" || typeof window.atob !== "function") return [];

  try {
    const binary = window.atob(base64Data);
    const byteLength = binary.length;
    if (byteLength < 2) return [];

    const sampleCount = Math.floor(byteLength / 2);
    const output = new Array<number>(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
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
  const nextStartTimeRef = useRef<number>(0);
  const isMicStreamingRef = useRef(false);
  const isMicStartingRef = useRef(false);
  const lastAudioSignatureRef = useRef<string>("");
  const pendingStartMicRef = useRef(false);
  const isClientTtsSpeakingRef = useRef(false);
  const forceBrowserTtsRef = useRef(false); // use server TTS by default, browser TTS as fallback only
  const allowBrowserFallbackRef = useRef(false); // hard off: use Gemini server TTS only
  const browserSpeechQueueRef = useRef<string[]>([]);
  const activeAiStreamRef = useRef(false);
  const aiAccumulatedRef = useRef("");
  const aiRemainderRef = useRef("");
  const aiTurnRef = useRef(0);
  const awaitingServerAudioTurnRef = useRef<number | null>(null);
  const fallbackFinalTextRef = useRef("");
  const ignoreLateServerAudioRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Initialize AudioContext for Playback
  useEffect(() => {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass();
    }
    return () => {
      audioContextRef.current?.close();
    };
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

  const sendJson = useCallback((payload: Record<string, unknown>) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  const initInterviewSession = useCallback((payload: WsInterviewInitPayload = {}) => {
    return sendJson({
      type: "init-interview-session",
      sessionType: payload.sessionType || "live_interview",
      style: payload.style || "professional",
      targetDurationSec: payload.targetDurationSec,
      closingThresholdSec: payload.closingThresholdSec,
      llmStreamMode: payload.llmStreamMode,
      ttsMode: payload.ttsMode,
      jobData: payload.jobData,
      resumeData: payload.resumeData,
      jd: payload.jd,
      resume: payload.resume,
    });
  }, [sendJson]);

  const disconnect = useCallback(() => {
    pendingStartMicRef.current = false;
    ignoreLateServerAudioRef.current = false;
    awaitingServerAudioTurnRef.current = null;
    fallbackFinalTextRef.current = "";
    if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.cancel();
    }
    browserSpeechQueueRef.current = [];
    activeAiStreamRef.current = false;
    aiAccumulatedRef.current = "";
    aiRemainderRef.current = "";
    isClientTtsSpeakingRef.current = false;
    socketRef.current?.close();
    socketRef.current = null;
    stopMic(false);
  }, [stopMic]);

  const startMic = useCallback(async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    if (isMicStreamingRef.current || isMicStartingRef.current) return;
    isMicStartingRef.current = true;

    try {
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }
      audioProcessorRef.current = new AudioProcessor((data) => {
        // Calculate volume for UI
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
        }
        const rms = Math.sqrt(sum / data.length);
        setVolume(Math.min(rms * 10, 1)); // Normalize roughly

        // Send to Server
        // We act as VAD for now by sending raw-audio-data continuously
        // Backend handles VAD logic
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: "raw-audio-data",
            audio: Array.from(data)
          }));
        }
      });
      await audioProcessorRef.current.start();
      isMicStreamingRef.current = true;
      setIsMicOn(true);
      setIsAIProcessing(false);
    } catch (e) {
      console.error("Mic start failed", e);
      const isPermissionError =
        e instanceof DOMException &&
        (e.name === "NotAllowedError" || e.name === "PermissionDeniedError");
      onEventRef.current?.({
        type: "mic-error",
        message: isPermissionError
          ? "마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요."
          : "마이크를 시작할 수 없습니다. 마이크 연결 상태를 확인해주세요.",
      });
    } finally {
      isMicStartingRef.current = false;
    }
  }, []);

  const finalizeClientTtsTurn = useCallback(() => {
    activeAiStreamRef.current = false;
    aiAccumulatedRef.current = "";
    aiRemainderRef.current = "";
  }, []);

  const drainBrowserSpeechQueue = useCallback(() => {
    if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
      finalizeClientTtsTurn();
      return;
    }

    const nextText = browserSpeechQueueRef.current.shift();
    if (!nextText) {
      isClientTtsSpeakingRef.current = false;
      setIsAISpeaking(false);
      finalizeClientTtsTurn();
      if (pendingStartMicRef.current) {
        pendingStartMicRef.current = false;
        void startMic();
      } else if (!isMicStreamingRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
        void startMic();
      }
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(nextText);
      utterance.lang = "ko-KR";
      utterance.rate = 1.03;
      utterance.pitch = 1.0;

      const voice =
        window.speechSynthesis
          .getVoices()
          .find((item) => item.lang.toLowerCase().startsWith("ko")) ?? null;
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        isClientTtsSpeakingRef.current = true;
        setIsAISpeaking(true);
        if (isMicStreamingRef.current) {
          stopMic(false);
        }
      };
      utterance.onend = () => {
        isClientTtsSpeakingRef.current = false;
        void Promise.resolve().then(() => drainBrowserSpeechQueue());
      };
      utterance.onerror = () => {
        isClientTtsSpeakingRef.current = false;
        void Promise.resolve().then(() => drainBrowserSpeechQueue());
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      isClientTtsSpeakingRef.current = false;
      void Promise.resolve().then(() => drainBrowserSpeechQueue());
    }
  }, [finalizeClientTtsTurn, startMic, stopMic]);

  const enqueueBrowserSpeech = useCallback((segments: string[]) => {
    if (!segments.length) return;
    for (const raw of segments) {
      const text = raw.trim();
      if (!text) continue;
      browserSpeechQueueRef.current.push(text);
    }
    if (!browserSpeechQueueRef.current.length) return;

    if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
      return;
    }
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending || isClientTtsSpeakingRef.current) {
      return;
    }
    drainBrowserSpeechQueue();
  }, [drainBrowserSpeechQueue]);

  const pushAiTextToClientSpeech = useCallback((chunk: string, flushTail: boolean) => {
    const normalizedChunk = (chunk || "").replace(/\s+/g, " ");
    const mergedBuffer = joinSpeechText(aiRemainderRef.current, normalizedChunk);
    const { segments, remainder } = splitSpeakableSegments(mergedBuffer, flushTail);
    aiRemainderRef.current = remainder;
    enqueueBrowserSpeech(segments);
  }, [enqueueBrowserSpeech]);

  const playAudioChunk = useCallback((audioData: number[], sampleRate: number) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }

    const normalizedRate = Number.isFinite(sampleRate) && sampleRate > 1000 ? sampleRate : 24000;
    const buffer = ctx.createBuffer(1, audioData.length, normalizedRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < audioData.length; i++) {
      channelData[i] = audioData[i];
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Scheduling
    const currentTime = ctx.currentTime;
    // Keep a small jitter buffer to avoid intermittent gaps.
    const minLeadSec = 0.04;
    if (nextStartTimeRef.current < currentTime + minLeadSec) {
      nextStartTimeRef.current = currentTime + minLeadSec;
    }

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;

    source.onended = () => {
      // Could check if queue is empty to set isAISpeaking = false
      // simplistic approach:
      if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
        setIsAISpeaking(false);
        if (pendingStartMicRef.current) {
          pendingStartMicRef.current = false;
          startMic();
        }
      }
    };
  }, [startMic]);

  const handleServerMessage = useCallback((data: unknown) => {
    if (!data || typeof data !== "object") return;
    const event = data as Record<string, unknown>;
    const eventType = typeof event.type === "string" ? event.type : "";

    onEventRef.current?.(event);
    switch (eventType) {
      case "full-text":
        // System notification
        console.log("Server:", event.text);
        break;
      case "set-model-and-conf":
        console.log("Config loaded:", event);
        break;
      case "audio":
        // Play audio chunk
        if (Array.isArray(event.audio) || typeof event.audioBase64 === "string") {
            if (forceBrowserTtsRef.current || isClientTtsSpeakingRef.current) {
              break;
            }
            if (ignoreLateServerAudioRef.current) {
              break;
            }
            if (
              typeof window !== "undefined" &&
              typeof window.speechSynthesis !== "undefined" &&
              (window.speechSynthesis.speaking || window.speechSynthesis.pending || browserSpeechQueueRef.current.length > 0)
            ) {
              // Browser fallback TTS is already speaking this turn; ignore late server audio to avoid double playback.
              break;
            }
            awaitingServerAudioTurnRef.current = null;
            fallbackFinalTextRef.current = "";
            const packetSeq =
              typeof event.packetSeq === "number" ? String(event.packetSeq) : String(event.chunkIndex ?? "na");
            const audioLengthHint = Array.isArray(event.audio)
              ? event.audio.length
              : (typeof event.audioBase64 === "string" ? event.audioBase64.length : 0);
            const signature = `${packetSeq}:${audioLengthHint}:${String(event.isFinalChunk ?? false)}`;
            if (lastAudioSignatureRef.current === signature) {
              break;
            }
            lastAudioSignatureRef.current = signature;
            // Half-duplex safety: AI 음성이 나갈 때는 사용자 마이크 송신을 일시 중지한다.
            if (isMicStreamingRef.current) {
              stopMic(false);
            }
            const audio = Array.isArray(event.audio)
              ? event.audio.filter((value): value is number => typeof value === "number")
              : decodePcm16Base64(event.audioBase64);
            if (!audio.length) {
              break;
            }
            setIsAIProcessing(false);
            setIsAISpeaking(true);
            playAudioChunk(audio, Number(event.sampleRate) || 24000);
        }
        break;
      case "transcript.final":
        if (
          (event.role === "user" || event.role === "ai") &&
          typeof event.text === "string"
        ) {
          if (event.role === "ai") {
            const aiText = event.text.trim();
            if (aiText) {
              if (forceBrowserTtsRef.current) {
                let suffix = aiText;
                if (activeAiStreamRef.current) {
                  const accumulated = aiAccumulatedRef.current;
                  if (aiText.startsWith(accumulated)) {
                    suffix = aiText.slice(accumulated.length);
                  }
                }
                if (suffix.trim()) {
                  pushAiTextToClientSpeech(suffix, true);
                } else if (activeAiStreamRef.current && aiRemainderRef.current.trim()) {
                  pushAiTextToClientSpeech("", true);
                }
                finalizeClientTtsTurn();
              } else {
                if (allowBrowserFallbackRef.current) {
                  aiTurnRef.current += 1;
                  const currentTurn = aiTurnRef.current;
                  ignoreLateServerAudioRef.current = false;
                  awaitingServerAudioTurnRef.current = currentTurn;
                  fallbackFinalTextRef.current = aiText;
                } else {
                  awaitingServerAudioTurnRef.current = null;
                  fallbackFinalTextRef.current = "";
                }
              }
            }
          }
          onTranscriptRef.current?.(event.text, event.role);
        }
        break;
      case "warning": {
        const message = typeof event.message === "string" ? event.message : "";
        if (
          allowBrowserFallbackRef.current &&
          !forceBrowserTtsRef.current &&
          awaitingServerAudioTurnRef.current !== null &&
          /tts|audio/i.test(message)
        ) {
          const fallbackText = fallbackFinalTextRef.current.trim();
          awaitingServerAudioTurnRef.current = null;
          fallbackFinalTextRef.current = "";
          if (fallbackText) {
            ignoreLateServerAudioRef.current = true;
            pendingStartMicRef.current = true;
            pushAiTextToClientSpeech(fallbackText, true);
            finalizeClientTtsTurn();
          }
        }
        break;
      }
      case "transcript.delta":
        if (event.role === "ai" && forceBrowserTtsRef.current) {
          const accumulatedText =
            typeof event.accumulatedText === "string" ? event.accumulatedText : "";
          const deltaText = typeof event.delta === "string" ? event.delta : "";

          if (!activeAiStreamRef.current) {
            activeAiStreamRef.current = true;
            aiAccumulatedRef.current = "";
            aiRemainderRef.current = "";
          }

          let newChunk = deltaText;
          if (accumulatedText) {
            if (accumulatedText.startsWith(aiAccumulatedRef.current)) {
              newChunk = accumulatedText.slice(aiAccumulatedRef.current.length);
            } else {
              newChunk = deltaText || accumulatedText;
            }
            aiAccumulatedRef.current = accumulatedText;
          } else {
            aiAccumulatedRef.current = joinSpeechText(aiAccumulatedRef.current, deltaText);
          }

          if (newChunk.trim()) {
            pushAiTextToClientSpeech(newChunk, false);
          }
        }
        break;
      case "control":
        if (event.text === "interrupt") {
           pendingStartMicRef.current = false;
           ignoreLateServerAudioRef.current = false;
           awaitingServerAudioTurnRef.current = null;
           fallbackFinalTextRef.current = "";
           if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
             window.speechSynthesis.cancel();
           }
           browserSpeechQueueRef.current = [];
           isClientTtsSpeakingRef.current = false;
           setIsAISpeaking(false);
           finalizeClientTtsTurn();
        } else if (event.text === "mic-audio-end") {
           stopMic(false);
           setIsAIProcessing(true);
        } else if (event.text === "start-mic") {
           if (
             allowBrowserFallbackRef.current &&
             !forceBrowserTtsRef.current &&
             awaitingServerAudioTurnRef.current !== null
           ) {
             const fallbackText = fallbackFinalTextRef.current.trim();
             awaitingServerAudioTurnRef.current = null;
             fallbackFinalTextRef.current = "";
             if (fallbackText) {
               ignoreLateServerAudioRef.current = true;
               pendingStartMicRef.current = true;
               pushAiTextToClientSpeech(fallbackText, true);
               finalizeClientTtsTurn();
               break;
             }
           }
           const ctx = audioContextRef.current;
           const hasQueuedAiAudio = Boolean(ctx) && nextStartTimeRef.current > ctx.currentTime + 0.02;
           const hasQueuedClientTts =
             isClientTtsSpeakingRef.current ||
             browserSpeechQueueRef.current.length > 0 ||
             (typeof window !== "undefined" &&
               typeof window.speechSynthesis !== "undefined" &&
               (window.speechSynthesis.pending || window.speechSynthesis.speaking));
           if (hasQueuedAiAudio || hasQueuedClientTts) {
             pendingStartMicRef.current = true;
           } else {
             startMic();
           }
        }
        break;
      case "init-interview-session":
          // Session Ready
          break;
    }
  }, [finalizeClientTtsTurn, playAudioChunk, pushAiTextToClientSpeech, startMic, stopMic]);

  const connect = useCallback(() => {
    if (
      socketRef.current?.readyState === WebSocket.OPEN ||
      socketRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    console.log("Connecting to:", serverUrl);
    const ws = new WebSocket(serverUrl);
    socketRef.current = ws;
    lastAudioSignatureRef.current = "";

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      stopMic(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        handleServerMessage(data);
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };
  }, [handleServerMessage, serverUrl, stopMic]);

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
