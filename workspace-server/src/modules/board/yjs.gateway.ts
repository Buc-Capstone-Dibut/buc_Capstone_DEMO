import { IncomingMessage, Server } from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection, extractDocNameFromRequestUrl } from "./yjs-utils";
import { verifyWorkspaceDocCollabToken } from "./workspace-doc-collab-token";

function rejectUpgrade(socket: any, statusCode: number, message: string) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`,
  );
  socket.destroy();
}

function authorizeYjsUpgrade(request: IncomingMessage) {
  const requestUrl = request.url || "";
  const url = new URL(requestUrl, `http://${request.headers.host || "localhost"}`);
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
    return { ok: false as const, roomName, statusCode: 401, message: "Missing token" };
  }

  const payload = verifyWorkspaceDocCollabToken(token);
  const targetId = isDocRoom
    ? roomName.slice("doc:".length)
    : roomName.slice("whiteboard:".length);
  const matchesTarget = isDocRoom
    ? payload?.docId === targetId
    : payload?.whiteboardId === targetId && payload.workspaceId === targetId;

  if (!payload || !matchesTarget) {
    return { ok: false as const, roomName, statusCode: 401, message: "Invalid token" };
  }

  return { ok: true as const, roomName, userId: payload.userId };
}

export function setupYjsGateway(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, req) => {
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

    const authCheck = authorizeYjsUpgrade(request);
    if (!authCheck.ok) {
      console.warn(`[YJS] Rejected upgrade for ${authCheck.roomName}: ${authCheck.message}`);
      rejectUpgrade(socket, authCheck.statusCode, authCheck.message);
      return;
    }

    console.log(`[YJS] Upgrade request for ${url}`);

    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log(`[YJS] Connection upgraded for ${url}`);
      wss.emit("connection", ws, request);
    });
  });

  console.log("BOARD: Yjs WebSocket Gateway initialized");
  return wss;
}
