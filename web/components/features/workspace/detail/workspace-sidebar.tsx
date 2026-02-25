import useSWR from "swr";
import { usePresence } from "@/components/providers/presence-provider";
import { useVoice } from "@/components/features/workspace/voice/voice-manager";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Lightbulb,
  ChevronLeft,
  Hash,
  Plus,
  Volume2,
  Bell,
  Briefcase,
  ChevronDown,
  LogOut,
  Settings,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { InviteMemberModal } from "@/components/features/workspace/dialogs/invite-member-modal";
import { DocumentList } from "@/components/features/workspace/docs/document-list";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSocketStore } from "@/components/features/workspace/store/socket-store";
import { useNotifications } from "@/hooks/use-notifications";

import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkspaceSidebarProps {
  projectId: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorInfo = await res.json();
    throw new Error(errorInfo.error || "Failed to fetch");
  }
  return res.json();
};

export function WorkspaceSidebar({
  projectId,
  activeTab,
  onTabChange,
}: WorkspaceSidebarProps) {
  const router = useRouter();
  const {
    channels,
    joinChannel,
    createChannel,
    setChannelMention,
    activeChannelId,
  } = useSocketStore();
  const { notifications, markAsRead } = useNotifications();
  const { user } = useAuth();

  // Real-time Presence (Global)
  const { onlineUsers } = usePresence();

  // Voice Channels
  const { joinRoom, currentRoom, isConnected } = useVoice();

  // Fetch all workspaces for the switcher
  const { data: workspaces } = useSWR<any[]>("/api/workspaces", fetcher);

  // Poll for Room Participants (Socket-driven + 60s fallback)
  const { data: roomParticipants, mutate: mutateRooms } = useSWR(
    "/api/livekit/rooms",
    fetcher,
    {
      refreshInterval: 60000,
    },
  );

  const { socket } = useSocketStore();

  useEffect(() => {
    if (!socket) return;

    const handleVoiceUpdate = () => {
      console.log("[Sidebar] Received voice update, refreshing list...");
      mutateRooms();
    };

    socket.on("voice:update", handleVoiceUpdate);

    return () => {
      socket.off("voice:update", handleVoiceUpdate);
    };
  }, [socket, mutateRooms]);

  // One-way Sync: Unread Notifications -> Channel Badges
  // Only sets to TRUE. Does not clear badge if notification is read (fixes user requirement).
  useEffect(() => {
    if (!channels.length || !notifications) return;

    notifications.forEach((n) => {
      if (!n.is_read && n.type === "MENTION") {
        // Find channel by name matching the notification title
        const channel = channels.find((c) => n.title.includes(`#${c.name}`));

        if (channel) {
          // Skip if this is the currently active channel (User is already viewing it)
          if (channel.id === activeChannelId) {
            // IF we are viewing it, mark the notification as read immediately
            // This prevents it from appearing as a badge later when we switch channels
            markAsRead(n.id);
            return;
          }

          // Only update if not already mentioned to avoid loops
          if (!channel.hasMention) {
            setChannelMention(channel.id, true);
          }
        }
      }
    });
  }, [notifications, channels, setChannelMention, activeChannelId]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLeaveAlertOpen, setIsLeaveAlertOpen] = useState(false);
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");

  const {
    data: project,
    error,
    isLoading,
  } = useSWR(`/api/workspaces/${projectId}`, fetcher);

  // Leave Workspace Handler
  const handleLeaveWorkspace = async () => {
    try {
      const res = await fetch(`/api/workspaces/${projectId}/leave`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to leave workspace");
      }

      toast.success("워크스페이스에서 나갔습니다.");
      router.push("/workspace"); // Redirect to workspace hub
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim() || !user) return;
    createChannel(projectId, newChannelName, newChannelDesc, user.id);
    setNewChannelName("");
    setNewChannelDesc("");
    setIsChannelDialogOpen(false);
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "board", label: "Board", icon: Kanban },
    { id: "docs", label: "Documents", icon: FileText },
    { id: "ideas", label: "Ideas", icon: Lightbulb },
  ];

  return (
    <div className="w-64 border-r bg-muted/10 h-full flex flex-col">
      <div className="p-4 border-b">
        <Link
          href="/workspace"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          프로젝트 목록
        </Link>

        {/* Unified Project Switcher */}
        {(() => {
          const currentWorkspace = workspaces?.find((ws) => ws.id === projectId) || project;
          const displayProjectName = currentWorkspace?.name || (isLoading ? "Loading..." : "Dibut 사이드 프로젝트");
          const displayChar = displayProjectName.charAt(0) || "?";

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/80 cursor-pointer transition-colors group/switcher border border-transparent hover:border-border">
                  <div className="h-8 w-8 min-w-[32px] rounded bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                    {displayChar}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-semibold text-sm truncate flex items-center gap-1">
                      {displayProjectName}
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover/switcher:text-foreground transition-colors" />
                    </div>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-1">
                <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
                  프로젝트 전환
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  {workspaces?.map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => router.push(`/workspace/${ws.id}`)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-2 cursor-pointer transition-colors",
                        ws.id === projectId &&
                        "bg-primary/5 text-primary font-medium",
                      )}
                    >
                      <div
                        className={cn(
                          "h-7 w-7 rounded flex items-center justify-center text-xs font-bold",
                          ws.id === projectId
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {ws.name.charAt(0)}
                      </div>
                      <span className="truncate flex-1">{ws.name}</span>
                      {ws.id === projectId && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/workspace")}
                  className="px-2 py-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  모든 프로젝트 보기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })()}
      </div>

      <div className="py-2 px-2 space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              activeTab === item.id && "bg-secondary",
            )}
            onClick={() => onTabChange(item.id)}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex-1 pt-0 px-2 space-y-4 overflow-y-auto">
        {/* Channels */}
        <div>
          <div className="px-2 mb-1 text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between group">
            채팅 채널
            <Plus
              className="h-3 w-3 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-primary transition-opacity"
              onClick={() => setIsChannelDialogOpen(true)}
            />
          </div>
          <div className="space-y-0.5">
            {channels.map((channel) => {
              const showBadge =
                (channel.unreadCount || 0) > 0 || channel.hasMention;
              const isMentioned = channel.hasMention;

              return (
                <Button
                  key={channel.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-between h-8 px-2 text-muted-foreground font-normal overflow-hidden",
                    activeTab === `chat-${channel.id}` &&
                    "bg-accent text-accent-foreground font-medium",
                    showBadge && "text-foreground font-semibold",
                    isMentioned && "text-primary",
                  )}
                  onClick={() => {
                    joinChannel(channel.id);
                    onTabChange(`chat-${channel.id}`);

                    // Mark mentions as read in Inbox when entering channel
                    // This syncs "Channel Visit" -> "Inbox Read"
                    const relevantNotifications = notifications?.filter(
                      (n) =>
                        !n.is_read &&
                        n.type === "MENTION" &&
                        n.title.includes(`#${channel.name}`),
                    );
                    relevantNotifications?.forEach((n) => markAsRead(n.id));
                  }}
                >
                  <div className="flex items-center min-w-0">
                    <Hash className="mr-2 h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{channel.name}</span>
                  </div>
                  {showBadge && (
                    <span
                      className={cn(
                        "ml-auto flex items-center justify-center rounded-full",
                        isMentioned
                          ? "w-2.5 h-2.5 bg-rose-400" // Soft Red Dot
                          : "text-[10px] px-1.5 py-0.5 min-w-[18px] bg-muted-foreground/30 text-foreground",
                      )}
                    >
                      {!isMentioned && channel.unreadCount}
                    </span>
                  )}
                </Button>
              );
            })}
            {channels.length === 0 && (
              <div className="px-2 text-xs text-muted-foreground/50 py-1">
                No channels
              </div>
            )}
          </div>
        </div>

        {/* Voice Rooms */}
        <div>
          <div className="px-2 mb-1 text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between group">
            음성 채널
            <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 cursor-pointer" />
          </div>
          <div className="space-y-0.5">
            <Button
              variant={currentRoom === "dev-room" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-8 px-2 text-muted-foreground font-normal",
                currentRoom === "dev-room" &&
                "bg-green-500/10 text-green-600 hover:bg-green-500/20 font-medium",
              )}
              onClick={() => joinRoom(projectId, "dev-room")}
            >
              <Volume2 className="mr-2 h-3.5 w-3.5" />
              Dev Room
            </Button>
            {roomParticipants?.["dev-room"]?.length > 0 && (
              <div className="pl-4 pb-1 flex flex-col gap-1 mt-1">
                {roomParticipants["dev-room"].map((p: any) => (
                  <div
                    key={p.identity}
                    className="flex items-center gap-3 py-1 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-6 w-6 rounded-full ring-2 ring-background shadow-sm">
                        <AvatarImage
                          src={p.avatarUrl}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                          {p.name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-background bg-green-500" />
                    </div>
                    <span className="text-sm font-medium opacity-90 truncate max-w-[120px]">
                      {p.name || "Unknown"}
                      {p.identity === user?.id && (
                        <span className="ml-1 text-xs text-muted-foreground font-normal">
                          (Me)
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant={currentRoom === "lounge" ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start h-8 px-2 text-muted-foreground font-normal",
                currentRoom === "lounge" &&
                "bg-green-500/10 text-green-600 hover:bg-green-500/20 font-medium",
              )}
              onClick={() => joinRoom(projectId, "lounge")}
            >
              <Volume2 className="mr-2 h-3.5 w-3.5" />
              Lounge
            </Button>
            {roomParticipants?.["lounge"]?.length > 0 && (
              <div className="pl-4 pb-1 flex flex-col gap-1 mt-1">
                {roomParticipants["lounge"].map((p: any) => (
                  <div
                    key={p.identity}
                    className="flex items-center gap-3 py-1 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-6 w-6 rounded-full ring-2 ring-background shadow-sm">
                        <AvatarImage
                          src={p.avatarUrl}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                          {p.name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-background bg-green-500" />
                    </div>
                    <span className="text-sm font-medium opacity-90 truncate max-w-[120px]">
                      {p.name || "Unknown"}
                      {p.identity === user?.id && (
                        <span className="ml-1 text-xs text-muted-foreground font-normal">
                          (Me)
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t">
        <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground flex items-center justify-between group">
          Team
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Settings className="h-3.5 w-3.5 cursor-pointer hover:text-primary transition-colors" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  프로젝트 관리
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setIsInviteModalOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  팀원 초대
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  워크스페이스 설정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => setIsLeaveAlertOpen(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  워크스페이스 나가기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="space-y-1">
          {project?.members?.map((member: any, i: number) => {
            const isOnline = onlineUsers.has(member.id);
            return (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1.5 text-sm group hover:bg-muted/50 rounded-md"
              >
                <div className="flex items-center overflow-hidden">
                  <div
                    className={`h-2 w-2 rounded-full mr-2 ${isOnline ? "bg-green-500" : "bg-slate-300"}`}
                  ></div>
                  <span className="truncate">{member.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground border px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {member.role}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <InviteMemberModal
        workspaceId={projectId}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* Channel Creation Dialog */}
      <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 채널 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>채널 이름</Label>
              <Input
                placeholder="예: 공지사항, 잡담"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>설명 (선택 사항)</Label>
              <Input
                placeholder="채널의 목적이나 주제를 입력하세요"
                value={newChannelDesc}
                onChange={(e) => setNewChannelDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateChannel}>생성하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <AlertDialog open={isLeaveAlertOpen} onOpenChange={setIsLeaveAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 떠나시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              워크스페이스를 떠나면 다시 초대받을 때까지 접근할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveWorkspace}
              className="bg-red-600 hover:bg-red-700"
            >
              떠나기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
