import apiClient from "./apiClient";
import {
  ProductsResponse,
  ProductResponse,
  CreateProductRequest,
  UpdateProductRequest,
} from "../types/product";

export const getProducts = async (page = 1, limit = 10): Promise<ProductsResponse> => {
  const response = await apiClient.get<ProductsResponse>("/store/products", {
    params: { page, limit },
  });
  return response.data;
};

export const getProductById = async (id: string): Promise<ProductResponse> => {
  const response = await apiClient.get<ProductResponse>(`/store/products/${id}`);
  return response.data;
};

export const createProduct = async (
  data: CreateProductRequest,
  imageFiles?: File[]
): Promise<ProductResponse> => {
  if (imageFiles && imageFiles.length > 0) {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("category", data.category);
    formData.append("price", String(data.price));
    formData.append("inventoryCount", String(data.inventoryCount));
    
    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    const response = await apiClient.post<ProductResponse>("/store/products", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  const response = await apiClient.post<ProductResponse>("/store/products", data);
  return response.data;
};

export const updateProduct = async (
  id: string,
  data: UpdateProductRequest,
  imageFiles?: File[]
): Promise<ProductResponse> => {
  if (imageFiles && imageFiles.length > 0) {
    const formData = new FormData();
    if (data.name) formData.append("name", data.name);
    if (data.description !== undefined) formData.append("description", data.description);
    if (data.category) formData.append("category", data.category);
    if (data.price !== undefined) formData.append("price", String(data.price));
    if (data.inventoryCount !== undefined) formData.append("inventoryCount", String(data.inventoryCount));
    
    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    const response = await apiClient.patch<ProductResponse>(`/store/products/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  const response = await apiClient.patch<ProductResponse>(`/store/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete(`/store/products/${id}`);
  return response.data;
};
