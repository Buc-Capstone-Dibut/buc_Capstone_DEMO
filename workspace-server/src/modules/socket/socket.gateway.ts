import { Server, Socket } from "socket.io";
import { setupChatGateway } from "../chat/chat.gateway";
// import { setupHuddleGateway } from '../huddle/huddle.gateway'; // Removed
import { setupBoardGateway } from "../board/board.gateway";
import { ChatService } from "../chat/chat.service";

interface ConnectedUser {
  socketId: string;
  userId: string;
  projectId: string;
  online: boolean;
}

// In-memory store for connected users (for demo purposes)
export const connectedUsers = new Map<string, ConnectedUser>();

export const setupSocketGateway = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle initial join/auth
    socket.on("join", async ({ userId, projectId }) => {
      const workspaceId = typeof projectId === "string" ? projectId.trim() : "";
      if (!workspaceId) {
        return;
      }

      const readOnly = await ChatService.isWorkspaceReadOnly(workspaceId);
      if (readOnly) {
        socket.emit("workspace:readonly", {
          projectId: workspaceId,
          message:
            "이 워크스페이스는 종료되어 실시간 기능이 중지되었습니다.",
        });
        socket.disconnect(true);
        return;
      }

      console.log(`User ${userId} joined project ${workspaceId}`);

      connectedUsers.set(socket.id, {
        socketId: socket.id,
        userId,
        projectId: workspaceId,
        online: true,
      });

      // Join project room
      socket.join(workspaceId);

      // Broadcast presence update
      io.to(workspaceId).emit("presence:update", {
        userId,
        status: "online",
      });
    });

    socket.on("disconnect", () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log(`User ${user.userId} disconnected`);
        io.to(user.projectId).emit("presence:update", {
          userId: user.userId,
          status: "offline",
        });
        connectedUsers.delete(socket.id);
      }
    });

    // Voice State Update Relay
    socket.on("voice:update", ({ projectId }) => {
      // Broadcast to everyone in the project (including sender, though sender usually updates self)
      // Using broadcast.to avoids sender re-fetch if desired, but io.to is safer to ensure consistency
      socket.to(projectId).emit("voice:update");
    });
  });

  // Setup functional namespaces/modules
  setupChatGateway(io);
  // setupHuddleGateway(io); // Removed
  setupBoardGateway(io);
};
