import apiClient from "./apiClient";

export const ENDPOINTS = {
  CREATE_PROGRAM: "/api/admin/createProgram",
  GET_ALL_PROGRAMS: "/api/admin/getAllPrograms",
  UPDATE_PROGRAM: "/api/admin/updateProgram",
  DELETE_PROGRAM: "/api/admin/deleteProgram",
  GET_PROGRAMS_BY_CATEGORY: "/api/user/getProgramsByCategory",
  GET_ALL_COACHES: "/api/admin/getAllCoaches",
  CREATE_COACH: "/api/admin/createCoach",
  UPDATE_COACH: "/api/admin/updateCoach",
  DELETE_COACH: "/api/admin/deleteCoach",
  TOGGLE_COACH_ACTIVE: "/api/admin/toggleCoachActive",
  GET_COACH_BY_ID: "/api/admin/getCoachById",
  GET_COACH_DETAIL: "/api/admin/coaches",
  CHANGE_COACH_PASSWORD: "/api/admin/changeCoachPassword",
  UPDATE_ADMIN_NOTE: "/api/admin/updateAdminNote",
  EXPORT_CLASS_CSV: "/api/admin/exportClassCSV",
  GET_ALL_CLASSES_FOR_ASSIGN: "/api/admin/getAllClassesForAssign",
  ASSIGN_CLASS: "/api/admin/assignClass",
  GET_CLASS_FILTERS_WITH_TIME_SLOTS: "/api/admin/getClassFiltersWithTimeSlots",
  GET_CLASS_FULL_TABLE: "/api/admin/getClassFullTable",
  MARK_SINGLE_ATTENDANCE: "/api/admin/markSingleAttendance",
  MARK_ATTENDANCE: "/api/admin/markAttendance",
  GET_ALL_CATEGORIES: "/api/user/getCategories",
  CREATE_CATEGORY: "/api/admin/createCategory",
  UPDATE_CATEGORY: "/api/admin/updateCategory",
  DELETE_CATEGORY: "/api/admin/deleteCategory",
  GET_REGISTRATION_REQUESTS: "/api/admin/registration-requests?status=PENDING",
  GET_ALL_TERMS: "/api/admin/getAllTerms", // fallback; use getTermsUrl() for role-based routing
  CREATE_TERM: "/api/admin/createTerm",
  UPDATE_TERM: "/api/admin/updateTerm",
  DELETE_TERM: "/api/admin/deleteTerm",
  CREATE_NEWS: "/api/admin/news",
  ASSIGN_CLASSES_TO_PLAYER: "/api/admin/player/:playerId/assign-classes",
  TEAMS: "/api/admin/getAllTeams",
  FIXTURES: "/api/admin/fixtures",
  GET_ALL_LEAGUES: "/api/admin/leagues",
  LEAGUES: "/api/admin/leagues",
  GET_NOTIFICATIONS: "/api/admin/notifications",
  READ_ALL_NOTIFICATIONS: "/api/admin/notifications/read-all",
  GET_DASHBOARD: "/api/admin/dashboard",
};

// ================= PROGRAMS =================

export const getAllPrograms = async (): Promise<any> => {
  const res = await apiClient.get(ENDPOINTS.GET_ALL_PROGRAMS);
  return res.data;
};

export const getProgramsByCategory = async (categoryId: string): Promise<any> => {
  const res = await apiClient.get(`${ENDPOINTS.GET_PROGRAMS_BY_CATEGORY}/${categoryId}`);
  return res.data;
};

export const createProgram = async (data: any): Promise<any> => {
  const res = await apiClient.post(ENDPOINTS.CREATE_PROGRAM, data);
  return res.data;
};

export const updateProgram = async (id: string, data: any): Promise<any> => {
  const res = await apiClient.put(`${ENDPOINTS.UPDATE_PROGRAM}/${id}`, data);
  return res.data;
};

export const deleteProgram = async (id: string): Promise<any> => {
  const res = await apiClient.delete(`${ENDPOINTS.DELETE_PROGRAM}/${id}`);
  return res.data;
};

// ================= COACHES =================

export const getAllCoaches = async (options?: { page?: number; limit?: number }): Promise<any> => {
  const res = await apiClient.get(ENDPOINTS.GET_ALL_COACHES, options ? { params: options } : undefined);
  return res.data;
};

export const createCoach = async (data: any): Promise<any> => {
  const headers = data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined;
  const res = await apiClient.post(ENDPOINTS.CREATE_COACH, data, { headers });
  return res.data;
};

export const updateCoach = async (id: string, data: any): Promise<any> => {
  const headers = data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined;
  const res = await apiClient.put(`${ENDPOINTS.UPDATE_COACH}/${id}`, data, { headers });
  return res.data;
};

export const deleteCoach = async (id: string): Promise<any> => {
  const res = await apiClient.delete(`${ENDPOINTS.DELETE_COACH}/${id}`);
  return res.data;
};

export const toggleCoachActive = async (id: string, isActive: boolean): Promise<any> => {
  const res = await apiClient.put(`${ENDPOINTS.TOGGLE_COACH_ACTIVE}/${id}`, { isActive });
  return res.data;
};

export const getCoachById = async (id: string): Promise<any> => {
  const res = await apiClient.get(`${ENDPOINTS.GET_COACH_BY_ID}/${id}`);
  return res.data;
};

export const getCoachDetail = async (id: string): Promise<any> => {
  const res = await apiClient.get(`${ENDPOINTS.GET_COACH_DETAIL}/${id}/detail`);
  return res.data;
};

export const changeCoachPassword = async (id: string, data: any): Promise<any> => {
  const res = await apiClient.put(`${ENDPOINTS.CHANGE_COACH_PASSWORD}/${id}`, data);
  return res.data;
};

// ================= CATEGORIES =================

export const getAllCategories = async (): Promise<any> => {
  const res = await apiClient.get(ENDPOINTS.GET_ALL_CATEGORIES, { params: { isEvent: "all" } });
  return res.data;
};

export const createCategory = async (data: any): Promise<any> => {
  const res = await apiClient.post(ENDPOINTS.CREATE_CATEGORY, data);
  return res.data;
};

export const updateCategory = async (id: string, data: any): Promise<any> => {
  const res = await apiClient.put(`${ENDPOINTS.UPDATE_CATEGORY}/${id}`, data);
  return res.data;
};

export const deleteCategory = async (id: string): Promise<any> => {
  const res = await apiClient.delete(`${ENDPOINTS.DELETE_CATEGORY}/${id}`);
  return res.data;
};

// ================= TERMS =================

/** Returns the correct getAllTerms endpoint based on the logged-in user's role. */
export const getTermsUrl = (): string => {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (["COACH", "PARENT", "USER"].includes(String(user?.role || "").toUpperCase())) {
        return "/api/user/getAllTerms";
      }
    }
  } catch { }
  return "/api/admin/getAllTerms";
};

export const getAllTerms = async (year?: number, isEvent?: "all" | "true" | "false"): Promise<any> => {
  const params: Record<string, any> = {};
  if (year) params.year = year;
  if (isEvent !== undefined) params.isEvent = isEvent;
  const res = await apiClient.get(getTermsUrl(), { params });
  return res.data;
};

const ensureSlashDate = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const str = String(value).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return str;
};

export const createTerm = async (data: any): Promise<any> => {
  const payload = { ...data };
  if (payload.startDate) payload.startDate = ensureSlashDate(payload.startDate);
  if (payload.endDate) payload.endDate = ensureSlashDate(payload.endDate);
  const res = await apiClient.post(ENDPOINTS.CREATE_TERM, payload);
  return res.data;
};

export const updateTerm = async (id: string, data: any): Promise<any> => {
  const payload = { ...data };
  if (payload.startDate) payload.startDate = ensureSlashDate(payload.startDate);
  if (payload.endDate) payload.endDate = ensureSlashDate(payload.endDate);
  const res = await apiClient.put(`${ENDPOINTS.UPDATE_TERM}/${id}`, payload);
  return res.data;
};

export const deleteTerm = async (id: string): Promise<any> => {
  const res = await apiClient.delete(`${ENDPOINTS.DELETE_TERM}/${id}`);
  return res.data;
};

// ================= CLASSES =================

export const getAllClassesForAssign = async (categoryId: string, programId: string): Promise<any> => {
  const res = await apiClient.get(`${ENDPOINTS.GET_ALL_CLASSES_FOR_ASSIGN}?category=${categoryId}&program=${programId}`);
  return res.data;
};

export const assignClass = async (playerId: string, data: any): Promise<any> => {
  const res = await apiClient.post(`${ENDPOINTS.ASSIGN_CLASS}/${playerId}`, data);
  return res.data;
};

export const getClassFiltersWithTimeSlots = async (categoryId: string, programId: string, day: string, termId?: string): Promise<any> => {
  let url = `${ENDPOINTS.GET_CLASS_FILTERS_WITH_TIME_SLOTS}?categoryId=${categoryId}&programId=${programId}&day=${day}`;
  if (termId) {
    url += `&termId=${termId}`;
  }
  const res = await apiClient.get(url);
  return res.data;
};

export const getAllClasses = async (params: { page?: number; limit?: number; categoryId?: string; programId?: string; termId?: string; day?: string; search?: string }): Promise<any> => {
  const res = await apiClient.get("/api/admin/getAllClasses", { params });
  return res.data;
};

export const getClassFullTable = async (classId: string): Promise<any> => {
  const res = await apiClient.get(`${ENDPOINTS.GET_CLASS_FULL_TABLE}?classId=${classId}`);
  return res.data;
};

export const markSingleAttendance = async (classId: string, data: { sessionDate: string; playerId: string; status: string; reason?: string }): Promise<any> => {
  const res = await apiClient.post(`${ENDPOINTS.MARK_SINGLE_ATTENDANCE}/${classId}`, data);
  return res.data;
};

export const markBulkAttendance = async (classId: string, data: { sessionDate: string; records: { player: string; status: string }[] }): Promise<any> => {
  const res = await apiClient.post(`${ENDPOINTS.MARK_ATTENDANCE}/${classId}`, data);
  return res.data;
};

export const getClassPlayers = async (classId: string): Promise<any> => {
  const res = await apiClient.get(`/api/admin/getClassPlayers/${classId}`);
  return res.data;
};

// ================= TEAM ATTENDANCE & FULL TABLE =================

export const getTeamFullTable = async (teamId: string, leagueId?: string): Promise<any> => {
  // Prevent backend CastError for mock data (like "t1")
  if (!teamId || !/^[0-9a-fA-F]{24}$/.test(teamId)) {
    return { success: true, data: { sessions: [], players: [] } };
  }

  let isAdmin = false;
  try {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user?.role);
  } catch { }
  const endpoint = isAdmin ? "/api/admin/getTeamFullTable" : "/api/user/getTeamFullTable";
  let url = `${endpoint}?teamId=${teamId}`;
  if (leagueId) {
    url += `&leagueId=${leagueId}`;
  }
  const res = await apiClient.get(url);
  return res.data;
};

export const markSingleTeamAttendance = async (teamId: string, data: { sessionDate: string; playerId: string; status: string; leagueId?: string; reason?: string }): Promise<any> => {
  let isAdmin = false;
  try {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user?.role);
  } catch { }
  const endpoint = isAdmin ? `/api/admin/markSingleTeamAttendance/${teamId}` : `/api/user/markSingleTeamAttendance/${teamId}`;
  const res = await apiClient.post(endpoint, data);
  return res.data;
};

export const markTeamAttendance = async (teamId: string, data: { sessionDate: string; records: { player: string; status: string }[]; leagueId?: string }): Promise<any> => {
  let isAdmin = false;
  try {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user?.role);
  } catch { }
  const endpoint = isAdmin ? `/api/admin/markTeamAttendance/${teamId}` : `/api/user/markTeamAttendance/${teamId}`;
  const res = await apiClient.post(endpoint, data);
  return res.data;
};

// ================= NEWS =================

export const getAllNews = async (): Promise<any> => {
  let isAdmin = false;
  try {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user?.role);
  } catch { }
  const endpoint = isAdmin ? "/api/admin/news" : "/api/user/news";
  const res = await apiClient.get(endpoint);
  return res.data;
};

export const getNewsById = async (id: string): Promise<any> => {
  const res = await apiClient.get(`/api/user/news/${id}`);
  return res.data;
};

export const getNewsCategories = async (): Promise<any> => {
  const res = await apiClient.get('/api/admin/news/categories');
  return res.data;
};

export const createNews = async (data: any): Promise<any> => {
  const res = await apiClient.post(ENDPOINTS.CREATE_NEWS, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};
export const updateNews = async (id: string, data: any): Promise<any> => {
  const res = await apiClient.put(`${ENDPOINTS.CREATE_NEWS}/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};

export const deleteNews = async (id: string): Promise<any> => {
  const res = await apiClient.delete(`${ENDPOINTS.CREATE_NEWS}/${id}`);
  return res.data;
};

// ================= TEAMS =================

export const getAllTeams = async (termId?: string, options?: { page?: number; limit?: number; search?: string }): Promise<any> => {
  const params = { ...(termId ? { termId } : {}), page: options?.page || 1, limit: options?.limit || 100, search: options?.search || "" };
  const res = await apiClient.get(ENDPOINTS.TEAMS, { params });
  if (options) return res.data;
  const combined = [...(res.data?.data || [])];
  const pages = res.data?.pagination?.totalPages || 1;
  for (let page = 2; page <= pages; page++) {
    const next = await apiClient.get(ENDPOINTS.TEAMS, { params: { ...params, page } });
    combined.push(...(next.data?.data || []));
  }
  return { ...res.data, data: combined };
};

export const createTeam = async (data: any): Promise<any> => {
  const res = await apiClient.post("/api/admin/teams", data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};

export const updateTeam = async (id: string, data: any): Promise<any> => {
  const res = await apiClient.put(`/api/admin/teams/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};

export const getTeamById = async (id: string): Promise<any> => {
  const res = await apiClient.get(`/api/admin/teams/${id}`);
  return res.data;
};

export const getTeamPlayers = async (teamId: string): Promise<any> => {
  const res = await apiClient.get(`/api/admin/getTeamPlayers/${teamId}`);
  return res.data;
};

export const deleteTeam = async (id: string): Promise<any> => {
  const res = await apiClient.delete(`/api/admin/teams/${id}`);
  return res.data;
};

export const getTeamSessions = async (teamId: string): Promise<any> => {
  let isAdmin = false;
  try {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    isAdmin = ["SUPER_ADMIN", "ADMIN", "COACH"].includes(user?.role);
  } catch { }
  const endpoint = isAdmin ? `/api/admin/getTeamSessions/${teamId}` : `/api/user/getTeamSessions/${teamId}`;
  const res = await apiClient.get(endpoint);
  return res.data;
};

export const getTeamPlayerStatistics = async (teamId: string, playerId: string): Promise<any> => {
  const res = await apiClient.get(`/api/admin/teams/${teamId}/players/${playerId}/statistics`);
  return res.data;
};

export const updateTeamPlayerStatistics = async (teamId: string, playerId: string, statistics: any): Promise<any> => {
  const res = await apiClient.put(`/api/admin/teams/${teamId}/players/${playerId}/statistics`, statistics);
  return res.data;
};

export const getAvailablePlayers = async (): Promise<any> => {
  const res = await apiClient.get('/api/admin/available-players');
  return res.data;
};

export const assignPlayerToTeam = async (
  teamId: string,
  playerIds: string | string[],
  paymentStatus: string = "UNPAID",
  playerStatuses?: Record<string, string>,
  leagueId?: string
): Promise<any> => {
  const ids = Array.isArray(playerIds) ? playerIds : [playerIds];
  const players = ids.map((id) => ({
    playerId: id,
    paymentStatus: (playerStatuses && playerStatuses[id]) || paymentStatus || "UNPAID",
  }));

  const payload: any = {
    players,
  };
  if (leagueId) {
    payload.leagueId = leagueId;
  }
  const res = await apiClient.post(`/api/admin/teams/${teamId}/assign`, payload);
  return res.data;
};

export const unassignPlayersFromTeam = async (teamId: string, playerIds: string | string[]): Promise<any> => {
  const ids = Array.isArray(playerIds) ? playerIds : [playerIds];
  const payload = {
    playerIds: ids,
    players: ids,
    playerId: ids.length === 1 ? ids[0] : ids,
  };
  const res = await apiClient.post(`/api/admin/teams/${teamId}/unassign`, payload);
  return res.data;
};

export const addTemporaryPlayersToTeam = async (teamId: string, data: FormData): Promise<any> => {
  const res = await apiClient.post(`/api/admin/teams/${teamId}/temporary-players`, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};

export const getTemporaryPlayersForTeam = async (teamId: string): Promise<any> => {
  const res = await apiClient.get(`/api/admin/teams/${teamId}/temporary-players`);
  return res.data;
};

export const updateTemporaryPlayer = async (teamId: string, tempPlayerId: string, data: any): Promise<any> => {
  const isFormData = data instanceof FormData;
  const res = await apiClient.put(
    `/api/admin/teams/${teamId}/temporary-players/${tempPlayerId}`,
    data,
    isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
  );
  return res.data;
};

export const deleteTemporaryPlayerFromTeam = async (teamId: string, tempPlayerId: string): Promise<any> => {
  const res = await apiClient.delete(`/api/admin/teams/${teamId}/temporary-players/${tempPlayerId}`);
  return res.data;
};

export const removePlayersFromTeam = unassignPlayersFromTeam;


// ================= FIXTURES =================

export const getAllFixtures = async (): Promise<any> => {
  const res = await apiClient.get(ENDPOINTS.FIXTURES);
  return res.data;
};

export const getFixturesByLeague = async (leagueId: string): Promise<any> => {
  const res = await apiClient.get(`/api/user/leagues/${leagueId}/fixtures`);
  return res.data;
};

export const createFixture = async (data: any): Promise<any> => {
  const res = await apiClient.post(ENDPOINTS.FIXTURES, data);
  return res.data;
};

export const updateFixture = async (id: string, data: any): Promise<any> => {
  const res = await apiClient.put(`${ENDPOINTS.FIXTURES}/${id}`, data);
  return res.data;
};

export const deleteFixture = async (id: string): Promise<any> => {
  const res = await apiClient.delete(`${ENDPOINTS.FIXTURES}/${id}`);
  return res.data;
};

// ================= LEAGUES =================

export const getAllLeagues = async (): Promise<any> => {
  const res = await apiClient.get(ENDPOINTS.GET_ALL_LEAGUES);
  return res.data;
};

export const createLeague = async (data: any): Promise<any> => {
  const res = await apiClient.post(ENDPOINTS.LEAGUES, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};

export const updateLeague = async (id: string, data: any): Promise<any> => {
  const res = await apiClient.put(`${ENDPOINTS.LEAGUES}/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return res.data;
};

export const deleteLeague = async (id: string): Promise<any> => {
  const res = await apiClient.delete(`${ENDPOINTS.LEAGUES}/${id}`);
  return res.data;
};

export const getRegistrationRequests = async (page = 1, limit = 10, isMedicalCondition?: string): Promise<any> => {
  const params: any = { page, limit };
  if (isMedicalCondition && isMedicalCondition !== "All") {
    params.isMedicalCondition = isMedicalCondition;
  }
  const response = await apiClient.get(ENDPOINTS.GET_REGISTRATION_REQUESTS, {
    params,
  });
  return response.data;
};

export const deleteTemporaryPlayer = async (tempPlayerId: string): Promise<any> => {
  const res = await apiClient.delete(`/api/admin/temporary-players/${tempPlayerId}`);
  return res.data;
};

export const getUnallocatedPlayers = async (
  category?: string,
  program?: string,
  search?: string,
  page: number = 1,
  limit: number = 5
): Promise<any> => {
  const params: any = { allocationStatus: "UNALLOCATED", page, limit };
  if (category) params.category = category;
  if (program) params.program = program;
  if (search) params.search = search;
  const response = await apiClient.get("/api/admin/players/search", { params });
  return response.data;
};

export const assignClassesToPlayer = async (
  playerId: string,
  classIds: string[],
  paymentStatus: string,
  registrationRequestId?: string
): Promise<any> => {
  const url = ENDPOINTS.ASSIGN_CLASSES_TO_PLAYER.replace(":playerId", playerId);
  const payload: any = { classIds, paymentStatus };
  if (registrationRequestId) {
    payload.registrationRequestId = registrationRequestId;
  }
  const response = await apiClient.patch(url, payload);
  return response.data;
};

export const removeClassFromPlayer = async (
  userId: string,
  classId: string
): Promise<any> => {
  const response = await apiClient.post(`api/admin/removeClass/${userId}`, {
    classId,
  });
  return response.data;
};

export const transferClass = async (
  userId: string,
  data: { fromClassId: string; toClassId: string }
): Promise<any> => {
  const response = await apiClient.post(`/api/admin/transferClass/${userId}`, data);
  return response.data;
};


export const getAllocatedPlayers = async (
  category?: string,
  program?: string,
  search?: string,
  page: number = 1,
  limit: number = 5
): Promise<any> => {
  const params: any = { allocationStatus: "ALLOCATED", page, limit };
  if (category) params.category = category;
  if (program) params.program = program;
  if (search) params.search = search;
  const response = await apiClient.get("/api/admin/players/search", { params });
  return response.data;
};

// ================= NOTIFICATIONS =================

export const getNotifications = async (): Promise<any> => {
  const response = await apiClient.get(ENDPOINTS.GET_NOTIFICATIONS);
  return response.data;
};

export const markAllNotificationsRead = async (): Promise<any> => {
  const response = await apiClient.patch(ENDPOINTS.READ_ALL_NOTIFICATIONS);
  return response.data;
};

export const markNotificationRead = async (notificationId: string): Promise<any> => {
  const response = await apiClient.patch(`/api/admin/notifications/${notificationId}/read`);
  return response.data;
};

export const getAdminDashboard = async (): Promise<any> => {
  const response = await apiClient.get(ENDPOINTS.GET_DASHBOARD);
  return response.data;
};

export const getAdminTermDashboardInsights = async (
  termId: string,
  grouping: "daily" | "weekly" | "monthly" | "term" = "weekly"
): Promise<any> => {
  const response = await apiClient.get(`${ENDPOINTS.GET_DASHBOARD}/term/${termId}`, {
    params: { grouping },
  });
  return response.data;
};

export interface SidebarBadges {
  verificationRequests: number;
  temporaryPlayers: number;
  unallocatedPlayers: number;
  unpaidInvoices: number;
  pendingPayments: number;
  eventRegistrations: number;
  orders: number;
  playersManagementTotal: number;
  financeTotal: number;
  pendingItemIds?: {
    verificationRequests?: string[];
    temporaryPlayers?: string[];
    unallocatedPlayers?: string[];
    unpaidInvoices?: string[];
    pendingPayments?: string[];
    eventRegistrations?: string[];
    orders?: string[];
  };
}

export const getSidebarBadges = async (): Promise<SidebarBadges> => {
  const response = await apiClient.get("/api/admin/sidebar-badges");
  return response.data?.data;
};

