import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getInterviewRouteUserId();
    if (!userId) {
      return unauthorizedInterviewResponse();
    }

    const response = await fetch(
      `${AI_BASE_URL}/v1/interview/sessions/${encodeURIComponent(params.id)}/retry-report`,
      {
        method: "POST",
        headers: {
          "x-user-id": userId,
        },
      },
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data?.detail || "리포트 재생성 요청에 실패했습니다." },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, data: data?.data || {} }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "리포트 재생성 요청에 실패했습니다.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
