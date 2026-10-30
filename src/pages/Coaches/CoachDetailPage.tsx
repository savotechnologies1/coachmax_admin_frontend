import { formatDateOnly, formatTimestampDate, APP_TIME_ZONE } from "../../utils/dateTime";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, Users,
  UserRound, ClipboardCheck, Activity, ChevronRight, Mail, Phone,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import { getCoachDetail } from "../../api/adminApi";
import { getMediaUrl, getMediaFallback } from "../../utils/media";
import CoachAccessPanel from "../../components/management/CoachAccessPanel";
import StaffSessionsPanel from "../../components/UserProfile/StaffSessionsPanel";
import { getLocalRole } from "../../hooks/useCoachAccess";

const dateLabel = (value?: string | null, timestamp = false) => (timestamp ? formatTimestampDate(value, APP_TIME_ZONE) : formatDateOnly(value)) || "Date not set";

const formatTime = (value?: string) => value || "Time not set";
const classLink = (navigate: ReturnType<typeof useNavigate>, classId?: string | null) => {
  if (classId) navigate("/classes", { state: { classId } });
};

export default function CoachDetailPage() {
  const { coachId = "" } = useParams<{ coachId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"classes" | "activity">("classes");
  const [classFilter, setClassFilter] = useState("all");
  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ["coach-detail", coachId],
    queryFn: () => getCoachDetail(coachId),
    enabled: Boolean(coachId),
  });

  const data = response?.data || response || {};
  const coach = data.coach;
  const classes = Array.isArray(data.classes) ? data.classes : [];
  const attendance = Array.isArray(data.attendance) ? data.attendance : [];
  const activity = Array.isArray(data.activity) ? data.activity : [];
  const summary = data.summary || {};
  const selectedClass = useMemo(
    () => classFilter === "all" ? null : classes.find((item: any) => String(item.id) === classFilter),
    [classFilter, classes],
  );
  const filteredAttendance = useMemo(
    () => attendance.filter((item: any) => !selectedClass || String(item.classId) === String(selectedClass.id)),
    [attendance, selectedClass],
  );
  const filteredActivity = useMemo(
    () => activity.filter((item: any) => !selectedClass || String(item.classId || "") === String(selectedClass.id)),
    [activity, selectedClass],
  );

  if (isLoading) return <div className="w-full min-w-0 p-6"><div className="h-48 animate-pulse rounded-xl bg-gray-100" /></div>;
  if (isError || !coach) return (
    <div className="w-full min-w-0 p-6">
      <button onClick={() => navigate("/coaches")} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft size={16} /> Coaches</button>
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{(error as Error)?.message || "Coach details could not be loaded."}</div>
    </div>
  );

  const coachName = coach.name || coach.fullName || "Coach";
  const metrics = [
    { label: "Assigned classes", value: summary.assignedClasses ?? classes.length, icon: CalendarDays },
    { label: "Class enrollments", value: summary.playerEnrollments ?? 0, icon: Users },
    { label: "Attendance sessions", value: summary.attendanceSessions ?? 0, icon: ClipboardCheck },
    { label: "Attendance rate", value: `${summary.attendanceRate ?? 0}%`, icon: CheckCircle2 },
    { label: "Sessions recorded by coach", value: summary.sessionsMarkedByCoach ?? 0, icon: Activity },
  ];

  return (
    <div className="w-full min-w-0 space-y-6 p-4 md:p-6">
      <PageMeta title={`CoachMax | ${coachName}`} description={`${coachName} coaching profile, classes, and attendance`} />
      <button onClick={() => navigate("/coaches")} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-blue-700"><ArrowLeft size={16} /> Back to coaches</button>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
          <img
            src={getMediaUrl(coach.profileImage, getMediaFallback(coachName))}
            alt={coachName}
            onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getMediaFallback(coachName); }}
            className="h-20 w-20 rounded-full border-4 border-blue-50 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{coachName}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${coach.isActive === false ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"}`}>{coach.isActive === false ? "Access disabled" : "Active coach"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              {coach.email && <a href={`mailto:${coach.email}`} className="inline-flex items-center gap-2 hover:text-blue-700"><Mail size={15} /> {coach.email}</a>}
              {coach.mobile && <a href={`tel:${coach.mobile}`} className="inline-flex items-center gap-2 hover:text-blue-700"><Phone size={15} /> {coach.mobile}</a>}
              <span className="inline-flex items-center gap-2"><Clock3 size={15} /> Coach since {dateLabel(coach.createdAt, true)}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-gray-100 bg-gray-100 md:grid-cols-3 xl:grid-cols-5">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400"><Icon size={15} /> {label}</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {["SUPER_ADMIN", "ADMIN"].includes(getLocalRole()) && <CoachAccessPanel coachId={coachId} />}
      {["SUPER_ADMIN", "ADMIN"].includes(getLocalRole()) && <StaffSessionsPanel coachId={coachId} />}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-6">
            <button onClick={() => setActiveTab("classes")} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${activeTab === "classes" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>Assigned classes ({classes.length})</button>
            <button onClick={() => setActiveTab("activity")} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${activeTab === "activity" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>Activity & attendance</button>
          </div>
          {activeTab === "activity" && classes.length > 0 && (
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="mb-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500">
              <option value="all">All assigned classes</option>
              {classes.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          )}
        </div>

        {activeTab === "classes" ? (
          classes.length === 0 ? <div className="p-10 text-center"><CalendarDays className="mx-auto text-gray-300" size={32} /><p className="mt-3 font-semibold text-gray-700">No classes assigned yet</p><p className="mt-1 text-sm text-gray-500">Assigned classes will appear here with their term, schedule, players, and attendance.</p></div> :
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {classes.map((item: any) => (
              <article key={item.id} className="rounded-xl border border-gray-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-gray-900">{item.name}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.role === "HEAD" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>{item.role === "HEAD" ? "Lead coach" : "Assistant coach"}</span>
                      {item.status && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{item.status}</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{item.program?.name || "Program not set"} · {item.category?.name || "Category not set"}</p>
                  </div>
                  <button onClick={() => classLink(navigate, item.id)} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900">Open class <ChevronRight size={14} /></button>
                </div>
                <div className="mt-4 grid gap-x-5 gap-y-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2">
                  <div className="flex gap-2 text-gray-600"><CalendarDays size={15} className="mt-0.5 shrink-0 text-blue-600" /><span><b className="font-semibold text-gray-800">{item.term?.name || "Term not set"}</b><br />{dateLabel(item.term?.startDate)} – {dateLabel(item.term?.endDate)}</span></div>
                  <div className="flex gap-2 text-gray-600"><Clock3 size={15} className="mt-0.5 shrink-0 text-blue-600" /><span>{item.schedule?.length ? item.schedule.map((slot: any) => `${slot.dayOfWeek || "Day"} ${formatTime(slot.startTime)}–${formatTime(slot.endTime)}`).join(", ") : `${item.dayOfWeek || "Day not set"} ${formatTime(item.startTime)}–${formatTime(item.endTime)}`}</span></div>
                  <div className="flex gap-2 text-gray-600"><MapPin size={15} className="mt-0.5 shrink-0 text-blue-600" /><span>{item.location || "Location not set"}</span></div>
                  <div className="flex gap-2 text-gray-600"><Users size={15} className="mt-0.5 shrink-0 text-blue-600" /><span>{item.playerCount} enrolled {item.playerCount === 1 ? "player" : "players"}</span></div>
                  <div className="flex gap-2 text-gray-600"><ClipboardCheck size={15} className="mt-0.5 shrink-0 text-blue-600" /><span>{item.attendance?.sessions || 0} attendance sessions · {item.attendance?.rate || 0}% attendance rate</span></div>
                  <div className="flex gap-2 text-gray-600"><UserRound size={15} className="mt-0.5 shrink-0 text-blue-600" /><span>Lead: {item.coach?.name || "Not assigned"}{item.assistantCoach?.name ? ` · Assistant: ${item.assistantCoach.name}` : ""}</span></div>
                </div>
                {item.players?.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Players in this class</p>
                    <div className="flex flex-wrap gap-2">
                      {item.players.map((player: any) => (
                        <button key={player.id} onClick={() => navigate(`/player/${player.id}`)} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pl-1 pr-3 text-xs font-medium text-gray-700 transition hover:border-blue-200 hover:text-blue-700">
                          <img src={getMediaUrl(player.profileImage, getMediaFallback(player.name))} alt="" className="h-6 w-6 rounded-full object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getMediaFallback(player.name); }} />
                          {player.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="p-5">
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Present", filteredAttendance.reduce((sum: number, row: any) => sum + row.present, 0), "text-emerald-700"],
                ["Late", filteredAttendance.reduce((sum: number, row: any) => sum + row.late, 0), "text-amber-700"],
                ["Absent", filteredAttendance.reduce((sum: number, row: any) => sum + row.absent, 0), "text-rose-700"],
                ["Unmarked", filteredAttendance.reduce((sum: number, row: any) => sum + row.notMarked, 0), "text-gray-600"],
              ].map(([label, value, color]) => <div key={String(label)} className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{label}</p><p className={`mt-1 text-xl font-bold ${color}`}>{value}</p></div>)}
            </div>
            {filteredActivity.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No attendance or coach activity recorded for this selection.</div> : (
              <div className="divide-y divide-gray-100">
                {filteredActivity.map((item: any) => (
                  <div key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 rounded-full p-2 ${item.type === "ATTENDANCE" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{item.type === "ATTENDANCE" ? <ClipboardCheck size={16} /> : <Activity size={16} />}</span>
                      <div><p className="text-sm font-semibold capitalize text-gray-900">{item.title}</p><p className="mt-1 text-xs text-gray-500">{item.description}</p><p className="mt-1 text-xs text-gray-500">{item.className || "No class linked"}</p></div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <time className="whitespace-nowrap text-xs text-gray-500">{dateLabel(item.date, item.type !== "ATTENDANCE")}</time>
                      {item.classId && <button onClick={() => classLink(navigate, item.classId)} className="text-xs font-bold text-blue-700 hover:text-blue-900">Open class</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
