import "./config/env";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocketGateway } from "./modules/socket/socket.gateway";
import { setupYjsGateway } from "./modules/board/yjs.gateway";
import { INTERNAL_API_SECRET } from "./config/env";
import { flushYjsRoom, resetYjsRoom } from "./modules/board/yjs-utils";

const PORT = process.env.PORT || 4000;

const httpServer = createServer((req, res) => {
    const requestUrl = new URL(req.url || "/", "http://localhost");
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
                console.error(`[YJS] Internal ${resetMatch ? "reset" : "flush"} failed`, error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Yjs operation failed" }));
            });
        return;
    }

    res.writeHead(200);
    res.end("Dibut Workspace Server is running");
});

const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for demo
        methods: ["GET", "POST"]
    }
});

// Initialize Socket Gateway
setupSocketGateway(io);

// Initialize Yjs Gateway
setupYjsGateway(httpServer);

httpServer.listen(PORT, () => {
    console.log(`🚀 Workspace Server running on port ${PORT}`);
});
