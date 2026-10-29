import DateInput from "../form/DateInput";
import { APP_TIME_ZONE, formatTimestampDate, formatTime, toDateOnly, zonedDateTimeToUtcISOString } from "../../utils/dateTime";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { getFixturesByLeague, createFixture, updateFixture, deleteFixture, getAllTeams, getAllLeagues } from "../../api/adminApi";
import { toast } from "react-hot-toast";
import { Calendar as CalendarIcon, MapPin, User, Swords, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";
import { getMediaUrl } from "../../utils/media";

const getImageUrl = (path: string | undefined | null) => {
  return getMediaUrl(path) || null;
};

const getDataArray = (res: any) => {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
};

const LeagueFixturesAccordion = ({ league, searchQuery, getTeamName, handleOpenEdit, handleDeleteClick, openDropdownId, setOpenDropdownId }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: fixturesData, isLoading: loading } = useQuery({
    queryKey: ["fixtures", league._id],
    queryFn: () => getFixturesByLeague(league._id),
    enabled: isOpen,
  });

  const fixtures = getDataArray(fixturesData);

  const filteredFixtures = fixtures.filter((f: any) => 
    getTeamName(f.homeTeam).toLowerCase().includes(searchQuery.toLowerCase()) ||
    getTeamName(f.awayTeam).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.venue && f.venue.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-none bg-white dark:bg-slate-900 overflow-hidden mb-4 shadow-sm transition-all hover:shadow-md">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-none bg-brand-50 overflow-hidden flex items-center justify-center text-brand-600 border border-brand-100 shadow-sm shrink-0">
            {league.logo ? (
              <img src={getImageUrl(league.logo) as string} alt={league.name} className="w-full h-full object-cover" />
            ) : (
              <Trophy size={20} />
            )}
          </div>
          <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-800 dark:text-slate-200 tracking-tight">{league.name}</span>
                {(league.type || league.leagueType) && (
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-none border bg-blue-50 text-[#0047FF] border-blue-200">
                    {league.type || league.leagueType}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase">{league.season || "N/A"}</span>
          </div>
        </div>
        <div>
          {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </div>
      </div>
      
      {isOpen && (
         <div className="border-t border-slate-100 dark:border-slate-800 p-4">
            <div className="overflow-visible no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#031549] text-white text-[10px] font-bold uppercase tracking-wider rounded-none">
                    <th className="py-3 px-4 min-w-[200px] first:rounded-none">Match</th>
                    <th className="py-3 px-4 min-w-[140px]">Date & Time</th>
                    <th className="py-3 px-4 min-w-[160px]">Details</th>
                    <th className="py-3 px-4 w-[50px] text-right last:rounded-none">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="text-center py-10">
                       <div className="flex flex-col items-center gap-3 text-gray-400">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent shadow-sm"></div>
                          <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Fetching Fixtures...</span>
                       </div>
                    </td></tr>
                  ) : filteredFixtures.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10 text-gray-500 font-medium italic bg-slate-50 dark:bg-slate-900/50">No fixtures found for this league.</td></tr>
                  ) : (
                    filteredFixtures.map((fixture: any) => (
                      <tr key={fixture._id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all bg-white dark:bg-slate-900">
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight">{getTeamName(fixture.homeTeam)}</span>
                                <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded-none uppercase">(H)</span>
                            </div>
                            <div className="flex items-center gap-2">
                               <Swords size={12} className="text-brand-500 opacity-70" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight">{getTeamName(fixture.awayTeam)}</span>
                                <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded-none uppercase">(A)</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                                  <CalendarIcon size={12} className="text-brand-500" />
                                  {fixture.kickoffTime ? formatTimestampDate(fixture.kickoffTime) : "TBD"}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 ml-4.5">
                                  {fixture.kickoffTime ? formatTime(fixture.kickoffTime) : ""}
                              </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
                                    <MapPin size={12} className="text-slate-400" />
                                    {[fixture.field, fixture.venue].filter(Boolean).join(" · ") || "TBD"}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px] font-semibold">
                                    <User size={12} className="text-slate-400" />
                                    {fixture.referee || "TBD"}
                                </span>
                            </div>
                        </td>
                        <td className="py-4 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-none shadow-sm hover:shadow transition-colors"
                            title="More Options"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === fixture._id ? null : fixture._id);
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>

                          {openDropdownId === fixture._id && (
                            <div className="absolute right-8 top-10 w-36 bg-white dark:bg-slate-800 rounded-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                              <button 
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-[#0047FF] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(fixture);
                                  setOpenDropdownId(null);
                                }}
                              >
                                Edit Fixture
                              </button>
                              <button 
                                className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700 mt-1 pt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(fixture._id);
                                  setOpenDropdownId(null);
                                }}
                              >
                                Delete Fixture
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
         </div>
      )}
    </div>
  );
};

const FixtureManagement: React.FC = () => {
  const queryClient = useQueryClient();


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    league: "",
    kickoffDate: "",
    kickoffClock: "",
    round: 1,
    field: "Field 1",
    venue: "",
    referee: "",
    homeTeam: "",
    awayTeam: "",
  });

  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const getDataArray = (res: any) => {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  };

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: () => getAllTeams(),
  });
  const teams = getDataArray(teamsData);

  const { data: leaguesData, isLoading: loadingLeagues } = useQuery({
    queryKey: ["leagues"],
    queryFn: () => getAllLeagues(),
  });
  const leagues = getDataArray(leaguesData);

  const selectedLeague = leagues.find((league: any) => league._id === formData.league);
  const { data: selectedFixtures } = useQuery({ queryKey: ["fixtures", formData.league], queryFn: () => getFixturesByLeague(formData.league), enabled: !!formData.league && isModalOpen });
  const usedTeamIds = new Set(getDataArray(selectedFixtures).filter((fixture: any) => Number(fixture.round) === Number(formData.round) && fixture._id !== selectedFixtureId).flatMap((fixture: any) => [fixture.homeTeam?._id || fixture.homeTeam, fixture.awayTeam?._id || fixture.awayTeam]));
  const enrolledIds = new Set((selectedLeague?.teams || []).map((team: any) => team._id || team));
  const eligibleTeams = teams.filter((team: any) => enrolledIds.has(team._id) && !usedTeamIds.has(team._id));

  const createMutation = useMutation({
    mutationFn: createFixture,
    onSuccess: (res: any) => {
      ["fixtures", "league", "leagueSchedule", "leagueMatches", "leagueLadder", "leagueGraphs", "leagueTeams", "leagueStats"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success(res?.message || "Fixture created successfully!");
      setIsModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to create fixture"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateFixture(id, data),
    onSuccess: (res: any) => {
      ["fixtures", "league", "leagueSchedule", "leagueMatches", "leagueLadder", "leagueGraphs", "leagueTeams", "leagueStats"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success(res?.message || "Fixture updated successfully!");
      setIsModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to update fixture"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFixture,
    onSuccess: (res: any) => {
      ["fixtures", "league", "leagueSchedule", "leagueMatches", "leagueLadder", "leagueGraphs", "leagueTeams", "leagueStats"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      toast.success(res?.message || "Fixture deleted successfully!");
      setDeleteModalId(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to delete fixture"),
  });

  const handleOpenAdd = () => {
    setFormData({ league: "", kickoffDate: "", kickoffClock: "", round: 1, field: "Field 1", venue: "", referee: "", homeTeam: "", awayTeam: "" });
    setIsEditing(false);
    setSelectedFixtureId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fixture: any) => {
    setFormData({
      league: fixture.league?._id || fixture.league || "",
      kickoffDate: fixture.kickoffTime ? toDateOnly(formatTimestampDate(fixture.kickoffTime, APP_TIME_ZONE)) : "",
      kickoffClock: fixture.kickoffTime ? new Date(fixture.kickoffTime).toLocaleTimeString("en-GB", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }) : "",
      round: fixture.round || 1,
      field: fixture.field || "Field 1",
      venue: fixture.venue || "",
      referee: fixture.referee || "",
      homeTeam: fixture.homeTeam?._id || fixture.homeTeam || "",
      awayTeam: fixture.awayTeam?._id || fixture.awayTeam || "",
    });
    setIsEditing(true);
    setSelectedFixtureId(fixture._id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModalId(id);
  };

  const confirmDelete = () => {
    if (deleteModalId) {
      deleteMutation.mutate(deleteModalId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.homeTeam === formData.awayTeam) {
      toast.error("Home team and away team cannot be the same.");
      return;
    }
    let kickoffTime: string;
    try { kickoffTime = zonedDateTimeToUtcISOString(formData.kickoffDate, formData.kickoffClock); } catch (error) { toast.error(error instanceof Error ? error.message : "Enter a valid kickoff time."); return; }
    const payload = { ...formData, kickoffTime };
    if (isEditing && selectedFixtureId) {
      updateMutation.mutate({ id: selectedFixtureId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getTeamName = (teamId: string | any) => {
    if (typeof teamId === 'object' && teamId?.teamName) return teamId.teamName;
    const team = teams.find((c: any) => c._id === teamId);
    return team ? team.teamName : "Unknown Team";
  };

  const filteredLeagues = leagues.filter((l: any) => 
    l.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search leagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-none outline-none focus:border-brand-500 bg-white dark:bg-slate-800 dark:text-white transition-colors shadow-sm"
          />
        </div>
        <Button onClick={handleOpenAdd} size="sm">Add Fixture</Button>
      </div>

      <div className="w-full flex flex-col">
        {loadingLeagues ? (
           <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent shadow-sm"></div>
           </div>
        ) : filteredLeagues.length === 0 ? (
           <div className="text-center py-20 text-gray-500 font-medium italic">No leagues found.</div>
        ) : (
          filteredLeagues.map((league: any) => (
            <LeagueFixturesAccordion 
              key={league._id}
              league={league}
              searchQuery={searchQuery}
              getTeamName={getTeamName}
              handleOpenEdit={handleOpenEdit}
              handleDeleteClick={handleDeleteClick}
              openDropdownId={openDropdownId}
              setOpenDropdownId={setOpenDropdownId}
            />
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-[850px] p-6 lg:p-8 rounded-none shadow-2xl" noBackgroundBlur={true}>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-2.5 bg-brand-50 dark:bg-brand-500/10 rounded-none text-brand-500">
             <Swords size={22} />
          </div>
          <div>
            <h4 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{isEditing ? "Modify Fixture" : "New Match Fixture"}</h4>
            <p className="text-xs text-slate-500 font-medium">Configure match details and participating teams.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-6 space-y-4">
            
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">League / Event</label>
              <select
                value={formData.league}
                onChange={(e) => setFormData({ ...formData, league: e.target.value, homeTeam: "", awayTeam: "", round: 1, field: "Field 1" })}
                disabled={isEditing}
                className="w-full rounded-none border border-slate-100 bg-slate-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer"
                required
              >
                <option value="">Select League/Event</option>
                {leagues.map((l: any) => (
                    <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Home Team</label>
                  <select
                    value={formData.homeTeam}
                    onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
                    className="w-full rounded-none border border-slate-100 bg-slate-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select Home</option>
                    {eligibleTeams.filter((t: any) => t._id !== formData.awayTeam).map((t: any) => (
                        <option key={t._id} value={t._id}>{t.teamName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Away Team</label>
                  <select
                    value={formData.awayTeam}
                    onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
                    className="w-full rounded-none border border-slate-100 bg-slate-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select Away</option>
                    {eligibleTeams.filter((t: any) => t._id !== formData.homeTeam).map((t: any) => (
                        <option key={t._id} value={t._id}>{t.teamName}</option>
                    ))}
                  </select>
                </div>
            </div>

          </div>

          <div className="md:col-span-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Kick-off Time</label>
              <div className="grid grid-cols-2 gap-2">
                <DateInput aria-label="Kickoff date" type="date" value={formData.kickoffDate} onChange={(e) => setFormData({ ...formData, kickoffDate: e.target.value })} required className="w-full border px-3 py-2" />
                <input aria-label="Kickoff time" type="time" value={formData.kickoffClock} onChange={(e) => setFormData({ ...formData, kickoffClock: e.target.value })} required className="w-full border px-3 py-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">Round<select value={formData.round} onChange={(e) => setFormData({ ...formData, round: Number(e.target.value), homeTeam: "", awayTeam: "" })} className="w-full border px-3 py-2">{Array.from({ length: selectedLeague?.numberOfRounds || 1 }, (_, i) => <option key={i + 1} value={i + 1}>Round {i + 1}</option>)}</select></label>
              <label className="text-xs">Field<select value={formData.field} onChange={(e) => setFormData({ ...formData, field: e.target.value })} className="w-full border px-3 py-2">{Array.from({ length: selectedLeague?.numberOfFields || 1 }, (_, i) => <option key={i + 1} value={`Field ${i + 1}`}>Field {i + 1}</option>)}</select></label>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Venue</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full rounded-none border border-slate-100 bg-slate-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all"
                placeholder="e.g. Camelot Turf Ground"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">Referee (Optional)</label>
              <input
                type="text"
                value={formData.referee}
                onChange={(e) => setFormData({ ...formData, referee: e.target.value })}
                className="w-full rounded-none border border-slate-100 bg-slate-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all"
                placeholder="e.g. Howard Webb"
              />
            </div>
          </div>

          <div className="md:col-span-12 flex justify-end gap-3 mt-4 pt-6 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Discard</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-10 h-12 rounded-none text-xs font-bold uppercase tracking-widest">
                {createMutation.isPending || updateMutation.isPending ? "Committing..." : "Save Fixture"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
        title="Delete Fixture"
        message="Are you sure you want to delete this fixture? This action cannot be undone."
      />
    </div>
  );
};

export default FixtureManagement;
