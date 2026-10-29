import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeagueById, updateLeagueDetails } from "../api/leagueApi";
import { League } from "../types/league";
import { toast } from "react-hot-toast";

export const useLeague = (leagueId: string) => {
  return useQuery<League>({
    queryKey: ["league", leagueId],
    queryFn: () => getLeagueById(leagueId),
    enabled: !!leagueId,
  });
};

export const useUpdateLeague = (leagueId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { data: Partial<League>; file?: File } | Partial<League>) => {
      if ("data" in payload) {
        return updateLeagueDetails(leagueId, payload.data, payload.file);
      }
      return updateLeagueDetails(leagueId, payload);
    },
    onSuccess: () => {
      ["leagueTeams", "leagueLadder", "leagueMatches", "leagueSchedule", "leagueStats", "leagueGraphs"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key, leagueId] }));
      ["teams", "team", "invoices"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      queryClient.invalidateQueries({ queryKey: ["league", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      toast.success("League details updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update league");
    },
  });
};
