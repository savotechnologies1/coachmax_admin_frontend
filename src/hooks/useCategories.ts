import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/adminApi";

export interface Category {
  _id: string;
  name: string;
  isEvent?: boolean;
  [key: string]: any;
}

const extractCategories = (res: any): Category[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.categories)) return res.categories;
  return [];
};

const EMPTY_CATEGORIES: Category[] = [];

export const useCategories = (params?: { isEvent?: "all" | "true" | "false" | string }) => {
  const isEvent = params?.isEvent ?? "all";

  const query = useQuery({
    queryKey: ["categories", isEvent],
    queryFn: async () => {
      const res = await getAllCategories();
      return extractCategories(res);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const categories = query.data ?? EMPTY_CATEGORIES;

  return useMemo(() => ({
    ...query,
    categories,
  }), [query, categories]);
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; isEvent?: boolean } | any) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; isEvent?: boolean } | any }) =>
      updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};
