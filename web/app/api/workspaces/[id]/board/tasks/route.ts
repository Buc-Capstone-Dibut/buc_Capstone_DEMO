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
    const {
      title,
      description,
      columnId,
      assigneeId,
      priority,
      tags,
      dueDate,
    } = body;

    if (!title || !columnId) {
      return NextResponse.json(
        { error: "Title and Column ID are required" },
        { status: 400 },
      );
    }

    // Verify column belongs to workspace
    const column = await prisma.kanban_columns.findFirst({
      where: { id: columnId, workspace_id: workspaceId },
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // 2. Get Max Order in Column
    const lastTask = await prisma.kanban_tasks.findFirst({
      where: { column_id: columnId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newOrder = (lastTask?.order ?? 0) + 1;
    const normalizedPriority =
      priority === undefined
        ? "medium"
        : typeof priority === "string" && priority.trim().length > 0
          ? priority.trim()
          : null;

    // 3. Create Task
    const task = await prisma.kanban_tasks.create({
      data: {
        title: title,
        column_id: columnId,
        order: newOrder,
        description: description || "",
        assignee_id: assigneeId || null,
        tags: tags || [],
        due_date: dueDate ? new Date(dueDate) : null,
        priority: normalizedPriority,
      },
      include: {
        assignee: true,
      },
    });

    // Formatting for frontend
    const formattedTask = {
      id: task.id,
      columnId: task.column_id,
      title: task.title,
      description: task.description,
      order: task.order,
      dueDate: task.due_date,
      assignee: task.assignee ? task.assignee.nickname : null,
      assigneeId: task.assignee_id,
      tags: task.tags,
      priorityId: task.priority || "medium",
      status: column.title.toLowerCase().replace(/\s+/g, "-"),
    };

    return NextResponse.json(formattedTask);
  } catch (error) {
    console.error("Create Task Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
