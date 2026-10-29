import React, { useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { addTemporaryPlayersToTeam } from "../../api/adminApi";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Image as ImageIcon, ChevronDown, ChevronUp, Users } from "lucide-react";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";

interface AddTemporaryPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
}

export interface TempPlayerItem {
  id: string;
  name: string;
  jerseyNumber: string | number;
  position: string;
  appearances: string | number;
  goals: string | number;
  assists: string | number;
  cleanSheets: string | number;
  yellowCards: string | number;
  redCards: string | number;
  minutesPlayed: string | number;
  profileImageFile: File | null;
  profileImagePreview: string | null;
  showStats: boolean;
}

const createDefaultPlayer = (): TempPlayerItem => ({
  id: Math.random().toString(36).substring(2, 9),
  name: "",
  jerseyNumber: "",
  position: "Forward",
  appearances: 0,
  goals: 0,
  assists: 0,
  cleanSheets: 0,
  yellowCards: 0,
  redCards: 0,
  minutesPlayed: 0,
  profileImageFile: null,
  profileImagePreview: null,
  showStats: false,
});

const POSITIONS = [
  "Forward",
  "Striker",
  "Winger",
  "Midfielder",
  "Attacking Midfielder",
  "Defensive Midfielder",
  "Defender",
  "Center Back",
  "Full Back",
  "Goalkeeper",
];

const AddTemporaryPlayersModal: React.FC<AddTemporaryPlayersModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName,
}) => {
  const queryClient = useQueryClient();
  const [players, setPlayers] = useState<TempPlayerItem[]>([createDefaultPlayer()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPlayerRow = () => {
    setPlayers((prev) => [...prev, createDefaultPlayer()]);
  };

  const handleRemovePlayerRow = (id: string) => {
    if (players.length === 1) {
      toast.error("At least one player is required.");
      return;
    }
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePlayerChange = (id: string, field: keyof TempPlayerItem, value: any) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleImageChange = async (id: string, file: File | null) => {
    if (!file) return;
    let normalized: File;
    try { normalized = await normalizeUploadImage(file); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); return; }
    const validationError = await validateUploadFile(normalized, "profile");
    if (validationError) { toast.error(validationError); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, profileImageFile: normalized, profileImagePreview: reader.result as string }
            : p
        )
      );
    };
    reader.readAsDataURL(normalized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name for each player
    for (let i = 0; i < players.length; i++) {
      if (!players[i].name.trim()) {
        toast.error(`Please enter a name for player #${i + 1}`);
        return;
      }
    }

    const payloadData = new FormData();
    const playerJsonArray = players.map((p) => ({
      name: p.name.trim(),
      jerseyNumber: p.jerseyNumber !== "" ? Number(p.jerseyNumber) : 0,
      position: p.position || "Forward",
      appearances: Number(p.appearances) || 0,
      goals: Number(p.goals) || 0,
      assists: Number(p.assists) || 0,
      cleanSheets: Number(p.cleanSheets) || 0,
      yellowCards: Number(p.yellowCards) || 0,
      redCards: Number(p.redCards) || 0,
      minutesPlayed: Number(p.minutesPlayed) || 0,
    }));

    payloadData.append("players", JSON.stringify(playerJsonArray));

    players.forEach((p) => {
      if (p.profileImageFile) {
        payloadData.append("profileImages", p.profileImageFile);
      }
    });

    try {
      setIsSubmitting(true);
      const res = await addTemporaryPlayersToTeam(teamId, payloadData);
      toast.success(res?.message || "Temporary players added successfully!");
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setPlayers([createDefaultPlayer()]);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add temporary players");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[850px] p-6 lg:p-8 rounded-none shadow-2xl"
      noBackgroundBlur={true}
    >
      {/* Modal Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-none text-amber-600">
          <UserPlus size={22} />
        </div>
        <div>
          <h4 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Add Temporary Away Players
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            Add temporary players and match stats for <span className="font-bold text-slate-800 dark:text-slate-200">{teamName}</span>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 no-scrollbar">
          {players.map((player, idx) => (
            <div
              key={player.id}
              className="p-5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 rounded-none space-y-4 relative"
            >
              {/* Player Entry Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Users size={14} className="text-[#0047FF]" /> Player #{idx + 1}
                </span>
                {players.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePlayerRow(player.id)}
                    className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>

              {/* Player Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Photo Upload */}
                <div className="sm:col-span-3 flex flex-col items-center">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 text-center">
                    Profile Image
                  </label>
                  <label className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center bg-white dark:bg-slate-800 cursor-pointer overflow-hidden relative group hover:border-[#0047FF] transition-colors">
                    {player.profileImagePreview ? (
                      <img
                        src={player.profileImagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-[#0047FF]" />
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageChange(player.id, e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Name, Jersey, Position */}
                <div className="sm:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => handlePlayerChange(player.id, "name", e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold focus:border-[#0047FF] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Jersey #
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={player.jerseyNumber}
                      onChange={(e) => handlePlayerChange(player.id, "jerseyNumber", e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold focus:border-[#0047FF] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Position
                    </label>
                    <select
                      value={player.position}
                      onChange={(e) => handlePlayerChange(player.id, "position", e.target.value)}
                      className="w-full rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold focus:border-[#0047FF] outline-none cursor-pointer"
                    >
                      {POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Collapsible Stats Section */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handlePlayerChange(player.id, "showStats", !player.showStats)}
                  className="text-xs font-bold text-[#0047FF] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  {player.showStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>{player.showStats ? "Hide Stats & Performance" : "+ Add Match Stats (Optional)"}</span>
                </button>

                {player.showStats && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Appearances</label>
                      <input
                        type="number"
                        min="0"
                        value={player.appearances}
                        onChange={(e) => handlePlayerChange(player.id, "appearances", e.target.value)}
                        className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Goals</label>
                      <input
                        type="number"
                        min="0"
                        value={player.goals}
                        onChange={(e) => handlePlayerChange(player.id, "goals", e.target.value)}
                        className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Assists</label>
                      <input
                        type="number"
                        min="0"
                        value={player.assists}
                        onChange={(e) => handlePlayerChange(player.id, "assists", e.target.value)}
                        className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Clean Sheets</label>
                      <input
                        type="number"
                        min="0"
                        value={player.cleanSheets}
                        onChange={(e) => handlePlayerChange(player.id, "cleanSheets", e.target.value)}
                        className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Yellow Cards</label>
                      <input
                        type="number"
                        min="0"
                        value={player.yellowCards}
                        onChange={(e) => handlePlayerChange(player.id, "yellowCards", e.target.value)}
                        className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Red Cards</label>
                      <input
                        type="number"
                        min="0"
                        value={player.redCards}
                        onChange={(e) => handlePlayerChange(player.id, "redCards", e.target.value)}
                        className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Minutes Played</label>
                      <input
                        type="number"
                        min="0"
                        value={player.minutesPlayed}
                        onChange={(e) => handlePlayerChange(player.id, "minutesPlayed", e.target.value)}
                        className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Another Player Row Button */}
        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleAddPlayerRow}
            className="px-4 py-2 border border-dashed border-[#0047FF] text-[#0047FF] hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <UserPlus size={14} />
            <span>+ Add Another Player</span>
          </button>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} type="button">
            Discard
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-8 h-11 rounded-none text-xs font-bold uppercase tracking-widest"
          >
            {isSubmitting ? "Submitting..." : "Add Temporary Players"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTemporaryPlayersModal;
