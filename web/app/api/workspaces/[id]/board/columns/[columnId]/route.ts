import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; columnId: string } },
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
    const { id: workspaceId, columnId } = params;
    const body = await request.json();

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

    // Prepare updates
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;

    const updatedColumn = await prisma.kanban_columns.update({
      where: {
        id: columnId,
      },
      data: updates,
    });

    return NextResponse.json(updatedColumn);
  } catch (error) {
    console.error("Error updating column:", error);
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; columnId: string } },
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
    const { id: workspaceId, columnId } = params;

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

    // Attempt to delete column.
    // This might fail if database cascade is not set and tasks exist.
    // However, usually Prisma or DB level constraints handle this.
    // If it fails, user will see the alert.
    await prisma.kanban_columns.delete({
      where: {
        id: columnId,
        workspace_id: workspaceId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 },
    );
  }
}
