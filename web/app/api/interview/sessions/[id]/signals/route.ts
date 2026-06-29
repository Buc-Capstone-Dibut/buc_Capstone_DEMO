import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getInterviewRouteUserId } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_SAMPLES = 20000;

async function assertSessionOwner(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("interview_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .maybeSingle();
  return !!data && data.user_id === userId;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: sessionId } = params;
  const userId = await getInterviewRouteUserId();
  if (!userId) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as {
    sampleRateHz?: number;
    samples?: unknown[];
    baseline?: unknown;
    aggregates?: unknown;
  };
  if (!Array.isArray(body.samples)) {
    return NextResponse.json({ success: false, error: "invalid samples" }, { status: 400 });
  }
  if (body.samples.length > MAX_SAMPLES) {
    return NextResponse.json({ success: false, error: "samples too large" }, { status: 413 });
  }

  const admin = createAdminSupabaseClient();
  if (!(await assertSessionOwner(admin, sessionId, userId))) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("interview_recording_signals").upsert(
    {
      id: randomUUID(),
      session_id: sessionId,
      sample_rate_hz: body.sampleRateHz ?? 5,
      samples: body.samples,
      baseline: body.baseline ?? {},
      aggregates: body.aggregates ?? {},
    },
    { onConflict: "session_id" },
  );
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
