import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logUserActivityEvent, MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Community post creation is session-authenticated and always uses session.user.id
// as the author to avoid forged user_id payloads.

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, category, tags } = body;
    const user_id = session.user.id;

    // Validation
    const missing: string[] = [];
    if (!title) missing.push("title");
    if (!content) missing.push("content");
    if (!category) missing.push("category");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user_id },
    });

    if (!profile) {
      const baseHandle = `user-${String(user_id).replace(/-/g, "").toLowerCase()}`;
      await prisma.profiles.create({
        data: {
          id: user_id,
          handle: baseHandle,
          nickname:
            session.user.user_metadata?.name ||
            session.user.user_metadata?.nickname ||
            "User",
          avatar_url: session.user.user_metadata?.avatar_url || null,
        },
      });
    }

    const post = await prisma.posts.create({
      data: {
        title,
        content,
        category,
        tags: tags || [],
        author_id: user_id,
        views: 0,
        likes: 0,
      },
    });

    await logUserActivityEvent(
      user_id,
      MY_ACTIVITY_EVENT_TYPES.communityPostCreated,
      post.id,
    );

    return NextResponse.json({ success: true, id: post.id });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("API: Post Exception", e);
    return NextResponse.json(
      { error: err.message || "게시글 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
