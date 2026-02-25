import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { logUserActivityEvent, MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

async function getUserIdFromSession(): Promise<string | null> {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = await getUserIdFromSession();

    const response = await fetch(`${AI_BASE_URL}/v1/interview/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-user-id": userId } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (data && typeof data.detail === "string" && data.detail) ||
        (data && typeof data.error === "string" && data.error) ||
        "AI interview service request failed";

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: response.status },
      );
    }

    if (data?.success && userId) {
      await logUserActivityEvent(
        userId,
        MY_ACTIVITY_EVENT_TYPES.interviewCompleted,
        body?.sessionId || null,
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Analysis Error: ${error.message || error.toString()}`,
      },
      { status: 500 },
    );
  }
}
