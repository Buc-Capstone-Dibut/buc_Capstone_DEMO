"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

interface InterviewVideoRoomProps {
  /** LiveKit room 이름 */
  room: string;
  /** 접속자 identity (보통 userId 또는 "user") */
  identity: string;
  /** false면 렌더하지 않음 — video mode일 때만 true */
  enabled: boolean;
  /** 최대 높이 (px). 기본 200 */
  maxHeight?: number;
  /** 부모 높이를 그대로 채울지 여부 */
  fill?: boolean;
  /** LiveKit 기본 컨트롤 바 숨김 여부 */
  hideControlBar?: boolean;
}

function FullBleedVideoStage() {
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const preferredTrack = cameraTracks.find((trackRef) => trackRef.participant.isLocal) ?? cameraTracks[0];

  return (
    <div className="h-full w-full bg-black">
      {preferredTrack ? (
        <VideoTrack
          trackRef={preferredTrack}
          className="h-full w-full"
          style={{ width: "100%", height: "100%", objectFit: "cover", backgroundColor: "#000000" }}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-xs text-white/70">
          카메라 연결 중...
        </div>
      )}
      <RoomAudioRenderer />
    </div>
  );
}

export function InterviewVideoRoom({
  room,
  identity,
  enabled,
  maxHeight = 200,
  fill = false,
  hideControlBar = false,
}: InterviewVideoRoomProps) {
  void hideControlBar;

  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !room || !identity) return;

    let cancelled = false;

    const fetchToken = async () => {
      try {
        const res = await fetch("/api/interview/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, identity }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) throw new Error(data.error || "Token fetch failed");
        setToken(data.data.token);
        setLivekitUrl(data.data.url);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "LiveKit 연결 실패";
        if (!cancelled) setError(message);
      }
    };

    fetchToken();
    return () => {
      cancelled = true;
    };
  }, [enabled, room, identity]);

  if (!enabled) return null;

  if (error) {
    return (
      <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        화상 연결 실패 — 채팅 모드로 계속 진행합니다.
        <span className="block text-[10px] mt-1 opacity-60">{error}</span>
      </div>
    );
  }

  if (!token) {
    return (
      <div
        className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground animate-pulse"
        style={{ minHeight: fill ? undefined : maxHeight, height: fill ? "100%" : undefined }}
      >
        <div className="h-full flex items-center justify-center">LiveKit 연결 중...</div>
      </div>
    );
  }

  return (
    <div
      className={`interview-livekit-shell rounded-xl overflow-hidden border bg-black ${fill ? "h-full" : ""}`}
      style={fill ? undefined : { height: maxHeight }}
    >
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        video={true}
        audio={true}
        className="h-full"
        onDisconnected={() => setToken(null)}
      >
        <FullBleedVideoStage />
      </LiveKitRoom>
      <style jsx global>{`
        .interview-livekit-shell .lk-room-container {
          height: 100% !important;
        }
        .interview-livekit-shell video.lk-participant-media-video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          background-color: #000 !important;
        }
      `}</style>
    </div>
  );
}
