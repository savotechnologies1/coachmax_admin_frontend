import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Message {
  _id: string;
  roomId: string;
  text: string;
  sender: {
    user: string | { _id: string; name?: string; fullName?: string; profileImage?: string };
    refModel: "Parent" | "Admin";
  };
  tickStatus: "SENT" | "DELIVERED" | "READ";
  createdAt: string;
  attachments?: { url: string; fileType: string; fileName?: string }[];
  isPending?: boolean;
  isFailed?: boolean;
}

export interface RoomMember {
  user: {
    _id: string;
    name?: string;
    fullName?: string;
    email?: string;
    profileImage?: string;
  };
  refModel?: "Parent" | "Admin";
  model?: "Parent" | "Admin";
  role?: string;
}

export interface ChatRoom {
  _id: string;
  type: "DIRECT" | "GROUP" | "BROADCAST";
  name?: string;
  /** Optional scope metadata returned by enriched chat-room endpoints. */
  scopeType?: "DIRECT" | "CLASS" | "TEAM" | "EVENT_DAY" | string;
  scopeLabel?: string;
  scope?: string;
  audience?: string;
  audienceType?: "DIRECT" | "PARENTS" | "STAFF" | "TEAM";
  recipientCount?: number;
  entityStatus?: string;
  classId?: string | { _id?: string; name?: string };
  termId?: string | { _id?: string; name?: string; year?: number | string; status?: string };
  programId?: string | { _id?: string; name?: string; ageGroup?: string };
  leagueId?: string | { _id?: string; name?: string; season?: string };
  teamId?: string | { _id?: string; name?: string; teamName?: string };
  eventId?: string | { _id?: string; title?: string; name?: string };
  eventSessionDate?: string;
  campSessionId?: string;
  eventSessionType?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED" | string;
  coach?: { _id?: string; name?: string; fullName?: string; profileImage?: string };
  context?: {
    className?: string;
    teamName?: string;
    leagueName?: string;
    eventTitle?: string;
    programName?: string;
    categoryName?: string;
    termName?: string;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    parentCount?: number;
    playerCount?: number;
  };
  subtitle?: string;
  participantCount?: number;
  onlineCount?: number;
  isActive?: boolean;
  lastMessage?: {
    text?: string;
    createdAt?: string;
    timestamp?: string;
    attachments?: any[];
  };
  members?: RoomMember[];
  unreadCount: number;
  isPartnerOnline?: boolean;
}

interface ChatState {
  rooms: ChatRoom[];
  filteredRooms: ChatRoom[];
  activeRoomId: string | null;
  messages: Message[];
  loadingRooms: boolean;
  loadingMessages: boolean;
  searchTerm: string;
  typingStatus: Record<string, { userName: string; isTyping: boolean }>;
  error: string | null;
}

const initialState: ChatState = {
  rooms: [],
  filteredRooms: [],
  activeRoomId: null,
  messages: [],
  loadingRooms: false,
  loadingMessages: false,
  searchTerm: "",
  typingStatus: {},
  error: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setLoadingRooms: (state, action: PayloadAction<boolean>) => {
      state.loadingRooms = action.payload;
    },
    setLoadingMessages: (state, action: PayloadAction<boolean>) => {
      state.loadingMessages = action.payload;
    },
    setRooms: (state, action: PayloadAction<ChatRoom[]>) => {
      state.rooms = action.payload;
      state.filteredRooms = action.payload.filter((room) => {
        const name = room.name || room.members?.map(m => m.user?.fullName || m.user?.name || "").join(" ") || "";
        return name.toLowerCase().includes(state.searchTerm.toLowerCase());
      });
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      state.filteredRooms = state.rooms.filter((room) => {
        const name = room.name || room.members?.map(m => m.user?.fullName || m.user?.name || "").join(" ") || "";
        return name.toLowerCase().includes(action.payload.toLowerCase());
      });
    },
    setActiveRoomId: (state, action: PayloadAction<string | null>) => {
      state.activeRoomId = action.payload;
      if (action.payload) {
        // Reset unread count locally when entering a room
        const room = state.rooms.find(r => r._id === action.payload);
        if (room) {
          room.unreadCount = 0;
        }
        const filteredRoom = state.filteredRooms.find(r => r._id === action.payload);
        if (filteredRoom) {
          filteredRoom.unreadCount = 0;
        }
      }
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    appendMessage: (state, action: PayloadAction<Message>) => {
      // Avoid duplicates
      if (state.messages.some((m) => m._id === action.payload._id)) {
        return;
      }
      state.messages.push(action.payload);

      // Move room to top and update last message
      const roomIndex = state.rooms.findIndex((r) => r._id === action.payload.roomId);
      if (roomIndex !== -1) {
        const room = state.rooms[roomIndex];
        room.lastMessage = {
          text: action.payload.text,
          createdAt: action.payload.createdAt,
          attachments: action.payload.attachments,
        };
        if (state.activeRoomId !== action.payload.roomId) {
          room.unreadCount += 1;
        }
        // Reposition room to top
        state.rooms.splice(roomIndex, 1);
        state.rooms.unshift(room);
      }
      // Sync filtered rooms
      state.filteredRooms = state.rooms.filter((room) => {
        const name = room.name || room.members?.map(m => m.user?.fullName || m.user?.name || "").join(" ") || "";
        return name.toLowerCase().includes(state.searchTerm.toLowerCase());
      });
    },
    updateMessageStatus: (
      state,
      action: PayloadAction<{ messageId: string; tickStatus: "SENT" | "DELIVERED" | "READ" }>
    ) => {
      const msg = state.messages.find((m) => m._id === action.payload.messageId);
      if (msg) {
        msg.tickStatus = action.payload.tickStatus;
      }
    },
    updateRoomMessagesStatus: (
      state,
      action: PayloadAction<{ roomId: string; tickStatus: "DELIVERED" | "READ" }>
    ) => {
      if (state.activeRoomId === action.payload.roomId) {
        state.messages = state.messages.map((m) => {
          if (m.tickStatus !== "READ") {
            return { ...m, tickStatus: action.payload.tickStatus };
          }
          return m;
        });
      }
    },
    setPartnerTyping: (
      state,
      action: PayloadAction<{ roomId: string; userName: string; isTyping: boolean }>
    ) => {
      const { roomId, userName, isTyping } = action.payload;
      if (isTyping) {
        state.typingStatus[roomId] = { userName, isTyping };
      } else {
        delete state.typingStatus[roomId];
      }
    },
    updatePartnerOnlineStatus: (
      state,
      action: PayloadAction<{ userId: string; isOnline: boolean }>
    ) => {
      const { userId, isOnline } = action.payload;
      state.rooms = state.rooms.map((room) => {
        const hasPartner = room.members?.some(
          (m) => m.user?._id === userId
        );
        if (hasPartner) {
          return { ...room, isPartnerOnline: isOnline };
        }
        return room;
      });
      state.filteredRooms = state.filteredRooms.map((room) => {
        const hasPartner = room.members?.some(
          (m) => m.user?._id === userId
        );
        if (hasPartner) {
          return { ...room, isPartnerOnline: isOnline };
        }
        return room;
      });
    },
    addPendingMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    markPendingMessageFailed: (state, action: PayloadAction<string>) => {
      const msg = state.messages.find((m) => m._id === action.payload);
      if (msg) {
        msg.isPending = false;
        msg.isFailed = true;
      }
    },
    removePendingMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter((m) => m._id !== action.payload);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setLoadingRooms,
  setLoadingMessages,
  setRooms,
  setSearchTerm,
  setActiveRoomId,
  setMessages,
  appendMessage,
  updateMessageStatus,
  updateRoomMessagesStatus,
  setPartnerTyping,
  updatePartnerOnlineStatus,
  addPendingMessage,
  markPendingMessageFailed,
  removePendingMessage,
  setError,
} = chatSlice.actions;

export default chatSlice.reducer;
