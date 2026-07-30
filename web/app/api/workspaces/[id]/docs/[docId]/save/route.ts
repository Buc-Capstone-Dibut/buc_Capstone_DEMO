import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { saveWorkspaceDocContent } from "@/lib/server/doc-collab-state";
import { getDocCollabState } from "@/lib/server/workspace-doc-collab-session";

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
      content?: unknown;
      title?: unknown;
      emoji?: unknown;
      authorId?: unknown;
    };

    const hasContentSnapshot = Array.isArray(payload.content);

    if (!hasContentSnapshot) {
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

    const collabState = await getDocCollabState(
      workspaceId,
      docId,
      session.user.id,
    );

    if (collabState.isActive) {
      return NextResponse.json(
        {
          error:
            "협업 편집 중에는 일반 저장을 사용할 수 없습니다. 협업을 종료한 뒤 저장해 주세요.",
        },
        { status: 409 },
      );
    }

    const metadata = {
      ...(payload.title === undefined || typeof payload.title === "string"
        ? { title: payload.title }
        : {}),
      ...(payload.emoji === undefined ||
      payload.emoji === null ||
      typeof payload.emoji === "string"
        ? { emoji: payload.emoji as string | null | undefined }
        : {}),
      ...(payload.authorId === undefined ||
      payload.authorId === null ||
      typeof payload.authorId === "string"
        ? { authorId: payload.authorId as string | null | undefined }
        : {}),
    };

    const result = await saveWorkspaceDocContent({
      docId,
      content: payload.content,
      ...metadata,
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
