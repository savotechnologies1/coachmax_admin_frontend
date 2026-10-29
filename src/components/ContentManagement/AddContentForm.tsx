import React, { useEffect, useState } from "react";
import {
  Upload,
  Trash2,
  Tag,
  FileText,
  Bookmark,
  ArrowRight,
  Loader2,
  Newspaper,
  LucideIcon
} from "lucide-react";
import toast from "react-hot-toast";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";
import ImageCropModal from "../common/ImageCropModal";
import { createNews } from "../../api/adminApi";
import SuccessPopup from "../SuccessPopup";
import HtmlEditor from "../form/HtmlEditor";
import FormHeader from "../form/FormHeader";
import FormField from "../form/FormField";
import FormActions from "../form/FormActions";
import { z } from "zod";
import { validateWithSchema } from "../../utils/formValidation";

const plainTextFromHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").trim();
const newsValidationSchema = z.object({
  title: z.string().trim().min(1, "Headline title is required."),
  category: z.string().trim().min(1, "Category is required."),
  description: z.string().refine((value) => plainTextFromHtml(value).length > 0, "News description is required."),
});

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title }) => (
  <FormHeader icon={Icon} title={title} className="mb-6 -mx-6 -mt-6 rounded-t-lg border-b border-[#082269]" />
);

interface AddContentFormProps {
  type?: "news" | "blog";
}

const AddContentForm: React.FC<AddContentFormProps> = () => {
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropImageFile, setCropImageFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    featured: "false",
    description: ""
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      setFormErrors((previousErrors) => {
        if (!(name in previousErrors)) return previousErrors;
        const fieldError = validateWithSchema(newsValidationSchema, updated).errors[name];
        if (fieldError) return { ...previousErrors, [name]: fieldError };
        const nextErrors = { ...previousErrors };
        delete nextErrors[name];
        return nextErrors;
      });
      return updated;
    });
  };

  const handleFeaturedChange = (val: string) => {
    setFormData((prev) => ({ ...prev, featured: val }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await prepareImage(e.target.files[0]);
      e.target.value = "";
    }
  };

  const prepareImage = async (file: File) => {
    let normalized: File;
    try { normalized = await normalizeUploadImage(file); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); return; }
    const validationError = await validateUploadFile(normalized, "news");
    if (validationError) { toast.error(validationError); return; }
    setCropImageFile(normalized);
  };

  const handleImageCrop = (cropped: File) => {
    setImageFile(cropped);
    setImagePreview(URL.createObjectURL(cropped));
    setCropImageFile(null);
  };

  useEffect(() => () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setCropImageFile(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await prepareImage(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateWithSchema(newsValidationSchema, formData).errors;
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      setIsSubmitting(true);
      const data = new FormData();
      data.append("title", formData.title.trim());
      data.append("description", formData.description.trim());
      data.append("category", formData.category);
      data.append("featured", formData.featured);
      if (imageFile) {
        data.append("images", imageFile);
      }

      const response = await createNews(data);

      if (response && response.success === false) {
        toast.error(response.message || "Failed to create news.");
        return;
      }

      toast.success(response.message || "News announcement published successfully");
      setShowSuccessPopup(true);

      // Reset form
      setFormData({
        title: "",
        category: "",
        featured: "false",
        description: ""
      });
      setImageFile(null);
      setImagePreview(null);
      setFormErrors({});
    } catch (err: any) {
      console.error("Error creating news:", err);
      const errorMsg = err.response?.data?.message || "Failed to submit news. Please check required fields.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50/50 dark:bg-gray-950/20 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Main Form */}
        <form data-coachmax-form noValidate onSubmit={handleSubmit} className="space-y-6">

          {/* Card Wrapper */}
          <div className="overflow-hidden space-y-6 rounded-xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-100/50 dark:border-gray-800/80 dark:bg-gray-900 dark:shadow-none">
            <SectionHeader icon={Newspaper} title="Create News Article" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Top Left: Headline Title, Category & Pin as Featured */}
              <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                {/* Headline Title */}
                <FormField id="title" label="Headline Title" required error={formErrors.title}>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    placeholder="e.g., Real Madrid confirm Xabi Alonso as new head coach"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-none border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm font-semibold text-gray-900 dark:text-white transition-all"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(formErrors.title)}
                    aria-describedby={formErrors.title ? "title-error" : undefined}
                    autoComplete="off"
                  />
                </FormField>

                {/* Category & Featured Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <FormField id="category" label={<><Tag size={12} aria-hidden="true" />Category</>} required error={formErrors.category}>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      placeholder="e.g., Sports, Latest"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-none border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-sm font-semibold text-gray-900 dark:text-white transition-all"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(formErrors.category)}
                      aria-describedby={formErrors.category ? "category-error" : undefined}
                    />
                  </FormField>

                  {/* Featured */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      <Bookmark size={12} />
                      Pin as Featured
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 dark:bg-gray-850 rounded-none border border-gray-200 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => handleFeaturedChange("true")}
                        className={`py-2 px-4 text-xs font-bold rounded-none transition-all ${formData.featured === "true"
                            ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-md border border-gray-100 dark:border-gray-800"
                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                          }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeaturedChange("false")}
                        className={`py-2 px-4 text-xs font-bold rounded-none transition-all ${formData.featured === "false"
                            ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-md border border-gray-100 dark:border-gray-800"
                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                          }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Right: Featured Banner Image Dropzone */}
              <div className="lg:col-span-5 flex flex-col justify-end">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Featured Banner Image
                </label>

                <div className="flex-1 flex flex-col justify-stretch">
                  {!imagePreview ? (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="group relative border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-brand-500 dark:hover:border-brand-500 transition-all rounded-none cursor-pointer p-4 text-center flex flex-col items-center justify-center min-h-[145px]"
                    >
                      <input
                        type="file"
                        aria-label="Choose news banner image"
                        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="p-2 bg-gray-50 dark:bg-gray-800/40 rounded-none group-hover:scale-110 transition-transform mb-2">
                        <Upload className="w-4 h-4 text-gray-400 group-hover:text-brand-500" />
                      </div>
                      <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                        Drag & drop banner here
                      </h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Optional · 16:9 crop · 1200 × 675 px · JPG, PNG, WebP, HEIC/HEIF · max 5MB
                      </p>
                      <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline">
                        Browse Local Files
                      </span>
                    </div>
                  ) : (
                    <div className="relative border border-gray-100 dark:border-gray-800 rounded-none overflow-hidden group aspect-[16/9] min-h-[145px]">
                      <div 
                        className="absolute inset-0 w-full h-full bg-cover bg-center" 
                        style={{ backgroundImage: `url(${imagePreview})` }}
                      />
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={removeImage}
                          className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-none transition-transform hover:scale-110 shadow-lg shadow-red-600/30"
                          title="Remove Image"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: News Description HTML Editor (Full Width) */}
              <FormField id="description-editor" label={<><FileText size={14} aria-hidden="true" />News Description</>} required error={formErrors.description} className="lg:col-span-12">
                <HtmlEditor
                  id="description-editor"
                  value={formData.description}
                  onChange={(val) => {
                    setFormData((prev) => ({ ...prev, description: val }));
                    setFormErrors((previousErrors) => {
                      if (!previousErrors.description) return previousErrors;
                      const error = validateWithSchema(newsValidationSchema, { ...formData, description: val }).errors.description;
                      if (error) return { ...previousErrors, description: error };
                      const nextErrors = { ...previousErrors };
                      delete nextErrors.description;
                      return nextErrors;
                    });
                  }}
                  placeholder="Write your news article description here..."
                  aria-invalid={Boolean(formErrors.description)}
                  aria-describedby={formErrors.description ? "description-editor-error" : undefined}
                  className="min-h-[160px]"
                />
              </FormField>

            </div>

          </div>

          {/* Form Actions */}
          <FormActions className="-mx-6 -mb-6 mt-6 rounded-b-lg border-t border-gray-100 px-0 dark:border-gray-800 dark:bg-white/[0.03]">
            <button
              type="button"
              onClick={() => {
                setFormData({ title: "", category: "", featured: "false", description: "" });
                setImageFile(null);
                setImagePreview(null);
              }}
              className="px-6 py-3 rounded-none text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-none text-sm font-bold transition-all shadow-lg shadow-brand-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  Publish Article
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </FormActions>
        </form>
      </div>

      {showSuccessPopup && (
        <SuccessPopup
          message="Success! Your News Article is now live on the CoachMax platform."
          onClose={() => setShowSuccessPopup(false)}
        />
      )}
      {cropImageFile && <ImageCropModal file={cropImageFile} policy="news" onCancel={() => setCropImageFile(null)} onCrop={handleImageCrop} />}
    </div>
  );
};

export default AddContentForm;
