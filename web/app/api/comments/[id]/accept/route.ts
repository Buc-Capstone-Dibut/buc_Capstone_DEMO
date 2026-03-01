import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const isQnaCategory = (category: string | null | undefined) => {
  if (!category) return false;
  const normalized = category.toLowerCase();
  return (
    normalized === "qna" ||
    normalized === "질문게시판" ||
    normalized === "질문/답변"
  );
};

export async function POST(
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

    const commentId = params.id;

    const targetComment = await prisma.comments.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        post_id: true,
        is_accepted: true,
      },
    });

    if (!targetComment || !targetComment.post_id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (targetComment.is_accepted) {
      return NextResponse.json(
        { error: "This comment is already accepted." },
        { status: 409 },
      );
    }

    const post = await prisma.posts.findUnique({
      where: { id: targetComment.post_id },
      select: {
        id: true,
        category: true,
        author_id: true,
        has_accepted_answer: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!isQnaCategory(post.category)) {
      return NextResponse.json(
        { error: "Only Q&A posts can accept an answer." },
        { status: 400 },
      );
    }

    if (post.author_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the post author can accept an answer." },
        { status: 403 },
      );
    }

    if (post.has_accepted_answer) {
      return NextResponse.json(
        { error: "An accepted answer is already locked for this post." },
        { status: 409 },
      );
    }

    const existingAccepted = await prisma.comments.findFirst({
      where: {
        post_id: post.id,
        is_accepted: true,
      },
      select: { id: true },
    });

    if (existingAccepted) {
      return NextResponse.json(
        { error: "An accepted answer is already locked for this post." },
        { status: 409 },
      );
    }

    await prisma.$transaction([
      prisma.comments.update({
        where: { id: targetComment.id },
        data: {
          is_accepted: true,
          updated_at: new Date(),
        },
      }),
      prisma.posts.update({
        where: { id: post.id },
        data: {
          has_accepted_answer: true,
          updated_at: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("API: Accept Comment Error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
