import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPayments, approvePayment, rejectPayment, getDashboardPayments } from "../api/paymentApi";
import toast from "react-hot-toast";

export const usePayments = (search?: string, status?: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["payments", { search, status, page, limit }],
    queryFn: () => getPayments({ search, status, page, limit }),
    placeholderData: (previousData) => previousData,
  });
};

export const useApprovePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment approved successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to approve payment");
    }
  });
};

export const useRejectPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectPayment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment rejected successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to reject payment");
    }
  });
};

export const useDashboardPayments = () => {
  return useQuery({
    queryKey: ["dashboardPayments"],
    queryFn: getDashboardPayments,
  });
};