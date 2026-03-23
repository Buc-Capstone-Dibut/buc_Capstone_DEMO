import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

type DocKind = "page" | "folder";

function normalizeDocKind(value: unknown): DocKind {
  return value === "folder" ? "folder" : "page";
}

type DocNode = {
  id: string;
  parent_id: string | null;
  is_archived: boolean;
};

function collectDescendantIds(docs: DocNode[], rootId: string) {
  const ids: string[] = [];
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = docs.filter((doc) => doc.parent_id === currentId);
    for (const child of children) {
      ids.push(child.id);
      queue.push(child.id);
    }
  }

  return ids;
}

function collectAncestorIds(docs: DocNode[], startingParentId: string | null) {
  const ids: string[] = [];
  let currentParentId = startingParentId;

  while (currentParentId) {
    ids.push(currentParentId);
    currentParentId =
      docs.find((doc) => doc.id === currentParentId)?.parent_id ?? null;
  }

  return ids;
}

// GET: Fetch Single Document
export async function GET(
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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const doc = await prisma.workspace_docs.findUnique({
      where: {
        id: docId,
        workspace_id: workspaceId,
      },
      include: {
        author: {
          select: {
            nickname: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error("API: Get Doc Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update Document
export async function PATCH(
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
    const body = await request.json();

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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    // Spread fields to update
    const {
      title,
      content,
      emoji,
      coverUrl,
      parentId,
      isArchived,
      kind,
      sortOrder,
    } = body;

    const currentDoc = await prisma.workspace_docs.findFirst({
      where: {
        id: docId,
        workspace_id: workspaceId,
      },
      select: {
        id: true,
        title: true,
        parent_id: true,
        kind: true,
        is_archived: true,
      },
    });

    if (!currentDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const trimmedTitle =
      typeof title === "string" && title.trim() ? title.trim() : undefined;
    const nextKind = kind !== undefined ? normalizeDocKind(kind) : undefined;

    const updatedDoc = await prisma.$transaction(async (tx) => {
      const allDocs = await tx.workspace_docs.findMany({
        where: { workspace_id: workspaceId },
        select: {
          id: true,
          parent_id: true,
          is_archived: true,
        },
      });

      if (parentId !== undefined) {
        const nextParentId =
          typeof parentId === "string" && parentId ? parentId : null;

        if (nextParentId === docId) {
          throw new Error("문서를 자기 자신 안으로 이동할 수 없습니다.");
        }

        if (nextParentId) {
          const descendants = collectDescendantIds(allDocs, docId);
          if (descendants.includes(nextParentId)) {
            throw new Error("하위 문서 안으로는 이동할 수 없습니다.");
          }

          const parentDoc = await tx.workspace_docs.findFirst({
            where: {
              id: nextParentId,
              workspace_id: workspaceId,
            },
            select: {
              id: true,
              kind: true,
              is_archived: true,
            },
          });

          if (!parentDoc) {
            throw new Error("상위 폴더를 찾을 수 없습니다.");
          }

          if (parentDoc.kind !== "folder") {
            throw new Error("문서는 폴더 안으로만 이동할 수 있습니다.");
          }

          if (parentDoc.is_archived && isArchived !== false) {
            throw new Error("휴지통에 있는 폴더 안으로는 이동할 수 없습니다.");
          }
        }
      }

      if (isArchived === true) {
        const descendantIds = collectDescendantIds(allDocs, docId);
        await tx.workspace_docs.updateMany({
          where: {
            id: { in: [docId, ...descendantIds] },
          },
          data: {
            is_archived: true,
          },
        });
      }

      if (isArchived === false) {
        const descendantIds = collectDescendantIds(allDocs, docId);
        const ancestorIds = collectAncestorIds(allDocs, currentDoc.parent_id);
        await tx.workspace_docs.updateMany({
          where: {
            id: { in: [docId, ...descendantIds, ...ancestorIds] },
          },
          data: {
            is_archived: false,
          },
        });
      }

      let nextSortOrder =
        typeof sortOrder === "number" && Number.isFinite(sortOrder)
          ? sortOrder
          : undefined;

      if (parentId !== undefined && nextSortOrder === undefined) {
        const nextParentId =
          typeof parentId === "string" && parentId ? parentId : null;
        const sibling = await tx.workspace_docs.findFirst({
          where: {
            workspace_id: workspaceId,
            parent_id: nextParentId,
            is_archived: false,
            id: { not: docId },
          },
          orderBy: {
            sort_order: "desc",
          },
          select: {
            sort_order: true,
          },
        });
        nextSortOrder = (sibling?.sort_order ?? -1) + 1;
      }

      return tx.workspace_docs.update({
        where: {
          id: docId,
          workspace_id: workspaceId,
        },
        data: {
          ...(trimmedTitle !== undefined ? { title: trimmedTitle } : {}),
          ...(content !== undefined && { content }),
          ...(emoji !== undefined && { emoji }),
          ...(coverUrl !== undefined && { cover_url: coverUrl }),
          ...(parentId !== undefined && {
            parent_id:
              typeof parentId === "string" && parentId ? parentId : null,
          }),
          ...(nextKind !== undefined && {
            kind: nextKind,
            ...(nextKind === "folder" ? { content: null } : {}),
          }),
          ...(nextSortOrder !== undefined ? { sort_order: nextSortOrder } : {}),
          ...(isArchived !== undefined ? { is_archived: isArchived } : {}),
        },
      });
    });

    return NextResponse.json(updatedDoc);
  } catch (error) {
    console.error("API: Update Doc Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to update document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Soft Delete (Archive)
export async function DELETE(
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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    const allDocs = await prisma.workspace_docs.findMany({
      where: {
        workspace_id: workspaceId,
      },
      select: {
        id: true,
        parent_id: true,
        is_archived: true,
      },
    });

    const descendantIds = collectDescendantIds(allDocs, docId);

    // Per plan: DELETE method performs Soft Delete (is_archived = true)
    await prisma.workspace_docs.updateMany({
      where: {
        id: {
          in: [docId, ...descendantIds],
        },
      },
      data: {
        is_archived: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API: Delete Doc Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
