import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logUserActivityEvent, MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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
    const { post_id, content, parent_id } = body;
    const user_id = session.user.id;

    // Validation
    const missing = [];
    if (!post_id) missing.push("post_id");
    if (!content) missing.push("content");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const created = await prisma.comments.create({
      data: {
        post_id,
        content,
        author_id: user_id,
        parent_id: parent_id || null, // Optional parent_id for replies
      },
    });

    await logUserActivityEvent(
      user_id,
      MY_ACTIVITY_EVENT_TYPES.communityCommentCreated,
      created.id,
    );

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("API: Comment Exception", e);
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: `저장 실패: ${message}` },
      { status: 500 },
    );
  }
}
