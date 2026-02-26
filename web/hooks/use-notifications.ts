"use client";

import { useEffect } from "react";
import useSWR, { type KeyedMutator } from "swr";
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

let sharedNotificationUserId: string | null = null;
let sharedNotificationChannel: ReturnType<typeof supabase.channel> | null = null;
let sharedSubscriberCount = 0;
const sharedMutators = new Set<KeyedMutator<Notification[]>>();

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

  useEffect(() => {
    if (!enabled) return;
    sharedMutators.add(mutate);
    return () => {
      sharedMutators.delete(mutate);
    };
  }, [enabled, mutate]);

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

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
            sharedMutators.forEach((instanceMutate) => {
              instanceMutate((currentData) => {
                return [newNotif, ...(currentData || [])];
              }, false);
            });
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
    if (!notifications) return;

    const updated = notifications.map((n) =>
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
    if (!notifications) return;
    const updated = notifications.filter((n) => n.id !== id);
    mutate(updated, false);

    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
      mutate();
    } catch (error) {
      mutate();
    }
  };

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading,
    markAsRead,
    deleteNotification,
  };
}
