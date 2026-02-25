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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const posts = await prisma.posts.findMany({
      where: { author_id: profile.id },
      orderBy: { created_at: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        category: true,
        tags: true,
        views: true,
        likes: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isOwner: Boolean(session?.user?.id && session.user.id === profile.id),
        items: posts.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          tags: item.tags || [],
          views: item.views || 0,
          likes: item.likes || 0,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch posts" },
      { status: 500 },
    );
  }
}
