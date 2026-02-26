import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logUserActivityEvent, MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import prisma from "@/lib/prisma";

export async function PATCH(
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
  const user = session.user;

  try {
    const { id: workspaceId, taskId } = params;
    const updates = await request.json();

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

    if (updates.due_date) {
      updates.due_date = new Date(updates.due_date);
    }
    if (updates.dueDate) {
      updates.due_date = new Date(updates.dueDate);
    }

    const allowedUpdates: any = {};
    if (updates.title !== undefined) allowedUpdates.title = updates.title;
    if (updates.description !== undefined)
      allowedUpdates.description = updates.description;

    // Support both camelCase and snake_case
    if (updates.column_id !== undefined)
      allowedUpdates.column_id = updates.column_id;
    if (updates.columnId !== undefined)
      allowedUpdates.column_id = updates.columnId;

    if (updates.assignee_id !== undefined)
      allowedUpdates.assignee_id = updates.assignee_id;
    if (updates.assigneeId !== undefined)
      allowedUpdates.assignee_id = updates.assigneeId;

    if (updates.tags !== undefined) allowedUpdates.tags = updates.tags;

    if (updates.due_date !== undefined)
      allowedUpdates.due_date = updates.due_date;
    // dueDate is handled above by converting to due_date

    if (updates.order !== undefined) allowedUpdates.order = updates.order;
    if (updates.priority !== undefined)
      allowedUpdates.priority = updates.priority;
    if (updates.priorityId !== undefined)
      // Support priorityId from frontend
      allowedUpdates.priority = updates.priorityId;

    const updatedTask = await prisma.kanban_tasks.update({
      where: {
        id: taskId,
      },
      data: allowedUpdates,
    });

    if (allowedUpdates.column_id) {
      const movedColumn = await prisma.kanban_columns.findUnique({
        where: { id: allowedUpdates.column_id },
        select: { category: true, title: true },
      });
      const category = (movedColumn?.category || "").toLowerCase();
      const title = (movedColumn?.title || "").toLowerCase();
      if (category === "done" || category === "completed" || title.includes("done")) {
        await logUserActivityEvent(
          user.id,
          MY_ACTIVITY_EVENT_TYPES.workspaceTaskCompleted,
          updatedTask.id,
        );
      }
    }

    return NextResponse.json(updatedTask);
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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;

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
