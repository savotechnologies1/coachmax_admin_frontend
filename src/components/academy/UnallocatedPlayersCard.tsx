import { UnallocatedPlayer } from "../../types/academy";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import SidebarPlayerPagination from "./SidebarPlayerPagination";

interface UnallocatedPlayersCardProps {
  players: UnallocatedPlayer[];
  totalCount: number;
  page: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  onAssignPlayer?: (player: any) => void;
  onViewAll?: () => void;
  onNavigateToTarget?: (player: UnallocatedPlayer) => void;
}

export default function UnallocatedPlayersCard({
  players,
  totalCount,
  page,
  onPageChange,
  isLoading,
  onAssignPlayer,
  onViewAll,
  onNavigateToTarget
}: UnallocatedPlayersCardProps) {
  const { markItemAsRead } = useSidebarBadges();
  return (
    <div className="bg-white border border-slate-200 dark:border-slate-700 dark:bg-slate-900 p-4 rounded-none shadow-sm mb-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Unallocated Players
          </h3>
          <span className="bg-blue-50 text-[#0047FF] text-[10px] font-bold px-1.5 py-0.5 rounded-full dark:bg-blue-950/20 dark:text-blue-400">
            {totalCount}
          </span>
        </div>
        <button
          onClick={onViewAll}
          className="text-[10px] font-semibold text-[#0047FF] hover:underline bg-transparent border-none cursor-pointer"
        >
          View all
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {isLoading ? (
          <div className="text-center py-6 text-slate-400 text-xs font-semibold">Loading players…</div>
        ) : players.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-semibold">
            No unallocated players
          </div>
        ) : (
          players.map((p) => {
            const primaryClass = p.primaryClass || (p.preferredClasses && p.preferredClasses.length > 0 ? p.preferredClasses[0] : null);

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (p._id || p.id) {
                    markItemAsRead("unallocatedPlayers", String(p._id || p.id));
                  }
                }}
                className="flex flex-col gap-2 p-3 rounded border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:border-blue-300 dark:hover:border-blue-900 transition-all shadow-xs cursor-pointer"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/json", JSON.stringify({
                    playerId: p.id,
                    registrationRequestId: p.registrationRequestId,
                    paymentStatus: p.paymentStatus || "TRIAL",
                    categoryId: p.categoryId,
                    programId: p.programId,
                    categoryName: p.categoryName,
                    programName: p.fullProgramName,
                    preferredClasses: p.preferredClasses || []
                  }));
                }}
              >
                {/* Header Row: Player Avatar, Name & Requested Target Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 leading-tight truncate">
                        {p.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {p.details}
                      </span>
                    </div>
                  </div>

                  {/* Target Jump Pill Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (p._id || p.id) {
                        markItemAsRead("unallocatedPlayers", String(p._id || p.id));
                      }
                      onNavigateToTarget?.(p);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-white bg-[#0047FF] hover:bg-blue-700 active:scale-95 transition-all rounded shadow-xs cursor-pointer shrink-0"
                    title={
                      primaryClass
                        ? `Jump to ${primaryClass.dayOfWeek} ${primaryClass.startTime}`
                        : p.fullProgramName && p.fullProgramName !== "N/A"
                        ? `Jump to ${p.fullProgramName}`
                        : `Jump to ${p.categoryName || "Academy"}`
                    }
                  >
                    <span className="truncate max-w-[90px]">
                      {primaryClass
                        ? `${primaryClass.dayOfWeek?.substring(0, 3)} ${primaryClass.startTime}`
                        : p.fullProgramName && p.fullProgramName !== "N/A"
                        ? p.fullProgramName
                        : p.categoryName || "Go"}
                    </span>
                    <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>

                {/* Requested Hierarchy Path */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-400 font-semibold text-[9px] uppercase tracking-wider">
                    Target:
                  </span>
                  <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                    <span className="text-blue-600 dark:text-blue-400">
                      {p.categoryName || "Academy"}
                    </span>
                    {p.fullProgramName && p.fullProgramName !== "N/A" && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">›</span>
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {p.fullProgramName}
                        </span>
                      </>
                    )}
                  </div>
                  {p.termName && (
                    <span className="text-[9px] text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                      {p.termName}
                    </span>
                  )}
                </div>

                {/* Requested Class / Session (if any) */}
                {primaryClass && (
                  <div className="flex items-center gap-1.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-1.5 rounded text-[10px]">
                    <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-indigo-900 dark:text-indigo-200">
                        {primaryClass.dayOfWeek} {primaryClass.startTime}{primaryClass.endTime ? ` - ${primaryClass.endTime}` : ""}
                      </span>
                      {primaryClass.location && (
                        <span className="text-indigo-600 dark:text-indigo-400 text-[9px] block truncate">
                          📍 {primaryClass.location}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Submission Timestamp Footer */}
                <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 pt-0.5">
                  <span>Form Submitted:</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                    {p.requested}
                  </span>
                </div>

                {/* Action Buttons Row: [ Go to Request ] and [ Assign ] */}
                <div className="mt-1 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (p._id || p.id) {
                        markItemAsRead("unallocatedPlayers", String(p._id || p.id));
                      }
                      onNavigateToTarget?.(p);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1 px-2 border border-[#0047FF] bg-blue-50/40 hover:bg-[#0047FF] text-[#0047FF] hover:text-white dark:bg-blue-950/20 dark:hover:bg-blue-600 dark:hover:text-white text-[9px] font-bold transition-all rounded cursor-pointer"
                    title="Jump view directly to this player's requested class or program"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Go to Request</span>
                  </button>

                  {onAssignPlayer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (p._id || p.id) {
                          markItemAsRead("unallocatedPlayers", String(p._id || p.id));
                        }
                        onAssignPlayer(p);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1 px-2 bg-[#0047FF] hover:bg-blue-700 text-white text-[9px] font-bold transition-all rounded cursor-pointer shadow-xs"
                      title="Assign to class"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>+ Assign</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <SidebarPlayerPagination label="Unallocated players" page={page} totalItems={totalCount} onPageChange={onPageChange} isLoading={isLoading} />

      {/* Drag area */}
      <div
        onClick={onViewAll}
        className="border border-dashed border-slate-200 dark:border-slate-800 rounded-none p-3 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-950/30 transition-all select-none"
      >
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11.57V10c0-1.105-.895-2-2-2S5 8.895 5 10v1.57c0 1.253.208 2.457.59 3.58m1.282.59A13.917 13.917 0 0012 11.57V10a5 5 0 0110 0v1.57c0 1.253-.208 2.457-.59 3.58m-1.283.59A13.917 13.917 0 0014 11.57V10m0 0a2 2 0 10-4 0M12 2v4M12 6H8m4 0h4" />
        </svg>
        <span className="text-[10px] text-slate-500 font-semibold text-center leading-normal">
          Drag player to allocate to a class <br />
          or click to view all
        </span>
      </div>
    </div>
  );
}
