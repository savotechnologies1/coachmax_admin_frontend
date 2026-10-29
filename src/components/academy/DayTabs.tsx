
interface DayTabsProps {
  activeDay: string;
  onChangeDay: (day: string) => void;
}

const days = ["View All", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function DayTabs({ activeDay, onChangeDay }: DayTabsProps) {
  return (
    <div className="flex border-b border-slate-100 dark:border-slate-800 mb-6 text-xs font-semibold overflow-x-auto no-scrollbar gap-1">
      {days.map((day) => (
        <button
          type="button"
          aria-pressed={activeDay === day}
          key={day}
          onClick={() => onChangeDay(day)}
          className={`py-3 px-4 sm:px-8 shrink-0 transition-all border-b-[3px] ${activeDay === day
            ? "bg-[#031549] text-white font-bold border-[#0047FF]"
            : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 border-transparent"
            }`}
        >
          {day}
        </button>
      ))}
    </div>
  );
}
