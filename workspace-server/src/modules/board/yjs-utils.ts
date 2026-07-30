import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { WebSocket } from "ws";
import { BFF_URL, INTERNAL_API_SECRET } from "../../config/env";

const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2; // eslint-disable-line
const wsReadyStateClosed = 3; // eslint-disable-line

const docs = new Map<string, WSSharedDoc>();

const messageSync = 0;
const messageAwareness = 1;
const persistenceRetryDelayMs = 5_000;

const docLoadPromises = new Map<string, Promise<WSSharedDoc>>();
let isYjsShuttingDown = false;

type RoomTarget =
  | { kind: "doc"; id: string }
  | { kind: "whiteboard"; id: string }
  | { kind: "unknown"; raw: string };

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseRoomTarget(roomName: string): RoomTarget {
  if (roomName.startsWith("doc:")) {
    const id = roomName.slice(4);
    return isUuidLike(id)
      ? { kind: "doc", id }
      : { kind: "unknown", raw: roomName };
  }

  if (roomName.startsWith("whiteboard:")) {
    const id = roomName.slice("whiteboard:".length);
    return isUuidLike(id)
      ? { kind: "whiteboard", id }
      : { kind: "unknown", raw: roomName };
  }

  return { kind: "unknown", raw: roomName };
}

export function extractDocNameFromRequestUrl(requestUrl?: string | null) {
  if (!requestUrl) return "";

  const url = new URL(requestUrl, "http://localhost");
  const pathname = url.pathname.startsWith("/")
    ? url.pathname.slice(1)
    : url.pathname;

  return decodeURIComponent(pathname);
}

function getPersistenceUrl(target: RoomTarget) {
  switch (target.kind) {
    case "doc":
      return `${BFF_URL}/api/collab/docs/${target.id}/state`;
    case "whiteboard":
      return `${BFF_URL}/api/workspaces/${target.id}/whiteboard`;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────
// Persistence (workspace-server ↔ Next.js BFF)
// ─────────────────────────────────────────────

/**
 * DB에 저장된 Yjs 상태를 불러와 doc에 적용한다.
 * - 새 doc이 생성될 때 (첫 접속) 비동기로 호출
 * - applyUpdate() 호출 → doc.on("update") → 이미 연결된 클라이언트에 자동 브로드캐스트
 */
const loadDocState = async (doc: WSSharedDoc): Promise<void> => {
  const target = parseRoomTarget(doc.name);
  const url = getPersistenceUrl(target);
  if (!url) {
    console.warn(`[YJS] '${doc.name}' 알 수 없는 room prefix - 로드 생략`);
    return;
  }

  if (!INTERNAL_API_SECRET) {
    throw new Error("INTERNAL_API_SECRET is required to load Yjs state.");
  }

  try {
    const res = await fetch(url, {
      headers: { "x-internal-secret": INTERNAL_API_SECRET },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const { yjs_state } = (await res.json()) as { yjs_state: string | null };
    if (!yjs_state) return;

    const state = Buffer.from(yjs_state, "base64");
    Y.applyUpdate(doc, state);
    console.log(`[YJS] '${doc.name}' 상태 로드 완료 (${state.length} bytes)`);
  } catch (err) {
    console.error(`[YJS] '${doc.name}' 로드 오류:`, err);
    throw err;
  }
};

/**
 * 현재 Yjs 상태를 DB에 저장한다.
 * - debounce (변경 후 3초), 마지막 유저 퇴장 시, 30초 주기 저장에서 호출
 */
const saveDocState = async (doc: WSSharedDoc): Promise<void> => {
  const target = parseRoomTarget(doc.name);
  const url = getPersistenceUrl(target);
  if (!url) {
    console.warn(`[YJS] '${doc.name}' 알 수 없는 room prefix - 저장 생략`);
    return;
  }

  if (!INTERNAL_API_SECRET) {
    throw new Error("INTERNAL_API_SECRET is required to save Yjs state.");
  }

  try {
    const state = Y.encodeStateAsUpdate(doc);
    const yjs_state = Buffer.from(state).toString("base64");

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify({ yjs_state }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    console.log(`[YJS] '${doc.name}' 저장 완료 (${state.length} bytes)`);
  } catch (err) {
    console.error(`[YJS] '${doc.name}' 저장 오류:`, err);
    throw err;
  }
};

// ─────────────────────────────────────────────
// WSSharedDoc
// ─────────────────────────────────────────────

class WSSharedDoc extends Y.Doc {
  name: string;
  conns: Map<WebSocket, Set<number>>;
  awareness: awarenessProtocol.Awareness;
  isHydrating: boolean;

  /** debounce 저장용 타이머 */
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** 30초 주기 저장 타이머 */
  private periodicTimer: ReturnType<typeof setInterval> | null = null;
  /** 접속자 0명 상태에서 저장 실패 시 재시도하는 타이머 */
  private disposeRetryTimer: ReturnType<typeof setTimeout> | null = null;
  /** 동일 room의 DB 저장 순서를 보장하는 직렬 큐 */
  private persistenceQueue: Promise<void> = Promise.resolve();
  /** 저장할 변경과 마지막 저장 완료 지점을 구분하는 단조 증가 버전 */
  private changeVersion = 0;
  private persistedVersion = 0;

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.isHydrating = false;
    this.awareness.setLocalState(null);

    // Awareness 변경 → 모든 클라이언트에 브로드캐스트
    const awarenessChangeHandler = (
      { added, updated, removed }: any,
      origin: any,
    ) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => { send(this, c, buff); });
    };
    this.awareness.on("update", awarenessChangeHandler);

    // Doc 변경 → 다른 클라이언트에 브로드캐스트 + debounce 저장 예약
    this.on("update", (update: Uint8Array, origin: any) => {
      if (this.isHydrating) {
        return;
      }

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const buff = encoding.toUint8Array(encoder);

      let broadcastCount = 0;
      this.conns.forEach((_, c) => {
        if (origin !== c) {
          send(this, c, buff);
          broadcastCount++;
        }
      });
      console.log(
        `[YJS] '${this.name}' 변경됨. ${broadcastCount}/${this.conns.size} 피어에 브로드캐스트`,
      );

      this.changeVersion += 1;
      // 변경 감지 → 3초 후 자동 저장 (debounce)
      this.scheduleSave();
    });

    // 30초마다 주기 저장 (접속 유저가 있을 때만)
    this.periodicTimer = setInterval(() => {
      if (this.conns.size > 0) {
        console.log(`[YJS] '${this.name}' 주기 저장 실행`);
        void this.persist().catch((error) => {
          console.error(`[YJS] '${this.name}' 주기 저장 실패:`, error);
        });
      }
    }, 30_000);
  }

  /**
   * room 단위 저장 직렬 큐.
   * 느린 이전 요청이 새 상태를 뒤늦게 덮어쓰는 것을 막고 실패를 호출자까지 전달한다.
   */
  persist(force = false) {
    const targetVersion = this.changeVersion;
    const operation = this.persistenceQueue.then(async () => {
      if (!force && targetVersion <= this.persistedVersion) {
        return;
      }

      await saveDocState(this);
      this.persistedVersion = Math.max(this.persistedVersion, targetVersion);
    });

    // 실패한 요청이 뒤의 재시도까지 영구적으로 막지 않도록 큐 꼬리는 복구한다.
    this.persistenceQueue = operation.catch(() => undefined);
    return operation;
  }

  async flushPersistence() {
    this.cancelScheduledSave();
    await this.persist(true);
  }

  /** 마지막 변경 후 3초가 지나면 저장 (중간에 변경이 오면 리셋) */
  scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.persist().catch((error) => {
        console.error(`[YJS] '${this.name}' 자동 저장 실패:`, error);
      });
    }, 3_000);
  }

  /** 예약된 debounce 저장 취소 (all-left 저장 전 호출) */
  cancelScheduledSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  cancelDisposeRetry() {
    if (this.disposeRetryTimer) {
      clearTimeout(this.disposeRetryTimer);
      this.disposeRetryTimer = null;
    }
  }

  scheduleDisposeRetry(callback: () => void) {
    this.cancelDisposeRetry();
    this.disposeRetryTimer = setTimeout(() => {
      this.disposeRetryTimer = null;
      callback();
    }, persistenceRetryDelayMs);
  }

  /** 모든 타이머 정리 */
  cleanup() {
    this.cancelScheduledSave();
    this.cancelDisposeRetry();
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }
}

// ─────────────────────────────────────────────
// 내부 유틸리티
// ─────────────────────────────────────────────

const getYDocAsync = async (docname: string, gc = true): Promise<WSSharedDoc> => {
  const existingDoc = docs.get(docname);
  if (existingDoc) {
    return existingDoc;
  }

  const existingPromise = docLoadPromises.get(docname);
  if (existingPromise) {
    return existingPromise;
  }

  const loadPromise = (async () => {
    const doc = new WSSharedDoc(docname);
    doc.gc = gc;
    docs.set(docname, doc);

    try {
      doc.isHydrating = true;
      await loadDocState(doc);
      return doc;
    } catch (error) {
      doc.cleanup();
      docs.delete(docname);
      doc.destroy();
      throw error;
    } finally {
      doc.isHydrating = false;
      docLoadPromises.delete(docname);
    }
  })();

  docLoadPromises.set(docname, loadPromise);
  return loadPromise;
};

const send = (doc: WSSharedDoc, conn: WebSocket, m: Uint8Array) => {
  if (conn.readyState !== wsReadyStateOpen) {
    closeConn(doc, conn);
  }
  try {
    conn.send(m, (err: any) => {
      if (err != null) closeConn(doc, conn);
    });
  } catch (e) {
    closeConn(doc, conn);
  }
};

const persistAndDisposeWhenIdle = async (doc: WSSharedDoc) => {
  if (doc.conns.size > 0 || docs.get(doc.name) !== doc) {
    return;
  }

  try {
    await doc.flushPersistence();
    if (
      !isYjsShuttingDown &&
      doc.conns.size === 0 &&
      docs.get(doc.name) === doc
    ) {
      doc.cleanup();
      docs.delete(doc.name);
      doc.destroy();
      console.log(`[YJS] '${doc.name}' 저장 후 메모리에서 해제`);
    }
  } catch (error) {
    console.error(
      `[YJS] '${doc.name}' 마지막 상태 저장 실패 - ${persistenceRetryDelayMs}ms 후 재시도:`,
      error,
    );
    if (
      !isYjsShuttingDown &&
      doc.conns.size === 0 &&
      docs.get(doc.name) === doc
    ) {
      doc.scheduleDisposeRetry(() => {
        void persistAndDisposeWhenIdle(doc);
      });
    }
  }
};

const closeConn = (doc: WSSharedDoc, conn: WebSocket) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    if (controlledIds) {
      awarenessProtocol.removeAwarenessStates(
        doc.awareness,
        Array.from(controlledIds),
        null,
      );
    }

    // 마지막 유저가 나갔을 때 → 즉시 저장 후 메모리 해제
    if (doc.conns.size === 0) {
      doc.cancelScheduledSave(); // debounce 취소 (즉시 저장이 대신함)
      console.log(`[YJS] '${doc.name}' 마지막 유저 퇴장 → 즉시 저장`);
      void persistAndDisposeWhenIdle(doc);
    }
  }
  if (
    conn.readyState !== wsReadyStateClosing &&
    conn.readyState !== wsReadyStateClosed
  ) {
    conn.close();
  }
};

export const resetYjsRoom = async (roomName: string) => {
  const pendingLoad = docLoadPromises.get(roomName);
  if (pendingLoad) {
    await pendingLoad.catch(() => undefined);
  }

  const doc = docs.get(roomName);
  if (!doc) {
    return { ok: true as const, existed: false };
  }

  if (doc.conns.size > 0) {
    return {
      ok: false as const,
      status: 409,
      error: "Document room is still active.",
    };
  }

  // 지연 중이거나 직전 실패 후 재시도 대기 중인 상태까지 DB에 확정한 뒤 제거한다.
  await doc.flushPersistence();
  doc.cleanup();
  docs.delete(roomName);
  docLoadPromises.delete(roomName);
  doc.destroy();

  return { ok: true as const, existed: true };
};

export const flushYjsRoom = async (roomName: string) => {
  const pendingLoad = docLoadPromises.get(roomName);
  if (pendingLoad) {
    await pendingLoad.catch(() => undefined);
  }

  const doc = docs.get(roomName);
  if (!doc) {
    return { ok: true as const, existed: false };
  }

  doc.cancelScheduledSave();
  await doc.flushPersistence();

  return {
    ok: true as const,
    existed: true,
    activeConnections: doc.conns.size,
  };
};

export const flushAllYjsRooms = async () => {
  const pendingLoads = Array.from(docLoadPromises.values());
  await Promise.all(pendingLoads);

  const rooms = Array.from(docs.values());
  const results = await Promise.allSettled(
    rooms.map((doc) => doc.flushPersistence()),
  );
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (failures.length > 0) {
    throw new Error(
      `Failed to persist ${failures.length}/${rooms.length} Yjs rooms before shutdown.`,
    );
  }

  return { ok: true as const, flushedRooms: rooms.length };
};

export const beginYjsShutdown = () => {
  isYjsShuttingDown = true;
  docs.forEach((doc) => {
    doc.cancelScheduledSave();
    doc.cancelDisposeRetry();
  });
};

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

export const setupWSConnection = async (
  conn: WebSocket,
  req: any,
  { docName = extractDocNameFromRequestUrl(req.url), gc = true }: any = {},
) => {
  console.log(`[YJS] 연결 설정: doc='${docName}'`);
  conn.binaryType = "arraybuffer";
  const doc = await getYDocAsync(docName, gc);

  if (conn.readyState === wsReadyStateClosed || conn.readyState === wsReadyStateClosing) {
    return;
  }

  doc.cancelDisposeRetry();
  doc.conns.set(conn, new Set());

  conn.on("message", (message: ArrayBuffer) => {
    try {
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
          if (encoding.length(encoder) > 1) {
            send(doc, conn, encoding.toUint8Array(encoder));
          }
          break;
        case messageAwareness: {
          const awarenessUpdate = decoding.readVarUint8Array(decoder);
          const awarenessDecoder = decoding.createDecoder(awarenessUpdate);
          const controlledIds = doc.conns.get(conn);
          const updateCount = decoding.readVarUint(awarenessDecoder);

          for (let index = 0; index < updateCount; index += 1) {
            const clientId = decoding.readVarUint(awarenessDecoder);
            decoding.readVarUint(awarenessDecoder);
            decoding.readVarString(awarenessDecoder);
            controlledIds?.add(clientId);
          }

          awarenessProtocol.applyAwarenessUpdate(
            doc.awareness,
            awarenessUpdate,
            conn,
          );
          break;
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  conn.on("close", () => {
    console.log(`[YJS] 연결 종료: doc='${docName}'`);
    closeConn(doc, conn);
  });

  // Sync Step 1: 서버 상태 벡터 전송 → 클라이언트가 없는 업데이트를 요청
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys()),
        ),
      );
      send(doc, conn, encoding.toUint8Array(encoder));
    }
  }
};
