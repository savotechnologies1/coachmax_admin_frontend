import { formatDateOnly, formatDateTime } from "../utils/dateTime";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getUnallocatedPlayers } from "../api/adminApi";
import { UnallocatedPlayer } from "../types/academy";
import { getMediaUrl, getMediaFallback } from "../utils/media";
import { useCoachAccess } from "./useCoachAccess";

const mapUnallocatedToCard = (data: any): UnallocatedPlayer => {
  const avatar = getMediaUrl(data.profileImage, getMediaFallback(data.fullName || "Player"));
  
  // Extract details (e.g. Gender, Age) cleanly without showing raw "Unknown"
  const details = data.gender && data.gender !== "Unknown" ? data.gender : (data.dateOfBirth ? `DOB: ${formatDateOnly(data.dateOfBirth)}` : "Player");

  // Format requested date/time
  const requestedDate = new Date(data.listActivityAt || data.registrationRequest?.createdAt || data.joinedDate || data.createdAt || Date.now());
  const formattedRequested = formatDateTime(requestedDate);

  // Extract Category from request or user
  const reqCategory = data.registrationRequest?.category || data.category || (data.categories && data.categories[0]);
  const categoryId = reqCategory?._id || (typeof reqCategory === "string" ? reqCategory : undefined);
  const categoryName = reqCategory?.name || (typeof reqCategory === "string" ? "Academy" : (data.category?.name || "Academy"));
  const isEvent = Boolean(reqCategory?.isEvent || data.category?.isEvent);

  // Extract Program from request or user
  const reqPrograms = (data.registrationRequest?.programs && data.registrationRequest.programs.length > 0)
    ? data.registrationRequest.programs
    : (data.programs || []);
  const primaryProgram = reqPrograms[0];
  const programId = primaryProgram?._id || (typeof primaryProgram === "string" ? primaryProgram : undefined);
  const fullProgramName = primaryProgram?.name || (typeof primaryProgram === "string" ? primaryProgram : "N/A");

  // Extract Term from request or user
  const reqTerm = data.registrationRequest?.preferredTerm || data.term;
  const termName = reqTerm?.name || undefined;
  const termId = reqTerm?._id || (typeof reqTerm === "string" ? reqTerm : undefined);

  // Preferred Classes requested by player
  const preferredClasses = (data.registrationRequest?.preferredClasses || []).map((c: any) => ({
    id: c._id || c.id,
    name: c.name || "Class",
    dayOfWeek: c.dayOfWeek || "",
    startTime: c.startTime || "",
    endTime: c.endTime || "",
    location: c.location || c.venue || "",
  }));

  const primaryClass = preferredClasses.length > 0 ? preferredClasses[0] : undefined;

  // Program / Category short code for badge
  const programCode = fullProgramName && fullProgramName !== "N/A"
    ? fullProgramName.substring(0, 3).toUpperCase()
    : (categoryName ? categoryName.substring(0, 2).toUpperCase() : "AC");

  return {
    id: data._id,
    name: data.fullName || "Unnamed Player",
    avatar,
    details,
    rating: data.rating || 0,
    requested: formattedRequested,
    programCode,
    fullProgramName,
    categoryName,
    categoryId,
    programId,
    registrationRequestId: data.registrationRequest?._id || undefined,
    paymentStatus: data.paymentStatus || "TRIAL",
    termName,
    termId,
    isEvent,
    preferredClasses,
    primaryClass,
  };
};

export const useUnallocatedPlayers = (
  category?: string,
  program?: string,
  search?: string,
  page: number = 1,
  limit: number = 5,
  enabled: boolean = true
) => {
  const access = useCoachAccess();

  return useQuery({
    queryKey: ["unallocatedPlayers", category, program, search, page, limit],
    queryFn: async () => {
      const response = await getUnallocatedPlayers(category, program, search, page, limit);
      if (response) {
        const players: UnallocatedPlayer[] = (response.data || []).map(mapUnallocatedToCard);
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
    enabled: enabled && access.can("requests", "read"),
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
    initialData: {
      players: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0, hasMore: false }
    },
  });
};
