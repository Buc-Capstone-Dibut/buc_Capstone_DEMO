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
  columns: Array<{ order: number; category: string | null }>,
  category: StatusCategory,
) {
  const normalizedColumns = [...columns].sort((a, b) => a.order - b.order);
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

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const userId = session.user.id;

  // 1. Check Membership
  const memberCheck = await prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
      // You might want to check for 'LEADER' or 'MEMBER' role if guests are restricted
    },
  });

  if (!memberCheck) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const writableCheck = await ensureWorkspaceWritable(workspaceId);
  if (!writableCheck.ok) {
    return NextResponse.json(
      { error: writableCheck.error },
      { status: writableCheck.status },
    );
  }

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const category = normalizeCategory(body.category ?? "todo");

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 },
      );
    }

    const duplicate = await prisma.kanban_columns.findFirst({
      where: {
        workspace_id: workspaceId,
        title: {
          equals: title,
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

    const column = await prisma.$transaction(async (tx) => {
      const columns = await tx.kanban_columns.findMany({
        where: { workspace_id: workspaceId },
        orderBy: { order: "asc" },
        select: { order: true, category: true },
      });

      const insertOrder = getInsertOrder(columns, category);

      await tx.kanban_columns.updateMany({
        where: {
          workspace_id: workspaceId,
          order: { gte: insertOrder },
        },
        data: {
          order: { increment: 1 },
        },
      });

      return tx.kanban_columns.create({
        data: {
          workspace_id: workspaceId,
          title,
          order: insertOrder,
          category,
        },
      });
    });

    return NextResponse.json(column);
  } catch (error) {
    console.error("Create Column Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
