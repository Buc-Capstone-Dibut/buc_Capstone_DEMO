import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";

export async function POST(req: Request) {
  try {
    await req.json().catch(() => null);
    const userId = await getInterviewRouteUserId();
    if (!userId) {
      return unauthorizedInterviewResponse();
    }

    return NextResponse.json(
      {
        success: false,
        error: "포트폴리오 채팅 면접 모드는 비활성화되었습니다. 영상 면접을 사용해 주세요.",
      },
      { status: 410 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Portfolio chat failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
