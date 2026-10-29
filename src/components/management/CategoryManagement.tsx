import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "../../hooks/useCategories";
import { toast } from "react-hot-toast";
import { Edit, Trash, Tag } from "../../icons/lucide-icons";
import { Tag as FormTag, X } from "lucide-react";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";
import FormHeader from "../form/FormHeader";
import { requiredText, validateWithSchema } from "../../utils/formValidation";
import { z } from "zod";
import FormField from "../form/FormField";
import FormActions from "../form/FormActions";

const categorySchema = z.object({ name: requiredText("Category name") });

const CategoryManagement: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "" });
  const [formError, setFormError] = useState("");

  const { categories, isLoading: loading } = useCategories();

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const handleOpenAdd = () => {
    setFormData({ name: "" });
    setFormError("");
    setIsEditing(false);
    setSelectedId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: any) => {
    setFormData({ name: cat.name || "" });
    setFormError("");
    setIsEditing(true);
    setSelectedId(cat._id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModalId(id);
  };

  const confirmDelete = () => {
    if (deleteModalId) {
      deleteMutation.mutate(deleteModalId, {
        onSuccess: () => {
          toast.success("Category deleted");
          setDeleteModalId(null);
        },
        onError: () => toast.error("Failed to delete category"),
      });
    }
  };

  const handleNameChange = (val: string) => {
    setFormData({ name: val });
    if (val.trim()) setFormError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateWithSchema(categorySchema, formData);
    if (!validation.success) {
      setFormError(validation.errors.name);
      return;
    }
    setFormError("");
    const name = formData.name.trim();
    const payload = { name };
    if (isEditing && selectedId) {
      updateMutation.mutate(
        { id: selectedId, data: payload },
        {
          onSuccess: () => {
            toast.success("Category updated");
            setIsModalOpen(false);
          },
          onError: () => toast.error("Failed to update category"),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Category created");
          setIsModalOpen(false);
        },
        onError: () => toast.error("Failed to create category"),
      });
    }
  };

  return (
    <div className="bg-white dark:bg-white/[0.03] rounded-none border border-gray-200 dark:border-white/[0.05] p-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">Academy Categories</h3>
          <p className="text-xs text-gray-500">Manage high-level groups</p>
        </div>
        <Button onClick={handleOpenAdd} size="sm">Add New</Button>
      </div>

      <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
        <Table>
          <TableHeader className="sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableCell isHeader>Category Name</TableCell>
              <TableCell isHeader className="text-center">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={2} className="text-center py-10 text-gray-400">Syncing...</TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center py-10 text-gray-500">No categories recorded.</TableCell></TableRow>
            ) : (
              categories.map((cat: any) => (
                <TableRow key={cat._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-none bg-brand-50 flex items-center justify-center text-brand-500">
                        <Tag size={16} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-800 dark:text-white/90">{cat.name}</span>
                        {cat.isEvent && (
                          <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wider rounded-none border border-amber-100 dark:border-amber-500/20">
                            Holiday Program
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => handleOpenEdit(cat)} className="p-2 text-gray-400 hover:text-brand-500 transition-colors"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteClick(cat._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash size={16} /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-[460px] overflow-visible p-6 lg:p-8" showCloseButton={false}>
        <FormHeader
          icon={FormTag}
          title={isEditing ? "Edit Category" : "New Category"}
          description="Manage high-level academy groupings."
          className="-mx-6 -mt-6 mb-6 rounded-t-lg border-b border-[#082269] lg:-mx-8 lg:-mt-8"
          actions={<button type="button" onClick={() => setIsModalOpen(false)} aria-label="Close category form" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>}
        />
        <form data-coachmax-form noValidate onSubmit={handleSubmit}>
          <FormField id="academy-category-name" label="Category Name" required error={formError} className="mb-4">
            <input
              id="academy-category-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-none border border-gray-100 bg-gray-50 px-5 py-3 text-sm font-bold focus:bg-white focus:border-brand-500 outline-none transition-all"
              placeholder="e.g. Academy"
              aria-required="true"
              aria-invalid={Boolean(formError)}
              aria-describedby={formError ? "academy-category-name-error" : undefined}
            />
          </FormField>
          <FormActions className="-mx-6 -mb-6 mt-6 rounded-b-lg lg:-mx-8 lg:-mb-8">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : (isEditing ? "Update Category" : "Add Category")}
            </Button>
          </FormActions>
        </form>
      </Modal>
      <ConfirmDeleteModal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
      />
    </div>
  );
};

export default CategoryManagement;
