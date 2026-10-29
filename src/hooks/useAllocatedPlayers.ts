import { formatDateTime } from "../utils/dateTime";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getAllocatedPlayers } from "../api/adminApi";
import { UnallocatedPlayer } from "../types/academy";
import { getMediaUrl, getMediaFallback } from "../utils/media";

const mapAllocatedToCard = (data: any): UnallocatedPlayer => {
  const avatar = getMediaUrl(data.profileImage, getMediaFallback(data.fullName || "Player"));
  const details = `${data.gender || "Unknown"}`;
  const assignedClasses = Array.isArray(data.assignedClasses)
    ? data.assignedClasses.map((item: any) => ({
      _id: item?._id,
      name: item?.name,
      dayOfWeek: item?.dayOfWeek,
      startTime: item?.startTime,
      endTime: item?.endTime,
      venue: item?.venue,
      location: item?.location,
    }))
    : [];

  const requestedDate = new Date(data.listActivityAt || data.joinedDate || data.createdAt);
  const formattedRequested = formatDateTime(requestedDate);

  return {
    id: data._id,
    name: data.fullName,
    avatar,
    details: details,
    rating: data.rating || 0,
    requested: formattedRequested,
    programCode: data.programs && data.programs.length > 0 ? data.programs[0].name.substring(0, 2).toUpperCase() : "AC",
    fullProgramName: data.programs && data.programs.length > 0 ? data.programs[0].name : "N/A",
    categoryName: data.category?.name || "N/A",
    categoryId: data.category?._id || undefined,
    programId: data.programs && data.programs.length > 0 ? data.programs[0]._id : undefined,
    registrationRequestId: data.registrationRequest?._id || undefined,
    paymentStatus: data.paymentStatus || "TRIAL",
    assignedClasses,
    assignedTeams: Array.isArray(data.assignedTeams) ? data.assignedTeams : [],
  };
};

export const useAllocatedPlayers = (
  category?: string,
  program?: string,
  search?: string,
  page: number = 1,
  limit: number = 5,
  enabled: boolean = true
) => {
  // Coaches do not have access to the admin players/search endpoint
  let isCoach = false;
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) isCoach = JSON.parse(userStr)?.role === "COACH";
  } catch { }

  return useQuery({
    queryKey: ["allocatedPlayers", category, program, search, page, limit],
    queryFn: async () => {
      const response = await getAllocatedPlayers(category, program, search, page, limit);
      if (response) {
        const players: UnallocatedPlayer[] = (response.data || []).map(mapAllocatedToCard);
        const total = response.pagination?.total ?? response.total ?? players.length;
        const totalPages = response.pagination?.totalPages ?? Math.ceil(total / limit);
        const hasMore = response.pagination?.hasMore ?? (page < totalPages);
        return {
          players,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore
          }
        };
      }
      return {
        players: [],
        pagination: { page: 1, limit: 5, total: 0, totalPages: 0, hasMore: false }
      };
    },
    enabled: enabled && !isCoach,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
    initialData: {
      players: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0, hasMore: false }
    },
  });
};
