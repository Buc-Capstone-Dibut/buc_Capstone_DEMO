import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logUserActivityEvent, MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";

// Helper to validate User ID from Request body or Headers (if Auth middleware passes it)
// For this API route, we assume the Client sends user_id/author_id, OR we should technically verify session.
// But keeping existing behavior: usage passed user_id (Backend-for-Frontend logic).
// Note: In real production, we must verify session here too.
// For Vibe Coding, we rely on the input body for now (as the original code did validation on body.user_id).

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, category, tags, user_id } = body;

    // Validation
    const missing = [];
    if (!title) missing.push("title");
    if (!content) missing.push("content");
    if (!category) missing.push("category");
    if (!user_id) missing.push("user_id");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
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
  } catch (e: any) {
    console.error("API: Post Exception", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
