import { IncomingMessage, Server } from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection, extractDocNameFromRequestUrl } from "./yjs-utils";
import { verifyWorkspaceDocCollabToken } from "./workspace-doc-collab-token";
import { isAllowedOrigin } from "../../config/env";

const MAX_YJS_PAYLOAD_BYTES = 8 * 1024 * 1024;
const HEARTBEAT_INTERVAL_MS = 30_000;

function rejectUpgrade(socket: any, statusCode: number, message: string) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`,
  );
  socket.destroy();
}

function authorizeYjsUpgrade(request: IncomingMessage) {
  const requestUrl = request.url || "";
  const url = new URL(
    requestUrl,
    `http://${request.headers.host || "localhost"}`,
  );
  const roomName = extractDocNameFromRequestUrl(requestUrl);

  const isDocRoom = roomName.startsWith("doc:");
  const isWhiteboardRoom = roomName.startsWith("whiteboard:");
  if (!isDocRoom && !isWhiteboardRoom) {
    return {
      ok: false as const,
      roomName,
      statusCode: 404,
      message: "Unknown collaboration room",
    };
  }

  const token = url.searchParams.get("token");
  if (!token) {
    return {
      ok: false as const,
      roomName,
      statusCode: 401,
      message: "Missing token",
    };
  }

  const payload = verifyWorkspaceDocCollabToken(token);
  const targetId = isDocRoom
    ? roomName.slice("doc:".length)
    : roomName.slice("whiteboard:".length);
  const matchesTarget = isDocRoom
    ? payload?.docId === targetId
    : payload?.whiteboardId === targetId && payload.workspaceId === targetId;

  if (!payload || !matchesTarget) {
    return {
      ok: false as const,
      roomName,
      statusCode: 401,
      message: "Invalid token",
    };
  }

  return { ok: true as const, roomName, userId: payload.userId };
}

export function setupYjsGateway(server: Server) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_YJS_PAYLOAD_BYTES,
  });

  wss.on("connection", (ws, req) => {
    (ws as typeof ws & { isAlive?: boolean }).isAlive = true;
    ws.on("pong", () => {
      (ws as typeof ws & { isAlive?: boolean }).isAlive = true;
    });
    void setupWSConnection(ws, req).catch((error) => {
      console.error("[YJS] Failed to initialize connection", error);
      ws.close(1011, "Failed to load document");
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const url = request.url || "";
    if (url.startsWith("/socket.io")) {
      return;
    }
    if (!isAllowedOrigin(request.headers.origin)) {
      rejectUpgrade(socket, 403, "Origin is not allowed");
      return;
    }

    const authCheck = authorizeYjsUpgrade(request);
    if (!authCheck.ok) {
      console.warn(
        `[YJS] Rejected upgrade for ${authCheck.roomName}: ${authCheck.message}`,
      );
      rejectUpgrade(socket, authCheck.statusCode, authCheck.message);
      return;
    }

    console.log(`[YJS] Upgrade request for ${authCheck.roomName}`);

    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log(`[YJS] Connection upgraded for ${authCheck.roomName}`);
      wss.emit("connection", ws, request);
    });
  });

  const heartbeatTimer = setInterval(() => {
    wss.clients.forEach((client) => {
      const tracked = client as typeof client & { isAlive?: boolean };
      if (tracked.isAlive === false) {
        client.terminate();
        return;
      }
      tracked.isAlive = false;
      client.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref();
  wss.once("close", () => clearInterval(heartbeatTimer));

  console.log("BOARD: Yjs WebSocket Gateway initialized");
  return wss;
}
