import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getDocCollabState } from "@/lib/server/workspace-doc-collab-session";

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
            id: true,
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

    const collab = await getDocCollabState(workspaceId, docId, session.user.id);

    return NextResponse.json({
      ...doc,
      collab,
    });
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
      emoji,
      coverUrl,
      authorId,
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

      let nextAuthorId: string | undefined;
      if (authorId !== undefined) {
        if (typeof authorId !== "string" || !authorId) {
          throw new Error("유효한 작업자를 선택해 주세요.");
        }

        const assigneeMembership = await tx.workspace_members.findUnique({
          where: {
            workspace_id_user_id: {
              workspace_id: workspaceId,
              user_id: authorId,
            },
          },
          select: { user_id: true },
        });

        if (!assigneeMembership) {
          throw new Error("작업자는 워크스페이스 멤버여야 합니다.");
        }

        nextAuthorId = authorId;
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

      const updateData: Prisma.workspace_docsUncheckedUpdateInput = {};
      if (trimmedTitle !== undefined) updateData.title = trimmedTitle;
      if (emoji !== undefined) updateData.emoji = emoji;
      if (coverUrl !== undefined) updateData.cover_url = coverUrl;
      if (parentId !== undefined) {
        updateData.parent_id =
          typeof parentId === "string" && parentId ? parentId : null;
      }
      if (nextKind !== undefined) {
        updateData.kind = nextKind;
        if (nextKind === "folder") {
          updateData.content = Prisma.JsonNull;
        }
      }
      if (nextAuthorId !== undefined) updateData.author_id = nextAuthorId;
      if (nextSortOrder !== undefined) updateData.sort_order = nextSortOrder;
      if (isArchived !== undefined) updateData.is_archived = isArchived;

      return tx.workspace_docs.update({
        where: {
          id: docId,
          workspace_id: workspaceId,
        },
        data: updateData,
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
    const { searchParams } = new URL(request.url);
    const permanentDelete = searchParams.get("permanent") === "true";

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

    const currentDoc = allDocs.find((doc) => doc.id === docId);
    if (!currentDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const descendantIds = collectDescendantIds(allDocs, docId);

    if (permanentDelete) {
      if (!currentDoc.is_archived) {
        return NextResponse.json(
          { error: "휴지통에 있는 문서만 영구 삭제할 수 있습니다." },
          { status: 400 },
        );
      }

      const deletedDocIds = [docId, ...descendantIds];
      const assets = await prisma.workspace_doc_assets.findMany({
        where: {
          workspace_id: workspaceId,
          doc_id: {
            in: deletedDocIds,
          },
        },
        select: {
          id: true,
          storage_path: true,
        },
      });

      if (assets.length > 0) {
        const admin = createAdminSupabaseClient();
        const { error: removeError } = await admin.storage
          .from("workspace-doc-assets")
          .remove(assets.map((asset) => asset.storage_path));

        if (removeError) {
          console.error("Failed to delete workspace doc assets", removeError);
          return NextResponse.json(
            { error: "문서 자산 삭제에 실패했습니다." },
            { status: 500 },
          );
        }
      }

      await prisma.workspace_doc_assets.deleteMany({
        where: {
          id: {
            in: assets.map((asset) => asset.id),
          },
        },
      });

      await prisma.workspace_docs.deleteMany({
        where: {
          id: {
            in: deletedDocIds,
          },
          workspace_id: workspaceId,
        },
      });
    } else {
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
    }

    return NextResponse.json({
      success: true,
      mode: permanentDelete ? "permanent" : "archive",
    });
  } catch (error) {
    console.error("API: Delete Doc Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
