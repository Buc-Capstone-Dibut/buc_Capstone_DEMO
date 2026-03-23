"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCircle2,
  Check,
  MessageSquare,
  AtSign,
  Inbox as InboxIcon,
  Trash2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function UnifiedInbox() {
  const { notifications, unreadCount, markAsRead, deleteNotification } =
    useNotifications();

  const handleInviteAction = async (
    inviteId: string,
    notificationId: string,
    action: "accept" | "decline",
  ) => {
    try {
      const response = await fetch("/api/workspaces/invite/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteId, action }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "초대 응답 처리에 실패했습니다.");
      }

      await markAsRead(notificationId);
      toast.success(`초대를 ${action === "accept" ? "수락" : "거절"}했습니다.`);

      if (action === "accept") {
        window.location.reload();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "초대 응답 처리에 실패했습니다.",
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-background/50">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Inbox
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full px-2">
                  {unreadCount}
                </Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              Stay updated with your team activity
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button variant="secondary" size="sm" className="rounded-full">
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
          >
            Mentions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
          >
            Assigned
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-6">
        <div className="space-y-4 pb-10">
          {notifications.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <InboxIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>All caught up! No new notifications.</p>
            </div>
          ) : (
            notifications.map((noti) => (
              <Card
                key={noti.id}
                className={`p-4 flex gap-4 transition-colors group relative ${noti.is_read ? "opacity-60 bg-muted/20" : "bg-card border-l-4 border-l-orange-500"}`}
              >
                <div className="mt-1">
                  {(noti.type === "mention" || noti.type === "MENTION") && (
                    <AtSign className="h-5 w-5 text-blue-500" />
                  )}
                  {(noti.type === "assignment" || noti.type === "SQUAD") && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {(noti.type === "update" ||
                    noti.type === "COMMENT" ||
                    noti.type === "SYSTEM" ||
                    noti.type === "INVITE") && (
                    <MessageSquare className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium">
                      {noti.message || noti.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {/* Simple date format fallback */}
                      {new Date(noti.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {noti.type === "INVITE" && noti.link?.startsWith("invite:") ? (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            handleInviteAction(
                              noti.link!.split(":")[1],
                              noti.id,
                              "accept",
                            )
                          }
                        >
                          <Check className="mr-1 h-3 w-3" />
                          수락
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            handleInviteAction(
                              noti.link!.split(":")[1],
                              noti.id,
                              "decline",
                            )
                          }
                        >
                          <X className="mr-1 h-3 w-3" />
                          거절
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        asChild
                      >
                        <a href={noti.link || "#"}>View context</a>
                      </Button>
                    )}
                    {!noti.is_read && noti.type !== "INVITE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => markAsRead(noti.id)}
                      >
                        Mark read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                      onClick={() => deleteNotification(noti.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
