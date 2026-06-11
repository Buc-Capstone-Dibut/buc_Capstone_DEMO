import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

/**
 * 면접 리포트 생성 상태 — BackgroundJobsRunner polling 용 경량 프록시.
 * 포트폴리오 status 라우트와 같은 형태({status, stage, cancelReason})를 그대로 전달한다.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await getInterviewRouteUserId();
    if (!userId) {
      return unauthorizedInterviewResponse();
    }

    const response = await fetch(
      `${AI_BASE_URL}/v1/interview/sessions/${encodeURIComponent(params.id)}/report-status`,
      {
        headers: { "x-user-id": userId },
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail || "리포트 상태를 불러오지 못했습니다." },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "리포트 상태를 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
