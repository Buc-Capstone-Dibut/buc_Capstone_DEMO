import { Server, Socket } from "socket.io";
import { getSocketIdentity } from "../auth/auth.service";

export const setupBoardGateway = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    // Draw update
    socket.on(
      "board:update",
      (payload: { roomId: string; elements: any[] }) => {
        const identity = getSocketIdentity(socket);
        socket.to(`board:${identity.workspaceId}`).emit("board:update", {
          elements: payload.elements,
        });
      },
    );

    socket.on("board:join", () => {
      const identity = getSocketIdentity(socket);
      void socket.join(`board:${identity.workspaceId}`);
    });
  });
};
