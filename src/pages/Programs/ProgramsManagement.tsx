import { useState } from "react";
import { useForm } from "react-hook-form";
import PageMeta from "../../components/common/PageMeta";
import { usePrograms, useCreateProgram, useUpdateProgram, useDeleteProgram } from "../../hooks/usePrograms";
import { Program, CreateProgramRequest } from "../../types/program";
import { Layers, X } from "lucide-react";
import FormHeader from "../../components/form/FormHeader";

const CATEGORY_OPTIONS = ["Academy", "School", "Holiday Camp", "1on1 Session", "Other"];

interface ProgramFormValues {
  name: string;
  description: string;
  category: string;
  capacity: number;
  pricing: number;
  startTime: string;
  endTime: string;
}

type ModalMode = "add" | "edit" | null;

export default function ProgramsManagement() {
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError } = usePrograms(page, 10);
  const createMutation = useCreateProgram();
  const updateMutation = useUpdateProgram();
  const deleteMutation = useDeleteProgram();

  const programs = data?.data ?? [];
  const pagination = data?.pagination;

  const filteredPrograms = programs.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProgramFormValues>();

  const openAdd = () => {
    reset({ name: "", description: "", category: "", capacity: 0, pricing: 0 });
    setSelectedProgram(null);
    setModalMode("add");
  };

  const openEdit = (program: Program) => {
    setSelectedProgram(program);
    setValue("name", program.name);
    setValue("description", program.description);
    setValue("category", program.category);
    setValue("capacity", program.capacity);
    setValue("pricing", program.pricing);
    setValue("startTime", (program.schedule?.startTime as string) || "");
    setValue("endTime", (program.schedule?.endTime as string) || "");
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedProgram(null);
    reset();
  };

  const onSubmit = (formData: ProgramFormValues) => {
    const payload: CreateProgramRequest = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      capacity: Number(formData.capacity),
      pricing: Number(formData.pricing),
      coaches: [],
      schedule: {
        startTime: formData.startTime,
        endTime: formData.endTime,
      },
    };

    if (modalMode === "add") {
      createMutation.mutate(payload, { onSuccess: closeModal });
    } else if (modalMode === "edit" && selectedProgram) {
      updateMutation.mutate(
        { id: selectedProgram._id, data: payload },
        { onSuccess: closeModal }
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;

  return (
    <>
      <PageMeta
        title="Programs Management | CoachMax"
        description="Manage coaching programs — add, edit, and delete programs."
      />

      {/* Page Header */}
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Programs</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
            <span>Home</span>
            <span>&gt;</span>
            <span className="text-[#0047FF]">Programs</span>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0047FF] hover:bg-blue-700 text-white text-sm font-semibold rounded-none transition-colors shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Add Program
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Programs", value: pagination?.total ?? 0, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
          { label: "Academy", value: programs.filter(p => p.category === "Academy").length, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
          { label: "School", value: programs.filter(p => p.category === "School").length, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
          { label: "Other", value: programs.filter(p => !["Academy","School"].includes(p.category)).length, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-none border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-gray-900 rounded-none border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white">All Programs</h2>
          <div className="relative w-full sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-none bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-semibold">Name</th>
                <th className="text-left px-5 py-3.5 font-semibold">Category</th>
                <th className="text-left px-5 py-3.5 font-semibold">Capacity</th>
                <th className="text-left px-5 py-3.5 font-semibold">Pricing</th>
                <th className="text-left px-5 py-3.5 font-semibold">Description</th>
                <th className="text-right px-5 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-none w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-red-500">
                    Failed to load programs. Please try again.
                  </td>
                </tr>
              ) : filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-300 dark:text-gray-600">
                        <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 5.55228 9.44772 6 10 6H14C14.5523 6 15 5.55228 15 5M9 5C9 4.44772 9.44772 4 10 4H14C14.5523 4 15 4.44772 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <p className="text-gray-400 dark:text-gray-500 font-medium">No programs found</p>
                      <button onClick={openAdd} className="text-blue-600 text-sm hover:underline">Add your first program</button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((program) => (
                  <tr key={program._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-800 dark:text-white">{program.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        program.category === "Academy"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                          : program.category === "School"
                          ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                          : program.category === "Holiday Camp"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                      }`}>
                        {program.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{program.capacity}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400 font-medium">${program.pricing}</td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">{program.description || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(program)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-none transition-colors"
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56261 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(program._id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-none transition-colors"
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6L18.1351 19.1425C18.058 20.1891 17.8737 21 16.8213 21H7.17872C6.12635 21 5.94203 20.1891 5.86495 19.1425L5 6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500">
              Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-none disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs font-medium rounded-none transition-colors ${
                    p === page
                      ? "bg-[#0047FF] text-white"
                      : "text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-none disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <FormHeader
              icon={Layers}
              title={modalMode === "add" ? "Add New Program" : "Edit Program"}
              description={modalMode === "add" ? "Fill in the details to create a program." : "Update the program details below."}
              className="border-b border-[#082269]"
              actions={<button type="button" onClick={closeModal} aria-label="Close program form" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>}
            />

            {/* Modal Body */}
            <form data-coachmax-form noValidate onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {mutationError && (
                  <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-none text-sm">
                    {mutationError.message || "Something went wrong."}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                    Program Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Elite Academy U11"
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-none bg-transparent text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:bg-gray-800 dark:border-gray-700 ${errors.name ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}
                    {...register("name", { required: "Program name is required" })}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-none bg-transparent text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:bg-gray-800 dark:border-gray-700 ${errors.category ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}
                    {...register("category", { required: "Category is required" })}
                  >
                    <option value="">Select category</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
                </div>

                {/* Capacity & Pricing side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                      Capacity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 20"
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-none bg-transparent text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:bg-gray-800 dark:border-gray-700 ${errors.capacity ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}
                      {...register("capacity", { required: "Required", min: { value: 0, message: "Must be ≥ 0" } })}
                    />
                    {errors.capacity && <p className="mt-1 text-xs text-red-500">{errors.capacity.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                      Pricing ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="e.g. 150"
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-none bg-transparent text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:bg-gray-800 dark:border-gray-700 ${errors.pricing ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}
                      {...register("pricing", { required: "Required", min: { value: 0, message: "Must be ≥ 0" } })}
                    />
                    {errors.pricing && <p className="mt-1 text-xs text-red-500">{errors.pricing.message}</p>}
                  </div>
                </div>

                {/* Schedule: Start Time & End Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-none bg-transparent text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:bg-gray-800 dark:border-gray-700 ${errors.startTime ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}
                      {...register("startTime", { required: "Start time is required" })}
                    />
                    {errors.startTime && <p className="mt-1 text-xs text-red-500">{errors.startTime.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-none bg-transparent text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:bg-gray-800 dark:border-gray-700 ${errors.endTime ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}
                      {...register("endTime", {
                        required: "End time is required",
                        validate: (val, formValues) =>
                          !formValues.startTime || val > formValues.startTime || "End time must be after start time",
                      })}
                    />
                    {errors.endTime && <p className="mt-1 text-xs text-red-500">{errors.endTime.message}</p>}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the program..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-none bg-transparent text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:bg-gray-800 resize-none"
                    {...register("description")}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#0047FF] hover:bg-blue-700 disabled:opacity-60 rounded-none transition-colors"
                >
                  {isPending ? (modalMode === "add" ? "Creating..." : "Saving...") : (modalMode === "add" ? "Create Program" : "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-none shadow-2xl p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-500/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-600 dark:text-red-400">
                <path d="M12 9V13M12 17H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0377 2.66667 10.2679 4L3.33975 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white text-center mb-2">Delete Program?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              This action cannot be undone. The program will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-none transition-colors"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
