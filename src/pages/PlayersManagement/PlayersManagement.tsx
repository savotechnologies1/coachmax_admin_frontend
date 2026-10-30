import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Player } from "../../types/player";
import PlayerStatsCards from "../../components/players/PlayerStatsCards";
import type { PlayerMetric } from "../../components/players/PlayerStatsCards";
import PlayerFilters from "../../components/players/PlayerFilters";
import PlayerTable from "../../components/players/PlayerTable";
import PlayerDetailCard from "../../components/players/PlayerDetailCard";
import AssignClassModal from "../../components/players/AssignClassModal";
import GenerateInvoiceModal from "../../components/InvoiceManagement/GenerateInvoiceModal";
import AddCoachNoteModal from "../../components/CoachManagement/AddCoachNoteModal";
import EditPlayerModal from "../../components/players/EditPlayerModal";
import { usePlayers, useDeletePlayer, usePlayerStats, usePlayerFilterOptions } from "../../hooks/usePlayers";
import { getPlayers } from "../../api/players";
import { useTerms } from "../../hooks/useTerms";
import { findCurrentTerm, getCurrentYearString } from "../../hooks/useCurrentTerm";
import { downloadPlayersCsv, type PlayerExportColumn } from "../../components/players/playerExport";
import Pagination from "../../components/common/Pagination";
import { UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useCoachAccess } from "../../hooks/useCoachAccess";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function PlayersManagement() {
  const access = useCoachAccess();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState(getCurrentYearString);
  const [termFilter, setTermFilter] = useState("All");
  const [initialTermSelected, setInitialTermSelected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [programFilter, setProgramFilter] = useState("All");
  const [subProgramFilter, setSubProgramFilter] = useState("All");
  const [ageFilter, setAgeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [assignmentFilter, setAssignmentFilter] = useState<"ALL" | "ELITE" | "SCHOOL" | "BOTH" | "UNASSIGNED">("ALL");
  const [medicalFilter, setMedicalFilter] = useState("All");
  
  // Pagination state for backend pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const { terms, isLoading: termsLoading } = useTerms({ isEvent: "all" });

  useEffect(() => {
    if (initialTermSelected || termsLoading) return;
    const currentYearTerms = terms.filter((term) => String(term.year) === yearFilter);
    const currentTerm = findCurrentTerm(currentYearTerms.filter((term) => !term.isEvent)) || findCurrentTerm(currentYearTerms);
    setTermFilter(currentTerm?._id || "All");
    setInitialTermSelected(true);
  }, [initialTermSelected, termsLoading, terms, yearFilter]);

  // Fetch dynamic player statistics scoped to selected term
  const { data: statsResponse } = usePlayerStats(termFilter, yearFilter);
  const { data: filterOptions = [] } = usePlayerFilterOptions();

  // Fetch players per page from the backend with all active filters
  const { data: playersResponse, isLoading } = usePlayers(
    page,
    limit,
    debouncedSearchQuery,
    programFilter,
    statusFilter,
    termFilter,
    medicalFilter,
    ageFilter,
    subProgramFilter,
    "ALL",
    assignmentFilter === "ALL" ? undefined : assignmentFilter,
    yearFilter
  );
  const players = playersResponse?.users || [];
  const totalPages = playersResponse?.totalPages || 1;
  const totalPlayers = playersResponse?.total || 0;
  const stats = statsResponse?.stats || playersResponse?.stats;
  
  const deletePlayerMutation = useDeletePlayer();
  
  const [playerToAssign, setPlayerToAssign] = useState<Player | null>(null);
  const [playerForInvoice, setPlayerForInvoice] = useState<Player | null>(null);
  const [coachNotePlayer, setCoachNotePlayer] = useState<Player | null>(null);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);

  // Reset page to 1 when filters or limit change to avoid out-of-bound pages
  useEffect(() => {
    setPage(1);
  }, [searchQuery, yearFilter, termFilter, programFilter, subProgramFilter, statusFilter, assignmentFilter, ageFilter, medicalFilter, limit]);

  const handleExport = async (columns: PlayerExportColumn[]) => {
    if (isExporting) return false;
    setIsExporting(true);
    try {
      const getExportPage = (exportPage: number) => getPlayers(
        exportPage, 100, debouncedSearchQuery, programFilter, statusFilter,
        termFilter, medicalFilter, ageFilter, subProgramFilter, "ALL",
        assignmentFilter === "ALL" ? undefined : assignmentFilter, yearFilter
      );
      const first = await getExportPage(1);
      const exportPlayers = [...(first.users || [])];
      for (let exportPage = 2; exportPage <= first.totalPages; exportPage += 1) {
        const next = await getExportPage(exportPage);
        exportPlayers.push(...(next.users || []));
      }
      if (exportPlayers.length === 0) {
        toast.error("No players match the selected filters.");
        return false;
      }
      downloadPlayersCsv(exportPlayers, columns, termFilter, yearFilter);
      toast.success(`Exported ${exportPlayers.length} players.`);
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Could not export players.");
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeletePlayer = (player: Player) => {
    deletePlayerMutation.mutate(player._id);
    if (selectedPlayer?._id === player._id) {
      setSelectedPlayer(null);
    }
  };

  const handleAssignPlayer = (player: Player) => {
    setPlayerToAssign(player);
  };

  const handleGenerateInvoice = (player: Player) => {
    setPlayerForInvoice(player);
  };

  const handleMetricClick = (metric: PlayerMetric) => {
    setAssignmentFilter(metric);
  };

  const activeMetric = assignmentFilter;

  return (
    <>
      <PageMeta
        title="Players Management | CoachMax"
        description="Fidelity matched primary CoachMax players management UI"
      />

      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Players Management</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
            <span>Home</span>
            <span>&gt;</span>
            <span className="text-[#0047FF]">Players Management</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col xl:flex-row gap-2 items-start w-full">
        {/* Left Side: Stats, Filters, Table */}
        <div className="flex-1 w-full min-w-0">
          <PlayerStatsCards
            totalCount={stats?.totalCount ?? totalPlayers}
            approvedCount={stats?.approvedCount ?? 0}
            rejectedCount={stats?.rejectedCount ?? 0}
            eliteCount={stats?.eliteCount ?? 0}
            schoolCount={stats?.schoolCount ?? 0}
            bothCount={stats?.bothCount ?? 0}
            unassignedCount={stats?.unassignedCount ?? 0}
            showAssignmentMetrics
            activeMetric={activeMetric}
            onMetricClick={handleMetricClick}
          />

          <PlayerFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            yearFilter={yearFilter}
            setYearFilter={(year) => { setInitialTermSelected(true); setYearFilter(year); }}
            termFilter={termFilter}
            setTermFilter={setTermFilter}
            programFilter={programFilter}
            setProgramFilter={setProgramFilter}
            subProgramFilter={subProgramFilter}
            setSubProgramFilter={setSubProgramFilter}
            filterPlayers={filterOptions}
            ageFilter={ageFilter}
            setAgeFilter={setAgeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            medicalFilter={medicalFilter}
            setMedicalFilter={setMedicalFilter}
            isExporting={isExporting}
            onExport={handleExport}
            hideExport={!access.can("players", "export")}
          />

          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading players...</div>
          ) : !isLoading && players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="bg-gray-50 rounded-full p-4 mb-4">
                <UserPlus className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No players found</h3>
              <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
                No players match the selected metric and filters. Try adjusting your search criteria.
              </p>
            </div>
          ) : (
            <>
              <PlayerTable
                players={players}
                selectedPlayerId={selectedPlayer ? selectedPlayer._id : ""}
                onSelectPlayer={setSelectedPlayer}
                onEditPlayer={access.can("players", "edit") ? setPlayerToEdit : undefined}
                onDeletePlayer={access.can("players", "delete") ? handleDeletePlayer : undefined}
                onAssignClass={access.can("players", "assign") ? handleAssignPlayer : undefined}
                onGenerateInvoice={access.can("invoices", "create") ? handleGenerateInvoice : undefined}
                onAddCoachNote={access.can("notes", "create") ? setCoachNotePlayer : undefined}
                showPaymentStatus={true}
                canEditPaymentStatus={access.can("payments", "edit")}
                canChat={access.can("communication", "create")}
                selectedTerm={termFilter}
                page={page}
                limit={limit}
              />

              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalPlayers}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                limitOptions={[10, 20, 50, 100]}
              />
            </>
          )}
        </div>

        {/* Right Side: Player Detail Module */}
        {selectedPlayer && (
          <PlayerDetailCard 
            player={selectedPlayer} 
            onClose={() => setSelectedPlayer(null)} 
            onEditPlayer={access.can("players", "edit") ? setPlayerToEdit : undefined}
          />
        )}
      </div>

      {playerToAssign && (
        <AssignClassModal player={playerToAssign} onClose={() => setPlayerToAssign(null)} />
      )}

      <GenerateInvoiceModal
        isOpen={!!playerForInvoice}
        onClose={() => setPlayerForInvoice(null)}
        player={playerForInvoice}
      />

      {coachNotePlayer && (
        <AddCoachNoteModal
          isOpen={coachNotePlayer !== null}
          onClose={() => setCoachNotePlayer(null)}
          playerId={coachNotePlayer._id}
          playerName={coachNotePlayer.fullName}
        />
      )}

      <EditPlayerModal
        isOpen={!!playerToEdit}
        onClose={() => setPlayerToEdit(null)}
        player={playerToEdit}
      />
    </>
  );
}
