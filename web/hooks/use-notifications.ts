"use client";

import { useEffect } from "react";
import useSWR from "swr";
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

export function useNotifications() {
  const { user } = useAuth({ loadProfile: false });
  const {
    data: notifications,
    mutate,
    isLoading,
  } = useSWR<Notification[]>(user ? "/api/notifications" : null, fetcher);

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  // Realtime Subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("realtime-notifications")
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
          // Optimistic Update
          mutate((currentData) => {
            return [newNotif, ...(currentData || [])];
          }, false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, mutate]);

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
