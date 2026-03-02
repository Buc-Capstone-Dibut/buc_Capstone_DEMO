import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import {
  ensureWorkspaceWritable,
  getWorkspaceLifecycle,
  isWorkspaceCompleted,
} from "@/lib/server/workspace-lifecycle";

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Unknown error";
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const { id: workspaceId } = resolvedParams;
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Check Membership first
    const memberCheck = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: userId,
        },
      },
    });

    if (!memberCheck) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 2. Fetch Workspace Details (with members)
    const workspace = await prisma.workspaces.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        category: true,
        from_squad_id: true,
        created_at: true,
        updated_at: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar_url: true,
                users: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const lifecycle = await getWorkspaceLifecycle(workspaceId);

    // Transform response to match frontend expectation
    const formattedWorkspace = {
      ...workspace,
      lifecycle_status: lifecycle?.lifecycle_status ?? "IN_PROGRESS",
      completed_at: lifecycle?.completed_at ?? null,
      result_type: lifecycle?.result_type ?? null,
      result_link: lifecycle?.result_link ?? null,
      result_note: lifecycle?.result_note ?? null,
      read_only: isWorkspaceCompleted(lifecycle),
      my_role: memberCheck.role,
      members: workspace.members.map((wm) => ({
        id: wm.user_id,
        name: wm.user?.nickname || "Unknown",
        nickname: wm.user?.nickname || "Unknown",
        email: wm.user?.users?.email || null,
        avatar: wm.user?.avatar_url,
        role: wm.role,
        joined_at: wm.joined_at,
        online: false, // TODO: integrate with presence later
      })),
    };

    return NextResponse.json(formattedWorkspace);
  } catch (error: unknown) {
    console.error("API: Get Workspace Error", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

// PATCH: Update Workspace Details
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const { id: workspaceId } = resolvedParams;
    const body = await request.json();
    const { name, description, category } = body;

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check ownership
    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: session.user.id,
        },
      },
    });

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    const updated = await prisma.workspaces.update({
      where: { id: workspaceId },
      data: {
        name,
        description,
        category,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("API: Update Workspace Error", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const { id: workspaceId } = resolvedParams;
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Verify Ownership
    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: userId,
        },
      },
    });

    if (!membership || membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only the workspace owner can delete it." },
        { status: 403 },
      );
    }

    // 2. Delete Workspace
    // Note: Relations (members, tasks, docs) should be set to onDelete: Cascade in schema
    await prisma.workspaces.delete({
      where: { id: workspaceId },
    });

    return NextResponse.json({ message: "Workspace deleted successfully" });
  } catch (error: unknown) {
    console.error("API: Delete Workspace Error", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
