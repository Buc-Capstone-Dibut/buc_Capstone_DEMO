import "./config/env";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocketGateway } from "./modules/socket/socket.gateway";
import { setupYjsGateway } from "./modules/board/yjs.gateway";
import { INTERNAL_API_SECRET, isAllowedOrigin } from "./config/env";
import {
  beginYjsShutdown,
  flushAllYjsRooms,
  flushYjsRoom,
  resetYjsRoom,
} from "./modules/board/yjs-utils";

const PORT = process.env.PORT || 4000;

const httpServer = createServer((req, res) => {
  const requestUrl = new URL(req.url || "/", "http://localhost");
  if (req.method === "GET" && requestUrl.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "debut-workspace-server" }));
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        service: "Debut Workspace Server",
        status: "running",
      }),
    );
    return;
  }

  const resetMatch = requestUrl.pathname.match(
    /^\/internal\/yjs\/docs\/([0-9a-f-]+)\/reset$/i,
  );
  const flushMatch = requestUrl.pathname.match(
    /^\/internal\/yjs\/docs\/([0-9a-f-]+)\/flush$/i,
  );

  const isInternalAction = resetMatch || flushMatch;
  if (req.method === "POST" && isInternalAction) {
    const secret = req.headers["x-internal-secret"];
    if (!INTERNAL_API_SECRET || secret !== INTERNAL_API_SECRET) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const docId = (resetMatch || flushMatch)?.[1];
    const roomName = `doc:${docId}`;

    const handler = resetMatch ? resetYjsRoom : flushYjsRoom;

    void handler(roomName)
      .then((result) => {
        if (!result.ok) {
          res.writeHead(result.status, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: result.error }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      })
      .catch((error) => {
        console.error(
          `[YJS] Internal ${resetMatch ? "reset" : "flush"} failed`,
          error,
        );
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Yjs operation failed" }));
      });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed"));
    },
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1_000_000,
});

// Initialize Socket Gateway
setupSocketGateway(io);

// Initialize Yjs Gateway
const yjsGateway = setupYjsGateway(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Workspace Server running on port ${PORT}`);
});

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[SERVER] ${signal} received - flushing collaboration state`);
  const forceExitTimer = setTimeout(() => {
    console.error("[SERVER] Graceful shutdown timed out");
    process.exit(1);
  }, 25_000);
  forceExitTimer.unref();

  // 새 연결과 추가 변경을 먼저 차단한 다음 room별 직렬 저장 큐를 비운다.
  beginYjsShutdown();
  httpServer.close();
  yjsGateway.clients.forEach((client) => client.terminate());
  io.close();

  try {
    const result = await flushAllYjsRooms();
    console.log(`[SERVER] Flushed ${result.flushedRooms} Yjs rooms`);
  } catch (error) {
    process.exitCode = 1;
    console.error("[SERVER] Failed to flush all Yjs rooms", error);
  }

  await new Promise<void>((resolve) => {
    yjsGateway.close(() => resolve());
  });

  clearTimeout(forceExitTimer);
  process.exit(process.exitCode ?? 0);
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
