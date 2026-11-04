import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Trophy, MoreVertical, Edit3, Trash2, RefreshCw, Share2, Image as ImageIcon, X, Upload, Mail } from "lucide-react";
import { League } from "../types/league";
import { useLeaguePermissions } from "../hooks/useLeaguePermissions";
import { Modal } from "../../../components/ui/modal";
import Button from "../../../components/ui/button/Button";
import DateInput from "../../../components/form/DateInput";
import { useUpdateLeague } from "../hooks/useLeague";
import { useRecalculateLadder } from "../hooks/useLeagueLadder";
import { getMediaUrl } from "../../../utils/media";
import { normalizeUploadImage, validateUploadFile } from "../../../utils/fileValidation";
import ImageCropModal from "../../../components/common/ImageCropModal";
import ChatActionButton from "../../../components/chat/ChatActionButton";
import { chatApi } from "../../../services/chatApi";
import toast from "react-hot-toast";
import { useCoachAccess } from "../../../hooks/useCoachAccess";

interface LeagueHeaderProps {
  league: League;
  onRefresh?: () => void;
}

export const LeagueHeader: React.FC<LeagueHeaderProps> = ({ league, onRefresh }) => {
  const { canEdit, isSuperAdmin } = useLeaguePermissions();
  const { can } = useCoachAccess();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoCropFile, setLogoCropFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(league.logo ? getMediaUrl(league.logo) || league.logo : null);
  const [removeLogo, setRemoveLogo] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [league.logo]);

  const updateMutation = useUpdateLeague(league._id);
  const recalculateMutation = useRecalculateLadder(league._id);

  const [formData, setFormData] = useState({
    name: league.name || "",
    description: league.description || "",
    season: league.season || "Season 2026",
    type: (league.type || league.competitionScope || "NATIONAL").toUpperCase(),
    status: ["ACTIVE", "COMPLETED"].includes(String(league.status || "").toUpperCase())
      ? String(league.status).toUpperCase()
      : "UPCOMING",
    visibility: String(league.visibility || "PUBLIC").toUpperCase() === "PRIVATE" ? "PRIVATE" : "PUBLIC",
    startDate: league.startDate ? league.startDate.split("T")[0] : "",
    endDate: league.endDate ? league.endDate.split("T")[0] : "",
  });

  useEffect(() => {
    setFormData({
      name: league.name || "",
      description: league.description || "",
      season: league.season || "Season 2026",
      type: (league.type || league.competitionScope || "NATIONAL").toUpperCase(),
      status: ["ACTIVE", "COMPLETED"].includes(String(league.status || "").toUpperCase())
        ? String(league.status).toUpperCase()
        : "UPCOMING",
      visibility: String(league.visibility || "PUBLIC").toUpperCase() === "PRIVATE" ? "PRIVATE" : "PUBLIC",
      startDate: league.startDate ? league.startDate.split("T")[0] : "",
      endDate: league.endDate ? league.endDate.split("T")[0] : "",
    });
    setLogoPreview(league.logo ? getMediaUrl(league.logo) || league.logo : null);
    setLogoFile(null);
    setLogoCropFile(null);
    setRemoveLogo(false);
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

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let normalized: File;
    try {
      normalized = await normalizeUploadImage(file);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not process this image.");
      e.target.value = "";
      return;
    }
    const validationError = await validateUploadFile(normalized, "logo", { checkDimensions: false });
    if (validationError) {
      toast.error(validationError);
      e.target.value = "";
      return;
    }
    setLogoCropFile(normalized);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const season = formData.season.trim();
    if (!name || !season) {
      toast.error("Enter a tournament name and season.");
      return;
    }
    if (!formData.startDate || !formData.endDate || formData.endDate < formData.startDate) {
      toast.error("Enter valid tournament dates with the end date on or after the start date.");
      return;
    }
    updateMutation.mutate({
      data: {
        ...formData,
        name,
        season,
        ...(removeLogo ? { logo: "" } : {}),
      },
      file: logoFile || undefined,
    }, {
      onSuccess: () => setIsEditModalOpen(false),
    });
  };

  const closeEditModal = () => {
    if (!updateMutation.isPending) setIsEditModalOpen(false);
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
          <span>Tournaments Management</span>
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
                {league.termScope === "INDEPENDENT" || !league.term ? `Independent · ${league.year || league.startDate?.slice(0, 4) || league.season || "No Term"}` : (league.season || "Season 2026")}
              </span>
            </div>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {league.description || "Elite Junior Tournament 2026"}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {can("communication", "create") && can("parents", "read") && (
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams({ audienceType: "TOURNAMENT", audienceId: league._id });
                navigate(`/email-campaigns?${params.toString()}`);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-700 shadow-sm transition-colors hover:bg-brand-600 hover:text-white dark:border-brand-900 dark:bg-brand-950/30 dark:text-brand-300"
            >
              <Mail size={14} /> Email Teams
            </button>
          )}
          <ChatActionButton
            contextLabel={league.name}
            buttonText="Tournament Chat"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-600 border border-brand-600 rounded-lg hover:bg-brand-700 shadow-sm transition-all cursor-pointer"
            ensureRoom={() => chatApi.openLeagueChat(league._id)}
          />
          {canEdit && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all cursor-pointer"
            >
              <Edit3 size={14} className="text-slate-500" />
              <span>Edit Tournament</span>
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
                {can("communication", "create") && can("parents", "read") && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      const params = new URLSearchParams({ audienceType: "TOURNAMENT", audienceId: league._id });
                      navigate(`/email-campaigns?${params.toString()}`);
                    }}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                  >
                    <Mail size={13} className="text-brand-600" /> Email Teams
                  </button>
                )}
                <ChatActionButton
                  contextLabel={league.name}
                  buttonText="Open Tournament Chat"
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
                    <span>Edit Tournament</span>
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
                  <span>Refresh Tournament</span>
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
                  <span>Share Tournament URL</span>
                </button>

                {isSuperAdmin && (
                  <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        alert("To delete this tournament, please use the Tournaments Management table action.");
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 text-rose-600 font-semibold"
                    >
                      <Trash2 size={13} />
                      <span>Delete Tournament</span>
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
        onClose={closeEditModal}
        showCloseButton={false}
        className="max-w-5xl overflow-hidden rounded-xl p-0 shadow-2xl"
      >
        <div className="flex max-h-[calc(100vh-2rem)] flex-col bg-white dark:bg-gray-900">
          <div className="flex shrink-0 items-center justify-between gap-4 bg-[#061847] px-5 py-4 text-white sm:px-7">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white/10 p-2.5"><Trophy size={20} /></div>
              <div>
                <h3 className="text-lg font-black">Modify Tournament</h3>
                <p className="text-xs font-semibold text-blue-100/80">Update basic tournament information and logo</p>
              </div>
            </div>
            <button type="button" onClick={closeEditModal} disabled={updateMutation.isPending} aria-label="Close edit tournament dialog" className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50">
              <X size={19} />
            </button>
          </div>

          <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/20 sm:p-5">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <Trophy size={16} className="text-brand-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Basic Information</h4>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Tournament Name <span className="text-rose-500">*</span></label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Year</label>
                    <input type="text" value={league.year || (typeof league.term === "object" && league.term?.year ? league.term.year : league.season?.match(/\d{4}/)?.[0] || league.startDate?.slice(0, 4) || "")} readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-semibold text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Academic Term</label>
                    <input type="text" value={league.termScope === "INDEPENDENT" || !league.term ? "Independent / No Term" : typeof league.term === "object" && league.term?.name ? `${league.term.name}${league.term.year ? ` (${league.term.year})` : ""}` : league.season || "—"} readOnly className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-semibold text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" />
                    <p className="mt-1 text-[10px] text-slate-400">Change the term association from Edit on the Tournaments Management page.</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Tournament Type <span className="text-rose-500">*</span></label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <option value="INTERNATIONAL">INTERNATIONAL</option><option value="NATIONAL">NATIONAL</option><option value="STATE">STATE</option><option value="LOCAL">LOCAL</option><option value="OTHERS">OTHERS</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <option value="UPCOMING">UPCOMING</option><option value="ACTIVE">ACTIVE</option><option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Visibility</label>
                    <select value={formData.visibility} onChange={(e) => setFormData({ ...formData, visibility: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <option value="PUBLIC">PUBLIC</option><option value="PRIVATE">PRIVATE</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder="e.g. Youth football competition" />
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/20 sm:p-5">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <ImageIcon size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Tournament Logo / Crest</h4>
                </div>
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                    {logoPreview ? <img src={logoPreview} alt="Tournament logo preview" className="h-full w-full object-contain p-1" /> : <ImageIcon className="h-7 w-7 text-slate-400" />}
                  </div>
                  <div className="space-y-2">
                    <input ref={logoInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={handleLogoChange} className="hidden" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="flex items-center gap-1.5"><Upload size={13} />{logoPreview ? "Change Logo" : "Upload Logo"}</Button>
                      {logoPreview && <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); setRemoveLogo(Boolean(league.logo)); if (logoInputRef.current) logoInputRef.current.value = ""; }} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"><X size={13} />Remove</button>}
                    </div>
                    <p className="text-[10px] text-slate-400">Optional square image. JPEG, PNG, WebP, HEIC/HEIF up to 2 MB.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/20 sm:p-5">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <span className="text-brand-600"><Trophy size={16} /></span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Tournament Dates</h4>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Start Date <span className="text-rose-500">*</span></label>
                    <DateInput type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">End Date <span className="text-rose-500">*</span></label>
                    <DateInput type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-gray-900 sm:px-6">
              <button type="button" onClick={closeEditModal} disabled={updateMutation.isPending} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">Discard</button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending} className="flex items-center gap-2 px-5">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {logoCropFile && <ImageCropModal file={logoCropFile} policy="logo" onCancel={() => {
        setLogoCropFile(null);
        if (logoInputRef.current) logoInputRef.current.value = "";
      }} onCrop={(cropped) => {
        setLogoFile(cropped);
        setLogoPreview(URL.createObjectURL(cropped));
        setRemoveLogo(false);
        setLogoCropFile(null);
      }} />}
    </div>
  );
};
