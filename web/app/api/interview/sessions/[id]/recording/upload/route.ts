import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { MAX_RECORDING_BYTES } from "@/lib/interview/recording/recording-metadata";
import { getRecordingStorageMode, LOCAL_RECORDING_DIR } from "@/lib/interview/recording/storage-mode";
import { isValidRecordingPath } from "@/lib/interview/validation";

export const runtime = "nodejs";

/**
 * 로컬 개발 전용 녹화 업로드 — 파일을 web/public/local-recordings/{sessionId}/ 에 저장한다.
 * 전사문과 메타데이터는 공통 recording POST가 기록한다. 배포(supabase 모드)에서는 사용 금지(400).
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

  // The metadata endpoint publishes the recording only after its transcript is stored.
  return NextResponse.json({ success: true, data: { url: `/local-recordings/${storagePath}`, sizeBytes: buf.length } });
}
