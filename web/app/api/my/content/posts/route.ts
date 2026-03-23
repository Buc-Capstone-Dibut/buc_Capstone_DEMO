import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  buildCreatedAtCursorWhere,
  decodeProfileCursor,
  encodeProfileCursor,
  parsePageLimit,
} from "@/lib/server/my-profile-pagination";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdParam = (searchParams.get("profileId") || "").trim();
    const handle = (searchParams.get("handle") || "").trim().toLowerCase();
    const limit = parsePageLimit(searchParams.get("limit"));
    const cursor = decodeProfileCursor(searchParams.get("cursor"));

    if (!handle && !profileIdParam) {
      return NextResponse.json(
        { success: false, error: "handle or profileId is required" },
        { status: 400 },
      );
    }

    const resolvedProfileId =
      profileIdParam ||
      (
        await prisma.profiles.findUnique({
          where: { handle },
          select: { id: true },
        })
      )?.id;

    if (!resolvedProfileId) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 },
      );
    }

    const where: Prisma.postsWhereInput = {
      author_id: resolvedProfileId,
      ...(buildCreatedAtCursorWhere(cursor, "created_at") as Prisma.postsWhereInput),
    };

    const posts = await prisma.posts.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: limit + 1,
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
    const pageItems = posts.slice(0, limit);
    const hasMore = posts.length > limit;
    const lastItem = pageItems[pageItems.length - 1];

    return NextResponse.json({
      success: true,
      data: {
        items: pageItems.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          tags: item.tags || [],
          views: item.views || 0,
          likes: item.likes || 0,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })),
        hasMore,
        nextCursor: hasMore
          ? encodeProfileCursor({
              createdAt: lastItem?.created_at,
              id: lastItem?.id,
            })
          : null,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch posts";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
