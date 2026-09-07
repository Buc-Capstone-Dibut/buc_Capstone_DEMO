import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useInterviewRecording } from "../hooks/interview/use-interview-recording";
import { getInterviewPlaybackAudioContext, getInterviewPlaybackRecordingTap, prepareInterviewPlaybackAudio } from "../lib/interview/playback-audio";

function RecordingFixture() {
  const recording = useInterviewRecording();
  const [status, setStatus] = useState("idle");
  const start = async () => {
    await prepareInterviewPlaybackAudio();
    const canvas = document.querySelector("canvas")!;
    const context = canvas.getContext("2d")!;
    let frame = 0;
    const draw = () => {
      context.fillStyle = frame++ % 2 ? "#0c7b71" : "#107fa1";
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = "white";
      context.font = "32px sans-serif";
      context.fillText("Interview recording test", 80, 180);
    };
    draw();
    const timer = setInterval(draw, 100);
    const stream = canvas.captureStream(10);
    await recording.start(stream, { aiAudioStream: getInterviewPlaybackRecordingTap()!.stream });
    const audio = getInterviewPlaybackAudioContext()!;
    const tone = audio.createOscillator();
    tone.frequency.value = 880;
    tone.connect(getInterviewPlaybackRecordingTap()!);
    tone.start();
    tone.stop(audio.currentTime + 0.7);
    tone.onended = () => tone.disconnect();
    const origin = performance.now();
    recording.audio({
      role: "ai",
      turnId: "q1",
      startTimeMs: origin,
      endTimeMs: origin + 700,
    });
    recording.text("ai", "q1", "배포 구조를 설명해 주세요.");
    recording.audio({
      role: "user",
      turnId: "c1",
      startTimeMs: origin + 800,
      endTimeMs: origin + 2200,
    });
    recording.text(
      "user",
      "a1",
      "웹은 Vercel, 면접 엔진은 Render에서 운영합니다.",
    );
    setStatus("recording");
    setTimeout(() => {
      clearInterval(timer);
      setStatus("ready-to-save");
    }, 2500);
  };
  const save = async () => {
    setStatus("saving");
    const result = await recording.stopAndUpload("qa-recording");
    setStatus(
      result.ok ? "saved" : result.recoverable ? "retryable" : "failed",
    );
  };
  return (
    <>
      <canvas width="640" height="360" />
      <button onClick={() => void start()}>Start recording</button>
      <button onClick={() => void save()}>Save recording</button>
      <p role="status">{status}</p>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<RecordingFixture />);
