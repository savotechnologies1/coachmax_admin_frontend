import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Player } from "../../types/player";
import { allocateVerification, fetchAllocationClasses } from "../../api/verificationApi";
import { useTerms } from "../../hooks/useTerms";
import { useCategories } from "../../hooks/useCategories";
import { useProgramsByCategory } from "../../hooks/usePrograms";
import { formatDateOnly, ageGroupForYear } from "../../utils/dateTime";
import { CalendarDays, ClipboardList, CreditCard, UserRoundCheck, Users, X } from "lucide-react";
import FormHeader from "../form/FormHeader";
import FormField from "../form/FormField";
import FormSection from "../form/FormSection";
import FormActions from "../form/FormActions";

interface AssignClassModalProps { player: Player; onClose: () => void; }
const id = (value: any): string => String(value?._id || value || "");

export default function AssignClassModal({ player, onClose }: AssignClassModalProps) {
  const queryClient = useQueryClient();
  const { terms, isLoading: loadingTerms } = useTerms({ isEvent: "all" });
  const { categories, isLoading: loadingCategories } = useCategories({ isEvent: "all" });
  const requested = player.preferredClasses || [];
  const assignedClassIds = new Set((player.assignedClasses || []).map(id));
  const requestedAlreadyAssignedNames = Array.from(new Set(requested
    .filter((cls) => assignedClassIds.has(id(cls)))
    .map((cls) => cls.name)
    .filter(Boolean)));
  const isHolidayProgram = player.requestType === "HOLIDAY_PROGRAM";
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [termId, setTermId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(id(player.category || requested[0]?.category));
  const [selectedProgramId, setSelectedProgramId] = useState(id(player.program || player.programs?.[0] || requested[0]?.program));
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(requested.filter((cls) => cls && cls.status !== "INACTIVE" && !assignedClassIds.has(id(cls))).map(id));
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");
  const [overrideEligibility, setOverrideEligibility] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const resolvedRequest = Boolean(player.requestId && player.status !== "PENDING");
  const yearOptions = Array.from(new Set([currentYear, ...terms.map((term) => Number(term.year)).filter((year) => Number.isInteger(year) && year > 0)])).sort((left, right) => right - left);
  const eligibleTerms = terms.filter((term) => Number(term.year) === selectedYear && term.status !== "COMPLETED");
  useEffect(() => {
    if (loadingTerms) return;
    if (eligibleTerms.some((term) => term._id === termId)) return;
    const preferredTermId = id(player.preferredTerm) || id(requested[0]?.term);
    const preferredTerm = eligibleTerms.find((term) => term._id === preferredTermId);
    const defaultTerm = preferredTerm
      || eligibleTerms.find((term) => term.isCurrent)
      || eligibleTerms.find((term) => term.isActive && term.status === "ACTIVE")
      || eligibleTerms[0];
    setTermId(defaultTerm?._id || "");
    if (!preferredTerm) setSelectedClassIds([]);
  }, [eligibleTerms, loadingTerms, player.preferredTerm, requested, termId]);
  const selectedTerm = eligibleTerms.find((term) => term._id === termId);
  const categoryOptions = categories.filter((category) => selectedTerm ? Boolean(category.isEvent) === Boolean(selectedTerm.isEvent) : true);
  const categoryId = categoryOptions.some((category) => id(category) === selectedCategoryId) ? selectedCategoryId : "";
  const { programs, isLoading: loadingPrograms } = useProgramsByCategory(categoryId);
  const programId = programs.some((program) => id(program) === selectedProgramId) ? selectedProgramId : "";
  const canLoadClasses = Boolean(termId && categoryId && programId);
  const { data: classes = [], isLoading, isError, error } = useQuery({
    queryKey: ["allocationClasses", termId, categoryId, programId],
    queryFn: () => fetchAllocationClasses(termId, categoryId, programId),
    enabled: canLoadClasses,
  });
  const canSelectClass = (cls: any) => cls.status === "ACTIVE" && !assignedClassIds.has(id(cls)) && !(Number(cls.capacity) > 0 && Number(cls.playerCount) >= Number(cls.capacity));
  const unavailableSelection = selectedClassIds.some((classId) => !classes.some((cls: any) => cls._id === classId && canSelectClass(cls)));
  const duplicateSelectionNames = selectedClassIds
    .filter((classId) => assignedClassIds.has(classId))
    .map((classId) => classes.find((cls: any) => id(cls) === classId)?.name || requested.find((cls) => id(cls) === classId)?.name || "Selected class");
  const alreadyAssignedClassNames = Array.from(new Set([
    ...requestedAlreadyAssignedNames,
    ...classes.filter((cls: any) => assignedClassIds.has(id(cls))).map((cls: any) => cls.name),
  ].filter(Boolean)));
  const mutation = useMutation({
    mutationFn: () => allocateVerification({ playerId: player._id, registrationRequestId: player.requestId, classIds: selectedClassIds, paymentStatus, overrideEligibility, overrideReason }),
    onSuccess: async (data) => {
      await Promise.all(["registrationRequests", "coachTemporaryPlayers", "players", "unallocatedPlayers", "allocatedPlayers", "classPlayers", "classFullTable", "classFullTables", "classes", "allocationClasses", "sidebarBadges", "invoices", "player", "playerProfile"].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success(data.message || "Player approved and allocated");
      onClose();
    },
    onError: (reason: any) => { if (!reason._handled) toast.error(reason.response?.data?.message || reason.message || "Allocation failed"); },
  });
  const canSubmit = Boolean(
    !resolvedRequest
      && termId
      && selectedClassIds.length
      && !duplicateSelectionNames.length
      && !unavailableSelection
      && canLoadClasses
      && !isLoading
      && !isError
      && !mutation.isPending
      && (!overrideEligibility || overrideReason.trim().length >= 10),
  );
  const toggle = (classId: string) => setSelectedClassIds((current) => {
    if (assignedClassIds.has(classId)) return current;
    const available = current.filter((value) => classes.some((cls: any) => cls._id === value));
    return available.includes(classId) ? available.filter((value) => value !== classId) : [...available, classId];
  });
  const requestKind = isHolidayProgram ? "Holiday Program" : player.requestType === "EVENT_REGISTRATION" ? "Event Registration" : "Class Request";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
      <form
        data-coachmax-form
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="allocate-title"
        onSubmit={(event) => { event.preventDefault(); if (canSubmit) mutation.mutate(); }}
        className="custom-scrollbar max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <FormHeader
          icon={UserRoundCheck}
          titleId="allocate-title"
          title={resolvedRequest ? "Request Assignment Details" : isHolidayProgram ? "Assign Holiday Program" : "Approve and Allocate"}
          description="Choose a term, program, and session for this player."
          className="-mx-6 -mt-6 mb-5 rounded-t-xl border-b border-[#082269]"
          actions={<button type="button" onClick={onClose} aria-label="Close assignment form" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>}
        />
        <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">{player.fullName} — DOB {formatDateOnly(player.dob)}{selectedTerm ? ` · U${ageGroupForYear(player.dob, selectedTerm.year) ?? "?"} in ${selectedTerm.year}` : ""}</p>
        <FormSection title="Request details" icon={ClipboardList} className="mb-6">
          <div className="border border-slate-200 bg-slate-50 p-3 text-sm leading-6 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="font-semibold text-slate-900 dark:text-white">{requestKind}</p>
            <p className="text-slate-700 dark:text-slate-300">{player.programs?.map((program) => program.name).join(", ") || "No program specified"}</p>
            <p className="text-slate-700 dark:text-slate-300">{player.preferredTerm?.name || "No preferred term"}</p>
            {requested.length ? requested.map((cls) => <p key={id(cls)} className="text-slate-700 dark:text-slate-300">{cls.name || "Unavailable class"} · {cls.dayOfWeek} {cls.startTime}–{cls.endTime} · {cls.venue || cls.location || "Location not set"}{cls.status === "INACTIVE" ? " (inactive)" : ""}</p>) : <p className="text-slate-700 dark:text-slate-300">No class requested. Choose the term, program, sub-program and session below.</p>}
          </div>
        </FormSection>
        {!resolvedRequest && <>
          <FormSection title="Assignment" description="Choose the year, term, program, and sub-program for this player." icon={CalendarDays} className="mb-6" contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="allocation-year" label="Year">
              <select id="allocation-year" className="w-full rounded-none border border-slate-300 px-3 py-2.5 dark:bg-slate-800" value={selectedYear} onChange={(event) => { setSelectedYear(Number(event.target.value)); setTermId(""); setSelectedClassIds([]); }}>
                {yearOptions.map((year) => <option key={year} value={year}>{year}{year === currentYear ? " (Current year)" : ""}</option>)}
              </select>
            </FormField>
            <FormField id="allocation-term" label={isHolidayProgram ? "Holiday program term" : "Term"}>
              <select id="allocation-term" className="w-full rounded-none border border-slate-300 px-3 py-2.5 dark:bg-slate-800" value={termId} onChange={(event) => { setTermId(event.target.value); setSelectedClassIds([]); }}>
                <option value="">Select {isHolidayProgram ? "holiday program" : "term"}</option>
                {eligibleTerms.map((term) => <option key={term._id} value={term._id}>{isHolidayProgram ? "Holiday Program · " : ""}{term.year} · {term.name} ({formatDateOnly(term.startDate)}–{formatDateOnly(term.endDate)})</option>)}
              </select>
            </FormField>
            <FormField id="allocation-category" label={isHolidayProgram ? "Holiday program" : "Program"}>
              <select id="allocation-category" className="w-full rounded-none border border-slate-300 px-3 py-2.5 dark:bg-slate-800" value={categoryId} disabled={loadingCategories} onChange={(event) => { setSelectedCategoryId(event.target.value); setSelectedProgramId(""); setSelectedClassIds([]); }}>
                <option value="">{loadingCategories ? "Loading programs…" : isHolidayProgram ? "Select holiday program" : "Select program"}</option>
                {categoryOptions.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
              </select>
            </FormField>
            <FormField id="allocation-subprogram" label="Sub-program">
              <select id="allocation-subprogram" className="w-full rounded-none border border-slate-300 px-3 py-2.5 dark:bg-slate-800" value={programId} disabled={!categoryId || loadingPrograms} onChange={(event) => { setSelectedProgramId(event.target.value); setSelectedClassIds([]); }}>
                <option value="">{!categoryId ? "Select a program first" : loadingPrograms ? "Loading sub-programs…" : "Select sub-program"}</option>
                {programs.map((program) => <option key={program._id} value={program._id}>{program.name}</option>)}
              </select>
            </FormField>
          </FormSection>
          <FormSection title={`Class sessions${selectedClassIds.length ? ` · ${selectedClassIds.length} selected` : ""}`} description="Select one or more available sessions to allocate this player." icon={Users} className="mb-6">
            {alreadyAssignedClassNames.length > 0 && <p role="status" className="mb-3 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Already enrolled in {alreadyAssignedClassNames.map((name) => `“${name}”`).join(", ")}. These classes cannot be assigned again.
            </p>}
            {isLoading ? <p className="text-sm text-slate-500">Loading sessions…</p> : isError ? <p role="alert" className="text-sm text-red-600">{error instanceof Error ? error.message : "Could not load sessions"}</p> : !termId || !categoryId || !programId ? <p className="text-sm text-slate-500">Choose a year, term, program and sub-program to see available sessions.</p> : !classes.length ? <p className="text-sm text-slate-500">No sessions are available for this selection.</p> : (
            <fieldset className="max-h-64 space-y-2 overflow-y-auto" aria-label="Available class sessions">
              {classes.map((cls: any) => {
                const full = Number(cls.capacity) > 0 && Number(cls.playerCount) >= Number(cls.capacity) && !player.assignedClasses?.some((assigned) => id(assigned) === id(cls));
                const alreadyAssigned = assignedClassIds.has(id(cls));
                const disabled = cls.status !== "ACTIVE" || full || alreadyAssigned;
                return <label key={cls._id} className={`flex gap-3 border border-slate-200 p-3 text-sm dark:border-slate-700 ${disabled ? "opacity-60" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                  <input type="checkbox" checked={selectedClassIds.includes(cls._id) && !alreadyAssigned} disabled={alreadyAssigned || (disabled && !selectedClassIds.includes(cls._id))} onChange={() => toggle(cls._id)} />
                  <span><strong>{cls.name}</strong>{requested.some((requestedClass) => id(requestedClass) === id(cls)) && " (requested)"}<br />{cls.dayOfWeek} {cls.startTime}–{cls.endTime} · {cls.venue || cls.location || "Location not set"}<br />{cls.program?.name || ""}{Number(cls.capacity) > 0 ? ` · ${cls.playerCount ?? "?"}/${cls.capacity} enrolled` : ""}{alreadyAssigned ? " · Already assigned" : full ? " · Full" : ""}</span>
                </label>;
              })}
            </fieldset>
          )}
            {unavailableSelection && !isLoading && <p className="mt-2 text-sm text-amber-700">A requested session is unavailable. Select an available session to continue.</p>}
          </FormSection>
          <FormSection title="Enrollment" description="Set the payment status and record an eligibility exception when needed." icon={CreditCard} contentClassName="space-y-4">
            <FormField id="allocation-payment" label="Enrollment payment status">
              <select id="allocation-payment" className="w-full rounded-none border border-slate-300 px-3 py-2.5 dark:bg-slate-800" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                <option value="UNPAID">Approved — UNPAID (create class fee invoice)</option><option value="TRIAL">TRIAL</option><option value="TBC">TBC</option><option value="EXTRA">EXTRA</option><option value="SUBSTITUTE">SUBSTITUTE</option><option value="HANDSHAKE">HANDSHAKE</option>
              </select>
            </FormField>
            <label htmlFor="allocation-override" className="flex items-start gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input id="allocation-override" type="checkbox" checked={overrideEligibility} onChange={(event) => setOverrideEligibility(event.target.checked)} className="mt-0.5" />
              <span>Override age, gender or requested-term eligibility</span>
            </label>
            {overrideEligibility && <FormField id="allocation-override-reason" label="Eligibility override reason" required hint="Explain the approved exception in at least 10 characters.">
              <textarea id="allocation-override-reason" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} maxLength={2000} placeholder="Explain the approved exception" className="min-h-[100px] w-full rounded-none border border-slate-300 p-3 dark:bg-slate-800" />
            </FormField>}
          </FormSection>
        </>}
        <FormActions className="-mx-6 -mb-6 mt-6 rounded-b-xl">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="min-h-11 border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">{resolvedRequest ? "Close" : "Cancel"}</button>
          {!resolvedRequest && <button type="submit" disabled={!canSubmit} className="min-h-11 bg-brand-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{mutation.isPending ? "Allocating…" : isHolidayProgram ? "Approve and Assign Holiday Program" : "Approve and Allocate"}</button>}
        </FormActions>
      </form>
    </div>
  );
}
