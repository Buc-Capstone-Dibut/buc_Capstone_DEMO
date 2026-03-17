import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";
const SESSION_START_TIMEOUT_MS = 8000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = await getInterviewRouteUserId();
    if (!userId) {
      return unauthorizedInterviewResponse();
    }
    const requestBody = {
      ...body,
      mode: "video",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SESSION_START_TIMEOUT_MS);
    const response = await fetch(`${AI_BASE_URL}/v1/interview/portfolio/session/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data?.detail || data?.error || "Portfolio session start failed" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `AI interview server timed out. Check AI_INTERVIEW_BASE_URL (${AI_BASE_URL}) and ensure the AI server is running.`
        : (error instanceof Error ? error.message : "Portfolio session start failed");
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
