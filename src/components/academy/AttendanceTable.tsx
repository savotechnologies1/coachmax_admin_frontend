import { ClassSchedule } from "../../types/academy";
import { getPlayerStatusTextClass, StatusIcon } from "../common/StatusColorCode";
import { formatDateOnly } from "../../utils/dateTime";
import { sortPlayersByPaymentStatus } from "../../utils/paymentStatus";

interface AttendanceTableProps {
  schedule: ClassSchedule;
}

export default function AttendanceTable({ schedule }: AttendanceTableProps) {
  const orderedPlayers = sortPlayersByPaymentStatus(
    schedule.players,
    (player: any) => player.paymentStatus || player.status
  );
  // Date labels
  const dates = [
    { num: 1, day: "Mon", date: "20/04" },
    { num: 2, day: "Mon", date: "27/04" },
    { num: 3, day: "Mon", date: "04/05" },
    { num: 4, day: "Mon", date: "11/05" },
    { num: 5, day: "Mon", date: "18/05" },
    { num: 6, day: "Mon", date: "25/05" },
    { num: 7, day: "Mon", date: "01/06" },
    { num: 8, day: "Mon", date: "08/06" },
    { num: 9, day: "Mon", date: "15/06" },
    { num: 10, day: "Mon", date: "22/06" },
  ];

  const renderStatusIcon = (status: "present" | "absent" | "late" | "none") => {
    switch (status) {
      case "present":
        return (
          <div className="flex justify-center text-emerald-600">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "absent":
        return (
          <div className="flex justify-center text-rose-600">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "late":
        return (
          <div className="flex justify-center text-amber-500">
            <svg className="w-5 h-5 stroke-current fill-none" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
        );
      case "none":
      default:
        return (
          <div className="flex justify-center text-slate-300 dark:text-slate-700">
            <span className="font-semibold">—</span>
          </div>
        );
    }
  };

  return (
    <div className="border border-slate-100 dark:border-slate-800 overflow-hidden mb-6 shadow-theme-xs bg-white dark:bg-slate-900">
      {/* Table Header Bar */}
      <div className="bg-[#031549] text-white px-5 py-3.5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-5 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{schedule.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{schedule.ageGroup}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Coach: {schedule.coach}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{schedule.location}</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-3.5 text-xs font-semibold text-slate-300">
          <button className="flex items-center gap-1.5 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Text Class</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Email</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Reports</span>
          </button>
          <button className="flex items-center gap-1 hover:text-white p-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            <span>More</span>
          </button>
        </div>
      </div>

      {/* Attendance Grid Table */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
              <th className="py-2.5 px-1.5 w-[35px] text-center">#</th>
              <th className="py-2.5 px-1 w-[40px] text-center">
                <div className="flex items-center justify-center">
                  <span className="text-sm select-none" title="Payment Status">
                    💰
                  </span>
                </div>
              </th>
              <th className="py-2.5 px-3 min-w-[130px]">Player</th>
              <th className="py-2.5 px-3 min-w-[80px]">DOB</th>
              <th className="py-2.5 px-3 min-w-[90px] text-center">Med Cond</th>
              {dates.map((d) => (
                <th key={d.num} className="py-2.5 px-1.5 text-center min-w-[50px] font-semibold border-l border-slate-100 dark:border-slate-800/40">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-slate-400 font-bold">{d.num}</span>
                    <span className="text-slate-500">{d.day}</span>
                    <span className="text-slate-500 font-bold">{d.date}</span>
                  </div>
                </th>
              ))}
              <th className="py-2.5 px-4 w-[80px] text-right border-l border-slate-100 dark:border-slate-800/40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orderedPlayers.map((row, idx) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-800/10">
                <td className="py-2 px-1.5 text-center font-bold text-slate-400 text-xs">
                  {idx + 1}
                </td>
                <td 
                  className="py-2 px-2 text-center"
                  title={["TRIAL", "TBC", "EXTRA", "OTHERS", "SUBSTITUTE"].includes((((row as any).paymentStatus || (row as any).status) || "").toUpperCase()) ? (((row as any).paymentStatus || (row as any).status) || "").toUpperCase() : undefined}
                >
                  <StatusIcon status={(row as any).paymentStatus || (row as any).status} />
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2.5">
                    <img src={row.avatar} alt={row.playerName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                    <div className="flex flex-col min-w-0">
                      <span className={`font-bold text-xs leading-tight block truncate ${getPlayerStatusTextClass((row as any).paymentStatus || (row as any).status)}`}>{row.playerName}</span>
                      <div className="flex items-center gap-0.5 text-amber-400 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3 h-3 ${((row as any).rating || 0) > i
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-200 fill-slate-200 dark:text-slate-700 dark:fill-slate-700"
                              }`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2 px-3 font-semibold text-slate-500">
                  {row.dob ? formatDateOnly(row.dob, { day: "2-digit", month: "2-digit", year: "numeric" }) || row.dob : "-"}
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={row.isMedicalCondition === true ? "text-rose-600 font-bold text-xs" : "text-slate-500 font-semibold"}>
                    {row.isMedicalCondition === true ? "Yes" : "No"}
                  </span>
                </td>
                {row.attendance.map((att, i) => (
                  <td key={i} className="py-2 px-1.5 border-l border-slate-50 dark:border-slate-800/20">
                    {renderStatusIcon(att)}
                  </td>
                ))}
                <td className="py-2 px-4 text-right border-l border-slate-50 dark:border-slate-800/20">
                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
