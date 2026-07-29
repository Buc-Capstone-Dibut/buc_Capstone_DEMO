import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import { ensureDefaultWorkspaceBoard } from "@/lib/server/workspace-boards";
import { normalizeDateOnly } from "@/lib/workspace/task-dates";

async function getMembership(workspaceId: string, userId: string) {
  return prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
    select: { role: true },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureDefaultWorkspaceBoard(workspaceId);

  const includeArchived =
    new URL(request.url).searchParams.get("archived") === "true";
  const boards = await prisma.workspace_boards.findMany({
    where: {
      workspace_id: workspaceId,
      ...(includeArchived ? {} : { archived_at: null }),
    },
    orderBy: [{ position: "asc" }, { created_at: "asc" }],
    include: {
      tasks: {
        select: {
          id: true,
          start_date: true,
          end_date: true,
          column: {
            select: { category: true },
          },
          assignee_id: true,
        },
      },
    },
  });

  return NextResponse.json(
    boards.map((board) => {
      let completed = 0;
      let startDate: string | null = null;
      let endDate: string | null = null;
      const assigneeIds = new Set<string>();

      for (const task of board.tasks) {
        if (task.column.category === "done") completed += 1;
        const taskStart = normalizeDateOnly(task.start_date);
        const taskEnd = normalizeDateOnly(task.end_date);
        if (taskStart && (!startDate || taskStart < startDate)) {
          startDate = taskStart;
        }
        if (taskEnd && (!endDate || taskEnd > endDate)) {
          endDate = taskEnd;
        }
        if (task.assignee_id) assigneeIds.add(task.assignee_id);
      }

      return {
        id: board.id,
        workspaceId: board.workspace_id,
        name: board.name,
        description: board.description,
        position: board.position,
        isDefault: board.is_default,
        archivedAt: board.archived_at,
        taskCount: board.tasks.length,
        completedCount: completed,
        memberCount: assigneeIds.size,
        startDate,
        endDate,
      };
    }),
  );
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const membership = await getMembership(workspaceId, session.user.id);
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

  const body = (await request.json()) as {
    name?: unknown;
    description?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "보드 이름을 입력해주세요." },
      { status: 400 },
    );
  }
  if (name.length > 80) {
    return NextResponse.json(
      { error: "보드 이름은 80자 이내여야 합니다." },
      { status: 400 },
    );
  }

  const duplicate = await prisma.workspace_boards.findFirst({
    where: {
      workspace_id: workspaceId,
      archived_at: null,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "같은 이름의 활성 보드가 이미 있습니다." },
      { status: 409 },
    );
  }

  const lastBoard = await prisma.workspace_boards.findFirst({
    where: { workspace_id: workspaceId, archived_at: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const board = await prisma.workspace_boards.create({
    data: {
      workspace_id: workspaceId,
      name,
      description:
        typeof body.description === "string"
          ? body.description.trim().slice(0, 300) || null
          : null,
      position: (lastBoard?.position ?? -1) + 1,
    },
  });

  return NextResponse.json(
    {
      id: board.id,
      workspaceId: board.workspace_id,
      name: board.name,
      description: board.description,
      position: board.position,
      isDefault: board.is_default,
      archivedAt: board.archived_at,
      taskCount: 0,
      completedCount: 0,
      memberCount: 0,
      startDate: null,
      endDate: null,
    },
    { status: 201 },
  );
}
