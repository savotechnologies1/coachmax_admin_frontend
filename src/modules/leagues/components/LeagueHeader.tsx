import DateInput from "../../../components/form/DateInput";
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { Trophy, MoreVertical, Edit3, Trash2, RefreshCw, Share2 } from "lucide-react";
import { League } from "../types/league";
import { useLeaguePermissions } from "../hooks/useLeaguePermissions";
import { Modal } from "../../../components/ui/modal";
import Button from "../../../components/ui/button/Button";
import { useUpdateLeague } from "../hooks/useLeague";
import { useRecalculateLadder } from "../hooks/useLeagueLadder";
import { getMediaUrl } from "../../../utils/media";
import ChatActionButton from "../../../components/chat/ChatActionButton";
import { chatApi } from "../../../services/chatApi";

interface LeagueHeaderProps {
  league: League;
  onRefresh?: () => void;
}

export const LeagueHeader: React.FC<LeagueHeaderProps> = ({ league, onRefresh }) => {
  const { canEdit, isSuperAdmin } = useLeaguePermissions();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgError(false);
  }, [league.logo]);

  const updateMutation = useUpdateLeague(league._id);
  const recalculateMutation = useRecalculateLadder(league._id);

  const [formData, setFormData] = useState({
    name: league.name || "",
    description: league.description || "",
    season: league.season || "Season 2026",
    type: league.type || "NATIONAL",
    startDate: league.startDate || "",
    endDate: league.endDate || "",
  });

  useEffect(() => {
    setFormData({
      name: league.name || "",
      description: league.description || "",
      season: league.season || "Season 2026",
      type: league.type || "NATIONAL",
      startDate: league.startDate || "",
      endDate: league.endDate || "",
    });
  }, [league]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData, {
      onSuccess: () => setIsEditModalOpen(false),
    });
  };

  const getImageUrl = (path?: string) => {
    return getMediaUrl(path) || null;
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb line */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link to="/leagues" className="hover:text-brand-600 transition-colors flex items-center gap-1.5">
          <Trophy size={14} className="text-slate-400" />
          <span>Leagues Management</span>
        </Link>
        <span>&gt;</span>
        <span className="text-brand-600 font-bold">{league.name}</span>
      </div>

      {/* Main Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
        {/* Left Side: Logo & Info */}
        <div className="flex items-center gap-4">
          {/* League Logo */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-slate-800 dark:to-slate-900 border border-amber-200/80 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
            {league.logo && !imgError ? (
              <img
                src={getImageUrl(league.logo) || league.logo}
                alt={league.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-contain p-1.5"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-amber-600 dark:text-amber-400 font-black">
                <Trophy size={28} className="stroke-[2.2] text-amber-500" />
                <span className="text-[9px] uppercase tracking-wider font-extrabold -mt-0.5">
                  {league.name
                    ? league.name
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                    : "LGE"}
                </span>
              </div>
            )}
          </div>

          {/* Titles & Badges */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {league.name}
              </h1>

              {/* Badges */}
              <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase rounded-md border border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300 tracking-wider">
                {league.type || "NATIONAL"}
              </span>

              <span className="px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                {league.season || "Season 2026"}
              </span>
            </div>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {league.description || "Elite Junior League 2026"}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <ChatActionButton
            contextLabel={league.name}
            buttonText="League Chat"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-600 border border-brand-600 rounded-lg hover:bg-brand-700 shadow-sm transition-all cursor-pointer"
            ensureRoom={() => chatApi.openLeagueChat(league._id)}
          />
          {canEdit && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all cursor-pointer"
            >
              <Edit3 size={14} className="text-slate-500" />
              <span>Edit League</span>
            </button>
          )}

          {/* More Actions Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all cursor-pointer"
              title="More Actions"
            >
              <MoreVertical size={16} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-11 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <ChatActionButton
                  contextLabel={league.name}
                  buttonText="Open League Chat"
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold"
                  ensureRoom={() => chatApi.openLeagueChat(league._id)}
                />
                {canEdit && (
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsEditModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold"
                  >
                    <Edit3 size={13} className="text-blue-600" />
                    <span>Edit League</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onRefresh?.();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  <RefreshCw size={13} className="text-emerald-600" />
                  <span>Refresh League</span>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    recalculateMutation.mutate();
                  }}
                  disabled={recalculateMutation.isPending}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  <RefreshCw
                    size={13}
                    className={`text-amber-600 ${recalculateMutation.isPending ? "animate-spin" : ""}`}
                  />
                  <span>Recalculate Ladder</span>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigator.clipboard.writeText(window.location.href);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  <Share2 size={13} className="text-amber-600" />
                  <span>Share League URL</span>
                </button>

                {isSuperAdmin && (
                  <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        alert("To delete this league, please use the Leagues Management table action.");
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 text-rose-600 font-semibold"
                    >
                      <Trash2 size={13} />
                      <span>Delete League</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit League Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        className="max-w-[550px] p-6 rounded-xl shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-600">
            <Trophy size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit League Details</h3>
            <p className="text-xs text-slate-500">Update general league info and dates.</p>
          </div>
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              League Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Season
              </label>
              <input
                type="text"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                League Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-brand-500"
              >
                <option value="NATIONAL">National</option>
                <option value="STATE">State / Regional</option>
                <option value="LOCAL">Local / Internal</option>
                <option value="INTERNATIONAL">International</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Start Date
              </label>
              <DateInput
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                End Date
              </label>
              <DateInput
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" size="sm" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
