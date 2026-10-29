import { useClassFiltersWithTimeSlots } from "../../hooks/usePlayers";

interface ClassTimeSlotsProps {
  categoryId: string;
  programId: string;
  day: string;
}

export default function ClassTimeSlots({ categoryId, programId, day }: ClassTimeSlotsProps) {
  const { data: response, isLoading } = useClassFiltersWithTimeSlots(categoryId, programId, day.toUpperCase());
  
  const timeSlots = response?.timeSlots || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3 mb-6 text-sm text-slate-500">
        Loading time slots...
      </div>
    );
  }

  if (!categoryId || !programId) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 px-1">
      {timeSlots.length > 0 ? (
        timeSlots.map((slot: any, index: number) => (
          <button
            key={slot.classId || index}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-[#0047FF] hover:text-[#0047FF] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition-colors rounded-none shadow-theme-xs"
          >
            {slot.startTime} - {slot.endTime}
          </button>
        ))
      ) : (
        <div className="text-sm text-slate-400 italic">No time slots available for {day}</div>
      )}
    </div>
  );
}
