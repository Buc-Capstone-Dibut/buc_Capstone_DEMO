import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getWorkspaceLifecycle,
  isWorkspaceCompleted,
} from "@/lib/server/workspace-lifecycle";
import {
  ensureWorkspaceViews,
  serializeWorkspaceView,
} from "@/lib/server/workspace-views";

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

  const columns = await prisma.kanban_columns.findMany({
    where: { workspace_id: workspaceId },
    orderBy: { order: "asc" },
  });
  const columnIds = columns.map((column) => column.id);
  const formattedColumns = columns.map((column) => ({
    id: column.id,
    title: column.title,
    statusId: column.title.toLowerCase().replace(/\s+/g, "-"),
    category: column.category || "todo",
    color:
      column.category === "in-progress"
        ? "blue"
        : column.category === "done"
          ? "green"
          : "gray",
  }));

  const [tasks, members, tags, views] = await Promise.all([
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
      : Promise.resolve<
          Array<{
            id: string;
            column_id: string;
            title: string;
            description: string | null;
            order: number;
            due_date: Date | null;
            assignee_id: string | null;
            tags: string[];
            priority: string | null;
            assignee: {
              nickname: string | null;
              avatar_url: string | null;
            } | null;
          }>
        >([]),
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
    ensureWorkspaceViews(workspaceId, formattedColumns),
  ]);

  const formattedMembers = members.map((member) => ({
    id: member.user_id,
    name: member.user.nickname || null,
    email: null,
    avatar: member.user.avatar_url,
    role: member.role,
  }));

  const columnMetaById = new Map(
    columns.map((column) => [
      column.id,
      {
        title: column.title,
        category: column.category || "todo",
        status: column.title.toLowerCase().replace(/\s+/g, "-"),
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
    columns: formattedColumns,
    tasks: tasks.map((task) => {
      const columnMeta = columnMetaById.get(task.column_id);
      return {
        id: task.id,
        columnId: task.column_id,
        projectId: workspaceId,
        title: task.title,
        description: task.description,
        order: task.order,
        dueDate: task.due_date,
        assignee: task.assignee ? task.assignee.nickname : null,
        assigneeProfile: task.assignee
          ? {
              id: task.assignee_id,
              name: task.assignee.nickname || "Unknown",
              avatar: task.assignee.avatar_url,
            }
          : null,
        assigneeId: task.assignee_id,
        tags: task.tags,
        priority: task.priority || "medium",
        priorityId: task.priority || "medium",
        columnTitle: columnMeta?.title || null,
        category: columnMeta?.category || "todo",
        status: columnMeta?.status || "todo",
      };
    }),
    members: formattedMembers,
    tags: tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
    views: views.map((view) => serializeWorkspaceView(view, formattedColumns)),
    customFields: [],
  });
}
