import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  startDocCollabSession,
  touchDocPresence,
} from "@/lib/server/workspace-doc-collab-session";
import { syncDocCollabStateFromSnapshot } from "@/lib/server/doc-collab-state";
import { resetWorkspaceDocCollabRoom } from "@/lib/server/workspace-doc-collab-room";
import { createWorkspaceDocCollabToken } from "@/lib/server/workspace-doc-collab-token";

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
      userId: user.id,
      mode: "NORMAL",
      isDirty: false,
    });

    const existingSession = await prisma.workspace_doc_collab_sessions.findUnique({
      where: {
        doc_id: docId,
      },
      select: {
        status: true,
      },
    });

    let seedState: string | null = null;

    if (!existingSession || existingSession.status !== "ACTIVE") {
      // 이전 room의 지연 저장이 새 seed를 뒤늦게 덮지 않도록 room을 먼저 비운다.
      const reset = await resetWorkspaceDocCollabRoom(docId);
      if (!reset.ok) {
        return NextResponse.json(
          { error: "이전 협업 상태를 정리하지 못해 협업을 시작할 수 없습니다." },
          { status: reset.status },
        );
      }

      const seeded = await syncDocCollabStateFromSnapshot(docId);
      if (!seeded.ok) {
        return NextResponse.json(
          { error: seeded.error },
          { status: seeded.status },
        );
      }
      seedState = seeded.yjsState;
    }

    const result = await startDocCollabSession(
      workspaceId,
      docId,
      user.id,
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
      seedState,
      token: createWorkspaceDocCollabToken({
        docId,
        workspaceId,
        userId: user.id,
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
