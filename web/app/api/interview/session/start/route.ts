import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = await getInterviewRouteUserId();
    if (!userId) {
      return unauthorizedInterviewResponse();
    }

    const response = await fetch(`${AI_BASE_URL}/v1/interview/session/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (data && typeof data.detail === "string" && data.detail) ||
        (data && typeof data.error === "string" && data.error) ||
        "Failed to start interview session";

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start interview session";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
