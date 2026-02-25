import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

async function getUserId(): Promise<string | null> {
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

export async function GET(req: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(req.url);
    const sessionType = searchParams.get("session_type") ?? "";
    const limit = searchParams.get("limit") ?? "20";

    const params = new URLSearchParams();
    if (sessionType) params.set("session_type", sessionType);
    params.set("limit", limit);

    const response = await fetch(
      `${AI_BASE_URL}/v1/interview/sessions?${params}`,
      {
        headers: {
          ...(userId ? { "x-user-id": userId } : {}),
        },
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data?.detail || "Failed to fetch sessions" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}
