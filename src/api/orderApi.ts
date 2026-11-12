import apiClient from "./apiClient";

export type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type OrderPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type EffectiveOrderPaymentStatus = OrderPaymentStatus | "PAYMENT_PENDING";

export interface StoreOrderListItem {
  _id: string;
  orderNumber?: string;
  parent?: { fullName?: string; email?: string };
  totalAmount?: number;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  effectivePaymentStatus?: EffectiveOrderPaymentStatus;
  invoice?: { paymentStatus?: string };
}

export interface OrdersResponse {
  success: boolean;
  data: StoreOrderListItem[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export const getOrders = async (params?: { search?: string; status?: string; paymentStatus?: string; page?: number; limit?: number }): Promise<OrdersResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.status && params.status !== "ALL") queryParams.append("status", params.status);
  if (params?.paymentStatus && params.paymentStatus !== "ALL") queryParams.append("paymentStatus", params.paymentStatus);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());

  const response = await apiClient.get<OrdersResponse>(`/api/admin/store/orders?${queryParams.toString()}`);
  return response.data;
};

export const getOrderDetails = async (id: string) => {
  const response = await apiClient.get(`/api/admin/store/orders/${id}`);
  return response.data;
};

export const updateOrderStatus = async (id: string, data: { status?: string; paymentStatus?: string }) => {
  const response = await apiClient.patch(`/api/admin/store/orders/${id}`, data);
  return response.data;
};

export const getStoreCategories = async () => {
  const response = await apiClient.get("/api/admin/store/categories");
  return response.data;
};

export const getStoreProducts = async (params?: {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
  availabilityStatus?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.category) queryParams.append("category", params.category);
  if (params?.status && params.status !== "ALL") queryParams.append("status", params.status);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.availabilityStatus && params.availabilityStatus !== "ALL") {
    queryParams.append("availabilityStatus", params.availabilityStatus);
  }

  const response = await apiClient.get(`/api/admin/store/products?${queryParams.toString()}`);
  return response.data;
};

export const getStoreProductDetails = async (id: string) => {
  const response = await apiClient.get(`/api/admin/store/products/${id}`);
  return response.data;
};

export interface ProductInsights {
  product: {
    _id: string;
    name: string;
    shortHighlight?: string;
    description?: string;
    images: string[];
    category?: { name: string };
    price: number;
    stock: number;
    sizes: string[];
    colors: string[];
    availabilityStatus: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    orderCount: number;
    unitsOrdered: number;
    unitsSold: number;
    paidRevenueMinor: number;
    pendingRevenueMinor: number;
    cancelledOrders: number;
    refundedOrders: number;
    buyerCount: number;
  };
  orders: Array<{
    _id: string;
    parent?: { _id: string; fullName?: string; email?: string; phone?: string };
    quantity: number;
    lineTotalMinor: number;
    variants: Array<{ size?: string; color?: string; quantity: number }>;
    paymentStatus: string;
    effectivePaymentStatus?: string;
    orderStatus: string;
    invoice?: { invoiceNumber?: string; paymentStatus?: string };
    createdAt: string;
    currency: string;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const getProductInsights = async (id: string, page = 1): Promise<ProductInsights> => {
  const response = await apiClient.get(`/api/admin/store/products/${id}/insights`, { params: { page, limit: 10 } });
  return response.data.data;
};

export const createStoreProduct = async (payload: FormData) => {
  const response = await apiClient.post("/api/admin/store/products", payload, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const updateStoreProduct = async (id: string, payload: FormData) => {
  const response = await apiClient.put(`/api/admin/store/products/${id}`, payload, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const deleteStoreProduct = async (id: string) => {
  const response = await apiClient.delete(`/api/admin/store/products/${id}`);
  return response.data;
};


