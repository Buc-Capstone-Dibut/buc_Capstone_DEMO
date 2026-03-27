import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getDocCollabState } from "@/lib/server/workspace-doc-collab-session";
import { createWorkspaceDocCollabToken } from "@/lib/server/workspace-doc-collab-token";

export async function GET(
  _request: Request,
  { params }: { params: { id: string; docId: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId, docId } = params;

    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: session.user.id,
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

    const collabState = await getDocCollabState(
      workspaceId,
      docId,
      session.user.id,
    );
    if (!collabState.isActive) {
      return NextResponse.json(
        { error: "활성 협업 세션이 없습니다." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      token: createWorkspaceDocCollabToken({
        docId,
        workspaceId,
        userId: session.user.id,
      }),
      collab: collabState,
    });
  } catch (error) {
    console.error("API: Doc Collab Token Error", error);
    return NextResponse.json(
      { error: "협업 토큰 발급에 실패했습니다." },
      { status: 500 },
    );
  }
}
