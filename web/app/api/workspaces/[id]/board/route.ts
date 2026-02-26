import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
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

  // 2. Fetch Board Data — select 기반으로 필요한 필드만 조회 (N+1 제거)
  const [columns, tasks, members, tags] = await Promise.all([
    prisma.kanban_columns.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { order: "asc" },
    }),

    // assignee 전체 대신 필요한 필드만 select
    prisma.kanban_tasks.findMany({
      where: { column: { workspace_id: workspaceId } },
      select: {
        id: true,
        column_id: true,
        title: true,
        description: true,
        order: true,
        due_date: true,
        assignee_id: true,
        tags: true,
        priority: true,
        assignee: {
          select: { nickname: true, avatar_url: true },
        },
      },
      orderBy: { order: "asc" },
    }),

    // user 전체 대신 필요한 필드만 select
    prisma.workspace_members.findMany({
      where: { workspace_id: workspaceId },
      select: {
        user_id: true,
        role: true,
        user: {
          select: { id: true, nickname: true, avatar_url: true },
        },
      },
    }),

    prisma.kanban_tags.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { name: "asc" },
    }),
  ]);

  // 3. Transform Data for Frontend

  const formattedMembers = members.map((m) => ({
    id: m.user_id,
    name: m.user.nickname || null,
    email: null,
    avatar: m.user.avatar_url,
    role: m.role,
  }));

  // Mock Views (Since we don't have a views table yet)
  // The frontend needs at least one view to render the board
  const mockViews = [
    {
      id: "view-default",
      name: "Main Board",
      type: "kanban",
      groupBy: "status",
      columns: [], // Will be filled dynamically by the frontend or logic below if needed
      isSystem: true,
    },
  ];

  return NextResponse.json({
    columns: columns.map((c: any) => ({
      id: c.id,
      title: c.title,
      statusId: c.title.toLowerCase().replace(/\s+/g, "-"), // Generate statusId from title for now
      category: c.category || "todo",
      color:
        c.category === "in-progress"
          ? "blue"
          : c.category === "done"
            ? "green"
            : "gray",
    })),
    tasks: tasks.map((t: any) => ({
      id: t.id,
      columnId: t.column_id,
      projectId: workspaceId, // Important for frontend filter
      title: t.title,
      description: t.description,
      order: t.order,
      dueDate: t.due_date,
      assignee: t.assignee ? t.assignee.nickname : null,
      assigneeId: t.assignee_id,
      tags: t.tags,
      priority: t.priority || "medium",
      priorityId: t.priority || "medium",
      // Stable category for styling: 'todo', 'in-progress', 'done'
      category: columns.find((c) => c.id === t.column_id)?.category || "todo",
      status:
        columns
          .find((c) => c.id === t.column_id)
          ?.title.toLowerCase()
          .replace(/\s+/g, "-") || "todo",
    })),
    members: formattedMembers,
    tags: tags.map((t: any) => ({ id: t.id, name: t.name, color: t.color })), // Return Tags
    views: mockViews,
    customFields: [],
  });
}
