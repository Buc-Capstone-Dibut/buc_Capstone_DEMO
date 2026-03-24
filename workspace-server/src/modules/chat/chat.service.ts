import "../../config/env";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const READ_ONLY_ERROR = "이 워크스페이스는 종료되어 읽기 전용입니다.";

function toNotificationPreview(content: string) {
  return content
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "[이미지]")
    .replace(/\[@([^:]+):([^\]]+)\]/g, "@$2")
    .replace(/\[#([^:]+):([^\]]+)\]/g, "#$2")
    .replace(/\[!([^:]+):([^\]]+)\]/g, "!$2");
}

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
  updated_at: Date;
  type: string;
}) {
  const createdAtIso = msg.created_at.toISOString();
  const updatedAtIso = msg.updated_at.toISOString();

  return {
    id: msg.id,
    channelId: msg.channel_id,
    content: msg.content,
    senderId: msg.sender_id,
    sender: msg.sender,
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
    isEdited: createdAtIso !== updatedAtIso,
    // Keep legacy key for compatibility; client should prefer createdAt.
    timestamp: createdAtIso,
    type: msg.type.toLowerCase(), // 'TEXT' -> 'text'
  };
}

export class ChatService {
  static async isWorkspaceReadOnly(workspaceId: string): Promise<boolean> {
    try {
      const rows = await prisma.$queryRaw<Array<{ lifecycle_status: string }>>`
        SELECT w.lifecycle_status::text AS lifecycle_status
        FROM "public"."workspaces" w
        WHERE w.id = ${workspaceId}::uuid
        LIMIT 1
      `;
      return rows[0]?.lifecycle_status === "COMPLETED";
    } catch (error) {
      // Keep chat available if lifecycle fields are not ready yet.
      console.warn("[Service] read-only check skipped:", error);
      return false;
    }
  }

  static async assertWorkspaceWritable(workspaceId: string): Promise<void> {
    const readOnly = await this.isWorkspaceReadOnly(workspaceId);
    if (readOnly) {
      throw new Error(READ_ONLY_ERROR);
    }
  }

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
      const readOnly = await this.isWorkspaceReadOnly(workspaceId);
      if (readOnly) {
        return [];
      }

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
    await this.assertWorkspaceWritable(workspaceId);

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
    const channel = await this.getChannelById(channelId);
    if (!channel) throw new Error("Channel not found");

    await this.assertWorkspaceWritable(channel.workspace_id);

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
              const displayContent = toNotificationPreview(content);

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

  static async updateMessage(
    messageId: string,
    content: string,
    requesterId: string,
  ) {
    const nextContent = content.trim();
    if (!nextContent) {
      throw new Error("메시지 내용을 입력해주세요.");
    }

    const existingMessage = await prisma.workspace_messages.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        sender_id: true,
        type: true,
        channel_id: true,
        channel: {
          select: {
            workspace_id: true,
          },
        },
      },
    });

    if (!existingMessage) {
      throw new Error("메시지를 찾을 수 없습니다.");
    }

    if (existingMessage.sender_id !== requesterId) {
      throw new Error("본인이 작성한 메시지만 수정할 수 있습니다.");
    }

    if (existingMessage.type !== "TEXT") {
      throw new Error("이 메시지는 수정할 수 없습니다.");
    }

    await this.assertWorkspaceWritable(existingMessage.channel.workspace_id);

    const updatedMessage = await prisma.workspace_messages.update({
      where: { id: messageId },
      data: {
        content: nextContent,
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

    return toMessagePayload(updatedMessage);
  }

  static async deleteMessage(messageId: string, requesterId: string) {
    const existingMessage = await prisma.workspace_messages.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        sender_id: true,
        type: true,
        channel_id: true,
        channel: {
          select: {
            workspace_id: true,
          },
        },
      },
    });

    if (!existingMessage) {
      throw new Error("메시지를 찾을 수 없습니다.");
    }

    if (existingMessage.sender_id !== requesterId) {
      throw new Error("본인이 작성한 메시지만 삭제할 수 있습니다.");
    }

    if (existingMessage.type === "SYSTEM") {
      throw new Error("시스템 메시지는 삭제할 수 없습니다.");
    }

    await this.assertWorkspaceWritable(existingMessage.channel.workspace_id);

    await prisma.workspace_messages.delete({
      where: { id: messageId },
    });

    return {
      id: existingMessage.id,
      channelId: existingMessage.channel_id,
    };
  }
}
