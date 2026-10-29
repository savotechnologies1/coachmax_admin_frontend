import apiClient from "./apiClient";
import { PlayersResponse } from "../types/player";

export const getPlayers = async (
  page = 1,
  limit = 10,
  search?: string,
  program?: string,
  status?: string,
  term?: string,
  medical?: string,
  ageGroup?: string,
  subProgram?: string,
  playerStatus?: "ALL" | "APPROVED" | "REJECTED",
  assignment?: "ELITE" | "SCHOOL" | "BOTH" | "UNASSIGNED",
  year?: string
): Promise<PlayersResponse> => {
  const params: any = { page, limit };
  if (search && search.trim()) params.search = search.trim();
  if (program && program !== "All") params.program = program;
  if (status && status !== "All") {
    params.status = status;
    params.paymentStatus = status.toUpperCase();
  }
  if (term && term !== "All") params.term = term;
  if (year && year !== "All") params.year = year;
  if (medical && medical !== "All") params.medical = medical;
  if (ageGroup && ageGroup !== "All") params.ageGroup = ageGroup;
  if (subProgram && subProgram !== "All") params.subProgram = subProgram;
  if (playerStatus) params.playerStatus = playerStatus;
  if (assignment) params.assignment = assignment;

  const response = await apiClient.get<PlayersResponse>("/api/admin/getUsers", { params });
  return response.data;
};

export const deletePlayer = async (id: string): Promise<void> => {
  await apiClient.delete(`/players/${id}`);
};

export const updatePlayer = async (playerId: string, data: FormData | Record<string, any>): Promise<any> => {
  const isFormData = data instanceof FormData;
  const response = await apiClient.put(`/api/admin/updatePlayer/${playerId}`, data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return response.data;
};


export const exportUsersCSV = async (status: string = "APPROVED"): Promise<void> => {
  const response = await apiClient.post(
    "/api/admin/exportUsers",
    { format: "csv", status },
    { responseType: "blob" }
  );
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `players_${status.toLowerCase()}_export.csv`);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
};

export const getPlayerProfile = async (playerId: string): Promise<any> => {
  const response = await apiClient.get(`/api/user/player/profile/${playerId}`);
  return response.data;
};

export const getAdminPlayerDetails = async (playerId: string): Promise<any> => {
  const response = await apiClient.get(`/api/admin/player/${playerId}`);
  return response.data;
};

export const updatePlayerStatistics = async (playerId: string, data: any): Promise<any> => {
  const response = await apiClient.put(`/api/admin/player-statistics/${playerId}`, data);
  return response.data;
};

export const updatePlayerRating = async (id: string, rating: number): Promise<void> => {
  await apiClient.put(`/api/admin/updateRating/${id}`, { rating });
};

export const getPlayerStats = async (term?: string, year?: string): Promise<{ success: boolean; stats: any }> => {
  const params: any = {};
  if (term && term !== "All") params.term = term;
  if (year && year !== "All") params.year = year;
  const response = await apiClient.get("/api/admin/playerStats", { params });
  return response.data;
};

export interface UpdatePaymentStatusPayload {
  paymentStatus: string;
  classId?: string;
  teamId?: string;
  leagueId?: string;
}

export const updatePlayerPaymentStatus = async (
  userId: string,
  payload: UpdatePaymentStatusPayload
): Promise<any> => {
  const response = await apiClient.put(`/api/admin/updatePaymentStatus/${userId}`, payload);
  return response.data;
};

