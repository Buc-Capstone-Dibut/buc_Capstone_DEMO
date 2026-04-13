"use client";

import { useState } from "react";
import { Bell, Check, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string; // 'INVITE', 'SQUAD', 'COMMENT', 'SYSTEM'
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);

  const { notifications, unreadCount, markAsRead, deleteNotification } =
    useNotifications();

  const handleMarkAsRead = async (id?: string) => {
    await markAsRead(id);
  };

  const handleInviteAction = async (
    notification: Notification,
    action: "accept" | "decline",
  ) => {
    // Parse inviteId from link (e.g. "invite:d3b...")
    const inviteId = notification.link?.startsWith("invite:")
      ? notification.link.split(":")[1]
      : null;

    if (!inviteId) {
      toast.error("유효하지 않은 초대 링크입니다.");
      return;
    }

    try {
      const res = await fetch("/api/workspaces/invite/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to respond");
      }

      toast.success(`초대를 ${action === "accept" ? "수락" : "거절"}했습니다.`);
      handleMarkAsRead(notification.id);

      // If accepted, we might want to refresh workspace list or redirect
      if (action === "accept") {
        window.location.reload(); // Simple way to refresh sidebar/state
      }
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await deleteNotification(id);
    } catch {
      toast.error("알림 삭제 실패");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-primary"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">알림</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto p-0 text-muted-foreground hover:text-primary"
              onClick={() => handleMarkAsRead()}
            >
              모두 읽음
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <Bell className="w-8 h-8 opacity-20 mb-2" />
              <span className="text-sm">새로운 알림이 없습니다.</span>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors flex flex-col gap-1 group relative",
                    !notification.is_read &&
                      "bg-blue-50/50 dark:bg-blue-900/10",
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                    onClick={(e) =>
                      handleDeleteNotification(notification.id, e)
                    }
                    title="알림 삭제"
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  <div className="flex justify-between items-start pr-6">
                    <span className="text-sm font-medium">
                      {notification.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {notification.message}
                  </p>

                  {/* Invite Actions */}
                  {notification.type === "INVITE" && !notification.is_read && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs w-full bg-primary hover:bg-primary/90"
                        onClick={() =>
                          handleInviteAction(notification, "accept")
                        }
                      >
                        <Check className="w-3 h-3 mr-1" /> 수락
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs w-full"
                        onClick={() =>
                          handleInviteAction(notification, "decline")
                        }
                      >
                        <X className="w-3 h-3 mr-1" /> 거절
                      </Button>
                    </div>
                  )}

                  {notification.type === "INVITE" && notification.is_read && (
                    <div className="text-xs text-muted-foreground mt-2 flex items-center">
                      <Check className="w-3 h-3 mr-1 text-green-500" />
                      이미 응답 완료된 초대입니다.
                    </div>
                  )}

                  {!notification.is_read && notification.type !== "INVITE" && (
                    <button
                      className="text-[10px] text-blue-500 hover:underline self-end mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      읽음 처리
                    </button>
                  )}
                  {notification.type !== "INVITE" && notification.link && (
                    <a
                      href={notification.link}
                      className="text-[10px] text-primary hover:underline self-start mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMarkAsRead(notification.id);
                      }}
                    >
                      {notification.link.includes("/career/experiences/new")
                        ? "새 경험 추가로 이동"
                        : "바로가기"}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
