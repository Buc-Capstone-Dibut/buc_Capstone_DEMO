import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

// GET: List All Documents in Workspace (for Sidebar)
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = params.id;

    // Check membership (Optional but recommended)
    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const docs = await prisma.workspace_docs.findMany({
      where: {
        workspace_id: workspaceId,
        is_archived: false, // Only active docs
      },
      orderBy: {
        updated_at: "desc",
      },
      select: {
        id: true,
        title: true,
        emoji: true,
        parent_id: true,
        updated_at: true,
        // Don't select content for list view to save bandwidth
      },
    });

    return NextResponse.json(docs);
  } catch (error: any) {
    console.error("API: List Docs Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create New Document
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = params.id;
    const body = await request.json();
    const { title, parentId, emoji, coverUrl, content } = body;

    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    const doc = await prisma.workspace_docs.create({
      data: {
        workspace_id: workspaceId,
        author_id: session.user.id,
        title: title || "제목 없음",
        parent_id: parentId || null,
        emoji: emoji || null,
        cover_url: coverUrl || null,
        content: content || null, // Optional initial content
      },
    });

    return NextResponse.json(doc);
  } catch (error: any) {
    console.error("API: Create Doc Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
