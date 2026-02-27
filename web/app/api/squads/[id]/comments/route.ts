import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function mapCommentWithAuthor(
  comment: {
    id: string;
    squad_id: string;
    author_id: string | null;
    content: string;
    parent_id: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    profiles?: {
      nickname: string | null;
      avatar_url: string | null;
      handle: string | null;
    } | null;
  },
) {
  return {
    id: comment.id,
    squad_id: comment.squad_id,
    author_id: comment.author_id,
    content: comment.content,
    parent_id: comment.parent_id,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    author: comment.profiles
      ? {
          nickname: comment.profiles.nickname,
          avatar_url: comment.profiles.avatar_url,
          handle: comment.profiles.handle,
        }
      : null,
  };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const squadCommentsModel = (prisma as any).squad_comments;
    if (!squadCommentsModel) {
      return NextResponse.json(
        { error: "Prisma client is outdated. Run `npx prisma generate`." },
        { status: 500 },
      );
    }

    const squadId = params.id;

    const squad = await prisma.squads.findUnique({
      where: { id: squadId },
      select: { id: true },
    });

    if (!squad) {
      return NextResponse.json({ error: "Squad not found" }, { status: 404 });
    }

    const comments = await squadCommentsModel.findMany({
      where: { squad_id: squadId },
      include: {
        profiles: {
          select: { nickname: true, avatar_url: true, handle: true },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: comments.map(mapCommentWithAuthor),
    });
  } catch (error: unknown) {
    console.error("API: Squad Comments GET Error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const squadCommentsModel = (prisma as any).squad_comments;
    if (!squadCommentsModel) {
      return NextResponse.json(
        { error: "Prisma client is outdated. Run `npx prisma generate`." },
        { status: 500 },
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const squadId = params.id;
    const userId = session.user.id;
    const body = await request.json();

    const content =
      typeof body?.content === "string" ? body.content.trim() : "";
    const parentId =
      typeof body?.parent_id === "string" && body.parent_id.trim().length > 0
        ? body.parent_id.trim()
        : null;

    if (!content) {
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: "댓글은 1000자 이하로 작성해주세요." },
        { status: 400 },
      );
    }

    const squad = await prisma.squads.findUnique({
      where: { id: squadId },
      select: { id: true },
    });

    if (!squad) {
      return NextResponse.json({ error: "Squad not found" }, { status: 404 });
    }

    if (parentId) {
      const parent = await squadCommentsModel.findUnique({
        where: { id: parentId },
        select: { id: true, squad_id: true },
      });

      if (!parent || parent.squad_id !== squadId) {
        return NextResponse.json(
          { error: "유효하지 않은 답글 대상입니다." },
          { status: 400 },
        );
      }
    }

    // Keep flow resilient for users missing profile rows.
    await prisma.profiles.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        handle: `user-${String(userId).slice(0, 8).toLowerCase()}`,
        nickname: "User",
      },
    });

    const created = await squadCommentsModel.create({
      data: {
        squad_id: squadId,
        author_id: userId,
        content,
        parent_id: parentId,
      },
      include: {
        profiles: {
          select: { nickname: true, avatar_url: true, handle: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: mapCommentWithAuthor(created),
    });
  } catch (error: unknown) {
    console.error("API: Squad Comments POST Error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
