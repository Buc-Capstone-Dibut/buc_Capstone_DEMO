import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import { normalizeWorkspaceTeamRole } from "@/lib/workspace-team-roles";
import { Prisma } from "@prisma/client";

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Unknown error";
};

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const { id: workspaceId, memberId } = await params;
    const body = await request.json();
    const teamRole = normalizeWorkspaceTeamRole(body.teamRole);

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const updatedRows = await prisma.$queryRaw<
      Array<{
        user_id: string;
        role: string;
        team_role: string | null;
        joined_at: Date;
      }>
    >(Prisma.sql`
      UPDATE public.workspace_members
      SET team_role = ${teamRole}
      WHERE workspace_id = ${workspaceId}::uuid
        AND user_id = ${memberId}::uuid
      RETURNING user_id, role, team_role, joined_at
    `);

    const updatedMember = updatedRows[0];

    if (!updatedMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      member: updatedMember,
    });
  } catch (error: unknown) {
    console.error("API: Update Workspace Member Error", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
