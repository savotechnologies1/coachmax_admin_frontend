import apiClient from "./apiClient";
import {
  ProgramsResponse,
  ProgramResponse,
  CreateProgramRequest,
  UpdateProgramRequest,
} from "../types/program";

export const getPrograms = async (page = 1, limit = 10): Promise<ProgramsResponse> => {
  const response = await apiClient.get<ProgramsResponse>("/api/user/getAllPrograms", {
    params: { page, limit },
  });
  return response.data;
};

export const getProgramsByCategory = async (categoryId: string): Promise<ProgramsResponse> => {
  const response = await apiClient.get<ProgramsResponse>(`/api/user/getProgramsByCategory/${categoryId}`);
  return response.data;
};

export const createProgram = async (data: CreateProgramRequest): Promise<ProgramResponse> => {
  const response = await apiClient.post<ProgramResponse>("/api/admin/createProgram", data);
  return response.data;
};

export const updateProgram = async (
  id: string,
  data: UpdateProgramRequest
): Promise<ProgramResponse> => {
  const response = await apiClient.put<ProgramResponse>(`/api/admin/updateProgram/${id}`, data);
  return response.data;
};

export const deleteProgram = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete(`/api/admin/deleteProgram/${id}`);
  return response.data;
};
