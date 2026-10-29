import { useQuery } from "@tanstack/react-query";
import { getLeagueGraphs } from "../api/leagueApi";
import { LeagueGraphs } from "../types/league";

export const useLeagueGraphs = (leagueId: string) => {
  return useQuery<LeagueGraphs>({
    queryKey: ["leagueGraphs", leagueId],
    queryFn: () => getLeagueGraphs(leagueId),
    enabled: !!leagueId,
  });
};
