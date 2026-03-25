import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

type ReorderColumnItem = {
  id: string;
  order: number;
};

type ReorderTaskItem = ReorderColumnItem & {
  columnId?: string;
};

const isReorderColumnItem = (value: unknown): value is ReorderColumnItem =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "order" in value &&
  typeof value.order === "number";

const isReorderTaskItem = (value: unknown): value is ReorderTaskItem =>
  isReorderColumnItem(value) &&
  (!("columnId" in value) || value.columnId === undefined || typeof value.columnId === "string");

export async function PATCH(
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

  const user = session.user;

  try {
    const { id: workspaceId } = params;
    const { type, items } = await request.json();

    // Verify workspace membership
    const member = await prisma.workspace_members.findFirst({
      where: {
        workspace_id: workspaceId,
        user_id: user.id,
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

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    if (type === "column" && !items.every(isReorderColumnItem)) {
      return NextResponse.json({ error: "Invalid column payload" }, { status: 400 });
    }

    if (type === "task" && !items.every(isReorderTaskItem)) {
      return NextResponse.json({ error: "Invalid task payload" }, { status: 400 });
    }

    const itemIds = Array.from(
      new Set(
        items
          .map((item: { id?: unknown }) =>
            typeof item?.id === "string" ? item.id : null,
          )
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (itemIds.length !== items.length) {
      return NextResponse.json({ error: "Invalid item ids" }, { status: 400 });
    }

    if (type === "column") {
      const columns = await prisma.kanban_columns.findMany({
        where: {
          id: { in: itemIds },
          workspace_id: workspaceId,
        },
        select: { id: true },
      });

      if (columns.length !== itemIds.length) {
        return NextResponse.json(
          { error: "Column not found in workspace" },
          { status: 404 },
        );
      }
    } else if (type === "task") {
      const [tasks, destinationColumns] = await Promise.all([
        prisma.kanban_tasks.findMany({
          where: {
            id: { in: itemIds },
            column: {
              workspace_id: workspaceId,
            },
          },
          select: { id: true },
        }),
        prisma.kanban_columns.findMany({
          where: {
            id: {
              in: Array.from(
                new Set(
                  items
                    .map((item: { columnId?: unknown }) =>
                      typeof item?.columnId === "string" ? item.columnId : null,
                    )
                    .filter((id): id is string => Boolean(id)),
                ),
              ),
            },
            workspace_id: workspaceId,
          },
          select: { id: true },
        }),
      ]);

      if (tasks.length !== itemIds.length) {
        return NextResponse.json(
          { error: "Task not found in workspace" },
          { status: 404 },
        );
      }

      const destinationColumnIds = Array.from(
        new Set(
          items
            .map((item: { columnId?: unknown }) =>
              typeof item?.columnId === "string" ? item.columnId : null,
            )
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (destinationColumns.length !== destinationColumnIds.length) {
        return NextResponse.json(
          { error: "Destination column not found in workspace" },
          { status: 404 },
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Transaction for batch updates
    await prisma.$transaction(
      async (tx) => {
        if (type === "column") {
          const columnItems = items as ReorderColumnItem[];
          await Promise.all(
            columnItems.map((item) =>
              tx.kanban_columns.update({
                where: { id: item.id },
                data: { order: item.order },
              }),
            ),
          );
        } else if (type === "task") {
          const taskItems = items as ReorderTaskItem[];
          await Promise.all(
            taskItems.map((item) => {
              const data: { order: number; column_id?: string } = {
                order: item.order,
              };
              if (item.columnId) {
                data.column_id = item.columnId;
              }
              return tx.kanban_tasks.update({
                where: { id: item.id },
                data,
              });
            }),
          );
        }
      },
      {
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering:", error);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}
