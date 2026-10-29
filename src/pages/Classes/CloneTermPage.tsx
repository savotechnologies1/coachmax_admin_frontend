import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import PageMeta from "../../components/common/PageMeta";

import apiClient from "../../api/apiClient";
import { getCloneTermInfo, streamCloneTerm, type CloneProgress, type CloneTermInfo } from "../../api/cloneTermApi";
import { useTerms } from "../../hooks/useTerms";
import Select from "../../components/form/Select";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button/Button";
import { successToast, errorToast } from "../../utils/toast";
import { getMediaUrl } from "../../utils/media";
import { formatDateOnly } from "../../utils/dateTime";
import FormHeader from "../../components/form/FormHeader";
import {
  Calendar,
  User,
  ArrowRight,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  BookOpen,
  Users,
  Info,
  Trophy,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";

interface Player {
  _id: string;
  name: string;
  paymentStatus?: string;
  selected?: boolean;
}

interface ClassPreview {
  classId: string;
  name: string;
  category: string;
  program: string;
  coach: string;
  playerCount: number;
  alreadyExists: boolean;
  players: Player[];
  selected?: boolean;
  allSelected?: boolean;
}

interface TeamPreview {
  teamId: string;
  teamName: string;
  logo?: string;
  coach?: string;
  playerCount: number;
  alreadyExists: boolean;
  selected?: boolean;
  players: Player[];
}

interface LeaguePreview {
  leagueId: string;
  name: string;
  season?: string;
  fixtureFormat?: string;
  numberOfRounds?: number;
  teamsCount?: number;
  alreadyExists: boolean;
  selected?: boolean;
  teams: TeamPreview[];
}

interface Term {
  _id: string;
  name: string;
  year: number;
  status?: string;
}

const cloneStageLabel: Record<CloneProgress["stage"], string> = {
  preparing: "Preparing",
  classes: "Classes",
  teams: "Teams",
  leagues: "Leagues",
  saving: "Saving",
  complete: "Complete",
};

function TermInventory({ termId, info, loading, error, onRetry, accent }: {
  termId: string;
  info?: CloneTermInfo;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  accent: "blue" | "green";
}) {
  const counts = info?.counts;
  const groups = info ? [
    { title: "Classes", items: info.classes.map((item) => ({ id: item._id, name: item.name, detail: [item.dayOfWeek, item.startTime].filter(Boolean).join(" · "), count: `${item.playerCount} players` })) },
    { title: "Leagues", items: info.leagues.map((item) => ({ id: item._id, name: item.name, detail: item.season || "", count: `${item.teamCount} teams` })) },
    { title: "Teams", items: info.teams.map((item) => ({ id: item._id, name: item.name, detail: item.leagueNames.join(", "), count: `${item.playerCount} players` })) },
  ] : [];

  return <>
    <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
      {(["classes", "leagues", "teams", "players"] as const).map((key) => <div key={key}>
        <div className={`text-sm font-black ${key === "leagues" ? accent === "blue" ? "text-[#0047FF]" : "text-emerald-600" : "text-slate-800 dark:text-white"}`}>
          {termId ? loading ? "…" : counts?.[key] ?? "—" : "—"}
        </div>
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{key}</div>
      </div>)}
    </div>
    {termId && <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800" aria-live="polite">
      {loading && <p className="text-xs text-slate-500">Loading term information…</p>}
      {error && <div className="text-xs text-rose-600">{error} <button type="button" onClick={onRetry} className="font-bold underline">Retry</button></div>}
      {info && !loading && <div className="space-y-3">
        {groups.map((group) => <section key={group.title}>
          <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{group.title} ({group.items.length})</h5>
          {group.items.length === 0 ? <p className="text-[11px] text-slate-400">None in this term</p> : <>
            {group.items.slice(0, 3).map((item) => <div key={item.id} className="flex items-start justify-between gap-2 border-b border-slate-100 py-1.5 text-[11px] last:border-0 dark:border-slate-800">
              <span className="min-w-0"><strong className="block truncate text-slate-800 dark:text-white">{item.name}</strong>{item.detail && <span className="block truncate text-slate-500">{item.detail}</span>}</span>
              <span className="shrink-0 text-slate-500">{item.count}</span>
            </div>)}
            {group.items.length > 3 && <details className="text-[11px]">
              <summary className="cursor-pointer font-bold text-[#0047FF]">Show {group.items.length - 3} more</summary>
              {group.items.slice(3).map((item) => <div key={item.id} className="flex items-start justify-between gap-2 border-b border-slate-100 py-1.5 dark:border-slate-800">
                <span className="min-w-0"><strong className="block truncate text-slate-800 dark:text-white">{item.name}</strong>{item.detail && <span className="block truncate text-slate-500">{item.detail}</span>}</span>
                <span className="shrink-0 text-slate-500">{item.count}</span>
              </div>)}
            </details>}
          </>}
        </section>)}
      </div>}
    </div>}
  </>;
}

export default function CloneTermPage() {
  const navigate = useNavigate();
  const [terms, setTerms] = useState<Term[]>([]);
  const [sourceTermId, setSourceTermId] = useState("");
  const [targetTermId, setTargetTermId] = useState("");
  const [termSelectionErrors, setTermSelectionErrors] = useState<Record<string, string>>({});
  const [sourceYear, setSourceYear] = useState<string>("");
  const [targetYear, setTargetYear] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submittingClone, setSubmittingClone] = useState(false);

  // Preview Data
  const [previewClasses, setPreviewClasses] = useState<ClassPreview[]>([]);
  const [previewLeagues, setPreviewLeagues] = useState<LeaguePreview[]>([]);

  const [step, setStep] = useState(1); // 1 = Select Terms, 2 = Preview & Select Items
  const [previewTab, setPreviewTab] = useState<"all" | "classes" | "leagues">("all");
  const [activeTab, setActiveTab] = useState<"terms" | "holiday">("terms");
  const [responseSourceTerm, setResponseSourceTerm] = useState<{ _id: string; name: string } | null>(null);
  const [responseTargetTerm, setResponseTargetTerm] = useState<{ _id: string; name: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLoaderModal, setShowLoaderModal] = useState(false);
  const [cloneProgress, setCloneProgress] = useState<CloneProgress | null>(null);

  // Class Selection states
  const [selectedClasses, setSelectedClasses] = useState<Record<string, boolean>>({});
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  // League Selection states
  const [selectedLeagues, setSelectedLeagues] = useState<Record<string, boolean>>({});
  const [selectedTeams, setSelectedTeams] = useState<Record<string, Record<string, boolean>>>({}); // leagueId -> teamId -> boolean
  const [selectedLeaguePlayers, setSelectedLeaguePlayers] = useState<
    Record<string, Record<string, Record<string, boolean>>>
  >({}); // leagueId -> teamId -> playerId -> boolean
  const [expandedLeagues, setExpandedLeagues] = useState<Record<string, boolean>>({});
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const isEventParam = activeTab === "terms" ? "false" : "true";
  const { terms: fetchedTerms } = useTerms({ isEvent: isEventParam });
  const sourceInfoQuery = useQuery({
    queryKey: ["cloneTermInfo", sourceTermId],
    queryFn: () => getCloneTermInfo(sourceTermId),
    enabled: Boolean(sourceTermId),
  });
  const targetInfoQuery = useQuery({
    queryKey: ["cloneTermInfo", targetTermId],
    queryFn: () => getCloneTermInfo(targetTermId),
    enabled: Boolean(targetTermId),
  });

  useEffect(() => {
    if (fetchedTerms) {
      setTerms(fetchedTerms as any);
      setSourceTermId("");
      setTargetTermId("");
      setSourceYear("");
      setTargetYear("");
    }
  }, [activeTab, fetchedTerms]);

  const getImageUrl = (path: string | undefined | null) => {
    return getMediaUrl(path) || null;
  };

  const handlePreview = async () => {
    const errors: Record<string, string> = {};
    if (!sourceTermId) {
      errors.sourceTerm = "Select a source term.";
    }
    if (!targetTermId) {
      errors.targetTerm = "Select a target term.";
    }
    if (sourceTermId && targetTermId && sourceTermId === targetTermId) {
      errors.targetTerm = "Choose a different target term from the source.";
    }
    setTermSelectionErrors(errors);
    if (Object.keys(errors).length) return;

    setLoadingPreview(true);
    try {
      const response = await apiClient.post("/api/admin/cloneTerm/preview", {
        sourceTermId,
        targetTermId,
      });

      if (response.data && response.data.success) {
        const classesList: ClassPreview[] = response.data.classes || [];
        const leaguesList: LeaguePreview[] = response.data.leagues || [];

        setPreviewClasses(classesList);
        setPreviewLeagues(leaguesList);
        setResponseSourceTerm(response.data.sourceTerm || null);
        setResponseTargetTerm(response.data.targetTerm || null);

        // 1. Initialize Class selections (default to selected if not alreadyExists)
        const classesSel: Record<string, boolean> = {};
        const playersSel: Record<string, Record<string, boolean>> = {};

        classesList.forEach((cls) => {
          const isClsSelected = cls.selected !== false && !cls.alreadyExists;
          classesSel[cls.classId] = isClsSelected;
          playersSel[cls.classId] = {};
          (cls.players || []).forEach((p) => {
            playersSel[cls.classId][p._id] = isClsSelected && p.selected !== false;
          });
        });

        // 2. Initialize League selections (default to selected if not alreadyExists)
        const leaguesSel: Record<string, boolean> = {};
        const teamsSel: Record<string, Record<string, boolean>> = {};
        const leaguePlayersSel: Record<string, Record<string, Record<string, boolean>>> = {};

        leaguesList.forEach((lg) => {
          const isLgSelected = lg.selected !== false && !lg.alreadyExists;
          leaguesSel[lg.leagueId] = isLgSelected;
          teamsSel[lg.leagueId] = {};
          leaguePlayersSel[lg.leagueId] = {};

          (lg.teams || []).forEach((t) => {
            const isTeamSelected = isLgSelected && t.selected !== false && !t.alreadyExists;
            teamsSel[lg.leagueId][t.teamId] = isTeamSelected;
            leaguePlayersSel[lg.leagueId][t.teamId] = {};

            (t.players || []).forEach((p) => {
              leaguePlayersSel[lg.leagueId][t.teamId][p._id] = isTeamSelected && p.selected !== false;
            });
          });
        });

        setSelectedClasses(classesSel);
        setSelectedPlayers(playersSel);
        setSelectedLeagues(leaguesSel);
        setSelectedTeams(teamsSel);
        setSelectedLeaguePlayers(leaguePlayersSel);

        // Default open preview tab
        if (classesList.length > 0 && leaguesList.length === 0) {
          setPreviewTab("classes");
        } else if (leaguesList.length > 0 && classesList.length === 0) {
          setPreviewTab("leagues");
        } else {
          setPreviewTab("all");
        }

        setStep(2);
      } else {
        errorToast(response.data?.message || "Failed to fetch preview information.");
      }
    } catch (error: any) {
      console.error("Preview error:", error);
      errorToast(error.response?.data?.message || "Error fetching preview data.");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Toggle single class checkbox
  const handleToggleClass = (classId: string) => {
    const nextVal = !selectedClasses[classId];
    setSelectedClasses((prev) => ({ ...prev, [classId]: nextVal }));

    const cls = previewClasses.find((c) => c.classId === classId);
    if (cls) {
      setSelectedPlayers((prev) => {
        const classPlayers = { ...prev[classId] };
        (cls.players || []).forEach((p) => {
          classPlayers[p._id] = nextVal;
        });
        return { ...prev, [classId]: classPlayers };
      });
    }
  };

  // Toggle single player under class
  const handleTogglePlayer = (classId: string, playerId: string) => {
    setSelectedPlayers((prev) => {
      const classPlayers = { ...prev[classId] };
      const nextVal = !classPlayers[playerId];
      classPlayers[playerId] = nextVal;

      if (nextVal) {
        setSelectedClasses((prevClasses) => ({ ...prevClasses, [classId]: true }));
      }
      return { ...prev, [classId]: classPlayers };
    });
  };

  // Toggle single league checkbox (and all teams & team players under it)
  const handleToggleLeague = (leagueId: string) => {
    const nextVal = !selectedLeagues[leagueId];
    setSelectedLeagues((prev) => ({ ...prev, [leagueId]: nextVal }));

    const lg = previewLeagues.find((l) => l.leagueId === leagueId);
    if (lg) {
      setSelectedTeams((prev) => {
        const leagueTeams = { ...prev[leagueId] };
        (lg.teams || []).forEach((t) => {
          leagueTeams[t.teamId] = nextVal;
        });
        return { ...prev, [leagueId]: leagueTeams };
      });

      setSelectedLeaguePlayers((prev) => {
        const lgPlayerMap = { ...prev[leagueId] };
        (lg.teams || []).forEach((t) => {
          lgPlayerMap[t.teamId] = { ...(lgPlayerMap[t.teamId] || {}) };
          (t.players || []).forEach((p) => {
            lgPlayerMap[t.teamId][p._id] = nextVal;
          });
        });
        return { ...prev, [leagueId]: lgPlayerMap };
      });
    }
  };

  // Toggle single team under league (and its players)
  const handleToggleTeam = (leagueId: string, teamId: string) => {
    const nextVal = !selectedTeams[leagueId]?.[teamId];

    setSelectedTeams((prev) => ({
      ...prev,
      [leagueId]: {
        ...prev[leagueId],
        [teamId]: nextVal,
      },
    }));

    if (nextVal) {
      setSelectedLeagues((prev) => ({ ...prev, [leagueId]: true }));
    }

    const lg = previewLeagues.find((l) => l.leagueId === leagueId);
    const team = lg?.teams.find((t) => t.teamId === teamId);
    if (team) {
      setSelectedLeaguePlayers((prev) => ({
        ...prev,
        [leagueId]: {
          ...prev[leagueId],
          [teamId]: (team.players || []).reduce(
            (acc, p) => ({ ...acc, [p._id]: nextVal }),
            {}
          ),
        },
      }));
    }
  };

  // Toggle single player under a league team
  const handleToggleLeaguePlayer = (leagueId: string, teamId: string, playerId: string) => {
    setSelectedLeaguePlayers((prev) => {
      const lgMap = { ...prev[leagueId] };
      const teamMap = { ...(lgMap[teamId] || {}) };
      const nextVal = !teamMap[playerId];
      teamMap[playerId] = nextVal;

      if (nextVal) {
        setSelectedLeagues((prevLg) => ({ ...prevLg, [leagueId]: true }));
        setSelectedTeams((prevTeams) => ({
          ...prevTeams,
          [leagueId]: { ...prevTeams[leagueId], [teamId]: true },
        }));
      }

      return {
        ...prev,
        [leagueId]: {
          ...lgMap,
          [teamId]: teamMap,
        },
      };
    });
  };

  // Master Toggle: Select/Deselect All Across Classes & Leagues
  const isAllClassesSelected =
    previewClasses.length > 0 && previewClasses.every((c) => selectedClasses[c.classId]);
  const isAllLeaguesSelected =
    previewLeagues.length > 0 && previewLeagues.every((l) => selectedLeagues[l.leagueId]);
  const isGlobalAllSelected =
    (previewClasses.length === 0 || isAllClassesSelected) &&
    (previewLeagues.length === 0 || isAllLeaguesSelected) &&
    (previewClasses.length > 0 || previewLeagues.length > 0);

  const handleToggleGlobalAll = () => {
    const nextVal = !isGlobalAllSelected;

    // Toggle Classes
    const classesSel: Record<string, boolean> = {};
    const playersSel: Record<string, Record<string, boolean>> = {};
    previewClasses.forEach((cls) => {
      classesSel[cls.classId] = nextVal;
      playersSel[cls.classId] = {};
      (cls.players || []).forEach((p) => {
        playersSel[cls.classId][p._id] = nextVal;
      });
    });

    // Toggle Leagues
    const leaguesSel: Record<string, boolean> = {};
    const teamsSel: Record<string, Record<string, boolean>> = {};
    const leaguePlayersSel: Record<string, Record<string, Record<string, boolean>>> = {};
    previewLeagues.forEach((lg) => {
      leaguesSel[lg.leagueId] = nextVal;
      teamsSel[lg.leagueId] = {};
      leaguePlayersSel[lg.leagueId] = {};
      (lg.teams || []).forEach((t) => {
        teamsSel[lg.leagueId][t.teamId] = nextVal;
        leaguePlayersSel[lg.leagueId][t.teamId] = {};
        (t.players || []).forEach((p) => {
          leaguePlayersSel[lg.leagueId][t.teamId][p._id] = nextVal;
        });
      });
    });

    setSelectedClasses(classesSel);
    setSelectedPlayers(playersSel);
    setSelectedLeagues(leaguesSel);
    setSelectedTeams(teamsSel);
    setSelectedLeaguePlayers(leaguePlayersSel);
  };

  const handleToggleExpandClass = (classId: string) => {
    setExpandedClasses((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  const handleToggleExpandLeague = (leagueId: string) => {
    setExpandedLeagues((prev) => ({ ...prev, [leagueId]: !prev[leagueId] }));
  };

  const handleToggleExpandTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // Compute selected counts
  const totalSelectedClasses = Object.values(selectedClasses).filter(Boolean).length;
  let totalSelectedClassPlayers = 0;
  Object.keys(selectedPlayers).forEach((cid) => {
    if (selectedClasses[cid]) {
      totalSelectedClassPlayers += Object.values(selectedPlayers[cid]).filter(Boolean).length;
    }
  });

  const totalSelectedLeagues = Object.values(selectedLeagues).filter(Boolean).length;
  let totalSelectedTeams = 0;
  let totalSelectedLeaguePlayers = 0;
  Object.keys(selectedTeams).forEach((lid) => {
    if (selectedLeagues[lid]) {
      Object.keys(selectedTeams[lid] || {}).forEach((tid) => {
        if (selectedTeams[lid][tid]) {
          totalSelectedTeams += 1;
          const pMap = selectedLeaguePlayers[lid]?.[tid] || {};
          totalSelectedLeaguePlayers += Object.values(pMap).filter(Boolean).length;
        }
      });
    }
  });

  const totalSelectedItems = totalSelectedClasses + totalSelectedLeagues;

  const handleCloneClick = () => {
    if (totalSelectedItems === 0) {
      errorToast("No classes or leagues selected for cloning.");
      return;
    }
    setShowConfirmModal(true);
  };

  const executeClone = async () => {
    setShowConfirmModal(false);
    setCloneProgress(null);
    setShowLoaderModal(true);
    setSubmittingClone(true);

    const payloadClasses = previewClasses
      .filter((cls) => selectedClasses[cls.classId])
      .map((cls) => {
        const classPlayerIds = (cls.players || [])
          .filter((p) => selectedPlayers[cls.classId]?.[p._id])
          .map((p) => p._id);
        return {
          classId: cls.classId,
          players: classPlayerIds,
        };
      });

    const payloadLeagues = previewLeagues
      .filter((lg) => selectedLeagues[lg.leagueId])
      .map((lg) => {
        const selectedTeamObjects = (lg.teams || [])
          .filter((t) => selectedTeams[lg.leagueId]?.[t.teamId])
          .map((t) => {
            const teamPlayerIds = (t.players || [])
              .filter((p) => selectedLeaguePlayers[lg.leagueId]?.[t.teamId]?.[p._id])
              .map((p) => p._id);
            return {
              teamId: t.teamId,
              players: teamPlayerIds,
            };
          });

        return {
          leagueId: lg.leagueId,
          teams: selectedTeamObjects,
        };
      });

    try {
      const response = await streamCloneTerm({
        sourceTermId,
        targetTermId,
        classes: payloadClasses,
        leagues: payloadLeagues,
      }, setCloneProgress);

      if (response.success) {
        successToast("Term data (classes, leagues & teams) cloned successfully!");
        await new Promise((resolve) => setTimeout(resolve, 600));
        setShowLoaderModal(false);
        navigate("/classes", {
          replace: true,
          state: { termId: targetTermId, year: targetTermObj?.year, viewAll: true },
        });
      } else {
        errorToast(response.message || "Failed to clone term.");
        setShowLoaderModal(false);
      }
    } catch (error: any) {
      console.error("Clone error:", error);
      errorToast(error.message || "Error during clone operation.");
      setShowLoaderModal(false);
    } finally {
      setSubmittingClone(false);
    }
  };

  const handleSourceYearChange = (val: string) => {
    setSourceYear(val);
    setSourceTermId("");
  };

  const handleTargetYearChange = (val: string) => {
    setTargetYear(val);
    setTargetTermId("");
  };

  const uniqueYears = Array.from(new Set(terms.map((t) => t.year))).sort((a, b) => b - a);
  const yearOptions = [
    { label: "All Years", value: "" },
    ...uniqueYears.map((yr) => ({ label: String(yr), value: String(yr) })),
  ];

  const sourceTermOptions = terms
    .filter((t) => !sourceYear || String(t.year) === sourceYear)
    .map((t) => ({
      label: `${t.name} (${t.year})`,
      value: t._id,
    }));

  const targetTermOptions = terms
    .filter((t) => !targetYear || String(t.year) === targetYear)
    .map((t) => ({
      label: `${t.name} (${t.year})`,
      value: t._id,
    }));

  const sourceTermObj = terms.find((t) => t._id === sourceTermId);
  const targetTermObj = terms.find((t) => t._id === targetTermId);

  return (
    <>
      <PageMeta title="CoachMax | Clone Term" description="Clone classes, leagues, teams, and players to a new term" />
      <div className="space-y-6" data-coachmax-form>
        <FormHeader
          icon={Layers}
          title="Clone Term"
          description="Copy classes, leagues, teams, and player rosters to a new term."
          actions={(
            <button
              type="button"
              onClick={() => navigate("/coaching-management")}
              className="inline-flex items-center justify-center rounded-md bg-[#0047FF] hover:bg-blue-700 px-4 py-2.5 text-center text-xs font-bold text-white transition-colors shadow-theme-xs shrink-0"
            >
              + Create Term
            </button>
          )}
        />

        {/* Step Indicator Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 mb-6 shadow-theme-xs max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
            {/* Step 1 */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${step === 1
                  ? "bg-[#0047FF] text-white ring-4 ring-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
              >
                1
              </div>
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">Select Terms</div>
                <div className="text-[10px] text-slate-400 font-medium">Choose source & target</div>
              </div>
            </div>

            {/* Line 1 */}
            <div className="hidden md:block flex-1 max-w-[100px] h-[2px] bg-slate-200 dark:bg-slate-700" />

            {/* Step 2 */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${step === 2
                  ? "bg-[#0047FF] text-white ring-4 ring-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
              >
                2
              </div>
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">
                  Review & Customize
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Select classes, leagues & teams</div>
              </div>
            </div>

            {/* Line 2 */}
            <div className="hidden md:block flex-1 max-w-[100px] h-[2px] bg-slate-200 dark:bg-slate-700" />

            {/* Step 3 */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${step === 3 || submittingClone
                  ? "bg-[#0047FF] text-white ring-4 ring-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
              >
                3
              </div>
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">Clone Complete</div>
                <div className="text-[10px] text-slate-400 font-medium">Confirm & finish</div>
              </div>
            </div>
          </div>
        </div>

        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto items-start">
            {/* Left Column - Main Selection Panel */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-8 shadow-theme-sm rounded-none">
                {/* Side-by-Side Term Metadata Cards */}
                <div className="flex flex-col md:flex-row items-stretch gap-6 mb-8">
                  {/* Source Card */}
                  <div className="flex-1 w-full bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 p-6 rounded-none relative transition-all hover:shadow-xs">
                    <div className="text-[10px] font-black text-[#0047FF] uppercase tracking-widest mb-3.5">Source Term</div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-none bg-[#0047FF]/10 flex items-center justify-center text-[#0047FF] shrink-0 shadow-theme-xs">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                            {sourceTermObj ? sourceTermObj.name : "Select Term"}
                          </h4>
                          {sourceTermObj && (
                            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-[#0047FF] text-white rounded-none shrink-0">
                              {sourceInfoQuery.data?.term.status || sourceTermObj.status || "Selected"}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {sourceTermObj ? `Year: ${sourceTermObj.year}` : "—"}
                        </p>
                        {sourceInfoQuery.data && <p className="mt-1 text-[10px] text-slate-500">{formatDateOnly(sourceInfoQuery.data.term.startDate)} – {formatDateOnly(sourceInfoQuery.data.term.endDate)}</p>}
                      </div>
                    </div>
                    <TermInventory termId={sourceTermId} info={sourceInfoQuery.data} loading={sourceInfoQuery.isLoading} error={sourceInfoQuery.error?.message} onRetry={() => void sourceInfoQuery.refetch()} accent="blue" />
                  </div>

                  {/* Arrow Indicator */}
                  <div className="w-10 h-10 self-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-theme-xs">
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>

                  {/* Target Card */}
                  <div className="flex-1 w-full bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-100 dark:border-emerald-900/20 p-6 rounded-none relative transition-all hover:shadow-xs">
                    <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3.5">Target Term</div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 shadow-theme-xs">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                            {targetTermObj ? targetTermObj.name : "Select Term"}
                          </h4>
                          {targetTermObj && (
                            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-emerald-500 text-white rounded-none shrink-0">
                              {targetInfoQuery.data?.term.status || targetTermObj.status || "Selected"}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {targetTermObj ? `Year: ${targetTermObj.year}` : "—"}
                        </p>
                        {targetInfoQuery.data && <p className="mt-1 text-[10px] text-slate-500">{formatDateOnly(targetInfoQuery.data.term.startDate)} – {formatDateOnly(targetInfoQuery.data.term.endDate)}</p>}
                      </div>
                    </div>
                    <TermInventory termId={targetTermId} info={targetInfoQuery.data} loading={targetInfoQuery.isLoading} error={targetInfoQuery.error?.message} onRetry={() => void targetInfoQuery.refetch()} accent="green" />
                  </div>
                </div>

                {/* Tab Buttons */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("terms")}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-[3px] text-center cursor-pointer ${activeTab === "terms"
                      ? "border-[#0047FF] text-[#0047FF]"
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      }`}
                  >
                    Terms
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("holiday")}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-[3px] text-center cursor-pointer ${activeTab === "holiday"
                      ? "border-[#0047FF] text-[#0047FF]"
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      }`}
                  >
                    Holiday Programs
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Source Selection Container */}
                    <div className="space-y-5 bg-slate-50/50 dark:bg-slate-800/10 p-5 rounded-none border border-slate-100 dark:border-slate-800">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0047FF]">Source configuration</h3>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Source Year</label>
                        <Select
                          value={sourceYear}
                          onChange={handleSourceYearChange}
                          options={yearOptions}
                          placeholder="All Years"
                          className="w-full"
                          triggerClassName="h-[46px] w-full flex items-center justify-between border px-4 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-800 dark:text-white transition-all cursor-pointer rounded-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="clone-source-term" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Source Term <span className="text-error-600">*</span></label>
                        <Select
                          id="clone-source-term"
                          value={sourceTermId}
                          onChange={(val) => {
                            setSourceTermId(val);
                            setTermSelectionErrors((previous) => {
                              const next = { ...previous };
                              delete next.sourceTerm;
                              if (val !== targetTermId) delete next.targetTerm;
                              return next;
                            });
                          }}
                          options={sourceTermOptions}
                          placeholder="Select Source Term"
                          className="w-full"
                          aria-required
                          aria-invalid={Boolean(termSelectionErrors.sourceTerm)}
                          aria-describedby={termSelectionErrors.sourceTerm ? "clone-source-term-error" : undefined}
                          triggerClassName="h-[46px] w-full flex items-center justify-between border px-4 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-800 dark:text-white transition-all cursor-pointer rounded-none"
                        />
                        {termSelectionErrors.sourceTerm && <p id="clone-source-term-error" role="alert" className="mt-1 text-sm text-error-600">{termSelectionErrors.sourceTerm}</p>}
                      </div>
                    </div>

                    {/* Target Selection Container */}
                    <div className="space-y-5 bg-slate-50/50 dark:bg-slate-800/10 p-5 rounded-none border border-slate-100 dark:border-slate-800">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Target configuration</h3>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Target Year</label>
                        <Select
                          value={targetYear}
                          onChange={handleTargetYearChange}
                          options={yearOptions}
                          placeholder="All Years"
                          className="w-full"
                          triggerClassName="h-[46px] w-full flex items-center justify-between border px-4 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-800 dark:text-white transition-all cursor-pointer rounded-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="clone-target-term" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Target Term <span className="text-error-600">*</span></label>
                        <Select
                          id="clone-target-term"
                          value={targetTermId}
                          onChange={(val) => {
                            setTargetTermId(val);
                            setTermSelectionErrors((previous) => {
                              const next = { ...previous };
                              delete next.targetTerm;
                              return next;
                            });
                          }}
                          options={targetTermOptions}
                          placeholder="Select Target Term"
                          className="w-full"
                          aria-required
                          aria-invalid={Boolean(termSelectionErrors.targetTerm)}
                          aria-describedby={termSelectionErrors.targetTerm ? "clone-target-term-error" : undefined}
                          triggerClassName="h-[46px] w-full flex items-center justify-between border px-4 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-800 dark:text-white transition-all cursor-pointer rounded-none"
                        />
                        {termSelectionErrors.targetTerm && <p id="clone-target-term-error" role="alert" className="mt-1 text-sm text-error-600">{termSelectionErrors.targetTerm}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handlePreview}
                      disabled={loadingPreview}
                      className="w-full flex items-center justify-center gap-2.5 rounded-none bg-[#0047FF] hover:bg-blue-700 disabled:bg-[#0047FF] disabled:opacity-50 disabled:cursor-not-allowed py-4 text-xs font-black uppercase tracking-wider text-white transition-colors cursor-pointer shadow-theme-xs"
                    >
                      {loadingPreview ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                          Loading Preview...
                        </>
                      ) : (
                        <>
                          <svg className="w-4.5 h-4.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview Clone Data
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* How it works info box */}
              <div className="bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-none">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-none bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider mb-1">How it works?</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[420px]">
                      Copy all selected classes, leagues, teams, and player assignments to the target term. You can customize which items to include before confirming.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800/80">
                  <div className="text-center">
                    <div className="w-9 h-9 rounded-none bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center mx-auto mb-1.5 shadow-theme-xs">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Classes</span>
                  </div>
                  <div className="text-center">
                    <div className="w-9 h-9 rounded-none bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-1.5 shadow-theme-xs">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Leagues</span>
                  </div>
                  <div className="text-center">
                    <div className="w-9 h-9 rounded-none bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto mb-1.5 shadow-theme-xs">
                      <Shield className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Teams</span>
                  </div>
                  <div className="text-center">
                    <div className="w-9 h-9 rounded-none bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-1.5 shadow-theme-xs">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Players</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Summary Panel */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-6 shadow-theme-sm rounded-none space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest border-b pb-3 mb-4">Term comparison</h3>
                <div className="flex flex-col items-center text-center py-6 bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-100 dark:border-slate-800 rounded-none">
                  <div className="w-14 h-14 bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center mb-3 rounded-none">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wide">Review both terms</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[200px] mt-1">
                    See what each term already contains. Continue to choose the items to clone.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-bold">
                <p className="text-right text-[10px] font-semibold text-slate-400">Source / Target</p>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <span className="text-slate-400 flex items-center gap-2 font-semibold">
                    <Calendar className="w-4 h-4 text-slate-400" /> Source Term
                  </span>
                  <span className="text-slate-800 dark:text-white">
                    {sourceTermObj ? sourceTermObj.name : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <span className="text-slate-400 flex items-center gap-2 font-semibold">
                    <Calendar className="w-4 h-4 text-slate-400" /> Target Term
                  </span>
                  <span className="text-slate-800 dark:text-white">
                    {targetTermObj ? targetTermObj.name : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <span className="text-slate-400 flex items-center gap-2 font-semibold">
                    <BookOpen className="w-4 h-4 text-slate-400" /> Classes
                  </span>
                  <span className="font-black text-slate-800 dark:text-white">
                    {sourceInfoQuery.data?.counts.classes ?? "—"} / {targetInfoQuery.data?.counts.classes ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <span className="text-slate-400 flex items-center gap-2 font-semibold">
                    <Trophy className="w-4 h-4 text-amber-500" /> Leagues
                  </span>
                  <span className="font-black text-[#0047FF]">
                    {sourceInfoQuery.data?.counts.leagues ?? "—"} / {targetInfoQuery.data?.counts.leagues ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <span className="text-slate-400 flex items-center gap-2 font-semibold">
                    <Shield className="w-4 h-4 text-purple-500" /> Teams
                  </span>
                  <span className="font-black text-slate-800 dark:text-white">
                    {sourceInfoQuery.data?.counts.teams ?? "—"} / {targetInfoQuery.data?.counts.teams ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <span className="text-slate-400 flex items-center gap-2 font-semibold">
                    <Users className="w-4 h-4 text-slate-400" /> Players
                  </span>
                  <span className="font-black text-slate-800 dark:text-white">
                    {sourceInfoQuery.data?.counts.players ?? "—"} / {targetInfoQuery.data?.counts.players ?? "—"}
                  </span>
                </div>
              </div>

              {/* Safe & Secure Alert */}
              <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-4 flex items-start gap-3 rounded-none">
                <div className="w-8 h-8 rounded-none bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 shadow-theme-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Safe & Secure</h5>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold leading-normal">
                    Existing data in target term will not be overwritten.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header info bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 shadow-theme-xs flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
                  Source: <span className="text-[#0047FF]">{(responseSourceTerm?.name || sourceTermObj?.name) ? `${responseSourceTerm?.name || sourceTermObj?.name} ${sourceTermObj?.year ? `(${sourceTermObj.year})` : ""}` : ""}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div className="px-3 py-1.5 bg-[#0047FF]/10 text-[#0047FF] font-bold text-xs uppercase tracking-wider">
                  Target: <span>{(responseTargetTerm?.name || targetTermObj?.name) ? `${responseTargetTerm?.name || targetTermObj?.name} ${targetTermObj?.year ? `(${targetTermObj.year})` : ""}` : ""}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-500 uppercase">Selected Summary</div>
                  <div className="text-sm font-black text-slate-800 dark:text-white">
                    {totalSelectedClasses} Classes ({totalSelectedClassPlayers} P) • {totalSelectedLeagues} Leagues ({totalSelectedTeams} T, {totalSelectedLeaguePlayers} P)
                  </div>
                </div>

                <button
                  onClick={handleCloneClick}
                  disabled={submittingClone || totalSelectedItems === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-none bg-[#0047FF] hover:bg-blue-700 disabled:bg-blue-300 px-6 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors cursor-pointer"
                >
                  Confirm Clone
                </button>
              </div>
            </div>

            {/* Sub-Tabs: All / Classes / Leagues */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 gap-1">
              <button
                type="button"
                onClick={() => setPreviewTab("all")}
                className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${previewTab === "all"
                  ? "bg-white dark:bg-slate-900 text-[#0047FF] shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
              >
                <Layers className="w-4 h-4" />
                All Items ({previewClasses.length + previewLeagues.length})
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("classes")}
                className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${previewTab === "classes"
                  ? "bg-white dark:bg-slate-900 text-[#0047FF] shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
              >
                <BookOpen className="w-4 h-4" />
                Classes ({previewClasses.length})
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("leagues")}
                className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${previewTab === "leagues"
                  ? "bg-white dark:bg-slate-900 text-[#0047FF] shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
              >
                <Trophy className="w-4 h-4" />
                Leagues & Teams ({previewLeagues.length})
              </button>
            </div>

            {/* List Selection Header with Select All */}
            <div className="bg-[#031549] text-white p-4 flex items-center justify-between">
              <button
                onClick={handleToggleGlobalAll}
                className="flex items-center gap-2.5 hover:text-blue-200 transition-colors text-xs font-black uppercase tracking-wider"
              >
                {isGlobalAllSelected ? <CheckSquare className="w-4.5 h-4.5 text-blue-400" /> : <Square className="w-4.5 h-4.5" />}
                Select All ({previewClasses.length + previewLeagues.length} Items)
              </button>

              <button
                onClick={() => setStep(1)}
                className="text-xs font-black uppercase tracking-wider hover:underline"
              >
                Back to Selection
              </button>
            </div>

            {/* Preview List Sections */}
            <div className="space-y-6">
              {/* 1. Classes Section */}
              {(previewTab === "all" || previewTab === "classes") && previewClasses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#0047FF]" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        Classes ({previewClasses.length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {totalSelectedClasses} of {previewClasses.length} Selected
                    </span>
                  </div>

                  <div className="space-y-3">
                    {previewClasses.map((cls) => {
                      const isSelected = !!selectedClasses[cls.classId];
                      const isExpanded = !!expandedClasses[cls.classId];
                      const hasPlayers = (cls.players || []).length > 0;
                      const classSelPlayers = selectedPlayers[cls.classId] || {};
                      const selectedPlayersCount = Object.values(classSelPlayers).filter(Boolean).length;

                      return (
                        <div
                          key={cls.classId}
                          className={`bg-white dark:bg-slate-900 border transition-all ${isSelected
                            ? "border-[#0047FF]/40 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 opacity-60"
                            }`}
                        >
                          {/* Class Main Header */}
                          <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <button
                                onClick={() => handleToggleClass(cls.classId)}
                                className="text-[#0047FF] hover:scale-105 transition-transform mt-0.5 shrink-0"
                              >
                                {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-300" />}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                                    {cls.name}
                                  </h4>
                                  {cls.alreadyExists && (
                                    <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/30">
                                      Already Exists
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 font-bold mt-1">
                                  <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 uppercase tracking-wider">
                                    {cls.category}
                                  </span>
                                  <span>/</span>
                                  <span className="bg-blue-50/50 dark:bg-blue-950/20 text-[#0047FF] px-1.5 py-0.5 uppercase tracking-wider">
                                    {cls.program}
                                  </span>
                                  <span>/</span>
                                  <span className="text-slate-500 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Coach: {cls.coach?.trim() || "Unassigned"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right Section: Player stats & Accordion trigger */}
                            <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                              <div className="text-xs font-semibold text-slate-500">
                                {hasPlayers ? (
                                  <span>
                                    {selectedPlayersCount} of {cls.players.length} Players Selected
                                  </span>
                                ) : (
                                  <span className="italic text-slate-400">No players assigned</span>
                                )}
                              </div>

                              {hasPlayers && (
                                <button
                                  onClick={() => handleToggleExpandClass(cls.classId)}
                                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-[#0047FF] transition-colors cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      Hide Players
                                      <ChevronUp className="w-4 h-4" />
                                    </>
                                  ) : (
                                    <>
                                      View Players
                                      <ChevronDown className="w-4 h-4" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Class Players Dropdown List */}
                          {hasPlayers && isExpanded && (
                            <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 p-4">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-0.5">
                                Assigned Players ({cls.players.length})
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {cls.players.map((p) => {
                                  const isPlayerSelected = !!classSelPlayers[p._id] && isSelected;
                                  return (
                                    <button
                                      key={p._id}
                                      type="button"
                                      onClick={() => handleTogglePlayer(cls.classId, p._id)}
                                      className={`flex items-center gap-2.5 p-2.5 border text-left rounded-none transition-all cursor-pointer ${isPlayerSelected
                                        ? "bg-white dark:bg-slate-900 border-[#0047FF]/30 text-slate-800 dark:text-white"
                                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800/60 text-slate-400"
                                        }`}
                                    >
                                      <span className="text-[#0047FF] shrink-0">
                                        {isPlayerSelected ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5 text-slate-300" />}
                                      </span>
                                      <span className="text-xs font-bold truncate">{p.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Leagues & Teams Section */}
              {(previewTab === "all" || previewTab === "leagues") && previewLeagues.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        Leagues & Teams ({previewLeagues.length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {totalSelectedLeagues} of {previewLeagues.length} Selected
                    </span>
                  </div>

                  <div className="space-y-4">
                    {previewLeagues.map((lg) => {
                      const isLgSelected = !!selectedLeagues[lg.leagueId];
                      const isLgExpanded = !!expandedLeagues[lg.leagueId];
                      const leagueTeams = lg.teams || [];
                      const hasTeams = leagueTeams.length > 0;
                      const lgTeamsSel = selectedTeams[lg.leagueId] || {};
                      const selectedTeamsCount = Object.values(lgTeamsSel).filter(Boolean).length;

                      return (
                        <div
                          key={lg.leagueId}
                          className={`bg-white dark:bg-slate-900 border transition-all ${isLgSelected
                            ? "border-amber-400/50 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 opacity-60"
                            }`}
                        >
                          {/* League Header */}
                          <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-amber-50/20 via-transparent to-transparent dark:from-amber-950/10">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <button
                                onClick={() => handleToggleLeague(lg.leagueId)}
                                className="text-amber-500 hover:scale-105 transition-transform mt-0.5 shrink-0 cursor-pointer"
                              >
                                {isLgSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-300" />}
                              </button>

                              <div className="w-9 h-9 rounded-none bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
                                <Trophy className="w-5 h-5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                                    {lg.name}
                                  </h4>
                                  {lg.alreadyExists && (
                                    <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/30">
                                      Already Exists
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 font-bold mt-1">
                                  {lg.season && (
                                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 uppercase tracking-wider">
                                      {lg.season}
                                    </span>
                                  )}
                                  {lg.fixtureFormat && (
                                    <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 uppercase tracking-wider">
                                      {lg.fixtureFormat.replace("_", " ")}
                                    </span>
                                  )}
                                  {typeof lg.numberOfRounds === "number" && (
                                    <span className="text-slate-500">
                                      {lg.numberOfRounds} Rounds
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Section: Team stats & Accordion trigger */}
                            <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                              <div className="text-xs font-semibold text-slate-500">
                                {hasTeams ? (
                                  <span>
                                    {selectedTeamsCount} of {leagueTeams.length} Teams Selected
                                  </span>
                                ) : (
                                  <span className="italic text-slate-400">0 Teams</span>
                                )}
                              </div>

                              {hasTeams && (
                                <button
                                  onClick={() => handleToggleExpandLeague(lg.leagueId)}
                                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                                >
                                  {isLgExpanded ? (
                                    <>
                                      Hide Teams
                                      <ChevronUp className="w-4 h-4" />
                                    </>
                                  ) : (
                                    <>
                                      View Teams ({leagueTeams.length})
                                      <ChevronDown className="w-4 h-4" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* League Teams List */}
                          {hasTeams && isLgExpanded && (
                            <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 p-4 space-y-3">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">
                                Teams in {lg.name} ({leagueTeams.length})
                              </div>

                              <div className="space-y-2">
                                {leagueTeams.map((team) => {
                                  const isTeamSelected = !!lgTeamsSel[team.teamId] && isLgSelected;
                                  const isTeamExpanded = !!expandedTeams[team.teamId];
                                  const teamPlayers = team.players || [];
                                  const hasTeamPlayers = teamPlayers.length > 0;
                                  const teamPlayersMap = selectedLeaguePlayers[lg.leagueId]?.[team.teamId] || {};
                                  const selTeamPlayerCount = Object.values(teamPlayersMap).filter(Boolean).length;

                                  return (
                                    <div
                                      key={team.teamId}
                                      className={`bg-white dark:bg-slate-900 border rounded-none p-3 transition-all ${isTeamSelected
                                        ? "border-purple-400/40 shadow-2xs"
                                        : "border-slate-200 dark:border-slate-800 opacity-60"
                                        }`}
                                    >
                                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleTeam(lg.leagueId, team.teamId)}
                                            className="text-purple-600 hover:scale-105 transition-transform shrink-0 cursor-pointer"
                                          >
                                            {isTeamSelected ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5 text-slate-300" />}
                                          </button>

                                          {/* Team Logo / Icon */}
                                          <div className="w-8 h-8 rounded-none bg-purple-50 dark:bg-purple-950/30 overflow-hidden flex items-center justify-center text-purple-600 border border-purple-100 dark:border-purple-900/40 shrink-0">
                                            {team.logo ? (
                                              <img src={getImageUrl(team.logo) as string} alt={team.teamName} className="w-full h-full object-cover" />
                                            ) : (
                                              <Shield className="w-4 h-4" />
                                            )}
                                          </div>

                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <h5 className="font-bold text-xs text-slate-800 dark:text-white truncate">
                                                {team.teamName}
                                              </h5>
                                              {team.alreadyExists && (
                                                <span className="px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
                                                  Exists
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                              Coach: <span className="text-slate-600 dark:text-slate-300">{team.coach?.trim() || "Unassigned"}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Player Count and Accordion Toggle */}
                                        <div className="flex items-center gap-3 shrink-0">
                                          <span className="text-[10px] font-bold text-slate-500">
                                            {hasTeamPlayers ? `${selTeamPlayerCount} / ${teamPlayers.length} Players` : "0 Players"}
                                          </span>

                                          {hasTeamPlayers && (
                                            <button
                                              type="button"
                                              onClick={() => handleToggleExpandTeam(team.teamId)}
                                              className="text-[10px] font-black uppercase tracking-wider text-purple-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                            >
                                              {isTeamExpanded ? "Hide" : "Players"}
                                              {isTeamExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Team Player List Accordion */}
                                      {hasTeamPlayers && isTeamExpanded && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            {teamPlayers.map((p) => {
                                              const isPSelected = !!teamPlayersMap[p._id] && isTeamSelected;
                                              return (
                                                <button
                                                  key={p._id}
                                                  type="button"
                                                  onClick={() => handleToggleLeaguePlayer(lg.leagueId, team.teamId, p._id)}
                                                  className={`flex items-center gap-2 p-2 border text-left rounded-none transition-all cursor-pointer ${isPSelected
                                                    ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 text-slate-800 dark:text-white"
                                                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800/60 text-slate-400"
                                                    }`}
                                                >
                                                  <span className="text-purple-600 shrink-0">
                                                    {isPSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                                                  </span>
                                                  <div className="min-w-0">
                                                    <div className="text-[11px] font-bold truncate">{p.name}</div>
                                                    {p.paymentStatus && (
                                                      <div className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                                        {p.paymentStatus}
                                                      </div>
                                                    )}
                                                  </div>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} className="max-w-[450px] p-6 lg:p-8 rounded-none shadow-2xl">
        <h4 className="text-xl font-bold mb-2 tracking-tight">Confirm Clone Operation</h4>
        <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">
          Are you sure you want to clone data from <span className="text-[#0047FF] font-bold">{(responseSourceTerm?.name || sourceTermObj?.name)}</span> to <span className="text-[#0047FF] font-bold">{(responseTargetTerm?.name || targetTermObj?.name)}</span>?
        </p>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700 mb-6 space-y-2 text-xs">
          <div className="flex justify-between font-bold">
            <span className="text-slate-500">Classes to clone:</span>
            <span className="text-slate-800 dark:text-white">{totalSelectedClasses} ({totalSelectedClassPlayers} players)</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-slate-500">Leagues to clone:</span>
            <span className="text-slate-800 dark:text-white">{totalSelectedLeagues} ({totalSelectedTeams} teams, {totalSelectedLeaguePlayers} players)</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
          <Button onClick={executeClone} className="bg-[#0047FF] hover:bg-blue-700 text-white">
            Proceed
          </Button>
        </div>
      </Modal>

      {/* Loader Modal */}
      <Modal isOpen={showLoaderModal} onClose={() => { }} showCloseButton={false} className="max-w-[440px] p-6 lg:p-8 rounded-none shadow-2xl">
        <div role="status" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">Cloning term data</h4>
              <p className="mt-1 text-xs text-slate-500">Classes, teams, and leagues</p>
            </div>
            <strong className="text-2xl text-[#0047FF]">{cloneProgress ? `${cloneProgress.percent}%` : "…"}</strong>
          </div>
          <div
            role="progressbar"
            aria-label="Term clone progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={cloneProgress?.percent ?? 0}
            className="h-3 w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
          >
            <div className="h-full bg-[#0047FF] transition-[width] duration-300" style={{ width: `${cloneProgress?.percent ?? 0}%` }} />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200" aria-live="polite">
            {cloneProgress?.message || "Waiting for the server to prepare the clone…"}
          </p>
          <span className="inline-flex border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0047FF] dark:border-blue-900 dark:bg-blue-950/30">
            {cloneProgress ? cloneStageLabel[cloneProgress.stage] : "Preparing"}
          </span>
          <div className="flex justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
            <span className="text-slate-500">Processed: <strong className="text-slate-800 dark:text-white">{cloneProgress ? `${cloneProgress.completed} / ${cloneProgress.total}` : "—"}</strong></span>
            <span className="text-slate-500">Items remaining: <strong className="text-slate-800 dark:text-white">{cloneProgress?.remaining ?? "—"}</strong></span>
          </div>
          <p className="text-[11px] leading-5 text-slate-500">100% means the clone has been saved. Player rosters are copied with their class or team.</p>
        </div>
      </Modal>
    </>
  );
}
