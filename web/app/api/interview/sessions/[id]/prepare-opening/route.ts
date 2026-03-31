import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";
const PREPARE_OPENING_TIMEOUT_MS = 15000;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getInterviewRouteUserId();
    if (!userId) {
      return unauthorizedInterviewResponse();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PREPARE_OPENING_TIMEOUT_MS);
    const response = await fetch(
      `${AI_BASE_URL}/v1/interview/sessions/${encodeURIComponent(params.id)}/prepare-opening`,
      {
        method: "POST",
        headers: {
          "x-user-id": userId,
        },
        cache: "no-store",
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timeoutId));

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            (data && typeof data.detail === "string" && data.detail) ||
            (data && typeof data.error === "string" && data.error) ||
            "Failed to prepare interview opening",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `AI interview server timed out. Check AI_INTERVIEW_BASE_URL (${AI_BASE_URL}) and ensure the AI server is running.`
        : (error instanceof Error ? error.message : "Failed to prepare interview opening");
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
