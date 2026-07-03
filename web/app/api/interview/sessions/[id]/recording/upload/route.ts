import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { MAX_RECORDING_BYTES } from "@/lib/interview/recording/recording-metadata";
import { getRecordingStorageMode, LOCAL_BUCKET, LOCAL_RECORDING_DIR } from "@/lib/interview/recording/storage-mode";

export const runtime = "nodejs";

// upload-url 라우트와 동일한 경로 규칙 — 세션 네임스페이스 밖 쓰기 차단.
function isValidRecordingPath(sessionId: string, storagePath: string | null): storagePath is string {
  if (!storagePath || !storagePath.startsWith(`${sessionId}/`)) return false;
  const remainder = storagePath.slice(sessionId.length + 1);
  return /^[\w.-]+$/.test(remainder);
}

/**
 * 로컬 개발 전용 녹화 업로드 — 파일을 web/public/local-recordings/{sessionId}/ 에 저장하고
 * 메타(bucket='local')까지 한 번에 기록한다. 배포(supabase 모드)에서는 사용 금지(400).
 * 재생은 next dev 정적 서빙(/local-recordings/**)이 담당(Range 지원 → seek 동작).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: sessionId } = params;

  if (getRecordingStorageMode() !== "local") {
    return NextResponse.json(
      { success: false, error: "local upload is disabled in this environment" },
      { status: 400 },
    );
  }

  const userId = await getInterviewRouteUserId();
  if (!userId) return unauthorizedInterviewResponse();

  const url = new URL(req.url);
  const storagePath = url.searchParams.get("path");
  const durationMs = Number(url.searchParams.get("durationMs") || 0);
  const recordingStartedAt = url.searchParams.get("startedAt") || new Date().toISOString();
  const mimeType = req.headers.get("content-type") || "video/webm";

  if (!isValidRecordingPath(sessionId, storagePath)) {
    return NextResponse.json({ success: false, error: "invalid storagePath" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("interview_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.user_id !== userId) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ success: false, error: "empty body" }, { status: 400 });
  }
  if (buf.length > MAX_RECORDING_BYTES) {
    return NextResponse.json({ success: false, error: "recording too large" }, { status: 413 });
  }

  const absPath = path.join(LOCAL_RECORDING_DIR, storagePath);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buf);

  const { error } = await admin.from("interview_recordings").upsert(
    {
      id: randomUUID(),
      session_id: sessionId,
      bucket: LOCAL_BUCKET,
      storage_path: `local-recordings/${storagePath}`,
      mime_type: mimeType,
      size_bytes: buf.length,
      duration_ms: Number.isFinite(durationMs) ? Math.round(durationMs) : 0,
      recording_started_at: recordingStartedAt,
    },
    { onConflict: "session_id" },
  );
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: { url: `/local-recordings/${storagePath}`, sizeBytes: buf.length } });
}
