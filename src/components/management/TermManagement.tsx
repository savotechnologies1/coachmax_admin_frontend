import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { useTerms, useCreateTerm, useUpdateTerm, useDeleteTerm } from "../../hooks/useTerms";
import { toast } from "react-hot-toast";
import { Calendar } from "../../icons/lucide-icons";
import { Pencil, Trash2, ChevronDown, ChevronUp, CalendarDays, X } from "lucide-react";
import DatePicker from "../form/date-picker";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";
import TermCalendar from "./TermCalendar";
import { formatDateOnly, toDateOnly, ageGroupContextYear } from "../../utils/dateTime";

import { smartErrorToast } from "../../utils/toast";
import FormHeader from "../form/FormHeader";
import FormActions from "../form/FormActions";
import { requiredText, validateWithSchema } from "../../utils/formValidation";
import { z } from "zod";

const termSchema = z.object({
    name: requiredText("Term name"),
    year: z.preprocess((value) => Number(value), z.number().int().min(2000, "Enter a valid year between 2000 and 2100.").max(2100, "Enter a valid year between 2000 and 2100.")),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
}).superRefine((value, context) => {
    if (value.startDate && value.endDate && toDateOnly(value.startDate) > toDateOnly(value.endDate)) {
        context.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after the start date." });
    }
});

const TermManagement: React.FC = () => {
    const [showCalendar, setShowCalendar] = useState(true);
    const [showList, setShowList] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: "",
        year: ageGroupContextYear(),
        startDate: "",
        endDate: "",
    });

    const formatDate = (dateStr: string) => formatDateOnly(dateStr) || "N/A";

    const currentYear = ageGroupContextYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

    const { terms, isLoading: loading } = useTerms({
        year: selectedYear,
        isEvent: "all",
    });

    const createMutation = useCreateTerm();
    const updateMutation = useUpdateTerm();
    const deleteMutation = useDeleteTerm();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "year" ? parseInt(value) || 0 : value,
        }));
        setFormErrors((previous) => { const next = { ...previous }; delete next[name]; return next; });
    };

    const handleDateChange = (name: string, dateStr: string) => {
        setFormData(prev => ({ ...prev, [name]: dateStr }));
        setFormErrors((previous) => { const next = { ...previous }; [name, "startDate", "endDate"].forEach((field) => delete next[field]); return next; });
    };

    const getDaysBetween = (start: string, end: string) => {
        const s = toDateOnly(start);
        const e = toDateOnly(end);
        if (!s || !e) return null;
        return Math.round((Date.parse(`${e}T00:00:00Z`) - Date.parse(`${s}T00:00:00Z`)) / 86400000) + 1;
    };

    const handleOpenAdd = () => {
        setFormErrors({});
        setFormData({
            name: "",
            year: selectedYear,
            startDate: "",
            endDate: "",
        });
        setIsEditing(false);
        setSelectedId(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (term: any) => {
        setFormErrors({});
        setFormData({
            name: term.name || "",
            year: term.year || selectedYear,
            startDate: toDateOnly(term.startDate),
            endDate: toDateOnly(term.endDate),
        });
        setIsEditing(true);
        setSelectedId(term._id);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteModalId(id);
    };

    const confirmDelete = () => {
        if (deleteModalId) {
            deleteMutation.mutate(deleteModalId, {
                onSuccess: () => {
                    toast.success("Term deleted");
                    setDeleteModalId(null);
                },
                onError: (error: any) => {
                    smartErrorToast(error, "Failed to delete term");
                    setDeleteModalId(null);
                }
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const formattedStart = toDateOnly(formData.startDate);
        const formattedEnd = toDateOnly(formData.endDate);

        const validation = validateWithSchema(termSchema, formData);
        setFormErrors(validation.errors);
        if (!validation.success) return;

        const payload = {
            name: formData.name.trim(),
            year: formData.year,
            startDate: formatDateOnly(formattedStart),
            endDate: formatDateOnly(formattedEnd),
        };

        if (isEditing && selectedId) {
            updateMutation.mutate(
                { id: selectedId, data: payload },
                {
                    onSuccess: () => {
                        toast.success("Term updated successfully");
                        setIsModalOpen(false);
                    },
                    onError: (error: any) => smartErrorToast(error, "Failed to update term"),
                }
            );
        } else {
            createMutation.mutate(payload, {
                onSuccess: () => {
                    toast.success("Term created successfully");
                    setIsModalOpen(false);
                },
                onError: (error: any) => smartErrorToast(error, "Failed to create term"),
            });
        }
    };

    return (
        <div className="bg-white dark:bg-white/[0.03] rounded-none border border-gray-200 dark:border-white/[0.05] p-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">Academy Terms</h3>
                    <p className="text-xs text-gray-500">Define seasonal training windows</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => setShowCalendar((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors rounded-none"
                    >
                        {showCalendar ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {showCalendar ? "Hide Calendar" : "Show Calendar"}
                    </button>

                    <button
                        onClick={() => setShowList((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors rounded-none"
                    >
                        {showList ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {showList ? "Hide List" : "Show List"}
                    </button>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="rounded-none border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700 focus:border-brand-500 focus:bg-white outline-none transition-all cursor-pointer appearance-none"
                    >
                        {yearOptions.map((y) => (
                            <option key={y} value={y}>Year {y}</option>
                        ))}
                    </select>
                    <Button onClick={handleOpenAdd} size="sm">Add Term</Button>
                </div>
            </div>

            {/* ── Term Calendar ── */}
            {showCalendar && (
                <div className="mb-6 pb-6 border-b border-gray-100 dark:border-white/[0.05]">
                    {loading ? (
                        <div className="text-center text-xs text-gray-400 py-8">Loading calendar...</div>
                    ) : (
                        <TermCalendar terms={terms as any} selectedYear={selectedYear} />
                    )}
                </div>
            )}

            {showList && (
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 shadow-sm">
                            <TableRow>
                                <TableCell isHeader>Term Detail</TableCell>
                                <TableCell isHeader>Timeline</TableCell>
                                <TableCell isHeader>Type</TableCell>
                                <TableCell isHeader className="text-center">Actions</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-10 text-gray-400">Synchronizing...</TableCell></TableRow>
                            ) : terms.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-10 text-gray-500">No terms found for this filter.</TableCell></TableRow>
                            ) : (
                                terms.map((term: any) => (
                                    <TableRow key={term._id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-gray-800 dark:text-white/90 uppercase tracking-tight">{term.name}</span>
                                                <span className="text-[10px] text-brand-500 font-extrabold">{term.year} Season</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 font-bold text-xs text-gray-500 tracking-tighter">
                                                <Calendar size={14} className="text-gray-300" />
                                                <span>{formatDate(term.startDate)}</span>
                                                <span className="text-gray-300">→</span>
                                                <span>{formatDate(term.endDate)}</span>
                                                {getDaysBetween(term.startDate, term.endDate) !== null && (
                                                    <span className="ml-2 px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-extrabold uppercase rounded-none shadow-sm border border-brand-100">
                                                        {getDaysBetween(term.startDate, term.endDate)} days
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {term.isEvent ? (
                                                <span className="px-2 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wider rounded-none border border-amber-100 dark:border-amber-500/20">
                                                    Holiday Program
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider rounded-none border border-blue-100 dark:border-blue-500/20">
                                                    Term
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-3">
                                                <button aria-label={`Edit ${term.name}`} onClick={() => handleOpenEdit(term)} className="flex items-center gap-1 p-1.5 text-brand-600 hover:text-brand-500 transition-colors"><Pencil size={14} /> Edit</button>
                                                <button aria-label={`Delete ${term.name}`} onClick={() => handleDeleteClick(term._id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-[520px] overflow-x-hidden rounded-xl p-6 lg:p-8" showCloseButton={false}>
                <FormHeader
                    icon={CalendarDays}
                    title={isEditing ? "Modify Term" : "Schedule New Term"}
                    description="Coordinate the seasonal training timeline."
                    className="-mx-6 -mt-6 mb-6 rounded-t-lg border-b border-[#082269] lg:-mx-8 lg:-mt-8"
                    actions={<button type="button" onClick={() => setIsModalOpen(false)} aria-label="Close term form" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>}
                />
                    <form data-coachmax-form noValidate onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="col-span-2">
                            <label htmlFor="term-name" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Term Name <span className="text-error-600">*</span></label>
                            <input
                                id="term-name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full rounded-none border border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all"
                                placeholder="Summer Term"
                                aria-required="true"
                                aria-invalid={Boolean(formErrors.name)}
                                aria-describedby={formErrors.name ? "term-name-error" : undefined}
                            />
                            {formErrors.name && <p id="term-name-error" role="alert" className="mt-1.5 text-sm text-error-600">{formErrors.name}</p>}
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="term-year" className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Year <span className="text-error-600">*</span></label>
                            <input
                                id="term-year"
                                type="number"
                                min={2000}
                                max={2100}
                                step={1}
                                name="year"
                                value={formData.year}
                                onChange={handleChange}
                                className="w-full rounded-none border border-gray-100 bg-gray-50 px-3 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all"
                                aria-required="true"
                                aria-invalid={Boolean(formErrors.year)}
                                aria-describedby={formErrors.year ? "term-year-error" : undefined}
                            />
                            {formErrors.year && <p id="term-year-error" role="alert" className="mt-1.5 text-xs text-error-600">{formErrors.year}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <DatePicker
                                id="term-start"
                                label="Start Date *"
                                defaultDate={formData.startDate}
                                onChange={(_, dateStr) => handleDateChange("startDate", dateStr)}
                                required
                                error={formErrors.startDate}
                            />
                            {formErrors.startDate && <p id="term-start-error" role="alert" className="mt-1 text-xs text-error-600">{formErrors.startDate}</p>}
                        </div>
                        <div>
                            <DatePicker
                                id="term-end"
                                label="End Date *"
                                defaultDate={formData.endDate}
                                onChange={(_, dateStr) => handleDateChange("endDate", dateStr)}
                                required
                                error={formErrors.endDate}
                            />
                            {formErrors.endDate && <p id="term-end-error" role="alert" className="mt-1 text-xs text-error-600">{formErrors.endDate}</p>}
                        </div>
                    </div>
                    <FormActions className="-mx-6 -mb-6 mt-6 rounded-b-xl lg:-mx-8 lg:-mb-8">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-10 h-12 rounded-none text-xs font-bold uppercase tracking-widest">
                            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Commit Term"}
                        </Button>
                    </FormActions>
                </form>
            </Modal>
            <ConfirmDeleteModal
                isOpen={!!deleteModalId}
                onClose={() => setDeleteModalId(null)}
                onConfirm={confirmDelete}
                loading={deleteMutation.isPending}
                title="Delete Term"
                message="Are you sure you want to delete this term? This action cannot be undone."
            />
        </div>
    );
};

export default TermManagement;
