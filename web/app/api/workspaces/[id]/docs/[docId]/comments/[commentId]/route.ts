import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

async function ensureWorkspaceMember(workspaceId: string, userId: string) {
  return prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    select: { user_id: true, role: true },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; docId: string; commentId: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, docId, commentId } = params;
    const member = await ensureWorkspaceMember(workspaceId, session.user.id);
    if (!member) {
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
    const comment = await prisma.workspace_doc_comments.findFirst({
      where: {
        id: commentId,
        workspace_id: workspaceId,
        doc_id: docId,
      },
      select: {
        id: true,
        author_id: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.author_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const content =
      typeof body.content === "string" ? body.content.trim() : undefined;
    const resolved =
      typeof body.resolved === "boolean" ? body.resolved : undefined;

    if (content === "" || (content === undefined && resolved === undefined)) {
      return NextResponse.json(
        { error: "수정할 내용을 입력해주세요." },
        { status: 400 },
      );
    }

    if (content !== undefined && comment.author_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.workspace_doc_comments.update({
      where: { id: commentId },
      data: {
        ...(content !== undefined ? { content } : {}),
        ...(resolved !== undefined
          ? resolved
            ? {
                resolved_at: new Date(),
                resolved_by: session.user.id,
              }
            : {
                resolved_at: null,
                resolved_by: null,
              }
          : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            avatar_url: true,
            handle: true,
          },
        },
        resolver: {
          select: {
            id: true,
            nickname: true,
            avatar_url: true,
            handle: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("API: Update Doc Comment Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to update comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; docId: string; commentId: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, docId, commentId } = params;
    const member = await ensureWorkspaceMember(workspaceId, session.user.id);
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    const comment = await prisma.workspace_doc_comments.findFirst({
      where: {
        id: commentId,
        workspace_id: workspaceId,
        doc_id: docId,
      },
      select: {
        id: true,
        author_id: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.author_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.workspace_doc_comments.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API: Delete Doc Comment Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
