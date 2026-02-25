"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type AvatarState = "idle" | "thinking" | "listening" | "speaking";

const AVATAR_ASSETS: Record<AvatarState, string> = {
  idle: "/interview/avatar/dibut-idle.svg",
  thinking: "/interview/avatar/dibut-thinking.svg",
  listening: "/interview/avatar/dibut-listening.svg",
  speaking: "/interview/avatar/dibut-speaking.svg",
};

const STATE_LABEL: Record<AvatarState, string> = {
  idle: "대기 중",
  thinking: "생각 중",
  listening: "듣는 중",
  speaking: "말하는 중",
};

const STATE_COLOR: Record<AvatarState, string> = {
  idle: "bg-muted/60 text-muted-foreground",
  thinking: "bg-amber-100 text-amber-800",
  listening: "bg-emerald-100 text-emerald-800",
  speaking: "bg-blue-100 text-blue-800",
};

interface DibutAvatarPanelProps {
  state?: AvatarState;
  wsUrl?: string;
  sessionId?: string;
  className?: string;
  defaultMinimized?: boolean;
}

export function DibutAvatarPanel({
  state: externalState,
  wsUrl,
  sessionId,
  className,
  defaultMinimized = false,
}: DibutAvatarPanelProps) {
  const [avatarState, setAvatarState] = useState<AvatarState>(externalState ?? "idle");
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [renderError, setRenderError] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);

  const emitAvatarState = (state: AvatarState) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "avatar.state.set",
        state,
        sessionId,
      }),
    );
  };

  // 외부에서 state를 직접 제어하는 경우
  useEffect(() => {
    if (externalState) {
      setAvatarState(externalState);
    }
  }, [externalState]);

  // WS로 avatar.state 이벤트 수신
  useEffect(() => {
    if (!wsUrl) return;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          retryRef.current = 0;
          if (externalState) {
            emitAvatarState(externalState);
          }
        };

        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data.type === "avatar.state") {
              const received = data.state as string;
              const validStates: AvatarState[] = ["idle", "thinking", "listening", "speaking"];
              const next: AvatarState = validStates.includes(received as AvatarState)
                ? (received as AvatarState)
                : "idle";
              setAvatarState(next);
            }
          } catch {
            // ignore parse errors
          }
        };

        ws.onerror = () => {
          // graceful degradation: render error 처리하지 않고 idle 유지
        };

        ws.onclose = () => {
          // 자동 재연결 (최대 3회)
          if (retryRef.current < 3) {
            retryRef.current += 1;
            setTimeout(connect, 3000 * retryRef.current);
            return;
          }
          setAvatarState("idle");
        };
      } catch {
        // WS 연결 실패 시 아바타는 idle 상태로 계속 렌더
        setAvatarState("idle");
      }
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [wsUrl]);

  useEffect(() => {
    if (!wsUrl || !externalState) return;
    emitAvatarState(externalState);
  }, [externalState, wsUrl]);

  const imgSrc = AVATAR_ASSETS[avatarState];

  return (
    <div className={cn("relative flex flex-col", className)}>
      {/* 최소화 토글 버튼 */}
      <button
        onClick={() => setIsMinimized((v) => !v)}
        className="absolute -right-3 top-4 z-10 w-6 h-6 rounded-full bg-card border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
        title={isMinimized ? "아바타 패널 펼치기" : "아바타 패널 최소화"}
      >
        {isMinimized ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {isMinimized ? (
        /* 최소화 상태: 작은 원형 아바타만 표시 */
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 bg-card overflow-hidden shadow-sm">
            {!renderError ? (
              <Image
                src={imgSrc}
                alt={`Dibut ${avatarState}`}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                onError={() => setRenderError(true)}
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                DI
              </div>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground font-medium">Dibut</span>
        </div>
      ) : (
        /* 펼쳐진 상태: 풀 패널 */
        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden w-full">
          {/* 헤더 */}
          <div className="px-4 py-2.5 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Dibut Interviewer</span>
              <Badge variant="outline" className="text-[9px] border-primary/20 text-primary px-1.5 py-0">
                LiveKit Beta
              </Badge>
            </div>
            <Badge className={cn("text-[9px] px-2 py-0.5 border-none", STATE_COLOR[avatarState])}>
              {STATE_LABEL[avatarState]}
            </Badge>
          </div>

          {/* 아바타 이미지 */}
          <div className="relative bg-gradient-to-b from-muted/20 to-muted/5 flex items-end justify-center py-4 px-6">
            {!renderError ? (
              <Image
                src={imgSrc}
                alt={`Dibut interviewer - ${avatarState}`}
                width={180}
                height={216}
                priority
                className={cn(
                  "w-full max-w-[180px] h-auto transition-all duration-500",
                  avatarState === "speaking" && "drop-shadow-[0_0_12px_rgba(59,91,219,0.3)]",
                  avatarState === "listening" && "drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]",
                  avatarState === "thinking" && "drop-shadow-[0_0_12px_rgba(245,158,11,0.2)]",
                )}
                onError={() => setRenderError(true)}
              />
            ) : (
              /* fallback: idle placeholder */
              <div className="w-36 h-36 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                <span className="text-4xl font-black text-primary">D</span>
              </div>
            )}

            {/* Speaking 애니메이션 오버레이 */}
            {avatarState === "speaking" && !renderError && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-1 bg-primary rounded-full animate-bounce"
                    style={{
                      height: `${8 + (i % 3) * 4}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: "0.6s",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 하단 세션 정보 */}
          {sessionId && (
            <div className="px-4 py-2 border-t bg-muted/10">
              <p className="text-[9px] text-muted-foreground/50 font-mono truncate">
                session: {sessionId.slice(0, 12)}...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
