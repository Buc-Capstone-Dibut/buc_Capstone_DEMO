import { createRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  ensureDefaultWorkspaceBoard,
  findWorkspaceBoard,
} from "@/lib/server/workspace-boards";
import {
  assertValidDateRange,
  normalizeDateOnly,
  parseDateOnly,
} from "@/lib/workspace/task-dates";

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
  const userId = session.user.id;

  // 1. Check Membership
  const memberCheck = await prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: userId,
      },
    },
  });

  if (!memberCheck) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const writableCheck = await ensureWorkspaceWritable(workspaceId);
  if (!writableCheck.ok) {
    return NextResponse.json(
      { error: writableCheck.error },
      { status: writableCheck.status },
    );
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      boardId,
      columnId,
      assigneeId,
      priority,
      tags,
      startDate,
      endDate,
      dueDate,
    } = body;

    if (!title || !columnId) {
      return NextResponse.json(
        { error: "Title and Column ID are required" },
        { status: 400 },
      );
    }

    // Verify column belongs to workspace
    const column = await prisma.kanban_columns.findFirst({
      where: { id: columnId, workspace_id: workspaceId },
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    const board = boardId
      ? await findWorkspaceBoard(workspaceId, boardId)
      : await ensureDefaultWorkspaceBoard(workspaceId);
    if (!board || board.archived_at) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (assigneeId) {
      const assigneeMembership = await prisma.workspace_members.findUnique({
        where: {
          workspace_id_user_id: {
            workspace_id: workspaceId,
            user_id: assigneeId,
          },
        },
        select: { user_id: true },
      });
      if (!assigneeMembership) {
        return NextResponse.json(
          { error: "워크스페이스 멤버만 담당자로 지정할 수 있습니다." },
          { status: 400 },
        );
      }
    }

    const rawEndDate = endDate ?? dueDate;
    if (
      (startDate !== null &&
        startDate !== undefined &&
        startDate !== "" &&
        !normalizeDateOnly(startDate)) ||
      (rawEndDate !== null &&
        rawEndDate !== undefined &&
        rawEndDate !== "" &&
        !normalizeDateOnly(rawEndDate))
    ) {
      return NextResponse.json(
        { error: "날짜는 YYYY-MM-DD 형식이어야 합니다." },
        { status: 400 },
      );
    }

    const normalizedTags = Array.isArray(tags)
      ? Array.from(
          new Set(
            tags.filter(
              (tag: unknown): tag is string => typeof tag === "string",
            ),
          ),
        )
      : [];
    if (Array.isArray(tags) && normalizedTags.length !== tags.length) {
      return NextResponse.json({ error: "Invalid tags" }, { status: 400 });
    }
    if (normalizedTags.length > 0) {
      const validTagCount = await prisma.kanban_tags.count({
        where: {
          workspace_id: workspaceId,
          id: { in: normalizedTags },
        },
      });
      if (validTagCount !== normalizedTags.length) {
        return NextResponse.json(
          { error: "존재하지 않는 태그가 포함되어 있습니다." },
          { status: 400 },
        );
      }
    }

    let dateRange: { startDate: string | null; endDate: string | null };
    try {
      dateRange = assertValidDateRange(startDate, rawEndDate);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Invalid date range",
        },
        { status: 400 },
      );
    }

    // 2. Get Max Order in Column
    const lastTask = await prisma.kanban_tasks.findFirst({
      where: { board_id: board.id, column_id: columnId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newOrder = (lastTask?.order ?? 0) + 1;
    const normalizedPriority =
      priority === undefined
        ? "medium"
        : typeof priority === "string" && priority.trim().length > 0
          ? priority.trim()
          : null;

    // 3. Create Task
    const task = await prisma.kanban_tasks.create({
      data: {
        title: title,
        board_id: board.id,
        column_id: columnId,
        order: newOrder,
        description: description || "",
        assignee_id: assigneeId || null,
        tags: normalizedTags,
        start_date: parseDateOnly(dateRange.startDate),
        end_date: parseDateOnly(dateRange.endDate),
        priority: normalizedPriority,
      },
      include: {
        assignee: true,
      },
    });

    // Formatting for frontend
    const formattedTask = {
      id: task.id,
      boardId: task.board_id,
      columnId: task.column_id,
      title: task.title,
      description: task.description,
      order: task.order,
      startDate: normalizeDateOnly(task.start_date),
      endDate: normalizeDateOnly(task.end_date),
      assignee: task.assignee ? task.assignee.nickname : null,
      assigneeId: task.assignee_id,
      tags: task.tags,
      priorityId: task.priority || "medium",
      status: column.title.toLowerCase().replace(/\s+/g, "-"),
    };

    return NextResponse.json(formattedTask);
  } catch (error) {
    console.error("Create Task Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
