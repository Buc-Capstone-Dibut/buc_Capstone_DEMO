import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  decodeWorkspaceDocYjsState,
  InvalidWorkspaceDocYjsStateError,
  snapshotToYjsState,
} from "@/lib/server/workspace-doc-collab";

const COLLAB_REVISION_INTERVAL_MS = 30_000;
const MAX_REVISIONS_PER_DOC = 50;

type RecordWorkspaceDocRevisionInput = {
  docId: string;
  source: "manual" | "collaboration";
  yjsState: string;
  content: Prisma.InputJsonValue;
  byteSize: number;
  createdBy?: string | null;
  throttle?: boolean;
};

async function recordWorkspaceDocRevision({
  docId,
  source,
  yjsState,
  content,
  byteSize,
  createdBy,
  throttle = false,
}: RecordWorkspaceDocRevisionInput) {
  try {
    if (throttle) {
      const latestRevision = await prisma.workspace_doc_revisions.findFirst({
        where: { doc_id: docId },
        orderBy: { created_at: "desc" },
        select: { created_at: true },
      });
      if (
        latestRevision &&
        Date.now() - latestRevision.created_at.getTime() <
          COLLAB_REVISION_INTERVAL_MS
      ) {
        return;
      }
    }

    await prisma.workspace_doc_revisions.create({
      data: {
        doc_id: docId,
        source,
        yjs_state: yjsState,
        content,
        byte_size: byteSize,
        created_by: createdBy ?? null,
      },
    });

    const staleRevisions = await prisma.workspace_doc_revisions.findMany({
      where: { doc_id: docId },
      orderBy: { created_at: "desc" },
      skip: MAX_REVISIONS_PER_DOC,
      select: { id: true },
    });
    if (staleRevisions.length > 0) {
      await prisma.workspace_doc_revisions.deleteMany({
        where: { id: { in: staleRevisions.map((revision) => revision.id) } },
      });
    }
  } catch (error) {
    // Revision history must never block the primary document save. This also
    // keeps the hotfix backward-compatible until the new migration is applied.
    console.error("Failed to record workspace document revision", error);
  }
}

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
  let decodedState;
  try {
    decodedState = decodeWorkspaceDocYjsState(yjsState);
  } catch (error) {
    if (error instanceof InvalidWorkspaceDocYjsStateError) {
      return {
        ok: false as const,
        status: error.status,
        error: error.message,
      };
    }
    throw error;
  }

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

  const persistedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.workspace_doc_states.upsert({
      where: { doc_id: docId },
      create: {
        doc_id: docId,
        yjs_state: yjsState,
      },
      update: {
        yjs_state: yjsState,
      },
    });
    await tx.workspace_docs.update({
      where: { id: docId },
      data: {
        content: decodedState.snapshot as Prisma.InputJsonValue,
      },
    });
  });

  await recordWorkspaceDocRevision({
    docId,
    source: "collaboration",
    yjsState,
    content: decodedState.snapshot as Prisma.InputJsonValue,
    byteSize: decodedState.byteLength,
    throttle: true,
  });

  return { ok: true as const, persistedAt: persistedAt.toISOString() };
}

function toSnapshotJsonValue(content: unknown): Prisma.InputJsonValue {
  const normalized = Array.isArray(content) ? content : [];
  return JSON.parse(JSON.stringify(normalized)) as Prisma.InputJsonValue;
}

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

type SaveWorkspaceDocContentInput = {
  docId: string;
  content: unknown;
  title?: string;
  emoji?: string | null;
  authorId?: string | null;
  savedBy?: string | null;
};

export async function saveWorkspaceDocContent({
  docId,
  content,
  title,
  emoji,
  authorId,
  savedBy,
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

  const normalizedContent = toSnapshotJsonValue(content);
  const revisionYjsState = snapshotToYjsState(content);
  const revisionByteSize = Buffer.from(revisionYjsState, "base64").byteLength;

  const saved = await prisma.$transaction(async (tx) => {
    const activeCollabSession =
      await tx.workspace_doc_collab_sessions.findUnique({
        where: { doc_id: docId },
        select: { status: true },
      });

    if (activeCollabSession?.status === "ACTIVE") {
      return false;
    }

    await tx.workspace_docs.update({
      where: { id: docId },
      data: {
        content: toSnapshotJsonValue(content),
        ...(trimmedTitle !== undefined ? { title: trimmedTitle } : {}),
        ...(emoji !== undefined ? { emoji } : {}),
        ...(nextAuthorId !== doc.author_id ? { author_id: nextAuthorId } : {}),
      },
    });

    // Normal editor saves snapshot content directly. Drop any stale Yjs state so
    // collaboration can be re-seeded from the latest saved content on demand.
    await tx.workspace_doc_states.deleteMany({
      where: { doc_id: docId },
    });

    return true;
  });

  if (!saved) {
    return {
      ok: false as const,
      status: 409,
      error:
        "협업 편집 중에는 일반 저장을 사용할 수 없습니다. 협업을 종료한 뒤 저장해 주세요.",
    };
  }

  await recordWorkspaceDocRevision({
    docId,
    source: "manual",
    yjsState: revisionYjsState,
    content: normalizedContent,
    byteSize: revisionByteSize,
    createdBy: savedBy,
  });

  return { ok: true as const };
}
