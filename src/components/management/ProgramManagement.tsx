import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { useCategories } from "../../hooks/useCategories";
import {
  useProgramsByCategory,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
} from "../../hooks/usePrograms";
import { toast } from "react-hot-toast";
import { Edit, Trash, Filter, Layers, X } from "lucide-react";
import Select from "../form/Select";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";
import FormHeader from "../form/FormHeader";
import { requiredText, validateWithSchema } from "../../utils/formValidation";
import { z } from "zod";
import FormField from "../form/FormField";
import FormActions from "../form/FormActions";

const programSchema = z.object({
  category: requiredText("Parent category"),
  name: requiredText("Program name"),
});

const ProgramManagement: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { categories } = useCategories();

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryFilter) {
      setSelectedCategoryFilter(categories[0]._id);
    }
  }, [categories, selectedCategoryFilter]);

  const { programs, isLoading: loading } = useProgramsByCategory(selectedCategoryFilter);

  const createMutation = useCreateProgram();
  const updateMutation = useUpdateProgram();
  const deleteMutation = useDeleteProgram();

  const handleFilterChange = (value: string) => {
    setSelectedCategoryFilter(value);
  };

  const handleOpenAdd = () => {
    setFormData({ name: "", category: selectedCategoryFilter });
    setFormErrors({});
    setIsEditing(false);
    setSelectedId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prog: any) => {
    setFormErrors({});
    setFormData({
      name: prog.name || prog.title || "",
      category: prog.category?._id || prog.category || "",
    });
    setIsEditing(true);
    setSelectedId(prog._id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModalId(id);
  };

  const confirmDelete = () => {
    if (deleteModalId) {
      deleteMutation.mutate(deleteModalId, {
        onSuccess: () => {
          toast.success("Program deleted");
          setDeleteModalId(null);
        },
        onError: () => toast.error("Failed to delete program"),
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateWithSchema(programSchema, formData);
    setFormErrors(validation.errors);
    if (!validation.success) return;

    if (isEditing && selectedId) {
      updateMutation.mutate(
        { id: selectedId, data: formData },
        {
          onSuccess: () => {
            toast.success("Program updated");
            setIsModalOpen(false);
          },
          onError: () => toast.error("Failed to update program"),
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Program created");
          setIsModalOpen(false);
        },
        onError: () => toast.error("Failed to create program"),
      });
    }
  };

  return (
    <div className="bg-white dark:bg-white/[0.03] rounded-none border border-gray-200 dark:border-white/[0.05] p-6 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">Curriculum Programs</h3>
          <p className="text-xs text-gray-500 font-medium">Manage coaching levels by academy category</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-48">
            <Select
              value={selectedCategoryFilter}
              onChange={handleFilterChange}
              icon={Filter}
              options={categories.map((c: any) => ({ label: c.name, value: c._id }))}
              className="w-full"
            />
          </div>
          <Button onClick={handleOpenAdd} size="sm">Add Program</Button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
        <Table>
          <TableHeader className="sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableCell isHeader className="pl-6">Module Title</TableCell>
              <TableCell isHeader>Classification</TableCell>
              <TableCell isHeader className="text-center pr-6">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-20">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent shadow-sm"></div>
                  <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Syncing Library...</span>
                </div>
              </TableCell></TableRow>
            ) : programs.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-20 text-gray-500 font-medium italic">No programs identified in this category.</TableCell></TableRow>
            ) : (
              programs.map((prog: any) => (
                <TableRow key={prog._id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-none bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100 shadow-sm">
                        <Layers size={16} />
                      </div>
                      {prog.name || prog.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-brand-50 text-brand-600 text-[10px] font-extrabold uppercase rounded-none shadow-sm border border-brand-100">
                      {prog.category?.name || categories.find((c: any) => c._id === (prog.category?._id || prog.category))?.name || "Uncategorized"}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => handleOpenEdit(prog)} title="Modify" className="p-2 text-gray-400 hover:text-brand-500 transition-colors"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteClick(prog._id)} title="Remove" className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash size={16} /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-[500px] overflow-visible p-6 shadow-2xl lg:p-8" showCloseButton={false}>
        <FormHeader
          icon={Layers}
          title={isEditing ? "Modify Program" : "New Curriculum Module"}
          description="Define the core objectives for this training level."
          className="-mx-6 -mt-6 mb-6 border-b border-[#082269] lg:-mx-8 lg:-mt-8"
          actions={<button type="button" onClick={() => setIsModalOpen(false)} aria-label="Close program form" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>}
        />
        <form data-coachmax-form noValidate onSubmit={handleSubmit}>
          <div className="space-y-5">
            <FormField id="program-parent-category" label="Parent Category" required error={formErrors.category}>
              <select
                id="program-parent-category"
                value={formData.category}
                onChange={(e) => {
                  const category = e.target.value;
                  setFormData((previous) => ({ ...previous, category }));
                  if (category) setFormErrors((previous) => ({ ...previous, category: "" }));
                }}
                aria-required="true"
                aria-invalid={Boolean(formErrors.category)}
                aria-describedby={formErrors.category ? "program-parent-category-error" : undefined}
                className="w-full rounded-none border border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all appearance-none cursor-pointer"
                required
              >
                <option value="">Select Target Category</option>
                {categories.map((c: any) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </FormField>
            <FormField id="program-name" label="Program Label" required error={formErrors.name}>
              <input
                id="program-name"
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData((previous) => ({ ...previous, name }));
                  if (name.trim()) setFormErrors((previous) => ({ ...previous, name: "" }));
                }}
                aria-required="true"
                aria-invalid={Boolean(formErrors.name)}
                aria-describedby={formErrors.name ? "program-name-error" : undefined}
                className="w-full rounded-none border border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all"
                placeholder="Elite Performance"
                required
              />
            </FormField>
          </div>
          <FormActions className="-mx-6 -mb-6 mt-6 rounded-b-lg lg:-mx-8 lg:-mb-8">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Discard</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-10 h-12 rounded-none text-xs font-bold uppercase tracking-widest">
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : (isEditing ? "Update Program" : "Add Program")}
            </Button>
          </FormActions>
        </form>
      </Modal>
      <ConfirmDeleteModal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
        title="Delete Program"
        message="Are you sure you want to delete this program? This action cannot be undone."
      />
    </div>
  );
};

export default ProgramManagement;
