import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  deleteWorkspaceDocTemplate,
  updateWorkspaceDocTemplate,
} from "@/lib/server/workspace-doc-templates";

async function requireWorkspaceMember(workspaceId: string, userId: string) {
  const membership = await prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    select: { user_id: true },
  });

  return membership;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; templateId: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await requireWorkspaceMember(params.id, session.user.id);
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const writableCheck = await ensureWorkspaceWritable(params.id);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          name?: unknown;
          description?: unknown;
          emoji?: unknown;
          title?: unknown;
          content?: unknown;
          sourceDocId?: unknown;
        }
      | null;

    const template = await updateWorkspaceDocTemplate({
      workspaceId: params.id,
      templateId: params.templateId,
      ...(typeof body?.name === "string" || body?.name === null
        ? { name: body?.name }
        : {}),
      ...(typeof body?.description === "string" || body?.description === null
        ? { description: body?.description }
        : {}),
      ...(typeof body?.emoji === "string" || body?.emoji === null
        ? { emoji: body?.emoji }
        : {}),
      ...(typeof body?.title === "string" || body?.title === null
        ? { title: body?.title }
        : {}),
      ...(body && "content" in body ? { content: body.content } : {}),
      ...(typeof body?.sourceDocId === "string" || body?.sourceDocId === null
        ? { sourceDocId: body?.sourceDocId }
        : {}),
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("API: Update Doc Template Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to update template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; templateId: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await requireWorkspaceMember(params.id, session.user.id);
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const writableCheck = await ensureWorkspaceWritable(params.id);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    await deleteWorkspaceDocTemplate(params.id, params.templateId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("API: Delete Doc Template Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
