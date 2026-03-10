import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "CHAT_ANALYSIS_DISABLED",
      message: "이 경로는 더 이상 사용되지 않습니다. 면접 결과는 세션 리포트에서 조회하세요.",
    },
    { status: 410 },
  );
}
