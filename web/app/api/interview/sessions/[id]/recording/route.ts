import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getInterviewRouteUserId, unauthorizedInterviewResponse } from "@/lib/interview/route-auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { RECORDING_BUCKET } from "@/lib/interview/recording/recording-metadata";
import { isAllowedRecordingBucket, isValidRecordingPath, isValidSessionId } from "@/lib/interview/validation";
import { getRecordingStorageMode } from "@/lib/interview/recording/storage-mode";
import { recordingTranscriptSchema, type RecordingTranscript } from "@/lib/interview/recording/transcript";
import { MAX_RECORDING_BYTES } from "@/lib/interview/recording/recording-metadata";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const metadataSchema = z.object({
  bucket: z.string().refine(isAllowedRecordingBucket),
  storagePath: z.string(),
  mimeType: z.string().regex(/^video\/(webm|mp4)(;.*)?$/),
  sizeBytes: z.number().int().positive().max(MAX_RECORDING_BYTES),
  durationMs: z.number().int().positive().max(24 * 60 * 60 * 1000),
  recordingStartedAt: z.string().datetime(),
  transcript: recordingTranscriptSchema.optional(),
}).refine((body) => !body.transcript || body.transcript.entries.every((e) => e.endMs === null || e.endMs <= body.durationMs));

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

  let body: z.infer<typeof metadataSchema>;
  try {
    const text = await req.text();
    if (text.length > 1_000_000) return NextResponse.json({ success: false, error: "metadata too large" }, { status: 413 });
    body = metadataSchema.parse(JSON.parse(text));
  } catch {
    return NextResponse.json({ success: false, error: "invalid JSON body" }, { status: 400 });
  }

  if (!isValidRecordingPath(sessionId, body.storagePath)) {
    return NextResponse.json({ success: false, error: "invalid storagePath" }, { status: 400 });
  }

  // 서명 URL 발급 대상이 되므로 정규 버킷/로컬 표식만 허용(임의 버킷 차단).
  if (!isAllowedRecordingBucket(body.bucket) || body.bucket === "local" && getRecordingStorageMode() !== "local") {
    return NextResponse.json({ success: false, error: "invalid bucket" }, { status: 400 });
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
      storage_path: body.bucket === "local" ? `local-recordings/${body.storagePath}` : body.storagePath,
      mime_type: body.mimeType,
      size_bytes: body.sizeBytes,
      duration_ms: body.durationMs,
      recording_started_at: body.recordingStartedAt,
      ...(body.transcript ? { transcript: body.transcript } : {}),
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
  if (!isValidSessionId(sessionId)) return NextResponse.json({ success: false, error: "invalid sessionId" }, { status: 400 });

  const admin = createAdminSupabaseClient();
  if (!(await assertSessionOwner(admin, sessionId, userId))) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
  }

  const { data: rec, error: recordingError } = await admin
    .from("interview_recordings")
    .select("storage_path, bucket, duration_ms, recording_started_at, transcript")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (recordingError) return NextResponse.json({ success: false, error: "recording lookup failed" }, { status: 500 });
  if (!rec) return NextResponse.json({ success: true, data: null });

  const parsed = recordingTranscriptSchema.safeParse(rec.transcript);
  let transcript: RecordingTranscript | null = parsed.success ? parsed.data : null;
  if (transcript) {
    // Render's final/refined transcript remains the source of truth for text.
    const { data: turns } = await admin.from("interview_turns").select("role, content, payload").eq("session_id", sessionId);
    const textByTurn = new Map((turns ?? []).map((turn) => [
      `${turn.role === "user" ? "user" : "ai"}:${turn.payload?.turn_id ?? ""}`, turn.content,
    ]));
    transcript = { ...transcript, entries: transcript.entries.map((entry) => ({
      ...entry, text: textByTurn.get(`${entry.role}:${entry.turnId}`) || entry.text,
    })) };
  }

  // 로컬 개발 저장분(bucket='local') — next dev 정적 서빙 URL 그대로 반환.
  if (rec.bucket === "local") {
    return NextResponse.json({
      success: true,
      data: {
        url: `/${rec.storage_path}`,
        storagePath: rec.storage_path,
        durationMs: rec.duration_ms,
        recordingStartedAt: rec.recording_started_at,
        transcript,
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
      storagePath: rec.storage_path,
      durationMs: rec.duration_ms,
      recordingStartedAt: rec.recording_started_at,
      transcript,
      expiresAt: Date.now() + 55 * 60 * 1000,
    },
  });
}
