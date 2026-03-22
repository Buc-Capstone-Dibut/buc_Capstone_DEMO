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
}
