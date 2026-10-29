import apiClient from "../api/apiClient";

export const isCoachOrAdmin = (): boolean => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return false;
  try {
    const user = JSON.parse(userStr);
    return ["COACH", "SUPER_ADMIN", "ADMIN"].includes(user.role);
  } catch {
    return false;
  }
};

export interface SendClassBroadcastPayload {
  text: string;
  classId?: string;
  term?: string;
  category?: string;
  program?: string;
  day?: string;
  dayOfWeek?: string;
}

export interface SendEventDayBroadcastPayload {
  sessionDate: string;
  campSessionId?: string;
  text: string;
}

export interface PreviewEventDayBroadcastPayload {
  sessionDate: string;
  campSessionId?: string;
}

export const chatApi = {
  getRooms: async () => {
    const url = isCoachOrAdmin() ? "/api/coach/chat/rooms" : "/api/user/chat/rooms";
    const response = await apiClient.get(url);
    return response.data;
  },

  getRoomMessages: async (roomId: string) => {
    const url = isCoachOrAdmin()
      ? `/api/coach/chat/room/${roomId}/messages`
      : `/api/user/chat/room/${roomId}/messages`;
    const response = await apiClient.get(url);
    return response.data;
  },

  createRoom: async (targetUserId: string, targetModel = "Admin") => {
    if (isCoachOrAdmin()) {
      // Coach starts direct chat with parent
      const response = await apiClient.post("/api/coach/chat/direct", { parentId: targetUserId });
      return response.data;
    } else {
      // Parent starts chat with Coach/Admin
      const response = await apiClient.post("/api/user/chat/room", {
        targetUserId,
        targetModel, // "Admin" or "Coach" etc.
      });
      return response.data;
    }
  },

  openDirectChat: async (parentId: string, context: { classId?: string; teamId?: string; leagueId?: string; termId?: string; programId?: string } = {}) => {
    const response = await apiClient.post("/api/coach/chat/direct", { parentId, ...context });
    return response.data;
  },

  openClassChat: async (classId: string) => {
    const response = await apiClient.post(`/api/coach/chat/class/${classId}/open`);
    return response.data;
  },

  openTeamChat: async (teamId: string) => {
    const response = await apiClient.post(`/api/coach/chat/team/${teamId}/open`);
    return response.data;
  },

  openEventDayChat: async (eventId: string, payload: PreviewEventDayBroadcastPayload) => {
    const response = await apiClient.post(`/api/coach/chat/event-day/${eventId}/open`, payload);
    return response.data;
  },

  sendMessage: async (
    roomId: string,
    text: string,
    file?: File | null,
    fileType?: "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | null
  ) => {
    const formData = new FormData();
    formData.append("roomId", roomId);
    formData.append("text", text);
    if (file) {
      formData.append("file", file);
    }
    if (fileType) {
      formData.append("fileType", fileType);
    }

    const headers = {
      "Content-Type": "multipart/form-data",
    };

    if (isCoachOrAdmin()) {
      const response = await apiClient.post("/api/coach/chat/message", formData, { headers });
      return response.data;
    } else {
      const response = await apiClient.post("/api/user/chat/message/send", formData, { headers });
      return response.data;
    }
  },

  getClasses: async () => {
    const url = isCoachOrAdmin() ? "/api/coach/classes" : "/api/user/classes";
    const response = await apiClient.get(url);
    return response.data;
  },

  getClassParents: async (classId: string) => {
    if (!isCoachOrAdmin()) {
      throw new Error("Only coaches or admins can fetch class parents.");
    }
    const response = await apiClient.get(`/api/coach/chat/class/${classId}/parents`);
    return response.data;
  },

  // Send Class Broadcast supporting specific class URL or body filters (term, category, program, day/dayOfWeek)
  sendClassBroadcast: async (payload: SendClassBroadcastPayload, classIdInUrl?: string) => {
    const targetClassId = classIdInUrl || payload.classId;
    if (targetClassId && targetClassId !== "filter") {
      // 1. Send to a Single Specific Class: POST /api/coach/chat/broadcast/:classId
      const response = await apiClient.post(`/api/coach/chat/broadcast/${targetClassId}`, {
        text: payload.text,
      });
      return response.data;
    } else {
      // 2. Send to Multiple Classes via Filters: POST /api/coach/chat/broadcast/filter
      const filterBody: any = {
        text: payload.text,
      };
      if (payload.term) filterBody.term = payload.term;
      if (payload.category) filterBody.category = payload.category;
      if (payload.program) filterBody.program = payload.program;
      if (payload.day || payload.dayOfWeek) {
        filterBody.day = payload.day || payload.dayOfWeek;
      }

      const response = await apiClient.post(`/api/coach/chat/broadcast/filter`, filterBody);
      return response.data;
    }
  },

  broadcastToClass: async (classId: string, text: string) => {
    const response = await apiClient.post(`/api/coach/chat/broadcast/${classId}`, { text });
    return response.data;
  },

  /** Broadcast only to parents registered for the selected event calendar day. */
  broadcastToEventDay: async (eventId: string, payload: SendEventDayBroadcastPayload) => {
    const response = await apiClient.post(`/api/coach/chat/event-day/${eventId}`, payload);
    return response.data;
  },

  previewEventDayBroadcast: async (eventId: string, payload: PreviewEventDayBroadcastPayload) => {
    const response = await apiClient.get(`/api/coach/chat/event-day/${eventId}/preview`, { params: payload });
    return response.data;
  },

  /** Broadcast only to parents of players assigned to the selected team. */
  broadcastToTeam: async (teamId: string, text: string) => {
    const response = await apiClient.post(`/api/coach/chat/team/${teamId}`, { text });
    return response.data;
  },

  /** Open the term-scoped parent conversation for a league. */
  openLeagueChat: async (leagueId: string) => {
    const response = await apiClient.post(`/api/coach/chat/league/${leagueId}/open`);
    return response.data;
  },
};
