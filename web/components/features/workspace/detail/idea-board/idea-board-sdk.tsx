"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Excalidraw, MainMenu, WelcomeScreen } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { RefreshCw, Users } from "lucide-react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { ExcalidrawBinding } from "y-excalidraw";
import { useAuth } from "@/hooks/use-auth";

export interface IdeaBoardSDKProps {
  projectId: string;
  readOnly?: boolean;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:4000";
const TOKEN_REFRESH_INTERVAL_MS = 4 * 60 * 1000;

type ConnectionStatus =
  | "authorizing"
  | "connecting"
  | "syncing"
  | "synced"
  | "error";

type CollaborationSession = {
  doc: Y.Doc;
  provider: WebsocketProvider;
};

type ExcalidrawSession = {
  projectId: string;
  api: ExcalidrawImperativeAPI;
};

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
  const { user, profile, loading: authLoading } = useAuth();

  const [excalidrawSession, setExcalidrawSession] =
    useState<ExcalidrawSession | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("authorizing");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [awarenessUsers, setAwarenessUsers] = useState(0);
  const [collaborationSession, setCollaborationSession] =
    useState<CollaborationSession | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  const binding = useRef<ExcalidrawBinding | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) {
      setConnectionStatus("authorizing");
      return;
    }

    if (!user || readOnly) {
      setConnectionStatus("error");
      setConnectionError(
        readOnly
          ? "종료된 워크스페이스의 화이트보드는 현재 열 수 없습니다."
          : "화이트보드를 사용하려면 로그인이 필요합니다.",
      );
      return;
    }

    const abortController = new AbortController();
    let disposed = false;
    let localSession: CollaborationSession | null = null;
    let tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;

    setConnectionStatus("authorizing");
    setConnectionError(null);
    setAwarenessUsers(0);

    const fetchToken = async () => {
      const response = await fetch(
        `/api/workspaces/${projectId}/whiteboard/token`,
        {
          cache: "no-store",
          signal: abortController.signal,
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        token?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.token) {
        throw new Error(
          payload?.error || "화이트보드 연결 권한을 확인하지 못했습니다.",
        );
      }

      return payload.token;
    };

    const connect = async () => {
      try {
        const token = await fetchToken();
        if (disposed) return;

        const doc = new Y.Doc();
        const websocketProvider = new WebsocketProvider(
          SOCKET_URL,
          `whiteboard:${projectId}`,
          doc,
          {
            connect: false,
            params: { token },
          },
        );
        localSession = { doc, provider: websocketProvider };

        const awareness = websocketProvider.awareness;
        const handleAwarenessChange = () => {
          setAwarenessUsers(Array.from(awareness.getStates().values()).length);
        };
        const handleStatusChange = (event: { status: string }) => {
          if (event.status === "connected") {
            setConnectionStatus(
              websocketProvider.synced ? "synced" : "syncing",
            );
            setConnectionError(null);
          } else {
            setConnectionStatus("connecting");
          }
        };
        const handleSyncChange = (synced: boolean) => {
          setConnectionStatus(synced ? "synced" : "syncing");
          if (synced) setConnectionError(null);
        };
        const handleConnectionError = () => {
          setConnectionStatus("connecting");
          setConnectionError(
            "실시간 서버에 다시 연결하고 있습니다. 잠시만 기다려주세요.",
          );
        };

        awareness.on("change", handleAwarenessChange);
        websocketProvider.on("status", handleStatusChange);
        websocketProvider.on("sync", handleSyncChange);
        websocketProvider.on("connection-error", handleConnectionError);

        setCollaborationSession(localSession);
        setConnectionStatus("connecting");
        websocketProvider.connect();
        handleAwarenessChange();

        tokenRefreshTimer = setInterval(() => {
          void fetchToken()
            .then((nextToken) => {
              websocketProvider.params.token = nextToken;
              if (!websocketProvider.wsconnected) {
                websocketProvider.connect();
              }
            })
            .catch((error) => {
              if (!disposed && error instanceof Error) {
                console.warn("Whiteboard token refresh failed", error);
              }
            });
        }, TOKEN_REFRESH_INTERVAL_MS);

        return () => {
          awareness.off("change", handleAwarenessChange);
          websocketProvider.off("status", handleStatusChange);
          websocketProvider.off("sync", handleSyncChange);
          websocketProvider.off("connection-error", handleConnectionError);
        };
      } catch (error) {
        if (disposed || abortController.signal.aborted) return;
        console.error("Whiteboard connection failed", error);
        setConnectionStatus("error");
        setConnectionError(
          error instanceof Error
            ? error.message
            : "화이트보드에 연결하지 못했습니다.",
        );
      }
    };

    let removeListeners: (() => void) | undefined;
    void connect().then((cleanup) => {
      if (disposed) {
        cleanup?.();
        return;
      }
      removeListeners = cleanup;
    });

    return () => {
      disposed = true;
      abortController.abort();
      removeListeners?.();
      if (tokenRefreshTimer) clearInterval(tokenRefreshTimer);

      const session = localSession;
      setCollaborationSession((current) =>
        current?.provider === session?.provider ? null : current,
      );
      session?.provider.disconnect();
      session?.provider.destroy();
      session?.doc.destroy();
      setAwarenessUsers(0);
    };
  }, [
    authLoading,
    connectionAttempt,
    projectId,
    readOnly,
    user,
  ]);

  useEffect(() => {
    const session = collaborationSession;
    if (!session || !user) return;

    const awareness = session.provider.awareness;
    const handleAwarenessChange = () => {
      setAwarenessUsers(Array.from(awareness.getStates().values()).length);
    };
    const userId = user.id;
    const displayName = getCursorDisplayName(
      user.id,
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
    handleAwarenessChange();
  }, [collaborationSession, profile?.nickname, user]);

  useEffect(() => {
    if (
      excalidrawSession?.projectId !== projectId ||
      !collaborationSession ||
      !wrapperRef.current
    ) {
      return;
    }

    const undoManager = readOnly
      ? undefined
      : new Y.UndoManager(collaborationSession.doc.getArray("elements"));

    const currentBinding = new ExcalidrawBinding(
      collaborationSession.doc.getArray("elements"),
      collaborationSession.doc.getMap("assets"),
      excalidrawSession.api,
      collaborationSession.provider.awareness,
      undoManager
        ? {
            undoManager,
            excalidrawDom: wrapperRef.current,
          }
        : undefined,
    );
    binding.current = currentBinding;

    return () => {
      if (binding.current === currentBinding) {
        binding.current = null;
      }
      currentBinding.destroy();
      undoManager?.destroy();
    };
  }, [collaborationSession, excalidrawSession, projectId, readOnly]);

  const handlePointerUpdate = useCallback(
    (payload: Parameters<ExcalidrawBinding["onPointerUpdate"]>[0]) => {
      binding.current?.onPointerUpdate(payload);
    },
    [],
  );

  const statusLabel = {
    authorizing: "권한 확인 중",
    connecting: "연결 중",
    syncing: "초기 동기화 중",
    synced: "서버와 동기화됨",
    error: "연결 실패",
  }[connectionStatus];

  const isSynced = connectionStatus === "synced";

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white">
      {/* Status Bar */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-md">
          <div
            className={`h-2 w-2 rounded-full ${
              isSynced
                ? "bg-green-500"
                : connectionStatus === "error"
                  ? "bg-red-500"
                  : "animate-pulse bg-amber-500"
            }`}
          />
          <span className="text-xs font-semibold text-gray-900">
            {statusLabel}
          </span>
          {connectionStatus === "error" && (
            <button
              type="button"
              className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setConnectionAttempt((attempt) => attempt + 1)}
              aria-label="화이트보드 연결 다시 시도"
              title="다시 시도"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
        {readOnly && (
          <div className="pointer-events-auto rounded-lg border border-gray-200 bg-white/80 px-3 py-1.5 text-xs text-gray-700 shadow-sm backdrop-blur-md">
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

      {connectionError && (
        <div
          className={`pointer-events-none absolute left-4 top-14 z-10 max-w-sm rounded-lg border px-3 py-2 text-xs shadow-sm backdrop-blur-md ${
            connectionStatus === "error"
              ? "border-red-200 bg-red-50/95 text-red-700"
              : "border-amber-200 bg-amber-50/95 text-amber-700"
          }`}
        >
          {connectionError}
        </div>
      )}

      <div className="relative w-full flex-1">
        <div ref={wrapperRef} className="absolute inset-0 h-full w-full">
          <Excalidraw
            key={projectId}
            excalidrawAPI={(api) =>
              setExcalidrawSession({ projectId, api })
            }
            onPointerUpdate={readOnly ? undefined : handlePointerUpdate}
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
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#82B84C",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    Debut
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
