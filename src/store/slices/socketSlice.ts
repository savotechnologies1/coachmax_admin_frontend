import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SocketState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
}

const initialState: SocketState = {
  connected: false,
  reconnecting: false,
  error: null,
};

const socketSlice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
      if (action.payload) {
        state.reconnecting = false;
        state.error = null;
      }
    },
    setReconnecting: (state, action: PayloadAction<boolean>) => {
      state.reconnecting = action.payload;
    },
    setSocketError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setConnected, setReconnecting, setSocketError } = socketSlice.actions;
export default socketSlice.reducer;
