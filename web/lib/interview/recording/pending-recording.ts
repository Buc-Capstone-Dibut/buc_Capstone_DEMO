import type { RecordingTranscript } from "./transcript";

export interface PendingRecording {
  sessionId: string;
  blob: Blob;
  storagePath: string;
  mimeType: string;
  durationMs: number;
  startedAt: string;
  transcript: RecordingTranscript;
}

const memory = new Map<string, PendingRecording>();

async function pendingStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open("interview-recording-recovery", 1);
    open.onupgradeneeded = () =>
      open.result.createObjectStore("recordings", { keyPath: "sessionId" });
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("recordings", mode);
      const request = operation(tx.objectStore("recordings"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function savePendingRecording(
  recording: PendingRecording,
): Promise<boolean> {
  memory.set(recording.sessionId, recording);
  try {
    await pendingStore("readwrite", (store) => store.put(recording));
    return true;
  } catch {
    return false; // In-memory retry still works when browser storage is full or unavailable.
  }
}

export async function getPendingRecording(
  sessionId: string,
): Promise<PendingRecording | null> {
  if (memory.has(sessionId)) return memory.get(sessionId)!;
  try {
    return (
      (await pendingStore("readonly", (store) => store.get(sessionId))) ?? null
    );
  } catch {
    return null;
  }
}

export async function clearPendingRecording(sessionId: string) {
  memory.delete(sessionId);
  await pendingStore("readwrite", (store) => store.delete(sessionId)).catch(
    () => undefined,
  );
}
