import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

const WORKSPACE_SERVER_UNSTABLE_MESSAGE =
  "워크스페이스 서버가 불안정합니다. 잠시 후 다시 시도해주세요.";

function notifyWorkspaceServerUnstable() {
  toast.error(WORKSPACE_SERVER_UNSTABLE_MESSAGE, {
    id: "workspace-server-unstable",
  });
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: string;
  workspaceId: string;
  unreadCount?: number;
  hasMention?: boolean;
}

type ChannelPayload = Partial<Channel> & {
  id: string;
  name: string;
  type?: string;
  description?: string | null;
  workspace_id?: string;
};

export interface Message {
  id: string;
  channelId: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  };
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  fullTimestamp?: string;
  isEdited?: boolean;
  type: string;
  workspaceId?: string;
}

interface ChannelsAck {
  success: boolean;
  data: Channel[];
  error?: string;
}

interface MessagesAck {
  success: boolean;
  data: Message[];
  error?: string;
}

interface CreateChannelAck {
  success: boolean;
  data: Channel;
  error?: string;
}

interface DeleteChannelAck {
  success: boolean;
  data?: {
    id: string;
    name?: string;
    workspaceId: string;
  };
  error?: string;
}

interface MessageMutationAck {
  success: boolean;
  data?: Message | { id: string; channelId: string };
  error?: string;
}

interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;
  currentUserId: string | null;

  channels: Channel[];
  messages: Message[];
  activeChannelId: string | null;

  connectSocket: (url: string, userId: string, projectId: string) => void;
  disconnectSocket: () => void;

  // Channel Actions
  fetchChannels: (workspaceId: string, socketInstance?: Socket) => void;
  createChannel: (
    workspaceId: string,
    name: string,
    description: string,
    userId: string,
  ) => void;
  deleteChannel: (
    channelId: string,
    requesterId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  joinChannel: (channelId: string) => void;
  markChannelAsRead: (channelId: string) => void;
  setChannelMention: (channelId: string, hasMention: boolean) => void;

  // Message Actions
  sendMessage: (channelId: string, content: string, senderId: string) => void;
  editMessage: (
    channelId: string,
    messageId: string,
    content: string,
    requesterId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteMessage: (
    channelId: string,
    messageId: string,
    requesterId: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

function normalizeChannel(channel: ChannelPayload): Channel {
  return {
    id: channel.id,
    name: channel.name,
    description: channel.description ?? "",
    type: channel.type || "PUBLIC",
    workspaceId: channel.workspaceId || channel.workspace_id || "",
    unreadCount: channel.unreadCount ?? 0,
    hasMention: channel.hasMention ?? false,
  };
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  currentUserId: null,

  channels: [],
  messages: [],
  activeChannelId: null,

  connectSocket: (url, userId, projectId) => {
    if (get().socket) {
      return;
    }

    set({ currentUserId: userId });

    const socket = io(url, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      set({ isConnected: true });
      socket.emit("join", { userId, projectId });
      get().fetchChannels(projectId, socket); // Pass socket instance
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection Error:", err);
      notifyWorkspaceServerUnstable();
    });

    socket.on("disconnect", () => {
      set({ isConnected: false });
    });

    socket.on("chat:message", (message: Message) => {
      const state = get();

      // Mention Detection (Runs for ALL messages)
      const mentionPattern = `[@${state.currentUserId}:`;
      const hasMention = message.content.includes(mentionPattern);

      // If it's the active channel, append message
      if (message.channelId === state.activeChannelId) {
        set((state) => ({ messages: [...state.messages, message] }));
      } else {
        // If inactive, update badge counts
        set((state) => {
          const updatedChannels = state.channels.map((ch) => {
            if (ch.id === message.channelId) {
              return {
                ...ch,
                unreadCount: (ch.unreadCount || 0) + 1,
                hasMention: ch.hasMention || hasMention,
              };
            }
            return ch;
          });

          return { channels: updatedChannels };
        });
      }
    });

    socket.on("chat:message_updated", (message: Message) => {
      set((state) => ({
        messages: state.messages.map((currentMessage) =>
          currentMessage.id === message.id ? message : currentMessage,
        ),
      }));
    });

    socket.on(
      "chat:message_deleted",
      (payload: { id: string; channelId: string }) => {
        set((state) => {
          if (state.activeChannelId !== payload.channelId) {
            return state;
          }

          return {
            messages: state.messages.filter(
              (message) => message.id !== payload.id,
            ),
          };
        });
      },
    );

    socket.on("chat:channel_created", (channelPayload: ChannelPayload) => {
      const channel = normalizeChannel(channelPayload);
      set((state) => {
        if (
          state.channels.some(
            (currentChannel) => currentChannel.id === channel.id,
          )
        ) {
          return state;
        }

        return {
          channels: [...state.channels, channel],
        };
      });
    });

    socket.on(
      "chat:channel_deleted",
      (payload: { id: string; workspaceId: string }) => {
        const state = get();
        const remainingChannels = state.channels.filter(
          (channel) => channel.id !== payload.id,
        );
        const shouldMoveActiveChannel = state.activeChannelId === payload.id;

        set({
          channels: remainingChannels,
          ...(shouldMoveActiveChannel
            ? {
                activeChannelId: null,
                messages: [],
              }
            : {}),
        });

        if (shouldMoveActiveChannel && remainingChannels.length > 0) {
          get().joinChannel(remainingChannels[0].id);
        }
      },
    );

    set({ socket });
  },

  // Helper to sync from Notifications
  setChannelMention: (channelId: string, hasMention: boolean) => {
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId ? { ...ch, hasMention } : ch,
      ),
    }));
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({
        socket: null,
        isConnected: false,
        currentUserId: null,
        channels: [],
        messages: [],
        activeChannelId: null,
      });
    }
  },

  fetchChannels: (workspaceId, socketInstance?: Socket) => {
    // Allow passing socket instance
    const socket = socketInstance || get().socket;
    if (socket?.connected) {
      socket.emit("chat:get_channels", { workspaceId }, (res: ChannelsAck) => {
        if (res.success) {
          const channels = res.data.map(normalizeChannel);
          set({ channels });
          const state = get();
          if (channels.length > 0 && !state.activeChannelId) {
            state.joinChannel(channels[0].id);
          }
        } else {
          console.error("[Socket] Failed to fetch channels:", res.error);
          notifyWorkspaceServerUnstable();
        }
      });
      return;
    }

    notifyWorkspaceServerUnstable();
  },

  joinChannel: (channelId) => {
    const socket = get().socket;
    const prevChannel = get().activeChannelId;

    if (prevChannel && prevChannel !== channelId) {
      socket?.emit("chat:leave", { channelId: prevChannel });
    }

    if (prevChannel === channelId) return;

    // Clear messages and mark as read
    set({ activeChannelId: channelId, messages: [] });
    get().markChannelAsRead(channelId);

    if (socket) {
      socket.emit("chat:join", { channelId });

      socket.emit("chat:get_messages", { channelId }, (res: MessagesAck) => {
        if (res.success) {
          set({ messages: res.data });
        }
      });
    }
  },

  markChannelAsRead: (channelId) => {
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId ? { ...ch, unreadCount: 0, hasMention: false } : ch,
      ),
    }));
  },

  createChannel: (workspaceId, name, description, userId) => {
    const socket = get().socket;
    const normalizedName = name.trim();

    if (!normalizedName) return;

    if (!socket?.connected) {
      notifyWorkspaceServerUnstable();
      return;
    }

    socket.emit(
      "chat:create_channel",
      { workspaceId, name: normalizedName, description, userId },
      (res: CreateChannelAck) => {
        if (res.success) {
          const channel = normalizeChannel(res.data);
          set((state) => ({
            channels: state.channels.some(
              (currentChannel) => currentChannel.id === channel.id,
            )
              ? state.channels
              : [...state.channels, channel],
          }));
          get().joinChannel(channel.id);
          return;
        }

        console.error("[Socket] Failed to create channel:", res.error);
        notifyWorkspaceServerUnstable();
      },
    );
  },

  deleteChannel: (channelId, requesterId) => {
    const socket = get().socket;

    if (!socket?.connected) {
      notifyWorkspaceServerUnstable();
      return Promise.resolve({
        success: false,
        error: WORKSPACE_SERVER_UNSTABLE_MESSAGE,
      });
    }

    return new Promise((resolve) => {
      socket.emit(
        "chat:delete_channel",
        { channelId, requesterId },
        (res: DeleteChannelAck) => {
          if (!res.success) {
            resolve({
              success: false,
              error: res.error || "채널 삭제에 실패했습니다.",
            });
            return;
          }

          resolve({ success: true });
        },
      );
    });
  },

  sendMessage: (channelId, content, senderId) => {
    const socket = get().socket;
    if (socket) {
      socket.emit("chat:message", { channelId, content, senderId });
    }
  },

  editMessage: (channelId, messageId, content, requesterId) => {
    const socket = get().socket;

    if (!socket?.connected) {
      notifyWorkspaceServerUnstable();
      return Promise.resolve({
        success: false,
        error: WORKSPACE_SERVER_UNSTABLE_MESSAGE,
      });
    }

    return new Promise((resolve) => {
      socket.emit(
        "chat:update_message",
        { channelId, messageId, content, requesterId },
        (res: MessageMutationAck) => {
          if (!res.success) {
            resolve({
              success: false,
              error: res.error || "메시지 수정에 실패했습니다.",
            });
            return;
          }

          resolve({ success: true });
        },
      );
    });
  },

  deleteMessage: (channelId, messageId, requesterId) => {
    const socket = get().socket;

    if (!socket?.connected) {
      notifyWorkspaceServerUnstable();
      return Promise.resolve({
        success: false,
        error: WORKSPACE_SERVER_UNSTABLE_MESSAGE,
      });
    }

    return new Promise((resolve) => {
      socket.emit(
        "chat:delete_message",
        { channelId, messageId, requesterId },
        (res: MessageMutationAck) => {
          if (!res.success) {
            resolve({
              success: false,
              error: res.error || "메시지 삭제에 실패했습니다.",
            });
            return;
          }

          resolve({ success: true });
        },
      );
    });
  },
}));
