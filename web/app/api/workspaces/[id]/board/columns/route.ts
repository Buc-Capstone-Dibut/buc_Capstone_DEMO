import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

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
    const { title, category = "todo" } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // 2. Get Max Order
    const lastColumn = await prisma.kanban_columns.findFirst({
      where: { workspace_id: workspaceId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newOrder = (lastColumn?.order ?? 0) + 1;

    // 3. Create Column
    const column = await prisma.kanban_columns.create({
      data: {
        workspace_id: workspaceId,
        title: title,
        order: newOrder,
        category: category,
      },
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
