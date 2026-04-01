export interface WorkspaceChatNotificationTarget {
  workspaceId: string;
  channelId: string | null;
}

export function parseWorkspaceChatNotificationTarget(link?: string | null) {
  if (!link || link.startsWith("invite:")) {
    return null;
  }

  try {
    const url = new URL(link, "https://dibut.local");
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0] !== "workspace" || !segments[1]) {
      return null;
    }

    const tab = url.searchParams.get("tab");
    if (!tab?.startsWith("chat-")) {
      return {
        workspaceId: segments[1],
        channelId: null,
      } satisfies WorkspaceChatNotificationTarget;
    }

    const channelId = tab.slice("chat-".length).trim();
    return {
      workspaceId: segments[1],
      channelId: channelId || null,
    } satisfies WorkspaceChatNotificationTarget;
  } catch {
    return null;
  }
}
