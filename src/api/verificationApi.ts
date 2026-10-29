import apiClient from "./apiClient";

export interface VerificationFilters {
  search?: string;
  status?: string;
  requestType?: string;
  isMedicalCondition?: string;
  ageGroup?: string;
  term?: string;
  category?: string;
  program?: string;
  group?: string;
  submittedBy?: string;
}

export const fetchVerificationRequests = async (page: number, limit: number, filters: VerificationFilters = {}) => {
  const params = Object.fromEntries(Object.entries({ page, limit, ...filters }).filter(([, value]) => value !== "" && value !== "All" && value !== undefined));
  const response = await apiClient.get("/api/admin/registration-requests", { params });
  if (response.data?.success !== true || !Array.isArray(response.data.data)) throw new Error("Invalid verification response");
  return response.data;
};

export const rejectAndDeleteVerificationRequest = async (requestId: string, reason: string) => {
  const response = await apiClient.patch(`/api/admin/registration-requests/${requestId}/reject`, { reason });
  return response.data;
};

export const fetchAllocationClasses = async (term?: string, category?: string, program?: string) => {
  const response = await apiClient.get("/api/admin/getAllClassesForAssign", { params: { ...(term ? { term } : {}), ...(category ? { categoryId: category } : {}), ...(program ? { programId: program } : {}) } });
  if (!Array.isArray(response.data?.data)) throw new Error("Invalid class response");
  return response.data.data;
};

export const allocateVerification = async (command: { playerId: string; registrationRequestId?: string; classIds: string[]; paymentStatus: string; overrideEligibility?: boolean; overrideReason?: string }) => {
  const { playerId, ...payload } = command;
  const response = await apiClient.patch(`/api/admin/player/${playerId}/assign-classes`, payload);
  return response.data;
};
