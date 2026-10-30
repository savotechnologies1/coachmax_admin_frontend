import DateInput from "../form/DateInput";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "../ui/button/Button";
import { useCoachAccess } from "../../hooks/useCoachAccess";
import { Modal } from "../ui/modal";
import { getAllLeagues, createLeague, updateLeague, deleteLeague, getAllTeams, getAllTerms } from "../../api/adminApi";
import { toast } from "react-hot-toast";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";
import ImageCropModal from "../common/ImageCropModal";
import { getMediaUrl } from "../../utils/media";
import { Trophy, Calendar, Image as ImageIcon, Users, Search, X, Settings2, Zap } from "lucide-react";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";
import { useTerms } from "../../hooks/useTerms";
import { findCurrentTerm } from "../../hooks/useCurrentTerm";
import { addDateOnlyDays, formatDateOnly, todayDateOnly, toDateOnly } from "../../utils/dateTime";
import { chatApi } from "../../services/chatApi";
import ChatActionButton from "../chat/ChatActionButton";
import FormHeader from "../form/FormHeader";
import FormStepIndicator from "../form/FormStepIndicator";
import FormActions from "../form/FormActions";
import { requiredText, validateWithSchema, type FormErrors } from "../../utils/formValidation";
import { z } from "zod";

const leagueIdentitySchema = z.object({
  name: requiredText("League name"),
  term: requiredText("Academic term"),
  type: requiredText("League type"),
});

const leagueRulesSchema = z.object({
  fee: z.preprocess(
    (value) => value === "" || value === null || value === undefined ? Number.NaN : Number(value),
    z.number().finite("Enter a valid league fee.").min(0, "League fee must be 0 or more."),
  ),
  rounds: z.preprocess(
    (value) => value === "" || value === null || value === undefined ? Number.NaN : Number(value),
    z.number().finite("Enter a valid round count.").int("Round count must be a whole number.").min(1, "Round count must be at least 1."),
  ),
});

const WEEKDAYS = [
  { label: "Mon", full: "Monday", dayIndex: 1 },
  { label: "Tue", full: "Tuesday", dayIndex: 2 },
  { label: "Wed", full: "Wednesday", dayIndex: 3 },
  { label: "Thu", full: "Thursday", dayIndex: 4 },
  { label: "Fri", full: "Friday", dayIndex: 5 },
  { label: "Sat", full: "Saturday", dayIndex: 6 },
  { label: "Sun", full: "Sunday", dayIndex: 0 },
];

const getDatesForWeekday = (startDateStr: string, endDateStr: string, targetDayIndex: number): string[] => {
  if (!startDateStr || !endDateStr) return [];
  const [sYear, sMonth, sDay] = startDateStr.split("-").map(Number);
  const [eYear, eMonth, eDay] = endDateStr.split("-").map(Number);
  if (!sYear || !sMonth || !sDay || !eYear || !eMonth || !eDay) return [];

  const start = startDateStr;
  const end = endDateStr;
  if (start > end) return [];

  const result: string[] = [];
  let current = start;

  while (current <= end) {
    const dayIndex = new Date(`${current}T12:00:00Z`).getUTCDay();
    if (dayIndex === targetDayIndex) {
      result.push(current);
    }
    current = addDateOnlyDays(current, 1);
  }
  return result;
};

const LeagueManagement: React.FC = () => {
  const { can, scope } = useCoachAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<FormErrors>({});
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterYear, setSelectedFilterYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [selectedFilterTerm, setSelectedFilterTerm] = useState<string>("");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const { terms: filterTerms } = useTerms({
    year: selectedFilterYear || undefined,
    isEvent: "all",
  });

  useEffect(() => {
    if (filterTerms && filterTerms.length > 0) {
      const active = findCurrentTerm(filterTerms) || filterTerms[0];
      const termIdToSet = active?._id || active?.id;
      if (!selectedFilterTerm || !filterTerms.some((t: any) => (t._id || t.id) === selectedFilterTerm)) {
        if (termIdToSet) {
          setSelectedFilterTerm(termIdToSet);
        }
      }
    }
  }, [filterTerms]);

  const [formData, setFormData] = useState({
    name: "",
    year: new Date().getFullYear().toString(),
    term: "",
    season: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "UPCOMING",
    type: "NATIONAL",
    visibility: "PUBLIC",
    pointsForWin: 3,
    pointsForDraw: 1,
    allowDraws: true,
    automaticLadderRecalculation: true,
    // Fixture configuration
    fixtureFormat: "ROUND_ROBIN" as "ROUND_ROBIN" | "KNOCKOUT",
    numberOfRounds: 1,
    matchDuration: 90,
    breakBetweenMatches: 15,
    numberOfFields: 1,
    startTime: "09:00",
    generationType: "MANUAL" as "AUTOMATIC" | "MANUAL",
    fee: 0 as number | string,
    venue: "",
  });

  // sessionDates: one date per round — synced to formData.numberOfRounds
  const [sessionDates, setSessionDates] = useState<string[]>([
    todayDateOnly(),
  ]);

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cropLogoFile, setCropLogoFile] = useState<File | null>(null);

  const clearValidationError = (field: keyof FormErrors, valid: boolean) => {
    if (!valid) return;
    setValidationErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  // Sync sessionDates array length whenever numberOfRounds changes
  const handleRoundsChange = (val: number) => {
    const rounds = Math.max(1, Math.min(50, val || 1));
    setFormData((prev) => ({ ...prev, numberOfRounds: rounds }));
    clearValidationError("rounds", Number.isInteger(rounds) && rounds >= 1);
    setSessionDates((prev) => {
      const next = [...prev];
      if (rounds > next.length) {
        while (next.length < rounds) {
          try {
            const lastD = next[next.length - 1] || todayDateOnly();
            next.push(addDateOnlyDays(lastD, 7));
          } catch {
            next.push("");
          }
        }
      } else {
        return next.slice(0, rounds);
      }
      return next;
    });
  };

  const handleSessionDateChange = (idx: number, val: string) => {
    const updated = [...sessionDates];
    updated[idx] = val;
    setSessionDates(updated);
    clearValidationError("dates", updated.filter(Boolean).length >= Number(formData.numberOfRounds));
  };

  const getDataArray = (res: any) => {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    if (res && Array.isArray(res.terms)) return res.terms;
    if (res && Array.isArray(res.teams)) return res.teams;
    return [];
  };

  // Fetch academic terms for year filter
  const { data: termsData } = useQuery({
    queryKey: ["terms", formData.year],
    queryFn: () => getAllTerms(formData.year ? Number(formData.year) : undefined),
    enabled: isModalOpen,
  });
  const terms: any[] = getDataArray(termsData);

  // Fetch academy teams for league enrollment (filtered by selected term)
  const { data: allTeamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["allAcademyTeams", formData.term],
    queryFn: () => getAllTeams(formData.term || undefined),
    enabled: isModalOpen,
  });
  const allAcademyTeams: any[] = getDataArray(allTeamsData);

  const formatDateForInput = (d: any): string => {
    if (!d) return "";
    if (typeof d === "string") {
      const match = d.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    try {
      const normalized = toDateOnly(d);
      if (normalized) return normalized;
    } catch {
      return "";
    }
    return "";
  };

  const handleTermChange = (termId: string) => {
    clearValidationError("term", Boolean(termId));
    const selectedTermObj = terms.find((t: any) => String(t._id || t.id) === String(termId));
    const termStart = selectedTermObj?.startDate ? formatDateForInput(selectedTermObj.startDate) : "";
    const termEnd = selectedTermObj?.endDate ? formatDateForInput(selectedTermObj.endDate) : "";

    setFormData((prev) => ({
      ...prev,
      term: termId,
      year: selectedTermObj?.year ? String(selectedTermObj.year) : prev.year,
      season: selectedTermObj ? (selectedTermObj.name || selectedTermObj.termName || `${prev.year}`) : prev.season,
      startDate: termStart || (termId ? "" : prev.startDate),
      endDate: termEnd || (termId ? "" : prev.endDate),
    }));
    setSelectedTeamIds([]);

    if (termStart && termEnd && selectedDayOfWeek !== null) {
      const dates = getDatesForWeekday(termStart, termEnd, selectedDayOfWeek);
      if (dates.length > 0) {
        setFormData((prev) => ({ ...prev, numberOfRounds: dates.length }));
        setSessionDates(dates);
        return;
      }
    }

    if (termStart) {
      setSessionDates(() => {
        const rounds = formData.numberOfRounds || 1;
        const arr: string[] = [];
        for (let i = 0; i < rounds; i++) {
          try {
            arr.push(addDateOnlyDays(termStart, i * 7));
          } catch {
            arr.push(termStart);
          }
        }
        return arr;
      });
    }
  };

  const handleSelectWeekday = (dayIndex: number) => {
    if (!formData.startDate || !formData.endDate) {
      toast.error("Please set both Start Date and End Date first.");
      return;
    }

    const dates = getDatesForWeekday(formData.startDate, formData.endDate, dayIndex);
    if (dates.length === 0) {
      const dayName = WEEKDAYS.find((w) => w.dayIndex === dayIndex)?.full || "selected day";
      toast.error(`No ${dayName}s found between ${formData.startDate} and ${formData.endDate}.`);
      return;
    }

    setSelectedDayOfWeek(dayIndex);
    setFormData((prev) => ({ ...prev, numberOfRounds: dates.length }));
    setSessionDates(dates);

    const dayName = WEEKDAYS.find((w) => w.dayIndex === dayIndex)?.full || "selected day";
    toast.success(`Found ${dates.length} ${dayName}s! Automatically configured ${dates.length} rounds.`);
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const getImageUrl = (path: string | undefined | null) => {
    return getMediaUrl(path) || null;
  };

  const { data: leaguesData, isLoading: loading } = useQuery({
    queryKey: ["leagues"],
    queryFn: () => getAllLeagues(),
  });
  const leagues = getDataArray(leaguesData);

  const createMutation = useMutation({
    mutationFn: createLeague,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      toast.success(res?.message || "League created successfully!");
      setIsModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to create league"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateLeague(id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      toast.success(res?.message || "League updated successfully!");
      setIsModalOpen(false);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to update league"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLeague,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      toast.success(res?.message || "League deleted successfully!");
      setDeleteModalId(null);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to delete league"),
  });

  const handleOpenAdd = () => {
    setValidationErrors({});
    const currentYear = new Date().getFullYear().toString();
    setFormData({
      name: "",
      year: currentYear,
      term: "",
      season: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "UPCOMING",
      type: "NATIONAL",
      visibility: "PUBLIC",
      pointsForWin: 3,
      pointsForDraw: 1,
      allowDraws: true,
      automaticLadderRecalculation: true,
      fixtureFormat: "ROUND_ROBIN" as "ROUND_ROBIN" | "KNOCKOUT",
      numberOfRounds: 1,
      matchDuration: 90,
      breakBetweenMatches: 15,
      numberOfFields: 1,
      startTime: "09:00",
      generationType: "MANUAL" as "AUTOMATIC" | "MANUAL",
      fee: 0,
      venue: "",
    });
    setSessionDates([todayDateOnly()]);
    setSelectedTeamIds([]);
    setTeamSearchQuery("");
    setSelectedFile(null);
    setPreviewImage(null);
    setIsEditing(false);
    setSelectedLeagueId(null);
    setSelectedDayOfWeek(null);
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (league: any) => {
    setValidationErrors({});
    const rounds = league.numberOfRounds ?? 1;
    const termId = typeof league.term === "object" ? league.term?._id : (league.term || league.termId || "");
    const yearVal = league.year || league.term?.year || (league.term?.startDate ? toDateOnly(league.term.startDate).slice(0, 4) : new Date().getFullYear().toString());

    setFormData({
      name: league.name || "",
      year: yearVal ? yearVal.toString() : new Date().getFullYear().toString(),
      term: termId || "",
      season: league.season || "",
      description: league.description || "",
      startDate: league.startDate ? formatDateForInput(league.startDate) : (league.term?.startDate ? formatDateForInput(league.term.startDate) : ""),
      endDate: league.endDate ? formatDateForInput(league.endDate) : (league.term?.endDate ? formatDateForInput(league.term.endDate) : ""),
      status: (league.status || "UPCOMING").toUpperCase(),
      type: (league.type || league.leagueType || league.competitionScope || "NATIONAL").toUpperCase(),
      visibility: (league.visibility || "PUBLIC").toUpperCase(),
      pointsForWin: league.pointsForWin ?? 3,
      pointsForDraw: league.pointsForDraw ?? 1,
      allowDraws: league.allowDraws ?? true,
      automaticLadderRecalculation: league.automaticLadderRecalculation ?? league.autoLadderCalculation ?? true,
      fixtureFormat: (league.fixtureFormat || "ROUND_ROBIN") as "ROUND_ROBIN" | "KNOCKOUT",
      numberOfRounds: rounds,
      matchDuration: league.matchDuration ?? 90,
      breakBetweenMatches: league.breakBetweenMatches ?? 15,
      numberOfFields: league.numberOfFields ?? 1,
      startTime: league.startTime || "09:00",
      generationType: (league.generationType || "MANUAL") as "AUTOMATIC" | "MANUAL",
      fee: league.fee ?? 0,
      venue: league.venue || "",
    });

    // Restore sessionDates from league, formatted as YYYY-MM-DD
    if (Array.isArray(league.sessionDates) && league.sessionDates.length > 0) {
      const formatted = league.sessionDates.map((d: string) => {
        try { return toDateOnly(d); } catch { return d; }
      });
      setSessionDates(formatted);
    } else {
    const today = todayDateOnly();
      const arr: string[] = [];
      for (let i = 0; i < rounds; i++) {
        try {
          arr.push(addDateOnlyDays(today, i * 7));
        } catch { arr.push(""); }
      }
      setSessionDates(arr);
    }

    const currentTeamIds = Array.isArray(league.teams)
      ? league.teams.map((t: any) => (typeof t === "string" ? t : t._id))
      : [];
    setSelectedTeamIds(currentTeamIds);
    setTeamSearchQuery("");
    setSelectedFile(null);
    setPreviewImage(getImageUrl(league.logo));
    setIsEditing(true);
    setSelectedLeagueId(league._id);
    setSelectedDayOfWeek(null);
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModalId(id);
  };

  const confirmDelete = () => {
    if (deleteModalId) {
      deleteMutation.mutate(deleteModalId);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      let normalized: File;
      try { normalized = await normalizeUploadImage(file); }
      catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); e.target.value = ""; return; }
      const validationError = await validateUploadFile(normalized, "logo", { checkDimensions: false });
      if (validationError) { toast.error(validationError); e.target.value = ""; return; }
      setCropLogoFile(normalized);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleTeamSelect = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  const handleSelectAllTeams = () => {
    const allFilteredIds = filteredAcademyTeams.map((t) => t._id);
    if (allFilteredIds.length === 0) return;
    const allSelected = allFilteredIds.every((id) => selectedTeamIds.includes(id));
    if (allSelected) {
      setSelectedTeamIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedTeamIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const validateStep1 = () => {
    const result = validateWithSchema(leagueIdentitySchema, formData);
    setValidationErrors((previous) => {
      const next = { ...previous };
      ["name", "term", "type"].forEach((field) => delete next[field]);
      return { ...next, ...result.errors };
    });
    return result.success;
  };

  const getValidationError = (field: "name" | "term" | "type" | "fee" | "rounds" | "dates") => validationErrors[field];

  const validateStep2 = () => {
    const result = validateWithSchema(leagueRulesSchema, { fee: formData.fee, rounds: formData.numberOfRounds });
    const validDates = sessionDates.filter(Boolean);
    const errors = { ...result.errors };
    if (validDates.length < Number(formData.numberOfRounds)) {
      errors.dates = `Select a session date for all ${formData.numberOfRounds} round(s).`;
    }
    setValidationErrors((previous) => {
      const next = { ...previous };
      ["fee", "rounds", "dates"].forEach((field) => delete next[field]);
      return { ...next, ...errors };
    });
    return result.success && !errors.dates;
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
      return;
    }

    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    // Validate sessionDates — must match numberOfRounds
    const validDates = sessionDates.filter(Boolean);
    if (validDates.length < formData.numberOfRounds) {
      setValidationErrors((previous) => ({ ...previous, dates: `Select a session date for all ${formData.numberOfRounds} round(s).` }));
      setCurrentStep(2);
      return;
    }



    // Derive startDate / endDate from sessionDates if not manually set
    let effectiveStart = formData.startDate;
    let effectiveEnd = formData.endDate;
    if (!effectiveStart || !effectiveEnd) {
      const sorted = [...validDates].sort();
      if (!effectiveStart) effectiveStart = sorted[0];
      if (!effectiveEnd) effectiveEnd = sorted[sorted.length - 1];
    }

    setValidationErrors({});
    const payload = new FormData();
    payload.append("name", formData.name.trim());
    if (formData.term) {
      payload.append("term", formData.term);
      payload.append("termId", formData.term);
    }
    const selectedTermObj = terms.find((t: any) => (t._id || t.id) === formData.term);
    const leagueYear = selectedTermObj?.year ? String(selectedTermObj.year) : formData.year;
    if (leagueYear) payload.append("year", leagueYear);
    const seasonVal = selectedTermObj?.name || formData.season || (leagueYear ? `${leagueYear}` : "");
    if (seasonVal) {
      payload.append("season", seasonVal);
    }
    payload.append("description", formData.description);
    if (effectiveStart) payload.append("startDate", effectiveStart);
    if (effectiveEnd) payload.append("endDate", effectiveEnd);
    payload.append("status", formData.status);
    payload.append("type", formData.type);
    payload.append("competitionScope", formData.type);
    payload.append("leagueType", formData.type);
    payload.append("visibility", formData.visibility);
    payload.append("pointsForWin", String(formData.pointsForWin));
    payload.append("pointsForDraw", String(formData.pointsForDraw));
    payload.append("allowDraws", String(formData.allowDraws));
    payload.append("automaticLadderRecalculation", String(formData.automaticLadderRecalculation));
    // Fixture configuration
    payload.append("fixtureFormat", formData.fixtureFormat);
    payload.append("numberOfRounds", String(formData.numberOfRounds));
    payload.append("matchDuration", String(formData.matchDuration));
    payload.append("breakBetweenMatches", String(formData.breakBetweenMatches));
    payload.append("numberOfFields", String(formData.numberOfFields));
    payload.append("startTime", formData.startTime);
    payload.append("generationType", formData.generationType);
    // Integration guide required fields
    payload.append("fee", String(formData.fee));
    payload.append("sessionDates", JSON.stringify(validDates));
    if (formData.venue) payload.append("venue", formData.venue);

    // Send teams as JSON array (more reliable than multiple appends)
    payload.append("teams", JSON.stringify(selectedTeamIds));

    if (selectedFile) {
      payload.append("leagueLogo", selectedFile);
    }

    if (isEditing && selectedLeagueId) {
      updateMutation.mutate({ id: selectedLeagueId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredAcademyTeams = allAcademyTeams.filter((team: any) => {
    const tName = team.teamName || team.name || "";
    const coachStr = typeof team.coach === "object" ? team.coach?.name || "" : team.coach || "";
    return (
      tName.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
      coachStr.toLowerCase().includes(teamSearchQuery.toLowerCase())
    );
  });

  const filteredLeagues = leagues.filter((league: any) => {
    // 1. Search Query Filter
    const matchesSearch =
      !searchQuery ||
      league.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      league.season?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (league.term?.name || league.termName || "")?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (league.type || league.leagueType || "")?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      league.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Year Filter
    if (selectedFilterYear) {
      const lYear = String(
        league.year ||
        league.term?.year ||
        (league.startDate ? toDateOnly(league.startDate).slice(0, 4) : "") ||
        ""
      );
      const inSeason = league.season ? String(league.season).includes(selectedFilterYear) : false;
      if (lYear && lYear !== selectedFilterYear && !inSeason) {
        return false;
      }
    }

    // 3. Term Filter
    if (selectedFilterTerm) {
      const leagueTermId = typeof league.term === "object" ? (league.term?._id || league.term?.id) : (league.term || league.termId);
      const selectedTermObj = filterTerms.find((t: any) => String(t._id || t.id) === String(selectedFilterTerm));
      const termName = selectedTermObj?.name || selectedTermObj?.termName || "";

      const matchesTermId = leagueTermId && String(leagueTermId) === String(selectedFilterTerm);
      const matchesTermName = termName && (
        (league.term?.name && league.term.name.toLowerCase() === termName.toLowerCase()) ||
        (league.termName && league.termName.toLowerCase() === termName.toLowerCase()) ||
        (league.season && league.season.toLowerCase().includes(termName.toLowerCase()))
      );

      if (!matchesTermId && !matchesTermName) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative w-full max-w-sm">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search leagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-none outline-none focus:border-brand-500 bg-white dark:bg-slate-800 dark:text-white transition-colors shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year Filter Dropdown */}
          <select
            value={selectedFilterYear}
            onChange={(e) => {
              setSelectedFilterYear(e.target.value);
              setSelectedFilterTerm("");
            }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-none focus:outline-none focus:border-[#0047FF] shadow-xs cursor-pointer"
          >
            <option value="">All Years</option>
            {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Term Filter Dropdown */}
          <select
            value={selectedFilterTerm}
            onChange={(e) => setSelectedFilterTerm(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-none focus:outline-none focus:border-[#0047FF] shadow-xs cursor-pointer max-w-[240px]"
          >
            <option value="">All Terms</option>
            {filterTerms.map((t: any) => (
              <option key={t._id || t.id} value={t._id || t.id}>
                {t.name || t.termName || t.title || "Term"} {t.year ? `(${t.year})` : ""}
              </option>
            ))}
          </select>

          {can("leagues", "create") && scope("leagues") === "ALL" && <Button onClick={handleOpenAdd} size="sm">Add League</Button>}
        </div>
      </div>

      <div className="bg-white border border-slate-100 shadow-theme-xs dark:bg-slate-900 dark:border-slate-800 overflow-visible">
        <div className="overflow-visible no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#031549] text-white text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[200px]">League Detail</th>
                <th className="py-3 px-4 min-w-[140px]">Term / Year</th>
                <th className="py-3 px-4 min-w-[140px]">Type</th>
                <th className="py-3 px-4 min-w-[100px]">Status</th>
                <th className="py-3 px-4 min-w-[100px]">Teams</th>
                <th className="py-3 px-4 min-w-[150px]">Dates</th>
                <th className="py-3 px-4 w-[50px] text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent shadow-sm"></div>
                    <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Syncing Leagues...</span>
                  </div>
                </td></tr>
              ) : filteredLeagues.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20 text-gray-500 font-medium italic">No leagues found.</td></tr>
              ) : (
                filteredLeagues.map((league: any) => (
                  <tr
                    key={league._id}
                    onClick={() => navigate(`/leagues/${league._id}`)}
                    className="border-b border-slate-50 last:border-0 dark:border-slate-800/40 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-all cursor-pointer"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-none bg-brand-50 overflow-hidden flex items-center justify-center text-brand-600 border border-brand-100 shadow-sm shrink-0">
                          {league.logo ? (
                            <img src={getImageUrl(league.logo) as string} alt={league.name} className="w-full h-full object-cover" />
                          ) : (
                            <Trophy size={18} />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-tight hover:text-brand-600 transition-colors">{league.name}</span>
                          <span className="text-[10px] font-semibold text-slate-500 max-w-[200px] truncate" title={league.description}>{league.description || "No description"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 text-xs text-slate-700 dark:text-slate-300 font-bold tracking-tight">
                        <span>{league.term?.name || league.termName || league.season || "Term not set"}</span>
                        <span className="text-[10px] font-medium text-slate-500">{league.year || league.term?.year || (league.term?.startDate ? toDateOnly(league.term.startDate).slice(0, 4) : "Year not set")}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {(() => {
                        const t = (league.type || league.leagueType || "NATIONAL").toUpperCase();
                        let badgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60";
                        let label = "National";

                        if (t === "INTERNATIONAL") {
                          badgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60";
                          label = "International";
                        } else if (t === "STATE") {
                          badgeClass = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60";
                          label = "State / Regional";
                        } else if (t === "LOCAL" || t === "INTERNAL") {
                          badgeClass = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
                          label = "Local / Internal";
                        }

                        return (
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-none border uppercase tracking-wider ${badgeClass}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-4">
                      {(() => {
                        const s = (league.status || "DRAFT").toUpperCase();
                        let badgeClass = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
                        if (s === "ACTIVE") badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
                        else if (s === "UPCOMING") badgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60";
                        else if (s === "COMPLETED") badgeClass = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60";
                        return (
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-none border uppercase tracking-wider ${badgeClass}`}>
                            {s}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Users size={14} className="text-slate-400" />
                        <span>{league.teams?.length || 0}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><Calendar size={12} className="text-brand-500" /> Start: {league.startDate ? formatDateOnly(league.startDate) : "TBD"}</span>
                        <span className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /> End: {league.endDate ? formatDateOnly(league.endDate) : "TBD"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-none shadow-sm hover:shadow transition-colors"
                        title="More Options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === league._id ? null : league._id);
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>

                      {openDropdownId === league._id && (
                        <div className="absolute right-8 top-10 w-44 bg-white dark:bg-slate-800 rounded-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/leagues/${league._id}`);
                              setOpenDropdownId(null);
                            }}
                          >
                            View Details
                          </button>
                          {can("communication", "create") && <ChatActionButton
                            contextLabel={league.name}
                            buttonText="League Chat"
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700/60 inline-flex items-center gap-2"
                            ensureRoom={() => chatApi.openLeagueChat(league._id)}
                          />}
                          {can("leagues", "edit") && scope("leagues") === "ALL" && <button
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-[#0047FF] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700/60"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(league);
                              setOpenDropdownId(null);
                            }}
                          >
                            Edit League
                          </button>}
                          {can("leagues", "delete") && scope("leagues") === "ALL" && <button
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700 mt-1 pt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(league._id);
                              setOpenDropdownId(null);
                            }}
                          >
                            Delete League
                          </button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-[920px] max-h-[92vh] overflow-y-auto p-6 lg:p-8 rounded-xl shadow-2xl"
        noBackgroundBlur={true}
        showCloseButton={false}
      >
        <FormHeader
          icon={Trophy}
          title={isEditing ? "Modify League" : "Create New League"}
          description={`Step ${currentStep} of 3: ${currentStep === 1 ? "Basic Information & Logo" : currentStep === 2 ? "Fixtures & Scoring Rules" : "Participating Teams"}`}
          className="-mx-6 -mt-6 mb-4 rounded-t-xl border-b border-[#082269] lg:-mx-8 lg:-mt-8"
          actions={(
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close league form"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        />
        <FormStepIndicator
          className="mb-5 border-b border-gray-100 pb-4 dark:border-gray-800"
          currentStep={currentStep}
          steps={[
            { label: "Basic information", description: "League identity & logo" },
            { label: "Fixtures & rules", description: "Schedule and scoring" },
            { label: "Participating teams", description: "Choose teams" },
          ]}
          onStepSelect={(step) => {
            if (step === 1) setCurrentStep(1);
            else if (step === 2 && validateStep1()) setCurrentStep(2);
            else if (step === 3 && validateStep1() && validateStep2()) setCurrentStep(3);
          }}
        />

        <div data-coachmax-form
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
              e.preventDefault();
            }
          }}
          className="space-y-6"
        >
          {Object.keys(validationErrors).length > 0 && (
            <div role="status" aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              Please correct the {Object.keys(validationErrors).length} highlighted field{Object.keys(validationErrors).length === 1 ? "" : "s"} to continue.
            </div>
          )}
          {/* STEP 1: Basic Information & Logo */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Section 1: Basic Information */}
              <div className="bg-slate-50/60 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Trophy size={16} className="text-brand-600" />
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Basic Information
                  </h5>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="league-name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  League Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="league-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => { const name = e.target.value; setFormData({ ...formData, name }); clearValidationError("name", Boolean(name.trim())); }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. Premier Youth League"
                  aria-required="true"
                  aria-invalid={Boolean(getValidationError("name"))}
                  aria-describedby={getValidationError("name") ? "league-name-error" : undefined}
                />
                {getValidationError("name") && <p id="league-name-error" role="alert" className="mt-1 text-xs text-error-600">{getValidationError("name")}</p>}
              </div>

              <div>
                <label htmlFor="league-year" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Year
                </label>
                <select
                  id="league-year"
                  value={formData.year}
                  onChange={(e) => {
                    setFormData({ ...formData, year: e.target.value, term: "", startDate: "", endDate: "" });
                    setSelectedTeamIds([]);
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="">All Years</option>
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="league-term" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Academic Term <span className="text-rose-500">*</span>
                </label>
                <select
                  id="league-term"
                  value={formData.term}
                  onChange={(e) => handleTermChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white cursor-pointer"
                  aria-required="true"
                  aria-invalid={Boolean(getValidationError("term"))}
                  aria-describedby={getValidationError("term") ? "league-term-error" : undefined}
                >
                  <option value="">Select Academic Term</option>
                  {terms.map((t: any) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {t.name || t.termName || t.title || "Term"}{t.year ? ` (${t.year})` : ""}
                    </option>
                  ))}
                </select>
                {getValidationError("term") && <p id="league-term-error" role="alert" className="mt-1 text-xs text-error-600">{getValidationError("term")}</p>}
              </div>

              <div>
                <label htmlFor="league-type" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  League Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="league-type"
                  value={formData.type}
                  onChange={(e) => { const type = e.target.value; setFormData({ ...formData, type }); clearValidationError("type", Boolean(type)); }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white cursor-pointer"
                  aria-required="true"
                  aria-invalid={Boolean(getValidationError("type"))}
                  aria-describedby={getValidationError("type") ? "league-type-error" : undefined}
                >
                  <option value="INTERNATIONAL">INTERNATIONAL</option>
                  <option value="NATIONAL">NATIONAL</option>
                  <option value="STATE">STATE</option>
                  <option value="LOCAL">LOCAL</option>
                  <option value="OTHERS">OTHERS</option>
                </select>
                {getValidationError("type") && <p id="league-type-error" role="alert" className="mt-1 text-xs text-error-600">{getValidationError("type")}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Visibility
                </label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="INTERNAL">INTERNAL</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium focus:border-brand-500 outline-none text-slate-900 dark:text-white resize-none h-20"
                  placeholder="e.g. Youth football competition"
                />
              </div>
            </div>
          </div>

              {/* League Logo / Crest */}
              <div className="bg-slate-50/60 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <ImageIcon size={16} className="text-indigo-600" />
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    League Logo / Crest (leagueLogo)
                  </h5>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={previewImage ? "Replace league logo" : "Upload league logo"}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-brand-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 transition-colors shrink-0 shadow-xs"
                  >
                    {previewImage ? (
                      <img src={previewImage} alt="Logo preview" className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 group-hover:text-brand-500 transition-colors">
                        <ImageIcon className="w-7 h-7 mb-1" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Upload</span>
                      </div>
                    )}
                  </button>

                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                      onChange={handleFileChange}
                      className="hidden"
                      id="modal-league-logo"
                    />
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="modal-league-logo"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-xs"
                      >
                        <ImageIcon size={13} />
                        <span>{previewImage ? "Change Logo" : "Select your logo"}</span>
                      </label>

                      {previewImage && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold dark:border-rose-900/40 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          <X size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Optional · square crop 512 × 512 px · JPEG, PNG, WebP, HEIC/HEIF · max 2MB. Displays in header, ladder, and standings.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Fixtures & Scoring Rules */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Section 2: Schedule Timelines */}
          <div className="bg-slate-50/60 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Calendar size={16} className="text-emerald-600" />
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Tournament Schedule
              </h5>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Start Date
                </label>
                <div className="relative">
                  <DateInput
                    type="date"
                    ref={startDateRef}
                    value={formData.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFormData((prev) => ({ ...prev, startDate: newStart }));
                      if (selectedDayOfWeek !== null && newStart && formData.endDate) {
                        const dates = getDatesForWeekday(newStart, formData.endDate, selectedDayOfWeek);
                        if (dates.length > 0) {
                          setFormData((prev) => ({ ...prev, numberOfRounds: dates.length }));
                          setSessionDates(dates);
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3.5 pr-10 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center cursor-pointer z-10"
                    onClick={() => {
                      try {
                        startDateRef.current?.showPicker();
                      } catch {
                        startDateRef.current?.focus();
                      }
                    }}
                  >
                    <Calendar className="text-slate-400 w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  End Date
                </label>
                <div className="relative">
                  <DateInput
                    type="date"
                    ref={endDateRef}
                    value={formData.endDate}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setFormData((prev) => ({ ...prev, endDate: newEnd }));
                      if (selectedDayOfWeek !== null && formData.startDate && newEnd) {
                        const dates = getDatesForWeekday(formData.startDate, newEnd, selectedDayOfWeek);
                        if (dates.length > 0) {
                          setFormData((prev) => ({ ...prev, numberOfRounds: dates.length }));
                          setSessionDates(dates);
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3.5 pr-10 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center cursor-pointer z-10"
                    onClick={() => {
                      try {
                        endDateRef.current?.showPicker();
                      } catch {
                        endDateRef.current?.focus();
                      }
                    }}
                  >
                    <Calendar className="text-slate-400 w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2b: Fixture Configuration */}
          <div className="bg-slate-50/60 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Zap size={16} className="text-violet-500" />
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Fixture Configuration
              </h5>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

              {/* Fixture Format */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Fixture Format
                </label>
                <select
                  value={formData.fixtureFormat}
                  onChange={(e) => setFormData({ ...formData, fixtureFormat: e.target.value as "ROUND_ROBIN" | "KNOCKOUT" })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="ROUND_ROBIN">Round Robin</option>
                  <option value="KNOCKOUT">Knockout</option>
                </select>
              </div>

              {/* Number of Rounds */}
              <div>
                <label htmlFor="league-round-count" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Number of Rounds <span className="text-rose-500">*</span>
                </label>
                <input
                  id="league-round-count"
                  type="number"
                  min={1}
                  max={50}
                  value={formData.numberOfRounds}
                  onChange={(e) => handleRoundsChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. 3"
                  aria-invalid={Boolean(getValidationError("rounds"))}
                  aria-describedby={getValidationError("rounds") ? "league-round-count-error" : undefined}
                />
                {getValidationError("rounds") && <p id="league-round-count-error" role="alert" className="mt-1 text-xs text-error-600">{getValidationError("rounds")}</p>}
                <p className="text-[10px] text-slate-400 mt-1">Session dates below are auto-synced to this count.</p>
              </div>

              {/* Number of Fields */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Number of Fields / Pitches
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.numberOfFields}
                  onChange={(e) => setFormData({ ...formData, numberOfFields: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. 2"
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
                  value={formData.matchDuration}
                  onChange={(e) => setFormData({ ...formData, matchDuration: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. 90"
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
                  value={formData.breakBetweenMatches}
                  onChange={(e) => setFormData({ ...formData, breakBetweenMatches: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. 15"
                />
              </div>

              {/* Default Start Time */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Default Start Time
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* League Fee & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label htmlFor="league-fee" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  League Fee Per Player ($) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="league-fee"
                  type="number"
                  min={0}
                  step="any"
                  value={formData.fee}
                  onChange={(e) => {
                    const fee = e.target.value === "" ? "" : Number(e.target.value);
                    setFormData({ ...formData, fee });
                    clearValidationError("fee", validateWithSchema(leagueRulesSchema.pick({ fee: true }), { fee }).success);
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. 150 (0 = free)"
                  aria-required="true"
                  aria-invalid={Boolean(getValidationError("fee"))}
                  aria-describedby={getValidationError("fee") ? "league-fee-error" : undefined}
                />
                {getValidationError("fee") && <p id="league-fee-error" role="alert" className="mt-1 text-xs text-error-600">{getValidationError("fee")}</p>}
                <p className="text-[10px] text-slate-400 mt-1">If &gt; 0, invoices are auto-generated for UNPAID players.</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Venue / Facility Name
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. Olympic Park Arena"
                />
              </div>
            </div>

            {/* Weekday Recurrence Match Day Selector */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar size={13} className="text-brand-600" />
                    Auto-Generate Rounds By Match Day
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Select a match day (Monday – Sunday) across the Start Date to End Date range. Admin can still customize or override any round below.
                  </p>
                </div>
                {selectedDayOfWeek !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedDayOfWeek(null)}
                    className="text-[10px] font-bold text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-white underline cursor-pointer self-start sm:self-auto"
                  >
                    Clear Day Selection
                  </button>
                )}
              </div>

              {/* Day Tabs: Monday to Sunday */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEKDAYS.map((wd) => {
                  const isSelected = selectedDayOfWeek === wd.dayIndex;
                  let dayCount: number | null = null;
                  if (formData.startDate && formData.endDate) {
                    try {
                      dayCount = getDatesForWeekday(formData.startDate, formData.endDate, wd.dayIndex).length;
                    } catch {}
                  }

                  return (
                    <button
                      key={wd.dayIndex}
                      type="button"
                      onClick={() => handleSelectWeekday(wd.dayIndex)}
                      title={`Generate rounds for all ${wd.full}s`}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer shadow-xs ${
                        isSelected
                          ? "bg-brand-600 text-white border-brand-600 ring-2 ring-brand-500/30 font-black scale-[1.02]"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 font-bold"
                      }`}
                    >
                      <span className="text-xs sm:text-sm">{wd.label}</span>
                      <span
                        className={`text-[9px] mt-0.5 font-extrabold px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-white/25 text-white"
                            : dayCount !== null && dayCount > 0
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            : "text-slate-300 dark:text-slate-600"
                        }`}
                      >
                        {dayCount !== null ? `${dayCount} ${dayCount === 1 ? "rnd" : "rnds"}` : "-"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Session Dates — one per round */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Calendar size={14} className="text-brand-600" />
                    Round Session Dates
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Assign one date per round. Backend maps Round 1 → Date[0], Round 2 → Date[1], etc.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/30 px-2 py-1 rounded-full border border-brand-200 dark:border-brand-900">
                  {sessionDates.filter(Boolean).length} / {formData.numberOfRounds} set
                </span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {getValidationError("dates") && <p id="league-dates-error" role="alert" className="text-xs text-error-600">{getValidationError("dates")}</p>}
                {sessionDates.map((dateVal, idx) => {
                  let formattedDay = "";
                  if (dateVal) {
                    try {
                      formattedDay = formatDateOnly(dateVal, { weekday: "short", day: "numeric", month: "short" });
                    } catch {}
                  }

                  return (
                    <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 min-w-[90px]">
                        <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Round {idx + 1}</span>
                      </div>
                      <DateInput
                        type="date"
                        value={dateVal}
                        onChange={(e) => handleSessionDateChange(idx, e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold dark:text-white focus:border-brand-500 outline-none cursor-pointer"
                        required
                        aria-invalid={Boolean(getValidationError("dates") && !dateVal)}
                        aria-describedby={getValidationError("dates") ? "league-dates-error" : undefined}
                      />
                      {formattedDay && (
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 min-w-[85px] text-right shrink-0">
                          {formattedDay}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live config chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold border border-violet-200 dark:border-violet-800">
                {formData.fixtureFormat === "ROUND_ROBIN" ? "Round Robin" : "Knockout"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                {formData.numberOfRounds} Round{formData.numberOfRounds !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                ⏱ {formData.matchDuration}min · {formData.breakBetweenMatches}min break
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                🏟 {formData.numberOfFields} Field{formData.numberOfFields !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                🕘 {formData.startTime}
              </span>
              {Number(formData.fee) > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                  💰 ${formData.fee}/player
                </span>
              )}
            </div>
          </div>

          {/* Section 3: Ladder & Operational Rules */}
          <div className="bg-slate-50/60 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Settings2 size={16} className="text-amber-600" />
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Scoring & Ladder Rules
              </h5>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Points for Win
                </label>
                <input
                  type="number"
                  value={formData.pointsForWin}
                  onChange={(e) => setFormData({ ...formData, pointsForWin: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Points for Draw
                </label>
                <input
                  type="number"
                  value={formData.pointsForDraw}
                  onChange={(e) => setFormData({ ...formData, pointsForDraw: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold focus:border-brand-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col justify-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowDraws}
                    onChange={(e) => setFormData({ ...formData, allowDraws: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Allow Draws
                    </span>
                    <span className="text-[10px] text-slate-400">Award points for tied matches</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.automaticLadderRecalculation}
                    onChange={(e) =>
                      setFormData({ ...formData, automaticLadderRecalculation: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Automatic Ladder Recalculation
                    </span>
                    <span className="text-[10px] text-slate-400">Instant standings computation</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
            </div>
          )}

          {/* STEP 3: Participating Teams */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Section 4: Participating Teams (teams) */}
              <div className="bg-slate-50/60 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users size={16} className="text-blue-600 shrink-0" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Participating Teams
                    </h5>
                    {formData.term && (
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        • {terms.find((t: any) => String(t._id || t.id) === String(formData.term))?.name || "Selected Term"}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                      {selectedTeamIds.length} Selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTeams}
                      className="text-[11px] font-bold text-brand-600 hover:text-brand-700 underline cursor-pointer"
                    >
                      {filteredAcademyTeams.length > 0 &&
                      filteredAcademyTeams.every((t) => selectedTeamIds.includes(t._id))
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>
                </div>

                {/* Team Search filter */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search academy teams to enroll..."
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                      }
                    }}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                  />
                  {teamSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTeamSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Scrollable Team List */}
                <div className="max-h-64 sm:max-h-72 overflow-y-auto no-scrollbar border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
                  {!formData.term ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      Please select an Academic Term in Step 1 to view available teams.
                    </div>
                  ) : teamsLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent shadow-sm"></div>
                      <span>Loading teams for selected term...</span>
                    </div>
                  ) : filteredAcademyTeams.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      {allAcademyTeams.length === 0
                        ? "No academy teams found for this term."
                        : "No teams match your search query."}
                    </div>
                  ) : (
                    filteredAcademyTeams.map((team: any) => {
                      const isSelected = selectedTeamIds.includes(team._id);
                      const tName = team.teamName || team.name || "Academy Team";
                      const coachName =
                        typeof team.coach === "object" && team.coach?.name
                          ? team.coach.name
                          : typeof team.coach === "string"
                            ? team.coach
                            : "Unassigned";

                      return (
                        <div
                          key={team._id}
                          onClick={() => toggleTeamSelect(team._id)}
                          className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors select-none ${
                            isSelected
                              ? "bg-brand-50/70 dark:bg-brand-950/30 border-l-2 border-brand-500"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleTeamSelect(team._id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                {tName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Coach: {coachName} {team.players?.length ? `• ${team.players.length} players` : ""}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-slate-400">
                            {team._id ? team._id.slice(-6) : ""}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Footer Actions */}
          <FormActions className="-mx-6 -mb-6 mt-5 rounded-b-xl justify-between lg:-mx-8 lg:-mb-8">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev > 1 ? (prev - 1) as 1 | 2 | 3 : 1))}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {currentStep === 3 ? "← Back to Step 2" : "← Back"}
                </button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Discard
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
                    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
                  }}
                  className="px-6 flex items-center gap-2"
                >
                  <span>{currentStep === 1 ? "Next: Fixtures & Rules" : "Next: Select Teams"}</span>
                  <span>→</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-8 flex items-center gap-2 ml-10 transition-all duration-300"
                >
                  <Trophy size={14} />
                  <span>
                    {createMutation.isPending || updateMutation.isPending
                      ? "Committing..."
                      : isEditing
                        ? "Save Changes"
                        : "Create League"}
                  </span>
                </Button>
              )}
            </div>
          </FormActions>
        </div>
      </Modal>

      {cropLogoFile && <ImageCropModal file={cropLogoFile} policy="logo" onCancel={() => {
        setCropLogoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }} onCrop={(cropped) => {
        setSelectedFile(cropped);
        setPreviewImage(URL.createObjectURL(cropped));
        setCropLogoFile(null);
      }} />}

      <ConfirmDeleteModal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
        title="Delete League"
        message="Are you sure you want to delete this league? This action cannot be undone."
      />
    </div>
  );
};

export default LeagueManagement;
