export type LeagueType = "NATIONAL" | "STATE" | "LOCAL" | "INTERNAL" | "INTERNATIONAL";

export interface TeamSummary {
  _id: string;
  teamName: string;
  logo?: string;
}

export type MatchStatus =
  | "Scheduled"
  | "SCHEDULED"
  | "Live"
  | "LIVE"
  | "Completed"
  | "COMPLETED"
  | "Cancelled"
  | "CANCELLED"
  | "Postponed"
  | "POSTPONED";

export interface League {
  _id: string;
  name: string;
  season: string;
  term?: string | { _id: string; year?: number; name?: string };
  type: LeagueType | string;
  competitionScope?: string;
  description?: string;
  logo?: string;
  startDate?: string;
  endDate?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  registrationOpenDate?: string;
  registrationCloseDate?: string;
  status?: "Active" | "ACTIVE" | "Upcoming" | "Completed" | "Draft" | string;
  visibility?: "Public" | "PUBLIC" | "Internal" | "INTERNAL" | string;
  allowDraws?: boolean;
  automaticLadderRecalculation?: boolean;
  autoLadderCalculation?: boolean;
  pointsForWin?: number;
  pointsForDraw?: number;
  pointsForLoss?: number;
  // Fixture configuration fields
  generationType?: "AUTOMATIC" | "MANUAL";
  fixtureFormat?: "ROUND_ROBIN" | "KNOCKOUT";
  numberOfRounds?: number;        // Total rounds in schedule
  sessionDates?: string[];        // Dates assigned to each round (length matches numberOfRounds)
  fee?: number;                   // League tournament fee per player
  venue?: string;                 // Venue facility name
  matchDuration?: number;         // Minutes (e.g. 90)
  breakBetweenMatches?: number;   // Minutes (e.g. 15)
  numberOfFields?: number;        // e.g. 2
  startTime?: string;             // e.g. "10:00"
  fixtureGenerated?: boolean;
  groupCount?: number;
  teams?: TeamSummary[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CoachRef {
  _id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  profileImage?: string;
}

export interface TeamRecord {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  points?: number;
}

export interface LeagueTeam {
  _id: string;
  name?: string;
  teamName?: string;
  logo?: string;
  ageGroup?: string;
  teamType?: string;
  coach?: CoachRef | string;
  coachEmail?: string;
  playersCount: number;
  wins?: number;
  losses?: number;
  draws?: number;
  status: "ACTIVE" | "INACTIVE" | string;
  record?: TeamRecord;
}

export interface MatchTeamRef {
  _id: string;
  name?: string;
  teamName?: string;
  logo?: string;
}

export interface MatchScore {
  homeScore: number | null;
  awayScore: number | null;
}

export interface MatchStatistics {
  homePossession?: number;
  awayPossession?: number;
  homeShots?: number;
  awayShots?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homeCorners?: number;
  awayCorners?: number;
  homeFouls?: number;
  awayFouls?: number;
  homeYellowCards?: number;
  awayYellowCards?: number;
}

export type FixtureStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "POSTPONED" | "CANCELLED";
export type FixtureSource = "GENERATED" | "MANUAL";

export interface GenerateFixturesResponse {
  success: boolean;
  message: string;
  data: {
    leagueId: string;
    teams: number;
    rounds: number;
    fixtures: number;
    created: number;             // Count of newly inserted records (first generation)
    updated: number;             // Count of in-place updated records (subsequent generations)
    deleted?: number;
    manualFixturesPreserved: number; // Count of manual fixtures left untouched
    byes: number;                // Virtual BYEs (odd teams)
    daysUsed?: number;
  };
}

export interface PopulatedGoalPlayer {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profileImage?: string;
}

export interface PopulatedGoalTeam {
  _id: string;
  teamName?: string;
  logo?: string;
}

export interface MatchGoal {
  id?: string;
  _id?: string;
  teamId?: string;
  team?: string | PopulatedGoalTeam;
  scorerId?: string;
  scorer?: string | PopulatedGoalPlayer;
  assistId?: string;
  assist?: string | PopulatedGoalPlayer | null;
  minute?: number;
}

export interface Match {
  _id: string;
  version?: number;
  leagueId?: string;
  league?: string;
  round: number;
  roundName?: string;
  kickoffTime?: string;
  sessionDate?: string;
  endTime?: string;
  matchDate?: string;
  matchDateFormatted?: string;
  time?: string;
  field?: string;
  venue?: string;
  group?: string;
  referee?: string;
  homeTeam: MatchTeamRef;
  awayTeam: MatchTeamRef;
  score?: MatchScore;
  homeScore?: number | null;
  awayScore?: number | null;
  status: MatchStatus;
  matchStatistics?: MatchStatistics;
  goals?: MatchGoal[];
  notes?: string;
  fixtureSource?: FixtureSource | string;
  isManuallyModified?: boolean;
}

export interface RoundSchedule {
  round: number;
  roundName: string;
  matches: Match[];
}

export interface TeamStanding {
  rank?: number;
  position?: number;
  standingId?: string;
  teamId?: string;
  teamName?: string;
  teamLogo?: string;
  team?: {
    _id: string;
    teamName: string;
    logo?: string;
  };
  played: number;
  won: number;
  drawn?: number;
  draw?: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface PlayerLeaderboardEntry {
  playerId: string;
  playerName: string;
  profileImage?: string;
  teamId: string;
  teamName: string;
  teamLogo?: string;
  goals: number;
  assists: number;
  appearances: number;
  totalPoints: number;
  goalsPerMatch?: number;
}

export interface LeagueStats {
  totalTeams: number;
  totalMatches: number;
  matchesPlayed: number;
  goalsScored: number;
  avgGoalsPerMatch: number;
  teamVsGoals?: {
    teamId?: string;
    teamName: string;
    logo?: string;
    goals: number;
  }[];
  resultsDistribution: {
    decisiveWins?: number;
    draws: number;
    competitiveGames?: number;
    wins?: number;
    losses?: number;
    totalCompleted?: number;
  };
  topScoringTeams: {
    teamId?: string;
    teamName: string;
    goals: number;
    logo?: string;
  }[];
  teamGoals?: {
    teamName: string;
    goals: number;
  }[];
  topScorers?: PlayerLeaderboardEntry[];
  topAssists?: PlayerLeaderboardEntry[];
  topPerformers?: PlayerLeaderboardEntry[];
}

export interface LeagueGraphs {
  goalsPerRoundTrend: {
    round: number;
    roundLabel: string;
    totalGoals: number;
  }[];
  pointsProgression: {
    teamId?: string;
    teamName: string;
    logo?: string;
    progression: {
      round: number;
      roundLabel: string;
      points: number;
    }[];
  }[];
  teamWinEfficiency: {
    teamId?: string;
    teamName: string;
    logo?: string;
    played: number;
    won: number;
    winEfficiency: number;
  }[];
}

export interface BackendLeagueData {
  league: League;
  kpis?: {
    totalTeams: number;
    totalMatches: number;
    matchesPlayed: number;
    goalsScored: number;
    avgGoalsPerMatch: number;
  };
  ladder: TeamStanding[];
  schedule: RoundSchedule[];
  teams: LeagueTeam[];
  stats: LeagueStats;
  graphs: LeagueGraphs;
  details: League;
  teamManagement?: LeagueTeam[];
}
