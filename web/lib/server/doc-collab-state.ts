import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  snapshotToYjsState,
  yjsStateToSnapshot,
} from "@/lib/server/workspace-doc-collab";

export async function loadOrSeedDocCollabState(docId: string) {
  const existingState = await prisma.workspace_doc_states.findUnique({
    where: { doc_id: docId },
    select: { yjs_state: true },
  });
  if (existingState?.yjs_state) {
    return existingState.yjs_state;
  }

  const doc = await prisma.workspace_docs.findUnique({
    where: { id: docId },
    select: {
      id: true,
      content: true,
    },
  });

  if (!doc) {
    return null;
  }

  const seededState = snapshotToYjsState(doc.content);

  await prisma.workspace_doc_states.upsert({
    where: { doc_id: docId },
    create: {
      doc_id: docId,
      yjs_state: seededState,
    },
    update: {
      yjs_state: seededState,
    },
  });

  return seededState;
}

export async function syncDocCollabStateFromSnapshot(docId: string) {
  const doc = await prisma.workspace_docs.findUnique({
    where: { id: docId },
    select: {
      id: true,
      content: true,
    },
  });

  if (!doc) {
    return { ok: false as const, status: 404, error: "Document not found" };
  }

  const seededState = snapshotToYjsState(doc.content);

  await prisma.workspace_doc_states.upsert({
    where: { doc_id: docId },
    create: {
      doc_id: docId,
      yjs_state: seededState,
    },
    update: {
      yjs_state: seededState,
    },
  });

  return { ok: true as const, yjsState: seededState };
}

export async function saveDocCollabState(docId: string, yjsState: string) {
  const doc = await prisma.workspace_docs.findUnique({
    where: { id: docId },
    select: {
      id: true,
      workspace_id: true,
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

  await prisma.$transaction([
    prisma.workspace_doc_states.upsert({
      where: { doc_id: docId },
      create: {
        doc_id: docId,
        yjs_state: yjsState,
      },
      update: {
        yjs_state: yjsState,
      },
    }),
    prisma.workspace_docs.update({
      where: { id: docId },
      data: {
        content: yjsStateToSnapshot(yjsState) as Prisma.InputJsonValue,
      },
    }),
  ]);

  return { ok: true as const };
}

function toSnapshotJsonValue(content: unknown): Prisma.InputJsonValue {
  const normalized = Array.isArray(content) ? content : [];
  return JSON.parse(JSON.stringify(normalized)) as Prisma.InputJsonValue;
}

type SaveWorkspaceDocSnapshotInput = {
  docId: string;
  yjsState: string;
  title?: string;
  emoji?: string | null;
  authorId?: string | null;
};

async function resolveWorkspaceDocWriteContext(
  docId: string,
  authorId?: string | null,
) {
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

  return {
    ok: true as const,
    doc,
    nextAuthorId,
  };
}

export async function saveWorkspaceDocSnapshot({
  docId,
  yjsState,
  title,
  emoji,
  authorId,
}: SaveWorkspaceDocSnapshotInput) {
  const context = await resolveWorkspaceDocWriteContext(docId, authorId);

  if (!context.ok) {
    return context;
  }

  const { doc, nextAuthorId } = context;

  const trimmedTitle =
    typeof title === "string" && title.trim().length > 0
      ? title.trim()
      : undefined;

  await prisma.$transaction([
    prisma.workspace_doc_states.upsert({
      where: { doc_id: docId },
      create: {
        doc_id: docId,
        yjs_state: yjsState,
      },
      update: {
        yjs_state: yjsState,
      },
    }),
    prisma.workspace_docs.update({
      where: { id: docId },
      data: {
        content: yjsStateToSnapshot(yjsState) as Prisma.InputJsonValue,
        ...(trimmedTitle !== undefined ? { title: trimmedTitle } : {}),
        ...(emoji !== undefined ? { emoji } : {}),
        ...(nextAuthorId !== doc.author_id ? { author_id: nextAuthorId } : {}),
      },
    }),
  ]);

  return { ok: true as const };
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
  const context = await resolveWorkspaceDocWriteContext(docId, authorId);

  if (!context.ok) {
    return context;
  }

  const { doc, nextAuthorId } = context;

  const trimmedTitle =
    typeof title === "string" && title.trim().length > 0
      ? title.trim()
      : undefined;

  await prisma.$transaction([
    prisma.workspace_docs.update({
      where: { id: docId },
      data: {
        content: toSnapshotJsonValue(content),
        ...(trimmedTitle !== undefined ? { title: trimmedTitle } : {}),
        ...(emoji !== undefined ? { emoji } : {}),
        ...(nextAuthorId !== doc.author_id ? { author_id: nextAuthorId } : {}),
      },
    }),
    // Normal editor saves snapshot content directly. Drop any stale Yjs state so
    // collaboration can be re-seeded from the latest saved content on demand.
    prisma.workspace_doc_states.deleteMany({
      where: { doc_id: docId },
    }),
  ]);

  return { ok: true as const };
}
