"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface PresenceContextType {
  onlineUsers: Set<string>;
  globalOnlineUsers: Set<string>;
  workspaceOnlineUsers: Set<string>;
  currentWorkspaceId: string | null;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: new Set(),
  globalOnlineUsers: new Set(),
  workspaceOnlineUsers: new Set(),
  currentWorkspaceId: null,
});

export const usePresence = () => {
  return useContext(PresenceContext);
};

function extractWorkspaceId(pathname: string | null) {
  const match = pathname?.match(/^\/workspace\/([^/?]+)/);
  return match?.[1] ?? null;
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [globalOnlineUsers, setGlobalOnlineUsers] = useState<Set<string>>(
    new Set(),
  );
  const [workspaceOnlineUsers, setWorkspaceOnlineUsers] = useState<Set<string>>(
    new Set(),
  );
  const { user } = useAuth({ loadProfile: false });
  const userId = user?.id;
  const currentWorkspaceId = extractWorkspaceId(pathname);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel("presence:global", {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const newState = channel.presenceState();
        const onlineIds = new Set(Object.keys(newState));
        setGlobalOnlineUsers(onlineIds);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        setGlobalOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.add(key);
          return newSet;
        });
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setGlobalOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: userId,
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !currentWorkspaceId) {
      setWorkspaceOnlineUsers(new Set());
      return;
    }

    const channel = supabase.channel(`presence:workspace:${currentWorkspaceId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const newState = channel.presenceState();
        const onlineIds = new Set(Object.keys(newState));
        setWorkspaceOnlineUsers(onlineIds);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        setWorkspaceOnlineUsers((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setWorkspaceOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: userId,
            workspace_id: currentWorkspaceId,
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentWorkspaceId, userId]);

  const onlineUsers = useMemo(
    () => (currentWorkspaceId ? workspaceOnlineUsers : globalOnlineUsers),
    [currentWorkspaceId, globalOnlineUsers, workspaceOnlineUsers],
  );

  return (
    <PresenceContext.Provider
      value={{
        onlineUsers,
        globalOnlineUsers,
        workspaceOnlineUsers,
        currentWorkspaceId,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}
