import apiClient from "./apiClient";

export interface Coach {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
}

export interface CoachesResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  coaches: Coach[];
}

export interface TemporaryPlayerPayload {
  name: string;
  dob: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  emergencyContact: string;
  isMedicalCondition?: boolean;
  medicalConditions?: string;
  allergies?: string;
  classId: string;
  sessionDate: string;
  categories?: string[];
  programs?: string[];
  preferredTerm?: string;
  preferredClasses?: string[];
  prefferedFoot?: string;
  preferredFoot?: string;
  gender?: string;
  profileImage?: File;
}

export const getAllCoaches = async (page = 1, limit = 10): Promise<CoachesResponse> => {
  const response = await apiClient.get<CoachesResponse>("/admin/coaches", {
    params: { page, limit },
  });
  return response.data;
};

export const createCoach = async (data: any): Promise<any> => {
  const response = await apiClient.post("/admin/coaches", data);
  return response.data;
};

export const updateCoach = async (id: string, data: any): Promise<any> => {
  const response = await apiClient.put(`/admin/coaches/${id}`, data);
  return response.data;
};

export const deleteCoach = async (id: string): Promise<any> => {
  const response = await apiClient.delete(`/admin/coaches/${id}`);
  return response.data;
};

export const addTemporaryPlayer = async (data: TemporaryPlayerPayload): Promise<any> => {
  const { profileImage, ...fields } = data;
  let payload: TemporaryPlayerPayload | FormData = fields;
  if (profileImage) {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
      }
    });
    formData.append("profileImage", profileImage);
    payload = formData;
  }
  const response = await apiClient.post("/api/coach/temporary-players", payload);
  return response.data;
};

export const getCoachClasses = async (): Promise<any> => {
  const response = await apiClient.get("/api/coach/classes");
  return response.data;
};

export const getCoachGetClasses = async (): Promise<any> => {
  const response = await apiClient.get("/api/coach/getClasses");
  return response.data;
};


export const markCoachSingleAttendance = async (classId: string, data: { sessionDate: string; playerId: string; status: string; reason?: string }): Promise<any> => {
  const response = await apiClient.post(`/api/coach/attendance/${classId}/single`, data);
  return response.data;
};

export const markCoachBulkAttendance = async (classId: string, data: { sessionDate: string; records: { player: string; status: string }[] }): Promise<any> => {
  const response = await apiClient.post(`/api/coach/attendance/${classId}`, data);
  return response.data;
};

export const getCoachClassDetails = async (classId: string): Promise<any> => {
  const response = await apiClient.get(`/api/coach/classes/${classId}`);
  return response.data;
};

export const getCoachClassPlayers = async (classId: string): Promise<any> => {
  const response = await apiClient.get(`/api/coach/classes/${classId}/players`);
  return response.data;
};

export const getCoachPlayerProfile = async (playerId: string): Promise<any> => {
  const response = await apiClient.get(`/api/coach/player/${playerId}/profile`);
  return response.data;
};

export const getCoachUniquePlayers = async (page = 1, limit = 10, search?: string, program?: string, status?: string): Promise<any> => {
  const params: any = { page, limit };
  if (search) params.search = search;
  if (program && program !== "All") params.program = program;
  if (status && status !== "All") params.status = status;
  
  const response = await apiClient.get("/api/coach/unique-players", { params });
  return response.data;
};

export const getCoachTemporaryPlayers = async (page = 1, limit = 20): Promise<any> => {
  const response = await apiClient.get(`/api/coach/temporary-players?page=${page}&limit=${limit}`);
  return response.data;
};

export const addCoachNote = async (data: { playerId: string; classId?: string; noteType: string; description: string }): Promise<any> => {
  const response = await apiClient.post("/api/coach/notes", data);
  return response.data;
};

export const getCoachNotes = async (playerId: string, page = 1, limit = 20, scope?: { termId?: string; year?: string; noTerm?: boolean }): Promise<any> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (scope?.termId) params.set("termId", scope.termId);
  if (scope?.year) params.set("year", scope.year);
  if (scope?.noTerm) params.set("noTerm", "true");
  const response = await apiClient.get(`/api/coach/notes/player/${playerId}?${params.toString()}`);
  return response.data;
};

export const updateCoachNote = async (noteId: string, data: { noteType: string; description: string }): Promise<any> => {
  const response = await apiClient.put(`/api/coach/notes/${noteId}`, data);
  return response.data;
};

export const getCoachAllNotes = async (page = 1, limit = 20): Promise<any> => {
  const response = await apiClient.get(`/api/coach/notes?page=${page}&limit=${limit}`);
  return response.data;
};

export const getCoachNotifications = async (page = 1, limit = 20): Promise<any> => {
  const response = await apiClient.get(`/api/coach/notifications?page=${page}&limit=${limit}`);
  return response.data;
};

export const markCoachNotificationAsRead = async (notificationId: string): Promise<any> => {
  const response = await apiClient.put(`/api/coach/notifications/mark-read`, { id: notificationId });
  return response.data;
};


