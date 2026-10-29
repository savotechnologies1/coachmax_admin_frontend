// src/pages/Events/EventList.tsx
import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import { getAllEvents, updateEvent, deleteEvent } from "../../api/eventApi";
import { getMediaUrl } from "../../utils/media";
import { Link, useNavigate } from "react-router";
import {
    MapPin,
    Calendar,
    ExternalLink,
    MoreVertical,
    CheckCircle,
    AlertCircle,
    Clock3,
    Edit,
    Image as ImageIcon,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Plus
} from "lucide-react";
import toast from "react-hot-toast";
import { Dropdown } from "../../components/ui/dropdown/Dropdown";
import { DropdownItem } from "../../components/ui/dropdown/DropdownItem";
import ConfirmDeleteModal from "../../components/ui/modal/ConfirmDeleteModal";
import { formatDateOnly, todayDateOnly, toDateOnly } from "../../utils/dateTime";

const PAGE_SIZE = 4;
const EVENT_STATUSES = ["ONGOING", "UPCOMING", "COMPLETED"] as const;
type EventStatus = typeof EVENT_STATUSES[number];
const initialSectionPages: Record<EventStatus, number> = { ONGOING: 1, UPCOMING: 1, COMPLETED: 1 };

interface Event {
    _id: string;
    title: string;
    description: string;
    category: string;
    maxParticipants: number;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    venueName: string;
    address: string;
    googleMapLink: string;
    contactPhone: string;
    website: string;
    registrationDeadline: string;
    isRegistrationOpen: boolean;
    bannerImage: string | null;
    status: "UPCOMING" | "ONGOING" | "COMPLETED";
    eventType?: string;
    createdBy?: {
        _id: string;
        name: string;
        email: string;
    };
    stats?: {
        totalSlots: number;
        registered: number;
        availableSlots: number;
    };
}

const statusColors = {
    UPCOMING: "bg-blue-500",
    ONGOING: "bg-success-500",
    COMPLETED: "bg-gray-400"
};

const statusIcons = {
    UPCOMING: Clock3,
    ONGOING: AlertCircle,
    COMPLETED: CheckCircle
};

export default function EventList() {
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
    const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sectionPages, setSectionPages] = useState<Record<EventStatus, number>>(initialSectionPages);
    const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));

    const today = todayDateOnly();
    const currentYear = String(new Date().getFullYear());
    const availableYears = useMemo(() => Array.from(new Set(events
        .map((event) => (toDateOnly(event.startDate) || toDateOnly(event.endDate)).slice(0, 4))
        .filter((year) => /^\d{4}$/.test(year)).concat(currentYear)))
        .sort((a, b) => b.localeCompare(a)), [events, currentYear]);

    const orderedEvents = useMemo(() => events
        .map((event) => {
            const endDate = toDateOnly(event.endDate);
            // Keep admin-selected status for active/future events. Ended events
            // always move to Completed once their end date has passed.
            const status = endDate && endDate < today ? "COMPLETED" : event.status;
            return { ...event, status };
        })
        .filter((event) => selectedYear === "all" || (toDateOnly(event.startDate) || toDateOnly(event.endDate)).startsWith(selectedYear))
        .sort((a, b) => {
            const statusOrder = { ONGOING: 0, UPCOMING: 1, COMPLETED: 2 };
            const statusCompare = statusOrder[a.status] - statusOrder[b.status];
            if (statusCompare) return statusCompare;

            if (a.status === "COMPLETED") {
                const dateCompare = toDateOnly(b.endDate).localeCompare(toDateOnly(a.endDate));
                if (dateCompare) return dateCompare;
            } else {
                const dateCompare = toDateOnly(a.startDate).localeCompare(toDateOnly(b.startDate));
                if (dateCompare) return dateCompare;
            }
            return a.title.localeCompare(b.title);
        }), [events, today, selectedYear]);
    const visibleSections = [
        { status: "ONGOING" as const, title: "Live & Ongoing", description: "Events in progress" },
        { status: "UPCOMING" as const, title: "Upcoming", description: "Events scheduled to start" },
        { status: "COMPLETED" as const, title: "Completed", description: "Events past their end date" },
    ].map((section) => {
        const sectionEvents = orderedEvents.filter((event) => event.status === section.status);
        const totalPages = Math.max(1, Math.ceil(sectionEvents.length / PAGE_SIZE));
        const currentPage = Math.min(sectionPages[section.status], totalPages);
        return {
            ...section,
            count: sectionEvents.length,
            page: currentPage,
            totalPages,
            events: sectionEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        };
    }).filter((section) => section.count > 0);

    useEffect(() => {
        setSectionPages((current) => {
            const next = { ...current };
            let changed = false;
            EVENT_STATUSES.forEach((status) => {
                const count = orderedEvents.filter((event) => event.status === status).length;
                const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));
                if (next[status] > lastPage) {
                    next[status] = lastPage;
                    changed = true;
                }
            });
            return changed ? next : current;
        });
    }, [orderedEvents]);

    const fetchEvents = async () => {
        try {
            const data = await getAllEvents();
            if (data.success) {
                setEvents(data.data);
                setSectionPages(initialSectionPages);
            }
        } catch (err) {
            console.error("Error fetching events:", err);
            toast.error("Failed to load events.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const result = await updateEvent(id, { status: newStatus });
            if (result?.success === false) {
                throw new Error(result.message || "The event status could not be updated.");
            }
            toast.success(`Event marked as ${newStatus.toLowerCase()}`);
            setEvents(prev => prev.map(ev => ev._id === id ? { ...ev, status: newStatus as any } : ev));
            setOpenStatusMenuId(null);
        } catch (err) {
            console.error("Error updating status:", err);
            toast.error("Failed to update status.");
        }
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteModalId(id);
    };

    const confirmDelete = async () => {
        if (!deleteModalId) return;
        setIsDeleting(true);
        try {
            await deleteEvent(deleteModalId);
            toast.success("Event removed from active events. Its history has been preserved.");
            setEvents(prev => prev.filter(ev => ev._id !== deleteModalId));
        } catch (err) {
            console.error("Error deleting event:", err);
            toast.error("Failed to delete event.");
        } finally {
            setIsDeleting(false);
            setDeleteModalId(null);
        }
    };

    const formatDate = (dateString: string) => {
        return formatDateOnly(dateString, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    return (
        <>
            <PageMeta
                title="CoachMax | Event Explorer"
                description="Comprehensive management of all tournaments and coaching programs."
            />
            <PageBreadcrumb pageTitle="Event Inventory">
                <Link
                    to="/add-event"
                    className="inline-flex items-center justify-center gap-2 bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-theme-xs transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                    <Plus size={16} aria-hidden="true" />
                    Add Event
                </Link>
            </PageBreadcrumb>

            {loading ? (
                <div className="flex justify-center items-center py-40">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent align-[-0.125em]" />
                </div>
            ) : orderedEvents.length > 0 ? (
                <>
                <div className="mb-6 flex flex-col gap-4 border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-white">Event schedule</h2>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Live events first, then upcoming events, with completed events listed last.</p>
                    </div>
                    <label className="flex items-center gap-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        <span>Year</span>
                        <select
                            aria-label="Filter events by year"
                            value={selectedYear}
                            onChange={(e) => { setSelectedYear(e.target.value); setSectionPages(initialSectionPages); }}
                            className="min-h-11 min-w-40 border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        >
                            <option value="all">All years</option>
                            {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                    </label>
                </div>
                <div className="space-y-8">
                  {visibleSections.map((section) => (
                    <section key={section.status} aria-labelledby={`event-section-${section.status}`}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 id={`event-section-${section.status}`} className="text-lg font-bold text-gray-900 dark:text-white">{section.title}</h2>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{section.description}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{section.count}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {section.events.map((event) => {
                        const StatusIcon = statusIcons[event.status];
                        return (
                            <div
                                key={event._id}
                                className="group bg-white dark:bg-gray-900 rounded-none border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                                onClick={() => navigate(`/event-details/${event._id}`)}
                            >
                                <div className="h-48 bg-gray-100 dark:bg-gray-800 relative ring-1 ring-inset ring-black/5 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    {event.bannerImage ? (
                                        <img
                                            src={getMediaUrl(event.bannerImage)}
                                            alt={event.title}
                                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaUrl(); }}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/10 gap-3">
                                            <ImageIcon size={32} className="text-gray-200" />
                                            <span className="text-[10px] font-bold text-gray-300 ">Asset Placeholder</span>
                                        </div>
                                    )}

                                    {/* Floating Badge */}
                                    <div className="absolute top-4 left-4 flex items-center gap-2">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold  shadow-lg flex items-center gap-1.5 text-white ${statusColors[event.status]}`}>
                                            <StatusIcon size={12} strokeWidth={3} />
                                            {event.status}
                                        </span>
                                    </div>

                                    {/* Actions Dropdown */}
                                    <div className="absolute top-4 right-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenStatusMenuId(openStatusMenuId === event._id ? null : event._id);
                                            }}
                                            className="p-2 dropdown-toggle bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-none text-gray-800 dark:text-gray-100 shadow-xl hover:text-brand-500 transition-all border border-transparent hover:border-brand-500/20"
                                        >
                                            <MoreVertical size={16} strokeWidth={2.5} />
                                        </button>
                                        <Dropdown
                                            isOpen={openStatusMenuId === event._id}
                                            onClose={() => setOpenStatusMenuId(null)}
                                            className="w-44 p-2 right-0 left-auto z-[999] mt-2 origin-top-right scale-100 animate-in fade-in zoom-in-95 duration-100"
                                        >
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <p className="text-[10px] font-bold text-gray-400 p-2 border-b border-gray-50 dark:border-gray-800 mb-1 ">Event Governance</p>
                                                <DropdownItem
                                                    onClick={() => handleStatusChange(event._id, "UPCOMING")}
                                                    className="flex items-center gap-2 p-2 rounded-none text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                                >
                                                    <Clock3 size={14} />
                                                    <span className="text-xs font-bold  tracking-tighter">Set Upcoming</span>
                                                </DropdownItem>
                                                <DropdownItem
                                                    onClick={() => handleStatusChange(event._id, "ONGOING")}
                                                    className="flex items-center gap-2 p-2 rounded-none text-success-500 hover:bg-success-50 dark:hover:bg-success-500/10 transition-colors"
                                                >
                                                    <AlertCircle size={14} />
                                                    <span className="text-xs font-bold  tracking-tighter">Live Ongoing</span>
                                                </DropdownItem>
                                                <DropdownItem
                                                    onClick={() => handleStatusChange(event._id, "COMPLETED")}
                                                    className="flex items-center gap-2 p-2 rounded-none text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <CheckCircle size={14} />
                                                    <span className="text-xs font-bold  tracking-tighter">Completed</span>
                                                </DropdownItem>
                                            </div>
                                        </Dropdown>
                                    </div>
                                </div>

                                <div className="p-6 relative">
                                    <div className="mb-4">
                                        <h4 className="text-xl font-bold text-gray-800 dark:text-white tracking-tighter leading-tight line-clamp-1 group-hover:text-brand-500 transition-colors">{event.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-bold tracking-[0.1em] px-2 py-0.5 rounded ${
                                                event.eventType === "CAMP" || event.eventType === "HOLIDAY CAMP"
                                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                                    : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                            }`}>
                                                {event.eventType === "CAMP" ? "Holiday Camp" : event.eventType || "Tournament"}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">• {event.category}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-gray-50 dark:border-gray-800/50">
                                        <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                                            <div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded-none">
                                                <MapPin size={14} className="text-brand-500" />
                                            </div>
                                            <span className="truncate">{event.venueName}, {event.address}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                                            <div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded-none">
                                                <Calendar size={14} className="text-brand-500" />
                                            </div>
                                            <span>{formatDate(event.startDate)} - {formatDate(event.endDate)}</span>
                                        </div>
                                    </div>

                                    {/* Enhanced Stats Section */}
                                    {event.stats && (
                                        <div className="mt-5 space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-bold ">
                                                <span className="text-gray-400 ">Enrollment Progress</span>
                                                <span className="text-brand-500">
                                                    {event.stats.registered} / {event.stats.totalSlots} Slots
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-500 transition-all duration-1000"
                                                    style={{ width: `${Math.min(100, (event.stats.registered / event.stats.totalSlots) * 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] font-bold text-success-500  tracking-tighter">
                                                {event.stats.availableSlots} SLOTS REMAINING
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-6 flex flex-col gap-4">
                                        {event.createdBy && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                                    <span className="text-[8px] font-bold text-gray-400">SA</span>
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-400 tracking-tighter truncate">
                                                    BY: {event.createdBy.name}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800/40 pt-4">
                                            <div className="flex -space-x-2">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 shadow-sm overflow-hidden flex items-center justify-center">
                                                        <span className="text-[8px] font-bold text-gray-500">CM</span>
                                                    </div>
                                                ))}
                                                <div className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 bg-brand-500 shadow-sm flex items-center justify-center">
                                                    <span className="text-[8px] font-bold text-white">+{event.stats?.availableSlots || 0}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleDeleteClick(event._id, e)}
                                                    className="group/btn flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500 rounded-none text-red-500 hover:text-white transition-all font-bold text-[9px] shadow-sm"
                                                >
                                                    <Trash2 size={12} className="group-hover/btn:scale-110 transition-transform" />
                                                    DELETE
                                                </button>
                                                <Link
                                                    to={`/edit-event/${event._id}`}
                                                    className="group/btn flex items-center gap-2 px-3 py-2 bg-brand-500/10 hover:bg-brand-500 rounded-none text-brand-500 hover:text-white transition-all font-bold  text-[9px] shadow-sm"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Edit size={12} className="group-hover/btn:rotate-12 transition-transform" />
                                                    EDIT
                                                </Link>
                                                <Link
                                                    to={`/event-details/${event._id}`}
                                                    className="group/btn flex items-center gap-2 px-3 py-2 bg-success-500/10 hover:bg-success-500 rounded-none text-success-500 hover:text-white transition-all font-bold  text-[9px] shadow-sm"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    VIEW
                                                    <ExternalLink size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                      </div>
                      {section.totalPages > 1 && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Showing {(section.page - 1) * PAGE_SIZE + 1}–{Math.min(section.page * PAGE_SIZE, section.count)} of {section.count} {section.status.toLowerCase()} events
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={section.page === 1}
                              onClick={() => setSectionPages((current) => ({ ...current, [section.status]: Math.max(1, current[section.status] - 1) }))}
                              className="inline-flex items-center gap-1 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
                            >
                              <ChevronLeft size={14} /> Previous
                            </button>
                            <span className="px-2 text-xs font-bold text-gray-700 dark:text-gray-200">Page {section.page} of {section.totalPages}</span>
                            <button
                              type="button"
                              disabled={section.page === section.totalPages}
                              onClick={() => setSectionPages((current) => ({ ...current, [section.status]: Math.min(section.totalPages, current[section.status] + 1) }))}
                              className="inline-flex items-center gap-1 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
                            >
                              Next <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  ))}
                </div>
                </>
            ) : events.length > 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 bg-white px-6 py-20 text-center dark:border-gray-800 dark:bg-gray-900">
                    <Calendar size={40} className="mb-3 text-gray-300 dark:text-gray-600" />
                    <h2 className="text-base font-bold text-gray-800 dark:text-white">No events for {selectedYear}</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose another year to view its events.</p>
                    <button type="button" onClick={() => { setSelectedYear("all"); setSectionPages(initialSectionPages); }} className="mt-4 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">Show all years</button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-gray-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
                    <AlertCircle size={48} className="text-gray-100 mb-4" />
                    <p className="text-sm font-bold tracking-[0.3em] text-gray-400 ">No events enlisted yet.</p>
                    <Link to="/add-event" className="mt-6 text-brand-500 font-bold hover:underline">Launch your first event</Link>
                </div>
            )}
            <ConfirmDeleteModal
                isOpen={!!deleteModalId}
                onClose={() => setDeleteModalId(null)}
                onConfirm={confirmDelete}
                loading={isDeleting}
                title="Delete Event"
                message="The event will be removed from active event lists. Active registrations will be cancelled. Attendance, paid invoices, and chat history will be kept for records."
            />
        </>
    );
}
