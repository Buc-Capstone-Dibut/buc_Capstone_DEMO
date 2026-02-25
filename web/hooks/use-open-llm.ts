"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AudioProcessor } from "@/lib/audio-utils";

interface UseOpenLLMProps {
  serverUrl?: string; // e.g. "ws://localhost:8001/v1/interview/ws/client"
  onTranscript?: (text: string, role: "user" | "ai") => void;
}

export function useOpenLLM({
  serverUrl = process.env.NEXT_PUBLIC_AI_WS_URL || "ws://localhost:8001/v1/interview/ws/client",
  onTranscript,
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
  const clientUidRef = useRef<string>(crypto.randomUUID());

  // Initialize AudioContext for Playback
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

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
      stopMic();
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };
  }, [serverUrl]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    stopMic();
  }, []);

  const startMic = useCallback(async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

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
      setIsMicOn(true);
    } catch (e) {
      console.error("Mic start failed", e);
    }
  }, []);

  const stopMic = useCallback(() => {
    audioProcessorRef.current?.stop();
    audioProcessorRef.current = null;
    setIsMicOn(false);
    setVolume(0);
  }, []);

  const handleServerMessage = async (data: any) => {
    switch (data.type) {
      case "full-text":
        // System notification
        console.log("Server:", data.text);
        break;
      case "set-model-and-conf":
        console.log("Config loaded:", data);
        break;
      case "audio":
        // Play audio chunk
        if (data.audio) {
            setIsAIProcessing(false);
            setIsAISpeaking(true);
            playAudioChunk(data.audio);
        }
        break;
      case "control":
        if (data.text === "interrupt") {
           // AI interrupted, stop playback
        } else if (data.text === "mic-audio-end") {
           setIsAIProcessing(true);
        } else if (data.text === "start-mic") {
           startMic();
        }
        break;
      case "init-interview-session":
          // Session Ready
          break;
    }
  };

  const playAudioChunk = (audioData: number[]) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    const buffer = ctx.createBuffer(1, audioData.length, 24000); // Server usually sends 24k
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
    startMic,
    stopMic,
    isConnected,
    isMicOn,
    isAIProcessing,
    isAISpeaking,
    volume,
  };
}
