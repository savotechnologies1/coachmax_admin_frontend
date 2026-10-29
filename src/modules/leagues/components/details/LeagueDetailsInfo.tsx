import DateInput from "../../../../components/form/DateInput";
import { useState, useEffect, useRef } from "react";
import { Info, Calendar, Settings, Save, Upload, Image as ImageIcon, X, Zap } from "lucide-react";
import { League, LeagueType } from "../../types/league";
import { useUpdateLeague } from "../../hooks/useLeague";
import { useLeaguePermissions } from "../../hooks/useLeaguePermissions";
import Button from "../../../../components/ui/button/Button";
import toast from "react-hot-toast";
import { normalizeUploadImage, validateUploadFile } from "../../../../utils/fileValidation";
import { getMediaUrl } from "../../../../utils/media";
import ImageCropModal from "../../../../components/common/ImageCropModal";

interface LeagueDetailsInfoProps {
  league: League;
}

const getImageUrl = (path?: string | null) => {
  if (!path) return "";
  if (
    path.startsWith("data:") ||
    path.startsWith("blob:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }
  return getMediaUrl(path);
};

export const LeagueDetailsInfo: React.FC<LeagueDetailsInfoProps> = ({ league }) => {
  const { canEdit } = useLeaguePermissions();
  const updateMutation = useUpdateLeague(league._id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    league.logo ? getImageUrl(league.logo) : null
  );
  const [logoError, setLogoError] = useState(false);
  const [logoCropFile, setLogoCropFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: league.name || "",
    description: league.description || "",
    type: (league.type || league.competitionScope || "STATE") as LeagueType,
    season: league.season || "2026-2027",
    startDate: league.startDate ? league.startDate.split("T")[0] : "",
    endDate: league.endDate ? league.endDate.split("T")[0] : "",
    registrationStartDate: league.registrationStartDate
      ? league.registrationStartDate.split("T")[0]
      : (league.registrationOpenDate ? league.registrationOpenDate.split("T")[0] : ""),
    registrationEndDate: league.registrationEndDate
      ? league.registrationEndDate.split("T")[0]
      : (league.registrationCloseDate ? league.registrationCloseDate.split("T")[0] : ""),
    status: (league.status || "UPCOMING").toUpperCase(),
    visibility: (league.visibility || "PUBLIC").toUpperCase(),
    allowDraws: league.allowDraws ?? true,
    automaticLadderRecalculation: league.automaticLadderRecalculation ?? league.autoLadderCalculation ?? true,
    pointsForWin: league.pointsForWin ?? 3,
    pointsForDraw: league.pointsForDraw ?? 1,
    pointsForLoss: league.pointsForLoss ?? 0,
    // Fixture configuration
    fixtureFormat: (league.fixtureFormat || "ROUND_ROBIN") as "ROUND_ROBIN" | "KNOCKOUT",
    numberOfRounds: league.numberOfRounds ?? 1,
    matchDuration: league.matchDuration ?? 90,
    breakBetweenMatches: league.breakBetweenMatches ?? 15,
    numberOfFields: league.numberOfFields ?? 1,
    startTime: league.startTime || "09:00",
    groupCount: league.groupCount ?? 1,
  });

  useEffect(() => {
    setFormData({
      name: league.name || "",
      description: league.description || "",
      type: (league.type || league.competitionScope || "STATE") as LeagueType,
      season: league.season || "2026-2027",
      startDate: league.startDate ? league.startDate.split("T")[0] : "",
      endDate: league.endDate ? league.endDate.split("T")[0] : "",
      registrationStartDate: league.registrationStartDate
        ? league.registrationStartDate.split("T")[0]
        : (league.registrationOpenDate ? league.registrationOpenDate.split("T")[0] : ""),
      registrationEndDate: league.registrationEndDate
        ? league.registrationEndDate.split("T")[0]
        : (league.registrationCloseDate ? league.registrationCloseDate.split("T")[0] : ""),
      status: (league.status || "UPCOMING").toUpperCase(),
      visibility: (league.visibility || "PUBLIC").toUpperCase(),
      allowDraws: league.allowDraws ?? true,
      automaticLadderRecalculation: league.automaticLadderRecalculation ?? league.autoLadderCalculation ?? true,
      pointsForWin: league.pointsForWin ?? 3,
      pointsForDraw: league.pointsForDraw ?? 1,
      pointsForLoss: league.pointsForLoss ?? 0,
      // Fixture configuration
      fixtureFormat: (league.fixtureFormat || "ROUND_ROBIN") as "ROUND_ROBIN" | "KNOCKOUT",
      numberOfRounds: league.numberOfRounds ?? 1,
      matchDuration: league.matchDuration ?? 90,
      breakBetweenMatches: league.breakBetweenMatches ?? 15,
      numberOfFields: league.numberOfFields ?? 1,
      startTime: league.startTime || "09:00",
      groupCount: league.groupCount ?? 1,
    });
    if (league.logo) {
      setLogoPreview(getImageUrl(league.logo));
      setLogoError(false);
    } else {
      setLogoPreview(null);
      setLogoError(false);
    }
  }, [league]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let normalized: File;
      try { normalized = await normalizeUploadImage(file); }
      catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); e.target.value = ""; return; }
      const validationError = await validateUploadFile(normalized, "logo", { checkDimensions: false });
      if (validationError) { toast.error(validationError); e.target.value = ""; return; }
      setLogoCropFile(normalized);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateMutation.mutate({
      data: {
        ...formData,
        competitionScope: formData.type,
        registrationOpenDate: formData.registrationStartDate,
        registrationCloseDate: formData.registrationEndDate,
        autoLadderCalculation: formData.automaticLadderRecalculation,
      },
      file: logoFile || undefined,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            League Details & Configuration
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            General parameters, schedule timelines, and ladder scoring rules.
          </p>
        </div>

        {canEdit && (
          <Button
            type="button"
            onClick={handleSubmit}
            size="sm"
            disabled={updateMutation.isPending}
            className="self-start sm:self-auto flex items-center gap-1.5"
          >
            <Save size={14} />
            <span>{updateMutation.isPending ? "Saving..." : "Save Configuration"}</span>
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Information */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/40 dark:bg-slate-800/20">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Info size={16} className="text-brand-600" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Basic Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                League Name
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Season
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Competition Scope (Type)
              </label>
              <select
                disabled={!canEdit}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as LeagueType })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              >
                <option value="INTERNATIONAL">International</option>
                <option value="NATIONAL">National Competition</option>
                <option value="STATE">State / Regional</option>
                <option value="LOCAL">Local / Internal Academy</option>
                <option value="OTHERS">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Description / Tagline
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            {/* League Logo Upload */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                League Logo / Crest (Optional)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                  {logoPreview && !logoError ? (
                    <img
                      src={getImageUrl(logoPreview)}
                      alt="Logo preview"
                      onError={() => setLogoError(true)}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                    disabled={!canEdit}
                    onChange={handleLogoChange}
                    className="hidden"
                    id="league-logo-upload"
                  />
                  <label
                    htmlFor="league-logo-upload"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${canEdit
                        ? "border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        : "opacity-50 cursor-not-allowed border-slate-200"
                      }`}
                  >
                    <Upload size={13} />
                    <span>{logoPreview ? "Change Logo" : "Upload Logo"}</span>
                  </label>
                  {logoPreview && canEdit && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium dark:border-rose-900/50 dark:hover:bg-rose-950/30"
                    >
                      <X size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
      {logoCropFile && <ImageCropModal file={logoCropFile} policy="logo" onCancel={() => {
        setLogoCropFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }} onCrop={(cropped) => {
        setLogoFile(cropped);
        setLogoPreview(URL.createObjectURL(cropped));
        setLogoError(false);
        setLogoCropFile(null);
      }} />}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Schedule & Registration Timelines */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/40 dark:bg-slate-800/20">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Calendar size={16} className="text-emerald-600" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Schedule & Registration Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                League Start Date
              </label>
              <DateInput
                type="date"
                disabled={!canEdit}
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                League End Date
              </label>
              <DateInput
                type="date"
                disabled={!canEdit}
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Registration Opens
              </label>
              <DateInput
                type="date"
                disabled={!canEdit}
                value={formData.registrationStartDate}
                onChange={(e) => setFormData({ ...formData, registrationStartDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Registration Closes
              </label>
              <DateInput
                type="date"
                disabled={!canEdit}
                value={formData.registrationEndDate}
                onChange={(e) =>
                  setFormData({ ...formData, registrationEndDate: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Section 2b: Fixture Configuration */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/40 dark:bg-slate-800/20">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Zap size={16} className="text-violet-500" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Fixture Configuration
            </h3>
            {league.fixtureGenerated && (
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Fixtures Generated
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Fixture Format */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Fixture Format
              </label>
              <select
                disabled={!canEdit}
                value={formData.fixtureFormat}
                onChange={(e) => setFormData({ ...formData, fixtureFormat: e.target.value as "ROUND_ROBIN" | "KNOCKOUT" })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              >
                <option value="ROUND_ROBIN">Round Robin</option>
                <option value="KNOCKOUT">Knockout</option>
              </select>
            </div>

            {/* Number of Rounds */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Number of Rounds
              </label>
              <select
                disabled={!canEdit}
                value={formData.numberOfRounds}
                onChange={(e) => setFormData({ ...formData, numberOfRounds: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              >
                <option value={1}>1 — Single Round Robin</option>
                <option value={2}>2 — Double Round Robin</option>
              </select>
            </div>

            {/* Number of Fields */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Number of Fields / Pitches
              </label>
              <input
                type="number"
                min={1}
                disabled={!canEdit}
                value={formData.numberOfFields}
                onChange={(e) => setFormData({ ...formData, numberOfFields: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            {/* Match Duration */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Match Duration (min)
              </label>
              <input
                type="number"
                min={1}
                disabled={!canEdit}
                value={formData.matchDuration}
                onChange={(e) => setFormData({ ...formData, matchDuration: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            {/* Break Between Matches */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Break Between Matches (min)
              </label>
              <input
                type="number"
                min={0}
                disabled={!canEdit}
                value={formData.breakBetweenMatches}
                onChange={(e) => setFormData({ ...formData, breakBetweenMatches: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Default Start Time
              </label>
              <input
                type="time"
                disabled={!canEdit}
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            {/* Group Count */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Number of Groups
              </label>
              <input
                type="number"
                min={1}
                disabled={!canEdit}
                value={formData.groupCount}
                onChange={(e) => setFormData({ ...formData, groupCount: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Read-only summary chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold border border-violet-200 dark:border-violet-800">
              Format: {formData.fixtureFormat === "ROUND_ROBIN" ? "Round Robin" : "Knockout"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
              {formData.numberOfRounds === 2 ? "Double" : "Single"} Round Robin
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
              ⏱ {formData.matchDuration}min matches · {formData.breakBetweenMatches}min break
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
              🏟 {formData.numberOfFields} Field{formData.numberOfFields !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
              🕘 Start: {formData.startTime}
            </span>
            {formData.groupCount > 1 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                {formData.groupCount} Groups
              </span>
            )}
          </div>
        </div>

        {/* Section 3: Operational Settings */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/40 dark:bg-slate-800/20">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Settings size={16} className="text-amber-600" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Operational & Ladder Rules Settings
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                League Status
              </label>
              <select
                disabled={!canEdit}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Visibility
              </label>
              <select
                disabled={!canEdit}
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              >
                <option value="PUBLIC">Public (Portal & Mobile App)</option>
                <option value="INTERNAL">Internal Academy Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Points for Win
              </label>
              <input
                type="number"
                disabled={!canEdit}
                value={formData.pointsForWin}
                onChange={(e) => setFormData({ ...formData, pointsForWin: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Points for Draw
              </label>
              <input
                type="number"
                disabled={!canEdit}
                value={formData.pointsForDraw}
                onChange={(e) =>
                  setFormData({ ...formData, pointsForDraw: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={formData.allowDraws}
                onChange={(e) => setFormData({ ...formData, allowDraws: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Allow Draws in League Matches
                </span>
                <span className="text-[11px] text-slate-400">
                  When enabled, tied scores award points rather than penalty shootouts.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={formData.automaticLadderRecalculation}
                onChange={(e) =>
                  setFormData({ ...formData, automaticLadderRecalculation: e.target.checked })
                }
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Automatic Ladder Recalculation
                </span>
                <span className="text-[11px] text-slate-400">
                  Instantly compute standings, +/- goal differences, and table ranks.
                </span>
              </div>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};
