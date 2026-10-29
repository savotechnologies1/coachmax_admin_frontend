import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import { 
  Calendar, 
  Users, 
  PlusCircle, 
  BookOpen, 
  Clock, 
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Tag,
  HelpCircle,
  RotateCw
} from "lucide-react";
import { StatusIcon } from "../../components/common/StatusColorCode";

const UserManual: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"holiday" | "assign" | "colors">("holiday");

  return (
    <>
      <PageMeta
        title="User Manual | CoachMax Admin"
        description="Step-by-step guide for creating Holiday Programs, assigning players, and managing statuses"
      />
      <PageBreadcrumb pageTitle="User Manual & Documentation" />

      <div className="space-y-6 pb-12">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-none border border-slate-200 dark:border-slate-800 bg-[#031549] text-white p-6 sm:p-8 shadow-md">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-none text-xs font-bold text-blue-200 mb-3 border border-white/20">
              <BookOpen className="w-3.5 h-3.5" />
              <span>CoachMax Admin Guide</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              Holiday Programs & Player Assignments
            </h1>
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              Complete step-by-step instructions on setting up Holiday Programs, scheduling sessions, allocating players, and status management.
            </p>
          </div>

          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-8">
            <Sparkles className="w-64 h-64 text-white" />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("holiday")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === "holiday"
                ? "border-[#0047FF] text-[#0047FF] bg-blue-50/50 dark:bg-blue-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1. Create Holiday Program</span>
          </button>

          <button
            onClick={() => setActiveTab("assign")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === "assign"
                ? "border-[#0047FF] text-[#0047FF] bg-blue-50/50 dark:bg-blue-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Assign Players</span>
          </button>

          <button
            onClick={() => setActiveTab("colors")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === "colors"
                ? "border-[#0047FF] text-[#0047FF] bg-blue-50/50 dark:bg-blue-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>3. Status & Color Guide</span>
          </button>
        </div>

        {/* TAB 1: CREATE HOLIDAY PROGRAM */}
        {activeTab === "holiday" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0047FF]" />
                Part 1: Create a Holiday Program Term & Class Schedule
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Follow these 2 simple sections to set up the seasonal Holiday Program event and create its classes.
              </p>

              {/* STEP 1.1 */}
              <div className="space-y-6">
                <div className="border-l-4 border-[#0047FF] pl-4 py-1 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-[#031549] text-white flex items-center justify-center text-xs font-extrabold">1</span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Step 1: Schedule Holiday Program Term (Event)</h3>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-300 space-y-2 font-medium ml-2">
                    <li>Navigate to <strong>Audit Logs</strong> or <strong>Clone Term</strong> from the left sidebar.</li>
                    <li>Click the <strong>+ Schedule New Term</strong> button at the top right.</li>
                    <li>
                      In the modal:
                      <ul className="list-disc list-inside ml-5 mt-1 space-y-1 text-slate-500 dark:text-slate-400">
                        <li><strong>Term Name:</strong> e.g., <em>"Holiday Football Camp 2026"</em></li>
                        <li><strong>Year:</strong> e.g., <em>2026</em></li>
                        <li><strong>Start Date & End Date:</strong> Choose your holiday camp dates.</li>
                        <li><strong>Checkmark:</strong> Tick the box <strong>"Holiday Program / Event"</strong>.</li>
                      </ul>
                    </li>
                    <li>Click <strong>COMMIT TERM</strong> to save.</li>
                  </ol>
                </div>

                {/* STEP 1.2 */}
                <div className="border-l-4 border-emerald-500 pl-4 py-1 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-extrabold">2</span>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Step 2: Add Holiday Program Classes</h3>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-300 space-y-2 font-medium ml-2">
                    <li>Go to <strong>Classes</strong> (<code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-[11px] text-blue-600">/classes</code>) from the navigation menu.</li>
                    <li>Click the <strong>HOLIDAY PROGRAM</strong> tab at the top.</li>
                    <li>Select your created Term from the top term selector dropdown (e.g., <em>Holiday Football Camp 2026</em>).</li>
                    <li>Click the <strong>+ ADD CLASS</strong> button at the top right.</li>
                    <li>
                      Fill in the class details:
                      <ul className="list-disc list-inside ml-5 mt-1 space-y-1 text-slate-500 dark:text-slate-400">
                        <li><strong>Category:</strong> Select Holiday Program Category.</li>
                        <li><strong>Class Name:</strong> e.g., <em>"Morning Elite Training (09:00 - 11:00)"</em>.</li>
                        <li><strong>Day, Time & Location:</strong> Set the session schedule and venue.</li>
                        <li><strong>Capacity:</strong> Set maximum player limit (e.g. 20).</li>
                        <li><strong>Coach:</strong> Assign a coach to the class.</li>
                      </ul>
                    </li>
                    <li>Click <strong>SAVE CLASS</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGN PLAYERS */}
        {activeTab === "assign" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0047FF]" />
                Part 2: Assigning & Allocating Players to Holiday Classes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Learn how to drag-and-drop or select players to assign them to a Holiday Program class with payment status.
              </p>

              <div className="space-y-6">
                {/* Method 1 */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Method A: Via Program Matrix (Drag & Drop or Direct Assign)</h3>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-300 space-y-2 font-medium ml-2">
                    <li>Go to <strong>Programs</strong> in the main navigation menu.</li>
                    <li>Click on the <strong>Holiday Camps / Holiday Program</strong> category tab.</li>
                    <li>
                      Locate your target Holiday Class section in the Matrix view.
                    </li>
                    <li>
                      <strong>Option A (Drag & Drop):</strong> Click and hold any player card from the <em>Unassigned Roster</em>, then drag and drop them directly onto the Holiday Class table.
                    </li>
                    <li>
                      <strong>Option B (Assign Button):</strong> Click the <strong>+ Assign Player</strong> button above the class table, search for the player by name, and click <strong>Assign</strong>.
                    </li>
                  </ol>
                </div>

                {/* Method 2 Modal Options */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-[#0047FF]" />
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Selecting Payment & Allocation Status</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    When assigning a player, select one of the 4 payment statuses in the assignment popup:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-none">
                      <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5" /> TRIAL
                      </span>
                      <p className="text-[11px] text-slate-500 leading-tight">Temporary trial session player. Name appears in red text.</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-none">
                      <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-3.5 h-3.5" /> APPROVED
                      </span>
                      <p className="text-[11px] text-slate-500 leading-tight">Assign & Allocate Fee (Auto). Approved registration with automatic fee allocation.</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-none">
                      <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5 mb-1">
                        <PlusCircle className="w-3.5 h-3.5" /> EXTRA
                      </span>
                      <p className="text-[11px] text-slate-500 leading-tight">Additional or overflow player assigned to class session.</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                        <HelpCircle className="w-3.5 h-3.5" /> TBC
                      </span>
                      <p className="text-[11px] text-slate-500 leading-tight">To Be Confirmed player awaiting enrollment status confirmation.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COLOR CODE & STATUS REFERENCE */}
        {activeTab === "colors" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#0047FF]" />
                Part 3: Table Statuses & Color Code Reference
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete visual guide for all player statuses, their meanings, dot indicators, and how to perform a status update.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* PAID / ACTIVE */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="flex items-center gap-2">
                  <StatusIcon status="PAID" size="w-4 h-4" />
                  <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">PAID / ACTIVE</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Green checkmark icon. Confirmed active player with verified payment completed. Player name displays in standard text.
                </p>
              </div>

              {/* APPROVED (UNPAID) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <StatusIcon status="UNPAID" size="w-4 h-4" />
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">APPROVED (UNPAID)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Circle minus icon ⊝. Player approved and allocated; fee invoice generated automatically (pending payment). Player name displays in standard text.
                </p>
              </div>

              {/* HANDSHAKE */}
              <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-2">
                <div className="flex items-center gap-2">
                  <StatusIcon status="HANDSHAKE" size="w-4 h-4" />
                  <span className="font-bold text-xs text-teal-700 dark:text-teal-400">HANDSHAKE</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Handshake icon 🤝. Special director-approved arrangement, scholarship, or direct admission without payment. Player name displays in standard text.
                </p>
              </div>

              {/* TRIAL */}
              <div className="p-4 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                  <span className="font-bold text-xs text-red-500 dark:text-red-400">TRIAL (RED TEXT)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  No payment icon in table column &amp; <strong className="text-red-500 dark:text-red-400">red player name text</strong>. Temporary trial attendee session.
                </p>
              </div>

              {/* TBC */}
              <div className="p-4 bg-[#b7a9d9]/10 dark:bg-[#b7a9d9]/20 border border-[#b7a9d9]/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#b7a9d9] shrink-0" />
                  <span className="font-bold text-xs text-[#b7a9d9]">TBC (#b7a9d9 TEXT)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  No payment icon in table column &amp; <strong className="text-[#b7a9d9]">#b7a9d9 player name text</strong>. Attendance or class spot pending final confirmation.
                </p>
              </div>

              {/* EXTRA / SUBSTITUTE */}
              <div className="p-4 bg-[#d6d11a]/10 dark:bg-[#d6d11a]/20 border border-[#d6d11a]/30 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#d6d11a] shrink-0" />
                  <span className="font-bold text-xs text-[#d6d11a]">EXTRA / SUBSTITUTE (#d6d11a TEXT)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  No payment icon in table column &amp; <strong className="text-[#d6d11a]">#d6d11a player name text</strong>. Overflow or substitute player allocated to session.
                </p>
              </div>
            </div>

            {/* STATUS UPDATE GUIDE */}
            <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-[#0047FF]" />
                How to Perform a Status Update for a Player
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Administrators can change any player's status directly from the class schedule matrix at any time:
              </p>
              <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-300 space-y-2.5 font-medium bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-200 dark:border-slate-700">
                <li>Go to <strong>Programs &gt; Matrix View</strong> or <strong>Classes</strong>.</li>
                <li>Locate the player row in the class table.</li>
                <li>Click the <strong>3-dots action menu button (⋮)</strong> on the right side of the player's row.</li>
                <li>Under the <strong>UPDATE STATUS</strong> header in the menu, select the desired new status:
                  <ul className="list-disc list-inside ml-5 mt-1 space-y-1 text-slate-500 dark:text-slate-400">
                    <li><strong className="text-rose-600">TRIAL:</strong> Mark as trial session attendee (Red icon & Red name text).</li>
                    <li><strong className="text-amber-600">APPROVED / UNPAID:</strong> Mark as approved pending fee payment (Amber warning icon).</li>
                    <li><strong className="text-emerald-600">PAID:</strong> Confirm full payment completed (Green checkmark icon).</li>
                    <li><strong className="text-slate-500 dark:text-slate-400">TBC:</strong> Mark as pending confirmation (Grey question mark icon & Grey name text).</li>
                    <li><strong className="text-teal-600">HANDSHAKE:</strong> Apply director-approved arrangement/scholarship (Teal handshake icon).</li>
                    <li><strong className="text-[#8a8c23] dark:text-[#dee08b]">EXTRA / SUBSTITUTE:</strong> Assign as extra/substitute player (Khaki yellow icon & Khaki yellow name text).</li>
                  </ul>
                </li>
                <li>The status badge and dot color in the table will update immediately.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UserManual;
