import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

const ALLOWED_RELATION_TYPES = new Set([
  "reference",
  "spec",
  "meeting_note",
  "qa",
  "result",
  "design",
]);

function normalizeRelationType(value: unknown) {
  if (typeof value !== "string") return "reference";
  return ALLOWED_RELATION_TYPES.has(value) ? value : "reference";
}

async function requireWorkspaceMember(workspaceId: string, userId: string) {
  const membership = await prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    select: { user_id: true },
  });

  return membership;
}

async function requireWorkspaceTask(workspaceId: string, taskId: string) {
  return prisma.kanban_tasks.findFirst({
    where: {
      id: taskId,
      column: {
        workspace_id: workspaceId,
      },
    },
    select: { id: true },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; taskId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const taskId = params.taskId;

  const [membership, task] = await Promise.all([
    requireWorkspaceMember(workspaceId, session.user.id),
    requireWorkspaceTask(workspaceId, taskId),
  ]);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const relations = await prisma.kanban_task_documents.findMany({
    where: {
      workspace_id: workspaceId,
      task_id: taskId,
    },
    orderBy: [{ is_primary: "desc" }, { created_at: "asc" }],
    select: {
      id: true,
      relation_type: true,
      is_primary: true,
      created_at: true,
      doc: {
        select: {
          id: true,
          title: true,
          emoji: true,
          kind: true,
          is_archived: true,
          parent_id: true,
        },
      },
    },
  });

  return NextResponse.json(
    relations.map((relation) => ({
      id: relation.id,
      relationType: relation.relation_type,
      isPrimary: relation.is_primary,
      createdAt: relation.created_at,
      doc: {
        id: relation.doc.id,
        title: relation.doc.title,
        emoji: relation.doc.emoji,
        kind: relation.doc.kind,
        isArchived: relation.doc.is_archived,
        parentId: relation.doc.parent_id,
      },
    })),
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; taskId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const taskId = params.taskId;

  const membership = await requireWorkspaceMember(workspaceId, session.user.id);
  if (!membership) {
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
  const relationType = normalizeRelationType(body.relationType);
  const isPrimary = Boolean(body.isPrimary);

  if (!docId) {
    return NextResponse.json({ error: "docId is required" }, { status: 400 });
  }

  const [task, doc] = await Promise.all([
    requireWorkspaceTask(workspaceId, taskId),
    prisma.workspace_docs.findFirst({
      where: {
        id: docId,
        workspace_id: workspaceId,
      },
      select: {
        id: true,
        kind: true,
        is_archived: true,
      },
    }),
  ]);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (doc.kind === "folder") {
    return NextResponse.json(
      { error: "폴더는 태스크와 연결할 수 없습니다." },
      { status: 400 },
    );
  }

  if (doc.is_archived) {
    return NextResponse.json(
      { error: "휴지통 문서는 연결할 수 없습니다." },
      { status: 400 },
    );
  }

  const relation = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.kanban_task_documents.updateMany({
        where: {
          task_id: taskId,
          workspace_id: workspaceId,
          is_primary: true,
        },
        data: {
          is_primary: false,
        },
      });
    }

    return tx.kanban_task_documents.upsert({
      where: {
        task_id_doc_id: {
          task_id: taskId,
          doc_id: docId,
        },
      },
      update: {
        relation_type: relationType,
        is_primary: isPrimary,
      },
      create: {
        workspace_id: workspaceId,
        task_id: taskId,
        doc_id: docId,
        relation_type: relationType,
        is_primary: isPrimary,
        created_by: session.user.id,
      },
      select: {
        id: true,
        relation_type: true,
        is_primary: true,
        created_at: true,
        doc: {
          select: {
            id: true,
            title: true,
            emoji: true,
            kind: true,
            is_archived: true,
            parent_id: true,
          },
        },
      },
    });
  });

  return NextResponse.json({
    id: relation.id,
    relationType: relation.relation_type,
    isPrimary: relation.is_primary,
    createdAt: relation.created_at,
    doc: {
      id: relation.doc.id,
      title: relation.doc.title,
      emoji: relation.doc.emoji,
      kind: relation.doc.kind,
      isArchived: relation.doc.is_archived,
      parentId: relation.doc.parent_id,
    },
  });
}
