import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrders, getOrderDetails, updateOrderStatus } from "../api/orderApi";
import toast from "react-hot-toast";

export const useOrders = (params: Parameters<typeof getOrders>[0] = {}) => {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => getOrders(params),
    placeholderData: (previousData) => previousData,
  });
};

export const useOrderDetails = (id: string) => {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderDetails(id),
    enabled: !!id,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; paymentStatus?: string } }) => updateOrderStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["storeProductInsights"] });
      toast.success(variables.data.paymentStatus ? "Payment status updated." : "Order status updated.");
    },
    onError: (error: any) => {
      if (!error?._handled) toast.error(error?.response?.data?.message || "Failed to update order status");
    }
  });
};
