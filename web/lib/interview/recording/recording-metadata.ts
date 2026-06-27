export const RECORDING_BUCKET = "interview-recordings";

// 15분(최대) 면접 ≈ 282MB(2.628Mbps) → 여유 두고 500MiB
export const MAX_RECORDING_BYTES = 500 * 1024 * 1024;

export function pickRecordingExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("webm")) return "webm";
  return "webm";
}

export function buildRecordingStoragePath(sessionId: string, mimeType: string): string {
  const ext = pickRecordingExtension(mimeType);
  return `${sessionId}/recording-${Date.now()}.${ext}`;
}

export interface RecordingMetadataInput {
  storagePath: string;
  bucket: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  recordingStartedAtIso: string;
}

export interface RecordingMetadataBody {
  bucket: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  recordingStartedAt: string;
}

export function buildRecordingMetadata(input: RecordingMetadataInput): RecordingMetadataBody {
  return {
    bucket: input.bucket,
    storagePath: input.storagePath,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    durationMs: input.durationMs,
    recordingStartedAt: input.recordingStartedAtIso,
  };
}
