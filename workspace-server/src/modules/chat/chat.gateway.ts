import { Server, Socket } from "socket.io";
import { getSocketIdentity } from "../auth/auth.service";
import { ChatService } from "./chat.service";

export const setupChatGateway = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    // Join Channel Room
    socket.on("chat:join", async (payload: { channelId: string }) => {
      try {
        const identity = getSocketIdentity(socket);
        await ChatService.assertChannelInWorkspace(
          payload.channelId,
          identity.workspaceId,
        );
        await socket.join(payload.channelId);
      } catch (error) {
        console.warn("[CHAT] Rejected channel join", error);
      }
    });

    // Leave Channel Room
    socket.on("chat:leave", (payload: { channelId: string }) => {
      void socket.leave(payload.channelId);
    });

    // Get Channels
    socket.on(
      "chat:get_channels",
      async (payload: { workspaceId: string }, callback) => {
        try {
          const identity = getSocketIdentity(socket);
          const channels = await ChatService.getChannels(identity.workspaceId);
          if (callback) callback({ success: true, data: channels });
        } catch (e: any) {
          console.error(`[Gateway] Error fetching channels:`, e);
          if (callback) callback({ success: false, error: e.message });
        }
      },
    );

    // Create Channel
    socket.on(
      "chat:create_channel",
      async (
        payload: {
          workspaceId: string;
          name: string;
          description: string;
          userId: string;
        },
        callback,
      ) => {
        try {
          const identity = getSocketIdentity(socket);
          const channel = await ChatService.createChannel(
            identity.workspaceId,
            payload.name,
            payload.description,
          );
          io.to(identity.workspaceId).emit("chat:channel_created", channel);
          if (callback) callback({ success: true, data: channel });
        } catch (e: any) {
          if (callback) callback({ success: false, error: e.message });
        }
      },
    );

    socket.on(
      "chat:delete_channel",
      async (
        payload: {
          channelId: string;
          requesterId: string;
        },
        callback,
      ) => {
        try {
          const identity = getSocketIdentity(socket);
          const deletedChannel = await ChatService.deleteChannel(
            payload.channelId,
            identity.userId,
            identity.workspaceId,
          );

          io.to(deletedChannel.workspaceId).emit(
            "chat:channel_deleted",
            deletedChannel,
          );

          if (callback) callback({ success: true, data: deletedChannel });
        } catch (e: any) {
          console.error("Chat Delete Channel Error", e);
          if (callback) callback({ success: false, error: e.message });
        }
      },
    );

    // Get Messages
    socket.on(
      "chat:get_messages",
      async (payload: { channelId: string }, callback) => {
        try {
          const identity = getSocketIdentity(socket);
          const messages = await ChatService.getMessages(
            payload.channelId,
            identity.workspaceId,
          );
          if (callback) callback({ success: true, data: messages });
        } catch (e: any) {
          if (callback) callback({ success: false, error: e.message });
        }
      },
    );

    // Send Message
    socket.on(
      "chat:message",
      async (
        payload: { channelId: string; content: string; senderId: string },
        callback,
      ) => {
        try {
          const identity = getSocketIdentity(socket);
          await ChatService.assertChannelInWorkspace(
            payload.channelId,
            identity.workspaceId,
          );
          const message = await ChatService.saveMessage(
            payload.channelId,
            payload.content,
            identity.userId,
          );

          // Broadcast to everyone in channel
          io.to(payload.channelId).emit("chat:message", message);

          if (callback) callback({ success: true, data: message });
        } catch (e: any) {
          console.error("Chat Error", e);
          if (callback) callback({ success: false, error: e.message });
        }
      },
    );

    socket.on(
      "chat:update_message",
      async (
        payload: {
          channelId: string;
          messageId: string;
          content: string;
          requesterId: string;
        },
        callback,
      ) => {
        try {
          const identity = getSocketIdentity(socket);
          await ChatService.assertChannelInWorkspace(
            payload.channelId,
            identity.workspaceId,
          );
          const message = await ChatService.updateMessage(
            payload.messageId,
            payload.content,
            identity.userId,
          );

          io.to(message.channelId).emit("chat:message_updated", message);

          if (callback) callback({ success: true, data: message });
        } catch (e: any) {
          console.error("Chat Update Error", e);
          if (callback) callback({ success: false, error: e.message });
        }
      },
    );

    socket.on(
      "chat:delete_message",
      async (
        payload: {
          channelId: string;
          messageId: string;
          requesterId: string;
        },
        callback,
      ) => {
        try {
          const identity = getSocketIdentity(socket);
          await ChatService.assertChannelInWorkspace(
            payload.channelId,
            identity.workspaceId,
          );
          const deletedMessage = await ChatService.deleteMessage(
            payload.messageId,
            identity.userId,
          );

          io.to(deletedMessage.channelId).emit(
            "chat:message_deleted",
            deletedMessage,
          );

          if (callback) callback({ success: true, data: deletedMessage });
        } catch (e: any) {
          console.error("Chat Delete Error", e);
          if (callback) callback({ success: false, error: e.message });
        }
      },
    );

    // Typing Indicator
    socket.on(
      "chat:typing",
      async (payload: {
        channelId: string;
        userId: string;
        isTyping: boolean;
      }) => {
        try {
          const identity = getSocketIdentity(socket);
          await ChatService.assertChannelInWorkspace(
            payload.channelId,
            identity.workspaceId,
          );
          socket.to(payload.channelId).emit("chat:typing", {
            channelId: payload.channelId,
            userId: identity.userId,
            isTyping: Boolean(payload.isTyping),
          });
        } catch (error) {
          console.warn("[CHAT] Rejected typing event", error);
        }
      },
    );
  });
};
