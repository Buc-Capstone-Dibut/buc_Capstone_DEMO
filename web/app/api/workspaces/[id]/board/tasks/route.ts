import { createRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  assertValidDateRange,
  normalizeDateOnly,
  parseDateOnly,
} from "@/lib/workspace/task-dates";
import {
  parseTaskAssigneeIds,
  serializeTaskAssignees,
} from "@/lib/server/task-assignees";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const userId = user.id;

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
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
    const {
      title,
      description,
      columnId,
      priority,
      tags,
      startDate,
      endDate,
      dueDate,
    } = body;
    let assigneeIds: string[];
    try {
      assigneeIds = parseTaskAssigneeIds(body) ?? [];
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid assignees" },
        { status: 400 },
      );
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof columnId !== "string" ||
      !columnId.trim()
    ) {
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

    if (assigneeIds.length > 0) {
      const assigneeMemberCount = await prisma.workspace_members.count({
        where: {
          workspace_id: workspaceId,
          user_id: { in: assigneeIds },
        },
      });
      if (assigneeMemberCount !== assigneeIds.length) {
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
      where: { column_id: columnId },
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
        title: title.trim(),
        column_id: columnId,
        order: newOrder,
        description: description || "",
        assignee_id: assigneeIds[0] ?? null,
        assignees: {
          create: assigneeIds.map((assigneeUserId, position) => ({
            user_id: assigneeUserId,
            assigned_by: userId,
            position,
          })),
        },
        tags: normalizedTags,
        start_date: parseDateOnly(dateRange.startDate),
        end_date: parseDateOnly(dateRange.endDate),
        priority: normalizedPriority,
      },
      include: {
        assignee: true,
        assignees: {
          orderBy: [
            { position: "asc" },
            { assigned_at: "asc" },
            { user_id: "asc" },
          ],
          include: { user: true },
        },
      },
    });

    // Formatting for frontend
    const formattedTask = {
      id: task.id,
      columnId: task.column_id,
      title: task.title,
      description: task.description,
      order: task.order,
      startDate: normalizeDateOnly(task.start_date),
      endDate: normalizeDateOnly(task.end_date),
      ...serializeTaskAssignees(task.assignees, task),
      tags: task.tags,
      priorityId: task.priority || "medium",
      status: column.title.toLowerCase().replace(/\s+/g, "-"),
    };

    return NextResponse.json(formattedTask);
  } catch (error) {
    console.error("Create Task Error:", error);
    return NextResponse.json(
      { error: "작업을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
