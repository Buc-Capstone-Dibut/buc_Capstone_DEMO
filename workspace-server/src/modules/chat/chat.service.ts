import "../../config/env";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function toMessagePayload(msg: {
  id: string;
  channel_id: string;
  content: string;
  sender_id: string;
  sender: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
  created_at: Date;
  type: string;
}) {
  const createdAtIso = msg.created_at.toISOString();

  return {
    id: msg.id,
    channelId: msg.channel_id,
    content: msg.content,
    senderId: msg.sender_id,
    sender: msg.sender,
    createdAt: createdAtIso,
    // Keep legacy key for compatibility; client should prefer createdAt.
    timestamp: createdAtIso,
    type: msg.type.toLowerCase(), // 'TEXT' -> 'text'
  };
}

export class ChatService {
  // --- Channel Management ---

  static async getChannels(workspaceId: string) {
    console.log(`[Service] getChannels called for workspaceId: ${workspaceId}`);
    // If no channels exist for this workspace, create defaults?
    // For now just return what is there.
    const channels = await prisma.workspace_channels.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: "asc" },
    });
    console.log(`[Service] DB returned ${channels.length} channels`);

    if (channels.length === 0) {
      console.log(
        `[Service] No channels found. Creating default 'general' channel.`,
      );
      // Create 'general' channel if none exist
      const general = await this.createChannel(
        workspaceId,
        "general",
        "General discussion",
      );
      return [general];
    }

    return channels;
  }

  static async createChannel(
    workspaceId: string,
    name: string,
    description: string = "",
  ) {
    // Check duplicate name
    const existing = await prisma.workspace_channels.findFirst({
      where: { workspace_id: workspaceId, name },
    });

    if (existing) {
      throw new Error(`Channel #${name} already exists.`);
    }

    return await prisma.workspace_channels.create({
      data: {
        workspace_id: workspaceId,
        name,
        description,
        type: "PUBLIC",
      },
    });
  }

  static async getChannelById(channelId: string) {
    return await prisma.workspace_channels.findUnique({
      where: { id: channelId },
    });
  }

  // --- Message Management ---

  static async getMessages(channelId: string) {
    const messages = await prisma.workspace_messages.findMany({
      where: { channel_id: channelId },
      orderBy: { created_at: "asc" },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatar_url: true,
          },
        },
      },
    });

    // Send absolute time; UI should render in client locale/timezone.
    return messages.map((msg) => toMessagePayload(msg));
  }

  static async saveMessage(
    channelId: string,
    content: string,
    senderId: string,
  ) {
    // Ensure channel exists
    // const channel = await this.getChannelById(channelId);
    // if (!channel) throw new Error("Channel not found");

    const msg = await prisma.workspace_messages.create({
      data: {
        channel_id: channelId,
        content,
        sender_id: senderId,
        type: "TEXT",
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatar_url: true,
          },
        },
      },
    });

    // --- Mention Handling & Notification Persistence (Non-blocking) ---
    // Fire-and-forget to avoid delaying client response
    (async () => {
      try {
        // Regex detects [@userId:name] - Updated to accept any ID format (not just 36 char UUID)
        const mentionRegex = /\[@([^:]+):([^\]]+)\]/g;
        const mentionedUserIds = new Set<string>();
        let match;

        while ((match = mentionRegex.exec(content)) !== null) {
          if (match[1] !== senderId) {
            // Self-mention check
            mentionedUserIds.add(match[1]);
          }
        }

        if (mentionedUserIds.size > 0) {
          const channel = await this.getChannelById(channelId);
          const workspaceId = channel?.workspace_id;

          await Promise.all(
            Array.from(mentionedUserIds).map(async (targetUserId) => {
              // Clean content for notification display (replace [@id:name] with @name)
              const displayContent = content.replace(
                /\[@([^:]+):([^\]]+)\]/g,
                "@$2",
              );

              await prisma.notifications.create({
                data: {
                  user_id: targetUserId,
                  type: "MENTION",
                  title: `New mention in #${channel?.name || "chat"}`,
                  message: `${msg.sender?.nickname || "Someone"} mentioned you: "${displayContent.substring(0, 50)}${displayContent.length > 50 ? "..." : ""}"`,
                  link: `/workspace/${workspaceId}`,
                },
              });
            }),
          );
        }
      } catch (error) {
        console.error(
          "[Service] Failed to create notifications (background):",
          error,
        );
      }
    })();

    return toMessagePayload(msg);
  }
}
