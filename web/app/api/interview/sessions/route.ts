import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";

export const dynamic = "force-dynamic";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

export async function GET(req: Request) {
  try {
    const userId = await getInterviewRouteUserId();
    if (!userId) {
      return unauthorizedInterviewResponse();
    }
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
          "x-user-id": userId,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch sessions";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
