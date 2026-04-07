import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import { getWorkspaceDocTemplate } from "@/lib/server/workspace-doc-templates";
import { snapshotToYjsState } from "@/lib/server/workspace-doc-collab";
import { getWorkspaceDocsCollabStateMap } from "@/lib/server/workspace-doc-collab-session";

type DocKind = "page" | "folder";

function normalizeDocKind(value: unknown): DocKind {
  return value === "folder" ? "folder" : "page";
}

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
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived") === "true";

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
        is_archived: archived,
      },
      orderBy: [
        { parent_id: "asc" },
        { sort_order: "asc" },
        { updated_at: "desc" },
      ],
      select: {
        id: true,
        kind: true,
        title: true,
        emoji: true,
        parent_id: true,
        sort_order: true,
        updated_at: true,
        // Don't select content for list view to save bandwidth
      },
    });

    const collabStateMap = await getWorkspaceDocsCollabStateMap(
      workspaceId,
      docs.map((doc) => doc.id),
      session.user.id,
    );

    return NextResponse.json(
      docs.map((doc) => ({
        ...doc,
        collab: collabStateMap.get(doc.id),
      })),
    );
  } catch (error) {
    console.error("API: List Docs Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to list documents";
    return NextResponse.json({ error: message }, { status: 500 });
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
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : null;
    const parentId =
      typeof body.parentId === "string" && body.parentId ? body.parentId : null;
    const emoji =
      typeof body.emoji === "string" && body.emoji ? body.emoji : null;
    const coverUrl =
      typeof body.coverUrl === "string" && body.coverUrl ? body.coverUrl : null;
    const kind = normalizeDocKind(body.kind);
    const template = await getWorkspaceDocTemplate(workspaceId, body.templateId);
    const content = body.content ?? template?.content ?? null;

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

    const doc = await prisma.$transaction(async (tx) => {
      if (parentId) {
        const parentDoc = await tx.workspace_docs.findFirst({
          where: {
            id: parentId,
            workspace_id: workspaceId,
            is_archived: false,
          },
          select: {
            id: true,
            kind: true,
          },
        });

        if (!parentDoc) {
          throw new Error("상위 폴더를 찾을 수 없습니다.");
        }

        if (parentDoc.kind !== "folder") {
          throw new Error("문서는 폴더 안으로만 이동하거나 생성할 수 있습니다.");
        }
      }

      const sibling = await tx.workspace_docs.findFirst({
        where: {
          workspace_id: workspaceId,
          parent_id: parentId,
          is_archived: false,
        },
        orderBy: {
          sort_order: "desc",
        },
        select: {
          sort_order: true,
        },
      });

      const createdDoc = await tx.workspace_docs.create({
        data: {
          workspace_id: workspaceId,
          author_id: session.user.id,
          kind,
          title:
            title ||
            (kind === "folder"
              ? "새 폴더"
              : template?.title || "제목 없음"),
          parent_id: parentId,
          emoji: emoji ?? template?.emoji ?? null,
          cover_url: coverUrl,
          content: kind === "folder" ? null : content,
          sort_order: (sibling?.sort_order ?? -1) + 1,
        },
      });

      if (createdDoc.kind === "page") {
        await tx.workspace_doc_states.create({
          data: {
            doc_id: createdDoc.id,
            yjs_state: snapshotToYjsState(createdDoc.content),
            updated_by: session.user.id,
          },
        });
      }

      return createdDoc;
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("API: Create Doc Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to create document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
