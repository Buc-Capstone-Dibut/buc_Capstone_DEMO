import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  startDocCollabSession,
  touchDocPresence,
} from "@/lib/server/workspace-doc-collab-session";
import { createWorkspaceDocCollabToken } from "@/lib/server/workspace-doc-collab-token";

export async function POST(
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

    const writableCheck = await ensureWorkspaceWritable(workspaceId);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
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

    await touchDocPresence({
      workspaceId,
      docId,
      userId: session.user.id,
      mode: "NORMAL",
      isDirty: false,
    });

    const result = await startDocCollabSession(
      workspaceId,
      docId,
      session.user.id,
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          blockers: result.blockers,
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      collab: result.state,
      token: createWorkspaceDocCollabToken({
        docId,
        workspaceId,
        userId: session.user.id,
      }),
    });
  } catch (error) {
    console.error("API: Start Doc Collab Error", error);
    return NextResponse.json(
      { error: "협업 시작에 실패했습니다." },
      { status: 500 },
    );
  }
}
