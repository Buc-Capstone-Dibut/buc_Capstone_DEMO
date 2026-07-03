import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { RECORDING_BUCKET } from "@/lib/interview/recording/recording-metadata";

export const runtime = "nodejs";

// upload-url 라우트와 동일한 검증: `${sessionId}/<단일 안전 파일명>`만 허용(경로 탈출 차단).
function isValidRecordingPath(sessionId: string, storagePath: string | undefined): boolean {
  if (!storagePath || !storagePath.startsWith(`${sessionId}/`)) return false;
  const remainder = storagePath.slice(sessionId.length + 1);
  return /^[\w.-]+$/.test(remainder);
}

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
  if (!userId) return unauthorizedInterviewResponse();

  const body = (await req.json()) as {
    bucket: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    durationMs: number;
    recordingStartedAt: string;
  };

  if (!isValidRecordingPath(sessionId, body.storagePath)) {
    return NextResponse.json({ success: false, error: "invalid storagePath" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  if (!(await assertSessionOwner(admin, sessionId, userId))) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
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

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: sessionId } = params;
  const userId = await getInterviewRouteUserId();
  if (!userId) return unauthorizedInterviewResponse();

  const admin = createAdminSupabaseClient();
  if (!(await assertSessionOwner(admin, sessionId, userId))) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
  }

  const { data: rec } = await admin
    .from("interview_recordings")
    .select("storage_path, bucket, duration_ms, recording_started_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!rec) return NextResponse.json({ success: true, data: null });

  // 로컬 개발 저장분(bucket='local') — next dev 정적 서빙 URL 그대로 반환.
  if (rec.bucket === "local") {
    return NextResponse.json({
      success: true,
      data: {
        url: `/${rec.storage_path}`,
        durationMs: rec.duration_ms,
        recordingStartedAt: rec.recording_started_at,
      },
    });
  }

  const { data: signed, error } = await admin.storage
    .from(rec.bucket || RECORDING_BUCKET)
    .createSignedUrl(rec.storage_path, 60 * 60);

  if (error || !signed) {
    return NextResponse.json({ success: false, error: error?.message ?? "sign failed" }, { status: 500 });
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
