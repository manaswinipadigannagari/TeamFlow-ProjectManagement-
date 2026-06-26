import { create } from "zustand";
import { io, Socket } from "socket.io-client";

interface PresenceState {
  socket: Socket | null;
  presenceUserIds: string[];
  connectSocket: (userId: string) => void;
  disconnectSocket: () => void;
  joinProjectRoom: (projectId: string, userId: string) => void;
  leaveProjectRoom: (projectId: string, userId: string) => void;
  setPresenceUserIds: (presenceUserIds: string[]) => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  socket: null,
  presenceUserIds: [],

  connectSocket: (userId) => {
    // If socket is already connected, do not re-establish
    if (get().socket?.connected) return;

    // Connect to specified socket server or default same origin
    const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
    const socket = io(socketUrl, {
      autoConnect: true,
      withCredentials: true,
    });

    socket.on("connect", () => {
      // Authenticate socket channel
      socket.emit("auth:init", userId);
    });

    socket.on("presence:update", (userIds: string[]) => {
      set({ presenceUserIds: userIds });
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, presenceUserIds: [] });
    }
  },

  joinProjectRoom: (projectId, userId) => {
    const { socket } = get();
    if (socket) {
      socket.emit("project:join", { projectId, userId });
    }
  },

  leaveProjectRoom: (projectId, userId) => {
    const { socket } = get();
    if (socket) {
      socket.emit("project:leave", { projectId, userId });
      set({ presenceUserIds: [] });
    }
  },

  setPresenceUserIds: (presenceUserIds) => set({ presenceUserIds }),
}));
