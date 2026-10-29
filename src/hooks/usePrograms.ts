import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
} from "../api/programs";
import { getProgramsByCategory } from "../api/adminApi";
import {
  CreateProgramRequest,
  UpdateProgramRequest,
  ProgramsResponse,
  ProgramResponse,
} from "../types/program";

export interface ProgramItem {
  _id: string;
  name: string;
  category?: string | any;
  [key: string]: any;
}

const extractPrograms = (res: any): ProgramItem[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.programs)) return res.programs;
  return [];
};

export const usePrograms = (page = 1, limit = 10) => {
  return useQuery<ProgramsResponse, Error>({
    queryKey: ["programs", page, limit],
    queryFn: () => getPrograms(page, limit),
  });
};

const EMPTY_PROGRAMS: ProgramItem[] = [];

export const useProgramsByCategory = (
  categoryId?: string,
  options?: { enabled?: boolean }
) => {
  const isEnabled = Boolean(
    categoryId &&
    categoryId !== "all" &&
    categoryId.trim() !== "" &&
    options?.enabled !== false
  );

  const query = useQuery({
    queryKey: ["programs", "byCategory", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const res = await getProgramsByCategory(categoryId);
      return extractPrograms(res);
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const programs = query.data ?? EMPTY_PROGRAMS;

  return useMemo(() => ({
    ...query,
    programs,
  }), [query, programs]);
};

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation<ProgramResponse, Error, CreateProgramRequest | any>({
    mutationFn: (data) => createProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
};

export const useUpdateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation<ProgramResponse, Error, { id: string; data: UpdateProgramRequest | any }>({
    mutationFn: ({ id, data }) => updateProgram(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
};

export const useDeleteProgram = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; message: string } | any, Error, string>({
    mutationFn: (id) => deleteProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
};
