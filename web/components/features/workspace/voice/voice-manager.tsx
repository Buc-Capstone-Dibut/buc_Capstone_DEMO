"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Video, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActiveCallControl } from "./active-call-control";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { mutate } from "swr";
import { useSocketStore } from "../store/socket-store";

interface VoiceContextType {
  joinRoom: (projectId: string, roomName: string) => Promise<void>;
  leaveRoom: () => void;
  currentRoom: string | null;
  isConnected: boolean;
}

const VoiceContext = createContext<VoiceContextType>({
  joinRoom: async () => {},
  leaveRoom: () => {},
  currentRoom: null,
  isConnected: false,
});

export const useVoice = () => useContext(VoiceContext);

// Sub-component to handle screen share rendering logic
// Sub-component to handle video rendering logic
function VideoOverlay() {
  const tracks = useTracks([Track.Source.Camera]);
  const [isMinimized, setIsMinimized] = useState(false);

  if (tracks.length === 0) return null;

  if (isMinimized) {
    return createPortal(
      <div className="fixed top-20 right-6 z-[9998] bg-black/80 backdrop-blur border border-white/10 rounded-lg p-2 shadow-2xl animate-in fade-in slide-in-from-right-10 pointer-events-auto flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <Video className="h-3 w-3 text-green-400" />
          <span className="text-xs text-white break-keep">
            {tracks.length}명이 카메라 킴
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-auto text-white"
            onClick={() => setIsMinimized(false)}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex -space-x-2 px-1 pb-1">
          {tracks.slice(0, 3).map((t) => (
            <div
              key={t.participant.identity}
              className="h-8 w-8 rounded-full border border-black bg-muted overflow-hidden"
            >
              <VideoTrack trackRef={t} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-300 pointer-events-auto">
      <div className="relative w-full max-w-6xl aspect-video bg-black rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-400 backdrop-blur-md">
              <Video className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                화상 회의 ({tracks.length}명 대화 중)
              </span>
              <span className="text-[10px] text-white/60">
                실시간 스트리밍 중
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4 mr-2" />
            최소화
          </Button>
        </div>

        {/* Video Grid Area */}
        <div className="flex-1 w-full h-full p-4 pt-16 flex items-center justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full h-full max-h-full overflow-y-auto">
            {tracks.map((track) => (
              <div
                key={track.participant.identity}
                className="relative rounded-lg overflow-hidden border border-white/10 bg-slate-900 group"
              >
                <VideoTrack
                  trackRef={track}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-white">
                  {track.participant.name || track.participant.identity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function VoiceManager({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { user } = useAuth({ loadProfile: false });
  const { socket } = useSocketStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const joinRoom = async (projectId: string, roomName: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    try {
      const response = await fetch(`/api/livekit/token?room=${roomName}`);

      if (!response.ok) {
        throw new Error("Failed to fetch token");
      }

      const data = await response.json();
      setToken(data.token);
      setCurrentRoom(roomName);
      setActiveProjectId(projectId);

      // Trigger immediate update of sidebar list (Local)
      try {
        mutate("/api/livekit/rooms");
      } catch (e) {
        console.error("Revalidation failed", e);
      }

      // Broadcast to others (Socket)
      if (socket && projectId) {
        socket.emit("voice:update", { projectId });
      }
    } catch (error) {
      console.error("Failed to join room:", error);
      toast.error("보이스 채널 접속에 실패했습니다.");
    }
  };

  const leaveRoom = () => {
    const prevProjectId = activeProjectId;
    setToken(null);
    setCurrentRoom(null);
    setActiveProjectId(null);

    // Trigger immediate update when leaving
    setTimeout(() => {
      try {
        mutate("/api/livekit/rooms");
        // Broadcast to others (Socket)
        if (socket && prevProjectId) {
          socket.emit("voice:update", { projectId: prevProjectId });
        }
      } catch {}
    }, 500);
  };

  return (
    <VoiceContext.Provider
      value={{
        joinRoom,
        leaveRoom,
        currentRoom,
        isConnected: !!token,
      }}
    >
      {/* Main Content */}
      <div className="relative h-full">{children}</div>

      {/* Voice Layer - Persistent & Portaled */}
      {mounted &&
        token &&
        createPortal(
          <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
            <LiveKitRoom
              token={token}
              serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
              connect={true}
              onDisconnected={leaveRoom}
              style={{ width: "auto", height: "auto" }}
            >
              {/* Audio Handling (Invisible) */}
              <RoomAudioRenderer />

              <div className="flex flex-col items-end gap-2">
                {/* Video Overlay (Visible when cameras are on) */}
                <VideoOverlay />

                {/* Controls (Interactive) */}
                <div className="pointer-events-auto">
                  <ActiveCallControl />
                </div>
              </div>
            </LiveKitRoom>
          </div>,
          document.body,
        )}
    </VoiceContext.Provider>
  );
}
