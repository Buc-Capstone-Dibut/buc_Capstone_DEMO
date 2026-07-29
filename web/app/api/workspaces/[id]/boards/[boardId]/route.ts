import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import { findWorkspaceBoard } from "@/lib/server/workspace-boards";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; boardId: string } },
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
    select: { role: true },
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

  const board = await findWorkspaceBoard(workspaceId, params.boardId);
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const data: {
    name?: string;
    description?: string | null;
    archived_at?: Date | null;
  } = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "보드 이름을 입력해주세요." },
        { status: 400 },
      );
    }
    if (name.length > 80) {
      return NextResponse.json(
        { error: "보드 이름은 80자 이내여야 합니다." },
        { status: 400 },
      );
    }
    const duplicate = await prisma.workspace_boards.findFirst({
      where: {
        workspace_id: workspaceId,
        archived_at: null,
        id: { not: board.id },
        name: { equals: name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "같은 이름의 활성 보드가 이미 있습니다." },
        { status: 409 },
      );
    }
    data.name = name;
  }

  if (body.description !== undefined) {
    data.description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, 300) || null
        : null;
  }

  if (body.archived !== undefined) {
    if (body.archived === true && board.is_default) {
      return NextResponse.json(
        { error: "기본 보드는 보관할 수 없습니다." },
        { status: 400 },
      );
    }
    data.archived_at = body.archived === true ? new Date() : null;
  }

  const updated = await prisma.workspace_boards.update({
    where: { id: board.id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    workspaceId: updated.workspace_id,
    name: updated.name,
    description: updated.description,
    position: updated.position,
    isDefault: updated.is_default,
    archivedAt: updated.archived_at,
  });
}
