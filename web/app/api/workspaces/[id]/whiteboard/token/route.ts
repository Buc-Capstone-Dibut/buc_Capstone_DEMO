import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import { createWorkspaceWhiteboardToken } from "@/lib/server/workspace-doc-collab-token";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const workspaceId = params.id;
    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
      select: { user_id: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "워크스페이스에 접근할 권한이 없습니다." },
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

    return NextResponse.json(
      {
        token: createWorkspaceWhiteboardToken({
          workspaceId,
          userId: user.id,
        }),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("API: Whiteboard Token Error", error);
    return NextResponse.json(
      { error: "화이트보드 연결 권한을 확인하지 못했습니다." },
      { status: 500 },
    );
  }
}
