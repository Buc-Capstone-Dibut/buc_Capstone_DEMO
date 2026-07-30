import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(
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
      select: {
        state: {
          select: { updated_at: true },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      persistedAt: doc.state?.updated_at.toISOString() ?? null,
    });
  } catch (error) {
    console.error("API: Doc Collab Status Error", error);
    return NextResponse.json(
      { error: "협업 저장 상태를 확인하지 못했습니다." },
      { status: 500 },
    );
  }
}
