import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

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

    // Transaction for batch updates
    await prisma.$transaction(
      async (tx) => {
        if (type === "column") {
          await Promise.all(
            items.map((item: any) =>
              tx.kanban_columns.update({
                where: { id: item.id },
                data: { order: item.order },
              }),
            ),
          );
        } else if (type === "task") {
          await Promise.all(
            items.map((item: any) => {
              const data: any = { order: item.order };
              if (item.columnId) {
                data.column_id = item.columnId;
              }
              return tx.kanban_tasks.update({
                where: { id: item.id },
                data: data,
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
