import { Prisma } from "@prisma/client";
import { normalizeTeamType } from "@/lib/team-types";

const DEFAULT_WORKSPACE_COLUMNS = [
  { title: "To Do", category: "todo", order: 0 },
  { title: "In Progress", category: "in-progress", order: 1 },
  { title: "Done", category: "done", order: 2 },
] as const;

const DEFAULT_WORKSPACE_TAGS = [
  { name: "Bug", color: "red" },
  { name: "Feature", color: "blue" },
  { name: "Enhancement", color: "purple" },
] as const;

const DEFAULT_WORKSPACE_CHANNELS = [
  {
    name: "general",
    description: "팀 공지와 기본 대화를 나누는 채널",
  },
  {
    name: "dev-log",
    description: "작업 진행 상황과 개발 메모를 공유하는 채널",
  },
] as const;

export function normalizeWorkspaceCategory(
  value: string | null | undefined,
): string {
  return normalizeTeamType(value);
}

export async function seedWorkspaceDefaults(
  tx: Prisma.TransactionClient,
  workspaceId: string,
) {
  await tx.kanban_columns.createMany({
    data: DEFAULT_WORKSPACE_COLUMNS.map((column) => ({
      workspace_id: workspaceId,
      title: column.title,
      category: column.category,
      order: column.order,
    })),
  });

  await tx.kanban_tags.createMany({
    data: DEFAULT_WORKSPACE_TAGS.map((tag) => ({
      workspace_id: workspaceId,
      name: tag.name,
      color: tag.color,
    })),
  });

  await tx.workspace_channels.createMany({
    data: DEFAULT_WORKSPACE_CHANNELS.map((channel) => ({
      workspace_id: workspaceId,
      name: channel.name,
      description: channel.description,
    })),
  });
}
