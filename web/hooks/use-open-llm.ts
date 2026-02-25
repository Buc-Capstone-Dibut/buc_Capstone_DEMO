"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AudioProcessor } from "@/lib/audio-utils";

export interface WsInterviewInitPayload {
  sessionType?: "live_interview" | "portfolio_defense";
  style?: string;
  targetDurationSec?: number;
  closingThresholdSec?: number;
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
      jobData: payload.jobData,
      resumeData: payload.resumeData,
      jd: payload.jd,
      resume: payload.resume,
    });
  }, [sendJson]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    stopMic(false);
  }, [stopMic]);

  const startMic = useCallback(async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    if (isMicStreamingRef.current) return;

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
    }
  }, []);

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
        if (Array.isArray(event.audio)) {
            // Half-duplex safety: AI 음성이 나갈 때는 사용자 마이크 송신을 일시 중지한다.
            if (isMicStreamingRef.current) {
              stopMic(false);
            }
            const audio = event.audio.filter((value): value is number => typeof value === "number");
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
          onTranscriptRef.current?.(event.text, event.role);
        }
        break;
      case "control":
        if (event.text === "interrupt") {
           // AI interrupted, stop playback
        } else if (event.text === "mic-audio-end") {
           stopMic(false);
           setIsAIProcessing(true);
        } else if (event.text === "start-mic") {
           startMic();
        }
        break;
      case "init-interview-session":
          // Session Ready
          break;
    }
  }, [startMic, stopMic]);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    console.log("Connecting to:", serverUrl);
    const ws = new WebSocket(serverUrl);
    socketRef.current = ws;

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

  const playAudioChunk = (audioData: number[], sampleRate: number) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

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
    // If nextStartTime is in the past, reset it to now
    if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
    }

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;

    source.onended = () => {
        // Could check if queue is empty to set isAISpeaking = false
        // simplistic approach:
        if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
             setIsAISpeaking(false);
        }
    };
  };

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
