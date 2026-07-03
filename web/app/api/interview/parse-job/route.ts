import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";
// FastAPI 가 URL fetch(≈30s) + LLM 재시도까지 하므로 여유를 두고 60초.
const PARSE_JOB_TIMEOUT_MS = 60_000;

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PARSE_JOB_TIMEOUT_MS);
    const response = await fetch(`${AI_BASE_URL}/v1/interview/parse-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-user-id": userId } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (data && typeof data.detail === "string" && data.detail) ||
        (data && typeof data.error === "string" && data.error) ||
        "Failed to parse job posting";

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return NextResponse.json(
        {
          success: false,
          error: "공고 분석이 시간 내에 끝나지 않았어요. 잠시 후 다시 시도하거나 아래에서 직접 입력해 주세요.",
        },
        { status: 504 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to parse job posting",
      },
      { status: 500 },
    );
  }
}
