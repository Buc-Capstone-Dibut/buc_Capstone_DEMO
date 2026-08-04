"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  BOARD_REALTIME_EVENT,
  getBoardRealtimeTopic,
  isBoardRealtimePayload,
} from "@/lib/workspace/board-realtime";

const BOARD_REFRESH_DEBOUNCE_MS = 200;

type UseBoardRealtimeOptions = {
  workspaceId: string;
  onBoardChanged: () => void;
};

export function useBoardRealtime({
  workspaceId,
  onBoardChanged,
}: UseBoardRealtimeOptions) {
  const onBoardChangedRef = useRef(onBoardChanged);

  useEffect(() => {
    onBoardChangedRef.current = onBoardChanged;
  }, [onBoardChanged]);

  useEffect(() => {
    let isActive = true;
    let hasSubscribed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const requestRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        onBoardChangedRef.current();
      }, BOARD_REFRESH_DEBOUNCE_MS);
    };

    const subscribe = async () => {
      await supabase.realtime.setAuth();
      if (!isActive) return;

      channel = supabase
        .channel(getBoardRealtimeTopic(workspaceId), {
          config: {
            private: true,
            broadcast: { self: false },
          },
        })
        .on("broadcast", { event: BOARD_REALTIME_EVENT }, ({ payload }) => {
          if (isBoardRealtimePayload(payload, workspaceId)) {
            requestRefresh();
          }
        })
        .subscribe((status, error) => {
          if (status === "SUBSCRIBED") {
            if (hasSubscribed) requestRefresh();
            hasSubscribed = true;
            return;
          }

          if (status === "CHANNEL_ERROR") {
            console.warn("Board realtime subscription failed.", error);
          }
        });
    };

    void subscribe().catch((error) => {
      console.warn("Board realtime could not be initialized.", error);
    });

    return () => {
      isActive = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [workspaceId]);
}
