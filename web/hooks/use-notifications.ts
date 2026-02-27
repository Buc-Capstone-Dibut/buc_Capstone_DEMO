"use client";

import { useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Notification {
  id: string;
  type: string; // 'INVITE', 'SQUAD', 'COMMENT', 'SYSTEM', 'MENTION'
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

function dedupeNotifications(items: Notification[]): Notification[] {
  const map = new Map<string, Notification>();
  items.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  // Preserve incoming order:
  // - API already returns DESC(created_at)
  // - Realtime inserts are prepended at the call-site
  return Array.from(map.values());
}

const fetcher = async (url: string): Promise<Notification[]> => {
  const res = await fetch(url);
  const json = await res.json();
  if (!Array.isArray(json)) return [];
  return dedupeNotifications(json as Notification[]);
};

let sharedNotificationUserId: string | null = null;
let sharedNotificationChannel: ReturnType<typeof supabase.channel> | null = null;
let sharedSubscriberCount = 0;

interface UseNotificationsOptions {
  enabled?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { enabled = true } = options;
  const { user } = useAuth({ loadProfile: false });
  const {
    data: notifications,
    mutate,
    isLoading,
  } = useSWR<Notification[]>(
    user && enabled ? "/api/notifications" : null,
    fetcher,
  );
  const safeNotifications = dedupeNotifications(notifications || []);
  const unreadCount = safeNotifications.filter((n) => !n.is_read).length;

  // Realtime subscription is shared across hook instances.
  useEffect(() => {
    if (!enabled || !user?.id) return;

    sharedSubscriberCount += 1;

    const ensureChannel = () => {
      if (sharedNotificationChannel && sharedNotificationUserId === user.id) return;

      if (sharedNotificationChannel) {
        supabase.removeChannel(sharedNotificationChannel);
      }

      sharedNotificationUserId = user.id;
      sharedNotificationChannel = supabase
        .channel(`realtime-notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            void globalMutate(
              "/api/notifications",
              (currentData: Notification[] = []) =>
                dedupeNotifications([newNotif, ...currentData]),
              false,
            );
          },
        )
        .subscribe();
    };

    ensureChannel();

    return () => {
      sharedSubscriberCount = Math.max(0, sharedSubscriberCount - 1);
      if (sharedSubscriberCount === 0 && sharedNotificationChannel) {
        supabase.removeChannel(sharedNotificationChannel);
        sharedNotificationChannel = null;
        sharedNotificationUserId = null;
      }
    };
  }, [enabled, user?.id]);

  const markAsRead = async (id?: string) => {
    // Optimistic update
    if (!safeNotifications.length) return;

    const updated = safeNotifications.map((n) =>
      id && n.id !== id ? n : { ...n, is_read: true },
    );

    mutate(updated, false);

    await fetch("/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ id }),
    });

    mutate();
  };

  const deleteNotification = async (id: string) => {
    if (!safeNotifications.length) return;
    const updated = safeNotifications.filter((n) => n.id !== id);
    mutate(updated, false);

    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
      mutate();
    } catch {
      mutate();
    }
  };

  return {
    notifications: safeNotifications,
    unreadCount,
    isLoading,
    markAsRead,
    deleteNotification,
  };
}
