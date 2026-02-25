"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Unplug, Video } from "lucide-react";

interface LiveKitConnectPanelProps {
  roomBase: string;
}

function sanitizeRoomName(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned.slice(0, 64) || "training-room";
}

function CameraTracks() {
  const tracks = useTracks([Track.Source.Camera]);

  if (tracks.length === 0) {
    return (
      <div className="h-[240px] rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground flex items-center justify-center">
        카메라를 켜면 화상 면접 화면이 여기 표시됩니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {tracks.map((trackRef) => (
        <div
          key={`${trackRef.participant.identity}-${trackRef.source}`}
          className="rounded-xl border overflow-hidden bg-slate-900 relative h-[240px]"
        >
          <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
          <div className="absolute left-2 bottom-2 rounded-md bg-black/60 text-white text-xs px-2 py-1">
            {trackRef.participant.name || trackRef.participant.identity}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveKitConnectPanel({ roomBase }: LiveKitConnectPanelProps) {
  const defaultRoom = useMemo(() => sanitizeRoomName(roomBase), [roomBase]);
  const [roomName, setRoomName] = useState(defaultRoom);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  useEffect(() => {
    setRoomName(defaultRoom);
  }, [defaultRoom]);

  const connect = async () => {
    const normalizedRoom = sanitizeRoomName(roomName);

    if (!serverUrl) {
      setError("NEXT_PUBLIC_LIVEKIT_URL 환경변수가 설정되지 않았습니다.");
      return;
    }

    setRoomName(normalizedRoom);
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/livekit/token?room=${encodeURIComponent(normalizedRoom)}`,
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.token) {
        throw new Error(payload?.error || "LiveKit 토큰 발급에 실패했습니다.");
      }

      setToken(payload.token);
    } catch (e) {
      const message = e instanceof Error ? e.message : "LiveKit 연결에 실패했습니다.";
      setError(message);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setToken(null);
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">LiveKit 화상 세션</span>
        </div>
        <Badge variant="outline" className="border-primary/20 text-primary">
          {token ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <Input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="room-name"
          disabled={!!token || isLoading}
        />
        {token ? (
          <Button variant="outline" onClick={disconnect} className="md:w-auto">
            <Unplug className="w-4 h-4 mr-2" /> 연결 해제
          </Button>
        ) : (
          <Button onClick={connect} disabled={isLoading || !roomName.trim()} className="md:w-auto">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 연결 중
              </>
            ) : (
              "LiveKit 세션 연결"
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {token ? (
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          audio
          video
          onDisconnected={disconnect}
          onError={(lkError) => setError(lkError.message)}
          className="space-y-3"
        >
          <RoomAudioRenderer />
          <CameraTracks />
        </LiveKitRoom>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/15 p-3 text-xs text-muted-foreground">
          세션 연결 후 카메라/오디오 스트림이 활성화됩니다.
        </div>
      )}
    </div>
  );
}
