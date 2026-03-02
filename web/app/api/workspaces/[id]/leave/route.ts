import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }, // Standard Next.js 15+ convention
) {
  const { id: workspaceId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Check Membership & Role
    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this workspace" },
        { status: 404 },
      );
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    // 2. Prevent Owner from leaving
    if (membership.role === "owner") {
      return NextResponse.json(
        {
          error:
            "워크스페이스 소유자는 나갈 수 없습니다. 소유권을 이전하거나 워크스페이스를 삭제하세요.",
        },
        { status: 403 },
      );
    }

    // 3. Remove Member
    await prisma.workspace_members.delete({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave Workspace Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
