import { createRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  logUserActivityEvent,
  MY_ACTIVITY_EVENT_TYPES,
} from "@/lib/activity-events";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  REPUTATION_DELTAS,
  REPUTATION_EVENT_TYPES,
  tryApplyReputationEvent,
} from "@/lib/server/reputation";
import {
  assertValidDateRange,
  normalizeDateOnly,
  parseDateOnly,
} from "@/lib/workspace/task-dates";
import {
  parseTaskAssigneeIds,
  serializeTaskAssignees,
} from "@/lib/server/task-assignees";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; taskId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: workspaceId, taskId } = params;
    const updates = await request.json();
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Verify workspace membership
    const member = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
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

    const allowedUpdates: {
      title?: string;
      description?: string;
      column_id?: string;
      assignee_id?: string | null;
      tags?: string[];
      start_date?: Date | null;
      end_date?: Date | null;
      order?: number;
      priority?: string | null;
    } = {};
    let assigneeIds: string[] | undefined;
    try {
      assigneeIds = parseTaskAssigneeIds(updates);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid assignees" },
        { status: 400 },
      );
    }
    if (updates.title !== undefined) {
      if (typeof updates.title !== "string" || !updates.title.trim()) {
        return NextResponse.json(
          { error: "작업 제목을 입력해주세요." },
          { status: 400 },
        );
      }
      allowedUpdates.title = updates.title.trim();
    }
    if (updates.description !== undefined)
      allowedUpdates.description = updates.description;

    // Support both camelCase and snake_case
    if (updates.column_id !== undefined)
      allowedUpdates.column_id = updates.column_id;
    if (updates.columnId !== undefined)
      allowedUpdates.column_id = updates.columnId;
    if (
      allowedUpdates.column_id !== undefined &&
      (typeof allowedUpdates.column_id !== "string" ||
        !allowedUpdates.column_id.trim())
    ) {
      return NextResponse.json({ error: "Invalid column" }, { status: 400 });
    }

    if (assigneeIds !== undefined) {
      allowedUpdates.assignee_id = assigneeIds[0] ?? null;
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

    if (updates.tags !== undefined) {
      if (
        !Array.isArray(updates.tags) ||
        !updates.tags.every((tag: unknown) => typeof tag === "string")
      ) {
        return NextResponse.json({ error: "Invalid tags" }, { status: 400 });
      }

      const uniqueTagIds = Array.from(new Set(updates.tags as string[]));
      const validTagCount = await prisma.kanban_tags.count({
        where: {
          workspace_id: workspaceId,
          id: { in: uniqueTagIds },
        },
      });
      if (validTagCount !== uniqueTagIds.length) {
        return NextResponse.json(
          { error: "존재하지 않는 태그가 포함되어 있습니다." },
          { status: 400 },
        );
      }
      allowedUpdates.tags = uniqueTagIds;
    }

    if (updates.order !== undefined) allowedUpdates.order = updates.order;
    if (updates.priority !== undefined)
      allowedUpdates.priority = updates.priority;
    if (updates.priorityId !== undefined)
      // Support priorityId from frontend
      allowedUpdates.priority = updates.priorityId;

    const task = await prisma.kanban_tasks.findFirst({
      where: {
        id: taskId,
        column: {
          workspace_id: workspaceId,
        },
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const hasStartDate =
      updates.startDate !== undefined || updates.start_date !== undefined;
    const hasEndDate =
      updates.endDate !== undefined ||
      updates.end_date !== undefined ||
      updates.dueDate !== undefined ||
      updates.due_date !== undefined;
    const rawStartDate = updates.startDate ?? updates.start_date;
    const rawEndDate =
      updates.endDate ??
      updates.end_date ??
      updates.dueDate ??
      updates.due_date;
    if (
      (hasStartDate &&
        rawStartDate !== null &&
        rawStartDate !== "" &&
        !normalizeDateOnly(rawStartDate)) ||
      (hasEndDate &&
        rawEndDate !== null &&
        rawEndDate !== "" &&
        !normalizeDateOnly(rawEndDate))
    ) {
      return NextResponse.json(
        { error: "날짜는 YYYY-MM-DD 형식이어야 합니다." },
        { status: 400 },
      );
    }
    const requestedStartDate = hasStartDate
      ? normalizeDateOnly(rawStartDate)
      : normalizeDateOnly(task.start_date);
    const requestedEndDate = hasEndDate
      ? normalizeDateOnly(rawEndDate)
      : normalizeDateOnly(task.end_date);

    try {
      assertValidDateRange(requestedStartDate, requestedEndDate);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Invalid date range",
        },
        { status: 400 },
      );
    }

    if (hasStartDate) {
      allowedUpdates.start_date = parseDateOnly(requestedStartDate);
    }
    if (hasEndDate) {
      allowedUpdates.end_date = parseDateOnly(requestedEndDate);
    }

    if (allowedUpdates.column_id) {
      const destinationColumn = await prisma.kanban_columns.findFirst({
        where: {
          id: allowedUpdates.column_id,
          workspace_id: workspaceId,
        },
        select: { id: true },
      });

      if (!destinationColumn) {
        return NextResponse.json(
          { error: "Destination column not found" },
          { status: 404 },
        );
      }
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      await tx.kanban_tasks.update({
        where: { id: taskId },
        data: allowedUpdates,
      });

      if (assigneeIds !== undefined) {
        await tx.kanban_task_assignees.deleteMany({
          where: { task_id: taskId },
        });
        if (assigneeIds.length > 0) {
          await tx.kanban_task_assignees.createMany({
            data: assigneeIds.map((assigneeUserId, position) => ({
              task_id: taskId,
              user_id: assigneeUserId,
              assigned_by: user.id,
              position,
            })),
          });
        }
      }

      return tx.kanban_tasks.findUniqueOrThrow({
        where: { id: taskId },
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
    });

    if (allowedUpdates.column_id) {
      const movedColumn = await prisma.kanban_columns.findUnique({
        where: { id: allowedUpdates.column_id },
        select: { category: true, title: true },
      });
      const category = (movedColumn?.category || "").toLowerCase();
      const title = (movedColumn?.title || "").toLowerCase();
      if (
        category === "done" ||
        category === "completed" ||
        title.includes("done")
      ) {
        const completionUserIds = Array.from(
          new Set([user.id, ...updatedTask.assignees.map((item) => item.user_id)]),
        );
        await Promise.all(
          completionUserIds.map(async (completionUserId) => {
            await logUserActivityEvent(
              completionUserId,
              MY_ACTIVITY_EVENT_TYPES.workspaceTaskCompleted,
              updatedTask.id,
            );
            await tryApplyReputationEvent({
              userId: completionUserId,
              eventType: REPUTATION_EVENT_TYPES.workspaceTaskCompleted,
              delta: REPUTATION_DELTAS.workspaceTaskCompleted,
              sourceType: "workspace_task",
              sourceId: updatedTask.id,
              dedupeKey: `workspace_task_completed:${updatedTask.id}:${completionUserId}`,
              metadata: { workspaceId },
            });
          }),
        );
      }
    }

    return NextResponse.json({
      ...updatedTask,
      columnId: updatedTask.column_id,
      ...serializeTaskAssignees(updatedTask.assignees, updatedTask),
      startDate: normalizeDateOnly(updatedTask.start_date),
      endDate: normalizeDateOnly(updatedTask.end_date),
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; taskId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: workspaceId, taskId } = params;

    const member = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
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

    const task = await prisma.kanban_tasks.findFirst({
      where: {
        id: taskId,
        column: {
          workspace_id: workspaceId,
        },
      },
      select: { id: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.kanban_tasks.delete({
      where: {
        id: taskId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
