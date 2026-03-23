import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

const ALLOWED_RELATION_TYPES = new Set([
  "reference",
  "spec",
  "meeting_note",
  "qa",
  "result",
  "design",
]);

function normalizeRelationType(value: unknown) {
  if (typeof value !== "string") return undefined;
  return ALLOWED_RELATION_TYPES.has(value) ? value : undefined;
}

async function requireWorkspaceMember(workspaceId: string, userId: string) {
  return prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    select: { user_id: true },
  });
}

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: { id: string; taskId: string; relationId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const relationId = params.relationId;
  const taskId = params.taskId;

  const membership = await requireWorkspaceMember(workspaceId, session.user.id);
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

  const body = await request.json();
  const relationType = normalizeRelationType(body.relationType);
  const isPrimary =
    typeof body.isPrimary === "boolean" ? body.isPrimary : undefined;

  const relation = await prisma.kanban_task_documents.findFirst({
    where: {
      id: relationId,
      workspace_id: workspaceId,
      task_id: taskId,
    },
    select: {
      id: true,
    },
  });

  if (!relation) {
    return NextResponse.json({ error: "Relation not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.kanban_task_documents.updateMany({
        where: {
          workspace_id: workspaceId,
          task_id: taskId,
          is_primary: true,
        },
        data: {
          is_primary: false,
        },
      });
    }

    return tx.kanban_task_documents.update({
      where: {
        id: relationId,
      },
      data: {
        ...(relationType ? { relation_type: relationType } : {}),
        ...(isPrimary !== undefined ? { is_primary: isPrimary } : {}),
      },
      select: {
        id: true,
        relation_type: true,
        is_primary: true,
        created_at: true,
        doc: {
          select: {
            id: true,
            title: true,
            emoji: true,
            kind: true,
            is_archived: true,
            parent_id: true,
          },
        },
      },
    });
  });

  return NextResponse.json({
    id: updated.id,
    relationType: updated.relation_type,
    isPrimary: updated.is_primary,
    createdAt: updated.created_at,
    doc: {
      id: updated.doc.id,
      title: updated.doc.title,
      emoji: updated.doc.emoji,
      kind: updated.doc.kind,
      isArchived: updated.doc.is_archived,
      parentId: updated.doc.parent_id,
    },
  });
}

export async function DELETE(
  request: Request,
  {
    params,
  }: { params: { id: string; taskId: string; relationId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const relationId = params.relationId;
  const taskId = params.taskId;

  const membership = await requireWorkspaceMember(workspaceId, session.user.id);
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

  const relation = await prisma.kanban_task_documents.findFirst({
    where: {
      id: relationId,
      workspace_id: workspaceId,
      task_id: taskId,
    },
    select: { id: true },
  });

  if (!relation) {
    return NextResponse.json({ error: "Relation not found" }, { status: 404 });
  }

  await prisma.kanban_task_documents.delete({
    where: {
      id: relationId,
    },
  });

  return NextResponse.json({ success: true });
}
