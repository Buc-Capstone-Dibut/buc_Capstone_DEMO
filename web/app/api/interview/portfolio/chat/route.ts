import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { logUserActivityEvent, MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

async function getUserId(): Promise<string | null> {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = await getUserId();

    const response = await fetch(`${AI_BASE_URL}/v1/interview/portfolio/chat`, {
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
      return NextResponse.json(
        { success: false, error: data?.detail || data?.error || "Portfolio chat failed" },
        { status: response.status },
      );
    }

    if (data?.success && data?.isComplete && userId) {
      await logUserActivityEvent(
        userId,
        MY_ACTIVITY_EVENT_TYPES.portfolioDefenseCompleted,
        body?.sessionId || null,
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Portfolio chat failed" },
      { status: 500 },
    );
  }
}
