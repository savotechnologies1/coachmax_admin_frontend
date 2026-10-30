import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { deleteEvent, getEventDetails, getEventParticipants, exportEventParticipants, removeEventRegistration } from "../../api/eventApi";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import {
  Calendar,
  MapPin,
  Globe,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  Star,
  ExternalLink,
  Layers,
  PhoneCall,
  Download,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2
} from "lucide-react";
import Badge from "../ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import toast from "react-hot-toast";
import HolidayCampAttendanceDashboard from "./HolidayCampAttendanceDashboard";
import HolidayCampRegistrationModal from "./HolidayCampRegistrationModal";
import Button from "../ui/button/Button";
import { UserPlus, UserCheck2, List } from "lucide-react";
import { useSidebarBadges } from "../../hooks/useSidebarBadges";
import { formatDateOnly, formatDateTime, toDateOnly } from "../../utils/dateTime";
import { sortPlayersByPaymentStatus } from "../../utils/paymentStatus";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";

interface EventStats {
  totalSlots: number;
  registered: number;
  availableSlots: number;
  cancelled?: number;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  category: string;
  maxParticipants: number;
  startDate: string;
  endDate: string;
  venueName: string;
  address: string;
  googleMapLink: string;
  contactPhone: string;
  website: string;
  registrationDeadline: string;
  isRegistrationOpen: boolean;
  bannerImage: string | null;
  status: string;
  stats: EventStats;
}

interface User {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  club: string;
  programType: string;
  profile?: string;
}

interface Participant {
  _id: string;
  user: User;
  status: string;
  paymentStatus?: string;
  createdAt: string;
}

const EventDetailsComp: React.FC = () => {
  const { markItemAsRead } = useSidebarBadges();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const [exportOpen, setExportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"attendance" | "roster">("attendance");
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [campSessions, setCampSessions] = useState<any[]>([]);
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [registrationToRemove, setRegistrationToRemove] = useState<Participant | null>(null);
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);
  const [isDeleteEventOpen, setIsDeleteEventOpen] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  const orderedParticipants = useMemo(
    () => sortPlayersByPaymentStatus(participants, (participant) => participant.paymentStatus, (participant) => participant.user?.fullName),
    [participants]
  );

  const handleExport = async (format: "csv" | "excel") => {
    if (!id) return;
    try {
      toast.loading(`Preparing ${format.toUpperCase()} export...`, { id: "export" });
      const blob = await exportEventParticipants(id, format);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Participants_${event?.title || "Event"}_${new Date().getTime()}.${format === "excel" ? "xlsx" : "csv"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${format.toUpperCase()} Exported successfully!`, { id: "export" });
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Please try again.", { id: "export" });
    } finally {
      setExportOpen(false);
    }
  };

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getEventDetails(id);
      if (res.success) {
        setEvent(res.data);
        if (res.data.campSessions) {
          setCampSessions(res.data.campSessions);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch event details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchParticipants = useCallback(async () => {
    if (!id) return;
    setParticipantsLoading(true);
    try {
      const res = await getEventParticipants(id, page, limit);
      if (res.success) {
        setParticipants(res.data);
        setTotalPages(Math.ceil(res.total / limit) || 1);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch participants.");
    } finally {
      setParticipantsLoading(false);
    }
  }, [id, page]);

  const confirmRemovePlayer = async () => {
    if (!registrationToRemove) return;
    setIsRemovingPlayer(true);
    try {
      await removeEventRegistration(registrationToRemove._id);
      toast.success(`${registrationToRemove.user?.fullName || "Player"} removed from the event`);
      setRegistrationToRemove(null);
      if (participants.length <= 1 && page > 1) setPage((current) => current - 1);
      else await fetchParticipants();
      await fetchDetails();
      setAttendanceRefreshKey((current) => current + 1);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not remove player from the event");
    } finally {
      setIsRemovingPlayer(false);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!event) return;
    setIsDeletingEvent(true);
    try {
      await deleteEvent(event._id);
      toast.success("Event removed from active events. Its history has been preserved.");
      navigate("/events");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not delete event");
    } finally {
      setIsDeletingEvent(false);
      setIsDeleteEventOpen(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const formatDate = (date: string) => {
    return formatDateOnly(date, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-gray-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
        <AlertCircle size={48} className="text-gray-100 mb-4" />
        <p className="text-sm font-bold tracking-[0.3em] text-gray-400 ">Event not found.</p>
      </div>
    );
  }

  const startDate = toDateOnly(event.startDate);
  const endDate = toDateOnly(event.endDate);
  const hasReversedDates = Boolean(startDate && endDate && startDate > endDate);
  const metrics = [
    { label: "Total Capacity", value: event.stats.totalSlots, icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Registered", value: event.stats.registered, icon: UserCheck, color: "text-success-500", bg: "bg-success-500/10" },
    { label: "Remaining", value: event.stats.availableSlots, icon: Layers, color: "text-brand-500", bg: "bg-brand-500/10" },
  ];

  return (
    <div className="space-y-3.5 pb-6">
      {hasReversedDates && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <span>End date is before start date. Check and correct this event's dates.</span>
          <button type="button" onClick={() => navigate(`/edit-event/${event._id}`)} className="font-semibold underline underline-offset-2">Edit event dates</button>
        </div>
      )}
      {/* Sleek Compact Event Header (Minimum Height to prioritize Attendance visibility) */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-200">
        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Event Info */}
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-950/40 text-[#1d4ed8] dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100 dark:border-blue-900/50 shadow-sm">
              <Calendar size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm md:text-base font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                  {event.title}
                </h1>
                <Badge
                  color={event.status === "UPCOMING" || event.status === "ONGOING" ? "success" : "warning"}
                  variant="light"
                  className="font-bold text-[9px] px-2 py-0.2"
                >
                  {event.status}
                </Badge>
                <Badge
                  color="info"
                  variant="light"
                  className="font-bold text-[9px] px-2 py-0.2"
                >
                  {event.category}
                </Badge>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <Clock size={11} className="text-brand-500" />
                  {formatDate(event.startDate)} - {formatDate(event.endDate)}
                </span>
                {event.venueName && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-brand-500" />
                      {event.venueName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Middle: Compact Stats Badges */}
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/60 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Capacity</span>
              <span className="text-xs font-bold text-gray-800 dark:text-white">{event.stats.totalSlots}</span>
            </div>
            <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Registered</span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{event.stats.registered}</span>
            </div>
            <div className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Remaining</span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{event.stats.availableSlots}</span>
            </div>
          </div>

          {/* Right: Actions & Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/edit-event/${event._id}`)}
              className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteEventOpen(true)}
              className="px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Trash2 size={13} /> Delete
            </button>
            <button
              type="button"
              onClick={() => setIsRegModalOpen(true)}
              className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            >
              <UserPlus size={13} />
              Register
            </button>
            <button
              type="button"
              onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs flex items-center gap-1 transition-all border border-gray-200 dark:border-gray-700"
              title={isOverviewExpanded ? "Hide Logistics & Overview" : "Show Logistics & Overview"}
            >
              <span>{isOverviewExpanded ? "Hide Details" : "Event Info"}</span>
              {isOverviewExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Collapsible Expanded Details (Only shown when expanded) */}
        {isOverviewExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-800 transition-all duration-300">
            {/* Banner Section if has image */}
            <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-950 sm:h-48 lg:h-56">
              {event.bannerImage ? (
                <img
                  src={getMediaUrl(event.bannerImage)}
                  alt={`${event.title} banner`}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaUrl(); }}
                  className="absolute inset-0 h-full w-full object-contain p-1"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 pointer-events-none">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600">Event image unavailable</span>
                </div>
              )}
            </div>
            
            {/* Info Grid */}
            <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-gray-50/50 dark:bg-gray-800/20">
              {/* Description */}
              {event.description && (
                <div className="lg:col-span-12">
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">{event.description}</p>
                </div>
              )}

              {/* Logistics */}
              <div className="lg:col-span-6 bg-white dark:bg-gray-800 p-3.5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-2">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tournament Logistics</h4>
                <div className="text-xs space-y-1.5">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Address:</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{event.address || "N/A"}</span>
                    {event.googleMapLink && (
                      <a href={event.googleMapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-brand-500 font-bold hover:underline ml-2">
                        Map <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Enrollment Deadline:</span>
                    <span className="font-semibold text-red-600">{formatDate(event.registrationDeadline)}</span>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="lg:col-span-6 bg-[#031549] text-white p-3.5 shadow-sm space-y-2">
                <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Support & Contact</h4>
                <div className="text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={13} className="text-blue-400" />
                    <span>{event.contactPhone || "N/A"}</span>
                  </div>
                  {event.website && (
                    <div className="flex items-center gap-2">
                      <Globe size={13} className="text-blue-400" />
                      <span className="truncate">{event.website}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Registered Players List or Camp Attendance Dashboard */}
      <div className="space-y-3">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("attendance")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === "attendance"
                  ? "border-[#1d4ed8] text-[#1d4ed8] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <UserCheck2 size={15} />
              Holiday Camp Attendance & Sessions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("roster")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === "roster"
                  ? "border-[#1d4ed8] text-[#1d4ed8] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <List size={15} />
              Participant Roster ({event.stats.registered})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsRegModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#031549] text-white hover:bg-brand-600 text-xs font-bold transition-all shadow-sm"
          >
            <UserPlus size={14} />
            Add Registration
          </button>
        </div>

        {activeTab === "attendance" && (
          <HolidayCampAttendanceDashboard
            key={`${event._id}_${attendanceRefreshKey}`}
            eventId={event._id}
            onRosterChange={() => {
              void fetchDetails();
              void fetchParticipants();
              setAttendanceRefreshKey((current) => current + 1);
            }}
          />
        )}

        {activeTab === "roster" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-gray-900 rounded-none border border-gray-100 dark:border-gray-800 shadow-sm">
                  <Users size={24} className="text-brand-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold  tracking-tighter text-gray-800 dark:text-white leading-none">Registered Roster</h3>
                  <p className="text-[10px] font-bold text-gray-400  mt-1">Confirmed participants for this program</p>
                </div>
              </div>
              <div className="flex bg-gray-50 dark:bg-white/5 p-2 rounded-none border border-gray-100 dark:border-white/5 gap-3">
                <div className="relative">
                  <button
                    onClick={() => setExportOpen(!exportOpen)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-brand-500 rounded-none text-white text-[10px] font-bold  shadow-lg shadow-brand-500/20 active:scale-95 transition-all dropdown-toggle"
                  >
                    <Download size={14} />
                    Export Data
                    <ChevronDown size={12} className={`transition-transform duration-300 ${exportOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <Dropdown
                    isOpen={exportOpen}
                    onClose={() => setExportOpen(false)}
                    className="w-40 p-2 mt-2"
                  >
                    <p className="text-[9px] font-bold text-gray-400 p-2 tracking-tighter border-b border-gray-50 dark:border-gray-800/50 mb-1">Select Format</p>
                    <DropdownItem
                      onClick={() => handleExport("csv")}
                      className="flex items-center gap-2 p-2 rounded-none text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <FileText size={14} className="text-brand-500" />
                      <span className="text-[10px] font-bold  ">CSV Format</span>
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => handleExport("excel")}
                      className="flex items-center gap-2 p-2 rounded-none text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Layers size={14} className="text-success-500" />
                      <span className="text-[10px] font-bold  ">Excel Sheet</span>
                    </DropdownItem>
                  </Dropdown>
                </div>

                <span className="px-4 py-1.5 text-xs font-bold  text-brand-500 flex items-center gap-2 border-l border-gray-200 dark:border-white/10 ml-1 leading-none">
                  Total: {event.stats.registered} / {event.stats.totalSlots}
                </span>
              </div>
            </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="px-8">Player Detail</TableCell>
                <TableCell isHeader className="px-8">Affiliation</TableCell>
                <TableCell isHeader className="px-8">Skill metrics</TableCell>
                <TableCell isHeader className="px-8 text-center">Registration Status</TableCell>
                <TableCell isHeader className="px-4 text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participantsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent" />
                  </TableCell>
                </TableRow>
              ) : orderedParticipants.length > 0 ? (
                orderedParticipants.map((p) => (
                  <TableRow
                    key={p._id}
                    onClick={() => markItemAsRead("eventRegistrations", p._id)}
                    className="group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all"
                  >
                    <TableCell className="px-8">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={getMediaUrl(p.user.profile, getMediaFallback(p.user.fullName || "Player"))}
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaFallback(p.user.fullName || "Player"); }}
                            className="h-12 w-12 rounded-none object-cover ring-2 ring-gray-100 dark:ring-gray-800 group-hover:ring-brand-500/30 transition-all shadow-sm"
                            alt={p.user.fullName}
                          />
                          <div className="absolute -bottom-1 -right-1 p-1 bg-success-500 rounded-none text-white ring-2 ring-white dark:ring-gray-900 shadow-lg">
                            <CheckCircle size={8} strokeWidth={4} />
                          </div>
                        </div>
                        <div>
                          <span className="block text-sm font-bold  text-gray-800 dark:text-white tracking-tight group-hover:text-brand-500 transition-colors cursor-pointer capitalize">
                            {p.user.fullName}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-gray-400 truncate max-w-[120px]">{p.user.email}</span>
                            <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                            <span className="text-[10px] font-bold text-brand-500 tracking-tighter ">{p.user.phone}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-8">
                      <div className="space-y-1">
                        <span className="block text-[11px] font-bold  text-gray-800 dark:text-white truncate max-w-[140px] leading-none">
                          {p.user.club}
                        </span>
                        <span className="block text-[9px] font-bold text-gray-400 ">Academy / Affiliation</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-8">
                      <div className="space-y-2">
                        <Badge size="sm" color="primary" variant="light" className=" font-bold text-[9px] px-3">
                          {p.user.programType}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <Star size={10} className="text-yellow-500 fill-current" />
                          <Star size={10} className="text-yellow-500 fill-current" />
                          <Star size={10} className="text-yellow-500 fill-current" />
                          <span className="text-[9px] font-bold text-gray-400  ml-1 ">Skills Verified</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-8">
                      <div className="flex flex-col items-center">
                        <Badge variant="light" color={p.status === "REGISTERED" ? "success" : "warning"} className=" font-bold text-[9px] tracking-[0.2em] px-5 py-2 rounded-full ring-1 ring-inset ring-current/20">
                          {p.status}
                        </Badge>
                        <span className="text-[8px] font-bold text-gray-400  mt-2">Registered: {formatDateTime(p.createdAt, { dateStyle: "medium" })}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <button
                        type="button"
                        onClick={(click) => { click.stopPropagation(); setRegistrationToRemove(p); }}
                        className="inline-flex items-center gap-1.5 rounded border border-red-200 px-2.5 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                        aria-label={`Remove ${p.user?.fullName || "player"} from this event`}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <Users size={40} className="text-gray-200 mb-3" />
                      <p className="text-[10px] font-bold tracking-[0.3em] text-gray-400 ">No registrations for this event yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination placeholder */}
          {totalPages > 1 && (
            <div className="p-8 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/30">
              <span className="text-[10px] font-bold text-gray-400 ">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-none text-[10px] font-bold  hover:text-brand-500 transition-all shadow-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-none text-[10px] font-bold  hover:text-brand-500 transition-all shadow-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </div>
        )}
      </div>

      {/* Holiday Camp Registration Flow Modal */}
      {event && (
        <HolidayCampRegistrationModal
          event={event}
          sessions={campSessions}
          isOpen={isRegModalOpen}
          onClose={() => setIsRegModalOpen(false)}
          onSuccess={() => {
            fetchDetails();
            fetchParticipants();
            setAttendanceRefreshKey((k) => k + 1);
          }}
        />
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(registrationToRemove)}
        onClose={() => setRegistrationToRemove(null)}
        onConfirm={confirmRemovePlayer}
        loading={isRemovingPlayer}
        title="Remove player from event?"
        message={`This will cancel ${registrationToRemove?.user?.fullName || "this player's"} active registration and free their booked places. Attendance and invoice history will be retained; paid amounts are not refunded automatically.`}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteEventOpen}
        onClose={() => setIsDeleteEventOpen(false)}
        onConfirm={confirmDeleteEvent}
        loading={isDeletingEvent}
        title="Delete event?"
        message="The event will be removed from active event lists. Active registrations will be cancelled. Attendance, paid invoices, and chat history will be kept for records."
      />
    </div>
  );
};

export default EventDetailsComp;
