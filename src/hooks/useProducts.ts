import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api/products";
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductsResponse,
  ProductResponse,
} from "../types/product";
import { getStoreProducts, getStoreProductDetails, getProductInsights, deleteStoreProduct } from "../api/orderApi";


export const useStoreProducts = (params?: {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
  availabilityStatus?: string;
}) => {
  return useQuery<any, Error>({
    queryKey: ["storeProducts", params],
    queryFn: () => getStoreProducts(params),
    placeholderData: (previousData: any) => previousData,
  });
};

export const useStoreProductDetails = (id: string) => {
  return useQuery<any, Error>({
    queryKey: ["storeProduct", id],
    queryFn: () => getStoreProductDetails(id),
    enabled: !!id,
  });
};

export const useProductInsights = (id: string, page: number) => useQuery({
  queryKey: ["storeProductInsights", id, page],
  queryFn: () => getProductInsights(id, page),
  enabled: !!id,
});

export const useProducts = (page = 1, limit = 10) => {
  return useQuery<ProductsResponse, Error>({
    queryKey: ["products", page, limit],
    queryFn: () => getProducts(page, limit),
  });
};

export const useProductById = (id: string) => {
  return useQuery<ProductResponse, Error>({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation<ProductResponse, Error, { data: CreateProductRequest; imageFiles?: File[] }>({
    mutationFn: ({ data, imageFiles }) => createProduct(data, imageFiles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation<ProductResponse, Error, { id: string; data: UpdateProductRequest; imageFiles?: File[] }>({
    mutationFn: ({ id, data, imageFiles }) => updateProduct(id, data, imageFiles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useDeleteStoreProduct = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: deleteStoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storeProducts"] });
    },
  });
};

