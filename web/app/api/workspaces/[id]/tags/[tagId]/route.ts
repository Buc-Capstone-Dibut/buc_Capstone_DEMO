import { createRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; tagId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId, tagId } = params;
  const memberCheck = await prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: session.user.id,
      },
    },
    select: { user_id: true },
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

  const deleted = await prisma.$transaction(async (tx) => {
    const tag = await tx.kanban_tags.findFirst({
      where: { id: tagId, workspace_id: workspaceId },
      select: { id: true },
    });
    if (!tag) return { count: 0 };

    const tasks = await tx.kanban_tasks.findMany({
      where: {
        board: { workspace_id: workspaceId },
        tags: { has: tagId },
      },
      select: { id: true, tags: true },
    });

    await Promise.all(
      tasks.map((task) =>
        tx.kanban_tasks.update({
          where: { id: task.id },
          data: {
            tags: {
              set: task.tags.filter((existingTagId) => existingTagId !== tagId),
            },
          },
        }),
      ),
    );

    return tx.kanban_tags.deleteMany({
      where: { id: tagId, workspace_id: workspaceId },
    });
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; tagId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workspaceId, tagId } = params;
  const memberCheck = await prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: session.user.id,
      },
    },
    select: { user_id: true },
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

  const body = (await request.json()) as {
    name?: unknown;
    color?: unknown;
  };
  const data: { name?: string; color?: string } = {};
  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.color !== undefined && typeof body.color === "string") {
    data.color = body.color.trim() || "gray";
  }

  const updated = await prisma.kanban_tags.updateMany({
    where: { id: tagId, workspace_id: workspaceId },
    data,
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  const tag = await prisma.kanban_tags.findFirst({
    where: { id: tagId, workspace_id: workspaceId },
  });

  return NextResponse.json(tag);
}
