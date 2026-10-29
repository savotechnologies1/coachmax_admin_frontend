import { WaitlistItem } from "../../types/academy";

interface WaitlistCardProps {
  items: WaitlistItem[];
}

export default function WaitlistCard({ items }: WaitlistCardProps) {
  return (
    <div className="bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-4 rounded-none shadow-theme-xs mb-5">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Waitlist
        </h3>
        <a href="#waitlist" className="text-[10px] font-semibold text-[#0047FF] hover:underline">
          View all
        </a>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-350 min-w-0">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="truncate">{item.classTitle}</span>
            </div>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full shrink-0 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
              {item.count} waiting
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
