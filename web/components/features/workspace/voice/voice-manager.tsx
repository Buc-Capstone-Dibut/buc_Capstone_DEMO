"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { mutate } from "swr";
import { useSocketStore } from "../store/socket-store";
import { getWorkspaceVoiceRoomsApiPath } from "@/lib/workspace-voice";
import {
  unlockVoiceSoundPlayback,
  playVoiceSound,
  VOICE_JOIN_SOUND,
  VOICE_LEAVE_SOUND,
} from "./voice-sounds";

// The LiveKit WebRTC SDK (livekit-client + @livekit/components-react, ~150-250KB
// gz) used to be statically imported here. Because VoiceManager mounts in the
// root layout, that shipped LiveKit in the shared client chunk on EVERY route —
// including anonymous landing/login pages that never start a call. The call
// surface now lives in active-call-overlay and is loaded lazily, so the
// provider carries ~0KB of LiveKit until a call is actually active (token set).
const ActiveCallOverlay = dynamic(
  () => import("./active-call-overlay").then((m) => m.ActiveCallOverlay),
  { ssr: false },
);

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

export function VoiceManager({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { user } = useAuth({ loadProfile: false });
  const { socket } = useSocketStore();
  const [mounted, setMounted] = useState(false);
  const suppressRemoteVoiceEventsRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const joinRoom = async (projectId: string, roomName: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (currentRoom === roomName && activeProjectId === projectId && token) {
      return;
    }

    try {
      suppressRemoteVoiceEventsRef.current = false;
      await unlockVoiceSoundPlayback();
      playVoiceSound(
        VOICE_JOIN_SOUND,
        `voice-join:${projectId}:${roomName}`,
        "join",
      );

      const response = await fetch(
        `/api/livekit/token?room=${encodeURIComponent(roomName)}&workspaceId=${encodeURIComponent(projectId)}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch token");
      }

      const data = await response.json();
      setToken(data.token);
      setCurrentRoom(roomName);
      setActiveProjectId(projectId);
    } catch (error) {
      console.error("Failed to join room:", error);
      toast.error("보이스 채널 접속에 실패했습니다.");
    }
  };

  const leaveRoom = () => {
    suppressRemoteVoiceEventsRef.current = true;
    const prevRoom = currentRoom;
    const prevProjectId = activeProjectId;
    setToken(null);
    setCurrentRoom(null);
    setActiveProjectId(null);
    if (prevRoom) {
      playVoiceSound(
        VOICE_LEAVE_SOUND,
        `voice-leave:${prevProjectId || "unknown"}:${prevRoom}`,
        "leave",
      );
    }

    // Trigger immediate update when leaving
    setTimeout(() => {
      try {
        if (prevProjectId) {
          void mutate(getWorkspaceVoiceRoomsApiPath(prevProjectId));
        }
        // Broadcast to others (Socket)
        if (socket && prevProjectId) {
          socket.emit("voice:update", { projectId: prevProjectId });
        }
      } catch {}
    }, 500);
  };

  // Fired by LiveKitRoom.onConnected (inside the lazy overlay).
  const handleConnected = () => {
    try {
      if (activeProjectId) {
        void mutate(getWorkspaceVoiceRoomsApiPath(activeProjectId));
      }
      if (socket && activeProjectId) {
        socket.emit("voice:update", { projectId: activeProjectId });
      }
    } catch (e) {
      console.error("Revalidation failed", e);
    }
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

      {/* Voice Layer — lazily loaded; only present while a call is active */}
      {mounted && token && (
        <ActiveCallOverlay
          token={token}
          currentRoom={currentRoom}
          activeProjectId={activeProjectId}
          suppressRef={suppressRemoteVoiceEventsRef}
          onConnected={handleConnected}
          onLeave={leaveRoom}
        />
      )}
    </VoiceContext.Provider>
  );
}
