import React, { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import toast from "react-hot-toast";
import apiClient from "../../api/apiClient";
import { Edit2, Trash2, Plus, Loader2 } from "lucide-react";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";

interface CategoryModalProps {
 isOpen: boolean;
 onClose: () => void;
 onCategoriesUpdated: () => void;
}

interface Category {
 _id: string;
 name: string;
 description: string;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onCategoriesUpdated }) => {
 const [categories, setCategories] = useState<Category[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [deletingId, setDeletingId] = useState<string | null>(null);
 const [formError, setFormError] = useState("");
 
 const [formData, setFormData] = useState({
  name: "",
  description: ""
 });

 useEffect(() => {
  if (isOpen) {
   fetchCategories();
  }
 }, [isOpen]);

 const fetchCategories = async () => {
  setIsLoading(true);
  try {
   const response = await apiClient.get("/api/admin/store/categories");
   const data = response.data.data || response.data;
   setCategories(data);
  } catch (error) {
   console.error("Failed to fetch categories:", error);
   toast.error("Failed to load categories.");
  } finally {
   setIsLoading(false);
  }
 };

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
 };

 const resetForm = () => {
  setFormData({ name: "", description: "" });
  setEditingId(null);
  setFormError("");
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.name.trim()) {
   setFormError("Category name is required.");
   return;
  }
  setFormError("");

  setIsSubmitting(true);
  try {
   if (editingId) {
    await apiClient.put(`/api/admin/store/categories/${editingId}`, formData);
    toast.success("Category updated successfully.");
   } else {
    await apiClient.post("/api/admin/store/categories", formData);
    toast.success("Category added successfully.");
   }
   
   resetForm();
   await fetchCategories();
   onCategoriesUpdated();
  } catch (error) {
   console.error("Failed to save category:", error);
   toast.error("Failed to save category.");
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleEdit = (category: Category) => {
  setEditingId(category._id);
  setFormData({
   name: category.name,
   description: category.description || ""
  });
 };

 const handleDeleteClick = (id: string) => {
  setDeletingId(id);
 };

 const confirmDelete = async () => {
  if (!deletingId) return;
  
  setIsDeleting(true);
  try {
   await apiClient.delete(`/api/admin/store/categories/${deletingId}`);
   toast.success("Category deleted.");
   await fetchCategories();
   onCategoriesUpdated();
  } catch (error) {
   console.error("Failed to delete category:", error);
   toast.error("Failed to delete category.");
  } finally {
   setIsDeleting(false);
   setDeletingId(null);
  }
 };

 return (
  <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl w-full p-6">
   <div className="flex justify-between items-center mb-6">
    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Manage Categories</h2>
   </div>

   {/* Add/Edit Form */}
  <form data-coachmax-form noValidate onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700 mb-6">
    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">
     {editingId ? "Edit Category" : "Add New Category"}
    </h3>
    <div className="space-y-4">
     <div>
      <Label htmlFor="store-category-name">Category Name <span className="text-error-600">*</span></Label>
      <Input
       id="store-category-name"
       name="name"
       placeholder="e.g., Academy Apparel"
       value={formData.name}
       onChange={handleInputChange}
       required
       aria-invalid={Boolean(formError)}
       aria-describedby={formError ? "store-category-error" : undefined}
      />
      {formError && <p id="store-category-error" role="alert" className="mt-1.5 text-sm text-error-600">{formError}</p>}
     </div>
     <div>
      <Label htmlFor="store-category-description">Description <span className="text-xs font-normal text-gray-500">(optional)</span></Label>
      <Input
       id="store-category-description"
       name="description"
       placeholder="Short description..."
       value={formData.description}
       onChange={handleInputChange}
      />
     </div>
     <div className="flex gap-2 justify-end pt-2">
      {editingId && (
       <Button type="button" variant="outline" onClick={resetForm} className="py-2 text-sm">
        Cancel
       </Button>
      )}
      <Button type="submit" disabled={isSubmitting} className="py-2 text-sm flex items-center gap-2">
       {isSubmitting && <Loader2 className="animate-spin" size={16} />}
       {!isSubmitting && (editingId ? <Edit2 size={16} /> : <Plus size={16} />)}
       {editingId ? "Update Category" : "Add Category"}
      </Button>
     </div>
    </div>
   </form>

   {/* Category List */}
   <div>
    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Existing Categories</h3>
    {isLoading ? (
     <div className="flex justify-center p-4">
      <Loader2 className="animate-spin text-brand-500" size={24} />
     </div>
    ) : categories.length === 0 ? (
     <div className="text-center p-4 text-sm text-gray-400 border border-dashed rounded-none">
      No categories found. Create one above.
     </div>
    ) : (
     <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
      {categories.map((category) => (
       <div 
        key={category._id} 
        className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-none hover:border-brand-300 transition-colors"
       >
        <div>
         <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{category.name}</p>
         {category.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{category.description}</p>
         )}
        </div>
        <div className="flex items-center gap-2">
         <button
          onClick={() => handleEdit(category)}
          className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-none transition-colors"
          title="Edit"
          type="button"
         >
          <Edit2 size={16} />
         </button>
         <button
          onClick={() => handleDeleteClick(category._id)}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-none transition-colors"
          title="Delete"
          type="button"
         >
          <Trash2 size={16} />
         </button>
        </div>
       </div>
      ))}
     </div>
    )}
   </div>

   <ConfirmDeleteModal 
    isOpen={!!deletingId}
    onClose={() => setDeletingId(null)}
    onConfirm={confirmDelete}
    title="Delete Category"
    message="Are you sure you want to delete this category? Any products assigned to this category might lose their association."
    loading={isDeleting}
   />
  </Modal>
 );
};

export default CategoryModal;
