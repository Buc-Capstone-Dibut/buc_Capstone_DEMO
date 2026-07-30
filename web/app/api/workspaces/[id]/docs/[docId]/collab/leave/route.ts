import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { leaveDocCollabSession } from "@/lib/server/workspace-doc-collab-session";
import { flushWorkspaceDocCollabRoom } from "@/lib/server/workspace-doc-collab-room";

export async function POST(
  _request: Request,
  { params }: { params: { id: string; docId: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, docId } = params;

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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const doc = await prisma.workspace_docs.findFirst({
      where: {
        id: docId,
        workspace_id: workspaceId,
        kind: "page",
      },
      select: { id: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // 세션을 먼저 종료하면 클라이언트가 일반 편집기로 전환하는 동안
    // WebSocket의 마지막 비동기 저장이 뒤늦게 도착해 최신 내용을 덮을 수 있다.
    const flushed = await flushWorkspaceDocCollabRoom(docId);
    if (!flushed.ok) {
      return NextResponse.json(
        {
          error:
            "최신 협업 내용을 저장하지 못해 협업을 종료하지 않았습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: flushed.status === 409 ? 409 : 503 },
      );
    }

    const result = await leaveDocCollabSession(
      workspaceId,
      docId,
      user.id,
    );

    return NextResponse.json({
      ok: true,
      ended: result.ended,
      collab: result.state,
    });
  } catch (error) {
    console.error("API: Leave Doc Collab Error", error);
    return NextResponse.json(
      { error: "협업 나가기에 실패했습니다." },
      { status: 500 },
    );
  }
}
