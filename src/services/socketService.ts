import { io, Socket } from "socket.io-client";
import { store } from "../store";
import { clearCredentials } from "../store/slices/authSlice";
import { setConnected, setReconnecting, setSocketError } from "../store/slices/socketSlice";
import {
  appendMessage,
  updateRoomMessagesStatus,
  setPartnerTyping,
  updatePartnerOnlineStatus,
} from "../store/slices/chatSlice";
import { addAnnouncement } from "../store/slices/broadcastSlice";
import { toast } from "react-hot-toast";

let socket: Socket | null = null;
let socketToken: string | null = null;
const REVOKED_SESSION_MESSAGE = "Session expired or revoked. Please sign in again.";

export const socketService = {
  connect: (token: string) => {
    if (socket) {
      if (socket.connected && socketToken === token) return;
      socket.disconnect();
    }

    const socketUrl = (import.meta.env.VITE_API_BASE_URL as string) || window.location.origin;
    socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketToken = token;
    const connection = socket;
    const handleRevokedSession = () => {
      // A late event from an older connection must not clear a fresh sign-in.
      if (socket !== connection) return;
      socket = null;
      socketToken = null;
      connection.disconnect();
      store.dispatch(setConnected(false));
      store.dispatch(setReconnecting(false));
      const storedToken = localStorage.getItem("token");
      if (storedToken && storedToken !== token) return;
      store.dispatch(clearCredentials());
      window.location.href = "/signin";
    };

    socket.on("connect", () => {
      if (socket !== connection) return;
      store.dispatch(setConnected(true));

      const activeRoomId = store.getState().chat.activeRoomId;
      if (activeRoomId) {
        socket?.emit("join_room", { roomId: activeRoomId });
        socket?.emit("mark_read", { roomId: activeRoomId });
      }
    });

    socket.on("disconnect", () => {
      if (socket !== connection) return;
      store.dispatch(setConnected(false));
    });

    socket.on("connect_error", (error: Error & { data?: { code?: string } }) => {
      if (socket !== connection) return;
      if (error.message === REVOKED_SESSION_MESSAGE || error.data?.code === "SESSION_REVOKED") {
        handleRevokedSession();
        return;
      }
      store.dispatch(setSocketError(error.message));
    });

    socket.on("session_revoked", (data: { code?: string }) => {
      if (data?.code === "SESSION_REVOKED") handleRevokedSession();
    });

    socket.on("reconnect_attempt", () => {
      store.dispatch(setReconnecting(true));
    });

    // Event listeners
    socket.on("new_message", (data: { roomId: string; message: any }) => {
      store.dispatch(appendMessage(data.message));

      const activeRoomId = store.getState().chat.activeRoomId;
      if (data.roomId === activeRoomId) {
        socket?.emit("mark_read", { roomId: activeRoomId });
      }
    });

    socket.on("messages_read", (data: { roomId: string }) => {
      store.dispatch(
        updateRoomMessagesStatus({ roomId: data.roomId, tickStatus: "READ" })
      );
    });

    socket.on("message_delivered", (data: { roomId: string }) => {
      store.dispatch(
        updateRoomMessagesStatus({ roomId: data.roomId, tickStatus: "DELIVERED" })
      );
    });

    socket.on("user_typing", (data: { roomId: string; userName: string; isTyping: boolean }) => {
      store.dispatch(
        setPartnerTyping({
          roomId: data.roomId,
          userName: data.userName,
          isTyping: data.isTyping,
        })
      );
    });

    socket.on("user_status_change", (data: { userId: string; isOnline: boolean }) => {
      store.dispatch(
        updatePartnerOnlineStatus({
          userId: data.userId,
          isOnline: data.isOnline,
        })
      );
    });

    socket.on("new_broadcast_alert", (data: { classId: string; className: string; text: string; sender: any }) => {
      toast(`Announcement in ${data.className}:\n${data.text}`, {
        duration: 5000,
      });

      store.dispatch(
        addAnnouncement({
          _id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          classId: data.classId,
          className: data.className,
          text: data.text,
          sender: data.sender || { fullName: "Coach" },
          createdAt: new Date().toISOString(),
        })
      );
    });
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      socketToken = null;
    }
  },

  joinRoom: (roomId: string) => {
    if (socket) {
      socket.emit("join_room", { roomId });
    }
  },

  markRead: (roomId: string) => {
    if (socket) {
      socket.emit("mark_read", { roomId });
    }
  },

  sendTyping: (roomId: string, isTyping: boolean) => {
    if (socket) {
      socket.emit("typing", { roomId, isTyping });
    }
  },

  sendMessage: (roomId: string, text: string, callback?: (res: any) => void) => {
    if (socket && socket.connected) {
      socket.emit("send_message", { roomId, text }, (res: any) => {
        if (callback) callback(res);
      });
    } else {
      if (callback) callback({ success: false, message: "Socket is not connected." });
    }
  },

  isConnected: () => {
    return socket ? socket.connected : false;
  },

  getSocket: () => {
    return socket;
  },

  on: (event: string, callback: (...args: any[]) => void) => {
    socket?.on(event, callback);
  },

  off: (event: string, callback: (...args: any[]) => void) => {
    socket?.off(event, callback);
  },
};

