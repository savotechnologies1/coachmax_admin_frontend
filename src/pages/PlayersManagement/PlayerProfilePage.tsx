import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Edit, PencilLine, ShieldAlert } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import EditPlayerModal from "../../components/players/EditPlayerModal";
import EditPlayerStatsModal from "../../components/players/EditPlayerStatsModal";
import FamilyPlayerSwitcher from "../../components/players/FamilyPlayerSwitcher";
import PlayerTermDashboard from "../../components/players/PlayerTermDashboard";
import RatingEditor from "../../components/players/RatingEditor";
import ChatActionButton from "../../components/chat/ChatActionButton";
import { useAdminPlayerDetails } from "../../hooks/usePlayers";
import { findCurrentTerm } from "../../hooks/useCurrentTerm";
import type { Term } from "../../hooks/useTerms";
import { chatApi } from "../../services/chatApi";
import { ageGroupForYear, formatDateOnly, formatTimestampDate } from "../../utils/dateTime";
import { getMediaFallback, getMediaUrl } from "../../utils/media";

function Detail({ title, value }: { title: string; value?: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-gray-500">{title}</dt><dd className="mt-1 break-words text-sm font-semibold text-gray-900">{value || "—"}</dd></div>;
}

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { data: detailsRes, isLoading, isError } = useAdminPlayerDetails(playerId);
  const [selectedTerm, setSelectedTerm] = useState("CURRENT");
  const [editingPlayer, setEditingPlayer] = useState(false);
  const [editingStats, setEditingStats] = useState(false);
  const data = detailsRes?.data;
  const player = data?.player;
  const parent = data?.parent || player?.parentId;
  const terms: Term[] = data?.availableTerms || [];
  const currentTerm = findCurrentTerm(terms, { isEvent: false }) || findCurrentTerm(terms);
  const termId = selectedTerm === "CURRENT" ? currentTerm?._id || "ALL" : selectedTerm;
  const selectedTermRecord = terms.find((term) => String(term._id) === termId);
  const termLabel = termId === "ALL" ? "All terms" : selectedTerm === "NO_TERM" ? "No term linked" : selectedTermRecord ? `${selectedTermRecord.name}${selectedTermRecord.year ? ` ${selectedTermRecord.year}` : ""}` : "Current term";

  if (isLoading) return <div className="grid min-h-80 place-items-center text-sm text-gray-500">Loading player details…</div>;
  if (isError || !player) return <div className="border border-gray-200 bg-white p-8 text-center"><h2 className="font-bold text-gray-900">Player details unavailable</h2><p className="mt-1 text-sm text-gray-500">The player record could not be loaded.</p><button onClick={() => navigate("/players")} className="mt-4 bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Back to players</button></div>;

  const name = player.fullName || [player.firstName, player.lastName].filter(Boolean).join(" ") || "Player";
  const avatar = getMediaUrl(player.profileImage, getMediaFallback(name));
  const age = ageGroupForYear(player.dob);
  const address = [parent?.address, parent?.city, parent?.state, parent?.postcode, parent?.country].filter(Boolean).join(", ");
  const status = player.playerStatus || player.status || "Unknown";
  const statusStyle = ["ACTIVE", "APPROVED"].includes(String(status).toUpperCase())
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : ["REJECTED", "INACTIVE"].includes(String(status).toUpperCase())
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : String(status).toUpperCase() === "PENDING"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-gray-200 bg-gray-50 text-gray-600";

  return <div className="space-y-4 pb-8">
    <PageMeta title={`${name} | CoachMax`} description={`Player details for ${name}`} />
    <PageBreadcrumb pageTitle="Player details" subtitle="Choose a term to see this player's activity and payments." items={[{ name: "Players", path: "/players" }]}>
      <button type="button" onClick={() => setEditingPlayer(true)} className="inline-flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"><Edit size={14} /> Edit player</button>
      <button type="button" onClick={() => setEditingStats(true)} className="inline-flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"><PencilLine size={14} /> Edit career stats</button>
      {parent?._id && <ChatActionButton contextLabel={name} buttonText="Chat with parent" className="inline-flex items-center gap-2 bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700" ensureRoom={() => chatApi.openDirectChat(String(parent._id))} />}
    </PageBreadcrumb>

    <section className="border border-gray-200 bg-white">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <img src={avatar} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getMediaFallback(name); }} className="h-16 w-16 shrink-0 rounded-full border border-gray-200 object-cover" />
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold text-[#07194f]">{name}</h1><span className={`border px-2 py-0.5 text-[11px] font-semibold ${statusStyle}`}>{String(status).replace(/_/g, " ")}</span></div><p className="mt-1 text-xs text-gray-600">{player.category?.name || "Player"}{age !== null ? ` · U${age}` : ""}{player.jerseyNumber ? ` · Jersey #${player.jerseyNumber}` : ""}{player.prefferedFoot ? ` · ${player.prefferedFoot} foot` : ""}</p><div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-600"><span>DOB: <strong className="text-gray-900">{formatDateOnly(player.dob) || "—"}</strong></span><span>Parent: <strong className="text-gray-900">{parent?.fullName || "—"}</strong></span>{parent?.phone && <a href={`tel:${parent.phone}`} className="text-blue-700 hover:underline">{parent.phone}</a>}{parent?.email && <a href={`mailto:${parent.email}`} className="max-w-64 truncate text-blue-700 hover:underline">{parent.email}</a>}</div></div>
        <div className="shrink-0 text-xs text-gray-500"><span className="block font-semibold">Player rating</span><RatingEditor playerId={player._id} initialRating={player.rating || 0} /></div>
      </div>
      {player.isMedicalCondition && <div className="flex items-start gap-2 border-t border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><ShieldAlert size={16} className="mt-0.5 shrink-0" /><span><strong>Medical information:</strong> {player.medicalConditionDetails || player.medicalConditions || "Details not provided"}</span></div>}
      <details className="border-t border-gray-200"><summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-gray-50">View personal and parent details</summary><dl className="grid gap-x-6 gap-y-4 border-t border-gray-100 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4"><Detail title="First name" value={player.firstName} /><Detail title="Last name" value={player.lastName} /><Detail title="Gender" value={player.gender} /><Detail title="School" value={player.school} /><Detail title="Programs" value={player.programs?.map((item: any) => item.name).filter(Boolean).join(", ")} /><Detail title="Registered" value={formatTimestampDate(player.createdAt)} /><Detail title="Parent relationship" value={parent?.relationship} /><Detail title="Emergency contact" value={parent?.emergencyContact} /><Detail title="Address" value={address} /></dl></details>
    </section>

    <FamilyPlayerSwitcher children={data?.familyPlayers || []} selectedId={player._id} />

    <section className="flex flex-wrap items-center justify-between gap-3 border border-blue-200 bg-blue-50/50 px-4 py-3"><div><h2 className="text-sm font-bold text-[#07194f]">Showing {termLabel}</h2><p className="text-xs text-gray-600">This selection controls classes, attendance, events, payments, transactions, leagues and coach notes.</p></div><label className="flex items-center gap-2 text-xs font-semibold text-gray-700">Term<select aria-label="Select term for player details" value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value)} className="min-w-44 border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-600"><option value="CURRENT">Current term{currentTerm ? ` · ${currentTerm.name} ${currentTerm.year || ""}` : ""}</option>{terms.filter((term) => String(term._id) !== String(currentTerm?._id)).map((term) => <option key={term._id} value={term._id}>{term.name} {term.year || ""}{term.isEvent ? " · Holiday" : ""}</option>)}<option value="ALL">All terms</option><option value="NO_TERM">No term linked</option></select></label></section>

    <PlayerTermDashboard data={data || {}} player={player} termId={termId} termLabel={termLabel} />
    <EditPlayerStatsModal isOpen={editingStats} onClose={() => setEditingStats(false)} playerId={player._id} playerName={name} initialStats={player.statistics || {}} />
    <EditPlayerModal isOpen={editingPlayer} onClose={() => setEditingPlayer(false)} player={player} />
  </div>;
}
