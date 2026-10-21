import { workspace_lifecycle_status } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@/lib/supabase/server";

// 종료된 팀 공간을 다시 진행 중으로 되돌린다. owner만 가능.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params;
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: { workspace_id: workspaceId, user_id: session.user.id },
    },
    select: { role: true },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "Only the workspace owner can reopen it." },
      { status: 403 },
    );
  }

  const workspace = await prisma.workspaces.update({
    where: { id: workspaceId },
    data: {
      lifecycle_status: workspace_lifecycle_status.IN_PROGRESS,
      completed_at: null,
    },
    select: { id: true, lifecycle_status: true },
  });

  return NextResponse.json({ success: true, data: workspace });
}
