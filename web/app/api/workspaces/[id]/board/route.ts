import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getWorkspaceLifecycle,
  isWorkspaceCompleted,
} from "@/lib/server/workspace-lifecycle";

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

  const workspace = await getWorkspaceLifecycle(workspaceId);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // 2. Fetch columns first, then use column_id IN (...) for task lookup.
  // This is more index-friendly than relation filtering on high-cardinality data.
  const columns = await prisma.kanban_columns.findMany({
    where: { workspace_id: workspaceId },
    orderBy: { order: "asc" },
  });
  const columnIds = columns.map((column) => column.id);

  const [tasks, members, tags] = await Promise.all([
    columnIds.length > 0
      ? prisma.kanban_tasks.findMany({
          where: { column_id: { in: columnIds } },
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
        })
      : Promise.resolve<any[]>([]),
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

  const columnMetaById = new Map(
    columns.map((c) => [
      c.id,
      {
        category: c.category || "todo",
        status: c.title.toLowerCase().replace(/\s+/g, "-"),
      },
    ]),
  );

  return NextResponse.json({
    workspace: {
      lifecycleStatus: workspace.lifecycle_status,
      completedAt: workspace.completed_at,
      resultType: workspace.result_type,
      resultLink: workspace.result_link,
      resultNote: workspace.result_note,
      readOnly: isWorkspaceCompleted(workspace),
    },
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
    tasks: tasks.map((t: any) => {
      const columnMeta = columnMetaById.get(t.column_id);
      return {
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
        category: columnMeta?.category || "todo",
        status: columnMeta?.status || "todo",
      };
    }),
    members: formattedMembers,
    tags: tags.map((t: any) => ({ id: t.id, name: t.name, color: t.color })), // Return Tags
    views: mockViews,
    customFields: [],
  });
}
