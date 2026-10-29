import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generateInvoice, getInvoices, getInvoiceDetails, updateInvoice, InvoicePayload } from "../api/invoiceApi";
import toast from "react-hot-toast";

export const useGenerateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoicePayload) => generateInvoice(payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["classFullTable"] });
      queryClient.invalidateQueries({ queryKey: ["classPlayers"] });
      queryClient.invalidateQueries({ queryKey: ["academySchedule"] });
      queryClient.invalidateQueries({ queryKey: ["myClassesList"] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["unallocatedPlayers"] });
      toast.success(data?.message || "Invoice generated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error.message || "Failed to generate invoice");
    }
  });
};

export const useInvoices = (search?: string, status?: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["invoices", { search, status, page, limit }],
    queryFn: () => getInvoices({ search, paymentStatus: status, page, limit }),
    placeholderData: (previousData) => previousData, // keep previous data while fetching
  });
};

export const useInvoiceDetails = (id: string) => {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoiceDetails(id),
    enabled: !!id,
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<{ paymentStatus: string; status: string; dueDate: string; notes: string }> }) =>
      updateInvoice(id, payload),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.id] });
      toast.success(data?.message || "Invoice updated successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error.message || "Failed to update invoice");
    },
  });
};