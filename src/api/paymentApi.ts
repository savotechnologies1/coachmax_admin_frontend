import apiClient from "./apiClient";

export const getPayments = async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.status && params.status !== "ALL") queryParams.append("status", params.status);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());

  const response = await apiClient.get(`/api/admin/payments?${queryParams.toString()}`);
  return response.data;
};

export const approvePayment = async (id: string) => {
  const response = await apiClient.post(`/api/admin/payments/${id}/approve`);
  return response.data;
};

export const rejectPayment = async (id: string, reason: string) => {
  const response = await apiClient.post(`/api/admin/payments/${id}/reject`, { reason });
  return response.data;
};

export const getDashboardPayments = async () => {
  const response = await apiClient.get(`/api/admin/dashboard/payments`);
  return response.data;
};

export interface PaymentSettingsData {
  isOnlineEnabled: boolean;
  isCodEnabled: boolean;
  allowedPaymentMethods?: string[];
  updatedAt?: string;
}

export const getPaymentSettings = async () => {
  const response = await apiClient.get("/api/admin/payments/settings");
  return response.data;
};

export const updatePaymentSettings = async (data: { isOnlineEnabled: boolean; isCodEnabled: boolean }) => {
  const response = await apiClient.put("/api/admin/payments/settings", data);
  return response.data;
};