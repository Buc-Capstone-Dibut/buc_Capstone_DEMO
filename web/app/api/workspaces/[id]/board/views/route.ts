import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  buildWorkspaceViewCreateInput,
  serializeWorkspaceView,
} from "@/lib/server/workspace-views";

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

  const writableCheck = await ensureWorkspaceWritable(workspaceId);
  if (!writableCheck.ok) {
    return NextResponse.json(
      { error: writableCheck.error },
      { status: writableCheck.status },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const lastView = await prisma.workspace_views.findFirst({
    where: { workspace_id: workspaceId },
    orderBy: { view_order: "desc" },
    select: { view_order: true },
  });
  const nextOrder = (lastView?.view_order ?? -1) + 1;

  const created = await prisma.workspace_views.create({
    data: buildWorkspaceViewCreateInput(workspaceId, body, nextOrder),
  });

  const columns = await prisma.kanban_columns.findMany({
    where: { workspace_id: workspaceId },
    orderBy: { order: "asc" },
  });
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

  return NextResponse.json(serializeWorkspaceView(created, formattedColumns));
}
