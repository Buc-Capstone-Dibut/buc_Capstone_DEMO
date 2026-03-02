import { workspace_lifecycle_status } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type CompleteWorkspaceBody = {
  resultType?: unknown;
  resultLink?: unknown;
  resultNote?: unknown;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workspaceId } = await params;

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: userId,
        },
      },
      select: { role: true },
    });

    if (!membership || membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only the workspace owner can complete it." },
        { status: 403 },
      );
    }

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    const body = (await request.json().catch(() => ({}))) as CompleteWorkspaceBody;
    const resultType = normalizeOptionalText(body.resultType);
    const resultLink = normalizeOptionalText(body.resultLink);
    const resultNote = normalizeOptionalText(body.resultNote);

    const updated = await prisma.workspaces.update({
      where: { id: workspaceId },
      data: {
        lifecycle_status: workspace_lifecycle_status.COMPLETED,
        completed_at: new Date(),
        result_type: resultType,
        result_link: resultLink,
        result_note: resultNote,
      },
      select: {
        id: true,
        lifecycle_status: true,
        completed_at: true,
        result_type: true,
        result_link: true,
        result_note: true,
      },
    });

    return NextResponse.json({ success: true, workspace: updated });
  } catch (error: unknown) {
    console.error("API: Complete Workspace Error", error);
    return NextResponse.json(
      { error: "Failed to complete workspace" },
      { status: 500 },
    );
  }
}
