import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Supabase 인증
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // 2. body 검증
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid body" },
      { status: 400 },
    );
  }
  const { payload, options } = body as { payload: unknown; options: unknown };
  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { success: false, error: "payload required" },
      { status: 400 },
    );
  }

  // 3. FastAPI 프록시
  try {
    const upstreamRes = await fetch(`${AI_BASE_URL}/v1/resume/normalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": session.user.id,
      },
      body: JSON.stringify({ payload, options: options ?? {} }),
      // 60초 timeout (Gemini 처리 시간 고려)
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });

    const data = await upstreamRes.json().catch(() => null);
    if (!upstreamRes.ok || !data) {
      return NextResponse.json(
        {
          success: false,
          error:
            (data && (data.error || data.detail)) || "AI 가공 호출 실패",
        },
        { status: upstreamRes.status || 500 },
      );
    }
    // FastAPI 응답이 { success, data } 또는 { data } 둘 다 가능 — 통일.
    if (data.success === false) {
      return NextResponse.json(data, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      data: data.data ?? data,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? "AI 응답 대기 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."
          : error.message
        : "AI 가공 중 오류가 발생했습니다.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
