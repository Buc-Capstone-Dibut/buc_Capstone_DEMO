import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

type DocNode = {
  id: string;
  parent_id: string | null;
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
    const member = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: session.user.id,
        },
      },
      select: { user_id: true },
    });

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
    const docId = typeof body.docId === "string" ? body.docId : null;
    const targetParentId =
      typeof body.targetParentId === "string" && body.targetParentId
        ? body.targetParentId
        : null;
    const targetIndex =
      typeof body.targetIndex === "number" && Number.isFinite(body.targetIndex)
        ? Math.max(0, body.targetIndex)
        : 0;

    if (!docId) {
      return NextResponse.json({ error: "docId is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const allDocs = await tx.workspace_docs.findMany({
        where: {
          workspace_id: workspaceId,
          is_archived: false,
        },
        select: {
          id: true,
          parent_id: true,
          kind: true,
          sort_order: true,
        },
        orderBy: {
          sort_order: "asc",
        },
      });

      const doc = allDocs.find((item) => item.id === docId);
      if (!doc) {
        throw new Error("문서를 찾을 수 없습니다.");
      }

      if (targetParentId === docId) {
        throw new Error("문서를 자기 자신 안으로 이동할 수 없습니다.");
      }

      if (targetParentId) {
        const descendants = collectDescendantIds(allDocs, docId);
        if (descendants.includes(targetParentId)) {
          throw new Error("하위 문서 안으로는 이동할 수 없습니다.");
        }

        const parent = allDocs.find((item) => item.id === targetParentId);
        if (!parent || parent.kind !== "folder") {
          throw new Error("폴더 안으로만 이동할 수 있습니다.");
        }
      }

      const currentParentId = doc.parent_id;
      const currentSiblings = allDocs
        .filter((item) => item.parent_id === currentParentId && item.id !== docId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const targetSiblings = allDocs
        .filter((item) => item.parent_id === targetParentId && item.id !== docId)
        .sort((a, b) => a.sort_order - b.sort_order);

      targetSiblings.splice(targetIndex, 0, doc);

      await Promise.all(
        currentSiblings.map((sibling, index) =>
          tx.workspace_docs.update({
            where: { id: sibling.id },
            data: { sort_order: index },
          }),
        ),
      );

      await Promise.all(
        targetSiblings.map((sibling, index) =>
          tx.workspace_docs.update({
            where: { id: sibling.id },
            data: {
              parent_id: sibling.id === docId ? targetParentId : sibling.parent_id,
              sort_order: index,
            },
          }),
        ),
      );

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("API: Reorder Docs Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to reorder docs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
