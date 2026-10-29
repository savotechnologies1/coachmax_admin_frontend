import apiClient from "./apiClient";

const ENDPOINTS = {
  CREATE_EVENT: "/api/admin/createEvent",
  GET_ALL_EVENTS: "/api/admin/getAllEvents",
  UPDATE_EVENT: "/api/admin/updateEvent",
  GET_EVENT_DETAILS: "/api/admin/getEventDetails",
  GET_EVENT_PARTICIPANTS: "/api/admin/getEventParticipants",
  EXPORT_EVENT_PARTICIPANTS: "/api/admin/exportEventParticipants",
  DELETE_EVENT: "/api/admin/deleteEvent",
};

export const getAllEvents = async () => {
  const response = await apiClient.get(ENDPOINTS.GET_ALL_EVENTS);
  return response.data;
};

export const getEventDetails = async (id: string) => {
  const response = await apiClient.get(`${ENDPOINTS.GET_EVENT_DETAILS}/${id}`);
  return response.data;
};

export const createEvent = async (data: any) => {
  // apiClient clears the JSON default for FormData so the browser can add
  // the multipart boundary required by Multer.
  const response = await apiClient.post(ENDPOINTS.CREATE_EVENT, data);
  return response.data;
};

export const updateEvent = async (id: string, data: any) => {
  const response = await apiClient.put(`${ENDPOINTS.UPDATE_EVENT}/${id}`, data);
  return response.data;
};

export const deleteEvent = async (id: string) => {
  const response = await apiClient.delete(`${ENDPOINTS.DELETE_EVENT}/${id}`);
  return response.data;
};

export const getEventParticipants = async (id: string, page: number, limit: number) => {
  const response = await apiClient.get(`${ENDPOINTS.GET_EVENT_PARTICIPANTS}/${id}`, {
    params: { page, limit }
  });
  return response.data;
};

export const removeEventRegistration = async (registrationId: string) => {
  const response = await apiClient.delete(`/api/admin/events/registrations/${registrationId}`);
  return response.data;
};

export const exportEventParticipants = async (id: string, format: "csv" | "excel") => {
  const response = await apiClient.get(`${ENDPOINTS.EXPORT_EVENT_PARTICIPANTS}/${id}`, {
    params: { format },
    responseType: 'blob'
  });
  return response.data;
};

// ================= HOLIDAY CAMP EXTENSIONS =================

export const configureCampSessions = async (eventId: string, data: { sessions: any[]; campConfig?: any }) => {
  const response = await apiClient.post(`/api/admin/events/${eventId}/sessions`, data);
  return response.data;
};

export const toggleCampDateAvailability = async (eventId: string, date: string, isAvailable: boolean) => {
  const response = await apiClient.patch(`/api/admin/events/${eventId}/toggle-date`, { date, isAvailable });
  return response.data;
};

export const updateCampDayNote = async (eventId: string, date: string, note: string) => {
  const response = await apiClient.patch(`/api/admin/events/${eventId}/day-note`, { date, note });
  return response.data;
};

export const getEventAttendanceGrid = async (eventId: string) => {
  const response = await apiClient.get(`/api/admin/events/${eventId}/attendance-grid`);
  return response.data;
};

export const markEventSingleAttendance = async (eventId: string, data: { sessionDate: string; campSessionId?: string; playerId: string; status: string; reason?: string }) => {
  const response = await apiClient.post(`/api/admin/events/${eventId}/attendance/single`, data);
  return response.data;
};

export const markEventBulkAttendance = async (eventId: string, data: { sessionDate: string; campSessionId?: string; records: { player: string; status: string }[] }) => {
  const response = await apiClient.post(`/api/admin/events/${eventId}/attendance/bulk`, data);
  return response.data;
};

export const getEventRegistrationDetails = async (registrationId: string) => {
  const response = await apiClient.get(`/api/admin/events/registrations/${registrationId}`);
  return response.data;
};

export const registerForEvent = async (data: { eventId: string; playerId?: string; selectedSessionIds?: string[]; paymentMethod?: string }) => {
  const response = await apiClient.post(`/api/user/registerForEvent`, data);
  return response.data;
};

export const updateEventRegistrationPaymentStatus = async (
  registrationId: string,
  paymentStatus: string,
  extra?: { eventId?: string; playerId?: string }
) => {
  const response = await apiClient.patch(`/api/admin/events/registrations/${registrationId}/payment-status`, {
    paymentStatus,
    ...extra,
  });
  return response.data;
};
