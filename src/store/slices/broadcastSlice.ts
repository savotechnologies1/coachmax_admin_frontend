import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Announcement {
  _id: string;
  classId: string;
  className?: string;
  text: string;
  sender: {
    fullName?: string;
    name?: string;
    profileImage?: string;
  };
  createdAt: string;
}

export interface BroadcastClass {
  classId: string;
  className: string;
  coachName?: string;
}

interface BroadcastState {
  broadcastRooms: BroadcastClass[];
  activeClassId: string | null;
  announcements: Announcement[];
  loading: boolean;
  publishing: boolean;
  error: string | null;
}

const initialState: BroadcastState = {
  broadcastRooms: [],
  activeClassId: null,
  announcements: [],
  loading: false,
  publishing: false,
  error: null,
};

const broadcastSlice = createSlice({
  name: "broadcast",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setPublishing: (state, action: PayloadAction<boolean>) => {
      state.publishing = action.payload;
    },
    setBroadcastRooms: (state, action: PayloadAction<BroadcastClass[]>) => {
      state.broadcastRooms = action.payload;
    },
    setActiveClassId: (state, action: PayloadAction<string | null>) => {
      state.activeClassId = action.payload;
    },
    setAnnouncements: (state, action: PayloadAction<Announcement[]>) => {
      state.announcements = action.payload;
    },
    addAnnouncement: (state, action: PayloadAction<Announcement>) => {
      // Add announcement at the beginning of the feed if it matches current active class filter
      if (!state.activeClassId || state.activeClassId === action.payload.classId) {
        if (!state.announcements.some(a => a._id === action.payload._id)) {
          state.announcements.unshift(action.payload);
        }
      }
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setLoading,
  setPublishing,
  setBroadcastRooms,
  setActiveClassId,
  setAnnouncements,
  addAnnouncement,
  setError,
} = broadcastSlice.actions;

export default broadcastSlice.reducer;
