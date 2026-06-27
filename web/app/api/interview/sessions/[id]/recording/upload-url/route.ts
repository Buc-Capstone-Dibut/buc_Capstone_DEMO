import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getInterviewRouteUserId } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { RECORDING_BUCKET, MAX_RECORDING_BYTES } from "@/lib/interview/recording/recording-metadata";

export const runtime = "nodejs";

async function ensureBucket(admin: ReturnType<typeof createAdminSupabaseClient>) {
  const { data: buckets } = await admin.storage.listBuckets();
  if (buckets?.some((b) => b.name === RECORDING_BUCKET)) return;
  await admin.storage.createBucket(RECORDING_BUCKET, {
    public: false,
    fileSizeLimit: MAX_RECORDING_BYTES,
    allowedMimeTypes: ["video/webm", "video/mp4"],
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: sessionId } = params;
  const userId = await getInterviewRouteUserId();
  if (!userId) return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { storagePath?: string };
  if (!body.storagePath || !body.storagePath.startsWith(`${sessionId}/`)) {
    return NextResponse.json({ success: false, message: "invalid storagePath" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  const { data: session } = await admin
    .from("interview_sessions")
    .select("user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.user_id !== userId) {
    return NextResponse.json({ success: false, message: "forbidden" }, { status: 403 });
  }

  await ensureBucket(admin);

  const { data, error } = await admin.storage
    .from(RECORDING_BUCKET)
    .createSignedUploadUrl(body.storagePath);

  if (error || !data) {
    return NextResponse.json({ success: false, message: error?.message ?? "sign failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: { bucket: RECORDING_BUCKET, path: data.path, token: data.token },
  });
}
