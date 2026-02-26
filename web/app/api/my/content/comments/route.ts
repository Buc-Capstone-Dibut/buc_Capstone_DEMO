import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = (searchParams.get("handle") || "").trim().toLowerCase();

    if (!handle) {
      return NextResponse.json(
        { success: false, error: "handle is required" },
        { status: 400 },
      );
    }

    const profile = await prisma.profiles.findUnique({
      where: { handle },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 },
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const [{ data: { session } }, comments] = await Promise.all([
      supabase.auth.getSession(),
      prisma.comments.findMany({
        where: { author_id: profile.id },
        orderBy: { created_at: "desc" },
        take: 100,
        select: {
          id: true,
          content: true,
          post_id: true,
          created_at: true,
          posts: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        isOwner: Boolean(session?.user?.id && session.user.id === profile.id),
        items: comments.map((item) => ({
          id: item.id,
          content: item.content,
          postId: item.post_id,
          postTitle: item.posts?.title || "",
          createdAt: item.created_at,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch comments" },
      { status: 500 },
    );
  }
}
