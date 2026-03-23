import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

const STATUS_CATEGORIES = ["todo", "in-progress", "done"] as const;
type StatusCategory = (typeof STATUS_CATEGORIES)[number];

function normalizeCategory(value: unknown): StatusCategory | null {
  if (typeof value !== "string") return null;
  if (value === "todo" || value === "in-progress" || value === "done") {
    return value;
  }
  return null;
}

function getInsertOrder(
  columns: Array<{ id: string; order: number; category: string | null }>,
  category: StatusCategory,
  excludeId?: string,
) {
  const normalizedColumns = columns
    .filter((column) => column.id !== excludeId)
    .sort((a, b) => a.order - b.order);
  const sameCategory = normalizedColumns.filter(
    (column) => normalizeCategory(column.category) === category,
  );

  if (sameCategory.length > 0) {
    return sameCategory[sameCategory.length - 1].order + 1;
  }

  const categoryIndex = STATUS_CATEGORIES.indexOf(category);
  for (const nextCategory of STATUS_CATEGORIES.slice(categoryIndex + 1)) {
    const nextColumn = normalizedColumns.find(
      (column) => normalizeCategory(column.category) === nextCategory,
    );
    if (nextColumn) return nextColumn.order;
  }

  return (normalizedColumns[normalizedColumns.length - 1]?.order ?? -1) + 1;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; columnId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;

  try {
    const { id: workspaceId, columnId } = params;
    const body = await request.json();

    // Verify workspace membership
    const member = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    const currentColumn = await prisma.kanban_columns.findFirst({
      where: {
        id: columnId,
        workspace_id: workspaceId,
      },
      select: {
        id: true,
        title: true,
        category: true,
        order: true,
      },
    });

    if (!currentColumn) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    const nextTitle =
      typeof body.title === "string" ? body.title.trim() : undefined;
    const nextCategory =
      body.category !== undefined ? normalizeCategory(body.category) : undefined;

    if (body.title !== undefined && !nextTitle) {
      return NextResponse.json(
        { error: "세부 단계 이름을 입력해 주세요." },
        { status: 400 },
      );
    }

    if (body.category !== undefined && !nextCategory) {
      return NextResponse.json(
        { error: "유효하지 않은 섹션 축입니다." },
        { status: 400 },
      );
    }

    if (
      nextTitle &&
      nextTitle.toLowerCase() !== currentColumn.title.toLowerCase()
    ) {
      const duplicate = await prisma.kanban_columns.findFirst({
        where: {
          workspace_id: workspaceId,
          id: { not: columnId },
          title: {
            equals: nextTitle,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "같은 이름의 세부 단계가 이미 있습니다." },
          { status: 409 },
        );
      }
    }

    const currentCategory = normalizeCategory(currentColumn.category) || "todo";
    const shouldMoveCategory =
      nextCategory !== undefined && nextCategory !== currentCategory;

    const updatedColumn = await prisma.$transaction(async (tx) => {
      let targetOrder: number | undefined;

      if (shouldMoveCategory && nextCategory) {
        const allColumns = await tx.kanban_columns.findMany({
          where: { workspace_id: workspaceId },
          orderBy: { order: "asc" },
          select: { id: true, order: true, category: true },
        });

        targetOrder = getInsertOrder(allColumns, nextCategory, columnId);

        await tx.kanban_columns.updateMany({
          where: {
            workspace_id: workspaceId,
            id: { not: columnId },
            order: { gt: currentColumn.order },
          },
          data: {
            order: { decrement: 1 },
          },
        });

        await tx.kanban_columns.updateMany({
          where: {
            workspace_id: workspaceId,
            id: { not: columnId },
            order: { gte: targetOrder },
          },
          data: {
            order: { increment: 1 },
          },
        });
      }

      return tx.kanban_columns.update({
        where: { id: columnId },
        data: {
          ...(nextTitle !== undefined ? { title: nextTitle } : {}),
          ...(nextCategory !== undefined ? { category: nextCategory } : {}),
          ...(targetOrder !== undefined ? { order: targetOrder } : {}),
        },
      });
    });

    return NextResponse.json(updatedColumn);
  } catch (error) {
    console.error("Error updating column:", error);
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; columnId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;

  try {
    const { id: workspaceId, columnId } = params;

    const member = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    const column = await prisma.kanban_columns.findFirst({
      where: {
        id: columnId,
        workspace_id: workspaceId,
      },
      select: {
        id: true,
        order: true,
        category: true,
      },
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    const normalizedCategory = normalizeCategory(column.category) || "todo";

    const [sameCategoryCount, taskCount] = await Promise.all([
      prisma.kanban_columns.count({
        where: {
          workspace_id: workspaceId,
          category: normalizedCategory,
        },
      }),
      prisma.kanban_tasks.count({
        where: {
          column_id: columnId,
        },
      }),
    ]);

    if (sameCategoryCount <= 1) {
      return NextResponse.json(
        { error: "각 큰 축에는 최소 1개의 세부 단계가 필요합니다." },
        { status: 400 },
      );
    }

    if (taskCount > 0) {
      return NextResponse.json(
        { error: "태스크가 남아 있는 세부 단계는 삭제할 수 없습니다." },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.kanban_columns.delete({
        where: { id: columnId },
      });

      await tx.kanban_columns.updateMany({
        where: {
          workspace_id: workspaceId,
          order: { gt: column.order },
        },
        data: {
          order: { decrement: 1 },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 },
    );
  }
}
