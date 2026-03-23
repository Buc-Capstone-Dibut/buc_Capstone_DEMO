import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
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
  const membership = await prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: session.user.id,
      },
    },
    select: { user_id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  const tasks = await prisma.kanban_tasks.findMany({
    where: {
      column: {
        workspace_id: workspaceId,
      },
      ...(query
        ? {
            title: {
              contains: query,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: [{ updated_at: "desc" }],
    take: 12,
    select: {
      id: true,
      title: true,
      priority: true,
      column: {
        select: {
          title: true,
        },
      },
    },
  });

  return NextResponse.json(
    tasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      columnTitle: task.column.title,
    })),
  );
}
