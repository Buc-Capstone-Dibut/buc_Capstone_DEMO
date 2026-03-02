"use client";

import { useState, useEffect, useRef } from "react";
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import { Users } from "lucide-react";
import { useTheme } from "next-themes";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { ExcalidrawBinding } from "y-excalidraw";

export interface IdeaBoardSDKProps {
  projectId: string;
  readOnly?: boolean;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:4000";

// Random color for cursor
const userColors = [
    "#30bced",
    "#6eeb83",
    "#ffbc42",
    "#ecd444",
    "#ee6352",
    "#9ac2c9",
    "#8acb88",
    "#1be7ff"
];
const randomColor = userColors[Math.floor(Math.random() * userColors.length)];
const randomColorLight = `${randomColor}33`;
type ExcalidrawApi = object;

export default function IdeaBoardSDK({
  projectId,
  readOnly = false,
}: IdeaBoardSDKProps) {
  const { theme } = useTheme();

  // Yjs State
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawApi | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [awarenessUsers, setAwarenessUsers] = useState<number>(0);

  // Refs to keep instances stable
  const ydoc = useRef<Y.Doc>(new Y.Doc());
  const provider = useRef<WebsocketProvider | null>(null);
  const binding = useRef<ExcalidrawBinding | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Initialize Provider
    // Connect to ws://localhost:4000/projectId
    provider.current = new WebsocketProvider(SOCKET_URL, projectId, ydoc.current);

    // 2. Awareness (Cursor)
    const awareness = provider.current.awareness;
    awareness.setLocalStateField("user", {
        name: "User-" + Math.floor(Math.random() * 100),
        color: randomColor,
        colorLight: randomColorLight,
    });

    // Track active users
    awareness.on('change', () => {
        setAwarenessUsers(Array.from(awareness.getStates().values()).length);
    });

    // 3. Status Check
    provider.current.on("status", (event: { status: string }) => {
        setIsSynced(event.status === 'connected');
    });

    return () => {
        // Cleanup
        if(binding.current) {
            binding.current.destroy();
        }
        if(provider.current) {
            provider.current.disconnect();
            provider.current.destroy();
        }
        // ydoc.current.destroy(); // Optional, but usually good to keep if re-mounting
    };
  }, [projectId]);

  // 4. Initialize Binding when Excalidraw API is ready
  useEffect(() => {
    if (!excalidrawAPI || !provider.current || !wrapperRef.current) return;

    if (binding.current) return; // Already bound

    const undoManager = new Y.UndoManager(ydoc.current.getArray("elements"));

    binding.current = new ExcalidrawBinding(
        ydoc.current.getArray("elements"),
        ydoc.current.getMap("assets"),
        excalidrawAPI,
        provider.current.awareness,
        {
            undoManager,
            excalidrawDom: wrapperRef.current
        }
    );

  }, [excalidrawAPI]);

  return (
    <div className="h-full w-full flex flex-col relative bg-white dark:bg-zinc-950 overflow-hidden">

      {/* Status Bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 pointer-events-none">
        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center gap-2 pointer-events-auto">
          <div className={`h-2 w-2 rounded-full ${isSynced ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            {isSynced ? 'Live Sync' : 'Connecting...'}
          </span>
        </div>
        {readOnly && (
          <div className="bg-white/80 dark:bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm text-xs text-gray-700 dark:text-gray-200 pointer-events-auto">
            읽기 전용
          </div>
        )}
        {isSynced && (
          <div className="bg-white/60 dark:bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200/50 dark:border-zinc-800/50 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 transition-opacity duration-500">
            <Users className="h-3 w-3" />
            <span>{awarenessUsers} interacting</span>
          </div>
        )}
      </div>

      <div className="flex-1 w-full relative">
         <div ref={wrapperRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
            <Excalidraw
          excalidrawAPI={(api)=> setExcalidrawAPI(api)}
          onPointerUpdate={readOnly ? undefined : binding.current?.onPointerUpdate}
          viewModeEnabled={readOnly}
          theme={theme === "dark" ? "dark" : "light"}
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
