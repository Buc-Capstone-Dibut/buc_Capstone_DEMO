import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import {
  createWorkspaceDocTemplate,
  listWorkspaceDocTemplates,
} from "@/lib/server/workspace-doc-templates";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: params.id,
          user_id: session.user.id,
        },
      },
      select: { user_id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(await listWorkspaceDocTemplates(params.id));
  } catch (error) {
    console.error("API: List Doc Templates Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to list templates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: params.id,
          user_id: session.user.id,
        },
      },
      select: { user_id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const writableCheck = await ensureWorkspaceWritable(params.id);
    if (!writableCheck.ok) {
      return NextResponse.json(
        { error: writableCheck.error },
        { status: writableCheck.status },
      );
    }

    const body = (await request.json().catch(() => null)) as
      | {
          name?: unknown;
          description?: unknown;
          emoji?: unknown;
          title?: unknown;
          content?: unknown;
          sourceDocId?: unknown;
        }
      | null;

    if (typeof body?.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "템플릿 이름을 입력해 주세요." },
        { status: 400 },
      );
    }

    const template = await createWorkspaceDocTemplate({
      workspaceId: params.id,
      createdBy: session.user.id,
      name: body.name,
      ...(typeof body.description === "string" || body?.description === null
        ? { description: body.description }
        : {}),
      ...(typeof body.emoji === "string" || body?.emoji === null
        ? { emoji: body.emoji }
        : {}),
      ...(typeof body.title === "string" || body?.title === null
        ? { title: body.title }
        : {}),
      ...(body && "content" in body ? { content: body.content } : {}),
      ...(typeof body.sourceDocId === "string" || body?.sourceDocId === null
        ? { sourceDocId: body.sourceDocId }
        : {}),
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("API: Create Doc Template Error", error);
    const message =
      error instanceof Error ? error.message : "Failed to create template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
