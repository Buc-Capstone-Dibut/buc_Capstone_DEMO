import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { RECORDING_BUCKET, MAX_RECORDING_BYTES } from "@/lib/interview/recording/recording-metadata";
import { getRecordingStorageMode } from "@/lib/interview/recording/storage-mode";
import { isValidRecordingPath } from "@/lib/interview/validation";
import { z } from "zod";

export const runtime = "nodejs";

const uploadUrlSchema = z.object({ storagePath: z.string() });

async function ensureBucket(admin: ReturnType<typeof createAdminSupabaseClient>) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) throw listError;
  if (buckets?.some((b) => b.name === RECORDING_BUCKET)) return;
  const { error: createError } = await admin.storage.createBucket(RECORDING_BUCKET, {
    public: false,
    fileSizeLimit: MAX_RECORDING_BYTES,
    allowedMimeTypes: ["video/webm", "video/mp4"],
  });
  // 동시 생성 레이스로 이미 존재하는 경우는 무시, 그 외 에러는 표면화.
  if (createError && !/already exists/i.test(createError.message)) throw createError;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: sessionId } = params;
  const userId = await getInterviewRouteUserId();
  if (!userId) return unauthorizedInterviewResponse();

  let body: z.infer<typeof uploadUrlSchema>;
  try {
    body = uploadUrlSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ success: false, error: "invalid JSON body" }, { status: 400 });
  }
  if (!isValidRecordingPath(sessionId, body.storagePath)) {
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

  // 로컬 개발: Storage 대신 서버 파일 저장 라우트로 업로드하도록 안내(dev 노드 서버라 body 제한 없음).
  if (getRecordingStorageMode() === "local") {
    return NextResponse.json({ success: true, data: { mode: "local" } });
  }

  try {
    await ensureBucket(admin);
  } catch (e) {
    const message = e instanceof Error ? e.message : "bucket ensure failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const { data, error } = await admin.storage
    .from(RECORDING_BUCKET)
    .createSignedUploadUrl(body.storagePath, { upsert: true });

  if (error || !data) {
    return NextResponse.json({ success: false, error: error?.message ?? "sign failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: { mode: "supabase", bucket: RECORDING_BUCKET, path: data.path, token: data.token, signedUrl: data.signedUrl },
  });
}
