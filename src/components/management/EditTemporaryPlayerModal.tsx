import React, { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { updateTemporaryPlayer } from "../../api/adminApi";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, Image as ImageIcon } from "lucide-react";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";
import { getMediaUrl } from "../../utils/media";

interface EditTemporaryPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  player: any | null;
}

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

const EditTemporaryPlayerModal: React.FC<EditTemporaryPlayerModalProps> = ({
  isOpen,
  onClose,
  teamId,
  player,
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
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
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getImageUrl = (path: string | undefined | null) => {
    return getMediaUrl(path) || null;
  };

  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name || player.fullName || "",
        jerseyNumber: player.jerseyNumber !== undefined ? String(player.jerseyNumber) : "",
        position: player.position || "Forward",
        appearances: player.appearances || 0,
        goals: player.goals || 0,
        assists: player.assists || 0,
        cleanSheets: player.cleanSheets || 0,
        yellowCards: player.yellowCards || 0,
        redCards: player.redCards || 0,
        minutesPlayed: player.minutesPlayed || 0,
      });
      setSelectedFile(null);
      setPreviewImage(getImageUrl(player.profileImage || player.avatar || player.image));
    }
  }, [player]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      let normalized: File;
      try { normalized = await normalizeUploadImage(file); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); e.target.value = ""; return; }
      const validationError = await validateUploadFile(normalized, "profile");
      if (validationError) { toast.error(validationError); e.target.value = ""; return; }
      setSelectedFile(normalized);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(normalized);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player || !teamId) return;

    const playerId = player._id || player.id;
    if (!playerId) {
      toast.error("Player ID missing");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Player name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = new FormData();
      payload.append("name", formData.name.trim());
      payload.append("jerseyNumber", String(formData.jerseyNumber !== "" ? Number(formData.jerseyNumber) : 0));
      payload.append("position", formData.position);
      payload.append("appearances", String(Number(formData.appearances) || 0));
      payload.append("goals", String(Number(formData.goals) || 0));
      payload.append("assists", String(Number(formData.assists) || 0));
      payload.append("cleanSheets", String(Number(formData.cleanSheets) || 0));
      payload.append("yellowCards", String(Number(formData.yellowCards) || 0));
      payload.append("redCards", String(Number(formData.redCards) || 0));
      payload.append("minutesPlayed", String(Number(formData.minutesPlayed) || 0));

      if (selectedFile) {
        payload.append("profileImage", selectedFile);
        payload.append("profileImages", selectedFile);
      }

      const res = await updateTemporaryPlayer(teamId, playerId, payload);
      toast.success(res?.message || "Temporary player updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["temporaryPlayers", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update temporary player");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[700px] p-6 lg:p-8 rounded-none shadow-2xl"
      noBackgroundBlur={true}
    >
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-2.5 bg-brand-50 dark:bg-brand-500/10 rounded-none text-brand-500">
          <Edit size={22} />
        </div>
        <div>
          <h4 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Edit Temporary Away Player
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            Update credentials and match records for {formData.name || "Player"}.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Photo Upload */}
          <div className="sm:col-span-3 flex flex-col items-center">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 text-center">
              Profile Image
            </label>
            <label className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center bg-white dark:bg-slate-800 cursor-pointer overflow-hidden relative group hover:border-[#0047FF] transition-colors">
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-[#0047FF]" />
              )}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Credentials */}
          <div className="sm:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                value={formData.jerseyNumber}
                onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                className="w-full rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold focus:border-[#0047FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                Position
              </label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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

        {/* Performance Stats */}
        <div className="pt-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Match Stats & Performance
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase">Appearances</label>
              <input
                type="number"
                min="0"
                value={formData.appearances}
                onChange={(e) => setFormData({ ...formData, appearances: Number(e.target.value) })}
                className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase">Goals</label>
              <input
                type="number"
                min="0"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: Number(e.target.value) })}
                className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase">Assists</label>
              <input
                type="number"
                min="0"
                value={formData.assists}
                onChange={(e) => setFormData({ ...formData, assists: Number(e.target.value) })}
                className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase">Clean Sheets</label>
              <input
                type="number"
                min="0"
                value={formData.cleanSheets}
                onChange={(e) => setFormData({ ...formData, cleanSheets: Number(e.target.value) })}
                className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase">Yellow Cards</label>
              <input
                type="number"
                min="0"
                value={formData.yellowCards}
                onChange={(e) => setFormData({ ...formData, yellowCards: Number(e.target.value) })}
                className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase">Red Cards</label>
              <input
                type="number"
                min="0"
                value={formData.redCards}
                onChange={(e) => setFormData({ ...formData, redCards: Number(e.target.value) })}
                className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[9px] font-bold text-slate-400 uppercase">Minutes Played</label>
              <input
                type="number"
                min="0"
                value={formData.minutesPlayed}
                onChange={(e) => setFormData({ ...formData, minutesPlayed: Number(e.target.value) })}
                className="w-full mt-1 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900"
              />
            </div>
          </div>
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
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTemporaryPlayerModal;
