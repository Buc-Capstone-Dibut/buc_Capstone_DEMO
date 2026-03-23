import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  buildWorkspaceViewUpdateInput,
  serializeWorkspaceView,
} from "@/lib/server/workspace-views";

async function getAuthorizedView(workspaceId: string, viewId: string, userId: string) {
  const membership = await prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    select: { user_id: true },
  });

  if (!membership) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const view = await prisma.workspace_views.findFirst({
    where: {
      id: viewId,
      workspace_id: workspaceId,
    },
  });

  if (!view) {
    return {
      error: NextResponse.json({ error: "View not found" }, { status: 404 }),
    };
  }

  return { view };
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; viewId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const viewId = params.viewId;
  const authorized = await getAuthorizedView(workspaceId, viewId, session.user.id);

  if ("error" in authorized) {
    return authorized.error;
  }

  const writableCheck = await ensureWorkspaceWritable(workspaceId);
  if (!writableCheck.ok) {
    return NextResponse.json(
      { error: writableCheck.error },
      { status: writableCheck.status },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const updateData = buildWorkspaceViewUpdateInput(body);

  const updated = await prisma.workspace_views.update({
    where: { id: viewId },
    data: updateData,
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

  return NextResponse.json(serializeWorkspaceView(updated, formattedColumns));
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; viewId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const viewId = params.viewId;
  const authorized = await getAuthorizedView(workspaceId, viewId, session.user.id);

  if ("error" in authorized) {
    return authorized.error;
  }

  if (authorized.view.is_system) {
    return NextResponse.json(
      { error: "시스템 기본 뷰는 삭제할 수 없습니다." },
      { status: 400 },
    );
  }

  const writableCheck = await ensureWorkspaceWritable(workspaceId);
  if (!writableCheck.ok) {
    return NextResponse.json(
      { error: writableCheck.error },
      { status: writableCheck.status },
    );
  }

  await prisma.workspace_views.delete({
    where: { id: viewId },
  });

  return NextResponse.json({ success: true });
}
