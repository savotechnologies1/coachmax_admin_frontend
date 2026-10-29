import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button/Button";
import ConfirmDeleteModal from "../../components/ui/modal/ConfirmDeleteModal";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createProgram,
  updateProgram,
  deleteProgram,
} from "../../api/adminApi";
import { toast } from "react-hot-toast";
import { Tag, Layers } from "../../icons/lucide-icons";
import { Plus, Pencil, Trash2, Tag as HeaderTag, Layers as HeaderLayers, X } from "lucide-react";
import TermManagement from "../../components/management/TermManagement";
import FormHeader from "../../components/form/FormHeader";

import { useCategories } from "../../hooks/useCategories";
import { useProgramsByCategory } from "../../hooks/usePrograms";

const CoachingManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditing, setCatEditing] = useState(false);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catDeleteId, setCatDeleteId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: "" });

  const [progModalOpen, setProgModalOpen] = useState(false);
  const [progEditing, setProgEditing] = useState(false);
  const [progEditId, setProgEditId] = useState<string | null>(null);
  const [progDeleteId, setProgDeleteId] = useState<string | null>(null);
  const [progForm, setProgForm] = useState({ name: "", category: "" });

  const { categories, isLoading: catLoading } = useCategories();

  // Auto-select first category on load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0]._id);
      setSelectedCategoryName(categories[0].name);
    }
  }, [categories, selectedCategoryId]);

  const { programs, isLoading: progLoading } = useProgramsByCategory(selectedCategoryId);

  const createCatMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created");
      setCatModalOpen(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to create category";
      toast.error(message, { duration: 5000 });
    },
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated");
      setCatModalOpen(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to update category";
      toast.error(message, { duration: 5000 });
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
      setCatDeleteId(null);
      setSelectedCategoryId("");
      setSelectedCategoryName("");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to delete category";
      toast.error(message, { duration: 5000 });
      setCatDeleteId(null);
    },
  });

  const createProgMutation = useMutation({
    mutationFn: createProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs", "byCategory", selectedCategoryId] });
      toast.success("Program created");
      setProgModalOpen(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to create program";
      toast.error(message, { duration: 5000 });
    },
  });

  const updateProgMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProgram(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs", "byCategory", selectedCategoryId] });
      toast.success("Program updated");
      setProgModalOpen(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to update program";
      toast.error(message, { duration: 5000 });
    },
  });

  const deleteProgMutation = useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs", "byCategory", selectedCategoryId] });
      toast.success("Program deleted");
      setProgDeleteId(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to delete program";
      toast.error(message, { duration: 5000 });
      setProgDeleteId(null);
    },
  });

  const handleCategoryClick = (cat: any) => {
    setSelectedCategoryId(cat._id);
    setSelectedCategoryName(cat.name);
  };

  const handleCatAdd = () => {
    setCatForm({ name: "" });
    setCatEditing(false);
    setCatEditId(null);
    setCatModalOpen(true);
  };

  const handleCatEdit = (e: React.MouseEvent, cat: any) => {
    e.stopPropagation();
    setCatForm({ name: cat.name });
    setCatEditing(true);
    setCatEditId(cat._id);
    setCatModalOpen(true);
  };

  const handleCatDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCatDeleteId(id);
  };

  const handleCatNameChange = (val: string) => {
    setCatForm({ name: val });
  };

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (catEditing && catEditId) {
      updateCatMutation.mutate({ id: catEditId, data: catForm });
    } else {
      createCatMutation.mutate(catForm);
    }
  };

  const handleProgAdd = () => {
    setProgForm({ name: "", category: selectedCategoryId });
    setProgEditing(false);
    setProgEditId(null);
    setProgModalOpen(true);
  };

  const handleProgEdit = (prog: any) => {
    setProgForm({
      name: prog.name || prog.title || "",
      category: prog.category?._id || prog.category || selectedCategoryId,
    });
    setProgEditing(true);
    setProgEditId(prog._id);
    setProgModalOpen(true);
  };

  const handleProgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (progEditing && progEditId) {
      updateProgMutation.mutate({ id: progEditId, data: progForm });
    } else {
      createProgMutation.mutate(progForm);
    }
  };

  return (
    <>
      <PageMeta title="CoachMax | Categories and terms manage" description="Manage Categories and Programs" />

      <div className="space-y-8">
        <TermManagement />

        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.05]">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">Categories Manage</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select a category to view its programs</p>
            </div>
          </div>


          <div className="flex" style={{ minHeight: "520px" }}>

            {/* LEFT — Academy Categories */}
            <div className="w-72 flex-shrink-0 border-r border-gray-100 dark:border-white/[0.05] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Academy Categories</span>
                <button
                  onClick={handleCatAdd}
                  className="w-7 h-7 flex items-center justify-center rounded-none bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                  title="Add Category"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {catLoading ? (
                  <div className="flex items-center justify-center py-16 text-gray-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                    Syncing...
                  </div>
                ) : categories.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-gray-400 text-sm italic">
                    No categories yet.
                  </div>
                ) : (
                  categories.map((cat: any) => {
                    const isSelected = selectedCategoryId === cat._id;
                    return (
                      <button
                        key={cat._id}
                        onClick={() => handleCategoryClick(cat)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-50 dark:border-white/[0.03] transition-all group text-left
                        ${isSelected
                            ? "bg-brand-500 text-white"
                            : "hover:bg-brand-50 dark:hover:bg-white/[0.04] text-gray-700 dark:text-gray-300"
                          }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                          <div className={`w-5 h-5 rounded-none flex items-center justify-center flex-shrink-0
                          ${isSelected ? "bg-white/20 text-white" : "bg-brand-50 text-brand-500"}`}>
                            <Tag size={11} />
                          </div>
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <span className={`text-sm font-semibold truncate ${isSelected ? "text-white" : ""}`}>
                              {cat.name}
                            </span>
                            {cat.isEvent && (
                              <span className={`text-[9px] font-bold uppercase tracking-wider rounded-none self-start truncate max-w-full ${isSelected
                                ? "text-white/80"
                                : "text-amber-600 dark:text-amber-400"
                                }`}>
                                Holiday Program
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? "opacity-100" : ""}`}>
                          <span
                            onClick={(e) => handleCatEdit(e, cat)}
                            className={`p-1 rounded transition-colors cursor-pointer ${isSelected ? "hover:bg-white/20 text-white" : "hover:bg-brand-100 text-gray-400 hover:text-brand-500"}`}
                          >
                            <Pencil size={15} />
                          </span>
                          <span
                            onClick={(e) => handleCatDelete(e, cat._id)}
                            className={`p-1 rounded transition-colors cursor-pointer ${isSelected ? "hover:bg-white/20 text-white" : "hover:bg-red-50 text-gray-400 hover:text-red-500"}`}
                          >
                            <Trash2 size={15} />
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT — Programs for selected category */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Programs</span>
                  {selectedCategoryName && (
                    <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-extrabold uppercase rounded-none border border-brand-100">
                      {selectedCategoryName}
                    </span>
                  )}
                </div>
                {selectedCategoryId && (
                  <Button onClick={handleProgAdd} size="sm">
                    Add Program
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {!selectedCategoryId ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-20">
                    <Layers size={32} className="opacity-30" />
                    <p className="text-sm font-medium">Select a category to view its programs</p>
                  </div>
                ) : progLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
                    <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Syncing Programs...</span>
                  </div>
                ) : programs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-20">
                    <Layers size={32} className="opacity-30" />
                    <p className="text-sm italic">No programs in this category yet.</p>
                    <button onClick={handleProgAdd} className="text-xs text-brand-500 hover:text-brand-600 font-bold transition-colors">
                      + Add the first program
                    </button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#031549] text-white">
                        <th className="text-left px-6 py-3 text-[11px] font-bold uppercase tracking-widest">Module Title</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest">Classification</th>
                        <th className="text-center px-6 py-3 text-[11px] font-bold uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programs.map((prog: any, idx: number) => (
                        <tr
                          key={prog._id}
                          className={`border-b border-gray-50 dark:border-white/[0.03] hover:bg-brand-50/40 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50/50"}`}
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-none bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100 flex-shrink-0">
                                <Layers size={12} />
                              </div>
                              <span className="text-sm font-semibold text-gray-800 dark:text-white/80">
                                {prog.name || prog.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-1 bg-brand-50 text-brand-600 text-[10px] font-extrabold uppercase border border-brand-100">
                              {prog.category?.name ||
                                categories.find((c: any) => c._id === (prog.category?._id || prog.category))?.name ||
                                selectedCategoryName}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => handleProgEdit(prog)}
                                className="p-1.5 text-gray-400 hover:text-brand-500 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setProgDeleteId(prog._id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>{/* end space-y-8 */}


      <Modal isOpen={catModalOpen} onClose={() => setCatModalOpen(false)} className="max-w-[520px] overflow-x-hidden rounded-lg p-6 shadow-2xl lg:p-8" showCloseButton={false}>
        <FormHeader
          icon={HeaderTag}
          title={catEditing ? "Edit Category" : "New Category"}
          description="Manage high-level academy groupings."
          className="-mx-6 -mt-6 mb-6 rounded-t-lg border-b border-[#082269] lg:-mx-8 lg:-mt-8"
          actions={<button type="button" onClick={() => setCatModalOpen(false)} aria-label="Close category form" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>}
        />
        <form data-coachmax-form onSubmit={handleCatSubmit}>
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Category Name <span className="text-error-600">*</span></label>
            <input
              type="text"
              value={catForm.name}
              onChange={(e) => handleCatNameChange(e.target.value)}
              className="w-full rounded-none border border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all"
              placeholder="e.g. Academy"
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setCatModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createCatMutation.isPending || updateCatMutation.isPending}>
              {createCatMutation.isPending || updateCatMutation.isPending ? "Saving..." : (catEditing ? "Update" : "Add Category")}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!catDeleteId}
        onClose={() => setCatDeleteId(null)}
        onConfirm={() => catDeleteId && deleteCatMutation.mutate(catDeleteId)}
        loading={deleteCatMutation.isPending}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
      />


      <Modal isOpen={progModalOpen} onClose={() => setProgModalOpen(false)} className="max-w-[520px] overflow-x-hidden rounded-lg p-6 shadow-2xl lg:p-8" showCloseButton={false}>
        <FormHeader
          icon={HeaderLayers}
          title={progEditing ? "Modify Program" : "New Curriculum Module"}
          description="Define the core objectives for this training level."
          className="-mx-6 -mt-6 mb-6 rounded-t-lg border-b border-[#082269] lg:-mx-8 lg:-mt-8"
          actions={<button type="button" onClick={() => setProgModalOpen(false)} aria-label="Close program form" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>}
        />
        <form data-coachmax-form onSubmit={handleProgSubmit}>
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Parent Category <span className="text-error-600">*</span></label>
              <select
                value={progForm.category}
                onChange={(e) => setProgForm({ ...progForm, category: e.target.value })}
                className="w-full rounded-none border border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer"
                required
              >
                <option value="">Select Target Category</option>
                {categories.map((c: any) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Program Label <span className="text-error-600">*</span></label>
              <input
                type="text"
                value={progForm.name}
                onChange={(e) => setProgForm({ ...progForm, name: e.target.value })}
                className="w-full rounded-none border border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all"
                placeholder="Elite Performance"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-10 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setProgModalOpen(false)}>Discard</Button>
            <Button type="submit" disabled={createProgMutation.isPending || updateProgMutation.isPending} className="px-10 h-12 rounded-none text-xs font-bold uppercase tracking-widest">
              {createProgMutation.isPending || updateProgMutation.isPending ? "Saving..." : (progEditing ? "Update Program" : "Add Program")}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!progDeleteId}
        onClose={() => setProgDeleteId(null)}
        onConfirm={() => progDeleteId && deleteProgMutation.mutate(progDeleteId)}
        loading={deleteProgMutation.isPending}
        title="Delete Program"
        message="Are you sure you want to delete this program? This action cannot be undone."
      />
    </>
  );
};

export default CoachingManagementPage;
