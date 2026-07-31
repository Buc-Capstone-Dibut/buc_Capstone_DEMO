import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

function toSnapshotJsonValue(content: unknown): Prisma.InputJsonValue {
  const normalized = Array.isArray(content) ? content : [];
  return JSON.parse(JSON.stringify(normalized)) as Prisma.InputJsonValue;
}

type SaveWorkspaceDocContentInput = {
  docId: string;
  content: unknown;
  title?: string;
  emoji?: string | null;
  authorId?: string | null;
};

export async function saveWorkspaceDocContent({
  docId,
  content,
  title,
  emoji,
  authorId,
}: SaveWorkspaceDocContentInput) {
  const doc = await prisma.workspace_docs.findUnique({
    where: { id: docId },
    select: {
      id: true,
      workspace_id: true,
      author_id: true,
    },
  });

  if (!doc) {
    return { ok: false as const, status: 404, error: "Document not found" };
  }

  const writableCheck = await ensureWorkspaceWritable(doc.workspace_id);
  if (!writableCheck.ok) {
    return {
      ok: false as const,
      status: writableCheck.status,
      error: writableCheck.error,
    };
  }

  let nextAuthorId = doc.author_id;
  if (authorId !== undefined && authorId !== null) {
    if (typeof authorId !== "string" || !authorId) {
      return {
        ok: false as const,
        status: 400,
        error: "유효한 작업자를 선택해 주세요.",
      };
    }

    const assigneeMembership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: doc.workspace_id,
          user_id: authorId,
        },
      },
      select: { user_id: true },
    });

    if (!assigneeMembership) {
      return {
        ok: false as const,
        status: 400,
        error: "작업자는 워크스페이스 멤버여야 합니다.",
      };
    }
    nextAuthorId = authorId;
  }

  const trimmedTitle =
    typeof title === "string" && title.trim().length > 0
      ? title.trim()
      : undefined;

  await prisma.workspace_docs.update({
    where: { id: docId },
    data: {
      content: toSnapshotJsonValue(content),
      ...(trimmedTitle !== undefined ? { title: trimmedTitle } : {}),
      ...(emoji !== undefined ? { emoji } : {}),
      ...(nextAuthorId !== doc.author_id ? { author_id: nextAuthorId } : {}),
    },
  });

  return { ok: true as const };
}
