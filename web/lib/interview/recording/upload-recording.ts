import { buildRecordingMetadata, RECORDING_BUCKET } from "./recording-metadata";
import {
  clearPendingRecording,
  type PendingRecording,
} from "./pending-recording";

export async function recordingRequest(url: string, init?: RequestInit) {
  const timeout = AbortSignal.timeout(20_000);
  const response = await fetch(url, {
    ...init,
    signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new Error(
      response.status === 401
        ? "로그인이 만료되었습니다. 다시 로그인해 주세요."
        : "영상을 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  }
  return json.data;
}

function uploadBlob(
  url: string,
  method: string,
  blob: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, url);
    request.timeout = 180_000;
    request.setRequestHeader("Content-Type", contentType.split(";")[0]);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress?.(Math.round((event.loaded / event.total) * 95));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error("영상 업로드에 실패했습니다. 다시 시도해 주세요."));
    request.onerror = () =>
      reject(new Error("네트워크 연결을 확인한 후 다시 시도해 주세요."));
    request.ontimeout = () =>
      reject(
        new Error("영상 업로드 시간이 초과되었습니다. 다시 시도해 주세요."),
      );
    request.onabort = () => reject(new Error("영상 업로드가 중단되었습니다."));
    request.send(blob);
  });
}

const uploads = new Map<string, Promise<void>>();

export function uploadRecording(
  recording: PendingRecording,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const existing = uploads.get(recording.sessionId);
  if (existing) return existing;
  const upload = (async () => {
    const base = `/api/interview/sessions/${encodeURIComponent(recording.sessionId)}/recording`;
    const signed = await recordingRequest(`${base}/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath: recording.storagePath }),
    });
    const local = signed.mode === "local";
    const url = local
      ? `${base}/upload?${new URLSearchParams({ path: recording.storagePath })}`
      : signed.signedUrl;
    await uploadBlob(
      url,
      local ? "POST" : "PUT",
      recording.blob,
      recording.mimeType,
      onProgress,
    );
    await recordingRequest(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildRecordingMetadata({
          bucket: local ? "local" : RECORDING_BUCKET,
          storagePath: recording.storagePath,
          mimeType: recording.mimeType,
          sizeBytes: recording.blob.size,
          durationMs: recording.durationMs,
          recordingStartedAtIso: recording.startedAt,
        }),
        transcript: recording.transcript,
      }),
    });
    await clearPendingRecording(recording.sessionId);
    onProgress?.(100);
  })().finally(() => uploads.delete(recording.sessionId));
  uploads.set(recording.sessionId, upload);
  return upload;
}
