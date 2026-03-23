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
    select: { user_id: true },
  });
}

async function ensureDocExists(workspaceId: string, docId: string) {
  return prisma.workspace_docs.findFirst({
    where: {
      id: docId,
      workspace_id: workspaceId,
    },
    select: { id: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string; docId: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, docId } = params;
    const member = await ensureWorkspaceMember(workspaceId, session.user.id);
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const doc = await ensureDocExists(workspaceId, docId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const comments = await prisma.workspace_doc_comments.findMany({
      where: {
        workspace_id: workspaceId,
        doc_id: docId,
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
      orderBy: [{ created_at: "asc" }],
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("API: List Doc Comments Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to list comments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; docId: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, docId } = params;
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
    const content =
      typeof body.content === "string" ? body.content.trim() : "";
    const parentId =
      typeof body.parentId === "string" && body.parentId ? body.parentId : null;

    if (!content) {
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }

    const doc = await ensureDocExists(workspaceId, docId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (parentId) {
      const parent = await prisma.workspace_doc_comments.findFirst({
        where: {
          id: parentId,
          workspace_id: workspaceId,
          doc_id: docId,
        },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 },
        );
      }
    }

    const comment = await prisma.workspace_doc_comments.create({
      data: {
        workspace_id: workspaceId,
        doc_id: docId,
        author_id: session.user.id,
        parent_id: parentId,
        content,
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

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("API: Create Doc Comment Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to create comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
