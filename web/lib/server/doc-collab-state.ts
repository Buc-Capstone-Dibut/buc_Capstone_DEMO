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
