"use client";

import { usePresence } from "@/components/providers/presence-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Volume2, Mic } from "lucide-react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { WorkspaceUserAvatar } from "@/components/features/workspace/common/workspace-user-avatar";
import {
  getWorkspaceVoiceRoomLabel,
  getWorkspaceVoiceRoomsApiPath,
} from "@/lib/workspace-voice";

type TeamPulseMember = {
  id: string;
  name?: string | null;
  avatar?: string | null;
  role?: string | null;
};

type RoomParticipant = {
  identity: string;
};

interface TeamPulseProps {
  members: TeamPulseMember[];
  projectId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function TeamPulse({ members = [], projectId }: TeamPulseProps) {
  const { onlineUsers } = usePresence();

  // Fetch Voice Participants
  const { data: roomParticipants } = useSWR(
    projectId ? getWorkspaceVoiceRoomsApiPath(projectId) : null,
    fetcher,
    {
      refreshInterval: 10000,
    },
  );

  // Calculate stats
  const onlineCount = members.filter((m) => onlineUsers.has(m.id)).length;
  const inVoiceCount = Object.values(roomParticipants || {}).flat().length;

  return (
    <Card className="h-full border-none shadow-sm bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            팀 활동
          </div>
          <div className="flex gap-2">
            <Badge
              variant="secondary"
              className="bg-green-500/10 text-green-600 hover:bg-green-500/20"
            >
              온라인 {onlineCount}명
            </Badge>
            {inVoiceCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 animate-pulse"
              >
                <Mic className="h-3 w-3 mr-1" /> {inVoiceCount}명 대화 중
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-6 py-2">
        <div className="space-y-4">
          {members
            .sort((a, b) => {
              const aOnline = onlineUsers.has(a.id);
              const bOnline = onlineUsers.has(b.id);
              if (aOnline === bOnline) return 0;
              return aOnline ? -1 : 1;
            })
            .map((member) => {
              const isOnline = onlineUsers.has(member.id);
              // Check if user is in any room
              let currentRoomName = null;
              if (roomParticipants) {
                for (const [room, participants] of Object.entries(
                  roomParticipants,
                )) {
                  if (
                    (participants as RoomParticipant[]).some(
                      (p) => p.identity === member.id,
                    )
                  ) {
                    currentRoomName = room;
                    break;
                  }
                }
              }

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <WorkspaceUserAvatar
                        name={member.name}
                        avatarUrl={member.avatar}
                        className={cn(
                          "h-9 w-9 border-2",
                          isOnline
                            ? "border-green-500/20"
                            : "border-transparent",
                        )}
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {member.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentRoomName ? (
                          <span className="text-purple-600 flex items-center gap-1">
                            <Volume2 className="h-3 w-3" />
                            {getWorkspaceVoiceRoomLabel(
                              currentRoomName as "dev-room" | "lounge",
                            )}{" "}
                            접속 중
                          </span>
                        ) : (
                          <span>{member.role}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Optional Status Text or Action */}
                  {/* 
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
                */}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
