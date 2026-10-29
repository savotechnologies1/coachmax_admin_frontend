import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import PageMeta from "../components/common/PageMeta";
import { getAllEvents } from "../api/eventApi";
import { addDateOnlyDays, formatDateOnly, toDateOnly } from "../utils/dateTime";

type CalendarSourceEvent = {
  _id: string;
  title: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  status?: string;
  isArchived?: boolean;
};

const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await getAllEvents();
      if (response.success === false || !Array.isArray(response.data)) throw new Error(response.message || "Unable to load calendar");
      return response.data as CalendarSourceEvent[];
    },
  });
  const events = useMemo<EventInput[]>(() => (data || []).flatMap((event) => {
    const start = toDateOnly(event.startDate);
    const end = toDateOnly(event.endDate || event.startDate);
    if (!start || !end || end < start || event.isArchived) return [];
    return [{
      id: event._id,
      title: event.title,
      start,
      // Event APIs use inclusive calendar boundaries; FullCalendar end is exclusive.
      end: addDateOnlyDays(end, 1),
      allDay: true,
      backgroundColor: event.status === "COMPLETED" ? "#64748b" : "#0047ff",
      borderColor: "transparent",
      extendedProps: { startTime: event.startTime, dateLabel: start === end ? formatDateOnly(start) : `${formatDateOnly(start)} – ${formatDateOnly(end)}` },
    }];
  }), [data]);

  return (
    <>
      <PageMeta title="Calendar | CoachMax" description="View events and holiday programs in the CoachMax calendar." />
      <div className="rounded-none border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        {isLoading && <p role="status" className="mb-4 text-sm text-slate-500">Loading events…</p>}
        {isError ? (
          <div role="alert" className="mb-4 flex items-center gap-3 text-sm text-red-600">
            Calendar events could not be loaded.
            <button type="button" onClick={() => void refetch()} className="font-semibold underline">Retry</button>
          </div>
        ) : !isLoading && !events.length && <p className="mb-4 text-sm text-slate-500">No events scheduled. Add an event to get started.</p>}
        <div className="custom-calendar">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            firstDay={1}
            locale="en-gb"
            headerToolbar={{ left: "prev,next today addEventButton", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
            events={events}
            eventClick={(info) => navigate(`/event-details/${encodeURIComponent(info.event.id)}`)}
            eventDidMount={(info) => { info.el.setAttribute("title", `${info.event.title}: ${info.event.extendedProps.dateLabel}`); }}
            customButtons={{ addEventButton: { text: "Add Event", click: () => navigate("/add-event") } }}
          />
        </div>
      </div>
    </>
  );
};
export default Calendar;
