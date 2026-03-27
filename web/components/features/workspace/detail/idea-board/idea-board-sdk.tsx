"use client";

import { useState, useEffect, useRef } from "react";
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { Users } from "lucide-react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { ExcalidrawBinding } from "y-excalidraw";
import { useAuth } from "@/hooks/use-auth";

export interface IdeaBoardSDKProps {
  projectId: string;
  readOnly?: boolean;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:4000";

function stringToHue(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function getCursorColors(seed: string) {
  const hue = stringToHue(seed);
  return {
    color: `hsl(${hue} 74% 48%)`,
    colorLight: `hsl(${hue} 90% 78% / 0.42)`,
  };
}

function getCursorDisplayName(
  userId?: string,
  nickname?: string | null,
  email?: string | null,
) {
  return (
    nickname?.trim() ||
    email?.split("@")[0]?.trim() ||
    (userId ? `User-${userId.slice(0, 8)}` : "Anonymous")
  );
}

export default function IdeaBoardSDK({
  projectId,
  readOnly = false,
}: IdeaBoardSDKProps) {
  const { user, profile } = useAuth();

  // Yjs State
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [awarenessUsers, setAwarenessUsers] = useState<number>(0);

  // Refs to keep instances stable
  const ydoc = useRef<Y.Doc>(new Y.Doc());
  const provider = useRef<WebsocketProvider | null>(null);
  const binding = useRef<ExcalidrawBinding | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    provider.current = new WebsocketProvider(
      SOCKET_URL,
      `whiteboard:${projectId}`,
      ydoc.current,
    );

    const awareness = provider.current.awareness;
    const handleAwarenessChange = () => {
      setAwarenessUsers(Array.from(awareness.getStates().values()).length);
    };
    const handleStatusChange = (event: { status: string }) => {
      setIsSynced(event.status === "connected");
    };

    awareness.on("change", handleAwarenessChange);
    provider.current.on("status", handleStatusChange);

    return () => {
      awareness.off("change", handleAwarenessChange);
      provider.current?.off("status", handleStatusChange);

      if (binding.current) {
        binding.current.destroy();
        binding.current = null;
      }
      if (provider.current) {
        provider.current.disconnect();
        provider.current.destroy();
        provider.current = null;
      }
    };
  }, [projectId]);

  useEffect(() => {
    if (!provider.current) return;

    const awareness = provider.current.awareness;
    const userId = user?.id || `guest:${projectId}`;
    const displayName = getCursorDisplayName(
      user?.id,
      profile?.nickname,
      user?.email,
    );
    const { color, colorLight } = getCursorColors(userId);

    awareness.setLocalStateField("user", {
      id: userId,
      name: displayName,
      color,
      colorLight,
    });
  }, [projectId, profile?.nickname, user?.email, user?.id]);

  useEffect(() => {
    if (!excalidrawAPI || !provider.current || !wrapperRef.current) return;

    if (binding.current) return;

    const undoManager = new Y.UndoManager(ydoc.current.getArray("elements"));

    binding.current = new ExcalidrawBinding(
      ydoc.current.getArray("elements"),
      ydoc.current.getMap("assets"),
      excalidrawAPI,
      provider.current.awareness,
      {
        undoManager,
        excalidrawDom: wrapperRef.current,
      },
    );
  }, [excalidrawAPI]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white">

      {/* Status Bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-md pointer-events-auto">
          <div className={`h-2 w-2 rounded-full ${isSynced ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-xs font-semibold text-gray-900">
            {isSynced ? 'Live Sync' : 'Connecting...'}
          </span>
        </div>
        {readOnly && (
          <div className="rounded-lg border border-gray-200 bg-white/80 px-3 py-1.5 text-xs text-gray-700 shadow-sm backdrop-blur-md pointer-events-auto">
            읽기 전용
          </div>
        )}
        {isSynced && (
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200/50 bg-white/60 px-3 py-1.5 text-xs text-gray-500 transition-opacity duration-500 backdrop-blur-md">
            <Users className="h-3 w-3" />
            <span>{awarenessUsers}명 참여 중</span>
          </div>
        )}
      </div>

      <div className="flex-1 w-full relative">
         <div ref={wrapperRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
            <Excalidraw
          excalidrawAPI={(api)=> setExcalidrawAPI(api)}
          onPointerUpdate={readOnly ? undefined : binding.current?.onPointerUpdate}
          viewModeEnabled={readOnly}
          theme="light"
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              loadScene: false,
              toggleTheme: false,
            },
          }}
        >
          <MainMenu>
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
          <WelcomeScreen>
            <WelcomeScreen.Center>
              <WelcomeScreen.Center.Logo>
                <span style={{ fontSize: 28, fontWeight: 700, color: "#82B84C", letterSpacing: "-0.5px" }}>
                  Dibut
                </span>
              </WelcomeScreen.Center.Logo>
              <WelcomeScreen.Center.Heading>
                아이디어를 자유롭게 펼쳐보세요
              </WelcomeScreen.Center.Heading>
              <WelcomeScreen.Center.Menu>
                <WelcomeScreen.Center.MenuItemHelp />
              </WelcomeScreen.Center.Menu>
            </WelcomeScreen.Center>
          </WelcomeScreen>
        </Excalidraw>
        </div>
      </div>
    </div>
  );
}
