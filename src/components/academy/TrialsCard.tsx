import { TrialItem } from "../../types/academy";

interface TrialsCardProps {
  items: TrialItem[];
}

export default function TrialsCard({ items }: TrialsCardProps) {
  const getStatusButtonClass = (status: "Invite Sent" | "Trial Booked" | "Pending") => {
    switch (status) {
      case "Invite Sent":
        return "border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:bg-slate-800";
      case "Trial Booked":
        return "text-white bg-[#0047FF] hover:bg-blue-700 shadow-theme-xs";
      case "Pending":
      default:
        return "text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400";
    }
  };

  return (
    <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-4 rounded-none shadow-theme-xs flex flex-col">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Trials
          </h3>
          <span className="bg-blue-50 text-[#0047FF] text-[10px] font-bold px-1.5 py-0.5 rounded-full dark:bg-blue-950/20 dark:text-blue-400">
            {items.length}
          </span>
        </div>
        <a href="#trials" className="text-[10px] font-semibold text-[#0047FF] hover:underline">
          View all
        </a>
      </div>

      <div className="space-y-4 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-2 items-center justify-between">
            <div className="flex gap-2 min-w-0">
              <img
                src={item.avatar}
                alt={item.name}
                className="w-7 h-7 rounded-full object-cover shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 leading-tight">
                  {item.name}
                </h4>
                <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                  {item.details}
                </span>
                <span className="text-[8px] text-slate-400 font-semibold block">
                  Requested {item.requested}
                </span>
              </div>
            </div>

            <button className={`px-2.5 py-1.5 text-[9px] font-bold rounded-none transition-all shrink-0 ${getStatusButtonClass(item.status)}`}>
              {item.status}
            </button>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
        <a
          href="#manage-trials"
          className="inline-flex items-center gap-1 font-bold text-xs text-[#0047FF] hover:underline"
        >
          <span>Manage All Trials</span>
          <span>&rarr;</span>
        </a>
      </div>
    </div>
  );
}
