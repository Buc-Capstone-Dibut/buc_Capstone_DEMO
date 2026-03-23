import prisma from "@/lib/prisma";
import { Prisma, type workspace_views } from "@prisma/client";

type BoardColumnShape = {
  id: string;
  title: string;
  statusId?: string;
  category?: string | null;
  color?: string;
};

const DEFAULT_CARD_PROPERTIES = [
  "title",
  "priority",
  "tags",
  "assignee",
  "dueDate",
] as const;
const CARD_PROPERTY_SET = new Set(DEFAULT_CARD_PROPERTIES);

const VIEW_TYPES = new Set(["kanban", "list", "calendar"]);
const GROUP_BY_VALUES = new Set([
  "status",
  "assignee",
  "priority",
  "dueDate",
  "tag",
]);

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeViewType(value: unknown) {
  return VIEW_TYPES.has(value as string) ? (value as string) : "kanban";
}

function normalizeGroupBy(value: unknown) {
  return GROUP_BY_VALUES.has(value as string) ? (value as string) : "status";
}

function toStringArray(
  value: Prisma.JsonValue | null | undefined,
  fallback: string[] = [],
) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeCardProperties(
  value: Prisma.JsonValue | string[] | null | undefined,
  fallback: string[] = [...DEFAULT_CARD_PROPERTIES],
) {
  const source = Array.isArray(value) ? value : fallback;
  const ordered = source.filter(
    (item): item is string =>
      typeof item === "string" &&
      item !== "title" &&
      CARD_PROPERTY_SET.has(item as (typeof DEFAULT_CARD_PROPERTIES)[number]),
  );

  return ["title", ...Array.from(new Set(ordered))];
}

function toColumnArray(
  value: Prisma.JsonValue | null | undefined,
  fallbackColumns: BoardColumnShape[] = [],
) {
  if (!Array.isArray(value)) return fallbackColumns;

  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const source = item as Record<string, unknown>;
      const id = typeof source.id === "string" ? source.id : null;
      const title = typeof source.title === "string" ? source.title : null;

      if (!id || !title) return null;

      return {
        id,
        title,
        statusId:
          typeof source.statusId === "string"
            ? source.statusId
            : typeof source.status_id === "string"
              ? source.status_id
              : id,
        category:
          typeof source.category === "string" ? source.category : "todo",
        color: typeof source.color === "string" ? source.color : undefined,
      };
    })
    .filter(Boolean) as BoardColumnShape[];

  return parsed.length > 0 ? parsed : fallbackColumns;
}

function buildStatusColumns(columns: BoardColumnShape[]) {
  return columns.map((column) => ({
    id: column.id,
    title: column.title,
    statusId: column.statusId || column.id,
    category: column.category || "todo",
    ...(column.color ? { color: column.color } : {}),
  }));
}

function buildDefaultViewSeeds(workspaceId: string, columns: BoardColumnShape[]) {
  const statusColumns = buildStatusColumns(columns);
  const columnOrder = columns.map((column) => column.id);

  return [
    {
      workspace_id: workspaceId,
      name: "Main Board",
      type: "kanban",
      group_by: "status",
      color: "green",
      columns: statusColumns,
      card_properties: [...DEFAULT_CARD_PROPERTIES],
      show_empty_groups: true,
      column_order: columnOrder,
      is_system: true,
      view_order: 0,
    },
    {
      workspace_id: workspaceId,
      name: "Team View",
      type: "kanban",
      group_by: "assignee",
      color: "blue",
      columns: [],
      card_properties: [...DEFAULT_CARD_PROPERTIES],
      show_empty_groups: true,
      column_order: [],
      is_system: true,
      view_order: 1,
    },
    {
      workspace_id: workspaceId,
      name: "Priority View",
      type: "kanban",
      group_by: "priority",
      color: "orange",
      columns: [],
      card_properties: [...DEFAULT_CARD_PROPERTIES],
      show_empty_groups: true,
      column_order: [],
      is_system: true,
      view_order: 2,
    },
    {
      workspace_id: workspaceId,
      name: "Tag View",
      type: "kanban",
      group_by: "tag",
      color: "gray",
      columns: [],
      card_properties: [...DEFAULT_CARD_PROPERTIES],
      show_empty_groups: true,
      column_order: [],
      is_system: true,
      view_order: 3,
    },
  ] satisfies Prisma.workspace_viewsCreateManyInput[];
}

export async function ensureWorkspaceViews(
  workspaceId: string,
  columns: BoardColumnShape[],
) {
  const existingViews = await prisma.workspace_views.findMany({
    where: { workspace_id: workspaceId },
    orderBy: [{ view_order: "asc" }, { created_at: "asc" }],
  });

  if (existingViews.length > 0) {
    return existingViews;
  }

  const seeds = buildDefaultViewSeeds(workspaceId, columns);
  await prisma.workspace_views.createMany({ data: seeds });

  return prisma.workspace_views.findMany({
    where: { workspace_id: workspaceId },
    orderBy: [{ view_order: "asc" }, { created_at: "asc" }],
  });
}

export function serializeWorkspaceView(
  view: workspace_views,
  columns: BoardColumnShape[],
) {
  const groupBy = normalizeGroupBy(view.group_by);
  const isLiveStatusView = groupBy === "status" && view.is_system;
  const fallbackColumns = groupBy === "status" ? buildStatusColumns(columns) : [];
  const liveColumnOrder = columns.map((column) => column.id);

  return {
    id: view.id,
    projectId: view.workspace_id,
    name: view.name,
    type: normalizeViewType(view.type),
    groupBy,
    icon: view.icon || undefined,
    color: view.color || undefined,
    columns: isLiveStatusView
      ? fallbackColumns
      : toColumnArray(view.columns, fallbackColumns),
    cardProperties: toStringArray(
      normalizeCardProperties(
        view.card_properties,
        [...DEFAULT_CARD_PROPERTIES],
      ),
      [...DEFAULT_CARD_PROPERTIES],
    ),
    filter:
      view.filters && typeof view.filters === "object" && !Array.isArray(view.filters)
        ? (view.filters as Record<string, unknown>)
        : undefined,
    isSystem: view.is_system,
    showEmptyGroups: view.show_empty_groups,
    columnOrder: isLiveStatusView
      ? liveColumnOrder
      : toStringArray(
          view.column_order,
          groupBy === "status" ? liveColumnOrder : [],
        ),
  };
}

export function buildWorkspaceViewCreateInput(
  workspaceId: string,
  input: Record<string, unknown>,
  viewOrder: number,
) {
  const filters =
    input.filter && typeof input.filter === "object" && !Array.isArray(input.filter)
      ? (input.filter as Prisma.InputJsonValue)
      : input.filters &&
          typeof input.filters === "object" &&
          !Array.isArray(input.filters)
        ? (input.filters as Prisma.InputJsonValue)
        : Prisma.DbNull;

  return {
    workspace_id: workspaceId,
    name: asString(input.name, "새 뷰"),
    type: normalizeViewType(input.type),
    group_by: normalizeGroupBy(input.groupBy ?? input.group_by),
    icon: typeof input.icon === "string" ? input.icon : null,
    color: typeof input.color === "string" ? input.color : null,
    columns: Array.isArray(input.columns) ? input.columns : [],
    card_properties: Array.isArray(input.cardProperties)
      ? normalizeCardProperties(input.cardProperties)
      : Array.isArray(input.card_properties)
        ? normalizeCardProperties(input.card_properties)
        : [...DEFAULT_CARD_PROPERTIES],
    filters,
    show_empty_groups:
      typeof input.showEmptyGroups === "boolean"
        ? input.showEmptyGroups
        : typeof input.show_empty_groups === "boolean"
          ? input.show_empty_groups
          : true,
    column_order: Array.isArray(input.columnOrder)
      ? input.columnOrder
      : Array.isArray(input.column_order)
        ? input.column_order
        : [],
    is_system: Boolean(input.isSystem ?? input.is_system),
    view_order: viewOrder,
  } satisfies Prisma.workspace_viewsUncheckedCreateInput;
}

export function buildWorkspaceViewUpdateInput(input: Record<string, unknown>) {
  const data: Prisma.workspace_viewsUncheckedUpdateInput = {};

  if (typeof input.name === "string" && input.name.trim()) {
    data.name = input.name.trim();
  }

  if (input.type !== undefined) {
    data.type = normalizeViewType(input.type);
  }

  if (input.groupBy !== undefined || input.group_by !== undefined) {
    data.group_by = normalizeGroupBy(input.groupBy ?? input.group_by);
  }

  if (input.icon !== undefined) {
    data.icon = typeof input.icon === "string" ? input.icon : null;
  }

  if (input.color !== undefined) {
    data.color = typeof input.color === "string" ? input.color : null;
  }

  if (input.columns !== undefined && Array.isArray(input.columns)) {
    data.columns = input.columns;
  }

  if (input.cardProperties !== undefined || input.card_properties !== undefined) {
    const properties = input.cardProperties ?? input.card_properties;
    if (Array.isArray(properties)) {
      data.card_properties = normalizeCardProperties(properties);
    }
  }

  if (input.filter !== undefined || input.filters !== undefined) {
    const filters = input.filter ?? input.filters;
    if (filters === null) {
      data.filters = Prisma.DbNull;
    } else if (
      filters &&
      typeof filters === "object" &&
      !Array.isArray(filters)
    ) {
      data.filters = filters as Prisma.InputJsonValue;
    }
  }

  if (
    input.showEmptyGroups !== undefined ||
    input.show_empty_groups !== undefined
  ) {
    data.show_empty_groups = Boolean(
      input.showEmptyGroups ?? input.show_empty_groups,
    );
  }

  if (input.columnOrder !== undefined || input.column_order !== undefined) {
    const order = input.columnOrder ?? input.column_order;
    if (Array.isArray(order)) {
      data.column_order = order;
    }
  }

  if (input.viewOrder !== undefined || input.view_order !== undefined) {
    const orderValue = input.viewOrder ?? input.view_order;
    if (typeof orderValue === "number") {
      data.view_order = orderValue;
    }
  }

  return data;
}
