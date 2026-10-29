import { useQuery } from "@tanstack/react-query";
import { getLeagueStats } from "../api/leagueApi";
import { LeagueStats } from "../types/league";

export const useLeagueStats = (leagueId: string) => {
  return useQuery<LeagueStats>({
    queryKey: ["leagueStats", leagueId],
    queryFn: () => getLeagueStats(leagueId),
    enabled: !!leagueId,
  });
};
