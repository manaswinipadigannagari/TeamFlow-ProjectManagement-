import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import logger from "../utils/logger";

let io: Server | null = null;

// Map of userId -> Set of socketIds (handling multiple tabs)
const activeUsers = new Map<string, Set<string>>();

// Map of projectRoom -> Set of userIds (live presence)
const projectPresence = new Map<string, Set<string>>();

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.on("connection", (socket: Socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Join user personal channel for direct notifications
    socket.on("auth:init", (userId: string) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
      logger.debug(`Socket ${socket.id} joined personal room user:${userId}`);

      // Track active sockets per user
      if (!activeUsers.has(userId)) {
        activeUsers.set(userId, new Set());
      }
      activeUsers.get(userId)!.add(socket.id);
    });

    // Join project specific room
    socket.on("project:join", ({ projectId, userId }: { projectId: string; userId: string }) => {
      if (!projectId || !userId) return;
      const room = `project:${projectId}`;
      socket.join(room);
      logger.debug(`User ${userId} joined room ${room}`);

      // Track presence
      if (!projectPresence.has(room)) {
        projectPresence.set(room, new Set());
      }
      projectPresence.get(room)!.add(userId);

      // Broadcast updated presence to room
      emitToRoom(room, "presence:update", Array.from(projectPresence.get(room)!));
    });

    // Leave project specific room
    socket.on("project:leave", ({ projectId, userId }: { projectId: string; userId: string }) => {
      if (!projectId || !userId) return;
      const room = `project:${projectId}`;
      socket.leave(room);
      logger.debug(`User ${userId} left room ${room}`);

      // Untrack presence
      if (projectPresence.has(room)) {
        projectPresence.get(room)!.delete(userId);
        if (projectPresence.get(room)!.size === 0) {
          projectPresence.delete(room);
        }
      }

      // Broadcast updated presence to room
      emitToRoom(
        room,
        "presence:update",
        projectPresence.has(room) ? Array.from(projectPresence.get(room)!) : []
      );
    });

    socket.on("disconnect", () => {
      logger.debug(`Socket disconnected: ${socket.id}`);

      // Remove socket from user tracking
      let disconnectedUser: string | null = null;
      for (const [userId, sockets] of activeUsers.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            activeUsers.delete(userId);
            disconnectedUser = userId;
          }
          break;
        }
      }

      // If a user completely disconnected all tabs, remove them from any presence they had
      if (disconnectedUser) {
        for (const [room, userIds] of projectPresence.entries()) {
          if (userIds.has(disconnectedUser)) {
            userIds.delete(disconnectedUser);
            if (userIds.size === 0) {
              projectPresence.delete(room);
            }
            emitToRoom(
              room,
              "presence:update",
              projectPresence.has(room) ? Array.from(projectPresence.get(room)!) : []
            );
          }
        }
      }
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
};

export const emitToRoom = (room: string, event: string, data: unknown): void => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};
