import { formatTimestampDate } from "../../utils/dateTime";
import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useCoachAllNotes } from "../../hooks/usePlayers";
import AddCoachNoteModal from "../../components/CoachManagement/AddCoachNoteModal";

const getBadgeStyles = (noteType: string) => {
  switch (noteType) {
    case "POSITIVE_PERFORMANCE":
      return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    case "DEVELOPMENT_AREA":
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
    case "ARRIVED_LATE":
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
    case "BEHAVIOUR_CONCERN":
      return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800";
    case "INJURY":
      return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
    case "MEDICAL_INCIDENT":
      return "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
    case "PARENT_DISCUSSION":
      return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800";
    default:
      return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800";
  }
};

export default function CoachNotesPage() {
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const { data: notesRes, isLoading } = useCoachAllNotes();
  const notes = notesRes?.data || [];

  return (
    <>
      <PageMeta
        title="My Notes | CoachMax"
        description="Fidelity matched coach notes overview board"
      />

      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Notes</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
            <span>Home</span>
            <span>&gt;</span>
            <span className="text-[#0047FF]">My Notes</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-slate-500 font-semibold text-xs">
          Loading your notes board...
        </div>
      ) : notes.length === 0 ? (
        <div className="py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center text-slate-400 font-semibold text-xs italic">
          You haven't logged any coach notes yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map((note: any) => (
            <div
              key={note._id}
              className="relative p-5 bg-[#FEF9C3] dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 shadow-sm flex flex-col justify-between min-h-[160px] group transition-all hover:shadow-md"
            >
              {/* Pin design element */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500/80 rounded-full shadow-inner" />

              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className={`px-1.5 py-0.5 border uppercase font-bold text-[9px] ${getBadgeStyles(note.noteType)}`}>
                    {note.noteType?.replace("_", " ")}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{formatTimestampDate(note.createdAt)}</span>
                </div>

                <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                  {note.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-yellow-300/40 dark:border-yellow-900/40 flex items-center justify-between">
                <span className="text-[15px] text-slate-500 dark:text-yellow-400/60 font-bold">
                  Player: <span className="text-[#0047FF] dark:text-blue-400">{note.player?.fullName || "N/A"}</span>
                </span>
                <button
                  onClick={() => setEditingNote(note)}
                  className="text-xs font-bold text-[#0047FF] dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Edit Note
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingNote && (
        <AddCoachNoteModal
          isOpen={editingNote !== null}
          onClose={() => setEditingNote(null)}
          playerId={editingNote.player?._id || editingNote.player}
          playerName={editingNote.player?.fullName || "Player"}
          noteId={editingNote._id}
          initialNoteType={editingNote.noteType}
          initialDescription={editingNote.description}
        />
      )}
    </>
  );
}
