import fixWebmDuration from "fix-webm-duration";

/**
 * MediaRecorder WebM Blob에 duration 메타데이터를 주입한다.
 * 실패하거나 webm이 아니면 원본 Blob을 반환해 업로드를 막지 않는다.
 */
export async function fixRecordingDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!blob.type.includes("webm") || durationMs <= 0) {
    return blob;
  }
  try {
    return await fixWebmDuration(blob, durationMs, { logger: false });
  } catch (err) {
    console.error("[recording] duration 보정 실패, 원본 사용:", err);
    return blob;
  }
}
