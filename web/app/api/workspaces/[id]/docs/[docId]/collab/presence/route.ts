import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { touchDocPresence } from "@/lib/server/workspace-doc-collab-session";

type PresenceMode = "NORMAL" | "COLLAB";

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
    const body = (await request.json().catch(() => null)) as {
      mode?: PresenceMode;
      isDirty?: boolean;
      active?: boolean;
    } | null;

    const mode = body?.mode === "COLLAB" ? "COLLAB" : "NORMAL";
    const isDirty = Boolean(body?.isDirty);
    const active = body?.active !== false;

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

    await touchDocPresence({
      workspaceId,
      docId,
      userId: session.user.id,
      mode,
      isDirty,
      active,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("API: Doc Presence Error", error);
    return NextResponse.json(
      { error: "문서 상태 동기화에 실패했습니다." },
      { status: 500 },
    );
  }
}
