import "../../config/env";
import { prisma } from "../../database/prisma";

const READ_ONLY_ERROR = "이 워크스페이스는 종료되어 읽기 전용입니다.";
const MAX_CHANNEL_NAME_LENGTH = 50;
const MAX_CHANNEL_DESCRIPTION_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 32_768;
const MESSAGE_PAGE_SIZE = 100;

function normalizeRequiredText(
  value: string,
  label: string,
  maxLength: number,
) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${label}을(를) 입력해주세요.`);
  }
  if (normalized.length > maxLength) {
    throw new Error(`${label}은(는) ${maxLength}자 이하여야 합니다.`);
  }
  return normalized;
}

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
      console.error("[Service] read-only check failed closed:", error);
      return true;
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
    const normalizedName = normalizeRequiredText(
      name,
      "채널 이름",
      MAX_CHANNEL_NAME_LENGTH,
    );
    const normalizedDescription = description.trim();
    if (normalizedDescription.length > MAX_CHANNEL_DESCRIPTION_LENGTH) {
      throw new Error(
        `채널 설명은 ${MAX_CHANNEL_DESCRIPTION_LENGTH}자 이하여야 합니다.`,
      );
    }

    // Check duplicate name
    const existing = await prisma.workspace_channels.findFirst({
      where: { workspace_id: workspaceId, name: normalizedName },
    });

    if (existing) {
      throw new Error(`Channel #${normalizedName} already exists.`);
    }

    return await prisma.workspace_channels.create({
      data: {
        workspace_id: workspaceId,
        name: normalizedName,
        description: normalizedDescription,
        type: "PUBLIC",
      },
    });
  }

  static async deleteChannel(
    channelId: string,
    requesterId: string,
    workspaceId: string,
  ) {
    const channel = await prisma.workspace_channels.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        name: true,
        workspace_id: true,
      },
    });

    if (!channel) {
      throw new Error("채널을 찾을 수 없습니다.");
    }
    if (channel.workspace_id !== workspaceId) {
      throw new Error("이 워크스페이스의 채널이 아닙니다.");
    }

    if (channel.name === "general") {
      throw new Error("기본 채널은 삭제할 수 없습니다.");
    }

    const member = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: channel.workspace_id,
          user_id: requesterId,
        },
      },
      select: {
        role: true,
      },
    });

    if (
      !member ||
      !["owner", "admin"].includes((member.role || "").toLowerCase())
    ) {
      throw new Error("채널 삭제 권한이 없습니다.");
    }

    await this.assertWorkspaceWritable(channel.workspace_id);

    await prisma.workspace_channels.delete({
      where: { id: channelId },
    });

    return {
      id: channel.id,
      name: channel.name,
      workspaceId: channel.workspace_id,
    };
  }

  static async getChannelById(channelId: string) {
    return await prisma.workspace_channels.findUnique({
      where: { id: channelId },
    });
  }

  static async assertChannelInWorkspace(
    channelId: string,
    workspaceId: string,
  ) {
    const channel = await prisma.workspace_channels.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        workspace_id: true,
      },
    });
    if (!channel || channel.workspace_id !== workspaceId) {
      throw new Error("채널 접근 권한이 없습니다.");
    }
    return channel;
  }

  // --- Message Management ---

  static async getMessages(channelId: string, workspaceId: string) {
    await this.assertChannelInWorkspace(channelId, workspaceId);
    const messages = await prisma.workspace_messages.findMany({
      where: { channel_id: channelId },
      orderBy: { created_at: "desc" },
      take: MESSAGE_PAGE_SIZE,
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
    return messages.reverse().map((msg) => toMessagePayload(msg));
  }

  static async saveMessage(
    channelId: string,
    content: string,
    senderId: string,
  ) {
    const channel = await this.getChannelById(channelId);
    if (!channel) throw new Error("Channel not found");

    await this.assertWorkspaceWritable(channel.workspace_id);
    const normalizedContent = normalizeRequiredText(
      content,
      "메시지",
      MAX_MESSAGE_LENGTH,
    );

    const msg = await prisma.workspace_messages.create({
      data: {
        channel_id: channelId,
        content: normalizedContent,
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

        while ((match = mentionRegex.exec(normalizedContent)) !== null) {
          if (match[1] !== senderId) {
            // Self-mention check
            mentionedUserIds.add(match[1]);
          }
        }

        if (mentionedUserIds.size > 0) {
          const channel = await this.getChannelById(channelId);
          const workspaceId = channel?.workspace_id;
          const validMembers = workspaceId
            ? await prisma.workspace_members.findMany({
                where: {
                  workspace_id: workspaceId,
                  user_id: { in: Array.from(mentionedUserIds) },
                },
                select: { user_id: true },
              })
            : [];
          const validMemberIds = new Set(
            validMembers.map((member) => member.user_id),
          );

          await Promise.all(
            Array.from(mentionedUserIds)
              .filter((targetUserId) => validMemberIds.has(targetUserId))
              .map(async (targetUserId) => {
                const displayContent = toNotificationPreview(normalizedContent);

                await prisma.notifications.create({
                  data: {
                    user_id: targetUserId,
                    type: "MENTION",
                    title: `New mention in #${channel?.name || "chat"}`,
                    message: `${msg.sender?.nickname || "Someone"} mentioned you: "${displayContent.substring(0, 50)}${displayContent.length > 50 ? "..." : ""}"`,
                    link:
                      workspaceId && channelId
                        ? `/workspace/${workspaceId}?tab=chat-${channelId}`
                        : workspaceId
                          ? `/workspace/${workspaceId}`
                          : undefined,
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
    const nextContent = normalizeRequiredText(
      content,
      "메시지",
      MAX_MESSAGE_LENGTH,
    );

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
