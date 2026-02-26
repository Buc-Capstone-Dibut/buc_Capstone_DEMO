import { NextResponse } from "next/server";
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

    const rows = await prisma.blog_bookmarks.findMany({
      where: { user_id: profile.id },
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true,
        created_at: true,
        blogs: {
          select: {
            id: true,
            title: true,
            summary: true,
            author: true,
            tags: true,
            external_url: true,
            thumbnail_url: true,
            published_at: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
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
