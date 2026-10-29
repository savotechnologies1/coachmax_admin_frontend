import { APP_TIME_ZONE, formatDateOnly, formatTime, formatTimestampDate, toDateOnly } from "../../../utils/dateTime";
import leagueService, { CreateFixturePayload } from "../../../services/leagueService";
import {
  League,
  Match,
  LeagueTeam,
  TeamStanding,
  LeagueStats,
  LeagueGraphs,
  BackendLeagueData,
  RoundSchedule,
  TeamRecord,
  GenerateFixturesResponse,
} from "../types/league";

function normalizeMatch(match: Match & { __v?: number }): Match {
  const matchDate = match.sessionDate ? toDateOnly(match.sessionDate) : match.kickoffTime ? toDateOnly(formatTimestampDate(match.kickoffTime, APP_TIME_ZONE)) : match.matchDate;
  return { ...match, version: match.version ?? match.__v, matchDate, matchDateFormatted: matchDate ? formatDateOnly(matchDate) : "", time: match.kickoffTime ? formatTime(match.kickoffTime, APP_TIME_ZONE) : match.time, homeScore: match.score?.homeScore ?? match.homeScore, awayScore: match.score?.awayScore ?? match.awayScore };
}

// Master Fetch Endpoint
export const getLeagueMasterData = async (leagueId: string): Promise<BackendLeagueData> => {
  const res = await leagueService.getLeagueData(leagueId);
  const data = res?.data || res;
  if (!data || !(data.league || data.details)) throw new Error("The server returned incomplete league data. Please retry.");
  return { ...data, league: data.league || data.details, details: data.details || data.league };
};

export const getLeagueById = async (leagueId: string): Promise<League> => {
  const master = await getLeagueMasterData(leagueId);
  return master.league || master.details;
};

export const updateLeagueDetails = async (
  leagueId: string,
  payload: Partial<League>,
  file?: File
): Promise<any> => {
  const formData = new FormData();
  if (payload.name) formData.append("name", payload.name);
  if (payload.season) formData.append("season", payload.season);
  if (payload.type || payload.competitionScope) {
    formData.append("competitionScope", payload.type || payload.competitionScope || "NATIONAL");
    formData.append("type", payload.type || payload.competitionScope || "NATIONAL");
  }
  if (payload.description !== undefined) formData.append("description", payload.description);
  if (payload.startDate) formData.append("startDate", payload.startDate);
  if (payload.endDate) formData.append("endDate", payload.endDate);
  if (payload.registrationStartDate || payload.registrationOpenDate) {
    formData.append(
      "registrationStartDate",
      payload.registrationStartDate || payload.registrationOpenDate || ""
    );
  }
  if (payload.registrationEndDate || payload.registrationCloseDate) {
    formData.append(
      "registrationEndDate",
      payload.registrationEndDate || payload.registrationCloseDate || ""
    );
  }
  if (payload.status) formData.append("status", payload.status);
  if (payload.visibility) formData.append("visibility", payload.visibility);
  if (payload.pointsForWin !== undefined) formData.append("pointsForWin", String(payload.pointsForWin));
  if (payload.pointsForDraw !== undefined) formData.append("pointsForDraw", String(payload.pointsForDraw));
  if (payload.allowDraws !== undefined) formData.append("allowDraws", String(payload.allowDraws));
  if (payload.automaticLadderRecalculation !== undefined) {
    formData.append(
      "automaticLadderRecalculation",
      String(payload.automaticLadderRecalculation)
    );
  }
  if (file) {
    formData.append("leagueLogo", file);
  }

  return leagueService.updateLeagueConfig(leagueId, formData);
};

export const getLeagueLadder = async (leagueId: string): Promise<TeamStanding[]> => {
  const master = await getLeagueMasterData(leagueId);
  if (Array.isArray(master.ladder) && master.ladder.length > 0) {
    return master.ladder;
  }

  // If ladder array is empty, construct standings from participating teams
  const teams = master.teams || master.teamManagement || [];
  if (Array.isArray(teams) && teams.length > 0) {
    return teams.map((t: any, idx: number) => {
      const rec = t.record || {};
      const teamName = t.teamName || t.name || `Team ${idx + 1}`;
      return {
        rank: idx + 1,
        position: idx + 1,
        teamId: t._id,
        teamName,
        teamLogo: t.logo || "",
        team: {
          _id: t._id,
          teamName,
          logo: t.logo || "",
          ageGroup: t.ageGroup || "",
        },
        played: rec.played ?? 0,
        won: rec.won ?? 0,
        drawn: rec.drawn ?? rec.draw ?? 0,
        draw: rec.drawn ?? rec.draw ?? 0,
        lost: rec.lost ?? 0,
        goalsFor: rec.goalsFor ?? 0,
        goalsAgainst: rec.goalsAgainst ?? 0,
        goalDifference: rec.goalDifference ?? 0,
        points: rec.points ?? 0,
      };
    });
  }

  return [];
};

export const getLeagueSchedule = async (leagueId: string, round?: number): Promise<RoundSchedule[]> => {
  const master = await getLeagueMasterData(leagueId);
  let sched = master.schedule || [];
  if (Array.isArray(sched) && sched.length > 0) {
    if (round) {
      sched = sched.filter((s) => s.round === round);
    }
    return sched.map((round) => ({ ...round, matches: (round.matches || []).map(normalizeMatch) }));
  }

  // Check if fixtures are returned at top level
  const fixtures: Match[] = (master as any).fixtures || [];
  if (Array.isArray(fixtures) && fixtures.length > 0) {
    const roundsMap: { [key: number]: Match[] } = {};
    fixtures.forEach((f) => {
      const r = f.round || 1;
      if (!roundsMap[r]) roundsMap[r] = [];
      roundsMap[r].push(f);
    });
    return Object.keys(roundsMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((rNum) => ({
        round: rNum,
        roundName: `Round ${rNum}`,
        matches: roundsMap[rNum].map(normalizeMatch),
      }));
  }

  return [];
};

export const getLeagueMatches = async (leagueId: string): Promise<Match[]> => {
  const master = await getLeagueMasterData(leagueId);
  if (Array.isArray((master as any).fixtures) && (master as any).fixtures.length > 0) {
    return (master as any).fixtures.map(normalizeMatch);
  }
  const schedules = await getLeagueSchedule(leagueId);
  const allMatches: Match[] = [];
  schedules.forEach((round) => {
    if (Array.isArray(round.matches)) {
      round.matches.forEach((m) => {
        allMatches.push({
          ...m,
          round: m.round || round.round,
          roundName: m.roundName || round.roundName,
        });
      });
    }
  });

  if (allMatches.length > 0) return allMatches.map(normalizeMatch);
  return [];
};

export const generateRandomFixtures = async (leagueId: string, forceRegenerate = false): Promise<GenerateFixturesResponse> => leagueService.generateRandomFixtures(leagueId, forceRegenerate);

export const createManualFixture = async (
  leagueId: string,
  matchData: any
): Promise<any> => {
  return createLeagueMatch(leagueId, {
    ...matchData,
    fixtureSource: "MANUAL",
    isManuallyModified: true,
  });
};

export const updateFixtureManually = async (leagueId: string, fixtureId: string, payload: any): Promise<any> => leagueService.updateFixtureManually(leagueId, fixtureId, { ...payload, fixtureSource: "MANUAL", isManuallyModified: true });

export const deleteFixture = async (
  leagueId: string,
  fixtureId: string
): Promise<any> => {
  return deleteLeagueMatch(leagueId, fixtureId);
};

export const createLeagueMatch = async (
  leagueId: string,
  matchData: Partial<Match>
): Promise<any> => {
  if (!matchData.kickoffTime) throw new Error("A valid kickoff date and time is required.");
  const fixturePayload: CreateFixturePayload = {
    league: leagueId,
    round: matchData.round || 1,
    kickoffTime: matchData.kickoffTime || "",
    sessionDate: matchData.sessionDate,
    venue: matchData.venue || matchData.field || "Field 1",
    field: matchData.field || "Field 1",
    referee: matchData.referee,
    homeTeam: matchData.homeTeam?._id || "",
    awayTeam: matchData.awayTeam?._id || "",
  };

  return leagueService.createFixture(fixturePayload);
};

export const updateLeagueMatch = async (leagueId: string, matchId: string, matchData: Partial<Match>): Promise<any> => normalizeMatch(await leagueService.updateFixtureManually(leagueId, matchId, {
  ...matchData,
  homeTeam: matchData.homeTeam?._id,
  awayTeam: matchData.awayTeam?._id,
}));

export const deleteLeagueMatch = async (leagueId: string, matchId: string): Promise<any> => leagueService.deleteLeagueFixture(leagueId, matchId);
export const deleteLeagueRound = async (leagueId: string, roundNumber: number | string): Promise<any> => leagueService.deleteRound(leagueId, roundNumber);

export const getLeagueTeams = async (leagueId: string): Promise<LeagueTeam[]> => {
  const master = await getLeagueMasterData(leagueId);
  return master.teams || master.teamManagement || [];
};

export const addTeamToLeague = async (leagueId: string, teamIds: string[]): Promise<any> => leagueService.addTeamToLeague(leagueId, teamIds);
export const removeTeamFromLeague = async (leagueId: string, teamId: string): Promise<any> => leagueService.removeTeamFromLeague(leagueId, teamId);
export const toggleTeamStatus = async (leagueId: string, teamId: string, status: "ACTIVE" | "INACTIVE"): Promise<any> => leagueService.updateLeagueTeamStatus(leagueId, teamId, status);

export const getLeagueStats = async (leagueId: string): Promise<LeagueStats> => {
  const master = await getLeagueMasterData(leagueId);
  return master.stats;
};

export const getLeagueGraphs = async (leagueId: string): Promise<LeagueGraphs> => {
  const master = await getLeagueMasterData(leagueId);
  return master.graphs;
};

export const recalculateLeagueLadder = async (leagueId: string): Promise<any> => leagueService.recalculateLadder(leagueId);
export const updateLeagueTeamStats = async (leagueId: string, teamId: string, stats: Partial<TeamRecord>): Promise<any> => leagueService.updateLeagueTeamStats(leagueId, teamId, stats);

export const updateTeamGlobalStats = async (
  teamId: string,
  stats: Partial<TeamRecord>
): Promise<any> => {
  return await leagueService.updateTeamStats(teamId, stats);
};
