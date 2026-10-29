import React, { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { useAddCoachNote, useUpdateCoachNote } from "../../hooks/usePlayers";

interface AddCoachNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  classId?: string;
  noteId?: string;
  initialNoteType?: string;
  initialDescription?: string;
}

const NOTE_TYPES = [
  { value: "POSITIVE_PERFORMANCE", label: "Positive Performance" },
  { value: "DEVELOPMENT_AREA", label: "Development Area" },
  { value: "ARRIVED_LATE", label: "Arrived Late" },
  { value: "BEHAVIOUR_CONCERN", label: "Behaviour Concern" },
  { value: "INJURY", label: "Injury" },
  { value: "MEDICAL_INCIDENT", label: "Medical Incident" },
  { value: "PARENT_DISCUSSION", label: "Parent Discussion" },
];

export default function AddCoachNoteModal({
  isOpen,
  onClose,
  playerId,
  playerName,
  classId,
  noteId,
  initialNoteType,
  initialDescription,
}: AddCoachNoteModalProps) {
  const [noteType, setNoteType] = useState(initialNoteType || "POSITIVE_PERFORMANCE");
  const [description, setDescription] = useState(initialDescription || "");
  const addNoteMutation = useAddCoachNote();
  const updateNoteMutation = useUpdateCoachNote();

  useEffect(() => {
    if (isOpen) {
      setNoteType(initialNoteType || "POSITIVE_PERFORMANCE");
      setDescription(initialDescription || "");
    }
  }, [isOpen, initialNoteType, initialDescription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      return;
    }

    if (noteId) {
      updateNoteMutation.mutate(
        {
          noteId,
          data: { noteType, description }
        },
        {
          onSuccess: () => {
            onClose();
          }
        }
      );
    } else {
      addNoteMutation.mutate(
        {
          playerId,
          classId,
          noteType,
          description,
        },
        {
          onSuccess: () => {
            setDescription("");
            setNoteType("POSITIVE_PERFORMANCE");
            onClose();
          },
        }
      );
    }
  };

  const isPending = addNoteMutation.isPending || updateNoteMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6 bg-white dark:bg-slate-900 rounded-xl">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {noteId ? "Edit Coach Note" : "Add Coach Note"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Log behavior, medical incident or performance for <span className="font-bold text-[#0047FF]">{playerName}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-500 uppercase tracking-wide">Note Category</label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-none focus:outline-none focus:border-[#0047FF] font-semibold"
            >
              {NOTE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-500 uppercase tracking-wide">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter note description..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-none focus:outline-none focus:border-[#0047FF] font-semibold resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors border border-transparent hover:border-slate-300 rounded-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 font-bold bg-[#0047FF] hover:bg-blue-700 text-white rounded-none transition-colors shadow-theme-xs disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
