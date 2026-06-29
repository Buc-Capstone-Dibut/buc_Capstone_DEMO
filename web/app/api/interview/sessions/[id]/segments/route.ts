import "server-only";
import { NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * 리포트 네비게이션(답변 구간)용 turns + 오프셋 기준점(anchor) 조회.
 * 소유권(user_id) 일치 확인으로 IDOR 방지. anchor = recording_started_at ?? session.started_at.
 * 페어링/오프셋 계산은 클라이언트의 순수 유틸이 담당한다.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const sessionId = params.id;
  const userId = await getInterviewRouteUserId();
  if (!userId) {
    return unauthorizedInterviewResponse();
  }

  const admin = createAdminSupabaseClient();

  const { data: session } = await admin
    .from("interview_sessions")
    .select("user_id, started_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.user_id !== userId) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
  }

  const { data: rec } = await admin
    .from("interview_recordings")
    .select("recording_started_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  const anchorIso: string | null = rec?.recording_started_at ?? session.started_at ?? null;

  const { data: turns, error } = await admin
    .from("interview_turns")
    .select("id, role, content, turn_index, exchange_index, created_at")
    .eq("session_id", sessionId)
    .order("turn_index", { ascending: true });
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      anchorIso,
      turns: (turns ?? []).map((t) => ({
        id: t.id,
        role: t.role,
        content: t.content,
        exchangeIndex: t.exchange_index ?? 0,
        turnIndex: t.turn_index,
        createdAt: t.created_at,
      })),
    },
  });
}
