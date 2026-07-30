import { Server, Socket } from "socket.io";
import { setupChatGateway } from "../chat/chat.gateway";
// import { setupHuddleGateway } from '../huddle/huddle.gateway'; // Removed
import { setupBoardGateway } from "../board/board.gateway";
import { AuthService, getSocketIdentity } from "../auth/auth.service";

interface ConnectedUser {
  socketId: string;
  userId: string;
  projectId: string;
  online: boolean;
}

// In-memory store for connected users (for demo purposes)
export const connectedUsers = new Map<string, ConnectedUser>();
const EVENT_WINDOW_MS = 10_000;
const MAX_EVENTS_PER_WINDOW = 120;

export const setupSocketGateway = (io: Server) => {
  io.use((socket, next) => {
    void AuthService.authenticateSocket(socket)
      .then((identity) => {
        if (!identity) {
          next(new Error("워크스페이스 접근 권한을 확인할 수 없습니다."));
          return;
        }
        socket.data.identity = identity;
        next();
      })
      .catch((error) => {
        console.error("[AUTH] Socket authentication failed", error);
        next(new Error("실시간 연결 인증에 실패했습니다."));
      });
  });

  io.on("connection", (socket: Socket) => {
    const identity = getSocketIdentity(socket);
    console.log(
      `[SOCKET] Connected ${socket.id} to workspace ${identity.workspaceId}`,
    );

    connectedUsers.set(socket.id, {
      socketId: socket.id,
      userId: identity.userId,
      projectId: identity.workspaceId,
      online: true,
    });
    void socket.join(identity.workspaceId);
    io.to(identity.workspaceId).emit("presence:update", {
      userId: identity.userId,
      status: "online",
    });

    let eventWindowStartedAt = Date.now();
    let eventCount = 0;
    socket.use((_event, next) => {
      const now = Date.now();
      if (now - eventWindowStartedAt >= EVENT_WINDOW_MS) {
        eventWindowStartedAt = now;
        eventCount = 0;
      }
      eventCount += 1;
      if (eventCount > MAX_EVENTS_PER_WINDOW) {
        next(
          new Error("실시간 요청이 너무 많습니다. 잠시 후 다시 시도해주세요."),
        );
        return;
      }
      next();
    });

    socket.on("disconnect", () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log(`User ${user.userId} disconnected`);
        connectedUsers.delete(socket.id);
        const hasAnotherConnection = Array.from(connectedUsers.values()).some(
          (candidate) =>
            candidate.userId === user.userId &&
            candidate.projectId === user.projectId,
        );
        if (!hasAnotherConnection) {
          io.to(user.projectId).emit("presence:update", {
            userId: user.userId,
            status: "offline",
          });
        }
      }
    });

    // Voice State Update Relay
    socket.on("voice:update", () => {
      socket.to(identity.workspaceId).emit("voice:update");
    });
  });

  // Setup functional namespaces/modules
  setupChatGateway(io);
  // setupHuddleGateway(io); // Removed
  setupBoardGateway(io);
};
