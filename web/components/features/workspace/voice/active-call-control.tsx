"use client";

import {
  useLocalParticipant,
  useRoomContext,
  useParticipants,
  useConnectionQualityIndicator,
} from "@livekit/components-react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConnectionQuality } from "livekit-client";

interface ActiveCallControlProps {
  onLeave?: () => void;
}

export function ActiveCallControl({ onLeave }: ActiveCallControlProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  // Connection Quality Hook
  const { quality } = useConnectionQualityIndicator({
    participant: localParticipant,
  });

  useEffect(() => {
    if (!localParticipant) return;
    setIsMuted(!localParticipant.isMicrophoneEnabled);
    setIsVideoEnabled(localParticipant.isCameraEnabled);
  }, [
    localParticipant,
    localParticipant.isMicrophoneEnabled,
    localParticipant.isCameraEnabled,
  ]);

  const toggleMute = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!localParticipant) return;
    const newState = !isMuted;
    await localParticipant.setMicrophoneEnabled(!newState);
    setIsMuted(newState);
  };

  const toggleCamera = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!localParticipant) return;
    const newState = !isVideoEnabled;
    try {
      await localParticipant.setCameraEnabled(newState);
      setIsVideoEnabled(newState);
    } catch (e) {
      console.error("Failed to toggle camera", e);
    }
  };

  const handleDisconnect = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onLeave) {
      onLeave();
      return;
    }
    room.disconnect();
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const getQualityColor = (q: ConnectionQuality) => {
    if (q === ConnectionQuality.Excellent) return "text-green-500";
    if (q === ConnectionQuality.Good) return "text-green-400";
    if (q === ConnectionQuality.Poor) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div
      className={cn(
        "bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ring-1 ring-black/5 dark:ring-white/10",
        isMinimized ? "w-[260px] rounded-[24px]" : "w-[320px] rounded-xl",
      )}
    >
      {/* Minimized View Content */}
      {isMinimized ? (
        <div className="flex items-center p-1.5 gap-2 h-10 w-full">
          {/* Animated Pulse Icon */}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/10 text-green-500 relative shrink-0">
            <span className="absolute inset-0 rounded-full bg-green-500/20 animate-ping opacity-75"></span>
            <Volume2 className="h-4 w-4 relative z-10" />
          </div>

          {/* Compact Text Info */}
          <div className="flex flex-col mr-auto overflow-hidden">
            <span className="text-xs font-bold leading-none truncate">
              {room.name}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">
              {participants.length} connected
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-7 w-7 rounded-full",
                isMuted
                  ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                  : "hover:bg-muted",
              )}
              onClick={toggleMute}
            >
              {isMuted ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </Button>

            <div className="w-px h-3 bg-border mx-0.5" />

            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full hover:bg-muted"
              onClick={toggleMinimize}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        /* Expanded View Content */
        <div className="flex flex-col animate-in fade-in duration-300">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/40">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Volume2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <h3 className="font-semibold text-sm truncate leading-none mb-1">
                  {room.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span>Live</span>
                  <span className="text-border mx-1">|</span>
                  <Wifi className={cn("h-3 w-3", getQualityColor(quality))} />
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground"
              onClick={toggleMinimize}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Participants */}
          <div className="p-4 bg-background/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Participants ({participants.length})
              </span>
            </div>

            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
              {participants.map((p) => {
                let avatarUrl = "";
                try {
                  if (p.metadata) {
                    const meta = JSON.parse(p.metadata);
                    avatarUrl = meta.avatarUrl;
                  }
                } catch {
                  // ignore invalid metadata
                }

                return (
                  <div
                    key={p.identity}
                    className={cn(
                      "flex items-center gap-2 pr-3 pl-1 py-1 rounded-full border bg-card transition-all",
                      p.isSpeaking
                        ? "border-green-500/50 shadow-sm ring-1 ring-green-500/20"
                        : "border-transparent hover:border-border",
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                        {(p.name || p.identity).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium max-w-[80px] truncate">
                      {p.name || p.identity}{" "}
                      {p.identity === localParticipant?.identity && "(Me)"}
                    </span>
                    {p.isSpeaking && (
                      <div className="ml-auto w-1 h-1 rounded-full bg-green-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 bg-muted/30 border-t flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                className={cn(
                  "flex-1 h-9 rounded-lg transition-all",
                  isMuted
                    ? "bg-red-500 text-white hover:bg-red-600 border-red-600"
                    : "hover:bg-muted border-border",
                )}
                onClick={toggleMute}
              >
                {isMuted ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" /> Muted
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" /> Mute
                  </>
                )}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-9 w-9 rounded-lg transition-colors",
                  isVideoEnabled
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                onClick={toggleCamera}
              >
                {isVideoEnabled ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <VideoOff className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={handleDisconnect}
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
