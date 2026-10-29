import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllTerms,
  createTerm,
  updateTerm,
  deleteTerm,
} from "../api/adminApi";

export interface Term {
  _id: string;
  name: string;
  year?: number | string;
  startDate?: string;
  endDate?: string;
  isEvent?: boolean;
  status?: string;
  isActive?: boolean;
  isCurrent?: boolean;
  [key: string]: any;
}

export interface UseTermsParams {
  year?: number | string;
  isEvent?: "all" | "true" | "false" | string;
}

export interface UseTermsOptions {
  enabled?: boolean;
}

const extractTerms = (res: any): Term[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.terms)) return res.terms;
  return [];
};

const EMPTY_TERMS: Term[] = [];

export const useTerms = (
  params?: UseTermsParams,
  options?: UseTermsOptions
) => {
  const yearNumber = params?.year !== undefined && params.year !== "" ? Number(params.year) : undefined;
  const isEvent = (params?.isEvent as "all" | "true" | "false" | undefined) ?? "all";

  const query = useQuery({
    queryKey: ["terms", { year: yearNumber ?? null, isEvent }],
    queryFn: async () => {
      const res = await getAllTerms(yearNumber, isEvent);
      return extractTerms(res);
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const terms = query.data ?? EMPTY_TERMS;

  return useMemo(() => ({
    ...query,
    terms,
  }), [query, terms]);
};

export const useCreateTerm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createTerm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terms"] });
    },
  });
};

export const useUpdateTerm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTerm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terms"] });
    },
  });
};

export const useDeleteTerm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terms"] });
    },
  });
};
