import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getInterviewRouteUserId } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { RECORDING_BUCKET } from "@/lib/interview/recording/recording-metadata";

export const runtime = "nodejs";

async function assertSessionOwner(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const { data: session } = await admin
    .from("interview_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .maybeSingle();
  return !!session && session.user_id === userId;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: sessionId } = params;
  const userId = await getInterviewRouteUserId();
  if (!userId) return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    bucket: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    durationMs: number;
    recordingStartedAt: string;
  };

  const admin = createAdminSupabaseClient();
  if (!(await assertSessionOwner(admin, sessionId, userId))) {
    return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("interview_recordings").upsert(
    {
      id: randomUUID(),
      session_id: sessionId,
      bucket: body.bucket,
      storage_path: body.storagePath,
      mime_type: body.mimeType,
      size_bytes: body.sizeBytes,
      duration_ms: body.durationMs,
      recording_started_at: body.recordingStartedAt,
    },
    { onConflict: "session_id" },
  );

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: sessionId } = params;
  const userId = await getInterviewRouteUserId();
  if (!userId) return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  if (!(await assertSessionOwner(admin, sessionId, userId))) {
    return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 });
  }

  const { data: rec } = await admin
    .from("interview_recordings")
    .select("storage_path, bucket, duration_ms, recording_started_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!rec) return NextResponse.json({ success: true, data: null });

  const { data: signed, error } = await admin.storage
    .from(rec.bucket || RECORDING_BUCKET)
    .createSignedUrl(rec.storage_path, 60 * 60);

  if (error || !signed) {
    return NextResponse.json({ success: false, message: error?.message ?? "sign failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      url: signed.signedUrl,
      durationMs: rec.duration_ms,
      recordingStartedAt: rec.recording_started_at,
    },
  });
}
