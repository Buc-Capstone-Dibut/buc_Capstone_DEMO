import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { saveWorkspaceDocSnapshot } from "@/lib/server/doc-collab-state";
import { snapshotToYjsState } from "@/lib/server/workspace-doc-collab";

export async function POST(
  request: Request,
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
    const payload = (await request.json()) as {
      yjsState?: unknown;
      content?: unknown;
      title?: unknown;
      emoji?: unknown;
      authorId?: unknown;
    };

    let yjsState: string | null = null;
    if (typeof payload.yjsState === "string" && payload.yjsState.trim()) {
      yjsState = payload.yjsState;
    } else if (Array.isArray(payload.content)) {
      yjsState = snapshotToYjsState(payload.content);
    }

    if (!yjsState) {
      return NextResponse.json(
        { error: "유효한 문서 본문이 필요합니다." },
        { status: 400 },
      );
    }

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
      },
      select: {
        id: true,
        kind: true,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    if (doc.kind !== "page") {
      return NextResponse.json(
        { error: "폴더는 저장할 수 없습니다." },
        { status: 400 },
      );
    }

    const result = await saveWorkspaceDocSnapshot({
      docId,
      yjsState,
      ...(payload.title === undefined || typeof payload.title === "string"
        ? { title: payload.title }
        : {}),
      ...(payload.emoji === undefined || payload.emoji === null || typeof payload.emoji === "string"
        ? { emoji: payload.emoji as string | null | undefined }
        : {}),
      ...(payload.authorId === undefined || payload.authorId === null || typeof payload.authorId === "string"
        ? { authorId: payload.authorId as string | null | undefined }
        : {}),
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API: Save Doc State Error", error);
    return NextResponse.json(
      { error: "문서 저장에 실패했습니다." },
      { status: 500 },
    );
  }
}
