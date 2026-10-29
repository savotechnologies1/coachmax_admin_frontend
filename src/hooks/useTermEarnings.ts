import { useQuery } from "@tanstack/react-query";
import { getTermEarnings, TermEarningsQueryParams } from "../api/financeApi";

export const useTermEarnings = (
  termId: string | null | undefined,
  params?: TermEarningsQueryParams
) => {
  return useQuery({
    queryKey: ["termEarnings", termId, params?.classId, params?.status, params?.compareTermId, params?.stream],
    queryFn: () => {
      if (!termId) return null;
      return getTermEarnings(termId, params);
    },
    enabled: !!termId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
