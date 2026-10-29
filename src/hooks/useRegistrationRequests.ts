import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteTemporaryPlayer } from "../api/adminApi";
import { getCoachTemporaryPlayers } from "../api/coaches";
import { fetchVerificationRequests, VerificationFilters } from "../api/verificationApi";
import { Player, PlayersResponse } from "../types/player";

// We map the raw response to match the Player interface so we can reuse PlayerTable
const mapRegistrationToPlayer = (reg: any): Player => {
  return {
    _id: reg.player?._id || reg._id,
    firstName: reg.player?.firstName || "",
    lastName: reg.player?.lastName || "",
    fullName: reg.player?.fullName || "",
    email: reg.player?.email || null,
    phone: reg.player?.phone || null,
    dob: reg.player?.dob || "",
    gender: reg.player?.gender || "",
    profile: reg.player?.profile || "",
    profileImage: reg.player?.profileImage || "",
    parentId: reg.parent || null,
    preferredFoot: reg.player?.preferredFoot || reg.player?.prefferedFoot || "",
    weakFootRating: reg.player?.weakFootRating || 0,
    school: reg.player?.school || "",
    status: reg.status || "PENDING",
    category: reg.category || undefined,
    programs: reg.programs || [],
    program: reg.programs && reg.programs.length > 0 ? reg.programs[0] : undefined,
    paymentStatus: reg.player?.paymentStatus || "PENDING",
    term: reg.player?.term || undefined,
    jerseyNumber: reg.player?.jerseyNumber || 0,
    goals: reg.player?.goals || 0,
    assists: reg.player?.assists || 0,
    appearances: reg.player?.appearances || 0,
    cleanSheets: reg.player?.cleanSheets || 0,
    yellowCards: reg.player?.yellowCards || 0,
    redCards: reg.player?.redCards || 0,
    // Add raw registration request id for status updates if needed
    requestId: reg._id,
    assignedClasses: reg.player?.assignedClasses || [],
    hasPendingRequest: reg.player?.hasPendingRequest === true,
    classPaymentStatuses: reg.player?.classPaymentStatuses || [],
    playerStatus: reg.player?.playerStatus,
    createdAt: reg.createdAt,
    preferredTerm: reg.preferredTerm,
    preferredClasses: reg.preferredClasses,
    requestType: reg.requestType,
    addedBy: reg.addedBy || "Unknown",
    requestedBySource: reg.requestedBySource,
    createdBy: reg.createdBy,
    assignedBy: reg.assignedBy,
    rating: reg.player?.rating || 0,
    isMedicalCondition: reg.player?.isMedicalCondition === true,
    medicalConditionDetails: reg.player?.medicalConditionDetails || "",
    medicalConditions: reg.player?.medicalConditions || "",
    prefferedFoot: reg.player?.prefferedFoot || reg.player?.preferredFoot || "",
  } as Player & { requestId: string };
};

export const useRegistrationRequests = (page = 1, limit = 20, filters: VerificationFilters = {}) => {
  return useQuery<PlayersResponse & { metrics: Record<string, number>; sourceMetrics: Record<string, number> }, Error>({
    queryKey: ["registrationRequests", page, limit, filters],
    queryFn: async () => {
      const response = await fetchVerificationRequests(page, limit, filters);
      return { success: true, limit: response.limit, totalPages: response.totalPages, users: response.data.map(mapRegistrationToPlayer), total: response.total, page: response.page, metrics: response.metrics || {}, sourceMetrics: response.sourceMetrics || {} };
    },
  });
};

export const useCoachTemporaryPlayers = (page = 1, limit = 20) => {
  return useQuery<PlayersResponse, Error>({
    queryKey: ["coachTemporaryPlayers", page, limit],
    queryFn: async () => {
      const response = await getCoachTemporaryPlayers(page, limit);
      if (!response || !response.data) {
        return { success: true, limit: 20, totalPages: 1, users: [], total: 0, page: 1 };
      }
      return {
        success: true,
        limit: response.limit || 20,
        totalPages: response.totalPages || 1,
        users: response.data.map(mapRegistrationToPlayer),
        total: response.total || 0,
        page: response.page || 1,
      } as PlayersResponse;
    },
  });
};

export const useDeleteTemporaryPlayer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemporaryPlayer(id),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["coachTemporaryPlayers"] });
      queryClient.invalidateQueries({ queryKey: ["registrationRequests"] });
      queryClient.invalidateQueries({ queryKey: ["sidebarBadges"] });
      toast.success(data?.message || "Temporary player deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error.message || "Failed to delete temporary player");
    }
  });
};


