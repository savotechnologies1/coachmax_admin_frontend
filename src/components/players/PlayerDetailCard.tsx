import { useState } from "react";
import { Link } from "react-router";
import { Player } from "../../types/player";
import { useAdminPlayerDetails, usePlayerProfile, useCoachNotes, useUpdatePlayerPaymentStatus } from "../../hooks/usePlayers";
import AddCoachNoteModal from "../CoachManagement/AddCoachNoteModal";
import EditPlayerStatsModal from "./EditPlayerStatsModal";
import PlayerPaymentHistoryModal from "./PlayerPaymentHistoryModal";
import { ShieldAlert, Edit, Receipt } from "lucide-react";
import RatingEditor from "./RatingEditor";
import { StatusBadge } from "../common/StatusColorCode";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import { ageGroupForYear, formatDateOnly, formatTimestampDate } from "../../utils/dateTime";

const getBadgeStyles = (noteType: string) => {
  switch (noteType) {
    case "POSITIVE_PERFORMANCE":
      return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    case "DEVELOPMENT_AREA":
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
    case "ARRIVED_LATE":
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
    case "BEHAVIOUR_CONCERN":
      return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800";
    case "INJURY":
      return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
    case "MEDICAL_INCIDENT":
      return "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
    case "PARENT_DISCUSSION":
      return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800";
    default:
      return "bg-yellow-100 text-yellow-850 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-850";
  }
};

const getRequestTypeLabel = (requestType?: string) => {
  const labels: Record<string, string> = {
    TEMPORARY: "Temporary Player",
    TEMPORARY_PLAYER: "Temporary Player",
    NEW_PLAYER: "New Player",
    ADD_PROGRAM: "Additional Program",
    HOLIDAY_PROGRAM: "Holiday Program",
    EVENT_REGISTRATION: "Event Registration",
  };
  return requestType ? labels[requestType] || requestType.toLowerCase().replace(/(^|_)\w/g, (part) => part.replace("_", " ").toUpperCase()) : "";
};

interface PlayerDetailCardProps {
  player: Player;
  onClose: () => void;
  onAssignClass?: (player: Player) => void;
  onEditPlayer?: (player: Player) => void;
  isRegistrationRequest?: boolean;
  contextYear?: number;
}

export default function PlayerDetailCard({ player: initialPlayer, onClose, onAssignClass, onEditPlayer, isRegistrationRequest, contextYear }: PlayerDetailCardProps) {
  const playerId = initialPlayer?._id || (initialPlayer as any)?.playerId || (initialPlayer as any)?.id;
  // Query full admin profile details (same source as PlayerProfilePage)
  const { data: adminDetailsRes } = useAdminPlayerDetails(playerId);
  const { data: profileRes } = usePlayerProfile(playerId);
  const playerEnvelope = adminDetailsRes?.data || profileRes?.data;

  // Map clean player and parent data based on the backend response JSON envelope
  const fetchedPlayer = playerEnvelope?.player || playerEnvelope;
  const player: any = {
    ...initialPlayer,
    ...(fetchedPlayer || {}),
    _id: playerId,
    fullName: fetchedPlayer?.fullName || initialPlayer?.fullName || (initialPlayer as any)?.name,
    isMedicalCondition: fetchedPlayer?.isMedicalCondition ?? initialPlayer?.isMedicalCondition ?? (initialPlayer as any)?.isMedicalCondition,
    medicalConditionDetails: fetchedPlayer?.medicalConditionDetails || initialPlayer?.medicalConditionDetails || (initialPlayer as any)?.medicalConditionDetails || (initialPlayer as any)?.medicalConditions,
    medicalConditions: fetchedPlayer?.medicalConditions || initialPlayer?.medicalConditions || (initialPlayer as any)?.medicalConditions,
    gender: fetchedPlayer?.gender || initialPlayer?.gender || (initialPlayer as any)?.gender,
    programs: fetchedPlayer?.programs || initialPlayer?.programs || (initialPlayer as any)?.programs || (fetchedPlayer?.program ? [fetchedPlayer.program] : (initialPlayer?.program ? [initialPlayer.program] : [])),
    category: fetchedPlayer?.category || initialPlayer?.category || (initialPlayer as any)?.category,
  };
  const parent = playerEnvelope?.parent || player?.parentId || (initialPlayer as any)?.parent;
  const overallAttendance = playerEnvelope?.overallAttendance;
  const statistics = player.statistics || {};

  // Extract assigned classes with per-class payment status
  const assignedClassesInfo: any[] =
    playerEnvelope?.assignedClassesPaymentInfo ||
    playerEnvelope?.classPaymentSummary?.assignedClassesWithPaymentStatus ||
    player?.classPaymentStatuses?.map((cps: any) => ({
      classId: cps.class?._id || cps.class,
      className: cps.class?.name || "Class",
      paymentStatus: cps.paymentStatus
    })) ||
    player?.assignedClasses?.map((c: any) => ({
      classId: c._id || c.id,
      className: c.name || c.className || "Class",
      paymentStatus: c.paymentStatus || player?.paymentStatus || "UNPAID",
      dayOfWeek: c.dayOfWeek,
      startTime: c.startTime,
      endTime: c.endTime,
      location: c.location
    })) || [];

  // Extract assigned teams with team payment status
  const assignedTeamsInfo: any[] =
    playerEnvelope?.assignedTeamsPaymentInfo ||
    playerEnvelope?.teamPaymentSummary?.assignedTeamsWithPaymentStatus || [];

  const { data: notesRes } = useCoachNotes(playerId);
  const notes = notesRes?.data || [];
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const updatePaymentStatusMutation = useUpdatePlayerPaymentStatus();

  const avatar = getMediaUrl(player.profileImage, getMediaFallback(player.fullName));

  // Safe date parsing to avoid "Invalid Date" values
  const age = ageGroupForYear(player.dob, contextYear);
  const dobString = formatDateOnly(player.dob) || null;

  const registrationDateString = formatTimestampDate(player.createdAt) || null;

  const activeStatus = player.playerStatus || player.status;
  const paymentStatus = player.paymentStatus;

  // Address assembly
  const addressParts = [
    parent?.address,
    parent?.city,
    parent?.state,
    parent?.postcode,
    parent?.country
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  const activePrograms = player.programs || (player.program ? [player.program] : []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[420px] bg-white border-l border-slate-100 shadow-2xl dark:bg-slate-900 dark:border-slate-800 p-6 overflow-y-auto transform transition-transform duration-300 flex flex-col justify-between">

        {/* Scrollable Container */}
        <div className="flex-1 space-y-6 pb-6 custom-scrollbar overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-800/40 pb-4">
            <div className="flex items-center gap-3">
              <img
                src={avatar}
                alt={player.fullName}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#0047FF] shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {player.fullName}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeStatus && (
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${activeStatus === "ACTIVE" || activeStatus === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                        }`}>
                        {activeStatus}
                      </span>
                    )}
                    {paymentStatus && (
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${paymentStatus === "PAID"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                          : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                        }`}>
                        {paymentStatus.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mt-1">
                  {player.jerseyNumber ? `Jersey #${player.jerseyNumber}` : "No Jersey"}
                  {player.prefferedFoot && ` • Preferred Foot: ${player.prefferedFoot}`}
                </span>

                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold text-slate-400">
                  <span>Rating:</span>
                  <RatingEditor playerId={player._id} initialRating={player.rating || 0} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onEditPlayer && (
                <button
                  type="button"
                  onClick={() => onEditPlayer(player)}
                  className="text-slate-400 hover:text-[#0047FF] dark:hover:text-blue-400 p-1 transition-colors"
                  title="Edit Player"
                >
                  <Edit size={17} />
                </button>
              )}
              <button
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                onClick={onClose}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Medical Warning Alert (Prioritized at the top) */}
          {player.isMedicalCondition && (
            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 flex items-start gap-2.5 shadow-sm">
              <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-800 dark:text-red-400">Medical Warning & Allergies</h4>
                <p className="text-[11px] text-red-900 dark:text-red-300 font-semibold mt-0.5">
                  {player.medicalConditionDetails || player.medicalConditions || "Details not specified by parent."}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Personal Information */}
          <div className="text-xs text-slate-700 dark:text-slate-350">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] mb-3 pb-1 border-b border-slate-50 dark:border-slate-800/40">
              Personal Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block mb-0.5">Full Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{player.fullName}</span>
              </div>
              {dobString && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {dobString} {age !== null && <span className="text-slate-400 font-normal">(U{age})</span>}
                  </span>
                </div>
              )}
              {player.gender && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Gender</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{player.gender}</span>
                </div>
              )}
              {player.category?.name && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Category</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{player.category.name}</span>
                </div>
              )}
              {activePrograms.length > 0 && (
                <div className="col-span-2">
                  <span className="text-slate-400 block mb-0.5">Program</span>
                  <span className="font-bold text-[#0047FF] dark:text-blue-400">
                    {activePrograms.map((p: any) => p.name).join(", ")}
                  </span>
                </div>
              )}
              {player.school && (
                <div className="col-span-2">
                  <span className="text-slate-400 block mb-0.5">School</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{player.school}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Contact Information */}
          {parent && (
            <div className="text-xs text-slate-700 dark:text-slate-350">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] mb-3 pb-1 border-b border-slate-50 dark:border-slate-800/40">
                Contact Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {parent.fullName && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Contact Person</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{parent.fullName}</span>
                  </div>
                )}
                {parent.relationship && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Relationship</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{parent.relationship}</span>
                  </div>
                )}
                {parent.email && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block mb-0.5">Email</span>
                    <a
                      href={`mailto:${parent.email}`}
                      className="font-semibold text-[#0047FF] hover:underline truncate block max-w-full"
                    >
                      {parent.email}
                    </a>
                  </div>
                )}
                {parent.phone && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Phone</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{parent.phone}</span>
                  </div>
                )}
                {parent.emergencyContact && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Emergency Phone</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{parent.emergencyContact}</span>
                  </div>
                )}
                {fullAddress && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block mb-0.5">Address</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block leading-normal">
                      {fullAddress}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Attendance Overview */}
          {overallAttendance && (
            <div className="text-xs text-slate-700 dark:text-slate-350">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] mb-3 pb-1 border-b border-slate-50 dark:border-slate-800/40">
                Attendance Performance
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-slate-450">Attendance Rate</span>
                    <span className="text-brand-500">{overallAttendance.percentage || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
                    <div
                      className="bg-brand-500 h-1.5 transition-all duration-300"
                      style={{ width: `${overallAttendance.percentage || 0}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-800/30">
                    <span className="text-slate-400 block text-[9px]">Total Sessions</span>
                    <span className="text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">{overallAttendance.totalSessions || 0}</span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-800/30">
                    <span className="text-slate-400 block text-[9px]">Attended</span>
                    <span className="text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">{overallAttendance.attendedCount || 0}</span>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-800/30">
                    <span className="text-slate-400 block text-[9px]">Present</span>
                    <span className="text-emerald-600 text-xs mt-0.5 block">{overallAttendance.presentCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Registration Request Details */}
          {isRegistrationRequest && (
            <div className="text-xs text-slate-700 dark:text-slate-350">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] mb-3 pb-1 border-b border-slate-50 dark:border-slate-800/40">
                Registration Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {player.requestType && (
                  <div>
                    <span className="text-slate-450 block mb-0.5">Request Type</span>
                    <span className="font-semibold text-slate-850 dark:text-slate-200">
                      {getRequestTypeLabel(player.requestType)}
                    </span>
                  </div>
                )}
                {player.preferredTerm && (
                  <div>
                    <span className="text-slate-450 block mb-0.5">{player.requestType === "HOLIDAY_PROGRAM" ? "Preferred Holiday Program" : "Preferred Term"}</span>
                    <span className="font-bold text-[#0047FF] dark:text-blue-400">
                      {player.preferredTerm.name || player.preferredTerm}
                    </span>
                  </div>
                )}
                {player.preferredClasses && player.preferredClasses.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-450 block mb-0.5">Preferred Classes</span>
                    <ul className="list-disc pl-4 font-semibold text-slate-800 dark:text-slate-200 space-y-1">
                      {player.preferredClasses.map((cls: any) => (
                        <li key={cls._id}>{cls.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {onAssignClass && player.requestId && player.status === "PENDING" && (
                <button
                  type="button"
                  onClick={() => onAssignClass(initialPlayer)}
                  className="mt-4 w-full bg-[#0047FF] px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  {player.requestType === "HOLIDAY_PROGRAM"
                    ? player.preferredClasses?.length ? "Assign Holiday Program" : "Choose Holiday Program"
                    : player.preferredClasses?.length ? "Assign Requested Class" : "Choose Term, Program, Sub-program & Session"}
                </button>
              )}
            </div>
          )}

          {/* Section 5: Additional Registration stats */}
          {!isRegistrationRequest && (
            <div className="text-xs text-slate-700 dark:text-slate-350">
              <div className="flex items-center justify-between pb-1 border-b border-slate-50 dark:border-slate-800/40 mb-3">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                  Stats & History
                </h4>
                <button
                  onClick={() => setIsStatsModalOpen(true)}
                  className="text-[10px] font-bold text-[#0047FF] hover:underline uppercase"
                >
                  Edit Stats
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                {registrationDateString && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/30">
                    <span className="text-slate-400 block mb-0.5 text-[9px]">Registered Date</span>
                    <span className="text-slate-800 dark:text-slate-200 text-xs block truncate">
                      {registrationDateString}
                    </span>
                  </div>
                )}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/30">
                  <span className="text-slate-400 block mb-0.5 text-[9px]">Elite Goals</span>
                  <span className="text-slate-800 dark:text-slate-200 text-xs block">{player.goals || statistics.goals || 0}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/30">
                  <span className="text-slate-400 block mb-0.5 text-[9px]">Matches</span>
                  <span className="text-slate-800 dark:text-slate-200 text-xs block">{player.appearances || statistics.appearances || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 5.5: Assigned Classes with per-class Payment Status */}
          {assignedClassesInfo.length > 0 && (
            <div className="text-xs text-slate-700 dark:text-slate-350">
              <div className="flex items-center justify-between pb-1 border-b border-slate-50 dark:border-slate-800/40 mb-3">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <span>Assigned Classes</span>
                  <span className="text-[#0047FF] font-extrabold">({assignedClassesInfo.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsPaymentHistoryOpen(true)}
                  className="text-[10px] font-bold text-[#0047FF] hover:underline uppercase flex items-center gap-1"
                >
                  <Receipt size={11} />
                  <span>Full History & Status</span>
                </button>
              </div>
              <div className="space-y-2">
                {assignedClassesInfo.map((clsItem: any, idx: number) => {
                  const classId = clsItem.classId || clsItem._id || clsItem.id;
                  const className = clsItem.className || clsItem.name || "Class";
                  const status = clsItem.paymentStatus || player?.paymentStatus || "UNPAID";
                  const st = (status || "UNPAID").toUpperCase();
                  const fee = clsItem.fee || clsItem.price;

                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{className}</span>
                          {fee !== undefined && (
                            <span className="text-[10px] font-semibold text-slate-400">(${fee})</span>
                          )}
                        </div>
                        {(clsItem.dayOfWeek || clsItem.startTime || clsItem.termName) && (
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                            {[clsItem.termName, clsItem.dayOfWeek, clsItem.startTime].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={st}
                          onChange={(e) => {
                            if (playerId && classId) {
                              updatePaymentStatusMutation.mutate({
                                userId: playerId,
                                payload: { paymentStatus: e.target.value, classId: classId.toString() },
                              });
                            }
                          }}
                          className={`h-6 px-1.5 text-[9px] font-bold uppercase rounded-none border cursor-pointer ${
                            st === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : st === "UNPAID" || st === "OVER_DUE"
                              ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400"
                              : "bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <option value="PAID">PAID</option>
                          <option value="UNPAID">UNPAID</option>
                          <option value="TRIAL">TRIAL</option>
                          <option value="OVER_DUE">OVER DUE</option>
                          <option value="HANDSHAKE">HANDSHAKE</option>
                          <option value="TBC">TBC</option>
                          <option value="EXTRA">EXTRA</option>
                          <option value="SUBSTITUTE">SUBSTITUTE</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 5.6: Assigned Teams with Team Payment Status */}
          {assignedTeamsInfo.length > 0 && (
            <div className="text-xs text-slate-700 dark:text-slate-350">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] mb-3 pb-1 border-b border-slate-50 dark:border-slate-800/40 flex justify-between items-center">
                <span>Assigned Teams</span>
                <span className="text-[#0047FF] font-extrabold">{assignedTeamsInfo.length}</span>
              </h4>
              <div className="space-y-2">
                {assignedTeamsInfo.map((teamItem: any, idx: number) => {
                  const teamName = teamItem.teamName || teamItem.name || "Team";
                  const status = teamItem.paymentStatus || "PAID";
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{teamName}</span>
                        {teamItem.teamFee !== undefined && (
                          <span className="text-[10px] text-slate-400 font-medium">Fee: ${teamItem.teamFee}</span>
                        )}
                      </div>
                      <div>
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 6: Coach Performance Notes */}
          <div className="text-xs text-slate-700 dark:text-slate-350">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] mb-3 pb-1 border-b border-slate-50 dark:border-slate-800/40">
              Coach Performance Notes
            </h4>
            {notes.length === 0 ? (
              <div className="py-6 text-center text-slate-400 italic">
                No performance notes logged yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {notes.map((note: any) => (
                  <div
                    key={note._id}
                    className="relative p-3.5 bg-[#FEF9C3] dark:bg-yellow-950/20 border border-yellow-250 dark:border-yellow-900/50 shadow-sm rounded-none space-y-1.5 pt-5"
                  >
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500/85 rounded-full" />
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 border uppercase font-bold text-[8px] ${getBadgeStyles(note.noteType)}`}>
                          {note.noteType?.replace("_", " ")}
                        </span>
                        <button
                          onClick={() => setEditingNote(note)}
                          className="text-[#0047FF] hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <span className="text-slate-500 dark:text-yellow-400/60">
                        {formatTimestampDate(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                      {note.description}
                    </p>
                    {note.createdBy && (
                      <div className="text-[9px] text-slate-550 dark:text-yellow-400/50 font-medium text-right italic">
                        — Coach {note.createdBy.name || note.createdBy.email}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        {!isRegistrationRequest && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2 flex items-center gap-2">
            {onEditPlayer && (
              <button
                type="button"
                onClick={() => onEditPlayer(player)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:border-[#0047FF] dark:hover:border-blue-500 bg-white dark:bg-slate-800 hover:text-[#0047FF] dark:hover:text-blue-400 text-slate-700 dark:text-slate-200 font-bold py-2.5 text-xs uppercase tracking-wider transition-colors shadow-xs"
              >
                <Edit size={14} />
                <span>Edit Details</span>
              </button>
            )}
            <Link
              to={`/player/${player._id}`}
              onClick={onClose}
              className={`${onEditPlayer ? "flex-1" : "w-full"} inline-flex items-center justify-center gap-1.5 bg-[#0047FF] hover:bg-blue-700 text-white font-bold py-2.5 text-xs uppercase tracking-wider transition-colors shadow-theme-xs`}
            >
              <span>Full Profile</span>
              <span>&rarr;</span>
            </Link>
          </div>
        )}
      </div>

      {editingNote && (
        <AddCoachNoteModal
          isOpen={editingNote !== null}
          onClose={() => setEditingNote(null)}
          playerId={player._id}
          playerName={player.fullName}
          noteId={editingNote._id}
          initialNoteType={editingNote.noteType}
          initialDescription={editingNote.description}
        />
      )}

      <EditPlayerStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        playerId={player._id}
        playerName={player.fullName}
        initialStats={statistics}
      />

      <PlayerPaymentHistoryModal
        isOpen={isPaymentHistoryOpen}
        onClose={() => setIsPaymentHistoryOpen(false)}
        player={player}
      />
    </>
  );
}
