import { workspace_lifecycle_status } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const WORKSPACE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return json({ error: "허용되지 않은 요청입니다." }, 403);
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: "로그인이 필요합니다." }, 401);
    }

    const { id: workspaceId } = await params;
    if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
      return json({ error: "워크스페이스 ID가 올바르지 않습니다." }, 400);
    }

    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
      select: { role: true },
    });
    if (membership?.role !== "owner") {
      return json({ error: "워크스페이스 소유자만 재개할 수 있습니다." }, 403);
    }

    const workspace = await prisma.workspaces.findUnique({
      where: { id: workspaceId },
      select: { id: true, lifecycle_status: true, completed_at: true },
    });
    if (!workspace) {
      return json({ error: "워크스페이스를 찾을 수 없습니다." }, 404);
    }
    if (workspace.lifecycle_status === workspace_lifecycle_status.IN_PROGRESS) {
      return json({ success: true, reopened: false, workspace });
    }

    // Recheck ownership and completion in the write itself so stale or duplicate
    // requests cannot change a workspace after its owner/state has changed.
    const updated = await prisma.workspaces.updateMany({
      where: {
        id: workspaceId,
        lifecycle_status: workspace_lifecycle_status.COMPLETED,
        members: { some: { user_id: user.id, role: "owner" } },
      },
      data: {
        lifecycle_status: workspace_lifecycle_status.IN_PROGRESS,
        completed_at: null,
      },
    });
    if (updated.count === 0) {
      return json(
        { error: "워크스페이스 상태 또는 권한이 변경되었습니다. 새로고침 후 다시 시도해 주세요." },
        409,
      );
    }

    return json({
      success: true,
      reopened: true,
      workspace: {
        id: workspaceId,
        lifecycle_status: workspace_lifecycle_status.IN_PROGRESS,
        completed_at: null,
      },
    });
  } catch (error) {
    console.error("API: Reopen Workspace Error", error);
    return json({ error: "워크스페이스를 재개하지 못했습니다." }, 500);
  }
}
