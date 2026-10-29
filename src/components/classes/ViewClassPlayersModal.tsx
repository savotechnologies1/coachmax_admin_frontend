import { ageGroupForYear } from "../../utils/dateTime";
import { useState } from "react";
import { Modal } from "../../components/ui/modal";
import { useClassPlayers } from "../../hooks/usePlayers";
import PlayerDetailCard from "../players/PlayerDetailCard";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import { sortPlayersByPaymentStatus } from "../../utils/paymentStatus";

interface ViewClassPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string | null;
}

export default function ViewClassPlayersModal({
  isOpen,
  onClose,
  classId,
}: ViewClassPlayersModalProps) {
  const { data, isLoading, isError } = useClassPlayers(classId || "");
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

  const classData = data?.class || data?.data;
  const players = sortPlayersByPaymentStatus(
    data?.players || data?.data?.players || [],
    (player: any) => player.paymentStatus || player.status
  );
  const totalPlayers = data?.totalPlayers !== undefined ? data.totalPlayers : (data?.data?.totalPlayers !== undefined ? data.data.totalPlayers : players.length);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl p-0 overflow-hidden bg-white dark:bg-slate-900 rounded-xl" showCloseButton={false}>
        {/* Header Section matching Create Class UI */}
        <div className="relative overflow-hidden bg-[#0A1930] px-4 py-4 sm:px-8 sm:py-5 text-white border-l-[6px] border-[#0047FF]">
          {/* Faint Pitch Schematic Background */}
          <svg className="absolute right-0 top-0 h-full w-auto opacity-10 pointer-events-none text-white/70" viewBox="0 0 120 80" fill="none" stroke="currentColor" strokeWidth="0.8">
            <rect x="2" y="2" width="116" height="76" rx="2" />
            <line x1="60" y1="2" x2="60" y2="78" />
            <circle cx="60" cy="40" r="15" />
            <circle cx="60" cy="40" r="1" fill="currentColor" />
            <path d="M 2 20 L 18 20 L 18 60 L 2 60" />
            <path d="M 118 20 L 102 20 L 102 60 L 118 60" />
            <path d="M 2 28 L 8 28 L 8 52 L 2 52" />
            <path d="M 118 28 L 112 28 L 112 52 L 118 52" />
          </svg>

          {/* Dotted Grid Accent */}
          <div className="absolute right-12 bottom-4 grid grid-cols-5 gap-1 opacity-60">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#0047FF]" />
            ))}
          </div>

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 bg-white/5 text-white shrink-0">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-wide text-white">
                  Class Active Roster
                </h3>
                <p className="text-xs text-gray-300 mt-1 font-medium">
                  Explore enrolled participants, contact access information, and parent credentials.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col h-full max-h-[70vh] p-4 sm:p-8 overflow-y-auto">
          {/* Top Info Card */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-none p-4 sm:p-5 mb-6 sm:mb-8 bg-white dark:bg-slate-900 shadow-sm flex items-center flex-wrap gap-4">
            <div className="flex-1 min-w-[130px] px-2 border-r border-slate-100 dark:border-slate-800 last:border-0">
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase">Session ID</span>
              <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-1.5">{classData?.name || classData?.className || "summer class"}</div>
            </div>
            <div className="flex-1 min-w-[130px] px-3 sm:px-6 border-r border-slate-100 dark:border-slate-800 last:border-0">
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase">Schedule</span>
              <div className="font-bold text-slate-700 dark:text-slate-300 text-xs sm:text-sm mt-1.5">{classData?.dayOfWeek || "TUESDAY"}</div>
              <div className="text-[11px] font-semibold text-[#0047FF] mt-0.5">{classData?.startTime || "09:00"} - {classData?.endTime || "10:00"}</div>
            </div>
            <div className="flex-1 min-w-[130px] px-3 sm:px-6 border-r border-slate-100 dark:border-slate-800 last:border-0">
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase">Classification</span>
              <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-1.5">{classData?.category?.name || "ACADEMY"}</div>
            </div>
            <div className="flex-1 min-w-[130px] px-3 sm:px-6">
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.1em] uppercase">Instruction</span>
              <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-1.5">{classData?.coach?.name || classData?.coach?.email || "anand coach"}</div>
            </div>
          </div>

          {/* Middle Header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2 border-b-2 border-[#031549] dark:border-[#336eff] pb-1">
              <svg className="w-5 h-5 text-[#031549] dark:text-[#336eff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-sm font-bold text-[#031549] dark:text-white tracking-widest uppercase">Active Roster</h3>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">{totalPlayers} MEMBERS IDENTIFIED</span>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-none bg-white dark:bg-slate-900">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 font-semibold">
                <div className="inline-block w-8 h-8 border-3 border-[#0047FF] border-t-transparent rounded-full animate-spin mb-3" />
                <p>Loading roster...</p>
              </div>
            ) : isError ? (
              <div className="p-12 text-center text-rose-500 font-semibold">
                Failed to load players. Please try again.
              </div>
            ) : players.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-semibold">
                No players enrolled in this class.
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-xs z-10">
                  <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.15em]">
                    <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-left min-w-[160px] w-[34%]">Participant</th>
                    <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-center min-w-[150px] w-[33%]">Contact Access</th>
                    <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-center min-w-[150px] w-[33%]">Parent Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {players.map((player: any) => {
                    const parent = player.parentId && typeof player.parentId === "object"
                      ? player.parentId
                      : player.parent && typeof player.parent === "object"
                      ? player.parent
                      : null;

                    const parentName = parent?.fullName || parent?.name || (typeof player.parentId === "string" ? "" : "") || player.parentName || "";
                    const parentEmail = parent?.email || player.parentEmail || "";
                    const parentPhone = parent?.phone || player.parentPhone || "";
                    const parentRelationship = parent?.relationship || "";

                    const playerName = player.fullName || `${player.firstName || ""} ${player.lastName || ""}`.trim() || player.name || "Unknown Player";
                    const playerEmail = player.email || parentEmail || "No Email";
                    const playerPhone = player.phone || parentPhone || "No Phone";
                    const playerPhoto = player.profileImage || player.photo || player.avatar || player.image || "";

                    const initials = playerName
                      .split(" ")
                      .filter(Boolean)
                      .map((w: string) => w[0])
                      .join("")
                      .toUpperCase()
                      .substring(0, 2) || (player.jerseyNumber ? `${player.jerseyNumber}` : "-");

                    return (
                      <tr
                        key={player._id || player.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5 text-left">
                            <div className="w-10 h-10 shrink-0 bg-[#0A1930] dark:bg-slate-700 text-white rounded-none flex items-center justify-center text-xs font-bold shadow-sm overflow-hidden">
                              {playerPhoto ? (
                                <img
                                  src={getMediaUrl(playerPhoto, getMediaFallback(playerName))}
                                  alt={playerName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaFallback(playerName); }}
                                />
                              ) : player.jerseyNumber ? (
                                <span>#{player.jerseyNumber}</span>
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-[#0047FF] dark:group-hover:text-[#336eff] transition-colors">
                                {playerName}
                              </div>
                              {player.gender && (
                                <span className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">
                                  {player.gender} {player.dob ? `• U${ageGroupForYear(player.dob, classData?.term?.year) ?? "?"}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                              {playerEmail}
                            </span>
                            <span className="text-xs font-bold text-[#0047FF] dark:text-[#336eff] tracking-wide">
                              {playerPhone}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {parentName ? (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{parentName}</span>
                                {parentRelationship && (
                                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase">
                                    {parentRelationship}
                                  </span>
                                )}
                              </div>
                              {(parentPhone || parentEmail) && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {[parentPhone, parentEmail].filter(Boolean).join(" • ")}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs italic font-medium">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>

      {selectedPlayer && (
        <PlayerDetailCard
          player={selectedPlayer}
          contextYear={classData?.term?.year}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  );
}
