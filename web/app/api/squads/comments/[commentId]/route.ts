import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: { commentId: string } },
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

    const commentId = params.commentId;
    const userId = session.user.id;

    const comment = await squadCommentsModel.findUnique({
      where: { id: commentId },
      select: { id: true, author_id: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.author_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own comments" },
        { status: 403 },
      );
    }

    await squadCommentsModel.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API: Delete Squad Comment Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
