import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function DELETE(
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

    const { id } = params;
    const userId = session.user.id;

    // Verify ownership
    const post = await prisma.posts.findUnique({
      where: { id },
      select: { author_id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.author_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own posts" },
        { status: 403 },
      );
    }

    await prisma.posts.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API: Delete Post Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
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

    const { id } = params;
    const userId = session.user.id;
    const body = await request.json();
    const { title, content, category, tags } = body;

    // Verify ownership
    const post = await prisma.posts.findUnique({
      where: { id },
      select: { author_id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.author_id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You can only edit your own posts" },
        { status: 403 },
      );
    }

    // Update Post
    const updatedPost = await prisma.posts.update({
      where: { id },
      data: {
        title,
        content,
        category,
        tags: tags || [],
        updated_at: new Date(),
      },
    });

    return NextResponse.json(updatedPost);
  } catch (error: any) {
    console.error("API: Update Post Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
