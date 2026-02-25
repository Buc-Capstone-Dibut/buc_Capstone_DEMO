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

    const rows = await prisma.blog_bookmarks.findMany({
      where: { user_id: profile.id },
      orderBy: { created_at: "desc" },
      take: 100,
      include: {
        blogs: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        isOwner: Boolean(session?.user?.id && session.user.id === profile.id),
        items: rows.map((row) => ({
          id: row.id,
          createdAt: row.created_at,
          blog: {
            id: row.blogs.id,
            title: row.blogs.title,
            summary: row.blogs.summary,
            author: row.blogs.author,
            tags: row.blogs.tags || [],
            externalUrl: row.blogs.external_url,
            thumbnailUrl: row.blogs.thumbnail_url,
            publishedAt: row.blogs.published_at,
          },
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch bookmarks" },
      { status: 500 },
    );
  }
}
