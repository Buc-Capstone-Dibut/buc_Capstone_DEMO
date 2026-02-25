import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logUserActivityEvent, MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { post_id, content, user_id, parent_id } = body;

    // Validation
    const missing = [];
    if (!post_id) missing.push("post_id");
    if (!content) missing.push("content");
    if (!user_id) missing.push("user_id");

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
  } catch (e: any) {
    console.error("API: Comment Exception", e);
    return NextResponse.json(
      { error: `저장 실패: ${e.message || "알 수 없는 오류"}` },
      { status: 500 },
    );
  }
}
