import { useState } from "react";
import AssignClassModal from "../../components/players/AssignClassModal";
import { Link, Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { Player } from "../../types/player";
import PlayerStatsCards from "../../components/players/PlayerStatsCards";
import PlayerFilters from "../../components/players/PlayerFilters";
import PlayerTable from "../../components/players/PlayerTable";
import PlayerDetailCard from "../../components/players/PlayerDetailCard";
import AddCoachNoteModal from "../../components/CoachManagement/AddCoachNoteModal";
import { useCoachTemporaryPlayers } from "../../hooks/useRegistrationRequests";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";

export default function TemporaryPlayersList() {
  const [playerToAssign, setPlayerToAssign] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [medicalFilter, setMedicalFilter] = useState("All");
  const [coachNotePlayer, setCoachNotePlayer] = useState<Player | null>(null);
  const { markItemAsRead } = useSidebarBadges();

  const handleSelectPlayer = (player: Player) => {
    const idToMark = (player as any).requestId || player._id;
    if (idToMark) {
      markItemAsRead("temporaryPlayers", String(idToMark));
      if (player._id) markItemAsRead("temporaryPlayers", String(player._id));
    }
    setSelectedPlayer(player);
  };

  const { data: playersResponse, isLoading } = useCoachTemporaryPlayers(1, 100);
  const players = playersResponse?.users || [];

  const userStr = localStorage.getItem("user");
  let userRole = "";
  try {
    if (userStr) {
      const user = JSON.parse(userStr);
      userRole = user.role;
    }
  } catch (e) {
    console.error("Error parsing user data", e);
  }
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(userRole);

  // Filtering Logic
  const filteredPlayers = players.filter((p: Player) => {
    const email = p.parentId?.email || "";
    const phone = p.parentId?.phone || "";

    const matchesSearch =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery);

    // Status Filter
    const playerStatus = p.status || "PENDING";
    const matchesStatus =
      statusFilter === "All" || playerStatus.toUpperCase() === statusFilter.toUpperCase();

    // Medical Filter
    const matchesMedical =
      medicalFilter === "All" ||
      (["YES", "true"].includes(medicalFilter) && p.isMedicalCondition === true) ||
      (["NO", "false"].includes(medicalFilter) && p.isMedicalCondition !== true);

    return matchesSearch && matchesStatus && matchesMedical;
  });

  if (isAdmin) return <Navigate to="/new-registration-request" replace />;

  return (
    <>
      <PageMeta
        title="Temporary Players | CoachMax"
        description="Fidelity matched primary CoachMax temporary players list UI"
      />

      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Temporary Players</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
            <span>Home</span>
            <span>&gt;</span>
            <span className="text-[#0047FF]">Temporary Players</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            to="/add-temporary-players"
            className="inline-flex items-center justify-center rounded-none bg-[#0047FF] px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-theme-xs"
          >
            + Add Temporary Player
          </Link>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col xl:flex-row gap-2 items-start w-full">
        {/* Left Side: Stats, Filters, Table */}
        <div className="flex-1 w-full min-w-0">
          <PlayerStatsCards
            totalCount={players.length}
            approvedCount={players.filter((p: Player) => p.status === 'APPROVED' || p.status === 'PAID').length}
            pendingCount={players.filter((p: Player) => p.status === 'PENDING' || p.status === 'PENDING_APPROVAL' || p.status === 'TRIAL').length}
            showPendingCount
            rejectedCount={players.filter((p: Player) => p.status === 'REJECTED').length}
            eliteCount={0}
            schoolCount={0}
          />

          <PlayerFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            programFilter="All"
            setProgramFilter={() => { }}
            ageFilter="All"
            setAgeFilter={() => { }}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            medicalFilter={medicalFilter}
            setMedicalFilter={setMedicalFilter}
          />

          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading temporary players...</div>
          ) : (
            <PlayerTable
              players={filteredPlayers}
              selectedPlayerId={selectedPlayer ? selectedPlayer._id : ""}
              onSelectPlayer={handleSelectPlayer}
              onAddCoachNote={(player) => {
                const idToMark = (player as any).requestId || player._id;
                if (idToMark) {
                  markItemAsRead("temporaryPlayers", String(idToMark));
                  if (player._id) markItemAsRead("temporaryPlayers", String(player._id));
                }
                setCoachNotePlayer(player);
              }}
              onDeletePlayer={undefined}
              onAssignClass={isAdmin ? (player) => setPlayerToAssign(player) : undefined}
              onOpenRequestedClass={isAdmin ? (player) => setPlayerToAssign(player) : undefined}
              showRequestDetails={isAdmin}
              showPaymentStatus={false}
              showStatusColumn={true}
            />
          )}
        </div>

        {/* Right Side: Player Detail Module */}
        {selectedPlayer && (
          <PlayerDetailCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} isRegistrationRequest={true} />
        )}
      </div>

      {playerToAssign && <AssignClassModal player={playerToAssign} onClose={() => setPlayerToAssign(null)} />}
      {coachNotePlayer && (
        <AddCoachNoteModal
          isOpen={coachNotePlayer !== null}
          onClose={() => setCoachNotePlayer(null)}
          playerId={coachNotePlayer._id}
          playerName={coachNotePlayer.fullName}
        />
      )}
    </>
  );
}
