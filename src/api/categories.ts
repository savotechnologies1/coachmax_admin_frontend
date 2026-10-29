import apiClient from "./apiClient";

export const getAllCategories = async (): Promise<any> => {
  const res = await apiClient.get("/api/user/getCategories", { params: { isEvent: "all" } });
  return res.data;
};

export const createCategory = async (data: { name: string }): Promise<any> => {
  const res = await apiClient.post("/api/admin/createCategory", data);
  return res.data;
};

export const updateCategory = async (id: string, data: { name: string }): Promise<any> => {
  const res = await apiClient.put(`/api/admin/updateCategory/${id}`, data);
  return res.data;
};

export const deleteCategory = async (id: string): Promise<any> => {
  const res = await apiClient.delete(`/api/admin/deleteCategory/${id}`);
  return res.data;
};
