import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface User {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string; // COACH, PARENT, SUPER_ADMIN, ADMIN
}

interface AuthState {
  token: string | null;
  user: User | null;
}

const getInitialState = (): AuthState => {
  const token = localStorage.getItem("token") || null;
  const userStr = localStorage.getItem("user");
  let user = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
    }
  }
  return { token, user };
};

const initialState: AuthState = getInitialState();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; user: User }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
    },
    clearCredentials: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    syncAuth: (state) => {
      const fresh = getInitialState();
      state.token = fresh.token;
      state.user = fresh.user;
    },
  },
});

export const { setCredentials, clearCredentials, syncAuth } = authSlice.actions;
export default authSlice.reducer;
