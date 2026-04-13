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
            notifications.map((noti) => {
              const isInvite = noti.type === "INVITE";

              return (
              <Card
                key={noti.id}
                className={`p-4 flex gap-4 transition-colors group relative ${
                  noti.is_read
                    ? "opacity-60 bg-muted/20"
                    : isInvite
                      ? "bg-primary/5 border border-primary/20 shadow-sm"
                      : "bg-card border-l-4 border-l-orange-500"
                }`}
              >
                <div className="mt-1">
                  {isInvite ? (
                    <div className="bg-primary/10 text-primary rounded-full p-1.5">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                  ) : (
                    <>
                      {(noti.type === "mention" || noti.type === "MENTION") && (
                        <AtSign className="h-5 w-5 text-blue-500" />
                      )}
                      {(noti.type === "assignment" || noti.type === "SQUAD") && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {(noti.type === "update" ||
                        noti.type === "COMMENT" ||
                        noti.type === "SYSTEM") && (
                        <MessageSquare className="h-5 w-5 text-yellow-500" />
                      )}
                    </>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm pr-6 ${isInvite && !noti.is_read ? "font-semibold text-foreground/90" : "font-medium"}`}>
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

                  {isInvite && noti.link?.startsWith("invite:") && !noti.is_read && (
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-8 px-4 text-xs font-medium shadow-sm transition-transform active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() =>
                          handleInviteAction(
                            noti.link!.split(":")[1],
                            noti.id,
                            "accept",
                          )
                        }
                      >
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        수락
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 px-4 text-xs font-medium transition-transform active:scale-95"
                        onClick={() =>
                          handleInviteAction(
                            noti.link!.split(":")[1],
                            noti.id,
                            "decline",
                          )
                        }
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        거절
                      </Button>
                    </div>
                  )}

                  {isInvite && noti.is_read && (
                    <div className="mt-2 text-xs text-muted-foreground/70 font-medium">
                      응답이 완료된 초대입니다.
                    </div>
                  )}

                  {!isInvite && (
                    <div className="flex items-center gap-2 mt-2">
                      {noti.link ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          asChild
                        >
                          <a
                            href={noti.link}
                            onClick={() => {
                              if (!noti.is_read) {
                                void markAsRead(noti.id);
                              }
                            }}
                          >
                            {noti.link.includes("/career/experiences/new")
                              ? "새 경험 추가로 이동"
                              : "바로가기"}
                          </a>
                        </Button>
                      ) : null}
                      {!noti.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => markAsRead(noti.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
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
              </Card>
            )})
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
