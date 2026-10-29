import apiClient from "./apiClient";

export interface InvoiceItem {
  title: string;
  description: string;
  amount: number;
}

export interface InvoicePayload {
  parentId: string;
  playerId?: string;
  players?: string[];
  classId?: string;
  items: InvoiceItem[];
  discount: number;
  dueDate: string;
  type: string;
  description: string;
  notes: string;
}

export const generateInvoice = async (payload: InvoicePayload) => {
  const response = await apiClient.post("/api/admin/invoices", payload);
  return response.data;
};

export const getInvoices = async (params?: { search?: string; paymentStatus?: string; page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.paymentStatus && params.paymentStatus !== "ALL") queryParams.append("paymentStatus", params.paymentStatus);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());

  const response = await apiClient.get(`/api/admin/invoices?${queryParams.toString()}`);
  return response.data;
};

export const getInvoiceDetails = async (id: string) => {
  const response = await apiClient.get(`/api/admin/invoices/${id}`);
  return response.data;
};

export const updateInvoice = async (id: string, payload: Partial<{ paymentStatus: string; status: string; dueDate: string; notes: string }>) => {
  const response = await apiClient.patch(`/api/admin/invoices/${id}`, payload);
  return response.data;
};