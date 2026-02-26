import "./config/env";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocketGateway } from "./modules/socket/socket.gateway";
import { setupYjsGateway } from "./modules/board/yjs.gateway";

const PORT = process.env.PORT || 4000;

const httpServer = createServer((req, res) => {
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
